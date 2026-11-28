import "server-only";
import type { Pool } from "pg";
import { getPool } from "./pool";

export type AdminCoursePublicationFilter =
  | "all"
  | "published"
  | "needs_review"
  | "draft"
  | "archived";
export type AdminCoursesSort = "updated_desc" | "updated_asc" | "name_asc";
export type AdminCoursesPageSize = 10 | 25 | 50;

export type AdminCoursesFilters = {
  search: string;
  publicationState: AdminCoursePublicationFilter;
  fieldId: string;
  qualification: string;
  entryStage: "all" | "class-10" | "class-12";
  sort: AdminCoursesSort;
  page: number;
  pageSize: AdminCoursesPageSize;
};

export type AdminCourseMetrics = {
  totalCourses: number;
  publishedCourses: number;
  needsReviewCourses: number;
  draftCourses: number;
};

export type AdminCourseFieldOption = {
  id: string;
  title: string;
};

export type AdminCourseRecord = {
  catalogItemId: string;
  id: string;
  latestRevisionId: string;
  publishedRevisionId: string | null;
  title: string;
  summary: string | null;
  revisionNumber: number;
  publicationStatus: string;
  publishedVersionAvailable: boolean;
  updatedAt: Date;
  qualification: string;
  stages: string[];
  fieldId: string;
  fieldTitle: string;
  institutionCount: number;
};

export type AdminCoursesDirectory = {
  metrics: AdminCourseMetrics;
  fields: AdminCourseFieldOption[];
  qualifications: string[];
  records: AdminCourseRecord[];
  totalFiltered: number;
  page: number;
  pageSize: AdminCoursesPageSize;
  pageCount: number;
};

export type AdminCourseRevision = {
  id: string;
  revisionNumber: number;
  title: string;
  summary: string | null;
  description: string | null;
  publicationStatus: string;
  verificationStatus: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  qualification: string;
  stages: string[];
  fieldId: string;
  fieldTitle: string;
  entryAfterClass10: string;
  entryAfterClass12: string;
  content: Record<string, unknown>;
  provenanceCount: number;
};

export type AdminCourseSourceClaim = {
  claimKey: string;
  verificationStatus: string | null;
  checkedAt: string | null;
  verifiedAt: string | null;
};

export type AdminCourseSource = {
  id: string;
  name: string;
  authority: string | null;
  url: string | null;
  category: string;
  sourceType: string;
  status: string;
  claims: AdminCourseSourceClaim[];
};

export type AdminCourseOffering = {
  catalogItemId: string;
  id: string;
  latestRevisionId: string;
  publishedRevisionId: string | null;
  revisionNumber: number;
  title: string;
  summary: string | null;
  description: string | null;
  publicationStatus: string;
  publishedVersionAvailable: boolean;
  updatedAt: Date;
  publishedAt: Date | null;
  slug: string;
  details: Record<string, unknown>;
  courseRevisionId: string;
  courseRevisionNumber: number | null;
  courseRevisionStatus: string | null;
  courseRevisionIsCurrentPublished: boolean;
  campusRevisionId: string;
  campusRevisionNumber: number | null;
  campusRevisionStatus: string | null;
  campusRevisionIsCurrentPublished: boolean;
  campusTitle: string | null;
  campusContent: Record<string, unknown> | null;
  institutionId: string | null;
  institutionTitle: string | null;
  institutionType: string | null;
  institutionPublicationStatus: string | null;
  institutionContent: Record<string, unknown> | null;
  stateName: string | null;
  provenanceCount: number;
  sources: AdminCourseSource[];
};

export type AdminCourseDetail = {
  catalogItemId: string;
  id: string;
  latestRevisionId: string;
  publishedRevisionId: string | null;
  title: string;
  summary: string | null;
  description: string | null;
  revisionNumber: number;
  publicationStatus: string;
  verificationStatus: string;
  publishedVersionAvailable: boolean;
  updatedAt: Date;
  publishedAt: Date | null;
  qualification: string;
  stages: string[];
  fieldId: string;
  fieldTitle: string;
  entryAfterClass10: string;
  entryAfterClass12: string;
  content: Record<string, unknown>;
  revisions: AdminCourseRevision[];
  sources: AdminCourseSource[];
  offerings: AdminCourseOffering[];
};

