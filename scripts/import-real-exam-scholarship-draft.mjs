import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import pg from "pg";
import { reconcileSourceRegistry } from "../src/db/source-reconciliation.mjs";
import {
  assertDevelopmentTarget,
  expectedBranchId,
  expectedHost,
  expectedProjectId,
  verifyNeonDevelopmentEndpoint,
} from "./import-real-pathway-draft.mjs";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const importLock = [20261126, 3];
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
  validateRealExaminationImportRecord,
} = require("../src/db/examination-import-validation.ts");
const {
  validateRealScholarshipImportRecord,
} = require("../src/db/scholarship-import-validation.ts");
const configs = {
  exam: {
    itemType: "examination",
    aliasType: "examination",
    typedTable: "examination_revisions",
    typedFields: "level, stages, purpose, programmes, authority, regions, fields, official_url",
    validator: validateRealExaminationImportRecord,
  },
  scholarship: {
    itemType: "scholarship",
    aliasType: "scholarship",
    typedTable: "scholarship_revisions",
    typedFields: "category, provider, support, study_levels, eligibility_regions, scholarship_status, official_url, detail",
    validator: validateRealScholarshipImportRecord,
  },
};

function requireRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Exactly one exam or scholarship record is required.");
  }
  const config = configs[value.kind];
  if (!config) throw new Error('record.kind must be "exam" or "scholarship".');
  config.validator(value);
  return { record: value, config };
}

function aliasKey(alias) {
  return JSON.stringify([alias.sourceSystem, alias.externalType, alias.externalKey, alias.externalContextKey]);
}

async function loadAliases(client, itemId) {
  const result = await client.query(
    `SELECT source_system AS "sourceSystem", external_type AS "externalType",
            external_key AS "externalKey", external_context_key AS "externalContextKey"
       FROM public.catalog_item_aliases WHERE catalog_item_id=$1
      ORDER BY source_system, external_type, external_key, external_context_key`,
    [itemId],
  );
  return result.rows;
}

