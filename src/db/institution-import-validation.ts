import { createHash } from "node:crypto";

export type CatalogClassification = "real" | "demo" | "test";
export type CatalogPublicationStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived"
  | "rejected";
export type CatalogVerificationStatus =
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

export type ImportAlias = {
  sourceSystem: string;
  externalType: string;
  externalKey: string;
  externalContextKey: string;
};

export type ImportProvenance = {
  claimKey: string;
  sourceKey?: string;
  sourceId?: string | null;
  sourceUrl?: string | null;
  checkedAt?: string | null;
  verifiedAt?: string | null;
  verificationStatus: CatalogVerificationStatus;
};

export type ImportSource = {
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
  status?: "active" | "paused" | "retired";
};

type ImportRevision<TContent> = {
  title: string;
  summary?: string | null;
  description?: string | null;
  publicationStatus: "draft";
  dataClassification: CatalogClassification;
  verificationStatus: CatalogVerificationStatus;
  content: TContent;
  provenance?: ImportProvenance[];
};

export type InstitutionImportRecord = {
  kind: "institution";
  id: string;
  aliases: ImportAlias[];
  sources?: ImportSource[];
  revision: ImportRevision<Record<string, unknown>> & {
    slug: string;
    initials: string;
    institutionType: "College" | "University" | "Institute" | "School" | "Training centre";
    ownership?: "Government" | "Private" | "Public" | null;
    content: Record<string, unknown>;
  };
};

export type InstitutionDependency = {
  id: string;
  catalogItemId: string;
  itemType: "institution";
  publicationStatus: CatalogPublicationStatus;
  dataClassification: CatalogClassification;
};

export type CampusImportRecord = {
  kind: "campus";
  id: string;
  aliases: ImportAlias[];
  sources?: ImportSource[];
  institution: InstitutionDependency;
  revision: ImportRevision<Record<string, unknown>> & {
    stateId?: string | null;
    content: Record<string, unknown>;
  };
};

export type CampusDependency = {
  id: string;
  catalogItemId: string;
  revisionId: string;
  itemType: "campus";
  institution: InstitutionDependency;
  publicationStatus: CatalogPublicationStatus;
  dataClassification: CatalogClassification;
};

export type CourseDependency = {
  id: string;
  catalogItemId: string;
  revisionId: string;
  itemType: "course";
  publicationStatus: CatalogPublicationStatus;
  dataClassification: CatalogClassification;
};

export type CourseOfferingImportRecord = {
  kind: "course_offering";
  id: string;
  institutionId: string;
  aliases: ImportAlias[];
  sources?: ImportSource[];
  campus: CampusDependency;
  course: CourseDependency;
  revision: ImportRevision<Record<string, unknown>> & {
    slug: string;
    details: Record<string, unknown>;
  };
};

export type InstitutionCatalogImportRecord =
  | InstitutionImportRecord
  | CampusImportRecord
  | CourseOfferingImportRecord;

const classifications = new Set<CatalogClassification>(["real", "demo", "test"]);
const publicationStatuses = new Set<CatalogPublicationStatus>([
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
  "rejected",
]);
const verificationStatuses = new Set<CatalogVerificationStatus>([
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
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const stableIdPattern = /^[a-z0-9][a-z0-9._-]{0,179}$/;
const sensitiveClaimKeys = new Set([
  "admission",
  "admissions",
  "admission_process",
  "admission_url",
  "eligibility",
  "entrance_exam",
  "fee",
  "fees",
  "financial",
  "financial_support",
  "scholarship",
  "scholarships",
]);

export class InstitutionImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstitutionImportValidationError";
  }
}

function fail(path: string, reason: string): never {
  throw new InstitutionImportValidationError(`${path}: ${reason}`);
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

function assertOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(`${path}.${key}`, "is not a supported field.");
  }
}

function requireString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    fail(path, "must be a non-empty string.");
  }
  if (value !== value.trim()) {
    fail(path, "must not have leading or trailing whitespace; identifiers are not normalized.");
  }
}

