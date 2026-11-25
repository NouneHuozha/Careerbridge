import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import pg from "pg";
import {
  assertDevelopmentTarget,
  expectedBranchId,
  expectedHost,
  expectedProjectId,
  verifyNeonDevelopmentEndpoint,
} from "./import-real-pathway-draft.mjs";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;
const publicationLock = [20261126, 1];
const requiredClaims = [
  "pathway.title",
  "pathway.summary",
  "pathway.description",
  "pathway.stage",
  "pathway.course_stage",
  "pathway.catalogue_group",
  "pathway.category",
  "pathway.steps",
  "pathway.progression",
  "pathway.qualification",
  "pathway.considerations",
];

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
const { validateRealPathwayImportRecord } = require("../src/db/pathway-import-validation.ts");

function issue(code, message) {
  return { code, message };
}

function normalizeStoredTimestamp(value) {
  if (!value) return null;
  const iso = new Date(value).toISOString();
  return iso.slice(11, 19) === "00:00:00" ? iso.slice(0, 10) : iso;
}

function requiredPathwayClaims(record) {
  const claims = [...requiredClaims];
  if (record.revision.routeContent.furtherProgression !== undefined) claims.push("pathway.further_progression");
  return claims;
}

async function findPathwayRevision(client, pathwayId, revisionId) {
  const identity = await client.query(
    `SELECT i.id AS item_id, i.item_type, i.published_revision_id,
            r.id, r.catalog_item_id, r.revision_number, r.publication_status,
            r.data_classification, r.verification_status, r.updated_by, r.title, r.summary,
            r.description, r.published_at,
            p.revision_id AS typed_revision_id, p.stage, p.course_stage,
            p.catalogue_group, p.category, p.route_content
       FROM public.catalog_item_aliases a
       JOIN public.catalog_items i ON i.id=a.catalog_item_id
       JOIN public.catalog_item_revisions r ON r.catalog_item_id=i.id
       LEFT JOIN public.pathway_revisions p ON p.revision_id=r.id
      WHERE a.source_system='careerbridge' AND a.external_type='pathway'
        AND a.external_key=$1 AND a.external_context_key='' AND r.id=$2`,
    [pathwayId, revisionId],
  );
  if (identity.rowCount !== 1) return null;
  const row = identity.rows[0];
  const aliases = await client.query(
    `SELECT source_system AS "sourceSystem", external_type AS "externalType",
            external_key AS "externalKey", external_context_key AS "externalContextKey"
       FROM public.catalog_item_aliases WHERE catalog_item_id=$1
      ORDER BY source_system, external_type, external_key, external_context_key`,
    [row.item_id],
  );
  const provenance = await client.query(
    `SELECT crs.source_id, crs.claim_key, crs.checked_at, crs.verified_at,
            crs.verification_status, sr.source_name, sr.authority, sr.canonical_url,
            sr.normalized_url, sr.category, sr.source_type, sr.data_types,
            sr.terms_notes, sr.expected_update_behavior, sr.status
       FROM public.catalog_revision_sources crs
       LEFT JOIN public.source_registry sr ON sr.id=crs.source_id
      WHERE crs.revision_id=$1 ORDER BY crs.claim_key, crs.source_id`,
    [row.id],
  );
  return { row, aliases: aliases.rows, provenance: provenance.rows };
}

