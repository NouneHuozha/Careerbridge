import { createHash } from "node:crypto";

export type PathwayStage = "class-10" | "class-12";
export type PathwayPublicationStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived"
  | "rejected";
export type PathwayVerificationStatus =
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

export type PathwayAlias = {
  sourceSystem: string;
  externalType: string;
  externalKey: string;
  externalContextKey: string;
};

export type PathwaySourceMetadata = {
  sourceKey: string;
  sourceName: string;
  authority: string;
  canonicalUrl: string;
  normalizedUrl?: string;
  category: string;
  sourceType:
    | "official_api"
    | "structured_government_dataset"
    | "official_download"
    | "official_public_web_page";
  dataTypes?: string[];
  termsNotes?: string | null;
  expectedUpdateBehavior?: string | null;
  status: "active" | "paused" | "retired";
};

export type PathwayProvenance = {
  claimKey: string;
  sourceKey?: string;
  sourceId?: string | null;
  sourceUrl?: string | null;
  checkedAt?: string | null;
  verifiedAt?: string | null;
  verificationStatus: PathwayVerificationStatus;
};

export type PathwayRouteContent = {
  steps: string[];
  progression: { title: string; description: string; nextStage?: string }[];
  qualification: { title: string; description: string };
  considerations: { title: string; description: string }[];
  furtherProgression?: string;
};

export type RealPathwayImportRecord = {
  kind: "pathway";
  id: string;
  aliases: PathwayAlias[];
  route: {
    stage: PathwayStage;
    courseStage: PathwayStage;
    catalogueGroup: string;
    category: string;
  };
  revision: {
    title: string;
    summary: string;
    description: string;
    publicationStatus: "draft";
    dataClassification: "real";
    verificationStatus: PathwayVerificationStatus;
    routeContent: PathwayRouteContent;
    provenance: PathwayProvenance[];
  };
  sources: PathwaySourceMetadata[];
};

export type ExistingPathwayImportRevision = {
  contentHash: string;
  revisionNumber: number;
  publicationStatus: PathwayPublicationStatus;
  dataClassification: "real" | "demo" | "test";
};

export type PathwayImportRevisionDecision =
  | { action: "insert"; revisionNumber: 1 }
  | { action: "unchanged" }
  | { action: "create_revision"; revisionNumber: number }
  | { action: "conflict"; reason: string };

export class PathwayImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathwayImportValidationError";
  }
}

