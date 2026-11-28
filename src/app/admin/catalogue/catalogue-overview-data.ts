import "server-only";

import type { CatalogItemType } from "../../../db/schema/catalog";
import { getPool } from "../../../db/pool";

const catalogueOverviewSql = `
  WITH item_states AS (
    SELECT item.item_type,
           published.id AS published_revision_id,
           published.publication_status AS published_revision_status,
           latest.publication_status AS latest_publication_status
      FROM public.catalog_items AS item
      LEFT JOIN public.catalog_item_revisions AS published
        ON published.id = item.published_revision_id
       AND published.catalog_item_id = item.id
      LEFT JOIN LATERAL (
        SELECT revision.publication_status
          FROM public.catalog_item_revisions AS revision
         WHERE revision.catalog_item_id = item.id
         ORDER BY revision.revision_number DESC
         LIMIT 1
      ) AS latest ON true
  )
  SELECT COUNT(*)::int AS "totalItems",
         COUNT(*) FILTER (
           WHERE published_revision_id IS NOT NULL
             AND published_revision_status = 'published'
         )::int AS "publishedItems",
         COUNT(*) FILTER (
           WHERE latest_publication_status = 'in_review'
         )::int AS "inReviewItems",
         COUNT(*) FILTER (
           WHERE published_revision_id IS NULL
              OR published_revision_status <> 'published'
         )::int AS "withoutPublishedVersion",
         COUNT(*) FILTER (WHERE item_type = 'field')::int AS fields,
         COUNT(*) FILTER (WHERE item_type IN ('course', 'course_offering'))::int AS courses,
         COUNT(*) FILTER (WHERE item_type IN ('institution', 'campus'))::int AS institutions,
         COUNT(*) FILTER (WHERE item_type = 'pathway')::int AS pathways,
         COUNT(*) FILTER (WHERE item_type = 'examination')::int AS examinations,
         COUNT(*) FILTER (WHERE item_type = 'scholarship')::int AS scholarships
    FROM item_states
`;

const recentCatalogueRecordsSql = `
  SELECT item.id,
         item.item_type AS "itemType",
         latest.title,
         latest.revision_number AS "revisionNumber",
         latest.publication_status AS "publicationStatus",
         latest.updated_at AS "updatedAt"
    FROM public.catalog_items AS item
    JOIN LATERAL (
      SELECT revision.title,
             revision.revision_number,
             revision.publication_status,
             revision.data_classification,
             revision.updated_at
        FROM public.catalog_item_revisions AS revision
       WHERE revision.catalog_item_id = item.id
       ORDER BY revision.revision_number DESC
       LIMIT 1
    ) AS latest ON latest.data_classification = 'real'
   ORDER BY latest.updated_at DESC, item.id DESC
   LIMIT $1
`;

type CatalogueOverviewCounts = {
  totalItems: number;
  publishedItems: number;
  inReviewItems: number;
  withoutPublishedVersion: number;
  fields: number;
  courses: number;
  institutions: number;
  pathways: number;
  examinations: number;
  scholarships: number;
};

export type CatalogueOverviewCategory = {
  slug: string;
  label: string;
  description: string;
  href: string;
  count: number;
};

export type RecentCatalogueRecord = {
  id: string;
  itemType: CatalogItemType;
  title: string;
  revisionNumber: number;
  publicationStatus: string;
  updatedAt: Date;
};

const categoryDefinitions = [
  {
    countKey: "fields",
    slug: "fields",
    label: "Fields",
    description: "Career and subject taxonomy",
    href: "/admin/catalogue/fields",
  },
  {
    countKey: "courses",
    slug: "courses",
    label: "Courses",
    description: "Courses and their offerings",
    href: "/admin/catalogue/courses",
  },
  {
    countKey: "institutions",
    slug: "institutions",
    label: "Institutions",
    description: "Institutions and their campuses",
    href: "/admin/catalogue/institutions",
  },
  {
    countKey: "pathways",
    slug: "pathways",
    label: "Pathways",
    description: "Education and progression routes",
    href: "/admin/catalogue/pathways",
  },
  {
    countKey: "examinations",
    slug: "examinations",
    label: "Examinations",
    description: "Entrance and qualifying examinations",
    href: "/admin/catalogue/examinations",
  },
  {
    countKey: "scholarships",
    slug: "scholarships",
    label: "Scholarships",
    description: "Funding and eligibility opportunities",
    href: "/admin/catalogue/scholarships",
  },
] as const satisfies readonly {
  countKey: keyof CatalogueOverviewCounts;
  slug: string;
  label: string;
  description: string;
  href: string;
}[];

export async function getCatalogueOverviewData(database = getPool()) {
  const [overviewResult, recentResult] = await Promise.all([
    database.query<CatalogueOverviewCounts>(catalogueOverviewSql),
    database.query<RecentCatalogueRecord>(recentCatalogueRecordsSql, [5]),
  ]);
  const counts = overviewResult.rows[0];
  if (!counts) {
    throw new Error("The catalogue overview query returned no summary row.");
  }

  return {
    metrics: {
      totalItems: counts.totalItems,
      publishedItems: counts.publishedItems,
      inReviewItems: counts.inReviewItems,
      withoutPublishedVersion: counts.withoutPublishedVersion,
    },
    categories: categoryDefinitions.map(({ countKey, ...category }) => ({
      ...category,
      count: counts[countKey],
    })),
    recentRecords: recentResult.rows,
  };
}
