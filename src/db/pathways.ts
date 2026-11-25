import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  isNotNull,
  or,
} from "drizzle-orm";
import { getDb } from "./client";
import type { EducationStage, PathwayEvidence, StudyRoute } from "./pathway-types";
import {
  catalogItemAliases,
  catalogItemRevisions,
  catalogItems,
  catalogRevisionSources,
  pathwayRevisions,
  sourceRegistry,
} from "./schema/catalog";

const canonicalAlias = catalogItemAliases;
type PathwayQueryMode = "published" | "demo";

type PathwayQueryRow = {
  catalogItemId: string;
  revisionId: string;
  revisionNumber: number;
  title: string;
  summary: string | null;
  introduction: string | null;
  publicationStatus: string;
  dataClassification: string;
  verificationStatus: string;
  stage: string;
  courseStage: string;
  catalogueGroup: string;
  category: string;
  routeContent: unknown;
  aliasSourceSystem: string | null;
  aliasExternalType: string | null;
  aliasExternalKey: string | null;
  aliasExternalContextKey: string | null;
  sourceId: string | null;
  sourceName: string | null;
  authority: string | null;
  canonicalUrl: string | null;
  normalizedUrl: string | null;
  claimKey: string | null;
  checkedAt: Date | null;
  verifiedAt: Date | null;
  sourceVerificationStatus: string | null;
};

type PathwayState = {
  revisionId: string;
  revisionNumber: number;
  route: Omit<StudyRoute, "sources"> & { sources: Map<string, PathwayEvidence> };
  aliases: Map<string, {
    sourceSystem: string;
    externalType: string;
    externalKey: string;
    externalContextKey: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEducationStage(value: string): value is EducationStage {
  return value === "class-10" || value === "class-12";
}

function requiredText(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Pathway ${path} must be a non-empty string.`);
  }
  return value;
}

function mapStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Pathway content property "${path}" must be a non-empty array.`);
  }
  return value.map((entry, index) => requiredText(entry, `${path}[${index}]`));
}

