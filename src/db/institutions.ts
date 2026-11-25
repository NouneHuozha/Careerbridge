import "server-only";

import {
  aliasedTable,
  and,
  asc,
  eq,
  isNotNull,
  or,
} from "drizzle-orm";
import { getDb } from "./client";
import {
  campusRevisions,
  catalogItemAliases,
  catalogItemRevisions,
  catalogItems,
  catalogRevisionSources,
  courseOfferingRevisions,
  courseRevisions,
  institutionRevisions,
  sourceRegistry,
} from "./schema/catalog";

const courseItems = aliasedTable(catalogItems, "institution_course_items");
const courseItemRevisions = aliasedTable(
  catalogItemRevisions,
  "institution_course_item_revisions",
);
const campusItems = aliasedTable(catalogItems, "institution_campus_items");
const campusItemRevisions = aliasedTable(
  catalogItemRevisions,
  "institution_campus_item_revisions",
);
const institutionItems = aliasedTable(catalogItems, "institution_parent_items");
const institutionItemRevisions = aliasedTable(
  catalogItemRevisions,
  "institution_parent_item_revisions",
);
const parentInstitutionRevisions = aliasedTable(
  institutionRevisions,
  "institution_parent_revisions",
);
const offeringCampusRevisions = aliasedTable(
  campusRevisions,
  "institution_offering_campus_revisions",
);
const offeringCourseRevisions = aliasedTable(
  courseRevisions,
  "institution_offering_course_revisions",
);

export type InstitutionAlias = {
  sourceSystem: string;
  externalType: string;
  externalKey: string;
  externalContextKey: string;
};

export type InstitutionProvenance = {
  sourceId: string;
  sourceName: string;
  authority: string | null;
  canonicalUrl: string | null;
  claimKey: string;
  checkedAt: Date | null;
  verifiedAt: Date | null;
  verificationStatus: string | null;
};

type ProvenanceRow = {
  sourceId: string | null;
  sourceName: string | null;
  authority: string | null;
  canonicalUrl: string | null;
  claimKey: string | null;
  checkedAt: Date | null;
  verifiedAt: Date | null;
  verificationStatus: string | null;
};

type AliasRow = {
  aliasSourceSystem: string | null;
  aliasExternalType: string | null;
  aliasExternalKey: string | null;
  aliasExternalContextKey: string | null;
};

type InstitutionRow = AliasRow &
  ProvenanceRow & {
    catalogItemId: string;
    revisionId: string;
    revisionNumber: number;
    title: string;
    summary: string | null;
    description: string | null;
    slug: string;
    initials: string;
    institutionType: string;
    ownership: string | null;
    institutionContent: unknown;
  };

type CampusRow = AliasRow &
  ProvenanceRow & {
    catalogItemId: string;
    revisionId: string;
    revisionNumber: number;
    title: string;
    summary: string | null;
    description: string | null;
    institutionItemId: string;
    stateId: string | null;
    campusContent: unknown;
  };

type OfferingRow = AliasRow &
  ProvenanceRow & {
    catalogItemId: string;
    revisionId: string;
    revisionNumber: number;
    title: string;
    summary: string | null;
    description: string | null;
    slug: string;
    courseItemId: string;
    courseRevisionId: string;
    campusItemId: string;
    campusRevisionId: string;
    institutionItemId: string;
    offeringDetails: unknown;
  };

type PublishedRecordBase = {
  catalogItemId: string;
  revisionId: string;
  title: string;
  summary: string | null;
  description: string | null;
  aliases: InstitutionAlias[];
  provenance: InstitutionProvenance[];
};

export type PublishedInstitution = PublishedRecordBase & {
  id: string;
  slug: string;
  initials: string;
  institutionType: string;
  ownership: string | null;
  content: Record<string, unknown>;
};

export type PublishedCampus = PublishedRecordBase & {
  id: string;
  institutionItemId: string;
  stateId: string | null;
  content: Record<string, unknown>;
};

