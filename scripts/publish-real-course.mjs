import { createRequire } from "node:module";
import nextEnv from "@next/env";
import pg from "pg";
import { assertDevelopmentTarget } from "./import-real-course-draft.mjs";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;
const require = createRequire(import.meta.url);
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = require("node:fs");
  const output = ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

const { validateRealCourseImportRecord } = require("../src/db/course-import-validation.ts");
const publicationLock = [20261124, 2];

function issue(code, message) {
  return { code, message };
}

function lifecycleResult(revision, item) {
  if (revision.data_classification !== "real") {
    return issue("invalid_state", "Only real course revisions can enter the publication workflow.");
  }
  if (revision.publication_status === "published") {
    return item.published_revision_id === revision.id
      ? null
      : issue("invalid_state", "A published course revision is not its course's published pointer.");
  }
  if (!["draft", "approved"].includes(revision.publication_status)) {
    return issue("invalid_lifecycle", "Only draft revisions can be approved and only approved revisions can be published.");
  }
  if (revision.published_at !== null) {
    return issue("invalid_state", "An unpublished course revision has a publication timestamp.");
  }
  return null;
}

async function loadCourseDraft(client, courseId, revisionId) {
  const result = await client.query(
    `SELECT i.id AS item_id, i.item_type, i.published_revision_id,
            r.id, r.catalog_item_id, r.revision_number, r.publication_status,
            r.data_classification, r.verification_status, r.title, r.summary,
            r.description, r.published_at,
            c.revision_id AS typed_revision_id, c.field_item_id, c.field_revision_id,
            c.qualification, c.stages, c.entry_after_class10, c.entry_after_class12,
            c.is_exploration_category, c.course_content
       FROM public.catalog_items i
       JOIN public.catalog_item_aliases a
         ON a.catalog_item_id=i.id
        AND a.source_system='careerbridge'
        AND a.external_type='course'
        AND a.external_context_key=''
       JOIN public.catalog_item_revisions r ON r.catalog_item_id=i.id
       LEFT JOIN public.course_revisions c ON c.revision_id=r.id
      WHERE a.external_key=$1 AND r.id=$2`,
    [courseId, revisionId],
  );
  return result.rowCount === 1 ? result.rows[0] : null;
}

