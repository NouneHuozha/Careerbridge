import { createHash } from "node:crypto";
import {
  assertOnlyKeys,
  canonicalize,
  CatalogueProvenance,
  CatalogueSource,
  fail,
  requireEvidenceForClaims,
  requireObject,
  requireString,
  validateAliases,
  validateHttpUrl,
  validateProvenance,
  validateSources,
  validateStringArray,
} from "./catalogue-import-validation";

const levels = new Set(["national", "state", "institution"]);
const stages = new Set(["class-10", "class-12"]);

export type RealExaminationImportRecord = {
  kind: "exam";
  id: string;
  aliases: Array<{ sourceSystem: string; externalType: string; externalKey: string; externalContextKey: string }>;
  revision: {
    title: string;
    summary: string;
    description: string;
    publicationStatus: "draft";
    dataClassification: "real";
    verificationStatus: "pending_review";
    examination: {
      level: string;
      stages: string[];
      purpose: string;
      programmes: string[];
      authority: string;
      regions: string[];
      fields: string[];
      officialUrl?: string | null;
    };
    provenance: CatalogueProvenance[];
  };
  sources: CatalogueSource[];
};

export function requiredExaminationClaims(record: Pick<RealExaminationImportRecord, "revision">): string[] {
  const exam = record.revision.examination;
  const claims = [
    "examination.title",
    "examination.summary",
    "examination.description",
    "examination.level",
    "examination.stages",
    "examination.purpose",
    "examination.authority",
  ];
  if (exam.programmes.length) claims.push("examination.programmes");
  if (exam.regions.length) claims.push("examination.regions");
  if (exam.fields.length) claims.push("examination.fields");
  if (exam.officialUrl) claims.push("examination.official_url");
  return claims;
}

export function validateRealExaminationImportRecord(value: unknown): asserts value is RealExaminationImportRecord {
  const record = requireObject(value, "record");
  assertOnlyKeys(record, ["kind", "id", "aliases", "revision", "sources"], "record");
  if (record.kind !== "exam") fail("record.kind", 'must be "exam".');
  requireString(record.id, "record.id");
  validateAliases(record.aliases, record.id, "examination");
  const sources = validateSources(record.sources);
  const revision = requireObject(record.revision, "revision");
  assertOnlyKeys(revision, [
    "title", "summary", "description", "publicationStatus", "dataClassification",
    "verificationStatus", "examination", "provenance",
  ], "revision");
  requireString(revision.title, "revision.title");
  requireString(revision.summary, "revision.summary");
  requireString(revision.description, "revision.description");
  if (revision.publicationStatus !== "draft") fail("revision.publicationStatus", "imports may only create drafts.");
  if (revision.dataClassification !== "real") fail("revision.dataClassification", "must be real.");
  if (revision.verificationStatus !== "pending_review") {
    fail("revision.verificationStatus", "must remain pending_review until evidence is reviewed.");
  }
  const examination = requireObject(revision.examination, "revision.examination");
  assertOnlyKeys(examination, [
    "level", "stages", "purpose", "programmes", "authority", "regions", "fields", "officialUrl",
  ], "revision.examination");
  if (typeof examination.level !== "string" || !levels.has(examination.level)) {
    fail("revision.examination.level", "must be national, state, or institution.");
  }
  validateStringArray(examination.stages, "revision.examination.stages", stages, true);
  requireString(examination.purpose, "revision.examination.purpose");
  validateStringArray(examination.programmes, "revision.examination.programmes");
  requireString(examination.authority, "revision.examination.authority");
  validateStringArray(examination.regions, "revision.examination.regions");
  validateStringArray(examination.fields, "revision.examination.fields");
  if (examination.officialUrl !== undefined && examination.officialUrl !== null) {
    validateHttpUrl(examination.officialUrl, "revision.examination.officialUrl");
  }
  const provenance = validateProvenance(revision.provenance, sources);
  requireEvidenceForClaims(provenance, requiredExaminationClaims({
    revision: { examination: examination as RealExaminationImportRecord["revision"]["examination"] },
  } as Pick<RealExaminationImportRecord, "revision">));
}

export function hashRealExaminationImportRecord(value: unknown): string {
  validateRealExaminationImportRecord(value);
  const record = value as RealExaminationImportRecord;
  const fingerprint = {
    kind: record.kind,
    id: record.id,
    aliases: record.aliases,
    revision: {
      title: record.revision.title,
      summary: record.revision.summary,
      description: record.revision.description,
      examination: record.revision.examination,
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