function buildValidationRecord(pathwayId, loaded) {
  const { row, aliases, provenance } = loaded;
  const sources = new Map();
  for (const entry of provenance) {
    if (!entry.source_id || !entry.source_name || !entry.category || !entry.source_type || !entry.status) continue;
    if (!sources.has(entry.source_id)) {
      sources.set(entry.source_id, {
        sourceKey: `registered-${entry.source_id}`,
        sourceName: entry.source_name,
        authority: entry.authority,
        canonicalUrl: entry.canonical_url,
        normalizedUrl: entry.normalized_url ?? undefined,
        category: entry.category,
        sourceType: entry.source_type,
        dataTypes: entry.data_types ?? [],
        termsNotes: entry.terms_notes,
        expectedUpdateBehavior: entry.expected_update_behavior,
        status: entry.status,
      });
    }
  }
  return {
    kind: "pathway",
    id: pathwayId,
    aliases,
    route: {
      stage: row.stage,
      courseStage: row.course_stage,
      catalogueGroup: row.catalogue_group,
      category: row.category,
    },
    revision: {
      title: row.title,
      summary: row.summary,
      description: row.description,
      publicationStatus: "draft",
      dataClassification: row.data_classification,
      verificationStatus: row.verification_status,
      routeContent: row.route_content,
      provenance: provenance.map((entry) => ({
        claimKey: entry.claim_key,
        sourceKey: `registered-${entry.source_id}`,
        sourceUrl: entry.canonical_url ?? entry.normalized_url,
        checkedAt: normalizeStoredTimestamp(entry.checked_at),
        ...(entry.verified_at ? { verifiedAt: normalizeStoredTimestamp(entry.verified_at) } : {}),
        verificationStatus: entry.verification_status ?? "not_collected",
      })),
    },
    sources: [...sources.values()],
  };
}

function lifecycleState(row, item) {
  if (item.item_type !== "pathway") return issue("invalid_state", "The canonical identity does not resolve to a pathway item.");
  if (row.data_classification !== "real") return issue("invalid_state", "Only real pathway revisions can enter the review and publication workflow.");
  if (row.typed_revision_id !== row.id) return issue("invalid_state", "The revision has no matching typed pathway row.");
  if (row.publication_status === "published") {
    if (row.published_at === null || item.published_revision_id !== row.id) {
      return issue("invalid_state", "A published pathway revision is not its item's published pointer.");
    }
    return null;
  }
  if (!["draft", "in_review", "approved"].includes(row.publication_status)) {
    return issue("invalid_lifecycle", "Only draft revisions can enter review; only reviewed revisions can be approved and published.");
  }
  if (row.published_at !== null) return issue("invalid_state", "An unpublished pathway revision has a publication timestamp.");
  return null;
}

function evidenceVerified(record) {
  const required = requiredPathwayClaims(record);
  return record.revision.verificationStatus === "verified" && required.every((claimKey) =>
    record.revision.provenance.some((entry) => entry.claimKey === claimKey && entry.verificationStatus === "verified" && entry.verifiedAt),
  );
}

async function preflightRecord(client, pathwayId, revisionId) {
  const loaded = await findPathwayRevision(client, pathwayId, revisionId);
  if (!loaded) return { outcome: "invalid_lifecycle", issues: [issue("not_found", "Pathway identity or revision was not found.")] };
  const { row } = loaded;
  const stateIssue = lifecycleState(row, { item_type: row.item_type, published_revision_id: row.published_revision_id });
  if (stateIssue) return { outcome: stateIssue.code, issues: [stateIssue] };
  let record;
  try {
    record = buildValidationRecord(pathwayId, loaded);
    validateRealPathwayImportRecord(record);
  } catch (error) {
    return { outcome: "blocked_evidence", issues: [issue("claim_evidence", error.message)] };
  }
  const base = {
    issues: [],
    pathwayItemId: row.item_id,
    revisionId: row.id,
    revisionNumber: row.revision_number,
    currentPublishedRevisionId: row.published_revision_id,
    reviewerUserId: row.verification_status === "verified" ? row.updated_by : null,
    requiredClaims: requiredPathwayClaims(record),
    evidenceCount: loaded.provenance.length,
  };
  if (row.publication_status === "published") return { outcome: "published", ...base };
  if (row.publication_status === "draft") return { outcome: "ready_for_review", ...base };
  if (row.publication_status === "in_review") {
    return evidenceVerified(record)
      ? { outcome: "ready_for_approval", ...base }
      : { ...base, outcome: "blocked_evidence", issues: [issue("unverified_claims", "Every required claim must have verified source evidence before approval.")] };
  }
  if (row.publication_status === "approved") {
    return evidenceVerified(record)
      ? { outcome: "ready_for_publication", ...base }
      : { ...base, outcome: "blocked_evidence", issues: [issue("unverified_claims", "Every required claim must have verified source evidence before publication.")] };
  }
  return { outcome: "invalid_lifecycle", issues: [issue("unsupported_status", "Unsupported pathway lifecycle state.")] };
}