function mapTextPairs(value: unknown, path: string) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Pathway content property "${path}" must be a non-empty array.`);
  }
  return value.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`Pathway content property "${path}[${index}]" must be an object.`);
    const title = requiredText(entry.title, `${path}[${index}].title`);
    const description = requiredText(entry.description, `${path}[${index}].description`);
    if (path === "progression") {
      if (entry.nextStage !== undefined) return { title, description, nextStage: requiredText(entry.nextStage, `${path}[${index}].nextStage`) };
      return { title, description };
    }
    return { title, description };
  });
}

function mapRouteContent(value: unknown): Pick<StudyRoute, "steps" | "progression" | "qualification" | "considerations" | "furtherProgression"> {
  if (!isRecord(value)) throw new Error("Pathway route content must be a JSON object.");
  const qualification = value.qualification;
  if (!isRecord(qualification)) throw new Error('Pathway content property "qualification" must be an object.');
  const result: Pick<StudyRoute, "steps" | "progression" | "qualification" | "considerations" | "furtherProgression"> = {
    steps: mapStringArray(value.steps, "steps"),
    progression: mapTextPairs(value.progression, "progression") as StudyRoute["progression"],
    qualification: {
      title: requiredText(qualification.title, "qualification.title"),
      description: requiredText(qualification.description, "qualification.description"),
    },
    considerations: mapTextPairs(value.considerations, "considerations"),
  };
  if (value.furtherProgression !== undefined) {
    result.furtherProgression = requiredText(value.furtherProgression, "furtherProgression");
  }
  return result;
}

function normalizeDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function mapPathwayRows(rows: PathwayQueryRow[], latestDemoRevision = false): StudyRoute[] {
  const states = new Map<string, PathwayState>();
  for (const row of rows) {
    let state = states.get(row.catalogItemId);
    if (state && state.revisionId !== row.revisionId) {
      if (latestDemoRevision && row.revisionNumber < state.revisionNumber) continue;
      if (!latestDemoRevision || row.revisionNumber === state.revisionNumber) {
        throw new Error(`Pathway ${row.catalogItemId} has conflicting selected revisions.`);
      }
      state = undefined;
    }

    if (!state) {
      if (
        row.summary === null ||
        row.introduction === null ||
        !isEducationStage(row.stage) ||
        !isEducationStage(row.courseStage) ||
        row.publicationStatus !== (latestDemoRevision ? "draft" : "published") ||
        row.dataClassification !== (latestDemoRevision ? "demo" : "real")
      ) {
        throw new Error(`Pathway ${row.catalogItemId} has invalid common or typed revision data.`);
      }
      const content = mapRouteContent(row.routeContent);
      state = {
        revisionId: row.revisionId,
        revisionNumber: row.revisionNumber,
        route: {
          id: "",
          stage: row.stage,
          courseStage: row.courseStage,
          catalogueGroup: requiredText(row.catalogueGroup, "catalogueGroup"),
          category: requiredText(row.category, "category"),
          title: requiredText(row.title, "title"),
          description: row.summary,
          introduction: row.introduction,
          ...content,
          catalogItemId: row.catalogItemId,
          revisionId: row.revisionId,
          revisionNumber: row.revisionNumber,
          dataClassification: row.dataClassification as StudyRoute["dataClassification"],
          verificationStatus: row.verificationStatus,
          publicationStatus: row.publicationStatus,
          sources: new Map(),
        },
        aliases: new Map(),
      };
      states.set(row.catalogItemId, state);
    }

    if (
      row.aliasSourceSystem !== null &&
      row.aliasExternalType !== null &&
      row.aliasExternalKey !== null &&
      row.aliasExternalContextKey !== null
    ) {
      const alias = {
        sourceSystem: row.aliasSourceSystem,
        externalType: row.aliasExternalType,
        externalKey: row.aliasExternalKey,
        externalContextKey: row.aliasExternalContextKey,
      };
      state.aliases.set(JSON.stringify(alias), alias);
      if (alias.sourceSystem === "careerbridge" && alias.externalType === "pathway") {
        if (state.route.id && state.route.id !== alias.externalKey) {
          throw new Error(`Pathway ${row.catalogItemId} has multiple canonical CareerBridge IDs.`);
        }
        state.route.id = alias.externalKey;
      }
    }

    if (row.sourceId !== null && row.claimKey !== null && row.sourceName !== null) {
      const evidence: PathwayEvidence = {
        sourceId: row.sourceId,
        sourceName: row.sourceName,
        authority: row.authority,
        canonicalUrl: row.canonicalUrl,
        normalizedUrl: row.normalizedUrl,
        claimKey: row.claimKey,
        checkedAt: normalizeDate(row.checkedAt),
        verifiedAt: normalizeDate(row.verifiedAt),
        verificationStatus: row.sourceVerificationStatus,
      };
      state.route.sources.set(JSON.stringify([evidence.sourceId, evidence.claimKey]), evidence);
    }
  }

  return [...states.values()]
    .map(({ route }) => {
      if (!route.id) throw new Error(`Pathway ${route.catalogItemId} has no canonical CareerBridge pathway ID.`);
      return { ...route, sources: [...route.sources.values()].sort((a, b) => a.claimKey.localeCompare(b.claimKey) || a.sourceName.localeCompare(b.sourceName)) };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function selectPathwayRows(
  database: ReturnType<typeof getDb>,
  mode: PathwayQueryMode,
  catalogItemId?: string,
) {
  const revisionJoin = mode === "published"
    ? and(
        eq(catalogItemRevisions.id, catalogItems.publishedRevisionId),
        eq(catalogItemRevisions.catalogItemId, catalogItems.id),
      )
    : eq(catalogItemRevisions.catalogItemId, catalogItems.id);

  return database
    .select({
      catalogItemId: catalogItems.id,
      revisionId: catalogItemRevisions.id,
      revisionNumber: catalogItemRevisions.revisionNumber,
      title: catalogItemRevisions.title,
      summary: catalogItemRevisions.summary,
      introduction: catalogItemRevisions.description,
      publicationStatus: catalogItemRevisions.publicationStatus,
      dataClassification: catalogItemRevisions.dataClassification,
      verificationStatus: catalogItemRevisions.verificationStatus,
      stage: pathwayRevisions.stage,
      courseStage: pathwayRevisions.courseStage,
      catalogueGroup: pathwayRevisions.catalogueGroup,
      category: pathwayRevisions.category,
      routeContent: pathwayRevisions.routeContent,
      aliasSourceSystem: canonicalAlias.sourceSystem,
      aliasExternalType: canonicalAlias.externalType,
      aliasExternalKey: canonicalAlias.externalKey,
      aliasExternalContextKey: canonicalAlias.externalContextKey,
      sourceId: sourceRegistry.id,
      sourceName: sourceRegistry.sourceName,
      authority: sourceRegistry.authority,
      canonicalUrl: sourceRegistry.canonicalUrl,
      normalizedUrl: sourceRegistry.normalizedUrl,
      claimKey: catalogRevisionSources.claimKey,
      checkedAt: catalogRevisionSources.checkedAt,
      verifiedAt: catalogRevisionSources.verifiedAt,
      sourceVerificationStatus: catalogRevisionSources.verificationStatus,
    })
    .from(catalogItems)
    .innerJoin(catalogItemRevisions, revisionJoin)
    .innerJoin(pathwayRevisions, eq(pathwayRevisions.revisionId, catalogItemRevisions.id))
    .leftJoin(
      canonicalAlias,
      and(
        eq(canonicalAlias.catalogItemId, catalogItems.id),
        eq(canonicalAlias.sourceSystem, "careerbridge"),
        eq(canonicalAlias.externalType, "pathway"),
        eq(canonicalAlias.externalContextKey, ""),
      ),
    )
    .leftJoin(catalogRevisionSources, eq(catalogRevisionSources.revisionId, catalogItemRevisions.id))
    .leftJoin(sourceRegistry, eq(sourceRegistry.id, catalogRevisionSources.sourceId))
    .where(and(
      eq(catalogItems.itemType, "pathway"),
      mode === "published" ? isNotNull(catalogItems.publishedRevisionId) : undefined,
      eq(catalogItemRevisions.publicationStatus, mode === "published" ? "published" : "draft"),
      eq(catalogItemRevisions.dataClassification, mode === "published" ? "real" : "demo"),
      mode === "published" ? eq(catalogItemRevisions.verificationStatus, "verified") : undefined,
      catalogItemId ? eq(catalogItems.id, catalogItemId) : undefined,
    ))
    .orderBy(asc(catalogItems.id), desc(catalogItemRevisions.revisionNumber), asc(canonicalAlias.externalKey), asc(catalogRevisionSources.claimKey));
}

async function resolvePathwayItemId(database: ReturnType<typeof getDb>, identifier: string): Promise<string | null> {
  const identityMatches = [eq(canonicalAlias.externalKey, identifier)];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
    identityMatches.push(eq(catalogItems.id, identifier));
  }
  const matches = await database
    .select({ catalogItemId: catalogItems.id })
    .from(catalogItems)
    .leftJoin(canonicalAlias, and(
      eq(canonicalAlias.catalogItemId, catalogItems.id),
      eq(canonicalAlias.sourceSystem, "careerbridge"),
      eq(canonicalAlias.externalType, "pathway"),
      eq(canonicalAlias.externalContextKey, ""),
    ))
    .where(and(eq(catalogItems.itemType, "pathway"), or(...identityMatches)));
  const itemIds = [...new Set(matches.map((match) => match.catalogItemId))];
  if (itemIds.length > 1) throw new Error(`Pathway identifier "${identifier}" resolves to multiple catalogue items.`);
  return itemIds[0] ?? null;
}

export async function listPublishedPathways(): Promise<StudyRoute[]> {
  return mapPathwayRows(await selectPathwayRows(getDb(), "published"));
}

export async function getPublishedPathway(identifier: string): Promise<StudyRoute | null> {
  if (!identifier) return null;
  const database = getDb();
  const itemId = await resolvePathwayItemId(database, identifier);
  if (!itemId) return null;
  return mapPathwayRows(await selectPathwayRows(database, "published", itemId))[0] ?? null;
}

function assertDevelopmentPreviewEnvironment() {
  const vercelEnvironment = process.env.VERCEL_ENV;
  const hosted = Boolean(process.env.VERCEL);
  if (
    process.env.NODE_ENV !== "development" ||
    (vercelEnvironment !== undefined && vercelEnvironment !== "development") ||
    (hosted && vercelEnvironment !== "development")
  ) {
    throw new Error("Pathway demo preview is available only in a development environment.");
  }
}

export async function listDemoPathwaysForDevelopment(): Promise<StudyRoute[]> {
  assertDevelopmentPreviewEnvironment();
  return mapPathwayRows(await selectPathwayRows(getDb(), "demo"), true);
}

export async function getDemoPathwayForDevelopment(identifier: string): Promise<StudyRoute | null> {
  assertDevelopmentPreviewEnvironment();
  if (!identifier) return null;
  const database = getDb();
  const itemId = await resolvePathwayItemId(database, identifier);
  if (!itemId) return null;
  return mapPathwayRows(await selectPathwayRows(database, "demo", itemId), true)[0] ?? null;
}
