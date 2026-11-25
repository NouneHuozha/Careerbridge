import { createHash } from "node:crypto";

export type CourseClassification = "real" | "demo" | "test";
export type CoursePublicationStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived"
  | "rejected";
export type CourseVerificationStatus =
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

export type CourseAlias = {
  sourceSystem: string;
  externalType: string;
  externalKey: string;
  externalContextKey: string;
};

export type CourseFieldDependency = {
  id: string;
  catalogItemId: string;
  revisionId: string;
  itemType: "field";
  publicationStatus: "published";
  dataClassification: "real";
};

export type CourseSourceMetadata = {
  sourceKey: string;
  sourceName: string;
  authority?: string | null;
  canonicalUrl?: string | null;
  normalizedUrl?: string | null;
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

export type CourseProvenance = {
  claimKey: string;
  sourceKey?: string;
  sourceId?: string | null;
  sourceUrl?: string | null;
  checkedAt?: string | null;
  verifiedAt?: string | null;
  verificationStatus: CourseVerificationStatus;
};

export type RealCourseImportRecord = {
  kind: "course";
  id: string;
  aliases: CourseAlias[];
  field: CourseFieldDependency;
  revision: {
    title: string;
    summary: string;
    description: string;
    publicationStatus: "draft";
    dataClassification: "real";
    verificationStatus: CourseVerificationStatus;
    qualification:
      | "Higher secondary"
      | "Degree"
      | "Diploma"
      | "Certificate"
      | "Vocational"
      | "Professional"
      | "Skill training";
    stages: ("class-10" | "class-12")[];
    entryAfterClass10: string;
    entryAfterClass12: string;
    isExplorationCategory: boolean;
    courseContent: Record<string, unknown>;
    provenance?: CourseProvenance[];
  };
  sources?: CourseSourceMetadata[];
};

export type ExistingCourseImportRevision = {
  contentHash: string;
  revisionNumber: number;
  publicationStatus: CoursePublicationStatus;
  dataClassification: CourseClassification;
};

export const courseSensitiveClaimKeys = [
  "course.admission",
  "course.entry_after_class10",
  "course.entry_after_class12",
  "course.eligibility",
  "course.recognition",
  "course.qualification",
  "course.entrance_exam",
  "course.admission_url",
  "course.fees",
  "course.financial_support",
  "course.scholarships",
] as const;

export type CourseImportRevisionDecision =
  | { action: "insert"; revisionNumber: 1 }
  | { action: "unchanged" }
  | { action: "create_revision"; revisionNumber: number }
  | { action: "conflict"; reason: string };

export class CourseImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourseImportValidationError";
  }
}

const qualifications = new Set([
  "Higher secondary",
  "Degree",
  "Diploma",
  "Certificate",
  "Vocational",
  "Professional",
  "Skill training",
]);
const stages = new Set(["class-10", "class-12"]);
const verificationStatuses = new Set<CourseVerificationStatus>([
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
const publicationStatuses = new Set<CoursePublicationStatus>([
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
  "rejected",
]);
const classifications = new Set<CourseClassification>(["real", "demo", "test"]);
const sourceTypes = new Set([
  "official_api",
  "structured_government_dataset",
  "official_download",
  "official_public_web_page",
  "admin_manual_entry",
]);
const sourceStatuses = new Set(["active", "paused", "retired"]);
const uuidPattern =
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function fail(path: string, reason: string): never {
  throw new CourseImportValidationError(`${path}: ${reason}`);
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
  if (typeof value !== "string" || value.trim() === "") {
    fail(path, "must be a non-empty string.");
  }
  if (value !== value.trim()) {
    fail(path, "must not have leading or trailing whitespace.");
  }
}

function requireNullableString(value: unknown, path: string) {
  if (value !== null && typeof value !== "string") {
    fail(path, "must be a string or null.");
  }
}

function requireStringAllowEmpty(value: unknown, path: string) {
  if (typeof value !== "string") {
    fail(path, "must be a string.");
  }
  if (value !== value.trim()) {
    fail(path, "must not have leading or trailing whitespace.");
  }
}

function requireUuid(value: unknown, path: string) {
  requireString(value, path);
  if (!uuidPattern.test(value)) fail(path, "must be a UUID.");
}

function requireEnum<T extends string>(
  value: unknown,
  allowed: Set<T>,
  path: string,
): asserts value is T {
  if (typeof value !== "string" || !allowed.has(value as T)) {
    fail(path, `must be one of: ${[...allowed].join(", ")}.`);
  }
}

function isValidDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function assertJsonValue(value: unknown, path: string, ancestors = new Set<object>()) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) fail(path, "must not contain a circular reference.");
    ancestors.add(value);
    value.forEach((entry, index) => assertJsonValue(entry, `${path}[${index}]`, ancestors));
    ancestors.delete(value);
    return;
  }
  if (!isObject(value)) fail(path, "must contain only JSON-compatible values.");
  if (ancestors.has(value)) fail(path, "must not contain a circular reference.");
  ancestors.add(value);
  for (const [key, entry] of Object.entries(value)) {
    assertJsonValue(entry, `${path}.${key}`, ancestors);
  }
  ancestors.delete(value);
}