const courseRecordsCte = `
  WITH course_records AS (
    SELECT item.id AS "catalogItemId",
           COALESCE(canonical.external_key, item.id::text) AS id,
           latest.id AS "latestRevisionId",
           published.id AS "publishedRevisionId",
           latest.title,
           latest.summary,
           latest.revision_number AS "revisionNumber",
           latest.publication_status AS "publicationStatus",
           published.id IS NOT NULL AS "publishedVersionAvailable",
           COALESCE(latest.updated_at, item.updated_at) AS "updatedAt",
           latest.qualification,
           latest.stages,
           latest."fieldId",
           latest."fieldTitle"
      FROM public.catalog_items AS item
      JOIN LATERAL (
        SELECT revision.id,
               revision.title,
               revision.summary,
               revision.revision_number,
               revision.publication_status,
               revision.updated_at,
               course.qualification,
               course.stages,
               COALESCE(field_alias.external_key, course.field_item_id::text) AS "fieldId",
               field_revision.title AS "fieldTitle"
          FROM public.catalog_item_revisions AS revision
          JOIN public.course_revisions AS course
            ON course.revision_id = revision.id
          JOIN public.catalog_items AS field_item
            ON field_item.id = course.field_item_id
           AND field_item.item_type = 'field'
          JOIN public.catalog_item_revisions AS field_revision
            ON field_revision.id = course.field_revision_id
           AND field_revision.catalog_item_id = course.field_item_id
          LEFT JOIN LATERAL (
            SELECT alias.external_key
              FROM public.catalog_item_aliases AS alias
             WHERE alias.catalog_item_id = course.field_item_id
               AND alias.source_system = 'careerbridge'
               AND alias.external_type = 'field'
               AND alias.external_context_key = ''
             ORDER BY alias.external_key
             LIMIT 1
          ) AS field_alias ON true
         WHERE revision.catalog_item_id = item.id
           AND revision.data_classification = 'real'
         ORDER BY revision.revision_number DESC
         LIMIT 1
      ) AS latest ON true
      LEFT JOIN LATERAL (
        SELECT alias.external_key
          FROM public.catalog_item_aliases AS alias
         WHERE alias.catalog_item_id = item.id
           AND alias.source_system = 'careerbridge'
           AND alias.external_type = 'course'
           AND alias.external_context_key = ''
         ORDER BY alias.external_key
         LIMIT 1
      ) AS canonical ON true
      LEFT JOIN LATERAL (
        SELECT revision.id
          FROM public.catalog_item_revisions AS revision
          JOIN public.course_revisions AS course
            ON course.revision_id = revision.id
         WHERE revision.id = item.published_revision_id
           AND revision.catalog_item_id = item.id
           AND revision.publication_status = 'published'
           AND revision.data_classification = 'real'
         LIMIT 1
      ) AS published ON true
     WHERE item.item_type = 'course'
  )
`;

const sortSql: Record<AdminCoursesSort, string> = {
  updated_desc: 'course."updatedAt" DESC, course.title ASC, course.id ASC',
  updated_asc: 'course."updatedAt" ASC, course.title ASC, course.id ASC',
  name_asc: "course.title ASC, course.id ASC",
};

function isOneOf<T extends string | number>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return (typeof value === "string" || typeof value === "number") &&
    allowed.includes(value as T);
}

