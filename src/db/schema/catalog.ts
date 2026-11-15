import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

type JsonObject = Record<string, unknown>;

export type CatalogItemType =
  | "field"
  | "institution"
  | "campus"
  | "course"
  | "course_offering"
  | "pathway"
  | "examination"
  | "scholarship";

export const states = pgTable(
  "states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countryCode: text("country_code").notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    unique("states_country_name_unique").on(table.countryCode, table.name),
    check("states_country_code_check", sql`${table.countryCode} = 'IN'`),
  ],
);

export const catalogItems = pgTable(
  "catalog_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    itemType: text("item_type").$type<CatalogItemType>().notNull(),
    publishedRevisionId: uuid("published_revision_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("catalog_items_id_type_unique").on(table.id, table.itemType),
    index("catalog_items_type_idx").on(table.itemType),
    index("catalog_items_published_revision_idx").on(table.publishedRevisionId),
    check(
      "catalog_items_type_check",
      sql`${table.itemType} IN ('field', 'institution', 'campus', 'course', 'course_offering', 'pathway', 'examination', 'scholarship')`,
    ),
  ],
);

export const catalogItemAliases = pgTable(
  "catalog_item_aliases",
  {
    sourceSystem: text("source_system").notNull(),
    externalType: text("external_type").notNull(),
    externalKey: text("external_key").notNull(),
    externalContextKey: text("external_context_key").notNull().default(""),
    catalogItemId: uuid("catalog_item_id")
      .notNull()
      .references(() => catalogItems.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      name: "catalog_item_aliases_pk",
      columns: [
        table.sourceSystem,
        table.externalType,
        table.externalKey,
        table.externalContextKey,
      ],
    }),
    index("catalog_item_aliases_item_idx").on(table.catalogItemId),
    check(
      "catalog_item_aliases_external_values_check",
      sql`${table.sourceSystem} <> '' AND ${table.externalType} <> '' AND ${table.externalKey} <> ''`,
    ),
    check(
      "catalog_item_aliases_context_check",
      sql`${table.externalType} = 'institution-offering' OR ${table.externalContextKey} = ''`,
    ),
  ],
);

export const catalogItemRevisions = pgTable(
  "catalog_item_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    catalogItemId: uuid("catalog_item_id")
      .notNull()
      .references(() => catalogItems.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    publicationStatus: text("publication_status").notNull().default("draft"),
    title: text("title").notNull(),
    summary: text("summary"),
    description: text("description"),
    dataClassification: text("data_classification").notNull(),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
    publishedBy: integer("published_by"),
  },
  (table) => [
    unique("catalog_item_revisions_item_revision_unique").on(
      table.catalogItemId,
      table.revisionNumber,
    ),
    unique("catalog_item_revisions_item_id_unique").on(table.catalogItemId, table.id),
    index("catalog_item_revisions_status_idx").on(table.publicationStatus),
    index("catalog_item_revisions_classification_idx").on(table.dataClassification),
    index("catalog_item_revisions_verification_idx").on(table.verificationStatus),
    index("catalog_item_revisions_item_status_idx").on(
      table.catalogItemId,
      table.publicationStatus,
    ),
    check("catalog_item_revisions_number_check", sql`${table.revisionNumber} >= 1`),
    check(
      "catalog_item_revisions_publication_status_check",
      sql`${table.publicationStatus} IN ('draft', 'in_review', 'approved', 'published', 'archived', 'rejected')`,
    ),
    check(
      "catalog_item_revisions_classification_check",
      sql`${table.dataClassification} IN ('real', 'demo', 'test')`,
    ),
    check(
      "catalog_item_revisions_verification_check",
      sql`${table.verificationStatus} IN ('not_collected', 'unverified', 'pending_review', 'verified', 'partially_verified', 'disputed', 'unavailable', 'stale', 'expired', 'superseded')`,
    ),
    check(
      "catalog_item_revisions_published_at_check",
      sql`(${table.publicationStatus} = 'published') = (${table.publishedAt} IS NOT NULL)`,
    ),
  ],
);

export const fieldRevisions = pgTable(
  "field_revisions",
  {
    revisionId: uuid("revision_id")
      .primaryKey()
      .references(() => catalogItemRevisions.id, { onDelete: "cascade" }),
    fieldContent: jsonb("field_content").$type<JsonObject>().notNull().default({}),
  },
  (table) => [
    check(
      "field_revisions_content_object_check",
      sql`jsonb_typeof(${table.fieldContent}) = 'object'`,
    ),
  ],
);

