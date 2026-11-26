export type CatalogueAlias = {
  sourceSystem: string;
  externalType: string;
  externalKey: string;
  externalContextKey: string;
};

export type CatalogueSource = {
  sourceKey: string;
  sourceName: string;
  authority?: string | null;
  canonicalUrl: string;
  category: string;
  sourceType:
    | "official_api"
    | "structured_government_dataset"
    | "official_download"
    | "official_public_web_page"
    | "admin_manual_entry";
  dataTypes?: string[];
  termsNotes?: string | null;
  expectedUpdateBehavior?: string | null;
  status: "active" | "paused" | "retired";
};

export type CatalogueProvenance = {
  claimKey: string;
  sourceKey?: string;
  sourceId?: string | null;
  sourceUrl?: string | null;
  checkedAt?: string | null;
  verifiedAt?: string | null;
  verificationStatus:
    | "not_collected"
    | "unverified"
    | "pending_review"
    | "verified"
    | "partially_verified"
    | "disputed"
    | "unavailable"
    | "stale"
    | "expired"
    | "superseded";
};

const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const sourceTypes = new Set([
  "official_api",
  "structured_government_dataset",
  "official_download",
  "official_public_web_page",
  "admin_manual_entry",
]);
const sourceStatuses = new Set(["active", "paused", "retired"]);
const verificationStatuses = new Set([
  "not_collected",
  "unverified",
  "pending_review",
  "verified",
  "partially_verified",
  "disputed",
  "unavailable",
  "stale",
  "expired",
  "superseded",
]);

export function fail(path: string, reason: string): never {
  throw new Error(`${path}: ${reason}`);
}

export function requireObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(path, "must be an object.");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(path, "must be a plain object.");
  return value as Record<string, unknown>;
}

export function assertOnlyKeys(value: Record<string, unknown>, keys: readonly string[], path: string) {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) fail(`${path}.${key}`, "is not a supported field.");
  }
}

export function requireString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") fail(path, "must be a non-empty string.");
  if (value !== value.trim()) fail(path, "must not have leading or trailing whitespace.");
}

export function validateHttpUrl(value: unknown, path: string): asserts value is string {
  requireString(value, path);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    fail(path, "must be an absolute HTTP(S) URL.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    fail(path, "must be an absolute HTTP(S) URL without credentials.");
  }
}

export function isValidDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

export function validateStringArray(value: unknown, path: string, allowed?: Set<string>, nonEmpty = false) {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0)) {
    fail(path, `must be ${nonEmpty ? "a non-empty" : "an"} array of strings.`);
  }
  value.forEach((entry, index) => {
    requireString(entry, `${path}[${index}]`);
    if (allowed && !allowed.has(entry)) fail(`${path}[${index}]`, `must be one of: ${[...allowed].join(", ")}.`);
  });
  if (new Set(value).size !== value.length) fail(path, "must not contain duplicate values.");
}

export function validateAliases(value: unknown, id: string, externalType: string): CatalogueAlias[] {
  if (!Array.isArray(value) || value.length === 0) fail("aliases", "must include the canonical CareerBridge identity.");
  const aliases = value.map((valueAlias, index) => {
    const path = `aliases[${index}]`;
    const alias = requireObject(valueAlias, path);
    assertOnlyKeys(alias, ["sourceSystem", "externalType", "externalKey", "externalContextKey"], path);
    requireString(alias.sourceSystem, `${path}.sourceSystem`);
    requireString(alias.externalType, `${path}.externalType`);
    requireString(alias.externalKey, `${path}.externalKey`);
    if (typeof alias.externalContextKey !== "string") fail(`${path}.externalContextKey`, "must be a string.");
    if (alias.externalType !== externalType) fail(`${path}.externalType`, `must be "${externalType}".`);
    if (alias.externalContextKey !== "") fail(`${path}.externalContextKey`, "must be empty.");
    return alias as unknown as CatalogueAlias;
  });
  const tuples = new Set<string>();
  for (const alias of aliases) {
    const tuple = JSON.stringify([alias.sourceSystem, alias.externalType, alias.externalKey, alias.externalContextKey]);
    if (tuples.has(tuple)) fail("aliases", "contains a duplicate alias tuple.");
    tuples.add(tuple);
    if (alias.sourceSystem === "careerbridge" && alias.externalKey !== id) {
      fail("aliases", "conflicting CareerBridge aliases must resolve to the supplied ID.");
    }
  }
  if (!aliases.some((alias) =>
    alias.sourceSystem === "careerbridge" &&
    alias.externalType === externalType &&
    alias.externalKey === id &&
    alias.externalContextKey === "",
  )) fail("aliases", "must include the context-free CareerBridge identity.");
  return aliases;
}