function requireStableId(value: unknown, path: string): asserts value is string {
  requireString(value, path);
  if (!stableIdPattern.test(value)) {
    fail(path, "must be a lowercase stable catalogue ID of at most 180 characters.");
  }
}

function requireUuid(value: unknown, path: string) {
  requireString(value, path);
  if (!uuidPattern.test(value)) fail(path, "must be a UUID.");
}

function requireNullableString(value: unknown, path: string) {
  if (value !== null && typeof value !== "string") {
    fail(path, "must be a string or null when provided.");
  }
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

function validateAlias(aliasValue: unknown, path: string): ImportAlias {
  const alias = requireObject(aliasValue, path);
  assertOnlyKeys(
    alias,
    ["sourceSystem", "externalType", "externalKey", "externalContextKey"],
    path,
  );
  requireString(alias.sourceSystem, `${path}.sourceSystem`);
  requireString(alias.externalType, `${path}.externalType`);
  requireString(alias.externalKey, `${path}.externalKey`);
  if (
    typeof alias.externalContextKey !== "string" ||
    alias.externalContextKey !== alias.externalContextKey.trim()
  ) {
    fail(`${path}.externalContextKey`, "must be a trimmed string.");
  }
  return alias as ImportAlias;
}

function validateAliases(
  value: unknown,
  kind: InstitutionCatalogImportRecord["kind"],
  externalKey: string,
  courseId?: string,
  legacyExternalKey?: string,
) {
  if (!Array.isArray(value) || value.length === 0) {
    fail("aliases", "must include at least one canonical alias.");
  }
  const aliases = value.map((alias, index) => validateAlias(alias, `aliases[${index}]`));
  const keys = new Set<string>();
  for (const alias of aliases) {
    const expectedType =
      kind === "course_offering" ? "institution-offering" : kind;
    if (alias.externalType !== expectedType) {
      fail("aliases", `all aliases for ${kind} records must use externalType "${expectedType}".`);
    }
    if (kind !== "course_offering" && alias.externalContextKey !== "") {
      fail("aliases", "only institution-offering aliases may have an external context key.");
    }
    const key = JSON.stringify([
      alias.sourceSystem,
      alias.externalType,
      alias.externalKey,
      alias.externalContextKey,
    ]);
    if (keys.has(key)) fail("aliases", "contains a duplicate alias tuple.");
    keys.add(key);
  }

  if (kind === "institution") {
    if (
      !aliases.some(
        (alias) =>
          alias.sourceSystem === "careerbridge" &&
          alias.externalType === "institution" &&
          alias.externalKey === externalKey &&
          alias.externalContextKey === "",
      )
    ) {
      fail("aliases", "must retain the existing CareerBridge institution alias tuple.");
    }
  } else if (kind === "campus") {
    if (
      !aliases.some(
        (alias) =>
          alias.sourceSystem === "careerbridge" &&
          alias.externalType === "campus" &&
          alias.externalKey === externalKey &&
          alias.externalContextKey === "",
      )
    ) {
      fail("aliases", "must include the canonical context-free CareerBridge campus alias.");
    }
  } else {
    for (const alias of aliases) {
      if (alias.externalContextKey !== "" && alias.externalContextKey !== courseId) {
        fail("aliases", "offering context must match the offering's canonical course ID.");
      }
    }
    if (
      !aliases.some(
        (alias) =>
          alias.sourceSystem === "careerbridge" &&
          alias.externalType === "institution-offering" &&
          alias.externalKey === externalKey &&
          alias.externalContextKey === courseId,
      )
    ) {
      fail("aliases", "must include a canonical offering alias keyed by offering ID and its course ID.");
    }
    for (const alias of aliases) {
      if (
        alias.sourceSystem === "careerbridge" &&
        alias.externalType === "institution-offering" &&
        !(
          (alias.externalKey === externalKey && alias.externalContextKey === courseId) ||
          (alias.externalKey === legacyExternalKey &&
            (alias.externalContextKey === "" || alias.externalContextKey === courseId))
        )
      ) {
        fail("aliases", "offering context must match its canonical course ID; legacy institution aliases are preserved.");
      }
    }
  }
}

function validateSourceMetadata(value: unknown) {
  if (value === undefined) return;
  if (!Array.isArray(value)) fail("sources", "must be an array when provided.");
  const keys = new Set<string>();
  for (const [index, sourceValue] of value.entries()) {
    const path = `sources[${index}]`;
    const source = requireObject(sourceValue, path);
    assertOnlyKeys(
      source,
      [
        "sourceKey",
        "sourceName",
        "authority",
        "canonicalUrl",
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
    requireString(source.canonicalUrl, `${path}.canonicalUrl`);
    requireString(source.category, `${path}.category`);
    requireEnum(source.sourceType, new Set([
      "official_api",
      "structured_government_dataset",
      "official_download",
      "official_public_web_page",
      "admin_manual_entry",
    ]), `${path}.sourceType`);
    if (source.authority !== undefined && source.authority !== null) {
      requireString(source.authority, `${path}.authority`);
    }
    if (source.dataTypes !== undefined &&
        (!Array.isArray(source.dataTypes) || !source.dataTypes.every((entry) => typeof entry === "string"))) {
      fail(`${path}.dataTypes`, "must be an array of strings.");
    }
    for (const key of ["termsNotes", "expectedUpdateBehavior"] as const) {
      if (source[key] !== undefined && source[key] !== null && typeof source[key] !== "string") {
        fail(`${path}.${key}`, "must be a string or null.");
      }
    }
    if (source.status !== undefined) {
      requireEnum(source.status, new Set(["active", "paused", "retired"]), `${path}.status`);
    }
    let url: URL;
    try {
      url = new URL(source.canonicalUrl);
    } catch {
      fail(`${path}.canonicalUrl`, "must be an absolute HTTP(S) URL.");
    }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      fail(`${path}.canonicalUrl`, "must be an absolute HTTP(S) URL without credentials.");
    }
    if (keys.has(source.sourceKey)) fail(`${path}.sourceKey`, "must be unique.");
    keys.add(source.sourceKey);
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
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    Number.isFinite(Date.parse(value))
  );
}

function validateProvenance(value: unknown, path: string): ImportProvenance[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(path, "must be an array when provided.");
  return value.map((entryValue, index) => {
    const entryPath = `${path}[${index}]`;
    const entry = requireObject(entryValue, entryPath);
    assertOnlyKeys(
      entry,
      ["claimKey", "sourceKey", "sourceId", "sourceUrl", "checkedAt", "verifiedAt", "verificationStatus"],
      entryPath,
    );
    requireString(entry.claimKey, `${entryPath}.claimKey`);
    if (entry.sourceKey !== undefined) requireString(entry.sourceKey, `${entryPath}.sourceKey`);
    if (entry.sourceId !== undefined && entry.sourceId !== null) {
      requireUuid(entry.sourceId, `${entryPath}.sourceId`);
    }
    if (entry.sourceUrl !== undefined && entry.sourceUrl !== null) {
      requireString(entry.sourceUrl, `${entryPath}.sourceUrl`);
      let url: URL;
      try {
        url = new URL(entry.sourceUrl);
      } catch {
        fail(`${entryPath}.sourceUrl`, "must be an absolute HTTP(S) URL.");
      }
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
        fail(`${entryPath}.sourceUrl`, "must be an absolute HTTP(S) URL without credentials.");
      }
    }
    for (const dateField of ["checkedAt", "verifiedAt"] as const) {
      const dateValue = entry[dateField];
      if (dateValue !== undefined && dateValue !== null) {
        requireString(dateValue, `${entryPath}.${dateField}`);
        if (!isValidDate(dateValue)) {
          fail(`${entryPath}.${dateField}`, "must be a valid ISO date or timestamp.");
        }
      }
    }
    requireEnum(entry.verificationStatus, verificationStatuses, `${entryPath}.verificationStatus`);
    if (entry.sourceId == null && entry.sourceUrl == null && entry.sourceKey == null) {
      fail(entryPath, "must identify a source URL or existing source ID.");
    }
    if (entry.verificationStatus === "verified") {
      if (typeof entry.sourceUrl !== "string") {
        fail(`${entryPath}.sourceUrl`, "is required for verified evidence.");
      }
      if (typeof entry.checkedAt !== "string" || typeof entry.verifiedAt !== "string") {
        fail(entryPath, "verified evidence requires supplied checkedAt and verifiedAt dates.");
      }
    }
    if (
      entry.verificationStatus !== "verified" &&
      entry.verifiedAt !== undefined &&
      entry.verifiedAt !== null
    ) {
      fail(`${entryPath}.verifiedAt`, "cannot be set when verificationStatus is not verified.");
    }
    return entry as ImportProvenance;
  });
}

function snakeCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function collectSensitiveClaims(value: unknown, prefix: string, path = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectSensitiveClaims(entry, prefix, `${path}[${index}]`),
    );
  }
  if (!isObject(value)) return [];

  const claims: string[] = [];
  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = snakeCase(key);
    const currentPath = path ? `${path}.${normalizedKey}` : normalizedKey;
    if (sensitiveClaimKeys.has(normalizedKey)) {
      claims.push(`${prefix}.${currentPath}`);
    }
    claims.push(...collectSensitiveClaims(entry, prefix, currentPath));
  }
  return claims;
}

