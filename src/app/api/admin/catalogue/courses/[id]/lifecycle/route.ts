import { connection, NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getIdentityLockPool } from "../../../../../../../db/pool";
import {
  AdminAccessDeniedError,
  AdminAuthenticationRequiredError,
  requireAdmin,
} from "../../../../../../admin-auth";
import { assertDevelopmentTarget } from "../../../../../../../../scripts/import-real-pathway-draft.mjs";
import {
  approveRealCourseDraft,
  preflightRealCourseDraft,
  publishApprovedRealCourse,
} from "../../../../../../../../scripts/publish-real-course.mjs";

const noStore = { "Cache-Control": "no-store" };
const maxBodyBytes = 4096;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type LifecycleInput = {
  action: "publish" | "archive" | "delete-draft";
  expectedRevisionId: string;
  expectedPublishedRevisionId: string | null;
};

class CourseNotFoundError extends Error {}
class StaleCourseError extends Error {}
class InvalidCourseStateError extends Error {}
class CoursePublicationBlockedError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLifecycleInput(value: unknown): value is LifecycleInput {
  return isRecord(value) &&
    Object.keys(value).length === 3 &&
    ["publish", "archive", "delete-draft"].includes(String(value.action)) &&
    typeof value.expectedRevisionId === "string" &&
    uuidPattern.test(value.expectedRevisionId) &&
    (value.expectedPublishedRevisionId === null ||
      typeof value.expectedPublishedRevisionId === "string" &&
      uuidPattern.test(value.expectedPublishedRevisionId));
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

async function openAuthorizedClient() {
  const client = await getIdentityLockPool().connect();
  try {
    const database = await client.query("SELECT current_database() AS database_name");
    if (database.rows[0]?.database_name !== "neondb") {
      throw new Error("Course lifecycle action refused outside the verified Neon development database.");
    }
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
}

async function requireAdminInTransaction(client: PoolClient, actorId: number) {
  const result = await client.query(
    `SELECT id FROM public.users
      WHERE id=$1 AND role='admin' AND auth_provider='clerk' AND external_id IS NOT NULL
      FOR SHARE`,
    [actorId],
  );
  if (result.rowCount !== 1) throw new AdminAccessDeniedError();
}

async function lockCourse(client: PoolClient, identifier: string) {
  if (!/^[a-z0-9][a-z0-9._-]{0,199}$/i.test(identifier)) {
    throw new CourseNotFoundError();
  }
  const result = await client.query(
    `SELECT item.id,
            COALESCE(canonical.external_key, item.id::text) AS "courseId",
            item.published_revision_id AS "publishedRevisionId",
            latest.id AS "latestRevisionId",
            latest.publication_status AS "publicationStatus",
            latest.revision_number AS "revisionNumber"
       FROM public.catalog_items AS item
       JOIN LATERAL (
         SELECT revision.id, revision.publication_status, revision.revision_number
           FROM public.catalog_item_revisions AS revision
           JOIN public.course_revisions AS course ON course.revision_id = revision.id
          WHERE revision.catalog_item_id = item.id
            AND revision.data_classification = 'real'
          ORDER BY revision.revision_number DESC
          LIMIT 1
       ) AS latest ON true
       LEFT JOIN LATERAL (
         SELECT alias.external_key
           FROM public.catalog_item_aliases AS alias
          WHERE alias.catalog_item_id = item.id
            AND alias.source_system = 'careerbridge'
            AND alias.external_type = 'course'
            AND alias.external_context_key = ''
          ORDER BY alias.external_key
          LIMIT 1
       ) AS canonical ON true
      WHERE item.item_type = 'course'
        AND (
          item.id::text = $1
          OR EXISTS (
            SELECT 1
              FROM public.catalog_item_aliases AS alias
             WHERE alias.catalog_item_id = item.id
               AND alias.source_system = 'careerbridge'
               AND alias.external_type = 'course'
               AND alias.external_context_key = ''
               AND alias.external_key = $1
          )
        )
      LIMIT 1
      FOR UPDATE OF item`,
    [identifier],
  );
  const course = result.rows[0];
  if (!course) throw new CourseNotFoundError();
  return course;
}

function assertExpectedCourse(course: Record<string, unknown>, input: LifecycleInput) {
  if (
    course.latestRevisionId !== input.expectedRevisionId ||
    course.publishedRevisionId !== input.expectedPublishedRevisionId
  ) throw new StaleCourseError();
}

async function archiveCourse(
  client: PoolClient,
  course: Record<string, unknown>,
  input: LifecycleInput,
  actorId: number,
) {
  assertExpectedCourse(course, input);
  if (typeof course.publishedRevisionId !== "string") {
    throw new InvalidCourseStateError("This Course does not have a published version to unpublish.");
  }
  if (course.latestRevisionId !== course.publishedRevisionId) {
    throw new InvalidCourseStateError("Publish or delete the current unpublished update before unpublishing this Course.");
  }

  const archived = await client.query(
    `INSERT INTO public.catalog_item_revisions
       (catalog_item_id, revision_number, publication_status, title, summary, description,
        data_classification, verification_status, created_by, updated_by)
     SELECT source.catalog_item_id,
            (SELECT COALESCE(MAX(previous.revision_number), 0) + 1
               FROM public.catalog_item_revisions AS previous
              WHERE previous.catalog_item_id = source.catalog_item_id),
            'archived', source.title, source.summary, source.description,
            source.data_classification, source.verification_status, $2, $2
       FROM public.catalog_item_revisions AS source
      WHERE source.id = $1 AND source.catalog_item_id = $3
        AND source.publication_status = 'published'
        AND source.data_classification = 'real'
     RETURNING id`,
    [course.publishedRevisionId, actorId, course.id],
  );
  const archivedRevisionId = archived.rows[0]?.id;
  if (typeof archivedRevisionId !== "string") throw new StaleCourseError();

  const typedRevision = await client.query(
    `INSERT INTO public.course_revisions
       (revision_id, field_item_id, field_revision_id, qualification, stages,
        entry_after_class10, entry_after_class12, is_exploration_category, course_content)
     SELECT $1, field_item_id, field_revision_id, qualification, stages,
            entry_after_class10, entry_after_class12, is_exploration_category, course_content
       FROM public.course_revisions
      WHERE revision_id = $2`,
    [archivedRevisionId, course.publishedRevisionId],
  );
  if (typedRevision.rowCount !== 1) {
    throw new InvalidCourseStateError("The published Course content could not be preserved in history.");
  }
  await client.query(
    `INSERT INTO public.catalog_revision_sources
       (revision_id, source_id, claim_key, checked_at, verified_at, verification_status)
     SELECT $1, source_id, claim_key, checked_at, verified_at, verification_status
       FROM public.catalog_revision_sources
      WHERE revision_id = $2`,
    [archivedRevisionId, course.publishedRevisionId],
  );
  const pointer = await client.query(
    `UPDATE public.catalog_items
        SET published_revision_id = NULL, updated_at = NOW()
      WHERE id = $1 AND item_type = 'course'
        AND published_revision_id = $2`,
    [course.id, course.publishedRevisionId],
  );
  if (pointer.rowCount !== 1) throw new StaleCourseError();
}

async function deleteDraft(
  client: PoolClient,
  course: Record<string, unknown>,
  input: LifecycleInput,
) {
  assertExpectedCourse(course, input);
  if (course.publicationStatus !== "draft") {
    throw new InvalidCourseStateError("Only a draft Course version can be deleted.");
  }

  const history = await client.query(
    `SELECT 1 FROM public.catalog_item_revisions
      WHERE catalog_item_id = $1 AND id <> $2
      LIMIT 1`,
    [course.id, input.expectedRevisionId],
  );
  if (history.rowCount || course.publishedRevisionId) {
    const deleted = await client.query(
      `DELETE FROM public.catalog_item_revisions
        WHERE id = $1 AND catalog_item_id = $2
          AND publication_status = 'draft' AND data_classification = 'real'`,
      [input.expectedRevisionId, course.id],
    );
    if (deleted.rowCount !== 1) throw new StaleCourseError();
    return;
  }

  const deleted = await client.query(
    `DELETE FROM public.catalog_items
      WHERE id = $1 AND item_type = 'course' AND published_revision_id IS NULL`,
    [course.id],
  );
  if (deleted.rowCount !== 1) throw new StaleCourseError();
}

async function publishCourse(
  client: PoolClient,
  courseId: string,
  input: LifecycleInput,
) {
  const preflight = await preflightRealCourseDraft(client, {
    courseId,
    revisionId: input.expectedRevisionId,
  });
  if (preflight.outcome === "invalid_lifecycle" &&
      preflight.issues?.[0]?.code === "stale_revision") {
    throw new StaleCourseError();
  }
  if (preflight.outcome === "ready_for_review") {
    await approveRealCourseDraft(client, {
      courseId,
      revisionId: input.expectedRevisionId,
    });
  } else if (preflight.outcome !== "ready_for_publication" &&
      preflight.outcome !== "published") {
    throw new CoursePublicationBlockedError(
      preflight.issues?.[0]?.message ?? "The Course does not meet the publication checks.",
    );
  }

  await publishApprovedRealCourse(client, {
    courseId,
    revisionId: input.expectedRevisionId,
    expectedPublishedRevisionId: input.expectedPublishedRevisionId,
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  await connection();
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403, headers: noStore });
  }

  try {
    assertDevelopmentTarget({
      directUrl: process.env.DATABASE_URL_UNPOOLED,
      pooledUrl: process.env.DATABASE_URL,
      projectId: process.env.NEON_PROJECT_ID,
      branchId: process.env.NEON_BRANCH_ID,
      neonBranch: process.env.NEON_BRANCH,
      vercel: process.env.VERCEL,
    });
    const actor = await requireAdmin();
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > maxBodyBytes) {
      return NextResponse.json({ error: "This request is too large." }, { status: 413, headers: noStore });
    }

    let body: unknown;
    try {
      const text = await request.text();
      if (new TextEncoder().encode(text).byteLength > maxBodyBytes) {
        return NextResponse.json({ error: "This request is too large." }, { status: 413, headers: noStore });
      }
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Please send a valid Course lifecycle action." }, { status: 400, headers: noStore });
    }
    if (!isLifecycleInput(body)) {
      return NextResponse.json({ error: "The Course lifecycle action is invalid." }, { status: 422, headers: noStore });
    }

    const { id } = await context.params;
    const client = await openAuthorizedClient();
    try {
      if (body.action === "publish") {
        let courseId: string;
        await client.query("BEGIN");
        try {
          await requireAdminInTransaction(client, actor.id);
          const course = await lockCourse(client, id);
          assertExpectedCourse(course, body);
          courseId = course.courseId;
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
        await publishCourse(client, courseId, body);
      } else {
        await client.query("BEGIN");
        try {
          await requireAdminInTransaction(client, actor.id);
          const course = await lockCourse(client, id);
          if (body.action === "archive") {
            await archiveCourse(client, course, body, actor.id);
          } else {
            await deleteDraft(client, course, body);
          }
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }
      return NextResponse.json({ id, action: body.action }, { headers: noStore });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof AdminAuthenticationRequiredError) {
      return NextResponse.json({ error: "Sign in before managing Courses." }, { status: 401, headers: noStore });
    }
    if (error instanceof AdminAccessDeniedError) {
      return NextResponse.json({ error: "Catalogue administration is not enabled for this account." }, { status: 403, headers: noStore });
    }
    if (error instanceof CourseNotFoundError) {
      return NextResponse.json({ error: "The Course record could not be found." }, { status: 404, headers: noStore });
    }
    if (error instanceof StaleCourseError) {
      return NextResponse.json({ error: "This Course changed since it was opened. Reload it before continuing." }, { status: 409, headers: noStore });
    }
    if (error instanceof InvalidCourseStateError || error instanceof CoursePublicationBlockedError) {
      return NextResponse.json({ error: error.message }, { status: 422, headers: noStore });
    }
    if (isRecord(error) && error.code === "23503") {
      return NextResponse.json({ error: "This Course draft is already referenced by another record and cannot be deleted." }, { status: 409, headers: noStore });
    }
    console.error("[careerbridge-next] Admin Course lifecycle action failed", error);
    return NextResponse.json({ error: "The Course action could not be completed." }, { status: 503, headers: noStore });
  }
}