async function preflightRecord(client, courseId, revisionId) {
  const row = await loadCourseDraft(client, courseId, revisionId);
  if (!row) return { outcome: "invalid_lifecycle", issues: [issue("not_found", "Course identity or revision was not found.")] };

  const stateIssue = lifecycleResult(row, row);
  if (stateIssue) return { outcome: stateIssue.code, issues: [stateIssue] };
  if (row.item_type !== "course" || row.typed_revision_id !== row.id) {
    return { outcome: "invalid_state", issues: [issue("typed_revision", "The course common revision does not have a matching typed course revision.")] };
  }
  if (row.publication_status !== "published") {
    const itemLock = await client.query(
      "SELECT id FROM public.catalog_items WHERE id=$1 AND item_type='course' FOR UPDATE",
      [row.item_id],
    );
    if (itemLock.rowCount !== 1) {
      return { outcome: "invalid_state", issues: [issue("course_identity", "The course identity could not be locked for publication.")] };
    }
    const latest = await client.query(
      `SELECT id
         FROM public.catalog_item_revisions
        WHERE catalog_item_id=$1 AND data_classification='real'
        ORDER BY revision_number DESC
        LIMIT 1`,
      [row.item_id],
    );
    if (latest.rows[0]?.id !== row.id) {
      return { outcome: "invalid_lifecycle", issues: [issue("stale_revision", "Only the latest saved real course revision can be approved or published.")] };
    }
  }

  const field = await client.query(
    `SELECT i.id AS item_id, i.item_type, i.published_revision_id, r.id AS revision_id,
            r.publication_status, r.data_classification, fr.revision_id AS typed_revision_id,
            a.external_key
       FROM public.catalog_items i
       JOIN public.catalog_item_aliases a
         ON a.catalog_item_id=i.id AND a.source_system='careerbridge'
        AND a.external_type='field' AND a.external_context_key=''
       JOIN public.catalog_item_revisions r ON r.id=i.published_revision_id AND r.catalog_item_id=i.id
       LEFT JOIN public.field_revisions fr ON fr.revision_id=r.id
      WHERE i.id=$1`, [row.field_item_id]);
  if (field.rowCount !== 1 || field.rows[0].item_type !== "field" ||
      field.rows[0].revision_id !== row.field_revision_id ||
      field.rows[0].publication_status !== "published" ||
      field.rows[0].data_classification !== "real" ||
      field.rows[0].typed_revision_id !== row.field_revision_id) {
    return { outcome: "blocked_evidence", issues: [issue("field_dependency", "The referenced field revision is not the current published real field revision.")] };
  }

  const aliases = await client.query(
    `SELECT source_system AS "sourceSystem", external_type AS "externalType",
            external_key AS "externalKey", external_context_key AS "externalContextKey"
       FROM public.catalog_item_aliases WHERE catalog_item_id=$1 ORDER BY source_system, external_type, external_key`, [row.item_id]);
  const provenance = await client.query(
    `SELECT crs.claim_key, crs.checked_at, crs.verified_at, crs.verification_status,
            sr.id AS source_id, sr.source_name, sr.canonical_url, sr.normalized_url, sr.status
       FROM public.catalog_revision_sources crs
       JOIN public.source_registry sr ON sr.id=crs.source_id
      WHERE crs.revision_id=$1 ORDER BY crs.claim_key, sr.id`, [row.id]);
  if (provenance.rowCount === 0) {
    return { outcome: "blocked_evidence", issues: [issue("provenance", "The course revision has no provenance records.")] };
  }
  const inactive = provenance.rows.find((source) => source.status !== "active");
  if (inactive) return { outcome: "blocked_evidence", issues: [issue("source_status", `Source ${inactive.source_name} is not active.`)] };
  const missingUrl = provenance.rows.find((source) => !source.canonical_url && !source.normalized_url);
  if (missingUrl) return { outcome: "blocked_evidence", issues: [issue("source_url", `Source ${missingUrl.source_name} has no canonical URL.`)] };

  try {
    validateRealCourseImportRecord({
      kind: "course",
      id: courseId,
      aliases: aliases.rows,
      field: {
        id: field.rows[0].external_key,
        catalogItemId: row.field_item_id,
        revisionId: row.field_revision_id,
        itemType: "field",
        publicationStatus: "published",
        dataClassification: "real",
      },
      revision: {
        title: row.title,
        summary: row.summary,
        description: row.description,
        publicationStatus: "draft",
        dataClassification: "real",
        verificationStatus: "verified",
        qualification: row.qualification,
        stages: row.stages,
        entryAfterClass10: row.entry_after_class10,
        entryAfterClass12: row.entry_after_class12,
        isExplorationCategory: row.is_exploration_category,
        courseContent: row.course_content,
        provenance: provenance.rows.map((source) => ({
          claimKey: source.claim_key,
          sourceId: source.source_id,
          sourceUrl: source.normalized_url ?? source.canonical_url,
          checkedAt: source.checked_at?.toISOString(),
          verifiedAt: source.verified_at?.toISOString(),
          verificationStatus: source.verification_status,
        })),
      },
    });
  } catch (error) {
    return { outcome: "blocked_evidence", issues: [issue("claim_evidence", error.message)] };
  }

  return {
    outcome: row.publication_status === "draft" ? "ready_for_review" :
      row.publication_status === "approved" ? "ready_for_publication" : "published",
    issues: [],
    courseItemId: row.item_id,
    revisionId: row.id,
    revisionNumber: row.revision_number,
    currentPublishedRevisionId: row.published_revision_id,
  };
}

export async function preflightRealCourseDraft(client, { courseId, revisionId }) {
  return preflightRecord(client, courseId, revisionId);
}

export async function approveRealCourseDraft(client, { courseId, revisionId }) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", publicationLock);
    const preflight = await preflightRecord(client, courseId, revisionId);
    if (preflight.outcome === "ready_for_publication") {
      await client.query("COMMIT");
      return { action: "unchanged", ...preflight };
    }
    if (preflight.outcome !== "ready_for_review") throw new Error(preflight.issues[0].message);
    const update = await client.query(
      `UPDATE public.catalog_item_revisions SET publication_status='approved', updated_at=now()
        WHERE id=$1 AND catalog_item_id=$2 AND publication_status='draft' AND data_classification='real'
        RETURNING id`, [revisionId, preflight.courseItemId]);
    if (update.rowCount !== 1) throw new Error("Course draft changed while approval was in progress.");
    await client.query("COMMIT");
    return { action: "approved", ...preflight, outcome: "ready_for_publication" };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}

