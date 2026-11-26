import { createRequire } from "node:module";
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
const {
  validateRealExaminationImportRecord,
  requiredExaminationClaims,
} = require("../src/db/examination-import-validation.ts");
const {
  validateRealScholarshipImportRecord,
  requiredScholarshipClaims,
} = require("../src/db/scholarship-import-validation.ts");

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
  const user = await client.query(
    `SELECT id FROM public.users
      WHERE id=$1 AND role='admin' AND auth_provider='clerk' AND external_id IS NOT NULL
      FOR SHARE`,
    [reviewerUserId],
  );
  if (user.rowCount !== 1) {
    throw new Error("Pathway lifecycle actions require an existing Clerk-backed CareerBridge administrator.");
  }
}

const reviewableCatalogues = {
  exam: {
    itemType: "examination",
    aliasType: "examination",
    table: "examination_revisions",
    columns: "level, stages, purpose, programmes, authority, regions, fields, official_url",
    validate: validateRealExaminationImportRecord,
    requiredClaims: requiredExaminationClaims,
  },
  scholarship: {
    itemType: "scholarship",
    aliasType: "scholarship",
    table: "scholarship_revisions",
    columns: "category, provider, support, study_levels, eligibility_regions, scholarship_status, official_url, detail",
    validate: validateRealScholarshipImportRecord,
    requiredClaims: requiredScholarshipClaims,
  },
};

function catalogueError(code, message) {
  return { outcome: code, issues: [issue(code, message)] };
}

async function findReviewableRevision(client, kind, externalKey, revisionId) {
  const config = reviewableCatalogues[kind];
  if (!config) throw new Error("Catalogue kind must be exam or scholarship.");
  const identity = await client.query(
    `SELECT i.id AS item_id, i.item_type, i.published_revision_id,
            r.id, r.catalog_item_id, r.revision_number, r.publication_status,
            r.data_classification, r.verification_status, r.updated_by, r.title,
            r.summary, r.description, r.published_at, r.published_by,
            t.revision_id AS typed_revision_id, t.${config.columns}
       FROM public.catalog_item_aliases a
       JOIN public.catalog_items i ON i.id=a.catalog_item_id
       JOIN public.catalog_item_revisions r ON r.catalog_item_id=i.id
       LEFT JOIN public.${config.table} t ON t.revision_id=r.id
      WHERE a.source_system='careerbridge' AND a.external_type=$1
        AND a.external_key=$2 AND a.external_context_key='' AND r.id=$3`,
    [config.aliasType, externalKey, revisionId],
  );
  if (identity.rowCount !== 1) return null;
  const row = identity.rows[0];
  const [aliases, evidence] = await Promise.all([
    client.query(
      `SELECT source_system AS "sourceSystem", external_type AS "externalType",
              external_key AS "externalKey", external_context_key AS "externalContextKey"
         FROM public.catalog_item_aliases WHERE catalog_item_id=$1
        ORDER BY source_system, external_type, external_key, external_context_key`,
      [row.item_id],
    ),
    client.query(
      `SELECT crs.source_id, crs.claim_key, crs.checked_at, crs.verified_at,
              crs.verification_status, sr.source_name, sr.authority,
              sr.canonical_url, sr.normalized_url, sr.category, sr.source_type,
              sr.data_types, sr.terms_notes, sr.expected_update_behavior, sr.status
         FROM public.catalog_revision_sources crs
         LEFT JOIN public.source_registry sr ON sr.id=crs.source_id
        WHERE crs.revision_id=$1 ORDER BY crs.claim_key, crs.source_id`,
      [row.id],
    ),
  ]);
  return { row, aliases: aliases.rows, evidence: evidence.rows, config };
}