async function requireReviewer(client, reviewerUserId) {
  if (!Number.isInteger(reviewerUserId) || reviewerUserId < 1) throw new Error("reviewerUserId must be a positive existing CareerBridge user ID.");
  const user = await client.query("SELECT id FROM public.users WHERE id=$1", [reviewerUserId]);
  if (user.rowCount !== 1) throw new Error(`CareerBridge reviewer user ${reviewerUserId} does not exist.`);
}

export async function preflightRealPathwayDraft(client, { pathwayId, revisionId }) {
  return preflightRecord(client, pathwayId, revisionId);
}

export async function submitRealPathwayDraftForReview(client, { pathwayId, revisionId, reviewerUserId }) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", publicationLock);
    await requireReviewer(client, reviewerUserId);
    const preflight = await preflightRecord(client, pathwayId, revisionId);
    if (preflight.outcome !== "ready_for_review") throw new Error(preflight.issues[0]?.message ?? "Only an eligible draft can be submitted for review.");
    const update = await client.query(
      `UPDATE public.catalog_item_revisions
          SET publication_status='in_review', updated_at=now()
        WHERE id=$1 AND catalog_item_id=$2 AND publication_status='draft'
          AND data_classification='real' AND published_at IS NULL
        RETURNING id`,
      [revisionId, preflight.pathwayItemId, reviewerUserId],
    );
    if (update.rowCount !== 1) throw new Error("Pathway draft changed while submission for review was in progress.");
    await client.query("COMMIT");
    return { action: "submitted_for_review", ...preflight, outcome: "in_review", submittedByUserId: reviewerUserId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function recordRealPathwayEvidenceReview(client, { pathwayId, revisionId, review }) {
  if (!review || typeof review !== "object" || Array.isArray(review)) throw new Error("Review decision must be a JSON object.");
  if (!Array.isArray(review.claims)) throw new Error("Review decision must contain a claims array.");
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", publicationLock);
    await requireReviewer(client, review.reviewerUserId);
    const loaded = await findPathwayRevision(client, pathwayId, revisionId);
    if (!loaded) throw new Error("Pathway identity or revision was not found.");
    const { row } = loaded;
    const stateIssue = lifecycleState(row, { item_type: row.item_type, published_revision_id: row.published_revision_id });
    if (stateIssue) throw new Error(stateIssue.message);
    if (row.publication_status !== "in_review") throw new Error("Claim evidence can be reviewed only after the draft enters in_review.");
    const record = buildValidationRecord(pathwayId, loaded);
    validateRealPathwayImportRecord(record);
    const claims = review.claims;
    const claimKeys = claims.map((claim) => claim?.claimKey);
    const required = requiredPathwayClaims(record);
    if (new Set(claimKeys).size !== claimKeys.length || required.some((claimKey) => !claimKeys.includes(claimKey)) || claimKeys.some((claimKey) => !required.includes(claimKey))) {
      throw new Error("Review decision must cover each required claim exactly once and no unrelated claims.");
    }
    for (const claim of claims) {
      if (claim.decision !== "verified") throw new Error(`Claim ${claim.claimKey} is not attested as verified; approval remains blocked.`);
      if (!Array.isArray(claim.sourceUrls) || claim.sourceUrls.some((url) => typeof url !== "string")) {
        throw new Error(`Review decision for ${claim.claimKey} must list the exact source URLs reviewed.`);
      }
      const actual = [...new Set(loaded.provenance.filter((entry) => entry.claim_key === claim.claimKey).map((entry) => entry.canonical_url ?? entry.normalized_url).filter(Boolean))].sort();
      const provided = [...new Set(claim.sourceUrls)].sort();
      if (actual.length === 0 || JSON.stringify(actual) !== JSON.stringify(provided)) {
        throw new Error(`Review source URLs for ${claim.claimKey} do not match the revision's registered provenance.`);
      }
      const evidence = await client.query(
        `UPDATE public.catalog_revision_sources
            SET checked_at=now(), verified_at=now(), verification_status='verified'
          WHERE revision_id=$1 AND claim_key=$2`,
        [revisionId, claim.claimKey],
      );
      if (evidence.rowCount < 1) throw new Error(`No registered evidence rows found for ${claim.claimKey}.`);
    }
    const update = await client.query(
      `UPDATE public.catalog_item_revisions
          SET verification_status='verified', updated_at=now(), updated_by=$2
        WHERE id=$1 AND publication_status='in_review' AND data_classification='real'
        RETURNING id`,
      [revisionId, review.reviewerUserId],
    );
    if (update.rowCount !== 1) throw new Error("Pathway lifecycle changed while evidence review was in progress.");
    await client.query("COMMIT");
    return {
      action: "evidence_verified",
      pathwayId,
      revisionId,
      reviewerUserId: review.reviewerUserId,
      verifiedClaims: required,
      evidenceCount: loaded.provenance.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function approveRealPathwayDraft(client, { pathwayId, revisionId, reviewerUserId }) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", publicationLock);
    await requireReviewer(client, reviewerUserId);
    const preflight = await preflightRecord(client, pathwayId, revisionId);
    if (preflight.outcome !== "ready_for_approval") throw new Error(preflight.issues[0]?.message ?? "Pathway is not ready for approval.");
    const update = await client.query(
      `UPDATE public.catalog_item_revisions
          SET publication_status='approved', updated_at=now()
        WHERE id=$1 AND catalog_item_id=$2 AND publication_status='in_review'
          AND data_classification='real' AND verification_status='verified'
          AND published_at IS NULL
        RETURNING id`,
      [revisionId, preflight.pathwayItemId, reviewerUserId],
    );
    if (update.rowCount !== 1) throw new Error("Pathway review changed while approval was in progress.");
    await client.query("COMMIT");
    return { action: "approved", ...preflight, outcome: "ready_for_publication", approverUserId: reviewerUserId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function publishApprovedRealPathway(client, {
  pathwayId,
  revisionId,
  expectedPublishedRevisionId,
  publisherUserId,
}) {
  if (expectedPublishedRevisionId !== null && typeof expectedPublishedRevisionId !== "string") {
    throw new Error("expectedPublishedRevisionId must be a revision ID or null for first publication.");
  }
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", publicationLock);
    await requireReviewer(client, publisherUserId);
    const preflight = await preflightRecord(client, pathwayId, revisionId);
    if (preflight.outcome === "published") {
      await client.query("COMMIT");
      return { action: "unchanged", ...preflight };
    }
    if (preflight.outcome !== "ready_for_publication") throw new Error(preflight.issues[0]?.message ?? "Pathway is not ready for publication.");
    if (preflight.currentPublishedRevisionId !== expectedPublishedRevisionId) {
      throw new Error("Pathway published pointer does not match the expected revision.");
    }
    const now = new Date();
    const revision = await client.query(
      `UPDATE public.catalog_item_revisions
          SET publication_status='published', published_at=$3, updated_at=$3,
              published_by=$4
        WHERE id=$1 AND catalog_item_id=$2 AND publication_status='approved'
          AND data_classification='real' AND verification_status='verified'
          AND published_at IS NULL
        RETURNING id`,
      [revisionId, preflight.pathwayItemId, now, publisherUserId],
    );
    if (revision.rowCount !== 1) throw new Error("Approved pathway revision changed while publication was in progress.");
    const pointer = await client.query(
      `UPDATE public.catalog_items SET published_revision_id=$2, updated_at=$4
        WHERE id=$1 AND item_type='pathway'
          AND published_revision_id IS NOT DISTINCT FROM $3
        RETURNING id`,
      [preflight.pathwayItemId, revisionId, expectedPublishedRevisionId, now],
    );
    if (pointer.rowCount !== 1) throw new Error("Pathway published pointer changed while publication was in progress.");
    const verification = await client.query(
      `SELECT i.published_revision_id, r.publication_status, r.data_classification,
              r.verification_status, p.revision_id AS typed_revision_id,
              count(crs.source_id)::int AS provenance_count,
              count(*) FILTER (WHERE crs.verification_status='verified' AND crs.verified_at IS NOT NULL)::int AS verified_count
         FROM public.catalog_items i
         JOIN public.catalog_item_revisions r ON r.id=i.published_revision_id AND r.catalog_item_id=i.id
         JOIN public.pathway_revisions p ON p.revision_id=r.id
         LEFT JOIN public.catalog_revision_sources crs ON crs.revision_id=r.id
        WHERE i.id=$1 AND i.item_type='pathway'
        GROUP BY i.published_revision_id, r.publication_status,
                 r.data_classification, r.verification_status, p.revision_id`,
      [preflight.pathwayItemId],
    );
    const verifiedClaims = new Set((await client.query(
      `SELECT claim_key FROM public.catalog_revision_sources
        WHERE revision_id=$1 AND verification_status='verified' AND verified_at IS NOT NULL`,
      [revisionId],
    )).rows.map((entry) => entry.claim_key));
    const required = preflight.requiredClaims ?? requiredClaims;
    if (verification.rowCount !== 1 ||
        verification.rows[0].published_revision_id !== revisionId ||
        verification.rows[0].publication_status !== "published" ||
        verification.rows[0].data_classification !== "real" ||
        verification.rows[0].verification_status !== "verified" ||
        verification.rows[0].typed_revision_id !== revisionId ||
        verification.rows[0].provenance_count < required.length ||
        required.some((claimKey) => !verifiedClaims.has(claimKey))) {
      throw new Error("Pathway post-publication pointer, type, provenance, or evidence verification failed.");
    }
    await client.query("COMMIT");
    return { action: "published", ...preflight, outcome: "published", publisherUserId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function loadReviewFile(path) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new Error("Review decision file must be readable valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
      Object.keys(parsed).some((key) => !["reviewerUserId", "claims"].includes(key))) {
    throw new Error("Review decision must contain only reviewerUserId and claims.");
  }
  return parsed;
}

async function runCli() {
  loadEnvConfig(process.cwd());
  assertDevelopmentTarget({
    directUrl: process.env.DATABASE_URL_UNPOOLED,
    pooledUrl: process.env.DATABASE_URL,
    projectId: process.env.NEON_PROJECT_ID,
    branchId: process.env.NEON_BRANCH_ID,
    neonBranch: process.env.NEON_BRANCH,
    vercel: process.env.VERCEL,
  });
  verifyNeonDevelopmentEndpoint();
  const [action, pathwayId, revisionId, fourth, fifth] = process.argv.slice(2);
  if (!action || !pathwayId || !revisionId || !["preflight", "submit", "review", "approve", "publish"].includes(action)) {
    throw new Error("Usage: node scripts/publish-real-pathway.mjs <preflight|submit|review|approve|publish> <pathway-id> <revision-id> [reviewer-id|review-file|expected-pointer] [publisher-id]");
  }
  if (action === "submit" && !fourth) throw new Error("submit requires a reviewer user ID.");
  if (action === "review" && !fourth) throw new Error("review requires a review-decision JSON file.");
  if (action === "approve" && !fourth) throw new Error("approve requires a reviewer user ID.");
  if (action === "publish" && (fourth === undefined || !fifth)) throw new Error("publish requires <expected-pointer|none> and a publisher user ID.");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED, connectionTimeoutMillis: 10000, max: 1 });
  const client = await pool.connect();
  try {
    const database = await client.query("SELECT current_database() AS database_name");
    if (database.rows[0].database_name !== "neondb") throw new Error("Refusing Pathways lifecycle operation: connected database is not the verified development database.");
    const result = action === "preflight"
      ? await preflightRealPathwayDraft(client, { pathwayId, revisionId })
      : action === "submit"
        ? await submitRealPathwayDraftForReview(client, { pathwayId, revisionId, reviewerUserId: Number(fourth) })
        : action === "review"
          ? await recordRealPathwayEvidenceReview(client, { pathwayId, revisionId, review: await loadReviewFile(resolve(fourth)) })
          : action === "approve"
            ? await approveRealPathwayDraft(client, { pathwayId, revisionId, reviewerUserId: Number(fourth) })
            : await publishApprovedRealPathway(client, {
                pathwayId,
                revisionId,
                expectedPublishedRevisionId: fourth === "none" ? null : fourth,
                publisherUserId: Number(fifth),
              });
    console.log(JSON.stringify({ target: { projectId: expectedProjectId, branchId: expectedBranchId, endpointHost: expectedHost }, ...result }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    console.error(`Pathways lifecycle operation failed: ${error.message}`);
    process.exitCode = 1;
  });
}
