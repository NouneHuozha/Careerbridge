import "server-only";
import { and, asc, desc, eq, isNotNull, or } from "drizzle-orm";
import { getDb } from "./client";
import type { CatalogueEvidence } from "./catalogue-types";
import {
  scholarshipStudyLevels,
  type Scholarship,
  type ScholarshipDetail,
  type ScholarshipEligibility,
  type ScholarshipStatus,
  type ScholarshipStudyLevel,
} from "./scholarship-types";
import {
  catalogItemAliases,
  catalogItemRevisions,
  catalogItems,
  catalogRevisionSources,
  scholarshipRevisions,
  sourceRegistry,
} from "./schema/catalog";

const canonicalAlias = catalogItemAliases;
type QueryMode = "published" | "demo";
type QueryRow = {
  catalogItemId: string;
  revisionId: string;
  revisionNumber: number;
  title: string;
  summary: string | null;
  publicationStatus: string;
  dataClassification: string;
  verificationStatus: string;
  category: string;
  provider: string;
  support: string;
  studyLevels: string[];
  eligibilityRegions: unknown;
  scholarshipStatus: string;
  officialUrl: string | null;
  detail: unknown;
  aliasSourceSystem: string | null;
  aliasExternalType: string | null;
  aliasExternalKey: string | null;
  aliasExternalContextKey: string | null;
  sourceId: string | null;
  sourceName: string | null;
  sourceAuthority: string | null;
  canonicalUrl: string | null;
  normalizedUrl: string | null;
  sourceType: string | null;
  sourceStatus: string | null;
  claimKey: string | null;
  checkedAt: Date | null;
  verifiedAt: Date | null;
  sourceVerificationStatus: string | null;
};
type RecordState = {
  revisionId: string;
  revisionNumber: number;
  item: Omit<Scholarship, "sources"> & { sources: Map<string, CatalogueEvidence> };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function requiredText(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Scholarship ${path} must be a non-empty string.`);
  return value;
}
function mapStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new Error(`Scholarship ${path} must be an array.`);
  return value.map((entry, index) => requiredText(entry, `${path}[${index}]`));
}
function safeHttpUrl(value: string | null, path: string): string | undefined {
  if (value === null) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.toString();
  } catch {
    throw new Error(`Scholarship ${path} must be an absolute HTTP(S) URL.`);
  }
}
function mapStudyLevels(value: string[]): ScholarshipStudyLevel[] {
  return value.map((level) => {
    if (scholarshipStudyLevels.some((entry) => entry.value === level)) return level as ScholarshipStudyLevel;
    throw new Error(`Scholarship study level "${level}" is unsupported.`);
  });
}
function mapStatus(value: string): ScholarshipStatus {
  if (value === "open" || value === "upcoming" || value === "closed" || value === "unknown") return value;
  throw new Error(`Scholarship status "${value}" is unsupported.`);
}
function mapRegions(value: unknown): "all" | string[] {
  if (value === "all") return "all";
  return mapStringArray(value, "eligibilityRegions");
}
function mapEligibility(value: unknown): ScholarshipEligibility[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error('Scholarship detail property "eligibility" must be an array.');
  return value.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`Scholarship detail eligibility[${index}] must be an object.`);
    return {
      title: requiredText(entry.title, `detail.eligibility[${index}].title`),
      description: requiredText(entry.description, `detail.eligibility[${index}].description`),
    };
  });
}
function mapRelated(value: unknown, property: string): { name: string; href: string }[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error(`Scholarship detail property "${property}" must be an array.`);
  return value.map((entry, index) => {
    if (!isRecord(entry) || typeof entry.href !== "string" || !entry.href.startsWith("/explore/")) {
      throw new Error(`Scholarship detail property "${property}[${index}]" has an invalid internal link.`);
    }
    return { name: requiredText(entry.name, `detail.${property}[${index}].name`), href: entry.href };
  });
}
function mapDetail(value: unknown): ScholarshipDetail {
  if (!isRecord(value)) throw new Error("Scholarship detail must be a JSON object.");
  const detail: ScholarshipDetail = {};
  for (const property of ["benefitNotes", "applicationSteps", "documents"] as const) {
    if (Object.hasOwn(value, property)) detail[property] = mapStringArray(value[property], `detail.${property}`);
  }
  const eligibility = mapEligibility(value.eligibility);
  if (eligibility !== undefined) detail.eligibility = eligibility;
  for (const property of ["applicationMethod", "afterApplication", "renewal"] as const) {
    if (Object.hasOwn(value, property)) detail[property] = requiredText(value[property], `detail.${property}`);
  }
  const relatedCourses = mapRelated(value.relatedCourses, "relatedCourses");
  if (relatedCourses !== undefined) detail.relatedCourses = relatedCourses;
  const relatedInstitutions = mapRelated(value.relatedInstitutions, "relatedInstitutions");
  if (relatedInstitutions !== undefined) detail.relatedInstitutions = relatedInstitutions;
  return detail;
}
function toIso(value: Date | null): string | null { return value ? value.toISOString() : null; }

function mapRows(rows: QueryRow[], demo = false): Scholarship[] {
  const states = new Map<string, RecordState>();
  for (const row of rows) {
    let state = states.get(row.catalogItemId);
    if (state && state.revisionId !== row.revisionId) {
      if (demo && row.revisionNumber < state.revisionNumber) continue;
      if (!demo || row.revisionNumber === state.revisionNumber) throw new Error(`Scholarship ${row.catalogItemId} has conflicting selected revisions.`);
      state = undefined;
    }
    if (!state) {
      if (
        row.publicationStatus !== (demo ? "draft" : "published") ||
        row.dataClassification !== (demo ? "demo" : "real") ||
        (!demo && row.verificationStatus !== "verified") ||
        row.summary === null
      ) throw new Error(`Scholarship ${row.catalogItemId} has invalid common or publication metadata.`);
      const item: Omit<Scholarship, "sources"> & { sources: Map<string, CatalogueEvidence> } = {
        id: "",
        catalogItemId: row.catalogItemId,
        revisionId: row.revisionId,
        revisionNumber: row.revisionNumber,
        dataClassification: row.dataClassification as Scholarship["dataClassification"],
        verificationStatus: row.verificationStatus,
        publicationStatus: row.publicationStatus,
        name: requiredText(row.title, "title"),
        category: requiredText(row.category, "category"),
        provider: requiredText(row.provider, "provider"),
        purpose: requiredText(row.summary, "summary"),
        support: requiredText(row.support, "support"),
        studyLevels: mapStudyLevels(row.studyLevels),
        eligibilityRegions: mapRegions(row.eligibilityRegions),
        status: mapStatus(row.scholarshipStatus),
        ...(safeHttpUrl(row.officialUrl, "officialUrl") ? { officialUrl: safeHttpUrl(row.officialUrl, "officialUrl") } : {}),
        detail: mapDetail(row.detail),
        sources: new Map(),
      };
      state = { revisionId: row.revisionId, revisionNumber: row.revisionNumber, item };
      states.set(row.catalogItemId, state);
    }
    if (
      row.aliasSourceSystem === "careerbridge" &&
      row.aliasExternalType === "scholarship" &&
      row.aliasExternalContextKey === "" &&
      row.aliasExternalKey
    ) {
      if (state.item.id && state.item.id !== row.aliasExternalKey) throw new Error(`Scholarship ${row.catalogItemId} has multiple canonical CareerBridge IDs.`);
      state.item.id = row.aliasExternalKey;
    }
    if (row.sourceId && row.claimKey !== null && row.sourceName) {
      const source: CatalogueEvidence = {
        sourceId: row.sourceId,
        sourceName: row.sourceName,
        authority: row.sourceAuthority,
        canonicalUrl: safeHttpUrl(row.canonicalUrl, "source canonical URL") ?? null,
        normalizedUrl: row.normalizedUrl,
        sourceType: row.sourceType ?? "unknown",
        sourceStatus: row.sourceStatus ?? "unknown",
        claimKey: row.claimKey,
        checkedAt: toIso(row.checkedAt),
        verifiedAt: toIso(row.verifiedAt),
        verificationStatus: row.sourceVerificationStatus,
      };
      state.item.sources.set(JSON.stringify([source.sourceId, source.claimKey]), source);
    }
  }
  return [...states.values()].map(({ item }) => {
    if (!item.id) throw new Error(`Scholarship ${item.catalogItemId} has no canonical CareerBridge scholarship ID.`);
    return { ...item, sources: [...item.sources.values()].sort((a, b) => a.claimKey.localeCompare(b.claimKey) || a.sourceName.localeCompare(b.sourceName)) };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

async function selectRows(database: ReturnType<typeof getDb>, mode: QueryMode, itemId?: string) {
  const revisionJoin = mode === "published"
    ? and(eq(catalogItemRevisions.id, catalogItems.publishedRevisionId), eq(catalogItemRevisions.catalogItemId, catalogItems.id))
    : eq(catalogItemRevisions.catalogItemId, catalogItems.id);
  return database.select({
    catalogItemId: catalogItems.id,
    revisionId: catalogItemRevisions.id,
    revisionNumber: catalogItemRevisions.revisionNumber,
    title: catalogItemRevisions.title,
    summary: catalogItemRevisions.summary,
    publicationStatus: catalogItemRevisions.publicationStatus,
    dataClassification: catalogItemRevisions.dataClassification,
    verificationStatus: catalogItemRevisions.verificationStatus,
    category: scholarshipRevisions.category,
    provider: scholarshipRevisions.provider,
    support: scholarshipRevisions.support,
    studyLevels: scholarshipRevisions.studyLevels,
    eligibilityRegions: scholarshipRevisions.eligibilityRegions,
    scholarshipStatus: scholarshipRevisions.scholarshipStatus,
    officialUrl: scholarshipRevisions.officialUrl,
    detail: scholarshipRevisions.detail,
    aliasSourceSystem: canonicalAlias.sourceSystem,
    aliasExternalType: canonicalAlias.externalType,
    aliasExternalKey: canonicalAlias.externalKey,
    aliasExternalContextKey: canonicalAlias.externalContextKey,
    sourceId: sourceRegistry.id,
    sourceName: sourceRegistry.sourceName,
    sourceAuthority: sourceRegistry.authority,
    canonicalUrl: sourceRegistry.canonicalUrl,
    normalizedUrl: sourceRegistry.normalizedUrl,
    sourceType: sourceRegistry.sourceType,
    sourceStatus: sourceRegistry.status,
    claimKey: catalogRevisionSources.claimKey,
    checkedAt: catalogRevisionSources.checkedAt,
    verifiedAt: catalogRevisionSources.verifiedAt,
    sourceVerificationStatus: catalogRevisionSources.verificationStatus,
  }).from(catalogItems)
    .innerJoin(catalogItemRevisions, revisionJoin)
    .innerJoin(scholarshipRevisions, eq(scholarshipRevisions.revisionId, catalogItemRevisions.id))
    .leftJoin(canonicalAlias, and(
      eq(canonicalAlias.catalogItemId, catalogItems.id),
      eq(canonicalAlias.sourceSystem, "careerbridge"),
      eq(canonicalAlias.externalType, "scholarship"),
      eq(canonicalAlias.externalContextKey, ""),
    ))
    .leftJoin(catalogRevisionSources, eq(catalogRevisionSources.revisionId, catalogItemRevisions.id))
    .leftJoin(sourceRegistry, eq(sourceRegistry.id, catalogRevisionSources.sourceId))
    .where(and(
      eq(catalogItems.itemType, "scholarship"),
      mode === "published" ? isNotNull(catalogItems.publishedRevisionId) : undefined,
      eq(catalogItemRevisions.publicationStatus, mode === "published" ? "published" : "draft"),
      eq(catalogItemRevisions.dataClassification, mode === "published" ? "real" : "demo"),
      mode === "published" ? eq(catalogItemRevisions.verificationStatus, "verified") : undefined,
      itemId ? eq(catalogItems.id, itemId) : undefined,
    ))
    .orderBy(asc(catalogItems.id), desc(catalogItemRevisions.revisionNumber), asc(canonicalAlias.externalKey), asc(catalogRevisionSources.claimKey));
}

async function resolveItemId(database: ReturnType<typeof getDb>, identifier: string): Promise<string | null> {
  const identityMatches = [eq(canonicalAlias.externalKey, identifier)];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) identityMatches.push(eq(catalogItems.id, identifier));
  const matches = await database.select({ catalogItemId: catalogItems.id }).from(catalogItems)
    .leftJoin(canonicalAlias, and(
      eq(canonicalAlias.catalogItemId, catalogItems.id),
      eq(canonicalAlias.sourceSystem, "careerbridge"),
      eq(canonicalAlias.externalType, "scholarship"),
      eq(canonicalAlias.externalContextKey, ""),
    ))
    .where(and(eq(catalogItems.itemType, "scholarship"), or(...identityMatches)));
  const ids = [...new Set(matches.map((row) => row.catalogItemId))];
  if (ids.length > 1) throw new Error(`Scholarship identifier "${identifier}" resolves to multiple catalogue items.`);
  return ids[0] ?? null;
}

export async function listPublishedScholarships(): Promise<Scholarship[]> {
  return mapRows(await selectRows(getDb(), "published"));
}
export async function getPublishedScholarship(identifier: string): Promise<Scholarship | null> {
  if (!identifier) return null;
  const database = getDb();
  const itemId = await resolveItemId(database, identifier);
  if (!itemId) return null;
  return mapRows(await selectRows(database, "published", itemId))[0] ?? null;
}
function assertDevelopmentPreviewEnvironment() {
  const vercelEnvironment = process.env.VERCEL_ENV;
  const hosted = Boolean(process.env.VERCEL);
  if (process.env.NODE_ENV !== "development" || (vercelEnvironment !== undefined && vercelEnvironment !== "development") || (hosted && vercelEnvironment !== "development")) {
    throw new Error("Scholarship demo preview is available only in a development environment.");
  }
}
export async function listDemoScholarshipsForDevelopment(): Promise<Scholarship[]> {
  assertDevelopmentPreviewEnvironment();
  return mapRows(await selectRows(getDb(), "demo"), true);
}
export async function getDemoScholarshipForDevelopment(identifier: string): Promise<Scholarship | null> {
  assertDevelopmentPreviewEnvironment();
  if (!identifier) return null;
  const database = getDb();
  const itemId = await resolveItemId(database, identifier);
  if (!itemId) return null;
  return mapRows(await selectRows(database, "demo", itemId), true)[0] ?? null;
}