function buildReviewableRecord(kind, loaded) {
  const { row, aliases, evidence } = loaded;
  const sources = new Map();
  for (const entry of evidence) {
    if (!entry.source_id || !entry.source_name || !entry.canonical_url ||
        !entry.category || !entry.source_type || !entry.status) continue;
    if (!sources.has(entry.source_id)) {
      sources.set(entry.source_id, {
        sourceKey: `registered-${entry.source_id}`,
        sourceName: entry.source_name,
        authority: entry.authority,
        canonicalUrl: entry.canonical_url,
        category: entry.category,
        sourceType: entry.source_type,
        dataTypes: entry.data_types ?? [],
        termsNotes: entry.terms_notes,
        expectedUpdateBehavior: entry.expected_update_behavior,
        status: entry.status,
      });
    }
  }
  const revision = {
    title: row.title,
    summary: row.summary,
    description: row.description,
    publicationStatus: "draft",
    dataClassification: row.data_classification,
    verificationStatus: "pending_review",
    provenance: evidence.map((entry) => ({
      claimKey: entry.claim_key,
      sourceKey: `registered-${entry.source_id}`,
      sourceUrl: entry.canonical_url ?? entry.normalized_url,
      checkedAt: normalizeStoredTimestamp(entry.checked_at),
      verificationStatus: "pending_review",
    })),
  };
  if (kind === "exam") {
    revision.examination = {
      level: row.level,
      stages: row.stages,
      purpose: row.purpose,
      programmes: row.programmes,
      authority: row.authority,
      regions: row.regions,
      fields: row.fields,
      ...(row.official_url ? { officialUrl: row.official_url } : {}),
    };
  } else {
    revision.scholarship = {
      category: row.category,
      provider: row.provider,
      support: row.support,
      studyLevels: row.study_levels,
      eligibilityRegions: row.eligibility_regions,
      status: row.scholarship_status,
      ...(row.official_url ? { officialUrl: row.official_url } : {}),
      detail: row.detail,
    };
  }
  return { kind, id: loaded.id ?? "", aliases, revision, sources: [...sources.values()] };
}

function actualRequiredClaims(kind, record) {
  return reviewableCatalogues[kind].requiredClaims({ revision: record.revision });
}

function reviewableState(row, itemType) {
  if (row.item_type !== itemType) return issue("invalid_state", `The identity does not resolve to a ${itemType} item.`);
  if (row.data_classification !== "real") return issue("invalid_state", "Only real catalogue revisions can enter review and publication.");
  if (row.typed_revision_id !== row.id) return issue("typed_revision", "The common revision has no matching typed revision.");
  if (row.publication_status === "published") {
    if (row.published_at === null || row.published_revision_id !== row.id) {
      return issue("invalid_state", "The published revision is not its item's published pointer.");
    }
    return null;
  }
  if (!["draft", "in_review", "approved"].includes(row.publication_status)) {
    return issue("invalid_lifecycle", "Only draft, in-review, and approved revisions can be processed.");
  }
  if (row.published_at !== null) return issue("invalid_state", "An unpublished revision has a publication timestamp.");
  return null;
}

async function preflightReviewableCatalogue(client, { kind, externalKey, revisionId }) {
  const loaded = await findReviewableRevision(client, kind, externalKey, revisionId);
  if (!loaded) return catalogueError("not_found", "Catalogue identity or revision was not found.");
  const { row, evidence, config } = loaded;
  const stateIssue = reviewableState(row, config.itemType);
  if (stateIssue) return { outcome: stateIssue.code, issues: [stateIssue] };
  const record = buildReviewableRecord(kind, { ...loaded, id: externalKey });
  const requiredClaims = actualRequiredClaims(kind, record);
  if (evidence.length === 0) return catalogueError("blocked_evidence", "The revision has no registered claim-level provenance.");
  const inactive = evidence.find((source) => source.status !== "active");
  if (inactive) return catalogueError("blocked_evidence", `Registered source for ${inactive.claim_key} is not active.`);
  const missingUrl = evidence.find((source) => !source.canonical_url && !source.normalized_url);
  if (missingUrl) return catalogueError("blocked_evidence", `Registered source for ${missingUrl.claim_key} has no URL.`);
  try {
    config.validate(record);
  } catch (error) {
    return catalogueError("blocked_evidence", error.message);
  }
  const verifiedClaims = new Set(evidence
    .filter((entry) => entry.verification_status === "verified" && entry.verified_at !== null)
    .map((entry) => entry.claim_key));
  const missingClaims = requiredClaims.filter((claimKey) =>
    !evidence.some((entry) => entry.claim_key === claimKey),
  );
  if (missingClaims.length) {
    return catalogueError("blocked_evidence", `Missing claim-level provenance for: ${missingClaims.join(", ")}.`);
  }
  if (row.publication_status === "draft" && row.verification_status !== "pending_review") {
    return catalogueError("invalid_state", "A draft must remain pending review before submission.");
  }
  const allVerified = requiredClaims.every((claimKey) => verifiedClaims.has(claimKey));
  if (row.publication_status === "approved" && !allVerified) {
    return catalogueError("blocked_evidence", "Every required claim must have reviewed, verified evidence.");
  }
  return {
    outcome: row.publication_status === "draft" ? "ready_for_review" :
      row.publication_status === "in_review" ? allVerified ? "ready_for_approval" : "ready_for_evidence_review" :
        row.publication_status === "approved" ? "ready_for_publication" : "published",
    issues: [],
    kind,
    externalKey,
    catalogueItemId: row.item_id,
    revisionId: row.id,
    revisionNumber: row.revision_number,
    currentPublishedRevisionId: row.published_revision_id,
    requiredClaims,
    verifiedClaims: [...verifiedClaims],
    provenanceCount: evidence.length,
    record,
  };
}

