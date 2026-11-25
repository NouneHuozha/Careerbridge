import "server-only";

import { and, asc, eq, isNotNull, or } from "drizzle-orm";
import { getDb } from "./client";
import {
  catalogItemAliases,
  catalogItemRevisions,
  catalogItems,
  catalogRevisionSources,
  fieldRevisions,
  sourceRegistry,
} from "./schema/catalog";

const fieldContentKeys = [
  "introduction",
  "broadlyInvolves",
  "activitiesAndWorkAreas",
  "learningAndSubjectConnections",
  "courseFamiliesToExplore",
  "furtherExploration",
] as const;

export type FieldContent = Record<(typeof fieldContentKeys)[number], string>;

export type FieldAlias = {
  sourceSystem: string;
  externalType: string;
  externalKey: string;
  externalContextKey: string;
};

export type FieldProvenance = {
  sourceId: string;
  sourceName: string;
  authority: string | null;
  canonicalUrl: string | null;
  category: string;
  sourceType: string;
  claimKey: string;
  checkedAt: Date | null;
  verifiedAt: Date | null;
  verificationStatus: string | null;
};

export type PublishedField = {
  id: string;
  catalogItemId: string;
  title: string;
  summary: string | null;
  description: string | null;
  content: FieldContent;
  aliases: FieldAlias[];
  provenance: FieldProvenance[];
};

type FieldQueryRow = {
  catalogItemId: string;
  revisionId: string;
  title: string;
  summary: string | null;
  description: string | null;
  fieldContent: Record<string, unknown>;
  aliasSourceSystem: string | null;
  aliasExternalType: string | null;
  aliasExternalKey: string | null;
  aliasExternalContextKey: string | null;
  sourceId: string | null;
  sourceName: string | null;
  authority: string | null;
  canonicalUrl: string | null;
  category: string | null;
  sourceType: string | null;
  claimKey: string | null;
  checkedAt: Date | null;
  verifiedAt: Date | null;
  verificationStatus: string | null;
};

function mapFieldContent(value: unknown): FieldContent {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Published field content must be a JSON object.");
  }

  const content = {} as FieldContent;
  for (const key of fieldContentKeys) {
    const entry = (value as Record<string, unknown>)[key];
    if (typeof entry !== "string") {
      throw new Error(`Published field content is missing string property "${key}".`);
    }
    content[key] = entry;
  }
  return content;
}