function validateSensitiveClaims(
  content: Record<string, unknown>,
  kind: InstitutionCatalogImportRecord["kind"],
  classification: CatalogClassification,
  verificationStatus: CatalogVerificationStatus,
  provenance: ImportProvenance[],
) {
  const prefix = kind === "course_offering" ? "offering" : kind;
  const claims = collectSensitiveClaims(content, prefix);
  for (const claimKey of claims) {
    if (classification !== "real") continue;
    const evidence = provenance.filter((entry) => entry.claimKey === claimKey);
    if (evidence.length === 0) {
      fail(`revision.content.${claimKey}`, "requires claim-level provenance before importing a real record.");
    }
    if (
      evidence.every((entry) => entry.verificationStatus !== "verified") &&
      verificationStatus === "verified"
    ) {
      fail(
        `revision.content.${claimKey}`,
        "cannot be part of a verified revision without verified claim-level evidence.",
      );
    }
  }
}

function validateRevision(
  value: unknown,
  kind: InstitutionCatalogImportRecord["kind"],
) {
  const revision = requireObject(value, "revision");
  const typeKeys =
    kind === "institution"
      ? ["slug", "initials", "institutionType", "ownership", "content"]
      : kind === "campus"
        ? ["stateId", "content"]
        : ["slug", "details"];
  assertOnlyKeys(
    revision,
    [
      "title",
      "summary",
      "description",
      "publicationStatus",
      "dataClassification",
      "verificationStatus",
      ...typeKeys,
      "provenance",
    ],
    "revision",
  );
  requireString(revision.title, "revision.title");
  for (const field of ["summary", "description"] as const) {
    if (Object.hasOwn(revision, field)) {
      if (revision[field] === undefined) fail(`revision.${field}`, "must be omitted or a string/null.");
      requireNullableString(revision[field], `revision.${field}`);
    }
  }
  if (revision.publicationStatus !== "draft") {
    fail("revision.publicationStatus", "imports may only create draft revisions; publication is a separate operation.");
  }
  requireEnum(revision.dataClassification, classifications, "revision.dataClassification");
  requireEnum(revision.verificationStatus, verificationStatuses, "revision.verificationStatus");

  const contentKey = kind === "institution" ? "content" : kind === "campus" ? "content" : "details";
  const content = requireObject(revision[contentKey], `revision.${contentKey}`);
  assertJsonValue(content, `revision.${contentKey}`);
  const provenance = validateProvenance(revision.provenance, "revision.provenance");
  validateSensitiveClaims(
    content,
    kind,
    revision.dataClassification,
    revision.verificationStatus,
    provenance,
  );

  if (kind === "campus" && Object.hasOwn(revision, "stateId")) {
    const stateId = revision.stateId;
    if (stateId !== null) requireUuid(stateId, "revision.stateId");
  }
  if (kind === "institution") {
    requireString(revision.slug, "revision.slug");
    requireString(revision.initials, "revision.initials");
    requireEnum(
      revision.institutionType,
      new Set(["College", "University", "Institute", "School", "Training centre"]),
      "revision.institutionType",
    );
    if (revision.ownership !== undefined && revision.ownership !== null) {
      requireEnum(
        revision.ownership,
        new Set(["Government", "Private", "Public"]),
        "revision.ownership",
      );
    }
  }
  if (kind === "course_offering") {
    requireString(revision.slug, "revision.slug");
  }
  return revision;
}