export async function preflightRealExamScholarshipDraft(client, input) {
  return preflightReviewableCatalogue(client, input);
}

export async function getRealExamScholarshipReviewRecord(client, { kind, externalKey, revisionId }) {
  const loaded = await findReviewableRevision(client, kind, externalKey, revisionId);
  if (!loaded) return null;
  const { row, aliases, evidence, config } = loaded;
  if (row.item_type !== config.itemType || row.data_classification !== "real" ||
      !["draft", "in_review", "approved", "rejected"].includes(row.publication_status)) {
    return null;
  }
  const typed = kind === "exam" ? {
    level: row.level,
    stages: row.stages,
    purpose: row.purpose,
    programmes: row.programmes,
    authority: row.authority,
    regions: row.regions,
    fields: row.fields,
    officialUrl: row.official_url,
  } : {
    category: row.category,
    provider: row.provider,
    support: row.support,
    studyLevels: row.study_levels,
    eligibilityRegions: row.eligibility_regions,
    status: row.scholarship_status,
    officialUrl: row.official_url,
    detail: row.detail,
  };
  return {
    kind,
    externalKey,
    itemId: row.item_id,
    publishedRevisionId: row.published_revision_id,
    aliases,
    revision: {
      id: row.id,
      number: row.revision_number,
      publicationStatus: row.publication_status,
      dataClassification: row.data_classification,
      verificationStatus: row.verification_status,
      title: row.title,
      summary: row.summary,
      description: row.description,
      publishedAt: row.published_at,
      typed,
    },
    provenance: evidence.map((entry) => ({
      sourceId: entry.source_id,
      sourceName: entry.source_name,
      authority: entry.authority,
      canonicalUrl: entry.canonical_url,
      normalizedUrl: entry.normalized_url,
      status: entry.status,
      claimKey: entry.claim_key,
      checkedAt: entry.checked_at,
      verifiedAt: entry.verified_at,
      verificationStatus: entry.verification_status,
    })),
  };
}

