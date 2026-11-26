import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import pg from "pg";
import { reconcileSourceRegistry } from "../src/db/source-reconciliation.mjs";
import {
  assertDevelopmentTarget,
  verifyNeonDevelopmentEndpoint,
} from "./import-real-pathway-draft.mjs";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const advisoryLock = [20261126, 3];

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
  validateInstitutionImportRecord,
  validateCampusImportRecord,
  validateCourseOfferingImportRecord,
  hashInstitutionImportRecord,
  decideImportRevision,
} = require("../src/db/institution-import-validation.ts");

const configs = {
  institution: {
    itemType: "institution",
    aliasType: "institution",
    typedTable: "institution_revisions",
    typedColumns: "slug, initials, institution_type, ownership, institution_content",
  },
  campus: {
    itemType: "campus",
    aliasType: "campus",
    typedTable: "campus_revisions",
    typedColumns: "institution_item_id, state_id, campus_content",
  },
  course_offering: {
    itemType: "course_offering",
    aliasType: "institution-offering",
    typedTable: "course_offering_revisions",
    typedColumns: "course_item_id, course_revision_id, campus_item_id, campus_revision_id, slug, offering_details",
  },
};

function assertRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Exactly one institution catalogue record is required.");
  }
  const validator = {
    institution: validateInstitutionImportRecord,
    campus: validateCampusImportRecord,
    course_offering: validateCourseOfferingImportRecord,
  }[record.kind];
  if (!validator) throw new Error("Record kind must be institution, campus, or course_offering.");
  validator(record);
}

function aliasKey(alias) {
  return JSON.stringify([
    alias.sourceSystem,
    alias.externalType,
    alias.externalKey,
    alias.externalContextKey,
  ]);
}

function normalizeStoredTimestamp(value) {
  if (!value) return null;
  const iso = new Date(value).toISOString();
  return iso.slice(11, 19) === "00:00:00" ? iso.slice(0, 10) : iso;
}

async function loadAliases(client, itemId) {
  const result = await client.query(
    `SELECT source_system AS "sourceSystem", external_type AS "externalType",
            external_key AS "externalKey", external_context_key AS "externalContextKey"
       FROM public.catalog_item_aliases
      WHERE catalog_item_id=$1
      ORDER BY source_system, external_type, external_key, external_context_key`,
    [itemId],
  );
  return result.rows;
}