function validateAliases(value: unknown, courseId: string): CourseAlias[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail("aliases", "must include at least one existing alias; identities are not created by validation.");
  }
  const aliases = value.map((valueAlias, index) => {
    const path = `aliases[${index}]`;
    const alias = requireObject(valueAlias, path);
    assertOnlyKeys(alias, ["sourceSystem", "externalType", "externalKey", "externalContextKey"], path);
    requireString(alias.sourceSystem, `${path}.sourceSystem`);
    requireString(alias.externalType, `${path}.externalType`);
    requireString(alias.externalKey, `${path}.externalKey`);
    if (typeof alias.externalContextKey !== "string") {
      fail(`${path}.externalContextKey`, "must be a string.");
    }
    if (alias.externalType !== "course") {
      fail(`${path}.externalType`, 'must be "course".');
    }
    if (alias.externalContextKey !== "") {
      fail(`${path}.externalContextKey`, "course aliases must use an empty context.");
    }
    return alias as unknown as CourseAlias;
  });

  const keys = new Set<string>();
  for (const alias of aliases) {
    const tuple = JSON.stringify([
      alias.sourceSystem,
      alias.externalType,
      alias.externalKey,
      alias.externalContextKey,
    ]);
    if (keys.has(tuple)) fail("aliases", "contains a duplicate alias tuple.");
    keys.add(tuple);
  }

  for (const alias of aliases) {
    if (
      alias.sourceSystem === "careerbridge" &&
      alias.externalType === "course" &&
      alias.externalKey !== courseId
    ) {
      fail("aliases", "conflicting CareerBridge course aliases must resolve to the supplied course ID.");
    }
  }

  if (
    !aliases.some(
      (alias) =>
        alias.sourceSystem === "careerbridge" &&
        alias.externalType === "course" &&
        alias.externalKey === courseId &&
        alias.externalContextKey === "",
    )
  ) {
    fail("aliases", "must retain the existing context-free CareerBridge course alias.");
  }
  return aliases;
}

function snakeCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function validateFieldDependency(value: unknown): CourseFieldDependency {
  const field = requireObject(value, "field");
  assertOnlyKeys(
    field,
    ["id", "catalogItemId", "revisionId", "itemType", "publicationStatus", "dataClassification"],
    "field",
  );
  requireString(field.id, "field.id");
  requireUuid(field.catalogItemId, "field.catalogItemId");
  requireUuid(field.revisionId, "field.revisionId");
  if (field.itemType !== "field") fail("field.itemType", 'must be "field".');
  if (field.publicationStatus !== "published") {
    fail("field.publicationStatus", "must be published for a real course.");
  }
  if (field.dataClassification !== "real") {
    fail("field.dataClassification", "must be real for a real course.");
  }
  return field as unknown as CourseFieldDependency;
}

function validateSource(value: unknown, path: string): CourseSourceMetadata {
  const source = requireObject(value, path);
  assertOnlyKeys(
    source,
    [
      "sourceKey",
      "sourceName",
      "authority",
      "canonicalUrl",
      "normalizedUrl",
      "category",
      "sourceType",
      "dataTypes",
      "termsNotes",
      "expectedUpdateBehavior",
      "status",
    ],
    path,
  );
  requireString(source.sourceKey, `${path}.sourceKey`);
  requireString(source.sourceName, `${path}.sourceName`);
  requireString(source.category, `${path}.category`);
  requireEnum(source.sourceType, sourceTypes, `${path}.sourceType`);
  requireEnum(source.status, sourceStatuses, `${path}.status`);

  if (source.authority !== undefined && source.authority !== null) {
    requireString(source.authority, `${path}.authority`);
  }
  for (const field of ["termsNotes", "expectedUpdateBehavior"] as const) {
    if (source[field] !== undefined && source[field] !== null) {
      requireNullableString(source[field], `${path}.${field}`);
    }
  }
  if (source.dataTypes !== undefined) {
    if (!Array.isArray(source.dataTypes) || !source.dataTypes.every((entry) => typeof entry === "string")) {
      fail(`${path}.dataTypes`, "must be an array of strings.");
    }
  }

  const canonicalUrl = source.canonicalUrl;
  const normalizedUrl = source.normalizedUrl;
  if (canonicalUrl !== undefined && canonicalUrl !== null) validateHttpUrl(canonicalUrl, `${path}.canonicalUrl`);
  if (normalizedUrl !== undefined && normalizedUrl !== null) validateHttpUrl(normalizedUrl, `${path}.normalizedUrl`);
  if ((canonicalUrl == null) !== (normalizedUrl == null)) {
    fail(path, "canonicalUrl and normalizedUrl must either both be supplied or both be null.");
  }
  return source as unknown as CourseSourceMetadata;
}

