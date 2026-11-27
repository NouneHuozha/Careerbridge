import "server-only";
import type { AdminAuditAction, AdminAuditKind, CatalogItemType } from "../../db/schema/catalog";
import { getPool } from "../../db/pool";

const catalogueOverviewSql = `
  SELECT item.item_type AS "itemType",
         item.published_revision_id AS "publishedRevisionId",
         published.id AS "joinedPublishedRevisionId",
         published.publication_status AS "publishedRevisionStatus",
         latest.publication_status AS "latestPublicationStatus"
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
`;

const recentActivitySql = `
  SELECT event.id,
         event.created_at AS "createdAt",
         event.actor_id AS "actorId",
         actor.full_name AS "actorName",
         actor.email AS "actorEmail",
         event.kind,
         event.action,
         event.item_id AS "itemId",
         revision.title AS "itemTitle"
    FROM public.admin_audit_events AS event
    LEFT JOIN public.users AS actor ON actor.id = event.actor_id
    LEFT JOIN public.catalog_item_revisions AS revision
      ON revision.id = event.revision_id
     AND revision.catalog_item_id = event.item_id
   ORDER BY event.created_at DESC, event.id DESC
   LIMIT $1
`;

const catalogueTypes: readonly CatalogItemType[] = [
  "field",
  "institution",
  "campus",
  "course",
  "course_offering",
  "pathway",
  "examination",
  "scholarship",
];

export type CatalogueItemState = {
  itemType: CatalogItemType;
  publishedRevisionId: string | null;
  joinedPublishedRevisionId: string | null;
  publishedRevisionStatus: string | null;
  latestPublicationStatus: string | null;
};

export type CatalogueOverview = {
  totalItems: number;
  publishedItems: number;
  unpublishedItems: number;
  inReviewItems: number;
  byType: Array<{ type: CatalogItemType; count: number }>;
};

export type RecentAdminActivity = {
  id: string;
  createdAt: Date;
  actorId: number;
  actorName: string | null;
  actorEmail: string | null;
  kind: AdminAuditKind;
  action: AdminAuditAction;
  itemId: string;
  itemTitle: string | null;
};

export function aggregateCatalogueOverview(
  items: readonly CatalogueItemState[],
): CatalogueOverview {
  const byType = new Map(catalogueTypes.map((type) => [type, 0]));
  let publishedItems = 0;
  let inReviewItems = 0;

  for (const item of items) {
    const typeCount = byType.get(item.itemType);
    if (typeCount === undefined) {
      throw new Error("The catalogue query returned an unsupported item type.");
    }
    byType.set(item.itemType, typeCount + 1);

    if (
      item.publishedRevisionId !== null &&
      item.joinedPublishedRevisionId !== null &&
      item.publishedRevisionStatus === "published"
    ) {
      publishedItems += 1;
    }
    if (item.latestPublicationStatus === "in_review") inReviewItems += 1;
  }

  return {
    totalItems: items.length,
    publishedItems,
    unpublishedItems: items.length - publishedItems,
    inReviewItems,
    byType: catalogueTypes.map((type) => ({ type, count: byType.get(type) ?? 0 })),
  };
}

export async function getAdminDashboardData(database = getPool()) {
  const [catalogueResult, activityResult] = await Promise.all([
    database.query<CatalogueItemState>(catalogueOverviewSql),
    database.query<RecentAdminActivity>(recentActivitySql, [10]),
  ]);
  return {
    catalogue: aggregateCatalogueOverview(catalogueResult.rows),
    recentActivity: activityResult.rows,
  };
}