export const institutionRevisions = pgTable(
  "institution_revisions",
  {
    revisionId: uuid("revision_id")
      .primaryKey()
      .references(() => catalogItemRevisions.id, { onDelete: "cascade" }),
    institutionType: text("institution_type").notNull(),
    ownership: text("ownership"),
    institutionContent: jsonb("institution_content").$type<JsonObject>().notNull().default({}),
  },
  (table) => [
    check(
      "institution_revisions_type_check",
      sql`${table.institutionType} IN ('College', 'University', 'Institute', 'School', 'Training centre')`,
    ),
    check(
      "institution_revisions_ownership_check",
      sql`${table.ownership} IS NULL OR ${table.ownership} IN ('Government', 'Private', 'Public')`,
    ),
    check(
      "institution_revisions_content_object_check",
      sql`jsonb_typeof(${table.institutionContent}) = 'object'`,
    ),
  ],
);

export const campusRevisions = pgTable(
  "campus_revisions",
  {
    revisionId: uuid("revision_id")
      .primaryKey()
      .references(() => catalogItemRevisions.id, { onDelete: "cascade" }),
    institutionItemId: uuid("institution_item_id")
      .notNull()
      .references(() => catalogItems.id, { onDelete: "restrict" }),
    stateId: uuid("state_id").references(() => states.id, { onDelete: "restrict" }),
    campusContent: jsonb("campus_content").$type<JsonObject>().notNull().default({}),
  },
  (table) => [
    index("campus_revisions_institution_idx").on(table.institutionItemId),
    index("campus_revisions_state_idx").on(table.stateId),
    check(
      "campus_revisions_content_object_check",
      sql`jsonb_typeof(${table.campusContent}) = 'object'`,
    ),
  ],
);

export const courseRevisions = pgTable(
  "course_revisions",
  {
    revisionId: uuid("revision_id")
      .primaryKey()
      .references(() => catalogItemRevisions.id, { onDelete: "cascade" }),
    fieldItemId: uuid("field_item_id").notNull(),
    fieldRevisionId: uuid("field_revision_id").notNull(),
    qualification: text("qualification").notNull(),
    studyStages: jsonb("study_stages").$type<string[]>().notNull().default([]),
    courseContent: jsonb("course_content").$type<JsonObject>().notNull().default({}),
  },
  (table) => [
    foreignKey({
      name: "course_revisions_field_revision_fk",
      columns: [table.fieldItemId, table.fieldRevisionId],
      foreignColumns: [catalogItemRevisions.catalogItemId, catalogItemRevisions.id],
    }).onDelete("restrict"),
    index("course_revisions_field_item_idx").on(table.fieldItemId),
    index("course_revisions_field_revision_idx").on(table.fieldRevisionId),
    check(
      "course_revisions_qualification_check",
      sql`${table.qualification} IN ('Higher secondary', 'Degree', 'Diploma', 'Certificate', 'Vocational', 'Professional', 'Skill training')`,
    ),
    check(
      "course_revisions_stages_array_check",
      sql`jsonb_typeof(${table.studyStages}) = 'array'`,
    ),
    check(
      "course_revisions_content_object_check",
      sql`jsonb_typeof(${table.courseContent}) = 'object'`,
    ),
  ],
);