function validateSources(value: unknown): CourseSourceMetadata[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail("sources", "must be an array when provided.");
  const sources = value.map((source, index) => validateSource(source, `sources[${index}]`));
  const keys = new Set<string>();
  for (const source of sources) {
    if (keys.has(source.sourceKey)) fail("sources", "contains duplicate sourceKey values.");
    keys.add(source.sourceKey);
  }
  return sources;
}

function validateHttpUrl(value: unknown, path: string) {
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

function validateProvenance(
  value: unknown,
  sources: CourseSourceMetadata[],
): CourseProvenance[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail("revision.provenance", "must be an array when provided.");
  return value.map((entryValue, index) => {
    const path = `revision.provenance[${index}]`;
    const entry = requireObject(entryValue, path);
    assertOnlyKeys(
      entry,
      ["claimKey", "sourceKey", "sourceId", "sourceUrl", "checkedAt", "verifiedAt", "verificationStatus"],
      path,
    );
    requireString(entry.claimKey, `${path}.claimKey`);
    if (entry.sourceKey !== undefined) {
      requireString(entry.sourceKey, `${path}.sourceKey`);
      const source = sources.find((candidate) => candidate.sourceKey === entry.sourceKey);
      if (!source) {
        fail(`${path}.sourceKey`, "must reference an entry in record.sources.");
      }
      if (typeof entry.sourceUrl === "string") {
        const sourceUrls = [source.canonicalUrl, source.normalizedUrl].filter(
          (url): url is string => typeof url === "string",
        );
        if (sourceUrls.length > 0 && !sourceUrls.includes(entry.sourceUrl)) {
          fail(`${path}.sourceUrl`, "must match the referenced source canonicalUrl or normalizedUrl.");
        }
      }
    }
    if (entry.sourceId !== undefined && entry.sourceId !== null) {
      requireUuid(entry.sourceId, `${path}.sourceId`);
    }
    if (entry.sourceUrl !== undefined && entry.sourceUrl !== null) {
      validateHttpUrl(entry.sourceUrl, `${path}.sourceUrl`);
    }
    for (const field of ["checkedAt", "verifiedAt"] as const) {
      if (entry[field] !== undefined && entry[field] !== null) {
        requireString(entry[field], `${path}.${field}`);
        if (!isValidDate(entry[field])) {
          fail(`${path}.${field}`, "must be a valid ISO date or timestamp.");
        }
      }
    }
    requireEnum(entry.verificationStatus, verificationStatuses, `${path}.verificationStatus`);
    if (entry.verificationStatus === "verified") {
      if (typeof entry.sourceUrl !== "string") {
        fail(`${path}.sourceUrl`, "is required for verified evidence.");
      }
      if (typeof entry.checkedAt !== "string" || typeof entry.verifiedAt !== "string") {
        fail(path, "verified evidence requires supplied checkedAt and verifiedAt dates.");
      }
    }
    if (entry.sourceId == null && entry.sourceUrl == null && entry.sourceKey == null) {
      fail(path, "must identify a source URL, existing source ID, or sourceKey.");
    }
    if (
      entry.verificationStatus !== "verified" &&
      entry.verifiedAt !== undefined &&
      entry.verifiedAt !== null
    ) {
      fail(`${path}.verifiedAt`, "cannot be set when verificationStatus is not verified.");
    }
    return entry as unknown as CourseProvenance;
  });
}

function validateLearningAreas(value: unknown, path: string) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(path, "must be a non-empty array.");
  }
  value.forEach((entry, index) => {
    const area = requireObject(entry, `${path}[${index}]`);
    assertOnlyKeys(area, ["title", "description"], `${path}[${index}]`);
    requireString(area.title, `${path}[${index}].title`);
    requireString(area.description, `${path}[${index}].description`);
  });
}