export type PublishedCourseOffering = PublishedRecordBase & {
  id: string;
  slug: string;
  courseItemId: string;
  courseRevisionId: string;
  campusItemId: string;
  campusRevisionId: string;
  institutionItemId: string;
  details: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapJsonObject(value: unknown, property: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Published ${property} must be a JSON object.`);
  }
  return value;
}

function mapAlias(row: AliasRow): InstitutionAlias | null {
  if (
    row.aliasSourceSystem === null ||
    row.aliasExternalType === null ||
    row.aliasExternalKey === null ||
    row.aliasExternalContextKey === null
  ) {
    return null;
  }
  return {
    sourceSystem: row.aliasSourceSystem,
    externalType: row.aliasExternalType,
    externalKey: row.aliasExternalKey,
    externalContextKey: row.aliasExternalContextKey,
  };
}

function mapProvenance(row: ProvenanceRow): InstitutionProvenance | null {
  if (row.sourceId === null) return null;
  if (
    row.sourceName === null ||
    row.claimKey === null
  ) {
    throw new Error("Published institution data has incomplete source provenance.");
  }
  return {
    sourceId: row.sourceId,
    sourceName: row.sourceName,
    authority: row.authority,
    canonicalUrl: row.canonicalUrl,
    claimKey: row.claimKey,
    checkedAt: row.checkedAt,
    verifiedAt: row.verifiedAt,
    verificationStatus: row.verificationStatus,
  };
}

function addAlias(
  record: PublishedRecordBase & { id: string },
  alias: InstitutionAlias | null,
  expectedType: string,
) {
  if (!alias) return;
  if (alias.externalType !== expectedType) {
    throw new Error(`Published catalogue item ${record.catalogItemId} has an invalid alias type.`);
  }

  const key = JSON.stringify([
    alias.sourceSystem,
    alias.externalType,
    alias.externalKey,
    alias.externalContextKey,
  ]);
  if (!record.aliases.some((entry) => JSON.stringify([
    entry.sourceSystem,
    entry.externalType,
    entry.externalKey,
    entry.externalContextKey,
  ]) === key)) {
    record.aliases.push(alias);
  }

  if (
    expectedType === "institution" &&
    alias.sourceSystem === "careerbridge" &&
    alias.externalContextKey === ""
  ) {
    if (record.id !== alias.externalKey) {
      throw new Error(`Published catalogue item ${record.catalogItemId} has conflicting canonical aliases.`);
    }
  }
}

function addProvenance(
  record: PublishedRecordBase,
  provenance: InstitutionProvenance | null,
) {
  if (!provenance) return;
  const key = `${provenance.sourceId}:${provenance.claimKey}`;
  if (!record.provenance.some((entry) => `${entry.sourceId}:${entry.claimKey}` === key)) {
    record.provenance.push(provenance);
  }
}

function mapInstitutionRows(rows: InstitutionRow[]): PublishedInstitution[] {
  const records = new Map<string, PublishedInstitution>();
  for (const row of rows) {
    let record = records.get(row.catalogItemId);
    if (!record) {
      record = {
        id: row.slug,
        catalogItemId: row.catalogItemId,
        revisionId: row.revisionId,
        title: row.title,
        summary: row.summary,
        description: row.description,
        slug: row.slug,
        initials: row.initials,
        institutionType: row.institutionType,
        ownership: row.ownership,
        content: {},
        aliases: [],
        provenance: [],
      };
      records.set(row.catalogItemId, record);
      record.content = mapJsonObject(row.institutionContent, "institution content");
    } else if (record.revisionId !== row.revisionId) {
      throw new Error(`Institution ${row.catalogItemId} has conflicting published revisions.`);
    }
    addAlias(record, mapAlias(row), "institution");
    addProvenance(record, mapProvenance(row));
  }
  for (const [catalogItemId, record] of records) {
    const row = rows.find((entry) => entry.catalogItemId === catalogItemId);
    if (row) {
      record.content = sanitizeSensitiveClaims(
        record.content,
        "institution",
        verifiedClaimKeys(
          rows
            .filter((entry) => entry.catalogItemId === catalogItemId)
            .map(mapProvenance)
            .filter((entry): entry is InstitutionProvenance => entry !== null),
        ),
      );
    }
  }
  return [...records.values()].sort((left, right) => left.slug.localeCompare(right.slug));
}

function mapCampusRows(rows: CampusRow[]): PublishedCampus[] {
  const records = new Map<string, PublishedCampus>();
  for (const row of rows) {
    let record = records.get(row.catalogItemId);
    if (!record) {
      record = {
        id: row.catalogItemId,
        catalogItemId: row.catalogItemId,
        revisionId: row.revisionId,
        title: row.title,
        summary: row.summary,
        description: row.description,
        institutionItemId: row.institutionItemId,
        stateId: row.stateId,
        content: {},
        aliases: [],
        provenance: [],
      };
      records.set(row.catalogItemId, record);
      record.content = mapJsonObject(row.campusContent, "campus content");
    } else if (
      record.revisionId !== row.revisionId ||
      record.institutionItemId !== row.institutionItemId
    ) {
      throw new Error(`Campus ${row.catalogItemId} has conflicting published relationships.`);
    }
    addAlias(record, mapAlias(row), "campus");
    addProvenance(record, mapProvenance(row));
  }
  for (const [catalogItemId, record] of records) {
    record.content = sanitizeSensitiveClaims(
      record.content,
      "campus",
      verifiedClaimKeys(
        rows
          .filter((entry) => entry.catalogItemId === catalogItemId)
          .map(mapProvenance)
          .filter((entry): entry is InstitutionProvenance => entry !== null),
      ),
    );
  }
  return [...records.values()].sort((left, right) => left.title.localeCompare(right.title));
}

function snakeCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

const sensitiveClaimContainerPattern = /^(admission_cycles)$/i;
const sensitiveClaimPattern =
  /^(eligibility|admission|admissions|admission_process|entrance_exam|fees|fee|financial|financial_support|scholarship|scholarships)$/i;

function sanitizeSensitiveClaims(
  value: unknown,
  prefix: string,
  verifiedClaimKeys: Set<string>,
  path = "",
): Record<string, unknown> {
  const visit = (entry: unknown, currentPath: string): unknown => {
    if (Array.isArray(entry)) {
      return entry
        .map((item) => visit(item, currentPath))
        .filter((item) => item !== undefined);
    }
    if (!isRecord(entry)) return entry;

    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(entry)) {
      const nestedPath = [currentPath, snakeCase(key)].filter(Boolean).join(".");
      const normalizedKey = snakeCase(key);
      if (
        !sensitiveClaimContainerPattern.test(normalizedKey) &&
        sensitiveClaimPattern.test(normalizedKey) &&
        !verifiedClaimKeys.has(`${prefix}.${nestedPath}`)
      ) {
        continue;
      }
      const sanitized = visit(nestedValue, nestedPath);
      if (sanitized !== undefined) result[key] = sanitized;
    }
    return result;
  };
  return visit(value, path) as Record<string, unknown>;
}

function verifiedClaimKeys(provenance: InstitutionProvenance[]) {
  return new Set(
    provenance
      .filter(
        (entry) =>
          entry.verificationStatus === "verified" &&
          Boolean(entry.canonicalUrl) &&
          entry.checkedAt !== null &&
          entry.verifiedAt !== null,
      )
      .map((entry) => entry.claimKey),
  );
}

function mapOfferingRows(rows: OfferingRow[]): PublishedCourseOffering[] {
  const records = new Map<string, PublishedCourseOffering>();
  for (const row of rows) {
    let record = records.get(row.catalogItemId);
    if (!record) {
      record = {
        id: row.catalogItemId,
        catalogItemId: row.catalogItemId,
        revisionId: row.revisionId,
        title: row.title,
        summary: row.summary,
        description: row.description,
        slug: row.slug,
        courseItemId: row.courseItemId,
        courseRevisionId: row.courseRevisionId,
        campusItemId: row.campusItemId,
        campusRevisionId: row.campusRevisionId,
        institutionItemId: row.institutionItemId,
        details: {},
        aliases: [],
        provenance: [],
      };
      records.set(row.catalogItemId, record);
      record.details = mapJsonObject(row.offeringDetails, "course offering details");
    } else if (
      record.revisionId !== row.revisionId ||
      record.courseItemId !== row.courseItemId ||
      record.courseRevisionId !== row.courseRevisionId ||
      record.campusItemId !== row.campusItemId ||
      record.campusRevisionId !== row.campusRevisionId ||
      record.institutionItemId !== row.institutionItemId
    ) {
      throw new Error(`Course offering ${row.catalogItemId} has conflicting published relationships.`);
    }
    addAlias(record, mapAlias(row), "institution-offering");
    addProvenance(record, mapProvenance(row));
  }

  for (const [catalogItemId, record] of records) {
    const provenance = rows
      .filter((row) => row.catalogItemId === catalogItemId)
      .map(mapProvenance)
      .filter((entry): entry is InstitutionProvenance => entry !== null);
    record.details = sanitizeSensitiveClaims(
      record.details,
      "offering",
      verifiedClaimKeys(provenance),
    );
  }
  return [...records.values()].sort((left, right) => left.slug.localeCompare(right.slug));
}

const aliasSourceSystem = aliasedTable(catalogItemAliases, "institution_lookup_alias");

async function resolveCatalogItemId(
  database: ReturnType<typeof getDb>,
  itemType: "institution" | "campus" | "course_offering",
  externalType: "institution" | "campus" | "institution-offering",
  identifier: string,
  externalContextKey?: string,
): Promise<string | null> {
  const identifierMatches = [eq(aliasSourceSystem.externalKey, identifier)];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
    identifierMatches.push(eq(catalogItems.id, identifier));
  }

  const matches = await database
    .select({ catalogItemId: catalogItems.id })
    .from(catalogItems)
    .leftJoin(
      aliasSourceSystem,
      and(
        eq(aliasSourceSystem.catalogItemId, catalogItems.id),
        eq(aliasSourceSystem.externalType, externalType),
        externalContextKey === undefined
          ? undefined
          : eq(aliasSourceSystem.externalContextKey, externalContextKey),
      ),
    )
    .where(and(eq(catalogItems.itemType, itemType), or(...identifierMatches)));
  const itemIds = [...new Set(matches.map((match) => match.catalogItemId))];
  if (itemIds.length > 1) {
    throw new Error(`Institution catalogue identifier "${identifier}" resolves to multiple items.`);
  }
  return itemIds[0] ?? null;
}

function provenanceSelection() {
  return {
    sourceId: sourceRegistry.id,
    sourceName: sourceRegistry.sourceName,
    authority: sourceRegistry.authority,
    canonicalUrl: sourceRegistry.canonicalUrl,
    claimKey: catalogRevisionSources.claimKey,
    checkedAt: catalogRevisionSources.checkedAt,
    verifiedAt: catalogRevisionSources.verifiedAt,
    verificationStatus: catalogRevisionSources.verificationStatus,
  };
}

function aliasSelection() {
  return {
    aliasSourceSystem: catalogItemAliases.sourceSystem,
    aliasExternalType: catalogItemAliases.externalType,
    aliasExternalKey: catalogItemAliases.externalKey,
    aliasExternalContextKey: catalogItemAliases.externalContextKey,
  };
}

function publishedRevisionConditions() {
  return [
    isNotNull(catalogItems.publishedRevisionId),
    eq(catalogItemRevisions.publicationStatus, "published"),
    eq(catalogItemRevisions.dataClassification, "real"),
  ];
}

function selectPublishedInstitutions(database: ReturnType<typeof getDb>, catalogItemId?: string) {
  return database
    .select({
        catalogItemId: catalogItems.id,
        revisionId: catalogItemRevisions.id,
        revisionNumber: catalogItemRevisions.revisionNumber,
        title: catalogItemRevisions.title,
        summary: catalogItemRevisions.summary,
        description: catalogItemRevisions.description,
        slug: institutionRevisions.slug,
        initials: institutionRevisions.initials,
        institutionType: institutionRevisions.institutionType,
        ownership: institutionRevisions.ownership,
        institutionContent: institutionRevisions.institutionContent,
        ...aliasSelection(),
        ...provenanceSelection(),
    })
    .from(catalogItems)
    .innerJoin(
        catalogItemRevisions,
        and(
          eq(catalogItemRevisions.id, catalogItems.publishedRevisionId),
          eq(catalogItemRevisions.catalogItemId, catalogItems.id),
        ),
    )
    .innerJoin(
      institutionRevisions,
      eq(institutionRevisions.revisionId, catalogItemRevisions.id),
    )
    .leftJoin(
      catalogItemAliases,
      and(
        eq(catalogItemAliases.catalogItemId, catalogItems.id),
        eq(catalogItemAliases.sourceSystem, "careerbridge"),
      ),
    )
    .leftJoin(
      catalogRevisionSources,
      eq(catalogRevisionSources.revisionId, catalogItemRevisions.id),
    )
    .leftJoin(sourceRegistry, eq(sourceRegistry.id, catalogRevisionSources.sourceId))
    .where(
      and(
        eq(catalogItems.itemType, "institution"),
        ...publishedRevisionConditions(),
        catalogItemId ? eq(catalogItems.id, catalogItemId) : undefined,
      ),
    )
    .orderBy(asc(institutionRevisions.slug));
}

function selectPublishedCampuses(database: ReturnType<typeof getDb>, catalogItemId?: string) {
  return database
    .select({
      catalogItemId: catalogItems.id,
      revisionId: catalogItemRevisions.id,
      revisionNumber: catalogItemRevisions.revisionNumber,
      title: catalogItemRevisions.title,
      summary: catalogItemRevisions.summary,
      description: catalogItemRevisions.description,
      institutionItemId: campusRevisions.institutionItemId,
      stateId: campusRevisions.stateId,
      campusContent: campusRevisions.campusContent,
      aliasSourceSystem: catalogItemAliases.sourceSystem,
      aliasExternalType: catalogItemAliases.externalType,
      aliasExternalKey: catalogItemAliases.externalKey,
      aliasExternalContextKey: catalogItemAliases.externalContextKey,
      ...provenanceSelection(),
    })
    .from(catalogItems)
    .innerJoin(
      catalogItemRevisions,
      and(
        eq(catalogItemRevisions.id, catalogItems.publishedRevisionId),
        eq(catalogItemRevisions.catalogItemId, catalogItems.id),
      ),
    )
    .innerJoin(campusRevisions, eq(campusRevisions.revisionId, catalogItemRevisions.id))
    .innerJoin(institutionItems, eq(institutionItems.id, campusRevisions.institutionItemId))
    .innerJoin(
      institutionItemRevisions,
      and(
        eq(institutionItemRevisions.id, institutionItems.publishedRevisionId),
        eq(institutionItemRevisions.catalogItemId, institutionItems.id),
      ),
    )
    .innerJoin(
      parentInstitutionRevisions,
      eq(parentInstitutionRevisions.revisionId, institutionItemRevisions.id),
    )
    .leftJoin(
      catalogItemAliases,
      and(
        eq(catalogItemAliases.catalogItemId, catalogItems.id),
        eq(catalogItemAliases.sourceSystem, "careerbridge"),
      ),
    )
    .leftJoin(
      catalogRevisionSources,
      eq(catalogRevisionSources.revisionId, catalogItemRevisions.id),
    )
    .leftJoin(sourceRegistry, eq(sourceRegistry.id, catalogRevisionSources.sourceId))
    .where(
      and(
        eq(catalogItems.itemType, "campus"),
        ...publishedRevisionConditions(),
        eq(institutionItems.itemType, "institution"),
        eq(institutionItemRevisions.publicationStatus, "published"),
        eq(institutionItemRevisions.dataClassification, "real"),
        isNotNull(institutionItems.publishedRevisionId),
        catalogItemId ? eq(catalogItems.id, catalogItemId) : undefined,
      ),
    )
    .orderBy(asc(catalogItemRevisions.title));
}

function selectPublishedOfferings(database: ReturnType<typeof getDb>, catalogItemId?: string) {
  return database
    .select({
      catalogItemId: catalogItems.id,
      revisionId: catalogItemRevisions.id,
      revisionNumber: catalogItemRevisions.revisionNumber,
      title: catalogItemRevisions.title,
      summary: catalogItemRevisions.summary,
      description: catalogItemRevisions.description,
      slug: courseOfferingRevisions.slug,
      courseItemId: courseOfferingRevisions.courseItemId,
      courseRevisionId: courseOfferingRevisions.courseRevisionId,
      campusItemId: courseOfferingRevisions.campusItemId,
      campusRevisionId: courseOfferingRevisions.campusRevisionId,
      institutionItemId: offeringCampusRevisions.institutionItemId,
      offeringDetails: courseOfferingRevisions.offeringDetails,
      ...aliasSelection(),
      ...provenanceSelection(),
    })
    .from(catalogItems)
    .innerJoin(
      catalogItemRevisions,
      and(
        eq(catalogItemRevisions.id, catalogItems.publishedRevisionId),
        eq(catalogItemRevisions.catalogItemId, catalogItems.id),
      ),
    )
    .innerJoin(
      courseOfferingRevisions,
      eq(courseOfferingRevisions.revisionId, catalogItemRevisions.id),
    )
    .innerJoin(courseItems, eq(courseItems.id, courseOfferingRevisions.courseItemId))
    .innerJoin(
      courseItemRevisions,
      and(
        eq(courseItemRevisions.id, courseOfferingRevisions.courseRevisionId),
        eq(courseItemRevisions.catalogItemId, courseItems.id),
      ),
    )
    .innerJoin(
      offeringCourseRevisions,
      eq(offeringCourseRevisions.revisionId, courseItemRevisions.id),
    )
    .innerJoin(campusItems, eq(campusItems.id, courseOfferingRevisions.campusItemId))
    .innerJoin(
      campusItemRevisions,
      and(
        eq(campusItemRevisions.id, courseOfferingRevisions.campusRevisionId),
        eq(campusItemRevisions.catalogItemId, campusItems.id),
      ),
    )
    .innerJoin(
      offeringCampusRevisions,
      eq(offeringCampusRevisions.revisionId, campusItemRevisions.id),
    )
    .innerJoin(
      institutionItems,
      eq(institutionItems.id, offeringCampusRevisions.institutionItemId),
    )
    .innerJoin(
      institutionItemRevisions,
      and(
        eq(institutionItemRevisions.id, institutionItems.publishedRevisionId),
        eq(institutionItemRevisions.catalogItemId, institutionItems.id),
      ),
    )
    .innerJoin(
      parentInstitutionRevisions,
      eq(parentInstitutionRevisions.revisionId, institutionItemRevisions.id),
    )
    .leftJoin(
      catalogItemAliases,
      and(
        eq(catalogItemAliases.catalogItemId, catalogItems.id),
        eq(catalogItemAliases.sourceSystem, "careerbridge"),
      ),
    )
    .leftJoin(
      catalogRevisionSources,
      eq(catalogRevisionSources.revisionId, catalogItemRevisions.id),
    )
    .leftJoin(sourceRegistry, eq(sourceRegistry.id, catalogRevisionSources.sourceId))
    .where(
      and(
        eq(catalogItems.itemType, "course_offering"),
        ...publishedRevisionConditions(),
        eq(courseItems.itemType, "course"),
        isNotNull(courseItems.publishedRevisionId),
        eq(courseItemRevisions.publicationStatus, "published"),
        eq(courseItemRevisions.dataClassification, "real"),
        eq(campusItems.itemType, "campus"),
        isNotNull(campusItems.publishedRevisionId),
        eq(campusItemRevisions.publicationStatus, "published"),
        eq(campusItemRevisions.dataClassification, "real"),
        eq(institutionItems.itemType, "institution"),
        isNotNull(institutionItems.publishedRevisionId),
        eq(institutionItemRevisions.publicationStatus, "published"),
        eq(institutionItemRevisions.dataClassification, "real"),
        catalogItemId ? eq(catalogItems.id, catalogItemId) : undefined,
      ),
    )
    .orderBy(asc(courseOfferingRevisions.slug));
}

export async function listPublishedInstitutions(): Promise<PublishedInstitution[]> {
  return mapInstitutionRows(await selectPublishedInstitutions(getDb()));
}

export async function getPublishedInstitution(
  identifier: string,
): Promise<PublishedInstitution | null> {
  if (!identifier) return null;
  const database = getDb();
  const catalogItemId = await resolveCatalogItemId(
    database,
    "institution",
    "institution",
    identifier,
    "",
  );
  if (!catalogItemId) return null;
  return mapInstitutionRows(await selectPublishedInstitutions(database, catalogItemId))[0] ?? null;
}

export async function listPublishedCampuses(): Promise<PublishedCampus[]> {
  return mapCampusRows(await selectPublishedCampuses(getDb()));
}

export async function getPublishedCampus(identifier: string): Promise<PublishedCampus | null> {
  if (!identifier) return null;
  const database = getDb();
  const catalogItemId = await resolveCatalogItemId(
    database,
    "campus",
    "campus",
    identifier,
    "",
  );
  if (!catalogItemId) return null;
  return mapCampusRows(await selectPublishedCampuses(database, catalogItemId))[0] ?? null;
}

export async function listPublishedCourseOfferings(): Promise<PublishedCourseOffering[]> {
  return mapOfferingRows(await selectPublishedOfferings(getDb()));
}

export async function getPublishedCourseOffering(
  identifier: string,
  externalContextKey?: string,
): Promise<PublishedCourseOffering | null> {
  if (!identifier) return null;
  const database = getDb();
  const catalogItemId = await resolveCatalogItemId(
    database,
    "course_offering",
    "institution-offering",
    identifier,
    externalContextKey,
  );
  if (!catalogItemId) return null;
  return mapOfferingRows(await selectPublishedOfferings(database, catalogItemId))[0] ?? null;
}

function assertDevelopmentPreviewEnvironment() {
  const vercelEnvironment = process.env.VERCEL_ENV;
  const hosted = Boolean(process.env.VERCEL);
  if (
    process.env.NODE_ENV !== "development" ||
    (vercelEnvironment !== undefined && vercelEnvironment !== "development") ||
    (hosted && vercelEnvironment !== "development")
  ) {
    throw new Error("Institution demo preview is available only in a development environment.");
  }
}

export async function listDemoInstitutionsForDevelopment(): Promise<PublishedInstitution[]> {
  assertDevelopmentPreviewEnvironment();
  return [];
}
