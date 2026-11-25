import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import nextEnv from "@next/env";
import pg from "pg";
import { reconcileSourceRegistry } from "../src/db/source-reconciliation.mjs";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

loadEnvConfig(repositoryRoot);

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

const {
  validateRealCourseImportRecord,
  hashRealCourseImportRecord,
  decideCourseImportRevision,
} = require("../src/db/course-import-validation.ts");

export const expectedProjectId = "calm-brook-21165945";
export const expectedBranchId = "br-wandering-flower-a1f6ys66";
export const expectedHost = "ep-divine-fog-a1uxos5z.ap-southeast-1.aws.neon.tech";

export function assertDevelopmentTarget({
  directUrl,
  pooledUrl,
  projectId,
  branchId,
  vercel,
  neonBranch,
}) {
  if (!directUrl) throw new Error("DATABASE_URL_UNPOOLED is required.");
  if (!pooledUrl) throw new Error("DATABASE_URL is required.");

  let direct;
  let pooled;
  try {
    direct = new URL(directUrl);
    pooled = new URL(pooledUrl);
  } catch {
    throw new Error("Database URLs must be valid PostgreSQL URLs.");
  }

  if (
    direct.protocol !== "postgresql:" && direct.protocol !== "postgres:" ||
    pooled.protocol !== "postgresql:" && pooled.protocol !== "postgres:"
  ) {
    throw new Error("Database URLs must use PostgreSQL.");
  }
  if (direct.hostname === pooled.hostname || direct.hostname.includes("-pooler")) {
    throw new Error("DATABASE_URL_UNPOOLED must be direct and DATABASE_URL must not be substituted.");
  }
  if (direct.hostname !== expectedHost) {
    throw new Error("Refusing import: DATABASE_URL_UNPOOLED is not the verified development endpoint.");
  }
  if (
    pooled.hostname !== `${expectedHost.split(".")[0]}-pooler.${expectedHost.split(".").slice(1).join(".")}`
  ) {
    throw new Error("Refusing import: DATABASE_URL is not the matching development pooler endpoint.");
  }
  if (direct.pathname !== pooled.pathname || direct.username !== pooled.username) {
    throw new Error("Refusing import: pooled and direct database URLs do not identify the same database.");
  }
  if (projectId !== expectedProjectId) {
    throw new Error("Refusing import: NEON_PROJECT_ID does not identify the development project.");
  }
  if (branchId !== expectedBranchId || neonBranch !== "development") {
    throw new Error("Refusing import: NEON_BRANCH and NEON_BRANCH_ID do not identify development.");
  }
  if (vercel) {
    throw new Error("Refusing import: real-course draft import is a local operation.");
  }
  return {
    projectId: expectedProjectId,
    branchId: expectedBranchId,
    endpointHost: direct.hostname,
  };
}

export function requireExactlyOneRecord(value) {
  if (Array.isArray(value)) {
    throw new Error("Exactly one course record is required; arrays are not accepted.");
  }
  if (!value || typeof value !== "object") {
    throw new Error("Exactly one course record is required.");
  }
  return value;
}

function sourceMetadataLookup(payload, provenance) {
  if (provenance.sourceKey) {
    return (payload.sources ?? []).find((source) => source.sourceKey === provenance.sourceKey) ?? null;
  }
  return null;
}

function normalizeStoredTimestamp(value) {
  if (!value) return null;
  const iso = value.toISOString();
  return iso.slice(11, 16) === "00:00" ? iso.slice(0, 10) : iso;
}