function mapPublishedFields(rows: FieldQueryRow[]): PublishedField[] {
  const fields = new Map<
    string,
    {
      id: string | null;
      catalogItemId: string;
      title: string;
      summary: string | null;
      description: string | null;
      content: FieldContent;
      aliases: Map<string, FieldAlias>;
      provenance: Map<string, FieldProvenance>;
    }
  >();

  for (const row of rows) {
    let field = fields.get(row.catalogItemId);
    if (!field) {
      field = {
        id: null,
        catalogItemId: row.catalogItemId,
        title: row.title,
        summary: row.summary,
        description: row.description,
        content: mapFieldContent(row.fieldContent),
        aliases: new Map(),
        provenance: new Map(),
      };
      fields.set(row.catalogItemId, field);
    }

    if (
      row.aliasSourceSystem !== null &&
      row.aliasExternalType !== null &&
      row.aliasExternalKey !== null &&
      row.aliasExternalContextKey !== null
    ) {
      const alias: FieldAlias = {
        sourceSystem: row.aliasSourceSystem,
        externalType: row.aliasExternalType,
        externalKey: row.aliasExternalKey,
        externalContextKey: row.aliasExternalContextKey,
      };
      field.aliases.set(JSON.stringify(Object.values(alias)), alias);

      if (alias.sourceSystem === "careerbridge" && alias.externalType === "field" && !alias.externalContextKey) {
        if (field.id !== null && field.id !== alias.externalKey) {
          throw new Error(`Field ${row.catalogItemId} has multiple canonical CareerBridge IDs.`);
        }
        field.id = alias.externalKey;
      }
    }

    if (row.sourceId !== null) {
      if (
        row.sourceName === null ||
        row.category === null ||
        row.sourceType === null ||
        row.claimKey === null
      ) {
        throw new Error(`Published field ${row.catalogItemId} has incomplete source provenance.`);
      }
      const provenance: FieldProvenance = {
        sourceId: row.sourceId,
        sourceName: row.sourceName,
        authority: row.authority,
        canonicalUrl: row.canonicalUrl,
        category: row.category,
        sourceType: row.sourceType,
        claimKey: row.claimKey,
        checkedAt: row.checkedAt,
        verifiedAt: row.verifiedAt,
        verificationStatus: row.verificationStatus,
      };
      field.provenance.set(`${row.sourceId}:${row.claimKey}`, provenance);
    }
  }

  return [...fields.values()]
    .map((field) => {
      if (field.id === null) {
        throw new Error(`Published field ${field.catalogItemId} has no canonical CareerBridge field ID.`);
      }
      return {
        id: field.id,
        catalogItemId: field.catalogItemId,
        title: field.title,
        summary: field.summary,
        description: field.description,
        content: field.content,
        aliases: [...field.aliases.values()],
        provenance: [...field.provenance.values()],
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function selectPublishedFieldRows(
  database: ReturnType<typeof getDb>,
  catalogItemId?: string,
) {
  return database
    .select({
      catalogItemId: catalogItems.id,
      revisionId: catalogItemRevisions.id,
      title: catalogItemRevisions.title,
      summary: catalogItemRevisions.summary,
      description: catalogItemRevisions.description,
      fieldContent: fieldRevisions.fieldContent,
      aliasSourceSystem: catalogItemAliases.sourceSystem,
      aliasExternalType: catalogItemAliases.externalType,
      aliasExternalKey: catalogItemAliases.externalKey,
      aliasExternalContextKey: catalogItemAliases.externalContextKey,
      sourceId: sourceRegistry.id,
      sourceName: sourceRegistry.sourceName,
      authority: sourceRegistry.authority,
      canonicalUrl: sourceRegistry.canonicalUrl,
      category: sourceRegistry.category,
      sourceType: sourceRegistry.sourceType,
      claimKey: catalogRevisionSources.claimKey,
      checkedAt: catalogRevisionSources.checkedAt,
      verifiedAt: catalogRevisionSources.verifiedAt,
      verificationStatus: catalogRevisionSources.verificationStatus,
    })
    .from(catalogItems)
    .innerJoin(
      catalogItemRevisions,
      and(
        eq(catalogItemRevisions.id, catalogItems.publishedRevisionId),
        eq(catalogItemRevisions.catalogItemId, catalogItems.id),
      ),
    )
    .innerJoin(fieldRevisions, eq(fieldRevisions.revisionId, catalogItemRevisions.id))
    .leftJoin(
      catalogItemAliases,
      and(
        eq(catalogItemAliases.catalogItemId, catalogItems.id),
        eq(catalogItemAliases.externalType, "field"),
      ),
    )
    .leftJoin(
      catalogRevisionSources,
      eq(catalogRevisionSources.revisionId, catalogItemRevisions.id),
    )
    .leftJoin(sourceRegistry, eq(sourceRegistry.id, catalogRevisionSources.sourceId))
    .where(
      and(
        eq(catalogItems.itemType, "field"),
        isNotNull(catalogItems.publishedRevisionId),
        eq(catalogItemRevisions.publicationStatus, "published"),
        eq(catalogItemRevisions.dataClassification, "real"),
        catalogItemId ? eq(catalogItems.id, catalogItemId) : undefined,
      ),
    )
    .orderBy(asc(catalogItemAliases.externalKey), asc(catalogRevisionSources.claimKey));
}

export async function listPublishedFields(): Promise<PublishedField[]> {
  const rows = await selectPublishedFieldRows(getDb());
  return mapPublishedFields(rows);
}

export async function getPublishedField(identifier: string): Promise<PublishedField | null> {
  if (!identifier) return null;

  const database = getDb();
  const identifierMatches = [eq(catalogItemAliases.externalKey, identifier)];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
    identifierMatches.push(eq(catalogItems.id, identifier));
  }

  const matches = await database
    .select({ catalogItemId: catalogItems.id })
    .from(catalogItems)
    .leftJoin(
      catalogItemAliases,
      and(
        eq(catalogItemAliases.catalogItemId, catalogItems.id),
        eq(catalogItemAliases.externalType, "field"),
        eq(catalogItemAliases.externalContextKey, ""),
      ),
    )
    .where(
      and(
        eq(catalogItems.itemType, "field"),
        or(...identifierMatches),
      ),
    );
  const itemIds = [...new Set(matches.map((match) => match.catalogItemId))];
  if (itemIds.length > 1) {
    throw new Error(`Field identifier "${identifier}" resolves to multiple catalogue items.`);
  }
  if (itemIds.length === 0) return null;

  const rows = await selectPublishedFieldRows(database, itemIds[0]);
  return mapPublishedFields(rows)[0] ?? null;
}
