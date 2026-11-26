import { createHash } from "node:crypto";
import {
  assertOnlyKeys,
  canonicalize,
  CatalogueProvenance,
  CatalogueSource,
  fail,
  isValidDate,
  requireEvidenceForClaims,
  requireObject,
  requireString,
  validateAliases,
  validateHttpUrl,
  validateProvenance,
  validateSources,
  validateStringArray,
} from "./catalogue-import-validation";

const studyLevels = new Set([
  "school",
  "higher-secondary",
  "diploma-iti",
  "undergraduate",
  "postgraduate",
  "research-other",
]);
const statuses = new Set(["open", "upcoming", "closed", "unknown"]);

export type RealScholarshipImportRecord = {
  kind: "scholarship";
  id: string;
  aliases: Array<{ sourceSystem: string; externalType: string; externalKey: string; externalContextKey: string }>;
  revision: {
    title: string;
    summary: string;
    description: string;
    publicationStatus: "draft";
    dataClassification: "real";
    verificationStatus: "pending_review";
    scholarship: {
      category: string;
      provider: string;
      support: string;
      studyLevels: string[];
      eligibilityRegions: "all" | string[];
      status: "open" | "upcoming" | "closed" | "unknown";
      officialUrl?: string | null;
      detail: Record<string, unknown>;
    };
    provenance: CatalogueProvenance[];
  };
  sources: CatalogueSource[];
};

export function requiredScholarshipClaims(record: Pick<RealScholarshipImportRecord, "revision">): string[] {
  const scholarship = record.revision.scholarship;
  const claims = [
    "scholarship.title",
    "scholarship.summary",
    "scholarship.description",
    "scholarship.category",
    "scholarship.provider",
    "scholarship.support",
    "scholarship.study_levels",
    "scholarship.eligibility_regions",
  ];
  if (scholarship.status !== "unknown") claims.push("scholarship.status");
  if (scholarship.officialUrl) claims.push("scholarship.official_url");
  for (const key of Object.keys(scholarship.detail)) claims.push(`scholarship.detail.${key}`);
  return claims;
}

function validateScholarshipDetail(value: unknown) {
  const detail = requireObject(value, "revision.scholarship.detail");
  assertOnlyKeys(detail, [
    "benefitNotes", "eligibility", "applicationMethod", "applicationSteps", "afterApplication",
    "documents", "renewal", "sourceTitle", "sourceYear", "lastChecked",
    "relatedCourses", "relatedInstitutions",
  ], "revision.scholarship.detail");
  for (const key of ["benefitNotes", "applicationSteps", "documents"] as const) {
    if (detail[key] !== undefined) validateStringArray(detail[key], `revision.scholarship.detail.${key}`);
  }
  if (detail.eligibility !== undefined) {
    if (!Array.isArray(detail.eligibility)) fail("revision.scholarship.detail.eligibility", "must be an array.");
    detail.eligibility.forEach((valueEntry, index) => {
      const path = `revision.scholarship.detail.eligibility[${index}]`;
      const entry = requireObject(valueEntry, path);
      assertOnlyKeys(entry, ["title", "description"], path);
      requireString(entry.title, `${path}.title`);
      requireString(entry.description, `${path}.description`);
    });
  }
  for (const key of ["applicationMethod", "afterApplication", "renewal", "sourceTitle"] as const) {
    if (detail[key] !== undefined) requireString(detail[key], `revision.scholarship.detail.${key}`);
  }
  if (detail.sourceYear !== undefined) {
    requireString(detail.sourceYear, "revision.scholarship.detail.sourceYear");
    if (!/^\d{4}(?:-\d{2,4})?$/.test(detail.sourceYear)) {
      fail("revision.scholarship.detail.sourceYear", "must be a year or year range.");
    }
  }
  if (detail.lastChecked !== undefined) {
    requireString(detail.lastChecked, "revision.scholarship.detail.lastChecked");
    if (!isValidDate(detail.lastChecked)) {
      fail("revision.scholarship.detail.lastChecked", "must be a valid ISO date or timestamp.");
    }
  }
  for (const key of ["relatedCourses", "relatedInstitutions"] as const) {
    if (detail[key] === undefined) continue;
    if (!Array.isArray(detail[key])) fail(`revision.scholarship.detail.${key}`, "must be an array.");
    detail[key].forEach((valueEntry, index) => {
      const path = `revision.scholarship.detail.${key}[${index}]`;
      const entry = requireObject(valueEntry, path);
      assertOnlyKeys(entry, ["name", "href"], path);
      requireString(entry.name, `${path}.name`);
      requireString(entry.href, `${path}.href`);
      if (!entry.href.startsWith("/") || entry.href.startsWith("//") || entry.href.includes("\\") || entry.href.includes("..")) {
        fail(`${path}.href`, "must be a safe same-site path.");
      }
    });
  }
  return detail;
}