function validateRecordBase(value: unknown, kind: InstitutionCatalogImportRecord["kind"]) {
  const record = requireObject(value, "record");
  const allowed =
    kind === "institution"
      ? ["kind", "id", "aliases", "sources", "revision"]
      : kind === "campus"
        ? ["kind", "id", "aliases", "sources", "institution", "revision"]
        : ["kind", "id", "institutionId", "aliases", "sources", "campus", "course", "revision"];
  assertOnlyKeys(record, allowed, "record");
  if (record.kind !== kind) fail("record.kind", `must be "${kind}".`);
  requireString(record.id, "record.id");
  if (!Array.isArray(record.aliases)) fail("aliases", "must be an array.");
  validateSourceMetadata(record.sources);
  return record;
}

function validateSourceReferences(record: Record<string, unknown>) {
  const sourceKeys = new Set(
    (record.sources as ImportSource[] | undefined)?.map((source) => source.sourceKey) ?? [],
  );
  const revision = record.revision as Record<string, unknown>;
  const provenance = revision.provenance;
  if (!Array.isArray(provenance)) return;
  for (const [index, entry] of provenance.entries()) {
    if (
      isObject(entry) &&
      entry.sourceKey !== undefined &&
      !sourceKeys.has(entry.sourceKey as string)
    ) {
      fail(`revision.provenance[${index}].sourceKey`, "must reference a source in record.sources.");
    }
  }
}