const stages = new Set<PathwayStage>(["class-10", "class-12"]);
const verificationStatuses = new Set<PathwayVerificationStatus>([
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
const publicationStatuses = new Set<PathwayPublicationStatus>([
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
  "rejected",
]);
const classifications = new Set(["real", "demo", "test"]);
const sourceTypes = new Set([
  "official_api",
  "structured_government_dataset",
  "official_download",
  "official_public_web_page",
]);
const sourceStatuses = new Set(["active", "paused", "retired"]);
const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function fail(path: string, reason: string): never {
  throw new PathwayImportValidationError(`${path}: ${reason}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireObject(value: unknown, path: string): Record<string, unknown> {
  if (!isObject(value)) fail(path, "must be an object.");
  return value;
}

function assertOnlyKeys(value: Record<string, unknown>, allowed: readonly string[], path: string) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(`${path}.${key}`, "is not a supported field.");
  }
}

function requireString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") fail(path, "must be a non-empty string.");
  if (value !== value.trim()) fail(path, "must not have leading or trailing whitespace.");
}
function requireEnum<T extends string>(value: unknown, allowed: Set<T>, path: string): asserts value is T {
  if (typeof value !== "string" || !allowed.has(value as T)) {
    fail(path, `must be one of: ${[...allowed].join(", ")}.`);
  }
}

function validateHttpUrl(value: unknown, path: string) {
  requireString(value, path);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    fail(path, "must be an absolute HTTP(S) URL.");
  }
  if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password) {
    fail(path, "must be an absolute HTTP(S) URL without credentials.");
  }
}

function isValidDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  }
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}

function validateAliases(value: unknown, pathwayId: string): PathwayAlias[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail("aliases", "must include the existing canonical CareerBridge pathway identity.");
  }
  const aliases = value.map((valueAlias, index) => {
    const path = `aliases[${index}]`;
    const alias = requireObject(valueAlias, path);
    assertOnlyKeys(alias, ["sourceSystem", "externalType", "externalKey", "externalContextKey"], path);
    requireString(alias.sourceSystem, `${path}.sourceSystem`);
    requireString(alias.externalType, `${path}.externalType`);
    requireString(alias.externalKey, `${path}.externalKey`);
    if (typeof alias.externalContextKey !== "string") fail(`${path}.externalContextKey`, "must be a string.");
    if (alias.externalType !== "pathway") fail(`${path}.externalType`, 'must be "pathway".');
    if (alias.externalContextKey !== "") fail(`${path}.externalContextKey`, "pathway aliases must use an empty context.");
    return alias as unknown as PathwayAlias;
  });
  const tuples = new Set<string>();
  for (const alias of aliases) {
    const tuple = JSON.stringify([alias.sourceSystem, alias.externalType, alias.externalKey, alias.externalContextKey]);
    if (tuples.has(tuple)) fail("aliases", "contains a duplicate alias tuple.");
    tuples.add(tuple);
    if (alias.sourceSystem === "careerbridge" && alias.externalKey !== pathwayId) {
      fail("aliases", "conflicting CareerBridge pathway aliases must resolve to the supplied pathway ID.");
    }
  }
  if (!aliases.some((alias) => alias.sourceSystem === "careerbridge" && alias.externalKey === pathwayId)) {
    fail("aliases", "must retain the existing context-free CareerBridge pathway alias.");
  }
  return aliases;
}

function validateSource(value: unknown, path: string): PathwaySourceMetadata {
  const source = requireObject(value, path);
  assertOnlyKeys(source, [
    "sourceKey", "sourceName", "authority", "canonicalUrl", "normalizedUrl", "category",
    "sourceType", "dataTypes", "termsNotes", "expectedUpdateBehavior", "status",
  ], path);
  requireString(source.sourceKey, `${path}.sourceKey`);
  requireString(source.sourceName, `${path}.sourceName`);
  requireString(source.authority, `${path}.authority`);
  requireString(source.category, `${path}.category`);
  validateHttpUrl(source.canonicalUrl, `${path}.canonicalUrl`);
  if (source.normalizedUrl !== undefined) validateHttpUrl(source.normalizedUrl, `${path}.normalizedUrl`);
  requireEnum(source.sourceType, sourceTypes, `${path}.sourceType`);
  requireEnum(source.status, sourceStatuses, `${path}.status`);
  if (source.dataTypes !== undefined && (!Array.isArray(source.dataTypes) || !source.dataTypes.every((item) => typeof item === "string"))) {
    fail(`${path}.dataTypes`, "must be an array of strings.");
  }
  for (const key of ["termsNotes", "expectedUpdateBehavior"] as const) {
    if (source[key] !== undefined && source[key] !== null && typeof source[key] !== "string") {
      fail(`${path}.${key}`, "must be a string or null.");
    }
  }
  if (source.normalizedUrl !== undefined && source.normalizedUrl !== source.canonicalUrl) {
    const canonical = new URL(source.canonicalUrl as string);
    const normalized = new URL(source.normalizedUrl as string);
    canonical.hash = "";
    normalized.hash = "";
    if (canonical.href !== normalized.href) fail(`${path}.normalizedUrl`, "must match the canonical source URL after URL normalization.");
  }
  return source as unknown as PathwaySourceMetadata;
}

function validateSources(value: unknown): PathwaySourceMetadata[] {
  if (!Array.isArray(value) || value.length === 0) fail("sources", "must contain at least one authoritative source.");
  const sources = value.map((source, index) => validateSource(source, `sources[${index}]`));
  const sourceKeys = new Set<string>();
  const urls = new Set<string>();
  for (const source of sources) {
    if (sourceKeys.has(source.sourceKey)) fail("sources", "contains duplicate sourceKey values.");
    sourceKeys.add(source.sourceKey);
    const url = source.normalizedUrl ?? source.canonicalUrl;
    if (urls.has(url)) fail("sources", "contains duplicate source URLs.");
    urls.add(url);
    if (source.status !== "active") fail(`sources.${source.sourceKey}.status`, "must be active for a new real pathway draft.");
  }
  return sources;
}

function validateRouteContent(value: unknown): PathwayRouteContent {
  const content = requireObject(value, "revision.routeContent");
  assertOnlyKeys(content, ["steps", "progression", "qualification", "considerations", "furtherProgression"], "revision.routeContent");
  if (!Array.isArray(content.steps) || content.steps.length < 2) fail("revision.routeContent.steps", "must contain at least two steps.");
  content.steps.forEach((step, index) => requireString(step, `revision.routeContent.steps[${index}]`));
  if (!Array.isArray(content.progression) || content.progression.length === 0) fail("revision.routeContent.progression", "must be a non-empty array.");
  content.progression.forEach((entry, index) => {
    const path = `revision.routeContent.progression[${index}]`;
    const step = requireObject(entry, path);
    assertOnlyKeys(step, ["title", "description", "nextStage"], path);
    requireString(step.title, `${path}.title`);
    requireString(step.description, `${path}.description`);
    if (step.nextStage !== undefined) requireString(step.nextStage, `${path}.nextStage`);
  });
  const qualification = requireObject(content.qualification, "revision.routeContent.qualification");
  assertOnlyKeys(qualification, ["title", "description"], "revision.routeContent.qualification");
  requireString(qualification.title, "revision.routeContent.qualification.title");
  requireString(qualification.description, "revision.routeContent.qualification.description");
  if (!Array.isArray(content.considerations) || content.considerations.length === 0) fail("revision.routeContent.considerations", "must be a non-empty array.");
  content.considerations.forEach((entry, index) => {
    const path = `revision.routeContent.considerations[${index}]`;
    const consideration = requireObject(entry, path);
    assertOnlyKeys(consideration, ["title", "description"], path);
    requireString(consideration.title, `${path}.title`);
    requireString(consideration.description, `${path}.description`);
  });
  if (content.furtherProgression !== undefined) requireString(content.furtherProgression, "revision.routeContent.furtherProgression");
  return content as unknown as PathwayRouteContent;
}

function requiredClaimKeys(record: Pick<RealPathwayImportRecord, "route" | "revision">): string[] {
  const keys = [
    "pathway.title", "pathway.summary", "pathway.description", "pathway.stage",
    "pathway.course_stage", "pathway.catalogue_group", "pathway.category",
    "pathway.steps", "pathway.progression", "pathway.qualification", "pathway.considerations",
  ];
  if (record.revision.routeContent.furtherProgression !== undefined) keys.push("pathway.further_progression");
  return keys;
}

function validateProvenance(value: unknown, sources: PathwaySourceMetadata[]): PathwayProvenance[] {
  if (!Array.isArray(value) || value.length === 0) fail("revision.provenance", "must contain claim-level evidence.");
  const provenance = value.map((entryValue, index) => {
    const path = `revision.provenance[${index}]`;
    const entry = requireObject(entryValue, path);
    assertOnlyKeys(entry, ["claimKey", "sourceKey", "sourceId", "sourceUrl", "checkedAt", "verifiedAt", "verificationStatus"], path);
    requireString(entry.claimKey, `${path}.claimKey`);
    if (entry.sourceKey !== undefined) {
      requireString(entry.sourceKey, `${path}.sourceKey`);
      const source = sources.find((candidate) => candidate.sourceKey === entry.sourceKey);
      if (!source) fail(`${path}.sourceKey`, "must reference an entry in record.sources.");
      if (entry.sourceUrl !== undefined && entry.sourceUrl !== null) {
        validateHttpUrl(entry.sourceUrl, `${path}.sourceUrl`);
        if (![source.canonicalUrl, source.normalizedUrl].includes(entry.sourceUrl as string)) {
          fail(`${path}.sourceUrl`, "must match the referenced source URL.");
        }
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
      const date = entry[key];
      if (date !== undefined && date !== null) {
        requireString(date, `${path}.${key}`);
        if (!isValidDate(date)) fail(`${path}.${key}`, "must be a valid ISO date or timestamp.");
      }
    }
    requireEnum(entry.verificationStatus, verificationStatuses, `${path}.verificationStatus`);
    if (entry.verificationStatus === "verified") {
      if (typeof entry.sourceUrl !== "string") fail(`${path}.sourceUrl`, "is required for verified evidence.");
      if (typeof entry.checkedAt !== "string" || typeof entry.verifiedAt !== "string") {
        fail(path, "verified evidence requires checkedAt and verifiedAt dates.");
      }
    } else if (entry.verifiedAt !== undefined && entry.verifiedAt !== null) {
      fail(`${path}.verifiedAt`, "cannot be set when verificationStatus is not verified.");
    }
    return entry as unknown as PathwayProvenance;
  });
  const tuples = new Set<string>();
  for (const entry of provenance) {
    const identity = entry.sourceKey ?? entry.sourceId ?? entry.sourceUrl;
    const tuple = JSON.stringify([entry.claimKey, identity]);
    if (tuples.has(tuple)) fail("revision.provenance", "contains duplicate claim/source evidence.");
    tuples.add(tuple);
  }
  return provenance;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.keys(value).sort().reduce<Record<string, unknown>>((result, key) => {
    if (value[key] !== undefined) result[key] = canonicalize(value[key]);
    return result;
  }, {});
}

export function canonicalizePathwayImportValue(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function validateRealPathwayImportRecord(value: unknown): asserts value is RealPathwayImportRecord {
  const record = requireObject(value, "record");
  assertOnlyKeys(record, ["kind", "id", "aliases", "route", "revision", "sources"], "record");
  if (record.kind !== "pathway") fail("record.kind", 'must be "pathway".');
  requireString(record.id, "record.id");
  validateAliases(record.aliases, record.id);

  const route = requireObject(record.route, "route");
  assertOnlyKeys(route, ["stage", "courseStage", "catalogueGroup", "category"], "route");
  requireEnum(route.stage, stages, "route.stage");
  requireEnum(route.courseStage, stages, "route.courseStage");
  requireString(route.catalogueGroup, "route.catalogueGroup");
  requireString(route.category, "route.category");

  const sources = validateSources(record.sources);
  const revision = requireObject(record.revision, "revision");
  assertOnlyKeys(revision, ["title", "summary", "description", "publicationStatus", "dataClassification", "verificationStatus", "routeContent", "provenance"], "revision");
  requireString(revision.title, "revision.title");
  requireString(revision.summary, "revision.summary");
  requireString(revision.description, "revision.description");
  if (revision.publicationStatus !== "draft") fail("revision.publicationStatus", "imports may only create draft revisions; review and publication are separate.");
  if (revision.dataClassification !== "real") fail("revision.dataClassification", "must be real.");
  requireEnum(revision.verificationStatus, verificationStatuses, "revision.verificationStatus");
  const routeContent = validateRouteContent(revision.routeContent);
  const provenance = validateProvenance(revision.provenance, sources);
  const needed = requiredClaimKeys({ route: route as RealPathwayImportRecord["route"], revision: { ...revision, routeContent } as RealPathwayImportRecord["revision"] });
  for (const claimKey of needed) {
    const evidence = provenance.filter((entry) => entry.claimKey === claimKey);
    if (evidence.length === 0) fail("revision.provenance", `claim "${claimKey}" requires claim-level evidence.`);
    if (revision.verificationStatus === "verified" && !evidence.some((entry) => entry.verificationStatus === "verified")) {
      fail("revision.verificationStatus", `verified revisions require verified evidence for "${claimKey}".`);
    }
  }
}

export function hashRealPathwayImportRecord(value: unknown): string {
  validateRealPathwayImportRecord(value);
  const record = value as RealPathwayImportRecord;
  const sourceIdentity = (entry: PathwayProvenance) => {
    if (entry.sourceUrl) return { sourceUrl: entry.sourceUrl };
    if (entry.sourceId) return { sourceId: entry.sourceId };
    const source = record.sources.find((candidate) => candidate.sourceKey === entry.sourceKey);
    return source ? { sourceUrl: source.normalizedUrl ?? source.canonicalUrl } : { sourceKey: entry.sourceKey };
  };
  const fingerprint = {
    kind: record.kind,
    id: record.id,
    aliases: record.aliases,
    route: record.route,
    revision: {
      title: record.revision.title,
      summary: record.revision.summary,
      description: record.revision.description,
      verificationStatus: record.revision.verificationStatus,
      routeContent: record.revision.routeContent,
      provenance: record.revision.provenance.map((entry) => ({
        claimKey: entry.claimKey,
        ...sourceIdentity(entry),
        ...(entry.checkedAt === undefined ? {} : { checkedAt: entry.checkedAt }),
        ...(entry.verifiedAt === undefined ? {} : { verifiedAt: entry.verifiedAt }),
        verificationStatus: entry.verificationStatus,
      })).sort((left, right) => canonicalizePathwayImportValue(left).localeCompare(canonicalizePathwayImportValue(right))),
    },
  };
  return createHash("sha256").update(canonicalizePathwayImportValue(fingerprint)).digest("hex");
}

export function decidePathwayImportRevision(
  contentHash: string,
  existing?: ExistingPathwayImportRevision | null,
): PathwayImportRevisionDecision {
  if (!/^[0-9a-f]{64}$/.test(contentHash)) fail("contentHash", "must be a lowercase SHA-256 hex digest.");
  if (!existing) return { action: "insert", revisionNumber: 1 };
  requireEnum(existing.publicationStatus, publicationStatuses, "existing.publicationStatus");
  requireEnum(existing.dataClassification, classifications, "existing.dataClassification");
  if (!Number.isInteger(existing.revisionNumber) || existing.revisionNumber < 1) fail("existing.revisionNumber", "must be a positive integer.");
  if (existing.dataClassification !== "real") {
    return { action: "conflict", reason: "Existing demo or test content cannot be converted or bypassed." };
  }
  if (existing.contentHash === contentHash) return { action: "unchanged" };
  if (["draft", "in_review", "approved"].includes(existing.publicationStatus)) {
    return { action: "conflict", reason: "A non-published revision exists with different content; resolve it before importing again." };
  }
  if (["published", "archived", "rejected"].includes(existing.publicationStatus)) {
    return { action: "create_revision", revisionNumber: existing.revisionNumber + 1 };
  }
  fail("existing.publicationStatus", "unsupported lifecycle status for Pathways revision decisions.");
}