export function validateSources(value: unknown): CatalogueSource[] {
  if (!Array.isArray(value) || value.length === 0) fail("sources", "must contain at least one registered source.");
  const keys = new Set<string>();
  const urls = new Set<string>();
  const sources = value.map((sourceValue, index) => {
    const path = `sources[${index}]`;
    const source = requireObject(sourceValue, path);
    assertOnlyKeys(source, [
      "sourceKey", "sourceName", "authority", "canonicalUrl", "category", "sourceType",
      "dataTypes", "termsNotes", "expectedUpdateBehavior", "status",
    ], path);
    requireString(source.sourceKey, `${path}.sourceKey`);
    requireString(source.sourceName, `${path}.sourceName`);
    requireString(source.category, `${path}.category`);
    validateHttpUrl(source.canonicalUrl, `${path}.canonicalUrl`);
    requireString(source.sourceType, `${path}.sourceType`);
    if (!sourceTypes.has(source.sourceType)) fail(`${path}.sourceType`, "is not supported.");
    if (source.status !== undefined && !sourceStatuses.has(String(source.status))) {
      fail(`${path}.status`, "is not supported.");
    }
    if (source.authority !== undefined && source.authority !== null) requireString(source.authority, `${path}.authority`);
    if (source.dataTypes !== undefined) validateStringArray(source.dataTypes, `${path}.dataTypes`);
    for (const key of ["termsNotes", "expectedUpdateBehavior"] as const) {
      if (source[key] !== undefined && source[key] !== null && typeof source[key] !== "string") {
        fail(`${path}.${key}`, "must be a string or null.");
      }
    }
    const normalized = new URL(source.canonicalUrl as string);
    normalized.hash = "";
    if (keys.has(source.sourceKey as string)) fail("sources", "contains duplicate sourceKey values.");
    if (urls.has(normalized.href)) fail("sources", "contains duplicate source URLs.");
    keys.add(source.sourceKey as string);
    urls.add(normalized.href);
    if ((source.status ?? "active") !== "active") fail(`${path}.status`, "must be active for a new real draft.");
    return {
      ...source,
      status: source.status ?? "active",
    } as unknown as CatalogueSource;
  });
  return sources;
}

export function validateProvenance(value: unknown, sources: CatalogueSource[]): CatalogueProvenance[] {
  if (!Array.isArray(value) || value.length === 0) fail("revision.provenance", "must contain claim-level evidence.");
  const provenance = value.map((entryValue, index) => {
    const path = `revision.provenance[${index}]`;
    const entry = requireObject(entryValue, path);
    assertOnlyKeys(entry, [
      "claimKey", "sourceKey", "sourceId", "sourceUrl", "checkedAt", "verifiedAt", "verificationStatus",
    ], path);
    requireString(entry.claimKey, `${path}.claimKey`);
    if (entry.sourceKey !== undefined) {
      requireString(entry.sourceKey, `${path}.sourceKey`);
      const source = sources.find((candidate) => candidate.sourceKey === entry.sourceKey);
      if (!source) fail(`${path}.sourceKey`, "must reference record.sources.");
      if (entry.sourceUrl !== undefined && entry.sourceUrl !== null) {
        validateHttpUrl(entry.sourceUrl, `${path}.sourceUrl`);
        if (entry.sourceUrl !== source.canonicalUrl) fail(`${path}.sourceUrl`, "must match the referenced source URL.");
      }
    }
    if (entry.sourceId !== undefined && entry.sourceId !== null) {
      requireString(entry.sourceId, `${path}.sourceId`);
      if (!uuidPattern.test(entry.sourceId)) fail(`${path}.sourceId`, "must be a UUID.");
    }
    if (entry.sourceUrl !== undefined && entry.sourceUrl !== null) validateHttpUrl(entry.sourceUrl, `${path}.sourceUrl`);
    if (entry.sourceId == null && entry.sourceUrl == null && entry.sourceKey == null) {
      fail(path, "must identify a source URL, existing source ID, or sourceKey.");
    }
    for (const key of ["checkedAt", "verifiedAt"] as const) {
      if (entry[key] !== undefined && entry[key] !== null) {
        requireString(entry[key], `${path}.${key}`);
        if (!isValidDate(entry[key] as string)) fail(`${path}.${key}`, "must be a valid ISO date or timestamp.");
      }
    }
    if (typeof entry.verificationStatus !== "string" || !verificationStatuses.has(entry.verificationStatus)) {
      fail(`${path}.verificationStatus`, "is not supported.");
    }
    if (entry.verificationStatus === "verified" || entry.verifiedAt != null) {
      fail(path, "imported evidence must remain unverified until an administrator reviews it.");
    }
    return entry as unknown as CatalogueProvenance;
  });
  const tuples = new Set<string>();
  for (const entry of provenance) {
    const identity = entry.sourceKey ?? entry.sourceId ?? entry.sourceUrl;
    const key = JSON.stringify([entry.claimKey, identity]);
    if (tuples.has(key)) fail("revision.provenance", "contains duplicate claim/source evidence.");
    tuples.add(key);
  }
  return provenance;
}

export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== "object" || value === null) return value;
  return Object.keys(value).sort().reduce<Record<string, unknown>>((result, key) => {
    const entry = (value as Record<string, unknown>)[key];
    if (entry !== undefined) result[key] = canonicalize(entry);
    return result;
  }, {});
}

export function requireEvidenceForClaims(provenance: CatalogueProvenance[], requiredClaims: string[]) {
  for (const claimKey of requiredClaims) {
    if (!provenance.some((entry) => entry.claimKey === claimKey)) {
      fail("revision.provenance", `claim "${claimKey}" requires claim-level evidence.`);
    }
  }
}