function collectCourseSensitiveClaimKeys(
  value: unknown,
  prefix: string,
  path = "",
): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectCourseSensitiveClaimKeys(entry, prefix, `${path}[${index}]`),
    );
  }
  if (!isObject(value)) return [];

  const claims: string[] = [];
  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = snakeCase(key);
    const currentPath = path ? `${path}.${normalizedKey}` : normalizedKey;
    const claimKey = `${prefix}.${currentPath}`;
    if (courseSensitiveClaimKeys.includes(claimKey as (typeof courseSensitiveClaimKeys)[number])) {
      claims.push(claimKey);
    }
    claims.push(...collectCourseSensitiveClaimKeys(entry, prefix, currentPath));
  }
  return claims;
}

function validateCourseSensitiveClaims(
  record: Record<string, unknown>,
  revision: Record<string, unknown>,
  provenance: CourseProvenance[],
) {
  const actionableClaims = new Set<string>(["course.qualification"]);
  const content = requireObject(revision.courseContent, "revision.courseContent");
  const nestedClaims = collectCourseSensitiveClaimKeys(content, "course");
  for (const claimKey of nestedClaims) actionableClaims.add(claimKey);
  if (typeof content.admission === "string" && content.admission.trim() !== "") {
    actionableClaims.add("course.admission");
  }

  if (typeof revision.entryAfterClass10 === "string" && revision.entryAfterClass10.trim() !== "") {
    actionableClaims.add("course.entry_after_class10");
  }
  if (typeof revision.entryAfterClass12 === "string" && revision.entryAfterClass12.trim() !== "") {
    actionableClaims.add("course.entry_after_class12");
  }

  for (const claimKey of actionableClaims) {
    const evidence = provenance.filter((entry) => entry.claimKey === claimKey);
    if (evidence.length === 0) {
      fail(`revision.provenance`, `actionable claim "${claimKey}" requires matching claim-level provenance.`);
    }
    if (revision.verificationStatus === "verified") {
      const verifiedEvidence = evidence.some(
        (entry) => entry.verificationStatus === "verified",
      );
      if (!verifiedEvidence) {
        fail(
          "revision.verificationStatus",
          `a verified revision requires verified claim-level evidence for "${claimKey}".`,
        );
      }
    }
  }

  void record;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      if (value[key] !== undefined) result[key] = canonicalize(value[key]);
      return result;
    }, {});
}