async function resolveOrCreateIdentity(client, record, { preview }) {
  const config = configs[record.kind];
  const matches = [];
  for (const alias of record.aliases) {
    const result = await client.query(
      `SELECT i.id, i.item_type, i.published_revision_id
         FROM public.catalog_item_aliases a
         JOIN public.catalog_items i ON i.id=a.catalog_item_id
        WHERE a.source_system=$1 AND a.external_type=$2
          AND a.external_key=$3 AND a.external_context_key=$4`,
      [alias.sourceSystem, alias.externalType, alias.externalKey, alias.externalContextKey],
    );
    if ((result.rowCount ?? 0) > 1) {
      throw new Error(`Alias ${JSON.stringify(alias)} resolves to multiple catalogue identities.`);
    }
    if (result.rowCount === 1) matches.push({ ...result.rows[0], matchedAlias: alias });
  }

  const itemIds = [...new Set(matches.map((row) => row.id))];
  if (itemIds.length > 1) {
    throw new Error("Incoming aliases resolve to different catalogue identities; resolve the identity conflict explicitly.");
  }

  if (itemIds.length === 1) {
    if (
      record.kind === "course_offering" &&
      !matches.some(({ matchedAlias }) =>
        matchedAlias.sourceSystem !== "careerbridge" ||
        matchedAlias.externalType !== "institution-offering" ||
        matchedAlias.externalKey !== record.institutionId ||
        matchedAlias.externalContextKey !== "",
      )
    ) {
      throw new Error("A contextless legacy offering alias is ambiguous without a course-specific identity match.");
    }
    const identity = matches[0];
    if (identity.item_type !== config.itemType) {
      throw new Error(`Existing alias resolves to ${identity.item_type}, not ${config.itemType}.`);
    }
    const aliases = await loadAliases(client, identity.id);
    if (
      record.kind === "institution" &&
      !aliases.some((alias) =>
        alias.sourceSystem === "careerbridge" &&
        alias.externalType === config.aliasType &&
        alias.externalKey === record.id &&
        alias.externalContextKey === "",
      )
    ) {
      throw new Error("An incoming alias matches an identity with a different canonical record ID.");
    }
    if (
      record.kind === "campus" &&
      !aliases.some((alias) =>
        alias.sourceSystem === "careerbridge" &&
        alias.externalType === config.aliasType &&
        alias.externalKey === `${record.institution.id}--${record.id}` &&
        alias.externalContextKey === "",
      )
    ) {
      throw new Error("An incoming alias matches a campus identity with a different parent-qualified ID.");
    }
    const existing = new Set(aliases.map(aliasKey));
    const aliasesToCreate = record.aliases.filter((alias) => !existing.has(aliasKey(alias)));
    if (!preview) {
      for (const alias of aliasesToCreate) {
        await client.query(
          `INSERT INTO public.catalog_item_aliases
             (source_system, external_type, external_key, external_context_key, catalog_item_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [alias.sourceSystem, alias.externalType, alias.externalKey, alias.externalContextKey, identity.id],
        );
      }
    }
    return {
      itemId: identity.id,
      publishedRevisionId: identity.published_revision_id,
      aliases: [...aliases, ...aliasesToCreate],
      aliasesToCreate,
      created: false,
    };
  }

  if (preview) {
    return {
      itemId: null,
      publishedRevisionId: null,
      aliases: record.aliases,
      aliasesToCreate: record.aliases,
      created: true,
    };
  }
  const item = await client.query(
    "INSERT INTO public.catalog_items (item_type) VALUES ($1) RETURNING id, published_revision_id",
    [config.itemType],
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
  return {
    itemId,
    publishedRevisionId: item.rows[0].published_revision_id,
    aliases: record.aliases,
    aliasesToCreate: record.aliases,
    created: true,
  };
}

async function resolveIdentityReference(client, { id, catalogItemId, aliasType }) {
  const result = await client.query(
    `SELECT i.id, i.item_type, i.published_revision_id,
            a.external_key AS alias_key
       FROM public.catalog_item_aliases a
       JOIN public.catalog_items i ON i.id=a.catalog_item_id
      WHERE a.source_system='careerbridge' AND a.external_type=$1
        AND a.external_key=$2 AND a.external_context_key=''`,
    [aliasType, id],
  );
  if (result.rowCount !== 1) {
    throw new Error(`Dependency ${id} must resolve to exactly one existing ${aliasType} identity.`);
  }
  const row = result.rows[0];
  if (row.id !== catalogItemId || row.item_type !== aliasType) {
    throw new Error(`Dependency ${id} does not match the supplied catalogue item and type.`);
  }
  return row;
}

async function getIdentityState(client, itemId, itemType) {
  const result = await client.query(
    `SELECT i.published_revision_id, r.publication_status, r.data_classification
       FROM public.catalog_items i
       LEFT JOIN public.catalog_item_revisions r
         ON r.id=COALESCE(i.published_revision_id,
              (SELECT latest.id FROM public.catalog_item_revisions latest
                WHERE latest.catalog_item_id=i.id ORDER BY latest.revision_number DESC LIMIT 1))
      WHERE i.id=$1 AND i.item_type=$2`,
    [itemId, itemType],
  );
  if (result.rowCount !== 1) throw new Error(`Dependency item ${itemId} was not found as ${itemType}.`);
  const row = result.rows[0];
  return {
    publicationStatus: row.publication_status ?? "draft",
    dataClassification: row.data_classification ?? "real",
    publishedRevisionId: row.published_revision_id,
  };
}

async function resolveRevisionDependency(client, dependency, itemType, typedTable) {
  const result = await client.query(
    `SELECT i.id AS item_id, i.item_type, i.published_revision_id,
            r.id AS revision_id, r.publication_status, r.data_classification,
            t.revision_id AS typed_revision_id
       FROM public.catalog_items i
       JOIN public.catalog_item_revisions r
         ON r.id=$2 AND r.catalog_item_id=i.id
       LEFT JOIN public.${typedTable} t ON t.revision_id=r.id
      WHERE i.id=$1`,
    [dependency.catalogItemId, dependency.revisionId],
  );
  if (result.rowCount !== 1) {
    throw new Error(`Dependency ${itemType} item/revision relationship does not exist.`);
  }
  const row = result.rows[0];
  if (row.item_type !== itemType || row.typed_revision_id !== row.revision_id) {
    throw new Error(`Dependency ${itemType} revision has an invalid item type or missing typed revision.`);
  }
  if (
    row.publication_status !== "published" ||
    row.published_revision_id !== row.revision_id
  ) {
    throw new Error(`Dependency ${itemType} revision must be the current published revision.`);
  }
  return row;
}

async function verifyDependencies(client, record) {
  if (record.kind === "institution") return record;
  const institution = await resolveIdentityReference(client, {
    id: record.kind === "campus" ? record.institution.id : record.institutionId,
    catalogItemId: record.kind === "campus"
      ? record.institution.catalogItemId
      : record.campus.institution.catalogItemId,
    aliasType: "institution",
  });
  const institutionState = await getIdentityState(client, institution.id, "institution");
  if (record.kind === "campus") {
    const resolved = {
      ...record,
      institution: {
        ...record.institution,
        publicationStatus: institutionState.publicationStatus,
        dataClassification: institutionState.dataClassification,
      },
    };
    validateCampusImportRecord(resolved);
    return resolved;
  }

  await resolveIdentityReference(client, {
    id: record.campus.id,
    catalogItemId: record.campus.catalogItemId,
    aliasType: "campus",
  });
  const campusRevision = await resolveRevisionDependency(
    client,
    record.campus,
    "campus",
    "campus_revisions",
  );
  const campusParent = await client.query(
    `SELECT institution_item_id FROM public.campus_revisions WHERE revision_id=$1`,
    [record.campus.revisionId],
  );
  if (campusParent.rows[0]?.institution_item_id !== institution.id) {
    throw new Error("The selected campus revision belongs to a different institution identity.");
  }
  await resolveIdentityReference(client, {
    id: record.course.id,
    catalogItemId: record.course.catalogItemId,
    aliasType: "course",
  });
  const courseRevision = await resolveRevisionDependency(
    client,
    record.course,
    "course",
    "course_revisions",
  );
  const campusInstitutionState = await getIdentityState(client, institution.id, "institution");
  const resolved = {
    ...record,
    campus: {
      ...record.campus,
      publicationStatus: campusRevision.publication_status,
      dataClassification: campusRevision.data_classification,
      institution: {
        ...record.campus.institution,
        publicationStatus: campusInstitutionState.publicationStatus,
        dataClassification: campusInstitutionState.dataClassification,
      },
    },
    course: {
      ...record.course,
      publicationStatus: courseRevision.publication_status,
      dataClassification: courseRevision.data_classification,
    },
  };
  validateCourseOfferingImportRecord(resolved);
  return resolved;
}

async function listRevisions(client, itemId, kind) {
  const config = configs[kind];
  const result = await client.query(
    `SELECT r.id, r.revision_number, r.publication_status, r.data_classification,
            r.verification_status, r.updated_by, r.published_at, r.title, r.summary,
            r.description, t.revision_id AS typed_revision_id, t.${config.typedColumns}
       FROM public.catalog_item_revisions r
       LEFT JOIN public.${config.typedTable} t ON t.revision_id=r.id
      WHERE r.catalog_item_id=$1 ORDER BY r.revision_number`,
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

function existingPayload(record, row, aliases, provenanceRows) {
  const sources = new Map();
  for (const source of provenanceRows) {
    if (!source.canonical_url && !source.normalized_url) continue;
    if (!sources.has(source.source_id)) {
      sources.set(source.source_id, {
        sourceKey: `existing-${source.source_id}`,
        sourceName: source.source_name,
        authority: source.authority,
        canonicalUrl: source.canonical_url,
        category: source.category,
        sourceType: source.source_type,
        dataTypes: source.data_types,
        termsNotes: source.terms_notes,
        expectedUpdateBehavior: source.expected_update_behavior,
        status: source.status,
      });
    }
  }
  const revision = {
    title: row.title,
    summary: row.summary,
    description: row.description,
    publicationStatus: "draft",
    dataClassification: row.data_classification,
    verificationStatus: row.verification_status,
    provenance: provenanceRows.map((entry) => ({
      claimKey: entry.claim_key,
      sourceId: entry.source_id,
      sourceUrl: entry.canonical_url ?? entry.normalized_url,
      checkedAt: normalizeStoredTimestamp(entry.checked_at),
      verificationStatus: entry.verification_status ?? "not_collected",
    })),
  };
  if (record.kind === "institution") {
    return {
      kind: record.kind,
      id: record.id,
      aliases,
      sources: [...sources.values()],
      revision: {
        ...revision,
        slug: row.slug,
        initials: row.initials,
        institutionType: row.institution_type,
        ownership: row.ownership,
        content: row.institution_content,
      },
    };
  }
  if (record.kind === "campus") {
    return {
      kind: record.kind,
      id: record.id,
      aliases,
      sources: [...sources.values()],
      institution: record.institution,
      revision: {
        ...revision,
        stateId: row.state_id,
        content: row.campus_content,
      },
    };
  }
  return {
    kind: record.kind,
    id: record.id,
    institutionId: record.institutionId,
    aliases,
    sources: [...sources.values()],
    campus: record.campus,
    course: record.course,
    revision: {
      ...revision,
      slug: row.slug,
      details: row.offering_details,
    },
  };
}

async function reconcileSources(client, record, preview) {
  return reconcileSourceRegistry(
    client,
    record.sources ?? [],
    { mode: preview ? "preview" : "apply" },
  );
}

async function resolveProvenanceSources(client, record, reconciled) {
  const sourceIds = new Map(reconciled.map((source) => [source.sourceKey, source.id]));
  const metadataByKey = new Map((record.sources ?? []).map((source) => [source.sourceKey, source]));
  const result = [];
  for (const [index, provenance] of (record.revision.provenance ?? []).entries()) {
    let sourceId = provenance.sourceKey ? sourceIds.get(provenance.sourceKey) : provenance.sourceId;
    let source = null;
    if (sourceId) {
      const lookup = await client.query(
        `SELECT id, status, canonical_url, normalized_url
           FROM public.source_registry WHERE id=$1`,
        [sourceId],
      );
      if (lookup.rowCount === 1) source = lookup.rows[0];
      else throw new Error(`revision.provenance[${index}] source ID was not found.`);
    } else if (provenance.sourceUrl) {
      const lookup = await client.query(
        `SELECT id, status, canonical_url, normalized_url
           FROM public.source_registry
          WHERE normalized_url=public.normalize_source_url($1)
          LIMIT 2`,
        [provenance.sourceUrl],
      );
      if (lookup.rowCount === 1) {
        source = lookup.rows[0];
        sourceId = source.id;
      } else if (!provenance.sourceKey || lookup.rowCount > 1) {
        throw new Error(`revision.provenance[${index}].sourceUrl did not resolve to exactly one registered source.`);
      }
    }
    if (source && source.status !== "active") {
      throw new Error(`revision.provenance[${index}] references a source that is not active.`);
    }
    const metadata = provenance.sourceKey ? metadataByKey.get(provenance.sourceKey) : null;
    if (metadata && (metadata.status ?? "active") !== "active") {
      throw new Error(`revision.provenance[${index}] references a source that is not active.`);
    }
    if (provenance.sourceUrl) {
      if (source && !source.normalized_url) {
        throw new Error(`revision.provenance[${index}].sourceUrl cannot be matched to the registered source.`);
      }
      const normalized = await client.query(
        "SELECT public.normalize_source_url($1) AS normalized_url",
        [provenance.sourceUrl],
      );
      const expectedUrl = source?.normalized_url ??
        reconciled.find((entry) => entry.sourceKey === provenance.sourceKey)?.normalizedUrl;
      if (expectedUrl && normalized.rows[0]?.normalized_url !== expectedUrl) {
        throw new Error(`revision.provenance[${index}].sourceUrl conflicts with its registered source.`);
      }
    }
    const sourceUrl = provenance.sourceUrl ?? source?.canonical_url ?? metadata?.canonicalUrl;
    result.push({
      provenance: {
        ...provenance,
        checkedAt: normalizeStoredTimestamp(provenance.checkedAt),
        sourceUrl: sourceUrl ?? null,
      },
      sourceId: sourceId ?? null,
    });
  }
  return result;
}

async function insertTypedRevision(client, record, revisionId) {
  if (record.kind === "institution") {
    await client.query(
      `INSERT INTO public.institution_revisions
         (revision_id, slug, initials, institution_type, ownership, institution_content)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        revisionId,
        record.revision.slug,
        record.revision.initials,
        record.revision.institutionType,
        record.revision.ownership ?? null,
        JSON.stringify(record.revision.content),
      ],
    );
  } else if (record.kind === "campus") {
    await client.query(
      `INSERT INTO public.campus_revisions
         (revision_id, institution_item_id, state_id, campus_content)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [
        revisionId,
        record.institution.catalogItemId,
        record.revision.stateId ?? null,
        JSON.stringify(record.revision.content),
      ],
    );
  } else {
    await client.query(
      `INSERT INTO public.course_offering_revisions
         (revision_id, course_item_id, course_revision_id, campus_item_id,
          campus_revision_id, slug, offering_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        revisionId,
        record.course.catalogItemId,
        record.course.revisionId,
        record.campus.catalogItemId,
        record.campus.revisionId,
        record.revision.slug,
        JSON.stringify(record.revision.details),
      ],
    );
  }
}

export async function importOneInstitutionCatalogueDraft(client, payload, { preview = false } = {}) {
  assertRecord(payload);
  await client.query(preview ? "BEGIN READ ONLY" : "BEGIN");
  try {
    if (!preview) await client.query("SELECT pg_advisory_xact_lock($1, $2)", advisoryLock);
    const record = await verifyDependencies(client, payload);
    const identity = await resolveOrCreateIdentity(client, record, { preview });
    const revisions = await listRevisions(client, identity.itemId, record.kind);
    for (const row of revisions) {
      if (row.typed_revision_id !== row.id) {
        throw new Error(`Catalogue revision ${row.id} has no matching ${record.kind} typed revision.`);
      }
    }
    if (
      identity.publishedRevisionId &&
      !revisions.some((row) => row.id === identity.publishedRevisionId && row.publication_status === "published")
    ) {
      throw new Error("Catalogue identity has an invalid published revision pointer.");
    }
    const latest = revisions.at(-1) ?? null;
    const sources = await reconcileSources(client, record, preview);
    const mappedProvenance = await resolveProvenanceSources(client, record, sources);
    const sourceIdentity = new Map(
      sources.map((source) => [source.sourceKey, source.id ?? source.normalizedUrl]),
    );
    const provenanceTuples = new Set();
    for (const { provenance, sourceId } of mappedProvenance) {
      const key = JSON.stringify([
        sourceId ?? sourceIdentity.get(provenance.sourceKey) ?? provenance.sourceUrl,
        provenance.claimKey,
      ]);
      if (provenanceTuples.has(key)) {
        throw new Error(`Duplicate provenance association for claim ${provenance.claimKey}.`);
      }
      provenanceTuples.add(key);
    }
    const incoming = {
      ...record,
      revision: {
        ...record.revision,
        summary: record.revision.summary ?? null,
        description: record.revision.description ?? null,
        ...(record.kind === "institution"
          ? { ownership: record.revision.ownership ?? null }
          : {}),
        ...(record.kind === "campus"
          ? { stateId: record.revision.stateId ?? null }
          : {}),
        provenance: mappedProvenance.map(({ provenance, sourceId }) => ({
          ...provenance,
          ...(sourceId ? { sourceId } : {}),
        })),
      },
    };
    let decision = { action: "insert", revisionNumber: 1 };
    if (latest && latest.data_classification !== "real") {
      const preservableDemo = revisions.length === 1 &&
        latest.data_classification === "demo" &&
        latest.publication_status === "draft" &&
        latest.published_at === null &&
        identity.publishedRevisionId === null;
      if (!preservableDemo) {
        throw new Error("Revision conflict: existing demo or test history cannot be converted or bypassed.");
      }
      decision = { action: "create_revision", revisionNumber: latest.revision_number + 1 };
    } else if (latest) {
      const provenance = await readRevisionSources(client, latest.id);
      const stored = existingPayload(incoming, latest, identity.aliases, provenance);
      const existingHash = hashInstitutionImportRecord(stored);
      const incomingHash = hashInstitutionImportRecord(incoming);
      decision = decideImportRevision(incomingHash, "real", {
        contentHash: existingHash,
        revisionNumber: latest.revision_number,
        publicationStatus: latest.publication_status,
        dataClassification: latest.data_classification,
      });
    }

    if (decision.action === "conflict") {
      throw new Error(`Revision conflict: ${decision.reason}`);
    }
    if (decision.action === "unchanged") {
      if (preview) {
        await client.query("ROLLBACK");
      } else {
        await client.query("COMMIT");
      }
      return {
        action: "unchanged",
        kind: record.kind,
        recordId: record.id,
        catalogItemId: identity.itemId,
        revisionId: latest.id,
        revisionNumber: latest.revision_number,
        identity: identity.created ? "would_create" : "reused",
        aliasesToCreate: identity.aliasesToCreate,
        published: false,
      };
    }

    if (preview) {
      await client.query("ROLLBACK");
      return {
        action: "would_insert",
        kind: record.kind,
        recordId: record.id,
        catalogItemId: identity.itemId,
        identity: identity.created ? "would_create" : "reused",
        aliasesToCreate: identity.aliasesToCreate,
        revisionNumber: decision.revisionNumber,
        existingRevisions: revisions.map((row) => ({
          id: row.id,
          revisionNumber: row.revision_number,
          publicationStatus: row.publication_status,
          dataClassification: row.data_classification,
        })),
        sources,
        provenanceCount: mappedProvenance.length,
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
        identity.itemId,
        decision.revisionNumber,
        record.revision.title,
        record.revision.summary ?? null,
        record.revision.description ?? null,
        record.revision.verificationStatus,
      ],
    );
    const revisionId = revisionResult.rows[0].id;
    await insertTypedRevision(client, record, revisionId);
    for (const { provenance, sourceId } of mappedProvenance) {
      if (!sourceId) {
        throw new Error("A provenance source did not resolve to an active source registry ID.");
      }
      await client.query(
        `INSERT INTO public.catalog_revision_sources
           (revision_id, source_id, claim_key, checked_at, verified_at, verification_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          revisionId,
          sourceId,
          provenance.claimKey,
          provenance.checkedAt ?? null,
          provenance.verifiedAt ?? null,
          provenance.verificationStatus,
        ],
      );
    }
    const pointer = await client.query(
      "SELECT published_revision_id FROM public.catalog_items WHERE id=$1 AND item_type=$2",
      [identity.itemId, configs[record.kind].itemType],
    );
    if (
      pointer.rowCount !== 1 ||
      pointer.rows[0].published_revision_id !== identity.publishedRevisionId
    ) {
      throw new Error("Draft import changed or observed a different published revision pointer; rolling back.");
    }
    await client.query("COMMIT");
    return {
      action: "inserted",
      kind: record.kind,
      recordId: record.id,
      catalogItemId: identity.itemId,
      revisionId,
      revisionNumber: decision.revisionNumber,
      identity: identity.created ? "created" : "reused",
      aliasesCreated: identity.aliasesToCreate,
      sources,
      provenanceCount: mappedProvenance.length,
      published: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function runInstitutionCatalogueDraftImport({
  payloadPath,
  directUrl,
  pooledUrl,
  env,
  preview = false,
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
  let payload;
  try {
    payload = JSON.parse(await readFile(payloadPath, "utf8"));
  } catch {
    throw new Error("Institution catalogue payload must be valid JSON.");
  }
  assertRecord(payload);
  const pool = new Pool({ connectionString: directUrl, connectionTimeoutMillis: 10000, max: 1 });
  let client;
  try {
    client = await pool.connect();
    const database = await client.query("SELECT current_database() AS database_name");
    const expectedDatabaseName = decodeURIComponent(new URL(directUrl).pathname.slice(1));
    if (database.rows[0]?.database_name !== expectedDatabaseName || expectedDatabaseName !== "neondb") {
      throw new Error("Refusing institution catalogue import: connected database does not match the guarded development database.");
    }
    return await importOneInstitutionCatalogueDraft(client, payload, { preview });
  } finally {
    client?.release();
    await pool.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const preview = args[0] === "--preview";
  if (preview) args.shift();
  if (args.length !== 1 || args[0].startsWith("--")) {
    console.error("Usage: node scripts/import-institution-catalogue-draft.mjs [--preview] <one-institution-record.json>");
    process.exitCode = 1;
  } else {
    runInstitutionCatalogueDraftImport({
      payloadPath: resolve(args[0]),
      directUrl: process.env.DATABASE_URL_UNPOOLED,
      pooledUrl: process.env.DATABASE_URL,
      env: process.env,
      preview,
    })
      .then((result) => console.log(JSON.stringify(result, null, 2)))
      .catch((error) => {
        console.error(`Institution catalogue draft import failed: ${error.message}`);
        process.exitCode = 1;
      });
  }
}
