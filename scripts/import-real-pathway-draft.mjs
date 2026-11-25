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
const advisoryLock = [20261126, 1];

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
  validateRealPathwayImportRecord,
  hashRealPathwayImportRecord,
  decidePathwayImportRevision,
} = require("../src/db/pathway-import-validation.ts");

export const expectedProjectId = "calm-brook-21165945";
export const expectedBranchId = "br-wandering-flower-a1f6ys66";
export const expectedHost = "ep-divine-fog-a1uxos5z.ap-southeast-1.aws.neon.tech";

export function assertDevelopmentTarget({ directUrl, pooledUrl, projectId, branchId, neonBranch, vercel }) {
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
  if (!["postgres:", "postgresql:"].includes(direct.protocol) || !["postgres:", "postgresql:"].includes(pooled.protocol)) {
    throw new Error("Database URLs must use PostgreSQL.");
  }
  if (direct.hostname !== expectedHost || direct.hostname.includes("-pooler")) {
    throw new Error("Refusing Pathways import: DATABASE_URL_UNPOOLED is not the verified development endpoint.");
  }
  const expectedPooledHost = `${expectedHost.split(".")[0]}-pooler.${expectedHost.split(".").slice(1).join(".")}`;
  if (pooled.hostname !== expectedPooledHost || pooled.hostname === direct.hostname) {
    throw new Error("Refusing Pathways import: DATABASE_URL is not the matching development pooler endpoint.");
  }
  if (direct.pathname !== pooled.pathname || direct.username !== pooled.username) {
    throw new Error("Refusing Pathways import: pooled and direct database URLs do not identify the same database.");
  }
  if (projectId !== expectedProjectId) throw new Error("Refusing Pathways import: NEON_PROJECT_ID is not the verified development project.");
  if (branchId !== expectedBranchId || neonBranch !== "development") {
    throw new Error("Refusing Pathways import: NEON_BRANCH and NEON_BRANCH_ID must identify development.");
  }
  if (vercel) throw new Error("Refusing Pathways import: imports are local development operations only.");
  return { projectId: expectedProjectId, branchId: expectedBranchId, endpointHost: expectedHost };
}

export function requireExactlyOneRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Exactly one Pathways record is required; arrays and empty values are not accepted.");
  }
  return value;
}