function normalizedText(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export function normalizeAdminCoursesFilters(
  input: Partial<Record<keyof AdminCoursesFilters, unknown>> = {},
): AdminCoursesFilters {
  return {
    search: normalizedText(input.search, 120),
    publicationState: isOneOf(input.publicationState, [
      "published",
      "needs_review",
      "draft",
      "archived",
    ])
      ? input.publicationState
      : "all",
    fieldId: normalizedText(input.fieldId, 160),
    qualification: normalizedText(input.qualification, 100),
    entryStage: isOneOf(input.entryStage, ["class-10", "class-12"])
      ? input.entryStage
      : "all",
    sort: isOneOf(input.sort, ["updated_desc", "updated_asc", "name_asc"])
      ? input.sort
      : "updated_desc",
    page:
      typeof input.page === "number" &&
      Number.isSafeInteger(input.page) &&
      input.page > 0
        ? input.page
        : 1,
    pageSize: isOneOf(input.pageSize, [10, 25, 50])
      ? input.pageSize
      : 10,
  };
}

function buildFilterSql(filters: AdminCoursesFilters) {
  const clauses: string[] = [];
  const values: (string | number)[] = [];
  const addValue = (value: string | number) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (filters.search) {
    const parameter = addValue(filters.search);
    clauses.push(`(
      POSITION(LOWER(${parameter}) IN LOWER(COALESCE(course.title, ''))) > 0
      OR POSITION(LOWER(${parameter}) IN LOWER(COALESCE(course.qualification, ''))) > 0
      OR POSITION(LOWER(${parameter}) IN LOWER(COALESCE(course.id, ''))) > 0
    )`);
  }
  if (filters.publicationState === "published") {
    clauses.push(`course."publishedVersionAvailable"`);
  } else if (filters.publicationState === "needs_review") {
    clauses.push(`course."publicationStatus" IN ('in_review', 'approved')`);
  } else if (filters.publicationState === "draft") {
    clauses.push(`course."publicationStatus" IN ('draft', 'rejected')`);
  } else if (filters.publicationState === "archived") {
    clauses.push(`course."publicationStatus" = 'archived'`);
  }
  if (filters.fieldId) {
    clauses.push(`course."fieldId" = ${addValue(filters.fieldId)}`);
  }
  if (filters.qualification) {
    clauses.push(`course.qualification = ${addValue(filters.qualification)}`);
  }
  if (filters.entryStage !== "all") {
    clauses.push(`${addValue(filters.entryStage)} = ANY(course.stages)`);
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join("\n      AND ")}` : "",
    values,
  };
}

export async function getAdminCoursesDirectory(
  input: Partial<AdminCoursesFilters> = {},
  database: Pick<Pool, "query"> = getPool(),
): Promise<AdminCoursesDirectory> {
  const filters = normalizeAdminCoursesFilters(input);
  const filter = buildFilterSql(filters);
  const summaryResult = await database.query<{
    totalCourses: number;
    publishedCourses: number;
    needsReviewCourses: number;
    draftCourses: number;
    totalFiltered: number;
    qualifications: string[];
    fields: AdminCourseFieldOption[];
  }>(`
    ${courseRecordsCte},
    filtered_courses AS (
      SELECT course.*
        FROM course_records AS course
        ${filter.sql}
    )
    SELECT (SELECT COUNT(*)::int FROM course_records) AS "totalCourses",
           (SELECT COUNT(*) FILTER (
              WHERE course."publishedVersionAvailable"
            )::int
              FROM course_records AS course) AS "publishedCourses",
           (SELECT COUNT(*) FILTER (
              WHERE course."publicationStatus" IN ('in_review', 'approved')
            )::int
              FROM course_records AS course) AS "needsReviewCourses",
           (SELECT COUNT(*) FILTER (
              WHERE course."publicationStatus" IN ('draft', 'rejected')
            )::int
              FROM course_records AS course) AS "draftCourses",
           (SELECT COUNT(*)::int FROM filtered_courses) AS "totalFiltered",
           COALESCE((
             SELECT array_agg(options.qualification ORDER BY options.qualification)
               FROM (
                 SELECT DISTINCT course.qualification
                   FROM course_records AS course
                  WHERE course.qualification <> ''
               ) AS options
           ), ARRAY[]::text[]) AS qualifications,
           COALESCE((
             SELECT jsonb_agg(
                      jsonb_build_object('id', options."fieldId", 'title', options."fieldTitle")
                      ORDER BY options."fieldTitle"
                    )
               FROM (
                 SELECT DISTINCT course."fieldId", course."fieldTitle"
                   FROM course_records AS course
                  WHERE course."fieldId" <> ''
                    AND course."fieldTitle" <> ''
               ) AS options
           ), '[]'::jsonb) AS fields
  `, filter.values);

  const summary = summaryResult.rows[0];
  if (!summary) {
    throw new Error("The Admin Courses summary query returned no result.");
  }

  const pageCount = Math.max(1, Math.ceil(summary.totalFiltered / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const offset = (page - 1) * filters.pageSize;
  const recordsResult = await database.query<AdminCourseRecord>(`
    ${courseRecordsCte}
    SELECT course.*,
           (
             SELECT COUNT(DISTINCT institution_item.id)::int
               FROM public.catalog_items AS offering_item
               JOIN public.catalog_item_revisions AS offering_revision
                 ON offering_revision.catalog_item_id = offering_item.id
                AND offering_revision.id = offering_item.published_revision_id
                AND offering_revision.publication_status = 'published'
                AND offering_revision.data_classification = 'real'
               JOIN public.course_offering_revisions AS offering
                 ON offering.revision_id = offering_revision.id
                AND offering.course_item_id = course."catalogItemId"
               JOIN public.catalog_item_revisions AS offered_course_revision
                 ON offered_course_revision.id = offering.course_revision_id
                AND offered_course_revision.catalog_item_id = offering.course_item_id
                AND offered_course_revision.publication_status = 'published'
                AND offered_course_revision.data_classification = 'real'
               JOIN public.course_revisions AS offered_course
                 ON offered_course.revision_id = offered_course_revision.id
               JOIN public.catalog_items AS campus_item
                 ON campus_item.id = offering.campus_item_id
                AND campus_item.item_type = 'campus'
               JOIN public.catalog_item_revisions AS campus_revision
                 ON campus_revision.catalog_item_id = campus_item.id
                AND campus_revision.id = campus_item.published_revision_id
                AND campus_revision.publication_status = 'published'
                AND campus_revision.data_classification = 'real'
               JOIN public.campus_revisions AS campus
                 ON campus.revision_id = campus_revision.id
               JOIN public.catalog_items AS institution_item
                 ON institution_item.id = campus.institution_item_id
                AND institution_item.item_type = 'institution'
               JOIN public.catalog_item_revisions AS institution_revision
                 ON institution_revision.catalog_item_id = institution_item.id
                AND institution_revision.id = institution_item.published_revision_id
                AND institution_revision.publication_status = 'published'
                AND institution_revision.data_classification = 'real'
               JOIN public.institution_revisions AS institution
                 ON institution.revision_id = institution_revision.id
              WHERE offering_item.item_type = 'course_offering'
           ) AS "institutionCount"
      FROM course_records AS course
      ${filter.sql}
     ORDER BY ${sortSql[filters.sort]}
     LIMIT $${filter.values.length + 1}
    OFFSET $${filter.values.length + 2}
  `, [...filter.values, filters.pageSize, offset]);

  return {
    metrics: {
      totalCourses: summary.totalCourses,
      publishedCourses: summary.publishedCourses,
      needsReviewCourses: summary.needsReviewCourses,
      draftCourses: summary.draftCourses,
    },
    fields: summary.fields,
    qualifications: summary.qualifications,
    records: recordsResult.rows,
    totalFiltered: summary.totalFiltered,
    page,
    pageSize: filters.pageSize,
    pageCount,
  };
}

export async function getAdminCourseDetail(
  identifier: string,
  database: Pick<Pool, "query"> = getPool(),
): Promise<AdminCourseDetail | null> {
  if (!identifier || identifier.length > 200) return null;

  const result = await database.query<AdminCourseDetail>(`
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
           latest.updated_at AS "updatedAt",
           published.published_at AS "publishedAt",
           latest.qualification,
           latest.stages,
           latest."fieldId",
           latest."fieldTitle",
           latest.entry_after_class10 AS "entryAfterClass10",
           latest.entry_after_class12 AS "entryAfterClass12",
           latest.course_content AS content
      FROM public.catalog_items AS item
      JOIN LATERAL (
        SELECT revision.id,
               revision.title,
               revision.summary,
               revision.description,
               revision.revision_number,
               revision.publication_status,
               revision.verification_status,
               revision.updated_at,
               course.qualification,
               course.stages,
               course.entry_after_class10,
               course.entry_after_class12,
               course.course_content,
               COALESCE(field_alias.external_key, course.field_item_id::text) AS "fieldId",
               field_revision.title AS "fieldTitle"
          FROM public.catalog_item_revisions AS revision
          JOIN public.course_revisions AS course ON course.revision_id = revision.id
          JOIN public.catalog_item_revisions AS field_revision
            ON field_revision.id = course.field_revision_id
           AND field_revision.catalog_item_id = course.field_item_id
          LEFT JOIN LATERAL (
            SELECT alias.external_key
              FROM public.catalog_item_aliases AS alias
             WHERE alias.catalog_item_id = course.field_item_id
               AND alias.source_system = 'careerbridge'
               AND alias.external_type = 'field'
               AND alias.external_context_key = ''
             ORDER BY alias.external_key
             LIMIT 1
          ) AS field_alias ON true
         WHERE revision.catalog_item_id = item.id
           AND revision.data_classification = 'real'
         ORDER BY revision.revision_number DESC
         LIMIT 1
      ) AS latest ON true
      LEFT JOIN LATERAL (
        SELECT revision.id, revision.published_at
          FROM public.catalog_item_revisions AS revision
          JOIN public.course_revisions AS course ON course.revision_id = revision.id
         WHERE revision.id = item.published_revision_id
           AND revision.catalog_item_id = item.id
           AND revision.publication_status = 'published'
           AND revision.data_classification = 'real'
         LIMIT 1
      ) AS published ON true
      LEFT JOIN LATERAL (
        SELECT alias.external_key
          FROM public.catalog_item_aliases AS alias
         WHERE alias.catalog_item_id = item.id
           AND alias.source_system = 'careerbridge'
           AND alias.external_type = 'course'
           AND alias.external_context_key = ''
         ORDER BY alias.external_key
         LIMIT 1
      ) AS canonical ON true
     WHERE item.item_type = 'course'
       AND (
         item.id::text = $1
         OR EXISTS (
           SELECT 1
             FROM public.catalog_item_aliases AS alias
            WHERE alias.catalog_item_id = item.id
              AND alias.source_system = 'careerbridge'
              AND alias.external_type = 'course'
              AND alias.external_context_key = ''
              AND alias.external_key = $1
         )
       )
     LIMIT 1
  `, [identifier]);

  const course = result.rows[0];
  if (!course) return null;

  const revisionsResult = await database.query<AdminCourseRevision>(`
    SELECT revision.id,
           revision.revision_number AS "revisionNumber",
           revision.title,
           revision.summary,
           revision.description,
           revision.publication_status AS "publicationStatus",
           revision.verification_status AS "verificationStatus",
           revision.created_at AS "createdAt",
           revision.updated_at AS "updatedAt",
           revision.published_at AS "publishedAt",
           course.qualification,
           course.stages,
           COALESCE(field_alias.external_key, course.field_item_id::text) AS "fieldId",
           field_revision.title AS "fieldTitle",
           course.entry_after_class10 AS "entryAfterClass10",
           course.entry_after_class12 AS "entryAfterClass12",
           course.course_content AS content,
           (SELECT COUNT(*)::int
              FROM public.catalog_revision_sources AS source
             WHERE source.revision_id = revision.id) AS "provenanceCount"
      FROM public.catalog_item_revisions AS revision
      JOIN public.course_revisions AS course ON course.revision_id = revision.id
      JOIN public.catalog_item_revisions AS field_revision
        ON field_revision.id = course.field_revision_id
       AND field_revision.catalog_item_id = course.field_item_id
      LEFT JOIN LATERAL (
        SELECT alias.external_key
          FROM public.catalog_item_aliases AS alias
         WHERE alias.catalog_item_id = course.field_item_id
           AND alias.source_system = 'careerbridge'
           AND alias.external_type = 'field'
           AND alias.external_context_key = ''
         ORDER BY alias.external_key
         LIMIT 1
      ) AS field_alias ON true
     WHERE revision.catalog_item_id = $1
       AND revision.data_classification = 'real'
     ORDER BY revision.revision_number DESC
  `, [course.catalogItemId]);

  const sourcesResult = await database.query<AdminCourseSource>(`
    SELECT source.id,
           source.source_name AS name,
           source.authority,
           COALESCE(source.canonical_url, source.normalized_url) AS url,
           source.category,
           source.source_type AS "sourceType",
           source.status,
           jsonb_agg(
             jsonb_build_object(
               'claimKey', association.claim_key,
               'verificationStatus', association.verification_status,
               'checkedAt', association.checked_at,
               'verifiedAt', association.verified_at
             ) ORDER BY association.claim_key
           ) AS claims
      FROM public.catalog_revision_sources AS association
      JOIN public.source_registry AS source ON source.id = association.source_id
     WHERE association.revision_id = $1
     GROUP BY source.id, source.source_name, source.authority, source.canonical_url,
              source.normalized_url, source.category, source.source_type, source.status
     ORDER BY source.source_name, source.id
  `, [course.latestRevisionId]);

  const offeringsResult = await database.query<AdminCourseOffering>(`
    SELECT offering_item.id AS "catalogItemId",
           COALESCE(offering_alias.external_key, offering_item.id::text) AS id,
           latest.id AS "latestRevisionId",
           published.id AS "publishedRevisionId",
           latest.revision_number AS "revisionNumber",
           latest.title,
           latest.summary,
           latest.description,
           latest.publication_status AS "publicationStatus",
           published.id IS NOT NULL AS "publishedVersionAvailable",
           latest.updated_at AS "updatedAt",
           published.published_at AS "publishedAt",
           latest.slug,
           latest.offering_details AS details,
           latest.course_revision_id AS "courseRevisionId",
           course_revision.revision_number AS "courseRevisionNumber",
           course_revision.publication_status AS "courseRevisionStatus",
           latest.course_revision_id = $2 AS "courseRevisionIsCurrentPublished",
           latest.campus_revision_id AS "campusRevisionId",
           campus_revision.revision_number AS "campusRevisionNumber",
           campus_revision.publication_status AS "campusRevisionStatus",
           latest.campus_revision_id = campus_item.published_revision_id AS "campusRevisionIsCurrentPublished",
           campus_revision.title AS "campusTitle",
           campus.campus_content AS "campusContent",
           COALESCE(institution_alias.external_key, institution_item.id::text) AS "institutionId",
           institution_revision.title AS "institutionTitle",
           institution.institution_type AS "institutionType",
           institution_revision.publication_status AS "institutionPublicationStatus",
           institution.institution_content AS "institutionContent",
           state.name AS "stateName",
           (SELECT COUNT(*)::int
              FROM public.catalog_revision_sources AS source
             WHERE source.revision_id = latest.id) AS "provenanceCount"
      FROM public.catalog_items AS offering_item
      JOIN LATERAL (
        SELECT revision.id,
               revision.revision_number,
               revision.title,
               revision.summary,
               revision.description,
               revision.publication_status,
               revision.updated_at,
               revision.published_at,
               offering.slug,
               offering.offering_details,
               offering.course_revision_id,
               offering.campus_item_id,
               offering.campus_revision_id
          FROM public.catalog_item_revisions AS revision
          JOIN public.course_offering_revisions AS offering ON offering.revision_id = revision.id
         WHERE revision.catalog_item_id = offering_item.id
           AND revision.data_classification = 'real'
           AND offering.course_item_id = $1
         ORDER BY revision.revision_number DESC
         LIMIT 1
      ) AS latest ON true
      LEFT JOIN LATERAL (
        SELECT alias.external_key
          FROM public.catalog_item_aliases AS alias
         WHERE alias.catalog_item_id = offering_item.id
           AND alias.source_system = 'careerbridge'
           AND alias.external_type = 'institution-offering'
         ORDER BY (alias.external_context_key = $3) DESC, alias.external_key
         LIMIT 1
      ) AS offering_alias ON true
      LEFT JOIN LATERAL (
        SELECT revision.id, revision.published_at
          FROM public.catalog_item_revisions AS revision
          JOIN public.course_offering_revisions AS offering ON offering.revision_id = revision.id
         WHERE revision.id = offering_item.published_revision_id
           AND revision.catalog_item_id = offering_item.id
           AND revision.publication_status = 'published'
           AND revision.data_classification = 'real'
           AND offering.course_item_id = $1
         LIMIT 1
      ) AS published ON true
      LEFT JOIN public.catalog_item_revisions AS course_revision
        ON course_revision.id = latest.course_revision_id
       AND course_revision.catalog_item_id = $1
      JOIN public.catalog_items AS campus_item
        ON campus_item.id = latest.campus_item_id
       AND campus_item.item_type = 'campus'
      JOIN public.catalog_item_revisions AS campus_revision
        ON campus_revision.id = latest.campus_revision_id
       AND campus_revision.catalog_item_id = campus_item.id
      JOIN public.campus_revisions AS campus ON campus.revision_id = campus_revision.id
      JOIN public.catalog_items AS institution_item
        ON institution_item.id = campus.institution_item_id
       AND institution_item.item_type = 'institution'
      LEFT JOIN LATERAL (
        SELECT revision.id, revision.title, revision.publication_status, revision.data_classification
          FROM public.catalog_item_revisions AS revision
         WHERE revision.id = institution_item.published_revision_id
           AND revision.catalog_item_id = institution_item.id
           AND revision.publication_status = 'published'
           AND revision.data_classification = 'real'
         LIMIT 1
      ) AS institution_revision ON true
      LEFT JOIN public.institution_revisions AS institution
        ON institution.revision_id = institution_revision.id
      LEFT JOIN LATERAL (
        SELECT alias.external_key
          FROM public.catalog_item_aliases AS alias
         WHERE alias.catalog_item_id = institution_item.id
           AND alias.source_system = 'careerbridge'
           AND alias.external_type = 'institution'
           AND alias.external_context_key = ''
         ORDER BY alias.external_key
         LIMIT 1
      ) AS institution_alias ON true
      LEFT JOIN public.states AS state ON state.id = campus.state_id
     WHERE offering_item.item_type = 'course_offering'
     ORDER BY institution_revision.title, campus_revision.title, latest.title
  `, [course.catalogItemId, course.publishedRevisionId, course.id]);

  const offeringSourcesResult = offeringsResult.rows.length
    ? await database.query<AdminCourseSource & { revisionId: string }>(`
        SELECT association.revision_id AS "revisionId",
               source.id,
               source.source_name AS name,
               source.authority,
               COALESCE(source.canonical_url, source.normalized_url) AS url,
               source.category,
               source.source_type AS "sourceType",
               source.status,
               jsonb_agg(
                 jsonb_build_object(
                   'claimKey', association.claim_key,
                   'verificationStatus', association.verification_status,
                   'checkedAt', association.checked_at,
                   'verifiedAt', association.verified_at
                 ) ORDER BY association.claim_key
               ) AS claims
          FROM public.catalog_revision_sources AS association
          JOIN public.source_registry AS source ON source.id = association.source_id
         WHERE association.revision_id = ANY($1::uuid[])
         GROUP BY association.revision_id, source.id, source.source_name, source.authority,
                  source.canonical_url, source.normalized_url, source.category,
                  source.source_type, source.status
         ORDER BY source.source_name, source.id
      `, [offeringsResult.rows.map((offering) => offering.latestRevisionId)])
    : { rows: [] };
  const offeringSourcesByRevision = new Map<string, AdminCourseSource[]>();
  for (const source of offeringSourcesResult.rows) {
    const sources = offeringSourcesByRevision.get(source.revisionId) ?? [];
    sources.push(source);
    offeringSourcesByRevision.set(source.revisionId, sources);
  }

  return {
    ...course,
    revisions: revisionsResult.rows,
    sources: sourcesResult.rows,
    offerings: offeringsResult.rows.map((offering) => ({
      ...offering,
      sources: offeringSourcesByRevision.get(offering.latestRevisionId) ?? [],
    })),
  };
}