async function resolveOrCreateIdentity(client, record, config, preview) {
  const resolved = new Map();
  for (const alias of record.aliases) {
    const result = await client.query(
      `SELECT i.id, i.item_type, i.published_revision_id
         FROM public.catalog_item_aliases a
         JOIN public.catalog_items i ON i.id=a.catalog_item_id
        WHERE a.source_system=$1 AND a.external_type=$2
          AND a.external_key=$3 AND a.external_context_key=$4`,
      [alias.sourceSystem, alias.externalType, alias.externalKey, alias.externalContextKey],
    );
    if (result.rowCount > 1) throw new Error(`Alias ${JSON.stringify(alias)} resolves to multiple catalogue items.`);
    if (result.rowCount === 1) resolved.set(aliasKey(alias), result.rows[0]);
  }
  const itemIds = [...new Set([...resolved.values()].map((row) => row.id))];
  if (itemIds.length > 1) throw new Error("Incoming aliases resolve to different catalogue identities.");
  if (itemIds.length === 1) {
    const item = [...resolved.values()][0];
    if (item.item_type !== config.itemType) throw new Error(`The existing CareerBridge alias does not resolve to a ${config.itemType} item.`);
    const aliases = await loadAliases(client, item.id);
    const existing = new Set(aliases.map(aliasKey));
    const aliasesToCreate = record.aliases.filter((alias) => !existing.has(aliasKey(alias)));
    if (!preview) {
      for (const alias of aliasesToCreate) {
        await client.query(
          `INSERT INTO public.catalog_item_aliases
             (source_system, external_type, external_key, external_context_key, catalog_item_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [alias.sourceSystem, alias.externalType, alias.externalKey, alias.externalContextKey, item.id],
        );
      }
    }
    return {
      itemId: item.id,
      publishedRevisionId: item.published_revision_id,
      aliases: preview ? aliases : [...aliases, ...aliasesToCreate],
      aliasesToCreate,
      created: false,
    };
  }

  if (preview) {
    return { itemId: null, publishedRevisionId: null, aliases: [], aliasesToCreate: record.aliases, created: true };
  }
  const inserted = await client.query(
    "INSERT INTO public.catalog_items (item_type) VALUES ($1) RETURNING id, published_revision_id",
    [config.itemType],
  );
  const item = inserted.rows[0];
  for (const alias of record.aliases) {
    await client.query(
      `INSERT INTO public.catalog_item_aliases
         (source_system, external_type, external_key, external_context_key, catalog_item_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [alias.sourceSystem, alias.externalType, alias.externalKey, alias.externalContextKey, item.id],
    );
  }
  return { itemId: item.id, publishedRevisionId: null, aliases: record.aliases, aliasesToCreate: record.aliases, created: true };
}

async function listRevisions(client, itemId, config) {
  if (!itemId) return [];
  const result = await client.query(
    `SELECT r.id, r.revision_number, r.publication_status, r.data_classification,
            r.verification_status, r.updated_by, r.title, r.summary, r.description,
            r.published_at, t.revision_id AS typed_revision_id, t.${config.typedFields}
       FROM public.catalog_item_revisions r
       LEFT JOIN public.${config.typedTable} t ON t.revision_id=r.id
      WHERE r.catalog_item_id=$1 ORDER BY r.revision_number`,
    [itemId],
  );
  return result.rows;
}

async function readProvenance(client, revisionId) {
  const result = await client.query(
    `SELECT crs.source_id, crs.claim_key, crs.checked_at, crs.verified_at,
            crs.verification_status, sr.source_name, sr.authority, sr.canonical_url,
            sr.normalized_url, sr.category, sr.source_type, sr.data_types,
            sr.terms_notes, sr.expected_update_behavior, sr.status
       FROM public.catalog_revision_sources crs
       JOIN public.source_registry sr ON sr.id=crs.source_id
      WHERE crs.revision_id=$1 ORDER BY crs.claim_key, crs.source_id`,
    [revisionId],
  );
  return result.rows;
}

function timestamp(value) {
  if (!value) return null;
  const iso = new Date(value).toISOString();
  return iso.slice(11, 19) === "00:00:00" ? iso.slice(0, 10) : iso;
}

async function existingRecord(client, record, config, latest, aliases) {
  const rows = await readProvenance(client, latest.id);
  const sources = new Map();
  const provenance = rows.map((row) => {
    const sourceKey = `stored-${row.source_id}`;
    if (!sources.has(row.source_id)) {
      sources.set(row.source_id, {
        sourceKey,
        sourceName: row.source_name,
        authority: row.authority,
        canonicalUrl: row.canonical_url,
        category: row.category,
        sourceType: row.source_type,
        dataTypes: row.data_types ?? [],
        termsNotes: row.terms_notes,
        expectedUpdateBehavior: row.expected_update_behavior,
        status: row.status,
      });
    }
    return {
      claimKey: row.claim_key,
      sourceKey,
      sourceUrl: row.canonical_url ?? row.normalized_url,
      checkedAt: timestamp(row.checked_at),
      verifiedAt: row.verified_at ? timestamp(row.verified_at) : null,
      verificationStatus: row.verification_status ?? "not_collected",
    };
  });
  const revision = {
    title: latest.title,
    summary: latest.summary,
    description: latest.description,
    publicationStatus: "draft",
    dataClassification: latest.data_classification,
    verificationStatus: latest.verification_status,
    provenance,
  };
  if (record.kind === "exam") {
    revision.examination = {
      level: latest.level,
      stages: latest.stages,
      purpose: latest.purpose,
      programmes: latest.programmes,
      authority: latest.authority,
      regions: latest.regions,
      fields: latest.fields,
      ...(latest.official_url ? { officialUrl: latest.official_url } : {}),
    };
  } else {
    revision.scholarship = {
      category: latest.category,
      provider: latest.provider,
      support: latest.support,
      studyLevels: latest.study_levels,
      eligibilityRegions: latest.eligibility_regions,
      status: latest.scholarship_status,
      ...(latest.official_url ? { officialUrl: latest.official_url } : {}),
      detail: latest.detail,
    };
  }
  return {
    kind: record.kind,
    id: record.id,
    aliases,
    revision,
    sources: [...sources.values()],
  };
}

async function reconcileSources(client, record, preview) {
  return reconcileSourceRegistry(client, record.sources.map(({
    sourceKey, sourceName, authority, canonicalUrl, category, sourceType,
    dataTypes, termsNotes, expectedUpdateBehavior, status,
  }) => ({
    sourceKey, sourceName, authority, canonicalUrl, category, sourceType,
    dataTypes, termsNotes, expectedUpdateBehavior, status,
  })), { mode: preview ? "preview" : "apply" });
}

async function mapProvenance(client, record, sources, preview) {
  const sourceIds = new Map(sources.map((source) => [source.sourceKey, source.id]));
  const mapped = [];
  for (const [index, provenance] of record.revision.provenance.entries()) {
    let sourceId = provenance.sourceKey ? sourceIds.get(provenance.sourceKey) : provenance.sourceId;
    if (!sourceId && preview && provenance.sourceKey &&
        record.sources.some((source) => source.sourceKey === provenance.sourceKey)) {
      mapped.push({ provenance, sourceId: null });
      continue;
    }
    if (!sourceId && provenance.sourceUrl) {
      const result = await client.query(
        `SELECT id, status FROM public.source_registry
          WHERE canonical_url=$1 OR normalized_url=public.normalize_source_url($1)
          LIMIT 2`,
        [provenance.sourceUrl],
      );
      if (result.rowCount !== 1) throw new Error(`revision.provenance[${index}].sourceUrl did not resolve to exactly one registered source.`);
      if (result.rows[0].status !== "active") throw new Error(`revision.provenance[${index}] references an inactive source.`);
      sourceId = result.rows[0].id;
    }
    if (!sourceId && !preview) throw new Error(`revision.provenance[${index}] source did not resolve to a registry ID.`);
    mapped.push({ provenance, sourceId: sourceId ?? null });
  }
  return mapped;
}

function contentFingerprint(record) {
  const provenance = record.revision.provenance.map((entry) => ({
    claimKey: entry.claimKey,
    sourceUrl: entry.sourceUrl ?? record.sources.find((source) => source.sourceKey === entry.sourceKey)?.canonicalUrl,
    sourceId: entry.sourceId,
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const typed = record.revision.examination ?? record.revision.scholarship;
  return JSON.stringify({
    id: record.id,
    title: record.revision.title,
    summary: record.revision.summary,
    description: record.revision.description,
    typed,
    provenance,
  });
}

function isUnreviewedDraft(row, provenance) {
  return row.publication_status === "draft" &&
    row.verification_status === "pending_review" &&
    row.updated_by === null &&
    row.published_at === null &&
    provenance.every((entry) =>
      ["pending_review", "unverified", "not_collected"].includes(entry.verification_status) &&
      entry.verified_at == null,
    );
}

export async function importOneRealExamScholarshipDraft(client, payload, {
  preview = false,
  supersedeUnreviewedDraft = false,
} = {}) {
  const { record, config } = requireRecord(payload);
  await client.query(preview ? "BEGIN READ ONLY" : "BEGIN");
  try {
    if (!preview) await client.query("SELECT pg_advisory_xact_lock($1, $2)", importLock);
    const identity = await resolveOrCreateIdentity(client, record, config, preview);
    const revisions = await listRevisions(client, identity.itemId, config);
    if (revisions.some((row) => row.typed_revision_id !== row.id)) {
      throw new Error(`Existing ${config.itemType} history contains a revision without its matching typed record.`);
    }
    const latest = revisions.at(-1) ?? null;
    let revisionNumber = 1;
    if (latest) {
      const existing = await existingRecord(client, record, config, latest, identity.aliases);
      if (contentFingerprint(existing) === contentFingerprint(record)) {
        await client.query("ROLLBACK");
        return {
          action: "unchanged",
          kind: record.kind,
          id: record.id,
          catalogItemId: identity.itemId,
          revisionNumber: latest.revision_number,
          revisionId: latest.id,
          currentPublishedRevisionId: identity.publishedRevisionId,
          published: false,
        };
      }
      if (latest.publication_status === "published" &&
          identity.publishedRevisionId === latest.id &&
          latest.data_classification === "real") {
        revisionNumber = latest.revision_number + 1;
      } else if (latest.publication_status === "rejected" &&
          latest.data_classification === "real" &&
          latest.published_at === null) {
        revisionNumber = latest.revision_number + 1;
      } else {
        const oldProvenance = await readProvenance(client, latest.id);
        if (!supersedeUnreviewedDraft || !isUnreviewedDraft(latest, oldProvenance) ||
            identity.publishedRevisionId !== null ||
            latest.data_classification !== "real" && latest.data_classification !== "demo") {
          throw new Error("Revision conflict: only an explicitly superseded, untouched draft or the current published revision can be followed by a new revision.");
        }
        revisionNumber = latest.revision_number + 1;
      }
    }

    const sources = await reconcileSources(client, record, preview);
    const mappedProvenance = await mapProvenance(client, record, sources, preview);
    if (preview) {
      await client.query("ROLLBACK");
      return {
        action: "would_insert",
        kind: record.kind,
        id: record.id,
        catalogItemId: identity.itemId,
        identityWouldBeCreated: identity.created,
        aliasesToCreate: identity.aliasesToCreate,
        revisionNumber,
        revisionId: null,
        currentPublishedRevisionId: identity.publishedRevisionId,
        existingRevisions: revisions.map((row) => ({
          id: row.id,
          revisionNumber: row.revision_number,
          publicationStatus: row.publication_status,
          dataClassification: row.data_classification,
          publishedAt: row.published_at,
        })),
        sources,
        provenanceCount: mappedProvenance.length,
        published: false,
      };
    }

    const inserted = await client.query(
      `INSERT INTO public.catalog_item_revisions
         (catalog_item_id, revision_number, publication_status, title, summary, description,
          data_classification, verification_status, published_at)
       VALUES ($1, $2, 'draft', $3, $4, $5, 'real', 'pending_review', NULL)
       RETURNING id`,
      [identity.itemId, revisionNumber, record.revision.title, record.revision.summary, record.revision.description],
    );
    const revisionId = inserted.rows[0].id;
    if (record.kind === "exam") {
      const exam = record.revision.examination;
      await client.query(
        `INSERT INTO public.examination_revisions
           (revision_id, level, stages, purpose, programmes, authority, regions, fields, official_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [revisionId, exam.level, exam.stages, exam.purpose, exam.programmes, exam.authority, exam.regions, exam.fields, exam.officialUrl ?? null],
      );
    } else {
      const scholarship = record.revision.scholarship;
      await client.query(
        `INSERT INTO public.scholarship_revisions
           (revision_id, category, provider, support, study_levels, eligibility_regions,
            scholarship_status, official_url, detail)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb)`,
        [revisionId, scholarship.category, scholarship.provider, scholarship.support, scholarship.studyLevels,
          JSON.stringify(scholarship.eligibilityRegions), scholarship.status, scholarship.officialUrl ?? null,
          JSON.stringify(scholarship.detail)],
      );
    }
    for (const { provenance, sourceId } of mappedProvenance) {
      if (!sourceId) throw new Error("Source reconciliation returned no source ID for an imported provenance row.");
      await client.query(
        `INSERT INTO public.catalog_revision_sources
           (revision_id, source_id, claim_key, checked_at, verified_at, verification_status)
         VALUES ($1, $2, $3, $4, NULL, $5)`,
        [revisionId, sourceId, provenance.claimKey, provenance.checkedAt ?? null, provenance.verificationStatus],
      );
    }
    const pointer = await client.query("SELECT published_revision_id FROM public.catalog_items WHERE id=$1 AND item_type=$2", [
      identity.itemId,
      config.itemType,
    ]);
    if (pointer.rowCount !== 1 || pointer.rows[0].published_revision_id !== identity.publishedRevisionId) {
      throw new Error("Catalogue published pointer changed during draft import; rolling back.");
    }
    await client.query("COMMIT");
    return {
      action: "inserted",
      kind: record.kind,
      id: record.id,
      catalogItemId: identity.itemId,
      revisionNumber,
      revisionId,
      currentPublishedRevisionId: identity.publishedRevisionId,
      aliasesCreated: identity.aliasesToCreate.length,
      sources,
      provenanceCount: mappedProvenance.length,
      published: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function runRealExamScholarshipDraftImport({
  payloadPath,
  directUrl,
  pooledUrl,
  env,
  preview = false,
  supersedeUnreviewedDraft = false,
}) {
  assertDevelopmentTarget({
    directUrl,
    pooledUrl,
    projectId: env?.NEON_PROJECT_ID,
    branchId: env?.NEON_BRANCH_ID,
    neonBranch: env?.NEON_BRANCH,
    vercel: env?.VERCEL,
  });
  verifyNeonDevelopmentEndpoint();
  const raw = await readFile(payloadPath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Catalogue payload must be valid JSON.");
  }
  requireRecord(parsed);
  const pool = new Pool({ connectionString: directUrl, connectionTimeoutMillis: 10000, max: 1 });
  const client = await pool.connect();
  try {
    const database = await client.query("SELECT current_database() AS database_name");
    if (database.rows[0]?.database_name !== "neondb") {
      throw new Error("Refusing catalogue draft import: connected database is not the verified development database.");
    }
    return await importOneRealExamScholarshipDraft(client, parsed, { preview, supersedeUnreviewedDraft });
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const preview = args[0] === "--preview";
  if (preview) args.shift();
  const supersedeUnreviewedDraft = args[0] === "--supersede-unreviewed-draft";
  if (supersedeUnreviewedDraft) args.shift();
  if (args.length !== 1 || args[0].startsWith("--")) {
    console.error("Usage: node scripts/import-real-exam-scholarship-draft.mjs [--preview] [--supersede-unreviewed-draft] <one-exam-or-scholarship-payload.json>");
    process.exitCode = 1;
  } else {
    runRealExamScholarshipDraftImport({
      payloadPath: resolve(args[0]),
      directUrl: process.env.DATABASE_URL_UNPOOLED,
      pooledUrl: process.env.DATABASE_URL,
      env: process.env,
      preview,
      supersedeUnreviewedDraft,
    })
      .then((result) => console.log(JSON.stringify({
        target: { projectId: expectedProjectId, branchId: expectedBranchId, endpointHost: expectedHost },
        ...result,
      }, null, 2)))
      .catch((error) => {
        console.error(`Real exam/scholarship draft import failed: ${error.message}`);
        process.exitCode = 1;
      });
  }
}
