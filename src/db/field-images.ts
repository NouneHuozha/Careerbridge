import "server-only";

import type { Pool } from "pg";
import { getPool } from "./pool";

export type StoredFieldImage = {
  imageData: Buffer | null;
  imageContentType: string | null;
  imageRemoved: boolean;
};

type PublishedImageCache = {
  expiresAt: number;
  images: Map<string, StoredFieldImage> | null;
};

const cacheDurationMs = 5_000;
const cacheSizeLimitBytes = 10 * 1024 * 1024;
// shortcut: other instances may be stale for up to five seconds; use shared invalidation if that window is unacceptable.
let publishedImageCache: PublishedImageCache | null = null;
let pendingPublishedImageCache: Promise<Map<string, StoredFieldImage> | null> | null = null;
let cacheGeneration = 0;

const publishedImagesQuery = `
  WITH published_images AS (
    SELECT alias.external_key AS "fieldId",
           image.image_data AS "imageData",
           image.image_content_type AS "imageContentType",
           COALESCE(image.image_removed, false) AS "imageRemoved"
      FROM public.catalog_items AS item
      JOIN public.catalog_item_aliases AS alias
        ON alias.catalog_item_id = item.id
       AND alias.source_system = 'careerbridge'
       AND alias.external_type = 'field'
       AND alias.external_context_key = ''
      JOIN public.catalog_item_revisions AS revision
        ON revision.id = item.published_revision_id
       AND revision.catalog_item_id = item.id
       AND revision.publication_status = 'published'
       AND revision.data_classification = 'real'
      LEFT JOIN public.field_revision_images AS image
        ON image.revision_id = revision.id
     WHERE item.item_type = 'field'
  )
  SELECT "fieldId", "imageData", "imageContentType", "imageRemoved"
    FROM published_images
`;

async function queryPublishedFieldImage(
  fieldId: string,
  database: Pick<Pool, "query">,
) {
  const result = await database.query<StoredFieldImage>(`
    SELECT image.image_data AS "imageData",
           image.image_content_type AS "imageContentType",
           COALESCE(image.image_removed, false) AS "imageRemoved"
      FROM public.catalog_items AS item
      JOIN public.catalog_item_aliases AS alias
        ON alias.catalog_item_id = item.id
       AND alias.source_system = 'careerbridge'
       AND alias.external_type = 'field'
       AND alias.external_context_key = ''
      JOIN public.catalog_item_revisions AS revision
        ON revision.id = item.published_revision_id
       AND revision.catalog_item_id = item.id
       AND revision.publication_status = 'published'
       AND revision.data_classification = 'real'
      LEFT JOIN public.field_revision_images AS image
        ON image.revision_id = revision.id
     WHERE item.item_type = 'field'
       AND alias.external_key = $1
     LIMIT 1
  `, [fieldId]);
  return result.rows[0] ?? null;
}

async function loadPublishedImageCache() {
  if (publishedImageCache && publishedImageCache.expiresAt > Date.now()) {
    return publishedImageCache.images;
  }
  if (pendingPublishedImageCache) return pendingPublishedImageCache;

  const generation = cacheGeneration;
  const database = getPool();
  const load = (async () => {
    const sizeResult = await database.query<{ totalBytes: string }>(
      `SELECT COALESCE(SUM(OCTET_LENGTH("imageData")), 0)::text AS "totalBytes"
         FROM (${publishedImagesQuery}) AS published_images`,
    );
    const totalBytes = Number(sizeResult.rows[0]?.totalBytes ?? 0);
    let images: Map<string, StoredFieldImage> | null = null;
    if (totalBytes <= cacheSizeLimitBytes) {
      const result = await database.query<StoredFieldImage & { fieldId: string }>(
        publishedImagesQuery,
      );
      images = new Map(result.rows.map(({ fieldId, ...image }) => [fieldId, image]));
    }
    if (generation === cacheGeneration) {
      publishedImageCache = { expiresAt: Date.now() + cacheDurationMs, images };
    }
    return images;
  })();
  pendingPublishedImageCache = load;
  try {
    return await load;
  } finally {
    if (pendingPublishedImageCache === load) pendingPublishedImageCache = null;
  }
}

export function invalidatePublishedFieldImageCache() {
  cacheGeneration += 1;
  publishedImageCache = null;
  pendingPublishedImageCache = null;
}

export async function getPublishedFieldImage(
  fieldId: string,
  database?: Pick<Pool, "query">,
): Promise<StoredFieldImage | null> {
  if (database) return queryPublishedFieldImage(fieldId, database);
  const images = await loadPublishedImageCache();
  return images?.get(fieldId) ?? (images === null ? queryPublishedFieldImage(fieldId, getPool()) : null);
}

export async function getAdminFieldImage(
  identifier: string,
  database: Pick<Pool, "query"> = getPool(),
): Promise<StoredFieldImage | null> {
  const result = await database.query<StoredFieldImage>(`
    SELECT CASE WHEN COALESCE(latest.image_removed, false) THEN NULL
                ELSE COALESCE(latest.image_data, published_image.image_data)
            END AS "imageData",
           CASE WHEN COALESCE(latest.image_removed, false) THEN NULL
                ELSE COALESCE(latest.image_content_type, published_image.image_content_type)
            END AS "imageContentType",
           COALESCE(latest.image_removed, false) AS "imageRemoved"
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
               image.image_data,
               image.image_content_type,
               image.image_removed
          FROM public.catalog_item_revisions AS revision
          LEFT JOIN public.field_revision_images AS image
            ON image.revision_id = revision.id
         WHERE revision.catalog_item_id = item.id
         ORDER BY revision.revision_number DESC
         LIMIT 1
      ) AS latest ON true
      LEFT JOIN public.field_revision_images AS published_image
        ON published_image.revision_id = item.published_revision_id
     WHERE item.item_type = 'field'
       AND (item.id::text = $1 OR canonical.external_key = $1)
     LIMIT 1
  `, [identifier]);
  return result.rows[0] ?? null;
}
