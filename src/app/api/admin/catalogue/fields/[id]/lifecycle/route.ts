import { connection, NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getIdentityLockPool } from "../../../../../../../db/pool";
import { invalidatePublishedFieldImageCache } from "../../../../../../../db/field-images";
import {
  AdminAccessDeniedError,
  AdminAuthenticationRequiredError,
  requireAdmin,
} from "../../../../../../admin-auth";
import { assertDevelopmentTarget } from "../../../../../../../../scripts/import-real-pathway-draft.mjs";

const noStore = { "Cache-Control": "no-store" };
const maxBodyBytes = 4096;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sections = [
  ["introduction", "Introduction"],
  ["broadlyInvolves", "What this field involves"],
  ["activitiesAndWorkAreas", "Activities and work areas"],
  ["learningAndSubjectConnections", "Learning and subject connections"],
  ["courseFamiliesToExplore", "Courses to explore"],
  ["furtherExploration", "Further exploration"],
] as const;

type LifecycleInput =
  | {
      action: "publish" | "archive" | "delete-draft";
      expectedRevisionId: string;
      expectedPublishedRevisionId: string | null;
    };

class FieldNotFoundError extends Error {}
class StaleFieldError extends Error {}
class InvalidFieldStateError extends Error {}
class IncompleteFieldError extends Error {}

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