async function resolveProvenanceSource(client, payload, provenance, index) {
  const path = `revision.provenance[${index}]`;
  let source = null;
  if (provenance.sourceId) {
    const result = await client.query(
      `SELECT id, source_name, authority, canonical_url, normalized_url, category, source_type, status
       FROM public.source_registry
       WHERE id = $1`,
      [provenance.sourceId],
    );
    if (result.rowCount !== 1) {
      throw new Error(`${path}.sourceId: existing source registry record was not found.`);
    }
    source = result.rows[0];
  } else if (provenance.sourceKey) {
    const metadata = sourceMetadataLookup(payload, provenance);
    if (!metadata) throw new Error(`${path}.sourceKey: source metadata was not found.`);

    let result;
    if (metadata.canonicalUrl || metadata.normalizedUrl) {
      const url = metadata.normalizedUrl ?? metadata.canonicalUrl;
      result = await client.query(
        `SELECT id, source_name, authority, canonical_url, normalized_url, category, source_type, status
         FROM public.source_registry
         WHERE canonical_url = $1 OR normalized_url = $1
         LIMIT 2`,
        [url],
      );
    } else {
      result = await client.query(
        `SELECT id, source_name, authority, canonical_url, normalized_url, category, source_type, status
         FROM public.source_registry
         WHERE source_name = $1 AND category = $2 AND source_type = $3
           AND (($4::text IS NULL AND authority IS NULL) OR authority = $4)
         LIMIT 2`,
        [
          metadata.sourceName,
          metadata.category,
          metadata.sourceType,
          metadata.authority ?? null,
        ],
      );
    }
    if (result.rowCount !== 1) {
      throw new Error(`${path}.sourceKey: expected exactly one existing source registry record.`);
    }
    source = result.rows[0];
  } else if (provenance.sourceUrl) {
    const result = await client.query(
      `SELECT id, source_name, authority, canonical_url, normalized_url, category, source_type, status
       FROM public.source_registry
       WHERE canonical_url = $1 OR normalized_url = $1
       LIMIT 2`,
      [provenance.sourceUrl],
    );
    if (result.rowCount !== 1) {
      throw new Error(`${path}.sourceUrl: expected exactly one existing source registry record.`);
    }
    source = result.rows[0];
  } else {
    throw new Error(`${path}: must reference an existing source.`);
  }

  if (source.status !== "active") {
    throw new Error(`${path}: referenced source registry record is not active.`);
  }

  if (provenance.sourceUrl) {
    const urls = [source.canonical_url, source.normalized_url].filter(Boolean);
    if (urls.length > 0 && !urls.includes(provenance.sourceUrl)) {
      throw new Error(`${path}.sourceUrl: conflicts with the existing source registry URL.`);
    }
  }

  return source;
}

async function verifyCourseIdentity(client, payload) {
  const courseAlias = payload.aliases.find(
    (alias) =>
      alias.sourceSystem === "careerbridge" &&
      alias.externalType === "course" &&
      alias.externalKey === payload.id &&
      alias.externalContextKey === "",
  );
  if (!courseAlias) throw new Error("aliases: missing canonical CareerBridge course alias.");

  const aliasResult = await client.query(
    `SELECT i.id, i.item_type, i.published_revision_id
     FROM public.catalog_item_aliases a
     JOIN public.catalog_items i ON i.id = a.catalog_item_id
     WHERE a.source_system = 'careerbridge'
       AND a.external_type = 'course'
       AND a.external_key = $1
       AND a.external_context_key = ''`,
    [payload.id],
  );
  if (aliasResult.rowCount !== 1) {
    throw new Error(`Course identity alias "${payload.id}" must resolve to exactly one existing course.`);
  }
  if (aliasResult.rows[0].item_type !== "course") {
    throw new Error(`Course identity "${payload.id}" does not resolve to a course item.`);
  }
  return aliasResult.rows[0];
}

async function verifyFieldDependency(client, payload) {
  const field = payload.field;
  const result = await client.query(
    `SELECT i.id AS item_id, i.item_type, i.published_revision_id,
            r.id AS revision_id, r.publication_status, r.data_classification,
            fr.revision_id AS typed_revision_id,
            a.external_key AS field_id
     FROM public.catalog_items i
     JOIN public.catalog_item_aliases a
       ON a.catalog_item_id = i.id
      AND a.source_system = 'careerbridge'
      AND a.external_type = 'field'
      AND a.external_context_key = ''
     JOIN public.catalog_item_revisions r
       ON r.id = i.published_revision_id
      AND r.catalog_item_id = i.id
     LEFT JOIN public.field_revisions fr ON fr.revision_id = r.id
     WHERE i.id = $1`,
    [field.catalogItemId],
  );
  if (result.rowCount !== 1) throw new Error("field.catalogItemId: existing published field item was not found.");
  const row = result.rows[0];
  if (row.item_type !== "field") throw new Error("field.itemType: database item is not a field.");
  if (row.field_id !== field.id) throw new Error("field.id: database field alias does not match payload.");
  if (row.revision_id !== field.revisionId) throw new Error("field.revisionId: payload revision does not match the published field pointer.");
  if (row.published_revision_id !== row.revision_id) throw new Error("field.revisionId: published field pointer mismatch.");
  if (row.publication_status !== "published") throw new Error("field.publicationStatus: field revision is not published.");
  if (row.data_classification !== "real") throw new Error("field.dataClassification: field revision is not real.");
  if (row.typed_revision_id !== row.revision_id) throw new Error("field.revisionId: matching typed field revision was not found.");
  return row;
}