function normalizeStoredTimestamp(value) {
  if (!value) return null;
  const iso = new Date(value).toISOString();
  return iso.slice(11, 19) === "00:00:00" ? iso.slice(0, 10) : iso;
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

async function resolveOrCreatePathwayIdentity(client, record, { preview }) {
  const resolved = new Map();
  for (const alias of record.aliases) {
    const result = await client.query(
      `SELECT i.id, i.item_type, i.published_revision_id,
              a.source_system, a.external_type, a.external_key, a.external_context_key
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
  if (itemIds.length > 1) throw new Error("Incoming Pathways aliases resolve to different catalogue identities.");
  if (itemIds.length === 1) {
    const identity = [...resolved.values()][0];
    if (identity.item_type !== "pathway") throw new Error("The existing CareerBridge alias does not resolve to a pathway item.");
    const aliases = await loadAliases(client, identity.id);
    const existing = new Map(aliases.map((alias) => [aliasKey(alias), alias]));
    const aliasesToCreate = record.aliases.filter((alias) => !existing.has(aliasKey(alias)));
    if (preview) {
      return { itemId: identity.id, publishedRevisionId: identity.published_revision_id, aliases, aliasesToCreate, created: false };
    }
    for (const alias of aliasesToCreate) {
      await client.query(
        `INSERT INTO public.catalog_item_aliases
           (source_system, external_type, external_key, external_context_key, catalog_item_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [alias.sourceSystem, alias.externalType, alias.externalKey, alias.externalContextKey, identity.id],
      );
    }
    return { itemId: identity.id, publishedRevisionId: identity.published_revision_id, aliases: [...aliases, ...aliasesToCreate], aliasesToCreate, created: false };
  }

  if (preview) {
    return { itemId: null, publishedRevisionId: null, aliases: [], aliasesToCreate: record.aliases, created: true };
  }
  const item = await client.query(
    `INSERT INTO public.catalog_items (item_type) VALUES ('pathway') RETURNING id, published_revision_id`,
  );
  const itemId = item.rows[0].id;
  for (const alias of record.aliases) {
    await client.query(
      `INSERT INTO public.catalog_item_aliases
         (source_system, external_type, external_key, external_context_key, catalog_item_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [alias.sourceSystem, alias.externalType, alias.externalKey, alias.externalContextKey, itemId],
    );
  }
  return { itemId, publishedRevisionId: null, aliases: record.aliases, aliasesToCreate: record.aliases, created: true };
}

async function listPathwayRevisions(client, itemId) {
  if (!itemId) return [];
  const result = await client.query(
    `SELECT r.id, r.revision_number, r.publication_status, r.data_classification,
            r.verification_status, r.updated_by,
            r.title, r.summary, r.description, r.published_at,
            p.revision_id AS typed_revision_id, p.stage, p.course_stage,
            p.catalogue_group, p.category, p.route_content
       FROM public.catalog_item_revisions r
       LEFT JOIN public.pathway_revisions p ON p.revision_id=r.id
      WHERE r.catalog_item_id=$1
      ORDER BY r.revision_number`,
    [itemId],
  );
  return result.rows;
}

async function readRevisionSources(client, revisionId) {
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

async function existingRevisionPayload(client, record, row, aliases) {
  const linkedSources = await readRevisionSources(client, row.id);
  const sources = new Map();
  for (const source of linkedSources) {
    if (!sources.has(source.source_id)) {
      sources.set(source.source_id, {
        sourceKey: `stored-${source.source_id}`,
        sourceName: source.source_name,
        authority: source.authority,
        canonicalUrl: source.canonical_url,
        normalizedUrl: source.normalized_url ?? undefined,
        category: source.category,
        sourceType: source.source_type,
        dataTypes: source.data_types,
        termsNotes: source.terms_notes,
        expectedUpdateBehavior: source.expected_update_behavior,
        status: source.status,
      });
    }
  }
  const provenance = linkedSources.map((source) => ({
    claimKey: source.claim_key,
    sourceKey: `stored-${source.source_id}`,
    sourceUrl: source.canonical_url ?? source.normalized_url,
    checkedAt: normalizeStoredTimestamp(source.checked_at),
    ...(source.verified_at ? { verifiedAt: normalizeStoredTimestamp(source.verified_at) } : {}),
    verificationStatus: source.verification_status ?? "not_collected",
  }));
  return {
    kind: "pathway",
    id: record.id,
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
      provenance,
    },
    sources: [...sources.values()],
  };
}

async function reconcileSources(client, record, preview) {
  const metadata = record.sources.map(({ sourceKey, sourceName, authority, canonicalUrl, category, sourceType, dataTypes, termsNotes, expectedUpdateBehavior, status }) => ({
    sourceKey,
    sourceName,
    authority,
    canonicalUrl,
    category,
    sourceType,
    dataTypes,
    termsNotes,
    expectedUpdateBehavior,
    status,
  }));
  return reconcileSourceRegistry(client, metadata, { mode: preview ? "preview" : "apply" });
}

async function mapProvenanceToSources(client, record, reconciled, preview) {
  const sourceIds = new Map(reconciled.map((source) => [source.sourceKey, source.id]));
  const result = [];
  for (const [index, provenance] of record.revision.provenance.entries()) {
    let sourceId = provenance.sourceKey ? sourceIds.get(provenance.sourceKey) : provenance.sourceId;
    if (!sourceId && preview && provenance.sourceKey && record.sources.some((source) => source.sourceKey === provenance.sourceKey)) {
      result.push({ provenance, sourceId: null });
      continue;
    }
    if (!sourceId && provenance.sourceUrl) {
      const source = await client.query(
        `SELECT id, status, canonical_url, normalized_url FROM public.source_registry
          WHERE canonical_url=$1 OR normalized_url=$1 LIMIT 2`,
        [provenance.sourceUrl],
      );
      if (source.rowCount !== 1) throw new Error(`revision.provenance[${index}].sourceUrl did not resolve to exactly one registered source.`);
      if (source.rows[0].status !== "active") throw new Error(`revision.provenance[${index}] references an inactive source.`);
      sourceId = source.rows[0].id;
    }
    if (!sourceId && !preview) throw new Error(`revision.provenance[${index}] source did not resolve to a registry ID.`);
    result.push({ provenance, sourceId: sourceId ?? null });
  }
  return result;
}

export async function importOneRealPathwayDraft(
  client,
  payload,
  { preview = false, supersedeUnreviewedDraft = false } = {},
) {
  const record = requireExactlyOneRecord(payload);
  validateRealPathwayImportRecord(record);
  await client.query(preview ? "BEGIN READ ONLY" : "BEGIN");
  try {
    if (!preview) await client.query("SELECT pg_advisory_xact_lock($1, $2)", advisoryLock);
    const identity = await resolveOrCreatePathwayIdentity(client, record, { preview });
    const aliases = identity.aliases.length ? identity.aliases : record.aliases;
    const revisions = await listPathwayRevisions(client, identity.itemId);
    for (const row of revisions) {
      if (row.typed_revision_id !== row.id) throw new Error(`Pathway revision ${row.id} has no matching typed pathway row.`);
    }

    const latest = revisions.at(-1) ?? null;
    let decision = { action: "insert", revisionNumber: 1 };
    if (latest && latest.data_classification !== "real") {
      const preservableDemo = revisions.length === 1 &&
        latest.data_classification === "demo" &&
        latest.publication_status === "draft" &&
        latest.published_at === null &&
        latest.typed_revision_id === latest.id &&
        identity.publishedRevisionId === null;
      if (!preservableDemo) {
        throw new Error("Revision conflict: existing demo or test content/history cannot be converted or bypassed.");
      }
      decision = { action: "create_revision", revisionNumber: latest.revision_number + 1 };
    } else if (latest) {
      const incoming = { ...record, aliases };
      const existingPayload = await existingRevisionPayload(client, incoming, latest, aliases);
      const existingHash = hashRealPathwayImportRecord(existingPayload);
      const incomingHash = hashRealPathwayImportRecord(incoming);
      decision = decidePathwayImportRevision(incomingHash, {
        contentHash: existingHash,
        revisionNumber: latest.revision_number,
        publicationStatus: latest.publication_status,
        dataClassification: latest.data_classification,
      });
      if (
        decision.action === "conflict" &&
        supersedeUnreviewedDraft &&
        latest.publication_status === "draft" &&
        latest.verification_status === "pending_review" &&
        latest.updated_by === null &&
        latest.published_at === null &&
        identity.publishedRevisionId === null &&
        existingPayload.revision.provenance.length > 0 &&
        existingPayload.revision.provenance.every((entry) =>
          entry.verificationStatus === "pending_review" && !entry.verifiedAt,
        ) &&
        record.revision.verificationStatus === "pending_review" &&
        record.revision.provenance.every((entry) =>
          entry.verificationStatus === "pending_review" && !entry.verifiedAt,
        )
      ) {
        validateRealPathwayImportRecord(existingPayload);
        decision = { action: "create_revision", revisionNumber: latest.revision_number + 1 };
      }
    }

    if (decision.action === "unchanged") {
      await client.query("ROLLBACK");
      return {
        action: "unchanged",
        pathwayId: record.id,
        catalogItemId: identity.itemId,
        revisionNumber: latest.revision_number,
        revisionId: latest.id,
        currentPublishedRevisionId: identity.publishedRevisionId,
        published: false,
      };
    }
    if (decision.action === "conflict") throw new Error(`Revision conflict: ${decision.reason}`);

    const incoming = { ...record, aliases };
    const sources = await reconcileSources(client, incoming, preview);
    const mappedProvenance = await mapProvenanceToSources(client, incoming, sources, preview);
    if (preview) {
      await client.query("ROLLBACK");
      return {
        action: "would_insert",
        pathwayId: record.id,
        catalogItemId: identity.itemId,
        identityWouldBeCreated: identity.created,
        aliasesToCreate: identity.aliasesToCreate,
        revisionNumber: decision.revisionNumber,
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

    if (identity.created) {
      const createdItem = await client.query(
        "SELECT published_revision_id FROM public.catalog_items WHERE id=$1 AND item_type='pathway' FOR UPDATE",
        [identity.itemId],
      );
      if (createdItem.rowCount !== 1 || createdItem.rows[0].published_revision_id !== null) {
        throw new Error("New Pathways identity changed unexpectedly before draft insertion.");
      }
    }

    const revisionResult = await client.query(
      `INSERT INTO public.catalog_item_revisions
         (catalog_item_id, revision_number, publication_status, title, summary, description,
          data_classification, verification_status, published_at)
       VALUES ($1, $2, 'draft', $3, $4, $5, 'real', $6, NULL)
       RETURNING id`,
      [identity.itemId, decision.revisionNumber, record.revision.title, record.revision.summary, record.revision.description, record.revision.verificationStatus],
    );
    const revisionId = revisionResult.rows[0].id;
    await client.query(
      `INSERT INTO public.pathway_revisions
         (revision_id, stage, course_stage, catalogue_group, category, route_content)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [revisionId, record.route.stage, record.route.courseStage, record.route.catalogueGroup, record.route.category, JSON.stringify(record.revision.routeContent)],
    );
    for (const { provenance, sourceId } of mappedProvenance) {
      if (!sourceId) throw new Error("Pathways source reconciliation returned no source ID for a draft provenance row.");
      await client.query(
        `INSERT INTO public.catalog_revision_sources
           (revision_id, source_id, claim_key, checked_at, verified_at, verification_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [revisionId, sourceId, provenance.claimKey, provenance.checkedAt ?? null, provenance.verifiedAt ?? null, provenance.verificationStatus],
      );
    }

    const pointerCheck = await client.query(
      "SELECT published_revision_id FROM public.catalog_items WHERE id=$1 AND item_type='pathway'",
      [identity.itemId],
    );
    if (pointerCheck.rowCount !== 1 || pointerCheck.rows[0].published_revision_id !== identity.publishedRevisionId) {
      throw new Error("Pathways draft import changed or observed a different published pointer; rolling back.");
    }
    await client.query("COMMIT");
    return {
      action: "inserted",
      pathwayId: record.id,
      catalogItemId: identity.itemId,
      revisionNumber: decision.revisionNumber,
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

export function verifyNeonDevelopmentEndpoint() {
  let endpointMetadata;
  try {
    endpointMetadata = JSON.parse(execFileSync("neon", ["api", `/projects/${expectedProjectId}/endpoints`], { encoding: "utf8", shell: true }));
  } catch (error) {
    throw new Error(`Refusing Pathways import: Neon endpoint metadata could not be verified. ${error.message}`);
  }
  const matches = (endpointMetadata.endpoints ?? []).filter((endpoint) => endpoint.host === expectedHost);
  if (matches.length !== 1 || matches[0].project_id !== expectedProjectId || matches[0].branch_id !== expectedBranchId) {
    throw new Error("Refusing Pathways import: Neon endpoint metadata does not uniquely identify the development branch.");
  }
  return { projectId: expectedProjectId, branchId: expectedBranchId, endpointHost: expectedHost };
}

export async function runRealPathwayDraftImport({
  payloadPath,
  directUrl,
  pooledUrl,
  env,
  preview = false,
  supersedeUnreviewedDraft = false,
}) {
  const target = assertDevelopmentTarget({
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
    throw new Error("Pathways payload must be valid JSON.");
  }
  const record = requireExactlyOneRecord(parsed);
  validateRealPathwayImportRecord(record);
  const pool = new Pool({ connectionString: directUrl, connectionTimeoutMillis: 10000, max: 1 });
  const client = await pool.connect();
  try {
    const database = await client.query("SELECT current_database() AS database_name");
    if (new URL(directUrl).pathname.length > 1 && database.rows[0].database_name !== decodeURIComponent(new URL(directUrl).pathname.slice(1))) {
      throw new Error("Refusing Pathways import: connected database name differs from the guarded database URL.");
    }
    if (database.rows[0].database_name !== "neondb") throw new Error("Refusing Pathways import: connected database is not the verified development database.");
    return await importOneRealPathwayDraft(client, record, { preview, supersedeUnreviewedDraft });
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
  const supersedeUnreviewedDraft = args[0] === "--supersede-unreviewed-draft";
  if (supersedeUnreviewedDraft) args.shift();
  if (args.length !== 1 || args[0].startsWith("--")) {
    console.error("Usage: node scripts/import-real-pathway-draft.mjs [--preview] [--supersede-unreviewed-draft] <one-pathway-payload.json>");
    process.exitCode = 1;
  } else {
    runRealPathwayDraftImport({
      payloadPath: resolve(args[0]),
      directUrl: process.env.DATABASE_URL_UNPOOLED,
      pooledUrl: process.env.DATABASE_URL,
      env: process.env,
      preview,
      supersedeUnreviewedDraft,
    })
      .then((result) => console.log(JSON.stringify(result, null, 2)))
      .catch((error) => {
        console.error(`Real-Pathways draft import failed: ${error.message}`);
        process.exitCode = 1;
      });
  }
}