function validateInstitutionDependency(value: unknown, path: string): InstitutionDependency {
  const dependency = requireObject(value, path);
  assertOnlyKeys(
    dependency,
    ["id", "catalogItemId", "itemType", "publicationStatus", "dataClassification"],
    path,
  );
  requireStableId(dependency.id, `${path}.id`);
  requireUuid(dependency.catalogItemId, `${path}.catalogItemId`);
  if (dependency.itemType !== "institution") {
    fail(`${path}.itemType`, 'must be "institution".');
  }
  requireEnum(dependency.publicationStatus, publicationStatuses, `${path}.publicationStatus`);
  requireEnum(dependency.dataClassification, classifications, `${path}.dataClassification`);
  return dependency as InstitutionDependency;
}

function validateCampusDependency(value: unknown): CampusDependency {
  const campus = requireObject(value, "record.campus");
  assertOnlyKeys(
    campus,
    [
      "id",
      "catalogItemId",
      "revisionId",
      "itemType",
      "institution",
      "publicationStatus",
      "dataClassification",
    ],
    "record.campus",
  );
  requireStableId(campus.id, "record.campus.id");
  requireUuid(campus.catalogItemId, "record.campus.catalogItemId");
  requireUuid(campus.revisionId, "record.campus.revisionId");
  if (campus.itemType !== "campus") fail("record.campus.itemType", 'must be "campus".');
  requireEnum(campus.publicationStatus, publicationStatuses, "record.campus.publicationStatus");
  requireEnum(campus.dataClassification, classifications, "record.campus.dataClassification");
  return {
    ...(campus as Omit<CampusDependency, "institution">),
    institution: validateInstitutionDependency(campus.institution, "record.campus.institution"),
  };
}

function validateCourseDependency(value: unknown): CourseDependency {
  const course = requireObject(value, "record.course");
  assertOnlyKeys(
    course,
    ["id", "catalogItemId", "revisionId", "itemType", "publicationStatus", "dataClassification"],
    "record.course",
  );
  requireStableId(course.id, "record.course.id");
  requireUuid(course.catalogItemId, "record.course.catalogItemId");
  requireUuid(course.revisionId, "record.course.revisionId");
  if (course.itemType !== "course") fail("record.course.itemType", 'must be "course".');
  requireEnum(course.publicationStatus, publicationStatuses, "record.course.publicationStatus");
  requireEnum(course.dataClassification, classifications, "record.course.dataClassification");
  return course as CourseDependency;
}