async function getLatestExistingRevision(client, courseItemId) {
  const result = await client.query(
    `SELECT r.id, r.revision_number, r.publication_status, r.data_classification,
            r.title, r.summary,
            r.description, r.verification_status,
            r.published_at, c.field_item_id, c.field_revision_id,
            c.revision_id AS typed_revision_id, c.qualification, c.stages, c.entry_after_class10,
            c.entry_after_class12, c.is_exploration_category, c.course_content
     FROM public.catalog_item_revisions r
     LEFT JOIN public.course_revisions c ON c.revision_id = r.id
     WHERE r.catalog_item_id = $1
     ORDER BY r.revision_number`,
    [courseItemId],
  );
  return result.rows;
}

function existingRevisionPayload(payload, row) {
  if (!row) return null;
  const provenance = [];
  return {
    kind: "course",
    id: payload.id,
    aliases: payload.aliases,
    field: {
      id: payload.field.id,
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
      verificationStatus: row.verification_status,
      qualification: row.qualification,
      stages: row.stages,
      entryAfterClass10: row.entry_after_class10,
      entryAfterClass12: row.entry_after_class12,
      isExplorationCategory: row.is_exploration_category,
      courseContent: row.course_content,
      provenance,
    },
  };
}

function provenanceMatchesSource(payload, provenance, source) {
  if (provenance.claimKey !== source.claim_key) return false;
  if (provenance.sourceId) return provenance.sourceId === source.source_id;

  const metadata = sourceMetadataLookup(payload, provenance);
  const expectedUrls = [
    provenance.sourceUrl,
    metadata?.canonicalUrl,
    metadata?.normalizedUrl,
  ].filter(Boolean);
  const sourceUrls = [source.canonical_url, source.normalized_url].filter(Boolean);
  if (expectedUrls.length > 0) {
    return expectedUrls.some((url) => sourceUrls.includes(url));
  }
  if (!metadata) return false;

  return metadata.sourceName === source.source_name &&
    (metadata.authority ?? null) === source.authority &&
    metadata.category === source.category &&
    metadata.sourceType === source.source_type;
}

async function existingPayloadWithProvenance(client, payload, row) {
  if (!row) return null;
  const sourceRows = await client.query(
    `SELECT s.source_id, sr.source_name, sr.authority, sr.canonical_url,
            sr.normalized_url, sr.category, sr.source_type, sr.status,
            s.claim_key, s.checked_at, s.verified_at, s.verification_status
     FROM public.catalog_revision_sources s
     JOIN public.source_registry sr ON sr.id = s.source_id
     WHERE s.revision_id = $1
     ORDER BY s.claim_key, s.source_id`,
    [row.id],
  );
  const sourcesById = new Map();
  for (const source of sourceRows.rows) {
    if (!sourcesById.has(source.source_id)) {
      sourcesById.set(source.source_id, {
        sourceKey: `existing-source:${source.source_id}`,
        sourceName: source.source_name,
        authority: source.authority,
        canonicalUrl: source.canonical_url,
        normalizedUrl: source.normalized_url,
        category: source.category,
        sourceType: source.source_type,
        status: source.status,
      });
    }
  }
  const provenance = sourceRows.rows.map((source) => {
    const incoming = (payload.revision.provenance ?? []).find(
      (entry) => provenanceMatchesSource(payload, entry, source),
    );
    const matchingSourceMetadata = incoming?.sourceKey
      ? (payload.sources ?? []).find((candidate) => candidate.sourceKey === incoming.sourceKey)
      : null;
    return {
      claimKey: source.claim_key,
      ...(incoming?.sourceKey
        ? { sourceKey: incoming.sourceKey }
        : { sourceId: source.source_id }),
      sourceUrl:
        matchingSourceMetadata?.normalizedUrl ??
        matchingSourceMetadata?.canonicalUrl ??
        source.canonical_url ??
        source.normalized_url ??
        undefined,
      checkedAt: normalizeStoredTimestamp(source.checked_at),
      ...(source.verified_at
        ? { verifiedAt: normalizeStoredTimestamp(source.verified_at) }
        : {}),
      verificationStatus: source.verification_status ?? "not_collected",
    };
  });
  const candidate = existingRevisionPayload(payload, row);
  candidate.revision.provenance = provenance;
  candidate.sources = payload.sources ?? [];
  return candidate;
}