export async function submitRealExamScholarshipDraftForReview(client, {
  kind, externalKey, revisionId, reviewerUserId,
}) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", publicationLock);
    await requireReviewer(client, reviewerUserId);
    const preflight = await preflightReviewableCatalogue(client, { kind, externalKey, revisionId });
    if (preflight.outcome !== "ready_for_review") throw new Error(preflight.issues[0]?.message ?? "Only an eligible draft can be submitted for review.");
    const updated = await client.query(
      `UPDATE public.catalog_item_revisions
          SET publication_status='in_review', updated_at=now(), updated_by=$3
        WHERE id=$1 AND catalog_item_id=$2 AND publication_status='draft'
          AND data_classification='real' AND verification_status='pending_review'
          AND published_at IS NULL
        RETURNING id`,
      [revisionId, preflight.catalogueItemId, reviewerUserId],
    );
    if (updated.rowCount !== 1) throw new Error("Catalogue draft changed while submission for review was in progress.");
    await client.query("COMMIT");
    return { action: "submitted_for_review", ...preflight, outcome: "in_review", record: undefined, submittedByUserId: reviewerUserId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function recordRealExamScholarshipEvidenceReview(client, {
  kind, externalKey, revisionId, reviewerUserId, claims,
}) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", publicationLock);
    await requireReviewer(client, reviewerUserId);
    const preflight = await preflightReviewableCatalogue(client, { kind, externalKey, revisionId });
    if (!["ready_for_evidence_review", "ready_for_approval"].includes(preflight.outcome)) {
      throw new Error(preflight.issues[0]?.message ?? "Evidence can be reviewed only for an in-review revision.");
    }
    if (!Array.isArray(claims) || claims.length !== preflight.requiredClaims.length) {
      throw new Error("Evidence review must cover each required claim exactly once.");
    }
    const keys = claims.map((claim) => claim?.claimKey);
    if (new Set(keys).size !== keys.length || preflight.requiredClaims.some((key) => !keys.includes(key)) ||
        keys.some((key) => !preflight.requiredClaims.includes(key))) {
      throw new Error("Evidence review must cover each required claim exactly once and no unrelated claims.");
    }
    for (const claim of claims) {
      if (!["verified", "disputed", "unavailable"].includes(claim.decision)) {
        throw new Error(`Unsupported evidence decision for ${claim.claimKey}.`);
      }
      if (!Array.isArray(claim.sourceUrls) || claim.sourceUrls.some((url) => typeof url !== "string")) {
        throw new Error(`Evidence review for ${claim.claimKey} must list the reviewed registered source URLs.`);
      }
      const actual = [...new Set(preflight.record.revision.provenance
        .filter((entry) => entry.claimKey === claim.claimKey)
        .map((entry) => entry.sourceUrl)
        .filter(Boolean))].sort();
      const provided = [...new Set(claim.sourceUrls)].sort();
      if (actual.length === 0 || JSON.stringify(actual) !== JSON.stringify(provided)) {
        throw new Error(`Reviewed source URLs for ${claim.claimKey} do not match its registered provenance.`);
      }
      if (claim.decision === "verified" && !claim.reviewedDirectly) {
        throw new Error(`Claim ${claim.claimKey} requires a direct-support attestation.`);
      }
      const updated = await client.query(
        `UPDATE public.catalog_revision_sources
            SET checked_at=now(), verified_at=CASE WHEN $3='verified' THEN now() ELSE NULL END,
                verification_status=$3
          WHERE revision_id=$1 AND claim_key=$2`,
        [revisionId, claim.claimKey, claim.decision],
      );
      if (updated.rowCount < 1) throw new Error(`No registered provenance rows found for ${claim.claimKey}.`);
    }
    const decisions = new Set(claims.map((claim) => claim.decision));
    const overall = decisions.size === 1 && decisions.has("verified") ? "verified" :
      decisions.has("disputed") ? "disputed" :
        decisions.has("unavailable") ? "unavailable" : "partially_verified";
    const revision = await client.query(
      `UPDATE public.catalog_item_revisions
          SET verification_status=$2, updated_at=now(), updated_by=$3
        WHERE id=$1 AND publication_status='in_review' AND data_classification='real'
        RETURNING id`,
      [revisionId, overall, reviewerUserId],
    );
    if (revision.rowCount !== 1) throw new Error("Catalogue lifecycle changed during evidence review.");
    await client.query("COMMIT");
    return {
      action: "evidence_reviewed",
      kind,
      externalKey,
      revisionId,
      reviewerUserId,
      verifiedClaims: claims.filter((claim) => claim.decision === "verified").map((claim) => claim.claimKey),
      unresolvedClaims: claims.filter((claim) => claim.decision !== "verified").map((claim) => claim.claimKey),
      evidenceCount: preflight.provenanceCount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function approveRealExamScholarshipDraft(client, {
  kind, externalKey, revisionId, reviewerUserId,
}) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", publicationLock);
    await requireReviewer(client, reviewerUserId);
    const preflight = await preflightReviewableCatalogue(client, { kind, externalKey, revisionId });
    if (preflight.outcome !== "ready_for_approval") throw new Error(preflight.issues[0]?.message ?? "Catalogue revision is not ready for approval.");
    const updated = await client.query(
      `UPDATE public.catalog_item_revisions
          SET publication_status='approved', updated_at=now(), updated_by=$3
        WHERE id=$1 AND catalog_item_id=$2 AND publication_status='in_review'
          AND data_classification='real' AND verification_status='verified'
          AND published_at IS NULL
        RETURNING id`,
      [revisionId, preflight.catalogueItemId, reviewerUserId],
    );
    if (updated.rowCount !== 1) throw new Error("Catalogue review changed while approval was in progress.");
    await client.query("COMMIT");
    return { action: "approved", ...preflight, outcome: "ready_for_publication", record: undefined, approverUserId: reviewerUserId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function rejectRealExamScholarshipDraft(client, {
  kind, externalKey, revisionId, reviewerUserId,
}) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", publicationLock);
    await requireReviewer(client, reviewerUserId);
    const loaded = await findReviewableRevision(client, kind, externalKey, revisionId);
    if (!loaded || loaded.row.item_type !== loaded.config.itemType ||
        !["in_review", "approved"].includes(loaded.row.publication_status) ||
        loaded.row.data_classification !== "real" || loaded.row.published_at !== null) {
      throw new Error("Only an unpublished real revision in review or approved can be rejected.");
    }
    const updated = await client.query(
      `UPDATE public.catalog_item_revisions
          SET publication_status='rejected', updated_at=now(), updated_by=$2
        WHERE id=$1 AND publication_status IN ('in_review', 'approved')
          AND data_classification='real' AND published_at IS NULL
        RETURNING id`,
      [revisionId, reviewerUserId],
    );
    if (updated.rowCount !== 1) throw new Error("Catalogue revision changed while rejection was in progress.");
    await client.query("COMMIT");
    return { action: "rejected", kind, externalKey, revisionId, reviewerUserId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function publishApprovedRealExamScholarship(client, {
  kind, externalKey, revisionId, expectedPublishedRevisionId, publisherUserId,
}) {
  if (expectedPublishedRevisionId !== null && typeof expectedPublishedRevisionId !== "string") {
    throw new Error("expectedPublishedRevisionId must be a revision ID or null for first publication.");
  }
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", publicationLock);
    await requireReviewer(client, publisherUserId);
    const preflight = await preflightReviewableCatalogue(client, { kind, externalKey, revisionId });
    if (preflight.outcome === "published") {
      await client.query("COMMIT");
      return { action: "unchanged", ...preflight, record: undefined };
    }
    if (preflight.outcome !== "ready_for_publication") throw new Error(preflight.issues[0]?.message ?? "Catalogue revision is not ready for publication.");
    if (preflight.currentPublishedRevisionId !== expectedPublishedRevisionId) {
      throw new Error("Catalogue published pointer does not match the expected revision.");
    }
    const now = new Date();
    const revision = await client.query(
      `UPDATE public.catalog_item_revisions
          SET publication_status='published', published_at=$3, updated_at=$3, published_by=$4
        WHERE id=$1 AND catalog_item_id=$2 AND publication_status='approved'
          AND data_classification='real' AND verification_status='verified'
          AND published_at IS NULL
        RETURNING id`,
      [revisionId, preflight.catalogueItemId, now, publisherUserId],
    );
    if (revision.rowCount !== 1) throw new Error("Approved catalogue revision changed during publication.");
    const config = reviewableCatalogues[kind];
    const pointer = await client.query(
      `UPDATE public.catalog_items SET published_revision_id=$2, updated_at=$4
        WHERE id=$1 AND item_type=$5 AND published_revision_id IS NOT DISTINCT FROM $3
        RETURNING id`,
      [preflight.catalogueItemId, revisionId, expectedPublishedRevisionId, now, config.itemType],
    );
    if (pointer.rowCount !== 1) throw new Error("Catalogue published pointer changed during publication.");
    const verification = await client.query(
      `SELECT i.published_revision_id, r.publication_status, r.data_classification,
              r.verification_status, t.revision_id AS typed_revision_id,
              count(crs.source_id)::int AS provenance_count,
              count(*) FILTER (WHERE crs.verification_status='verified' AND crs.verified_at IS NOT NULL)::int AS verified_count
         FROM public.catalog_items i
         JOIN public.catalog_item_revisions r ON r.id=i.published_revision_id AND r.catalog_item_id=i.id
         JOIN public.${config.table} t ON t.revision_id=r.id
         LEFT JOIN public.catalog_revision_sources crs ON crs.revision_id=r.id
        WHERE i.id=$1 AND i.item_type=$2
        GROUP BY i.published_revision_id, r.publication_status, r.data_classification,
                 r.verification_status, t.revision_id`,
      [preflight.catalogueItemId, config.itemType],
    );
    if (verification.rowCount !== 1 ||
        verification.rows[0].published_revision_id !== revisionId ||
        verification.rows[0].publication_status !== "published" ||
        verification.rows[0].data_classification !== "real" ||
        verification.rows[0].verification_status !== "verified" ||
        verification.rows[0].typed_revision_id !== revisionId ||
        verification.rows[0].provenance_count < preflight.requiredClaims.length ||
        verification.rows[0].verified_count < preflight.requiredClaims.length) {
      throw new Error("Post-publication pointer, typed revision, or claim-level evidence verification failed.");
    }
    await client.query("COMMIT");
    return { action: "published", ...preflight, outcome: "published", record: undefined, publisherUserId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
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
      [revisionId, preflight.pathwayItemId],
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
      [revisionId, preflight.pathwayItemId],
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
  if (action !== "preflight" || !pathwayId || !revisionId || fourth || fifth) {
    throw new Error("Usage: node scripts/publish-real-pathway.mjs preflight <pathway-id> <revision-id>. Write actions require an authenticated CareerBridge administrator through POST /api/admin/pathways/lifecycle.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED, connectionTimeoutMillis: 10000, max: 1 });
  const client = await pool.connect();
  try {
    const database = await client.query("SELECT current_database() AS database_name");
    if (database.rows[0].database_name !== "neondb") throw new Error("Refusing Pathways lifecycle operation: connected database is not the verified development database.");
    const result = await preflightRealPathwayDraft(client, { pathwayId, revisionId });
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
