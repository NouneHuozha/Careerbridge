import { isDeepStrictEqual } from "node:util";

const sourceTypes = new Set([
  "official_api",
  "structured_government_dataset",
  "official_download",
  "official_public_web_page",
  "admin_manual_entry",
]);
const sourceStatuses = new Set(["active", "paused", "retired"]);
const savepoint = "source_reconciliation_batch";

function requireString(value, path) {
  if (typeof value !== "string" || value.trim() === "" || value !== value.trim()) {
    throw new Error(`${path} must be a non-empty trimmed string.`);
  }
}

function normalizeInput(source, index) {
  const path = `sources[${index}]`;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error(`${path} must be an object.`);
  }

  requireString(source.sourceKey, `${path}.sourceKey`);
  requireString(source.sourceName, `${path}.sourceName`);
  requireString(source.canonicalUrl, `${path}.canonicalUrl`);
  requireString(source.category, `${path}.category`);
  requireString(source.sourceType, `${path}.sourceType`);
  if (!sourceTypes.has(source.sourceType)) {
    throw new Error(`${path}.sourceType is not supported.`);
  }
  const status = source.status ?? "active";
  if (!sourceStatuses.has(status)) {
    throw new Error(`${path}.status is not supported.`);
  }
  if (source.authority !== undefined && source.authority !== null) {
    requireString(source.authority, `${path}.authority`);
  }
  if (source.dataTypes !== undefined &&
      (!Array.isArray(source.dataTypes) || !source.dataTypes.every((value) => typeof value === "string"))) {
    throw new Error(`${path}.dataTypes must be an array of strings.`);
  }
  for (const key of ["termsNotes", "expectedUpdateBehavior"]) {
    if (source[key] !== undefined && source[key] !== null && typeof source[key] !== "string") {
      throw new Error(`${path}.${key} must be a string or null.`);
    }
  }

  const providedFields = new Set(
    ["dataTypes", "termsNotes", "expectedUpdateBehavior"].filter((field) =>
      Object.hasOwn(source, field),
    ),
  );
  return {
    sourceKey: source.sourceKey,
    sourceName: source.sourceName,
    authority: source.authority ?? null,
    canonicalUrl: source.canonicalUrl,
    category: source.category,
    sourceType: source.sourceType,
    dataTypes: source.dataTypes ?? [],
    termsNotes: source.termsNotes ?? null,
    expectedUpdateBehavior: source.expectedUpdateBehavior ?? null,
    status,
    providedFields,
  };
}

function metadataDifferences(row, source) {
  const comparisons = [
    ["sourceName", row.source_name, source.sourceName],
    ["authority", row.authority, source.authority],
    ["canonicalUrl", row.canonical_url, source.canonicalUrl],
    ["category", row.category, source.category],
    ["sourceType", row.source_type, source.sourceType],
    ["status", row.status, source.status],
  ];
  if (source.providedFields.has("dataTypes")) {
    comparisons.push(["dataTypes", row.data_types, source.dataTypes]);
  }
  if (source.providedFields.has("termsNotes")) {
    comparisons.push(["termsNotes", row.terms_notes, source.termsNotes]);
  }
  if (source.providedFields.has("expectedUpdateBehavior")) {
    comparisons.push([
      "expectedUpdateBehavior",
      row.expected_update_behavior,
      source.expectedUpdateBehavior,
    ]);
  }
  return comparisons
    .filter(([, actual, expected]) => !isDeepStrictEqual(actual, expected))
    .map(([field]) => field);
}

function assertSameBatchMetadata(first, next) {
  const fields = [
    "sourceName",
    "authority",
    "canonicalUrl",
    "category",
    "sourceType",
    "status",
  ];
  const differences = fields.filter((field) => !isDeepStrictEqual(first[field], next[field]));
  for (const field of ["dataTypes", "termsNotes", "expectedUpdateBehavior"]) {
    if (
      first.providedFields.has(field) &&
      next.providedFields.has(field) &&
      !isDeepStrictEqual(first[field], next[field])
    ) {
      differences.push(field);
    } else if (next.providedFields.has(field) && !first.providedFields.has(field)) {
      first[field] = next[field];
      first.providedFields.add(field);
    }
  }
  if (differences.length > 0) {
    throw new Error(
      `Source keys "${first.sourceKey}" and "${next.sourceKey}" resolve to the same normalized URL with conflicting metadata: ${differences.join(", ")}.`,
    );
  }
}