export function validateInstitutionImportRecord(
  value: unknown,
): asserts value is InstitutionImportRecord {
  const record = validateRecordBase(value, "institution");
  const id = record.id;
  requireStableId(id, "record.id");
  validateAliases(record.aliases, "institution", id);
  const revision = validateRevision(record.revision, "institution");
  validateSourceReferences(record);
  if (revision.slug !== id) {
    fail("revision.slug", "must match the stable institution ID.");
  }
}

export function validateCampusImportRecord(value: unknown): asserts value is CampusImportRecord {
  const record = validateRecordBase(value, "campus");
  const id = record.id;
  requireStableId(id, "record.id");
  const institution = validateInstitutionDependency(record.institution, "record.institution");
  const campusAliasKey = `${institution.id}--${id}`;
  requireStableId(campusAliasKey, "aliases.canonicalCampus.externalKey");
  validateAliases(record.aliases, "campus", campusAliasKey);
  const revision = requireObject(record.revision, "revision");
  const content = requireObject(revision.content, "revision.content");
  if (
    revision.dataClassification === "real" &&
    institution.dataClassification !== "real"
  ) {
    fail("record.institution.dataClassification", "a real campus cannot belong to a demo or test institution.");
  }
  validateRevision(revision, "campus");
  validateSourceReferences(record);
  assertJsonValue(content, "revision.content");
}

export function validateCourseOfferingImportRecord(
  value: unknown,
): asserts value is CourseOfferingImportRecord {
  const record = validateRecordBase(value, "course_offering");
  requireStableId(record.institutionId, "record.institutionId");
  const id = record.id;
  requireStableId(id, "record.id");
  const campus = validateCampusDependency(record.campus);
  const course = validateCourseDependency(record.course);
  validateAliases(record.aliases, "course_offering", id, course.id, record.institutionId);
  const revision = requireObject(record.revision, "revision");
  const content = requireObject(revision.details, "revision.details");

  if (campus.institution.id !== record.institutionId) {
    fail("record.campus.institution.id", "does not match record.institutionId.");
  }
  if (revision.dataClassification === "real") {
    if (
      course.publicationStatus !== "published" ||
      course.dataClassification !== "real"
    ) {
      fail("record.course", "a real offering requires a published real course revision; demo courses are not eligible.");
    }
    if (
      campus.publicationStatus !== "published" ||
      campus.dataClassification !== "real" ||
      campus.institution.publicationStatus !== "published" ||
      campus.institution.dataClassification !== "real"
    ) {
      fail("record.campus", "a real offering requires published real campus and parent institution revisions.");
    }
  }
  validateRevision(revision, "course_offering");
  validateSourceReferences(record);
  assertJsonValue(content, "revision.details");
}