export async function publishApprovedRealCourse(client, {
  courseId,
  revisionId,
  expectedPublishedRevisionId,
  failAfterRevisionUpdate = false,
}) {
  if (expectedPublishedRevisionId !== null && typeof expectedPublishedRevisionId !== "string") {
    throw new Error("expectedPublishedRevisionId must be a revision ID or null for first publication.");
  }
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", publicationLock);
    const preflight = await preflightRecord(client, courseId, revisionId);
    if (preflight.outcome === "published") {
      await client.query("COMMIT");
      return { action: "unchanged", ...preflight };
    }
    if (preflight.outcome !== "ready_for_publication") throw new Error(preflight.issues[0].message);
    if (preflight.currentPublishedRevisionId !== expectedPublishedRevisionId) {
      throw new Error("Course published pointer does not match the expected revision.");
    }
    const now = new Date();
    const revision = await client.query(
      `UPDATE public.catalog_item_revisions
          SET publication_status='published', published_at=$3, updated_at=$3
        WHERE id=$1 AND catalog_item_id=$2 AND publication_status='approved'
          AND data_classification='real' AND published_at IS NULL RETURNING id`,
      [revisionId, preflight.courseItemId, now]);
    if (revision.rowCount !== 1) throw new Error("Approved course revision changed while publication was in progress.");
    if (failAfterRevisionUpdate) throw new Error("Injected post-revision publication failure.");
    const pointer = await client.query(
      `UPDATE public.catalog_items SET published_revision_id=$2, updated_at=$4
        WHERE id=$1 AND item_type='course'
          AND published_revision_id IS NOT DISTINCT FROM $3 RETURNING id`,
      [preflight.courseItemId, revisionId, expectedPublishedRevisionId, now]);
    if (pointer.rowCount !== 1) throw new Error("Course published pointer changed while publication was in progress.");
    const verify = await client.query(
      `SELECT i.published_revision_id, r.publication_status, r.data_classification,
              c.revision_id AS typed_revision_id, count(crs.source_id)::int AS provenance_count
         FROM public.catalog_items i JOIN public.catalog_item_revisions r ON r.id=i.published_revision_id
         JOIN public.course_revisions c ON c.revision_id=r.id
         LEFT JOIN public.catalog_revision_sources crs ON crs.revision_id=r.id
        WHERE i.id=$1 GROUP BY i.published_revision_id, r.publication_status, r.data_classification, c.revision_id`,
      [preflight.courseItemId]);
    if (verify.rowCount !== 1 || verify.rows[0].published_revision_id !== revisionId ||
        verify.rows[0].publication_status !== "published" || verify.rows[0].data_classification !== "real" ||
        verify.rows[0].typed_revision_id !== revisionId || verify.rows[0].provenance_count < 1) {
      throw new Error("Post-publication verification failed.");
    }
    await client.query("COMMIT");
    return { action: "published", ...preflight, outcome: "published" };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}

async function runCli() {
  const [action, courseId, revisionId, expectedPublishedRevisionId] = process.argv.slice(2);
  if (!["preflight", "approve", "publish"].includes(action) || !courseId || !revisionId ||
      (action === "publish" && expectedPublishedRevisionId === undefined)) {
    throw new Error("Usage: node scripts/publish-real-course.mjs <preflight|approve> <course-id> <revision-id> | publish <course-id> <revision-id> <expected-revision-id|none>");
  }
  loadEnvConfig(process.cwd());
  assertDevelopmentTarget({
    directUrl: process.env.DATABASE_URL_UNPOOLED, pooledUrl: process.env.DATABASE_URL,
    projectId: process.env.NEON_PROJECT_ID, branchId: process.env.NEON_BRANCH_ID,
    neonBranch: process.env.NEON_BRANCH, vercel: process.env.VERCEL,
  });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED, max: 1 });
  const client = await pool.connect();
  try {
    const result = action === "preflight" ? await preflightRealCourseDraft(client, { courseId, revisionId }) :
      action === "approve" ? await approveRealCourseDraft(client, { courseId, revisionId }) :
      await publishApprovedRealCourse(client, {
        courseId,
        revisionId,
        expectedPublishedRevisionId: expectedPublishedRevisionId === "none" ? null : expectedPublishedRevisionId,
      });
    console.log(JSON.stringify(result, null, 2));
  } finally { client.release(); await pool.end(); }
}

if (process.argv[1] && new URL(`file:${process.argv[1]}`).href === import.meta.url) {
  runCli().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