async function buildPlan(client, inputs) {
  const sourceKeys = new Set();
  const groups = new Map();
  for (let index = 0; index < inputs.length; index += 1) {
    const source = normalizeInput(inputs[index], index);
    if (sourceKeys.has(source.sourceKey)) {
      throw new Error(`Duplicate sourceKey "${source.sourceKey}".`);
    }
    sourceKeys.add(source.sourceKey);

    const normalizedResult = await client.query(
      "SELECT public.normalize_source_url($1) AS normalized_url",
      [source.canonicalUrl],
    );
    const normalizedUrl = normalizedResult.rows[0]?.normalized_url;
    if (typeof normalizedUrl !== "string" || normalizedUrl === "") {
      throw new Error(`Source "${source.sourceKey}" did not produce a normalized URL.`);
    }

    let group = groups.get(normalizedUrl);
    if (group) {
      assertSameBatchMetadata(group.source, source);
      group.sources.push(source);
    } else {
      group = { normalizedUrl, source, sources: [source] };
      groups.set(normalizedUrl, group);
    }
  }

  for (const group of groups.values()) {
    const result = await client.query(
      `SELECT id, source_name, authority, canonical_url, category, source_type,
              data_types, terms_notes, expected_update_behavior, status, normalized_url
       FROM public.source_registry
       WHERE normalized_url = $1
       LIMIT 2`,
      [group.normalizedUrl],
    );
    if (result.rowCount > 1) {
      throw new Error(`Ambiguous source registry match for normalized URL "${group.normalizedUrl}".`);
    }
    if (result.rowCount === 1) {
      const differences = metadataDifferences(result.rows[0], group.source);
      if (differences.length > 0) {
        throw new Error(
          `Source "${group.source.sourceKey}" conflicts with existing metadata: ${differences.join(", ")}.`,
        );
      }
      group.existing = result.rows[0];
    }
  }
  return [...groups.values()];
}

async function insertSource(client, group) {
  const source = group.source;
  const result = await client.query(
    `INSERT INTO public.source_registry
       (source_name, authority, canonical_url, category, source_type, data_types,
        terms_notes, expected_update_behavior, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, source_name, authority, canonical_url, category, source_type,
               data_types, terms_notes, expected_update_behavior, status, normalized_url`,
    [
      source.sourceName,
      source.authority,
      source.canonicalUrl,
      source.category,
      source.sourceType,
      source.dataTypes,
      source.termsNotes,
      source.expectedUpdateBehavior,
      source.status,
    ],
  );
  const inserted = result.rows[0];
  if (inserted.normalized_url !== group.normalizedUrl) {
    throw new Error(`Source "${source.sourceKey}" was stored with an unexpected normalized URL.`);
  }
  return inserted;
}

function preserveInputOrder(sources, results) {
  const resultsByKey = new Map(results.map((result) => [result.sourceKey, result]));
  return sources.map(({ sourceKey }) => resultsByKey.get(sourceKey));
}

export async function reconcileSourceRegistry(client, sources, { mode = "preview" } = {}) {
  if (!["preview", "apply"].includes(mode)) {
    throw new Error('mode must be "preview" or "apply".');
  }
  if (!Array.isArray(sources)) {
    throw new Error("sources must be an array.");
  }
  if (mode === "preview") {
    const plan = await buildPlan(client, sources);
    const results = plan.flatMap((group) =>
      group.sources.map((source, index) => ({
        sourceKey: source.sourceKey,
        id: group.existing?.id ?? null,
        normalizedUrl: group.normalizedUrl,
        action: group.existing ? "reused" : index === 0 ? "would_insert" : "would_reuse",
      })),
    );
    return preserveInputOrder(sources, results);
  }

  // The caller owns the outer transaction so source rows commit with its catalogue writes.
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    const plan = await buildPlan(client, sources);
    const results = [];
    for (const group of plan) {
      const row = group.existing ?? await insertSource(client, group);
      group.sources.forEach((source, index) => {
        results.push({
          sourceKey: source.sourceKey,
          id: row.id,
          normalizedUrl: group.normalizedUrl,
          action: group.existing || index > 0 ? "reused" : "inserted",
        });
      });
    }
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    return preserveInputOrder(sources, results);
  } catch (error) {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    throw error;
  }
}
