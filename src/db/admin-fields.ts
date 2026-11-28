import "server-only";

import type { Pool } from "pg";
import { getPool } from "./pool";
import type { FieldContent } from "./fields";

export type AdminFieldPublicationStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived"
  | "rejected";

export type AdminFieldVerificationStatus =
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

export type AdminFieldsSort =
  | "name_asc"
  | "name_desc"
  | "created_desc"
  | "created_asc"
  | "updated_desc";

export type AdminFieldsFilters = {
  search: string;
  publicationState: "all" | "published" | "unpublished" | "archived";
  reviewState: "all" | "needs_review" | "draft";
  sort: AdminFieldsSort;
  page: number;
};

export type AdminFieldMetrics = {
  totalRecords: number;
  publishedRecords: number;
  needsReviewRecords: number;
};

export type AdminFieldRecord = {
  id: string;
  catalogItemId: string;
  latestRevisionId: string | null;
  publishedRevisionId: string | null;
  title: string | null;
  summary: string | null;
  revisionNumber: number | null;
  publicationStatus: AdminFieldPublicationStatus | null;
  verificationStatus: AdminFieldVerificationStatus | null;
  publishedVersionAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  dataClassification: "real" | "demo" | "test" | null;
  provenanceCount: number;
};

export type AdminFieldsDirectory = {
  metrics: AdminFieldMetrics;
  records: AdminFieldRecord[];
  totalFiltered: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type AdminFieldRevision = {
  id: string;
  revisionNumber: number;
  title: string;
  summary: string | null;
  description: string | null;
  publicationStatus: AdminFieldPublicationStatus;
  verificationStatus: AdminFieldVerificationStatus;
  dataClassification: "real" | "demo" | "test";
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  provenanceCount: number;
  content: Partial<FieldContent>;
};

export type AdminFieldSource = {
  id: string;
  name: string;
  authority: string | null;
  url: string | null;
  claimKey: string;
  checkedAt: Date | null;
  verifiedAt: Date | null;
  verificationStatus: AdminFieldVerificationStatus | null;
};

export type AdminFieldCourse = {
  id: string | null;
  catalogItemId: string;
  title: string;
  revisionNumber: number;
  fieldRevisionNumber: number | null;
};

export type AdminFieldDetail = {
  id: string;
  catalogItemId: string;
  latestRevisionId: string | null;
  publishedRevisionId: string | null;
  title: string | null;
  summary: string | null;
  description: string | null;
  revisionNumber: number | null;
  publicationStatus: AdminFieldPublicationStatus | null;
  verificationStatus: AdminFieldVerificationStatus | null;
  publishedVersionAvailable: boolean;
  hasImage: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
  dataClassification: "real" | "demo" | "test" | null;
  content: Partial<FieldContent>;
  revisions: AdminFieldRevision[];
  sources: AdminFieldSource[];
  courses: AdminFieldCourse[];
};

const pageSize = 10;

const fieldRecordsCte = `
  WITH field_records AS (
    SELECT item.id AS "catalogItemId",
           COALESCE(canonical.external_key, item.id::text) AS id,
           latest.id AS "latestRevisionId",
           published.id AS "publishedRevisionId",
           latest.title,
           latest.summary,
           latest.revision_number AS "revisionNumber",
           latest.publication_status AS "publicationStatus",
           latest.verification_status AS "verificationStatus",
           published.id IS NOT NULL AS "publishedVersionAvailable",
           item.created_at AS "createdAt",
           COALESCE(latest.updated_at, item.updated_at) AS "updatedAt",
           latest.data_classification AS "dataClassification",
           COALESCE((
             SELECT COUNT(*)::int
               FROM public.catalog_revision_sources AS provenance
              WHERE provenance.revision_id = latest.id
           ), 0)::int AS "provenanceCount",
           latest.field_content AS "fieldContent"
      FROM public.catalog_items AS item
      LEFT JOIN LATERAL (
        SELECT alias.external_key
          FROM public.catalog_item_aliases AS alias
         WHERE alias.catalog_item_id = item.id
           AND alias.source_system = 'careerbridge'
           AND alias.external_type = 'field'
           AND alias.external_context_key = ''
         ORDER BY alias.external_key
         LIMIT 1
      ) AS canonical ON true
      LEFT JOIN LATERAL (
        SELECT revision.id,
               revision.title,
               revision.summary,
               revision.revision_number,
               revision.publication_status,
               revision.verification_status,
               revision.updated_at,
               revision.data_classification,
               field.field_content
          FROM public.catalog_item_revisions AS revision
          LEFT JOIN public.field_revisions AS field
            ON field.revision_id = revision.id
         WHERE revision.catalog_item_id = item.id
         ORDER BY revision.revision_number DESC
         LIMIT 1
      ) AS latest ON true
      LEFT JOIN public.catalog_item_revisions AS published
        ON published.id = item.published_revision_id
       AND published.catalog_item_id = item.id
       AND published.publication_status = 'published'
     WHERE item.item_type = 'field'
  )
`;

const sortSql: Record<AdminFieldsSort, string> = {
  name_asc: 'field.title ASC NULLS LAST, field.id ASC',
  name_desc: 'field.title DESC NULLS LAST, field.id ASC',
  created_desc: 'field."createdAt" DESC, field.id ASC',
  created_asc: 'field."createdAt" ASC, field.id ASC',
  updated_desc: 'field."updatedAt" DESC, field.id ASC',
};

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

export function normalizeAdminFieldsFilters(
  input: Partial<Record<keyof AdminFieldsFilters, unknown>> = {},
): AdminFieldsFilters {
  return {
    search: typeof input.search === "string" ? input.search.trim().slice(0, 120) : "",
    publicationState: isOneOf(input.publicationState, ["published", "unpublished", "archived"])
      ? input.publicationState
      : "all",
    reviewState: isOneOf(input.reviewState, ["needs_review", "draft"])
      ? input.reviewState
      : "all",
    sort: isOneOf(input.sort, [
      "name_asc",
      "name_desc",
      "created_desc",
      "created_asc",
      "updated_desc",
    ])
      ? input.sort
      : "name_asc",
    page:
      typeof input.page === "number" && Number.isSafeInteger(input.page) && input.page > 0
        ? input.page
        : 1,
  };
}

function buildFilterSql(filters: AdminFieldsFilters) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const addValue = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (filters.search) {
    const parameter = addValue(filters.search);
    clauses.push(`POSITION(
      LOWER(${parameter}) IN LOWER(
        COALESCE(field.title, '')
      )
    ) > 0`);
  }
  if (filters.publicationState === "published") {
    clauses.push(`field."publishedVersionAvailable"`);
  } else if (filters.publicationState === "unpublished") {
    clauses.push(`NOT field."publishedVersionAvailable" AND field."publicationStatus" IS DISTINCT FROM 'archived'`);
  } else if (filters.publicationState === "archived") {
    clauses.push(`field."publicationStatus" = 'archived'`);
  }
  if (filters.reviewState === "needs_review") {
    clauses.push(`field."publicationStatus" IN ('in_review', 'approved')`);
  } else if (filters.reviewState === "draft") {
    clauses.push(`field."publicationStatus" IN ('draft', 'rejected')`);
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join("\n      AND ")}` : "",
    values,
  };
}

export async function getAdminFieldsDirectory(
  input: Partial<AdminFieldsFilters> = {},
  database: Pick<Pool, "query"> = getPool(),
): Promise<AdminFieldsDirectory> {
  const filters = normalizeAdminFieldsFilters(input);
  const filter = buildFilterSql(filters);
  const [metricsResult, countResult] = await Promise.all([
    database.query<AdminFieldMetrics>(`
      ${fieldRecordsCte}
      SELECT COUNT(*)::int AS "totalRecords",
             COUNT(*) FILTER (
               WHERE field."publishedVersionAvailable"
             )::int AS "publishedRecords",
             COUNT(*) FILTER (
               WHERE field."publicationStatus" IN ('in_review', 'approved')
             )::int AS "needsReviewRecords"
        FROM field_records AS field
    `),
    database.query<{ total: number }>(`
      ${fieldRecordsCte}
      SELECT COUNT(*)::int AS total
        FROM field_records AS field
        ${filter.sql}
    `, filter.values),
  ]);
  const metrics = metricsResult.rows[0];
  if (!metrics) {
    throw new Error("The Admin Fields summary query returned no result.");
  }

  const totalFiltered = countResult.rows[0]?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const page = Math.min(filters.page, pageCount);
  const offset = (page - 1) * pageSize;
  const recordsResult = await database.query<AdminFieldRecord>(`
    ${fieldRecordsCte}
    SELECT field."catalogItemId",
           field.id,
           field."latestRevisionId",
           field."publishedRevisionId",
           field.title,
           field.summary,
           field."revisionNumber",
           field."publicationStatus",
           field."verificationStatus",
           field."publishedVersionAvailable",
           field."createdAt",
           field."updatedAt",
           field."dataClassification",
           field."provenanceCount"
      FROM field_records AS field
      ${filter.sql}
     ORDER BY ${sortSql[filters.sort]}
     LIMIT $${filter.values.length + 1}
    OFFSET $${filter.values.length + 2}
  `, [...filter.values, pageSize, offset]);

  return {
    metrics,
    records: recordsResult.rows,
    totalFiltered,
    page,
    pageSize,
    pageCount,
  };
}

function mapFieldContent(value: unknown): Partial<FieldContent> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const content = value as Record<string, unknown>;
  const result: Partial<FieldContent> = {};
  for (const key of [
    "introduction",
    "broadlyInvolves",
    "activitiesAndWorkAreas",
    "learningAndSubjectConnections",
    "courseFamiliesToExplore",
    "furtherExploration",
  ] as const) {
    if (typeof content[key] === "string") {
      result[key] = content[key];
    }
  }
  return result;
}

export async function getAdminFieldDetail(
  identifier: string,
  database: Pick<Pool, "query"> = getPool(),
): Promise<AdminFieldDetail | null> {
  const fieldResult = await database.query<Omit<AdminFieldDetail, "revisions" | "sources" | "courses"> & {
    fieldContent: unknown;
  }>(`
    SELECT item.id AS "catalogItemId",
           COALESCE(canonical.external_key, item.id::text) AS id,
           latest.id AS "latestRevisionId",
           published.id AS "publishedRevisionId",
           latest.title,
           latest.summary,
           latest.description,
           latest.revision_number AS "revisionNumber",
           latest.publication_status AS "publicationStatus",
           latest.verification_status AS "verificationStatus",
           published.id IS NOT NULL AS "publishedVersionAvailable",
           CASE WHEN COALESCE(latest.image_removed, false) THEN false
                ELSE (latest.image_data IS NOT NULL OR publishedImage.image_data IS NOT NULL)
            END AS "hasImage",
           lastPublished.published_at AS "publishedAt",
           COALESCE(latest.updated_at, item.updated_at) AS "updatedAt",
           latest.data_classification AS "dataClassification",
           latest.field_content AS "fieldContent"
      FROM public.catalog_items AS item
      LEFT JOIN LATERAL (
        SELECT alias.external_key
          FROM public.catalog_item_aliases AS alias
         WHERE alias.catalog_item_id = item.id
           AND alias.source_system = 'careerbridge'
           AND alias.external_type = 'field'
           AND alias.external_context_key = ''
         ORDER BY alias.external_key
         LIMIT 1
      ) AS canonical ON true
      LEFT JOIN LATERAL (
        SELECT revision.id,
               revision.title,
               revision.summary,
               revision.description,
               revision.revision_number,
               revision.publication_status,
               revision.verification_status,
               revision.updated_at,
               revision.data_classification,
               field.field_content,
               image.image_data,
               image.image_removed
          FROM public.catalog_item_revisions AS revision
          LEFT JOIN public.field_revisions AS field
            ON field.revision_id = revision.id
          LEFT JOIN public.field_revision_images AS image
            ON image.revision_id = revision.id
         WHERE revision.catalog_item_id = item.id
         ORDER BY revision.revision_number DESC
         LIMIT 1
      ) AS latest ON true
      LEFT JOIN public.catalog_item_revisions AS published
        ON published.id = item.published_revision_id
       AND published.catalog_item_id = item.id
       AND published.publication_status = 'published'
      LEFT JOIN public.field_revision_images AS publishedImage
        ON publishedImage.revision_id = published.id
      LEFT JOIN LATERAL (
        SELECT revision.published_at
          FROM public.catalog_item_revisions AS revision
         WHERE revision.catalog_item_id = item.id
           AND revision.publication_status = 'published'
         ORDER BY revision.revision_number DESC
         LIMIT 1
      ) AS lastPublished ON true
     WHERE item.item_type = 'field'
       AND (
         item.id::text = $1
         OR EXISTS (
           SELECT 1
             FROM public.catalog_item_aliases AS requested_alias
            WHERE requested_alias.catalog_item_id = item.id
              AND requested_alias.external_type = 'field'
              AND requested_alias.external_context_key = ''
              AND requested_alias.external_key = $1
         )
       )
     LIMIT 1
  `, [identifier]);

  const field = fieldResult.rows[0];
  if (!field) return null;

  const [revisionsResult, sourcesResult, coursesResult] = await Promise.all([
    database.query<AdminFieldRevision & { fieldContent: unknown }>(`
      SELECT revision.id,
             revision.revision_number AS "revisionNumber",
             revision.title,
             revision.summary,
             revision.description,
             revision.publication_status AS "publicationStatus",
             revision.verification_status AS "verificationStatus",
             revision.data_classification AS "dataClassification",
             revision.created_at AS "createdAt",
             revision.updated_at AS "updatedAt",
             revision.published_at AS "publishedAt",
             COALESCE((
               SELECT COUNT(*)::int
                 FROM public.catalog_revision_sources AS provenance
                WHERE provenance.revision_id = revision.id
             ), 0)::int AS "provenanceCount",
             field.field_content AS "fieldContent"
        FROM public.catalog_item_revisions AS revision
        LEFT JOIN public.field_revisions AS field
          ON field.revision_id = revision.id
       WHERE revision.catalog_item_id = $1
       ORDER BY revision.revision_number DESC
    `, [field.catalogItemId]),
    field.latestRevisionId
      ? database.query<AdminFieldSource>(`
          SELECT source.id,
                 source.source_name AS name,
                 source.authority,
                 source.canonical_url AS url,
                 provenance.claim_key AS "claimKey",
                 provenance.checked_at AS "checkedAt",
                 provenance.verified_at AS "verifiedAt",
                 provenance.verification_status AS "verificationStatus"
            FROM public.catalog_revision_sources AS provenance
            JOIN public.source_registry AS source
              ON source.id = provenance.source_id
           WHERE provenance.revision_id = $1
           ORDER BY source.source_name, provenance.claim_key
        `, [field.latestRevisionId])
      : Promise.resolve({ rows: [] as AdminFieldSource[] }),
    database.query<AdminFieldCourse>(`
      SELECT course_alias.external_key AS id,
             course.id AS "catalogItemId",
             latest.title,
             latest.revision_number AS "revisionNumber",
             field_revision.revision_number AS "fieldRevisionNumber"
        FROM public.catalog_items AS course
        JOIN LATERAL (
          SELECT revision.id,
                 revision.title,
                 revision.revision_number,
                 course_revision.field_item_id,
                 course_revision.field_revision_id
            FROM public.catalog_item_revisions AS revision
            JOIN public.course_revisions AS course_revision
              ON course_revision.revision_id = revision.id
           WHERE revision.catalog_item_id = course.id
           ORDER BY revision.revision_number DESC
           LIMIT 1
        ) AS latest ON true
        JOIN public.catalog_item_revisions AS field_revision
          ON field_revision.id = latest.field_revision_id
         AND field_revision.catalog_item_id = latest.field_item_id
        LEFT JOIN LATERAL (
          SELECT alias.external_key
            FROM public.catalog_item_aliases AS alias
           WHERE alias.catalog_item_id = course.id
             AND alias.source_system = 'careerbridge'
             AND alias.external_type = 'course'
             AND alias.external_context_key = ''
           ORDER BY alias.external_key
           LIMIT 1
        ) AS course_alias ON true
       WHERE course.item_type = 'course'
         AND latest.field_item_id = $1
       ORDER BY latest.title, course.id
    `, [field.catalogItemId]),
  ]);

  const revisions = revisionsResult.rows.map(({ fieldContent, ...revision }) => ({
    ...revision,
    content: mapFieldContent(fieldContent),
  }));
  return {
    ...field,
    content: mapFieldContent(field.fieldContent),
    revisions,
    sources: sourcesResult.rows,
    courses: coursesResult.rows,
  };
}