function canonicalize(value: unknown, ancestors = new Set<object>()): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (ancestors.has(value)) fail("hash input", "must not contain a circular reference.");
    ancestors.add(value);
    const result = `[${value.map((entry) => canonicalize(entry, ancestors)).join(",")}]`;
    ancestors.delete(value);
    return result;
  }
  if (!isObject(value)) {
    fail("hash input", "must contain only JSON-compatible values; undefined and non-finite numbers are not supported.");
  }
  if (ancestors.has(value)) fail("hash input", "must not contain a circular reference.");
  ancestors.add(value);
  const result = `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key], ancestors)}`)
    .join(",")}}`;
  ancestors.delete(value);
  return result;
}

export function canonicalizeImportValue(value: unknown): string {
  return canonicalize(value);
}

function fingerprintPayload(record: InstitutionCatalogImportRecord) {
  const revision = {
    title: record.revision.title,
    ...(Object.hasOwn(record.revision, "summary") ? { summary: record.revision.summary } : {}),
    ...(Object.hasOwn(record.revision, "description")
      ? { description: record.revision.description }
      : {}),
    content:
      record.kind === "course_offering"
        ? record.revision.details
        : record.revision.content,
  };
  const provenance = (record.revision.provenance ?? [])
    .map(({ claimKey, sourceId, sourceUrl, checkedAt }) => ({
      claimKey,
      ...(sourceId === undefined ? {} : { sourceId }),
      ...(sourceUrl === undefined ? {} : { sourceUrl }),
      ...(checkedAt === undefined ? {} : { checkedAt }),
    }))
    .sort((left, right) => canonicalize(left).localeCompare(canonicalize(right)));

  if (record.kind === "institution") {
    return {
      kind: record.kind,
      id: record.id,
      revision: {
        ...revision,
        slug: record.revision.slug,
        initials: record.revision.initials,
        institutionType: record.revision.institutionType,
        ownership: record.revision.ownership ?? null,
      },
      provenance,
    };
  }
  if (record.kind === "campus") {
    return {
      kind: record.kind,
      id: record.id,
      institutionId: record.institution.id,
      institutionItemId: record.institution.catalogItemId,
      ...(record.revision.stateId === undefined ? {} : { stateId: record.revision.stateId }),
      revision,
      provenance,
    };
  }
  return {
    kind: record.kind,
    id: record.id,
    institutionId: record.institutionId,
    campusId: record.campus.id,
    campusItemId: record.campus.catalogItemId,
    campusRevisionId: record.campus.revisionId,
    courseId: record.course.id,
    courseItemId: record.course.catalogItemId,
    courseRevisionId: record.course.revisionId,
    slug: record.revision.slug,
    revision,
    provenance,
  };
}

export function hashInstitutionImportRecord(value: unknown): string {
  if (!isObject(value) || typeof value.kind !== "string") {
    fail("record.kind", "must identify an institution, campus, or course_offering record.");
  }
  switch (value.kind) {
    case "institution":
      validateInstitutionImportRecord(value);
      break;
    case "campus":
      validateCampusImportRecord(value);
      break;
    case "course_offering":
      validateCourseOfferingImportRecord(value);
      break;
    default:
      fail("record.kind", "must be institution, campus, or course_offering.");
  }
  const record = value as InstitutionCatalogImportRecord;
  return createHash("sha256").update(canonicalize(fingerprintPayload(record))).digest("hex");
}

export type ExistingImportRevision = {
  contentHash: string;
  revisionNumber: number;
  publicationStatus: CatalogPublicationStatus;
  dataClassification: CatalogClassification;
};

export type ImportRevisionDecision =
  | { action: "insert"; revisionNumber: 1 }
  | { action: "unchanged" }
  | { action: "create_revision"; revisionNumber: number }
  | { action: "conflict"; reason: string };

export function decideImportRevision(
  contentHash: string,
  dataClassification: CatalogClassification,
  existing?: ExistingImportRevision | null,
): ImportRevisionDecision {
  if (!/^[0-9a-f]{64}$/.test(contentHash)) {
    fail("contentHash", "must be a lowercase SHA-256 hex digest.");
  }
  requireEnum(dataClassification, classifications, "dataClassification");
  if (!existing) return { action: "insert", revisionNumber: 1 };
  requireEnum(existing.publicationStatus, publicationStatuses, "existing.publicationStatus");
  requireEnum(existing.dataClassification, classifications, "existing.dataClassification");
  if (!Number.isInteger(existing.revisionNumber) || existing.revisionNumber < 1) {
    fail("existing.revisionNumber", "must be a positive integer.");
  }
  if (existing.dataClassification !== dataClassification) {
    return {
      action: "conflict",
      reason: "Classification differs; lifecycle review is required independently of the content hash.",
    };
  }
  if (existing.contentHash === contentHash) return { action: "unchanged" };
  if (["draft", "in_review", "approved"].includes(existing.publicationStatus)) {
    return {
      action: "conflict",
      reason: "A non-published revision exists with different content; resolve it before importing again.",
    };
  }
  return { action: "create_revision", revisionNumber: existing.revisionNumber + 1 };
}