async function openAuthorizedClient(actorId: number) {
  const client = await getIdentityLockPool().connect();
  try {
    const database = await client.query("SELECT current_database() AS database_name");
    if (database.rows[0]?.database_name !== "neondb") {
      throw new Error("Field lifecycle action refused outside the verified Neon development database.");
    }
    const user = await client.query(
      `SELECT id FROM public.users
        WHERE id=$1 AND role='admin' AND auth_provider='clerk' AND external_id IS NOT NULL
        FOR SHARE`,
      [actorId],
    );
    if (user.rowCount !== 1) throw new AdminAccessDeniedError();
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
}

async function lockField(client: PoolClient, identifier: string) {
  if (!/^[a-z0-9][a-z0-9._-]{0,179}$/i.test(identifier)) {
    throw new FieldNotFoundError();
  }
  const result = await client.query(
    `SELECT item.id,
            item.published_revision_id AS "publishedRevisionId",
            latest.id AS "latestRevisionId",
            latest.publication_status AS "publicationStatus",
            latest.revision_number AS "revisionNumber"
       FROM public.catalog_items AS item
       LEFT JOIN LATERAL (
         SELECT revision.id, revision.publication_status, revision.revision_number
           FROM public.catalog_item_revisions AS revision
          WHERE revision.catalog_item_id = item.id
          ORDER BY revision.revision_number DESC
          LIMIT 1
       ) AS latest ON true
      WHERE item.item_type = 'field'
        AND (
          item.id::text = $1
          OR EXISTS (
            SELECT 1
              FROM public.catalog_item_aliases AS alias
             WHERE alias.catalog_item_id = item.id
               AND alias.source_system = 'careerbridge'
               AND alias.external_type = 'field'
               AND alias.external_context_key = ''
               AND alias.external_key = $1
          )
        )
      LIMIT 1
      FOR UPDATE OF item`,
    [identifier],
  );
  const field = result.rows[0];
  if (!field) throw new FieldNotFoundError();
  return field;
}

async function publishField(
  client: PoolClient,
  field: Record<string, unknown>,
  input: LifecycleInput,
  actorId: number,
) {
  if (
    field.latestRevisionId !== input.expectedRevisionId ||
    field.publishedRevisionId !== input.expectedPublishedRevisionId
  ) throw new StaleFieldError();
  if (
    field.publicationStatus !== "in_review" &&
    field.publicationStatus !== "approved"
  ) throw new InvalidFieldStateError("Only a version marked ready for review can be published.");

  const contentResult = await client.query(
    `SELECT revision.title, field.field_content
       FROM public.catalog_item_revisions AS revision
       JOIN public.field_revisions AS field ON field.revision_id = revision.id
      WHERE revision.id = $1 AND revision.catalog_item_id = $2`,
    [input.expectedRevisionId, field.id],
  );
  const title = contentResult.rows[0]?.title;
  const content = contentResult.rows[0]?.field_content;
  if (typeof title !== "string" || !title.trim()) {
    throw new IncompleteFieldError("Add a Field name before publishing.");
  }
  const missing = sections
    .filter(([key]) =>
      !isRecord(content) || typeof content[key] !== "string" || !content[key].trim(),
    )
    .map(([, label]) => label);
  if (missing.length) {
    throw new IncompleteFieldError(`Complete these sections before publishing: ${missing.join(", ")}.`);
  }

  const updated = await client.query(
    `UPDATE public.catalog_item_revisions
        SET publication_status = 'published',
            published_at = NOW(),
            published_by = $2,
            updated_by = $2,
            updated_at = NOW()
      WHERE id = $1 AND catalog_item_id = $3
        AND publication_status IN ('in_review', 'approved')`,
    [input.expectedRevisionId, actorId, field.id],
  );
  if (updated.rowCount !== 1) throw new StaleFieldError();

  const pointer = await client.query(
    `UPDATE public.catalog_items
        SET published_revision_id = $1, updated_at = NOW()
      WHERE id = $2 AND published_revision_id IS NOT DISTINCT FROM $3`,
    [input.expectedRevisionId, field.id, input.expectedPublishedRevisionId],
  );
  if (pointer.rowCount !== 1) throw new StaleFieldError();
}

async function archiveField(
  client: PoolClient,
  field: Record<string, unknown>,
  input: LifecycleInput,
  actorId: number,
) {
  if (
    field.latestRevisionId !== input.expectedRevisionId ||
    field.publishedRevisionId !== input.expectedPublishedRevisionId
  ) throw new StaleFieldError();
  if (typeof field.publishedRevisionId !== "string") {
    throw new InvalidFieldStateError("This Field does not have a published version to archive.");
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
     RETURNING id`,
    [field.publishedRevisionId, actorId, field.id],
  );
  const archivedRevisionId = archived.rows[0]?.id;
  if (typeof archivedRevisionId !== "string") throw new StaleFieldError();

  const fieldRevision = await client.query(
    `INSERT INTO public.field_revisions (revision_id, field_content)
     SELECT $1, field.field_content
       FROM public.field_revisions AS field
      WHERE field.revision_id = $2`,
    [archivedRevisionId, field.publishedRevisionId],
  );
  if (fieldRevision.rowCount !== 1) {
    throw new InvalidFieldStateError("The published Field content could not be archived.");
  }
  await client.query(
    `INSERT INTO public.catalog_revision_sources
       (revision_id, source_id, claim_key, checked_at, verified_at, verification_status)
     SELECT $1, source_id, claim_key, checked_at, verified_at, verification_status
       FROM public.catalog_revision_sources
      WHERE revision_id = $2`,
    [archivedRevisionId, field.publishedRevisionId],
  );
  const pointer = await client.query(
    `UPDATE public.catalog_items
        SET published_revision_id = NULL, updated_at = NOW()
      WHERE id = $1 AND published_revision_id = $2`,
    [field.id, field.publishedRevisionId],
  );
  if (pointer.rowCount !== 1) throw new StaleFieldError();
}

async function deleteDraft(
  client: PoolClient,
  field: Record<string, unknown>,
  input: LifecycleInput,
) {
  if (
    field.latestRevisionId !== input.expectedRevisionId ||
    field.publishedRevisionId !== input.expectedPublishedRevisionId
  ) throw new StaleFieldError();
  if (field.publicationStatus !== "draft") {
    throw new InvalidFieldStateError("Only a draft version can be deleted.");
  }

  const publishedHistory = field.publishedRevisionId
    ? { rowCount: 1 }
    : await client.query(
        `SELECT 1 FROM public.catalog_item_revisions
          WHERE catalog_item_id = $1 AND publication_status = 'published'
          LIMIT 1`,
        [field.id],
      );
  if (publishedHistory.rowCount) {
    const deleted = await client.query(
      `DELETE FROM public.catalog_item_revisions
        WHERE id = $1 AND catalog_item_id = $2 AND publication_status = 'draft'`,
      [input.expectedRevisionId, field.id],
    );
    if (deleted.rowCount !== 1) throw new StaleFieldError();
    return;
  }

  const deleted = await client.query(
    `DELETE FROM public.catalog_items
      WHERE id = $1 AND item_type = 'field' AND published_revision_id IS NULL`,
    [field.id],
  );
  if (deleted.rowCount !== 1) throw new StaleFieldError();
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
      return NextResponse.json({ error: "Please send a valid Field lifecycle action." }, { status: 400, headers: noStore });
    }
    if (!isLifecycleInput(body)) {
      return NextResponse.json({ error: "The Field lifecycle action is invalid." }, { status: 422, headers: noStore });
    }

    const { id } = await context.params;
    const client = await openAuthorizedClient(actor.id);
    try {
      await client.query("BEGIN");
      try {
        const role = await client.query(
          `SELECT id FROM public.users
            WHERE id=$1 AND role='admin' AND auth_provider='clerk' AND external_id IS NOT NULL
            FOR SHARE`,
          [actor.id],
        );
        if (role.rowCount !== 1) throw new AdminAccessDeniedError();
        const field = await lockField(client, id);

        if (body.action === "publish") await publishField(client, field, body, actor.id);
        else if (body.action === "archive") await archiveField(client, field, body, actor.id);
        else await deleteDraft(client, field, body);

        await client.query("COMMIT");
        if (body.action === "publish" || body.action === "archive") {
          invalidatePublishedFieldImageCache();
        }
        return NextResponse.json({ id, action: body.action }, { headers: noStore });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof AdminAuthenticationRequiredError) {
      return NextResponse.json({ error: "Sign in before managing Fields." }, { status: 401, headers: noStore });
    }
    if (error instanceof AdminAccessDeniedError) {
      return NextResponse.json({ error: "Catalogue administration is not enabled for this account." }, { status: 403, headers: noStore });
    }
    if (error instanceof FieldNotFoundError) {
      return NextResponse.json({ error: "The Field record could not be found." }, { status: 404, headers: noStore });
    }
    if (error instanceof IncompleteFieldError || error instanceof InvalidFieldStateError) {
      return NextResponse.json({ error: error.message }, { status: 422, headers: noStore });
    }
    if (error instanceof StaleFieldError) {
      return NextResponse.json({ error: "This Field changed since it was opened. Reload it before continuing." }, { status: 409, headers: noStore });
    }
    if (isRecord(error) && error.code === "23503") {
      return NextResponse.json({ error: "This draft is already referenced by another record and cannot be deleted." }, { status: 409, headers: noStore });
    }
    console.error("[careerbridge-next] Admin Field lifecycle action failed", error);
    return NextResponse.json({ error: "The Field action could not be completed." }, { status: 503, headers: noStore });
  }
}
