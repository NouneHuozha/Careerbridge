import "server-only";
import { and, asc, desc, eq, isNotNull, or } from "drizzle-orm";
import { getDb } from "./client";
import type { CatalogueEvidence } from "./catalogue-types";
import type { Examination, ExaminationLevel, ExaminationStage } from "./examination-types";
import {
  catalogItemAliases,
  catalogItemRevisions,
  catalogItems,
  catalogRevisionSources,
  examinationRevisions,
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
  level: string;
  stages: string[];
  purpose: string;
  programmes: string[];
  authority: string;
  regions: string[];
  fields: string[];
  officialUrl: string | null;
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
  item: Omit<Examination, "sources"> & { sources: Map<string, CatalogueEvidence> };
};

function requiredText(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Examination ${path} must be a non-empty string.`);
  }
  return value;
}

function mapStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new Error(`Examination ${path} must be an array.`);
  return value.map((entry, index) => requiredText(entry, `${path}[${index}]`));
}

function safeHttpUrl(value: string | null, path: string): string | undefined {
  if (value === null) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.toString();
  } catch {
    throw new Error(`Examination ${path} must be an absolute HTTP(S) URL.`);
  }
}

function mapLevel(value: string): ExaminationLevel {
  if (value === "national" || value === "state" || value === "institution") return value;
  throw new Error(`Examination level "${value}" is unsupported.`);
}

function mapStages(value: string[]): ExaminationStage[] {
  return value.map((stage) => {
    if (stage === "class-10" || stage === "class-12") return stage;
    throw new Error(`Examination stage "${stage}" is unsupported.`);
  });
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function mapRows(rows: QueryRow[], demo = false): Examination[] {
  const states = new Map<string, RecordState>();
  for (const row of rows) {
    let state = states.get(row.catalogItemId);
    if (state && state.revisionId !== row.revisionId) {
      if (demo && row.revisionNumber < state.revisionNumber) continue;
      if (!demo || row.revisionNumber === state.revisionNumber) {
        throw new Error(`Examination ${row.catalogItemId} has conflicting selected revisions.`);
      }
      state = undefined;
    }
    if (!state) {
      if (
        row.publicationStatus !== (demo ? "draft" : "published") ||
        row.dataClassification !== (demo ? "demo" : "real") ||
        (!demo && row.verificationStatus !== "verified")
      ) {
        throw new Error(`Examination ${row.catalogItemId} has invalid publication metadata.`);
      }
      const item: Omit<Examination, "sources"> & { sources: Map<string, CatalogueEvidence> } = {
        id: "",
        catalogItemId: row.catalogItemId,
        revisionId: row.revisionId,
        revisionNumber: row.revisionNumber,
        dataClassification: row.dataClassification as Examination["dataClassification"],
        verificationStatus: row.verificationStatus,
        publicationStatus: row.publicationStatus,
        name: requiredText(row.title, "title"),
        level: mapLevel(row.level),
        stages: mapStages(row.stages),
        purpose: requiredText(row.purpose, "purpose"),
        programmes: mapStringArray(row.programmes, "programmes"),
        authority: requiredText(row.authority, "authority"),
        regions: mapStringArray(row.regions, "regions"),
        fields: mapStringArray(row.fields, "fields"),
        ...(safeHttpUrl(row.officialUrl, "officialUrl") ? { officialUrl: safeHttpUrl(row.officialUrl, "officialUrl") } : {}),
        sources: new Map(),
      };
      state = { revisionId: row.revisionId, revisionNumber: row.revisionNumber, item };
      states.set(row.catalogItemId, state);
    }

    if (
      row.aliasSourceSystem === "careerbridge" &&
      row.aliasExternalType === "examination" &&
      row.aliasExternalContextKey === "" &&
      row.aliasExternalKey
    ) {
      if (state.item.id && state.item.id !== row.aliasExternalKey) {
        throw new Error(`Examination ${row.catalogItemId} has multiple canonical CareerBridge IDs.`);
      }
      state.item.id = row.aliasExternalKey;
    }

    if (row.sourceId && row.claimKey !== null && row.sourceName) {
      const evidence: CatalogueEvidence = {
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
      state.item.sources.set(JSON.stringify([evidence.sourceId, evidence.claimKey]), evidence);
    }
  }

  return [...states.values()].map(({ item }) => {
    if (!item.id) throw new Error(`Examination ${item.catalogItemId} has no canonical CareerBridge examination ID.`);
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
    level: examinationRevisions.level,
    stages: examinationRevisions.stages,
    purpose: examinationRevisions.purpose,
    programmes: examinationRevisions.programmes,
    authority: examinationRevisions.authority,
    regions: examinationRevisions.regions,
    fields: examinationRevisions.fields,
    officialUrl: examinationRevisions.officialUrl,
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
    .innerJoin(examinationRevisions, eq(examinationRevisions.revisionId, catalogItemRevisions.id))
    .leftJoin(canonicalAlias, and(
      eq(canonicalAlias.catalogItemId, catalogItems.id),
      eq(canonicalAlias.sourceSystem, "careerbridge"),
      eq(canonicalAlias.externalType, "examination"),
      eq(canonicalAlias.externalContextKey, ""),
    ))
    .leftJoin(catalogRevisionSources, eq(catalogRevisionSources.revisionId, catalogItemRevisions.id))
    .leftJoin(sourceRegistry, eq(sourceRegistry.id, catalogRevisionSources.sourceId))
    .where(and(
      eq(catalogItems.itemType, "examination"),
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
      eq(canonicalAlias.externalType, "examination"),
      eq(canonicalAlias.externalContextKey, ""),
    ))
    .where(and(eq(catalogItems.itemType, "examination"), or(...identityMatches)));
  const ids = [...new Set(matches.map((row) => row.catalogItemId))];
  if (ids.length > 1) throw new Error(`Examination identifier "${identifier}" resolves to multiple catalogue items.`);
  return ids[0] ?? null;
}

export async function listPublishedExaminations(): Promise<Examination[]> {
  return mapRows(await selectRows(getDb(), "published"));
}

export async function getPublishedExamination(identifier: string): Promise<Examination | null> {
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
    throw new Error("Examination demo preview is available only in a development environment.");
  }
}

export async function listDemoExaminationsForDevelopment(): Promise<Examination[]> {
  assertDevelopmentPreviewEnvironment();
  return mapRows(await selectRows(getDb(), "demo"), true);
}

export async function getDemoExaminationForDevelopment(identifier: string): Promise<Examination | null> {
  assertDevelopmentPreviewEnvironment();
  if (!identifier) return null;
  const database = getDb();
  const itemId = await resolveItemId(database, identifier);
  if (!itemId) return null;
  return mapRows(await selectRows(database, "demo", itemId), true)[0] ?? null;
}