export function canonicalizeCourseImportValue(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function validateRealCourseImportRecord(
  value: unknown,
): asserts value is RealCourseImportRecord {
  const record = requireObject(value, "record");
  assertOnlyKeys(record, ["kind", "id", "aliases", "field", "revision", "sources"], "record");
  if (record.kind !== "course") fail("record.kind", 'must be "course".');
  requireString(record.id, "record.id");
  validateAliases(record.aliases, record.id);
  validateFieldDependency(record.field);
  const sources = validateSources(record.sources);

  const revision = requireObject(record.revision, "revision");
  assertOnlyKeys(
    revision,
    [
      "title",
      "summary",
      "description",
      "publicationStatus",
      "dataClassification",
      "verificationStatus",
      "qualification",
      "stages",
      "entryAfterClass10",
      "entryAfterClass12",
      "isExplorationCategory",
      "courseContent",
      "provenance",
    ],
    "revision",
  );
  requireString(revision.title, "revision.title");
  requireString(revision.summary, "revision.summary");
  requireString(revision.description, "revision.description");
  if (revision.publicationStatus !== "draft") {
    fail("revision.publicationStatus", "imports may only create draft revisions; publication is separate.");
  }
  if (revision.dataClassification !== "real") {
    fail("revision.dataClassification", "must be real.");
  }
  requireEnum(revision.verificationStatus, verificationStatuses, "revision.verificationStatus");
  requireEnum(revision.qualification, qualifications, "revision.qualification");

  if (!Array.isArray(revision.stages) || revision.stages.length === 0) {
    fail("revision.stages", "must be a non-empty array.");
  }
  revision.stages.forEach((stage, index) => {
    requireEnum(stage, stages, `revision.stages[${index}]`);
  });
  if (new Set(revision.stages).size !== revision.stages.length) {
    fail("revision.stages", "must not contain duplicate stages.");
  }

  requireStringAllowEmpty(revision.entryAfterClass10, "revision.entryAfterClass10");
  requireStringAllowEmpty(revision.entryAfterClass12, "revision.entryAfterClass12");
  if (typeof revision.isExplorationCategory !== "boolean") {
    fail("revision.isExplorationCategory", "must be a boolean.");
  }

  const content = requireObject(revision.courseContent, "revision.courseContent");
  assertJsonValue(content, "revision.courseContent");
  validateLearningAreas(content.learningAreas, "revision.courseContent.learningAreas");
  for (const field of ["simpleExplanation", "admission", "providerDescription"] as const) {
    if (Object.hasOwn(content, field) && typeof content[field] !== "string") {
      fail(`revision.courseContent.${field}`, "must be a string.");
    }
  }
  if (Object.hasOwn(content, "learningExperience")) {
    validateLearningAreas(content.learningExperience, "revision.courseContent.learningExperience");
  }
  const provenance = validateProvenance(revision.provenance, sources);
  validateCourseSensitiveClaims(record, revision, provenance);
}

export function hashRealCourseImportRecord(value: unknown): string {
  validateRealCourseImportRecord(value);
  const record = value as RealCourseImportRecord;
  const revision = record.revision;
  const sourceIdentity = (entry: CourseProvenance) => {
    if (typeof entry.sourceUrl === "string") return { sourceUrl: entry.sourceUrl };
    if (typeof entry.sourceId === "string") return { sourceId: entry.sourceId };
    if (typeof entry.sourceKey === "string") {
      const source = (record.sources ?? []).find(
        (candidate) => candidate.sourceKey === entry.sourceKey,
      );
      const inferredUrl =
        source?.normalizedUrl ?? source?.canonicalUrl ?? null;
      if (typeof inferredUrl === "string") return { sourceUrl: inferredUrl };
      return { sourceKey: entry.sourceKey };
    }
    return {};
  };
  const fingerprint = {
    kind: record.kind,
    id: record.id,
    aliases: record.aliases,
    field: record.field,
    revision: {
      title: revision.title,
      summary: revision.summary,
      description: revision.description,
      verificationStatus: revision.verificationStatus,
      qualification: revision.qualification,
      stages: revision.stages,
      entryAfterClass10: revision.entryAfterClass10,
      entryAfterClass12: revision.entryAfterClass12,
      isExplorationCategory: revision.isExplorationCategory,
      courseContent: revision.courseContent,
      provenance: (revision.provenance ?? [])
        .map(({
          claimKey,
          sourceKey,
          sourceId,
          sourceUrl,
          checkedAt,
          verifiedAt,
          verificationStatus,
        }) => ({
          claimKey,
          ...sourceIdentity({
            claimKey,
            sourceKey,
            sourceId,
            sourceUrl,
            checkedAt,
            verifiedAt,
            verificationStatus,
          }),
          ...(checkedAt === undefined ? {} : { checkedAt }),
          ...(verifiedAt === undefined ? {} : { verifiedAt }),
          verificationStatus,
        }))
        .sort((left, right) => canonicalizeCourseImportValue(left).localeCompare(canonicalizeCourseImportValue(right))),
    },
  };
  return createHash("sha256").update(canonicalizeCourseImportValue(fingerprint)).digest("hex");
}

export function decideCourseImportRevision(
  contentHash: string,
  existing?: ExistingCourseImportRevision | null,
): CourseImportRevisionDecision {
  if (!/^[0-9a-f]{64}$/.test(contentHash)) {
    fail("contentHash", "must be a lowercase SHA-256 hex digest.");
  }
  if (!existing) return { action: "insert", revisionNumber: 1 };
  requireEnum(existing.publicationStatus, publicationStatuses, "existing.publicationStatus");
  requireEnum(existing.dataClassification, classifications, "existing.dataClassification");
  if (!Number.isInteger(existing.revisionNumber) || existing.revisionNumber < 1) {
    fail("existing.revisionNumber", "must be a positive integer.");
  }
  if (existing.dataClassification !== "real") {
    return {
      action: "conflict",
      reason: "Existing content is not real; converting demo or test revisions is prohibited.",
    };
  }
  if (existing.contentHash === contentHash) return { action: "unchanged" };
  if (["draft", "in_review", "approved"].includes(existing.publicationStatus)) {
    return {
      action: "conflict",
      reason: "A non-published revision exists with different content; resolve it before importing again.",
    };
  }
  if (["published", "archived", "rejected"].includes(existing.publicationStatus)) {
    return {
      action: "create_revision",
      revisionNumber: existing.revisionNumber + 1,
    };
  }
  fail(
    "existing.publicationStatus",
    "unsupported lifecycle status for course revision decisions.",
  );
}