export function validateRealScholarshipImportRecord(value: unknown): asserts value is RealScholarshipImportRecord {
  const record = requireObject(value, "record");
  assertOnlyKeys(record, ["kind", "id", "aliases", "revision", "sources"], "record");
  if (record.kind !== "scholarship") fail("record.kind", 'must be "scholarship".');
  requireString(record.id, "record.id");
  validateAliases(record.aliases, record.id, "scholarship");
  const sources = validateSources(record.sources);
  const revision = requireObject(record.revision, "revision");
  assertOnlyKeys(revision, [
    "title", "summary", "description", "publicationStatus", "dataClassification",
    "verificationStatus", "scholarship", "provenance",
  ], "revision");
  requireString(revision.title, "revision.title");
  requireString(revision.summary, "revision.summary");
  requireString(revision.description, "revision.description");
  if (revision.publicationStatus !== "draft") fail("revision.publicationStatus", "imports may only create drafts.");
  if (revision.dataClassification !== "real") fail("revision.dataClassification", "must be real.");
  if (revision.verificationStatus !== "pending_review") {
    fail("revision.verificationStatus", "must remain pending_review until evidence is reviewed.");
  }
  const scholarship = requireObject(revision.scholarship, "revision.scholarship");
  assertOnlyKeys(scholarship, [
    "category", "provider", "support", "studyLevels", "eligibilityRegions", "status", "officialUrl", "detail",
  ], "revision.scholarship");
  requireString(scholarship.category, "revision.scholarship.category");
  requireString(scholarship.provider, "revision.scholarship.provider");
  requireString(scholarship.support, "revision.scholarship.support");
  validateStringArray(scholarship.studyLevels, "revision.scholarship.studyLevels", studyLevels, true);
  if (scholarship.eligibilityRegions !== "all") {
    validateStringArray(scholarship.eligibilityRegions, "revision.scholarship.eligibilityRegions");
  }
  if (typeof scholarship.status !== "string" || !statuses.has(scholarship.status)) {
    fail("revision.scholarship.status", "must be open, upcoming, closed, or unknown.");
  }
  if (scholarship.officialUrl !== undefined && scholarship.officialUrl !== null) {
    validateHttpUrl(scholarship.officialUrl, "revision.scholarship.officialUrl");
  }
  validateScholarshipDetail(scholarship.detail);
  const provenance = validateProvenance(revision.provenance, sources);
  requireEvidenceForClaims(provenance, requiredScholarshipClaims({
    revision: { scholarship: scholarship as RealScholarshipImportRecord["revision"]["scholarship"] },
  } as Pick<RealScholarshipImportRecord, "revision">));
}

export function hashRealScholarshipImportRecord(value: unknown): string {
  validateRealScholarshipImportRecord(value);
  const record = value as RealScholarshipImportRecord;
  const fingerprint = {
    kind: record.kind,
    id: record.id,
    aliases: record.aliases,
    revision: {
      title: record.revision.title,
      summary: record.revision.summary,
      description: record.revision.description,
      scholarship: record.revision.scholarship,
      provenance: record.revision.provenance.map((entry) => ({
        claimKey: entry.claimKey,
        sourceUrl: entry.sourceUrl ?? record.sources.find((source) => source.sourceKey === entry.sourceKey)?.canonicalUrl,
        sourceId: entry.sourceId,
        checkedAt: entry.checkedAt,
        verificationStatus: entry.verificationStatus,
      })).sort((left, right) => JSON.stringify(canonicalize(left)).localeCompare(JSON.stringify(canonicalize(right)))),
    },
  };
  return createHash("sha256").update(JSON.stringify(canonicalize(fingerprint))).digest("hex");
}