export async function importOneRealCourseDraft(client, payload, { preview = false } = {}) {
  const record = requireExactlyOneRecord(payload);
  validateRealCourseImportRecord(record);
  await client.query(preview ? "BEGIN READ ONLY" : "BEGIN");
  try {
    if (!preview) await client.query("SELECT pg_advisory_xact_lock(20261124, 1)");

    const courseIdentity = await verifyCourseIdentity(client, record);
    const fieldDependency = await verifyFieldDependency(client, record);
    const sourceMetadata = (record.sources ?? [])
      .filter((source) => source.canonicalUrl)
      .map((source) => ({
        sourceKey: source.sourceKey,
        sourceName: source.sourceName,
        authority: source.authority,
        canonicalUrl: source.canonicalUrl,
        category: source.category,
        sourceType: source.sourceType,
        dataTypes: source.dataTypes,
        termsNotes: source.termsNotes,
        expectedUpdateBehavior: source.expectedUpdateBehavior,
        status: source.status,
      }));
    const reconciledSources = await reconcileSourceRegistry(
      client,
      sourceMetadata,
      { mode: preview ? "preview" : "apply" },
    );
    const reconciledSourceKeys = new Set(reconciledSources.map((source) => source.sourceKey));

    const resolvedSources = [];
    for (let index = 0; index < (record.revision.provenance ?? []).length; index += 1) {
      const provenance = record.revision.provenance[index];
      if (preview && provenance.sourceKey && reconciledSourceKeys.has(provenance.sourceKey)) {
        continue;
      }
      const source = await resolveProvenanceSource(client, record, provenance, index);
      resolvedSources.push({
        provenance,
        sourceId: provenance.sourceId ?? source.id,
        checkedAt: provenance.checkedAt ?? null,
        verifiedAt: provenance.verifiedAt ?? null,
        verificationStatus: provenance.verificationStatus,
      });
    }

    const revisions = await getLatestExistingRevision(client, courseIdentity.id);
    const latest = revisions[revisions.length - 1] ?? null;
    let existingDecision = { action: "insert", revisionNumber: 1 };
    if (latest) {
      if (latest.data_classification !== "real") {
        const isPreservableDemo =
          revisions.length === 1 &&
          latest.data_classification === "demo" &&
          latest.publication_status === "draft" &&
          latest.published_at === null &&
          latest.typed_revision_id === latest.id &&
          courseIdentity.published_revision_id === null;
        if (!isPreservableDemo) {
          throw new Error(
            "Revision conflict: existing demo or test content cannot be converted or bypassed.",
          );
        }
        existingDecision = {
          action: "create_revision",
          revisionNumber: latest.revision_number + 1,
        };
      } else {
        if (latest.publication_status === "published") {
          assert.equal(latest.published_at !== null, true, "Published revision must have published_at.");
        }
        const existingPayload = await existingPayloadWithProvenance(client, record, latest);
        const existingHash = hashRealCourseImportRecord(existingPayload);
        const incomingHash = hashRealCourseImportRecord(record);
        existingDecision = decideCourseImportRevision(incomingHash, {
          contentHash: existingHash,
          revisionNumber: latest.revision_number,
          publicationStatus: latest.publication_status,
          dataClassification: latest.data_classification,
        });
      }
    }

    if (existingDecision.action === "unchanged") {
      await client.query("ROLLBACK");
      return {
        action: "unchanged",
        courseId: record.id,
        courseItemId: courseIdentity.id,
        revisionNumber: latest.revision_number,
        revisionId: latest.id,
        published: false,
        sources: reconciledSources,
      };
    }
    if (existingDecision.action === "conflict") {
      throw new Error(`Revision conflict: ${existingDecision.reason}`);
    }

    if (preview) {
      await client.query("ROLLBACK");
      return {
        action: "would_insert",
        courseId: record.id,
        courseItemId: courseIdentity.id,
        revisionNumber: existingDecision.revisionNumber,
        revisionId: null,
        currentPublishedRevisionId: courseIdentity.published_revision_id,
        existingRevisions: revisions.map((revision) => ({
          id: revision.id,
          revisionNumber: revision.revision_number,
          publicationStatus: revision.publication_status,
          dataClassification: revision.data_classification,
          publishedAt: revision.published_at,
        })),
        field: {
          id: record.field.id,
          catalogItemId: fieldDependency.item_id,
          revisionId: fieldDependency.revision_id,
          itemType: fieldDependency.item_type,
          publicationStatus: fieldDependency.publication_status,
          dataClassification: fieldDependency.data_classification,
        },
        aliases: record.aliases,
        aliasesToCreate: [],
        sources: sourceMetadata.map((source) => ({
          ...source,
          ...reconciledSources.find((result) => result.sourceKey === source.sourceKey),
        })),
        provenance: record.revision.provenance ?? [],
        published: false,
      };
    }

    const revisionResult = await client.query(
      `INSERT INTO public.catalog_item_revisions
         (catalog_item_id, revision_number, publication_status, title, summary, description,
          data_classification, verification_status, published_at)
       VALUES ($1, $2, 'draft', $3, $4, $5, 'real', $6, NULL)
       RETURNING id`,
      [
        courseIdentity.id,
        existingDecision.revisionNumber,
        record.revision.title,
        record.revision.summary,
        record.revision.description,
        record.revision.verificationStatus,
      ],
    );
    const revisionId = revisionResult.rows[0].id;
    await client.query(
      `INSERT INTO public.course_revisions
         (revision_id, field_item_id, field_revision_id, qualification, stages,
          entry_after_class10, entry_after_class12, is_exploration_category, course_content)
       VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, $9::jsonb)`,
      [
        revisionId,
        record.field.catalogItemId,
        record.field.revisionId,
        record.revision.qualification,
        record.revision.stages,
        record.revision.entryAfterClass10,
        record.revision.entryAfterClass12,
        record.revision.isExplorationCategory,
        JSON.stringify(record.revision.courseContent),
      ],
    );

    for (const resolved of resolvedSources) {
      await client.query(
        `INSERT INTO public.catalog_revision_sources
           (revision_id, source_id, claim_key, checked_at, verified_at, verification_status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (revision_id, source_id, claim_key) DO NOTHING`,
      [
        revisionId,
        resolved.sourceId,
        resolved.provenance.claimKey,
        resolved.checkedAt,
        resolved.verifiedAt,
        resolved.verificationStatus,
      ]);
    }

    const pointerCheck = await client.query(
      `SELECT published_revision_id
       FROM public.catalog_items
       WHERE id = $1`,
      [courseIdentity.id],
    );
    if (pointerCheck.rows[0].published_revision_id !== null) {
      // Draft import must preserve the existing pointer.
    }

    await client.query("COMMIT");
    return {
      action: "inserted",
      courseId: record.id,
      courseItemId: courseIdentity.id,
      revisionNumber: existingDecision.revisionNumber,
      revisionId,
      published: false,
      sources: reconciledSources,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function runRealCourseDraftImport({ payloadPath, directUrl, pooledUrl, env, preview = false }) {
  const target = assertDevelopmentTarget({
    directUrl,
    pooledUrl,
    projectId: env?.NEON_PROJECT_ID,
    branchId: env?.NEON_BRANCH_ID,
    vercel: env?.VERCEL,
    neonBranch: env?.NEON_BRANCH,
  });
  let endpointMetadata;
  try {
    endpointMetadata = JSON.parse(
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `neon api /projects/${expectedProjectId}/endpoints`,
        ],
        { encoding: "utf8", windowsHide: true },
      ),
    );
  } catch (error) {
    throw new Error(`Refusing import: Neon endpoint metadata could not be verified. ${error.message}`);
  }
  const matches = (endpointMetadata.endpoints ?? []).filter(
    (endpoint) => endpoint.host === expectedHost,
  );
  if (
    matches.length !== 1 ||
    matches[0].project_id !== expectedProjectId ||
    matches[0].branch_id !== expectedBranchId
  ) {
    throw new Error("Refusing import: Neon endpoint metadata does not uniquely identify development.");
  }
  const raw = await readFile(payloadPath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Course payload must be valid JSON.");
  }
  const record = requireExactlyOneRecord(parsed);

  const pool = new Pool({
    connectionString: directUrl,
    connectionTimeoutMillis: 10000,
    max: 1,
  });
  const client = await pool.connect();
  try {
    const identity = await client.query(
      "SELECT current_database() AS database_name, inet_server_addr()::text AS server_address",
    );
    if (
      directUrl.includes("neondb") &&
      identity.rows[0].database_name !== "neondb"
    ) {
      throw new Error("Refusing import: unexpected development database name.");
    }
    return await importOneRealCourseDraft(client, record, { preview });
  } finally {
    client.release();
    await pool.end();
  }
  void target;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const preview = args[0] === "--preview";
  if (preview) args.shift();
  if (args.length !== 1) {
    console.error("Usage: node scripts/import-real-course-draft.mjs [--preview] <one-course-payload.json>");
    process.exitCode = 1;
  } else {
    runRealCourseDraftImport({
      payloadPath: resolve(args[0]),
      directUrl: process.env.DATABASE_URL_UNPOOLED,
      pooledUrl: process.env.DATABASE_URL,
      env: process.env,
      preview,
    })
      .then((result) => console.log(JSON.stringify(result, null, 2)))
      .catch((error) => {
        console.error(`Real-course draft import failed: ${error.message}`);
        process.exitCode = 1;
      });
  }
}