export const courseOfferingRevisions = pgTable(
  "course_offering_revisions",
  {
    revisionId: uuid("revision_id")
      .primaryKey()
      .references(() => catalogItemRevisions.id, { onDelete: "cascade" }),
    courseItemId: uuid("course_item_id").notNull(),
    courseRevisionId: uuid("course_revision_id").notNull(),
    campusItemId: uuid("campus_item_id").notNull(),
    campusRevisionId: uuid("campus_revision_id").notNull(),
    offeringContent: jsonb("offering_content").$type<JsonObject>().notNull().default({}),
  },
  (table) => [
    foreignKey({
      name: "course_offering_revisions_course_revision_fk",
      columns: [table.courseItemId, table.courseRevisionId],
      foreignColumns: [catalogItemRevisions.catalogItemId, catalogItemRevisions.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "course_offering_revisions_campus_revision_fk",
      columns: [table.campusItemId, table.campusRevisionId],
      foreignColumns: [catalogItemRevisions.catalogItemId, catalogItemRevisions.id],
    }).onDelete("restrict"),
    index("course_offering_revisions_course_idx").on(table.courseItemId, table.courseRevisionId),
    index("course_offering_revisions_campus_idx").on(table.campusItemId, table.campusRevisionId),
    check(
      "course_offering_revisions_content_object_check",
      sql`jsonb_typeof(${table.offeringContent}) = 'object'`,
    ),
  ],
);

export const pathwayRevisions = pgTable(
  "pathway_revisions",
  {
    revisionId: uuid("revision_id")
      .primaryKey()
      .references(() => catalogItemRevisions.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    courseStage: text("course_stage").notNull(),
    pathwayContent: jsonb("pathway_content").$type<JsonObject>().notNull().default({}),
  },
  (table) => [
    check(
      "pathway_revisions_stage_check",
      sql`${table.stage} IN ('class-10', 'class-12')`,
    ),
    check(
      "pathway_revisions_course_stage_check",
      sql`${table.courseStage} IN ('class-10', 'class-12')`,
    ),
    check(
      "pathway_revisions_content_object_check",
      sql`jsonb_typeof(${table.pathwayContent}) = 'object'`,
    ),
  ],
);

export const examinationRevisions = pgTable(
  "examination_revisions",
  {
    revisionId: uuid("revision_id")
      .primaryKey()
      .references(() => catalogItemRevisions.id, { onDelete: "cascade" }),
    level: text("level").notNull(),
    stages: jsonb("stages").$type<string[]>().notNull().default([]),
    examinationContent: jsonb("examination_content").$type<JsonObject>().notNull().default({}),
  },
  (table) => [
    check(
      "examination_revisions_level_check",
      sql`${table.level} IN ('national', 'state', 'institution')`,
    ),
    check(
      "examination_revisions_stages_array_check",
      sql`jsonb_typeof(${table.stages}) = 'array'`,
    ),
    check(
      "examination_revisions_content_object_check",
      sql`jsonb_typeof(${table.examinationContent}) = 'object'`,
    ),
  ],
);

export const scholarshipRevisions = pgTable(
  "scholarship_revisions",
  {
    revisionId: uuid("revision_id")
      .primaryKey()
      .references(() => catalogItemRevisions.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    eligibilityRegions: jsonb("eligibility_regions").$type<"all" | string[]>().notNull(),
    scholarshipContent: jsonb("scholarship_content").$type<JsonObject>().notNull().default({}),
  },
  (table) => [
    check(
      "scholarship_revisions_status_check",
      sql`${table.status} IN ('open', 'upcoming', 'closed', 'unknown')`,
    ),
    check(
      "scholarship_revisions_eligibility_regions_check",
      sql`(${table.eligibilityRegions} = '"all"'::jsonb) OR jsonb_typeof(${table.eligibilityRegions}) = 'array'`,
    ),
    check(
      "scholarship_revisions_content_object_check",
      sql`jsonb_typeof(${table.scholarshipContent}) = 'object'`,
    ),
  ],
);

export const sourceRegistry = pgTable(
  "source_registry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    sourceType: text("source_type").notNull(),
    status: text("status").notNull().default("active"),
    canonicalUrl: text("canonical_url"),
    normalizedUrl: text("normalized_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("source_registry_normalized_url_unique").on(table.normalizedUrl),
    index("source_registry_type_status_idx").on(table.sourceType, table.status),
    check(
      "source_registry_type_check",
      sql`${table.sourceType} IN ('official_api', 'structured_government_dataset', 'official_download', 'official_public_web_page', 'admin_manual_entry')`,
    ),
    check(
      "source_registry_status_check",
      sql`${table.status} IN ('active', 'paused', 'retired')`,
    ),
    check(
      "source_registry_url_pair_check",
      sql`(${table.canonicalUrl} IS NULL) = (${table.normalizedUrl} IS NULL)`,
    ),
  ],
);

export const catalogRevisionSources = pgTable(
  "catalog_revision_sources",
  {
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => catalogItemRevisions.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sourceRegistry.id, { onDelete: "restrict" }),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verificationStatus: text("verification_status"),
  },
  (table) => [
    primaryKey({
      name: "catalog_revision_sources_pk",
      columns: [table.revisionId, table.sourceId],
    }),
    index("catalog_revision_sources_source_idx").on(table.sourceId),
    check(
      "catalog_revision_sources_verification_check",
      sql`${table.verificationStatus} IS NULL OR ${table.verificationStatus} IN ('not_collected', 'unverified', 'pending_review', 'verified', 'partially_verified', 'disputed', 'unavailable', 'stale', 'expired', 'superseded')`,
    ),
  ],
);
