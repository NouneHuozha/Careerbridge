import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { connection, NextRequest, NextResponse } from "next/server";
import type { FieldContent } from "../../../../../db/fields";
import { getIdentityLockPool } from "../../../../../db/pool";
import {
  AdminAccessDeniedError,
  AdminAuthenticationRequiredError,
  requireAdmin,
} from "../../../../admin-auth";
import { assertDevelopmentTarget } from "../../../../../../scripts/import-real-pathway-draft.mjs";
import {
  FieldImageTooLargeError,
  InvalidFieldImageError,
  maxFieldImageBytes,
  validateFieldImage,
} from "./image-upload";

const noStore = { "Cache-Control": "no-store" };
const maxBodyBytes = 32_768;
const maxMultipartBodyBytes = maxFieldImageBytes + 32_768;
const fieldContentKeys = [
  "introduction",
  "broadlyInvolves",
  "activitiesAndWorkAreas",
  "learningAndSubjectConnections",
  "courseFamiliesToExplore",
  "furtherExploration",
] as const satisfies readonly (keyof FieldContent)[];

type FieldContentKey = (typeof fieldContentKeys)[number];
type CreateFieldSource = {
  sourceName: string;
  authority: string | null;
  canonicalUrl: string;
  claimField: FieldContentKey;
};
type FieldDraftInput = {
  name: string;
  summary: string | null;
  description: string | null;
  content: Partial<FieldContent>;
  sources: CreateFieldSource[];
  publicationStatus: "draft" | "in_review";
};

class DuplicateFieldError extends Error {}
class FieldNotFoundError extends Error {}
class StaleFieldRevisionError extends Error {}
class RequestBodyTooLargeError extends Error {}
class InvalidFieldFormDataError extends Error {}

type FieldImageAction = "keep" | "replace" | "remove";
type ParsedFieldRequest = {
  body: unknown;
  imageAction: FieldImageAction;
  imageData: Buffer | null;
  imageContentType: string | null;
};

async function readBoundedBody(request: NextRequest, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, totalBytes);
}

async function parseFieldRequest(request: NextRequest): Promise<ParsedFieldRequest> {
  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentType.toLowerCase().startsWith("multipart/form-data")) {
    if (contentLength > maxMultipartBodyBytes) throw new RequestBodyTooLargeError();
    const body = await readBoundedBody(request, maxMultipartBodyBytes);
    const form = await new Request(request.url, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
    }).formData();
    const keys = [...form.keys()];
    if (
      keys.some((key) => !["draft", "imageAction", "image"].includes(key)) ||
      form.getAll("draft").length !== 1 ||
      form.getAll("imageAction").length !== 1 ||
      form.getAll("image").length > 1
    ) {
      throw new InvalidFieldFormDataError();
    }
    const draft = form.get("draft");
    const imageAction = form.get("imageAction");
    const image = form.get("image");
    if (
      typeof draft !== "string" ||
      (imageAction !== "keep" && imageAction !== "replace" && imageAction !== "remove") ||
      (imageAction === "replace" && !(image instanceof File)) ||
      (imageAction !== "replace" && image !== null)
    ) {
      throw new InvalidFieldFormDataError();
    }

    let bodyValue: unknown;
    try {
      bodyValue = JSON.parse(draft);
    } catch {
      throw new InvalidFieldFormDataError();
    }
    if (imageAction === "replace") {
      if (!(image instanceof File)) throw new InvalidFieldFormDataError();
      const validatedImage = await validateFieldImage(image);
      return {
        body: bodyValue,
        imageAction,
        ...validatedImage,
      };
    }
    return {
      body: bodyValue,
      imageAction,
      imageData: null,
      imageContentType: null,
    };
  }

  if (contentLength > maxBodyBytes) throw new RequestBodyTooLargeError();
  const body = await readBoundedBody(request, maxBodyBytes);
  try {
    return {
      body: JSON.parse(new TextDecoder().decode(body)),
      imageAction: "keep",
      imageData: null,
      imageContentType: null,
    };
  } catch {
    throw new InvalidFieldFormDataError();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isFieldContentKey(value: unknown): value is FieldContentKey {
  return typeof value === "string" && fieldContentKeys.includes(value as FieldContentKey);
}

function parseFieldDraftInput(
  value: unknown,
  updating: boolean,
): { input: FieldDraftInput; expectedRevisionId?: string } | null {
  const publicationStatus = isRecord(value) && value.publicationStatus !== undefined
    ? value.publicationStatus
    : "draft";
  const keys = updating
    ? ["name", "summary", "description", "content", "sources", "expectedRevisionId", "publicationStatus"]
    : ["name", "summary", "description", "content", "sources", "publicationStatus"];
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, keys) ||
    (publicationStatus !== "draft" && publicationStatus !== "in_review") ||
    typeof value.name !== "string" ||
    typeof value.summary !== "string" ||
    typeof value.description !== "string" ||
    !isRecord(value.content) ||
    !hasOnlyKeys(value.content, fieldContentKeys) ||
    !Array.isArray(value.sources) ||
    value.sources.length > 10 ||
    (updating &&
      (typeof value.expectedRevisionId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          value.expectedRevisionId,
        )))
  ) {
    return null;
  }

  const name = value.name.trim();
  const summary = value.summary.trim();
  const description = value.description.trim();
  if (!name || name.length > 160 || summary.length > 500 || description.length > 4000) return null;

  const content: Partial<FieldContent> = {};
  for (const key of fieldContentKeys) {
    const entry = value.content[key];
    if (entry === undefined) continue;
    if (typeof entry !== "string" || entry.length > 4000) return null;
    const trimmed = entry.trim();
    if (trimmed) content[key] = trimmed;
  }
  if (
    publicationStatus === "in_review" &&
    fieldContentKeys.some((key) => !content[key])
  ) return null;

  const sources: CreateFieldSource[] = [];
  for (const source of value.sources) {
    if (
      !isRecord(source) ||
      !hasOnlyKeys(source, ["sourceName", "authority", "canonicalUrl", "claimField"]) ||
      typeof source.sourceName !== "string" ||
      typeof source.authority !== "string" ||
      typeof source.canonicalUrl !== "string" ||
      !isFieldContentKey(source.claimField)
    ) {
      return null;
    }
    const sourceName = source.sourceName.trim();
    const authority = source.authority.trim();
    const canonicalUrl = source.canonicalUrl.trim();
    if (!sourceName || sourceName.length > 200 || authority.length > 200 || canonicalUrl.length > 2048) {
      return null;
    }
    let url: URL;
    try {
      url = new URL(canonicalUrl);
    } catch {
      return null;
    }
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.hash ||
      /\s/.test(canonicalUrl)
    ) {
      return null;
    }
    sources.push({
      sourceName,
      authority: authority || null,
      canonicalUrl: url.href,
      claimField: source.claimField,
    });
  }

  return {
    input: {
      name,
      summary: summary || null,
      description: description || null,
      content,
      sources,
      publicationStatus,
    },
    ...(updating ? { expectedRevisionId: value.expectedRevisionId as string } : {}),
  };
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

function getFieldIdentity(name: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");
  return base || `field-${randomUUID()}`;
}

async function writeFieldDraft(request: NextRequest, existingIdentifier?: string) {
  const updating = existingIdentifier !== undefined;
  await connection();
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403, headers: noStore });
  }

  try {
    assertDevelopmentTarget({
      directUrl: process.env.DATABASE_URL_UNPOOLED,
      pooledUrl: process.env.DATABASE_URL,
      projectId: process.env.NEON_PROJECT_ID,
      branchId: process.env.NEON_BRANCH_ID,
      neonBranch: process.env.NEON_BRANCH,
      vercel: process.env.VERCEL,
    });
    const actor = await requireAdmin();
    let parsedRequest: ParsedFieldRequest;
    try {
      parsedRequest = await parseFieldRequest(request);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError || error instanceof FieldImageTooLargeError) {
        return NextResponse.json({ error: "This request is too large." }, { status: 413, headers: noStore });
      }
      if (error instanceof InvalidFieldImageError) {
        return NextResponse.json({ error: error.message }, { status: 422, headers: noStore });
      }
      return NextResponse.json({ error: "Please send a valid Field draft." }, { status: 400, headers: noStore });
    }

    const parsed = parseFieldDraftInput(parsedRequest.body, updating);
    if (!parsed) {
      return NextResponse.json({
        error: "Check the Field name and source details. A version marked ready for review must include all six content sections.",
      }, { status: 422, headers: noStore });
    }
    const { input, expectedRevisionId } = parsed;

    const client = await getIdentityLockPool().connect();
    try {
      const database = await client.query("SELECT current_database() AS database_name");
      if (database.rows[0]?.database_name !== "neondb") {
        throw new Error("Field draft write refused outside the verified Neon development database.");
      }
      await client.query("BEGIN");
      try {
        const role = await client.query(
          `SELECT id FROM public.users
            WHERE id=$1 AND role='admin' AND auth_provider='clerk' AND external_id IS NOT NULL
            FOR SHARE`,
          [actor.id],
        );
        if (role.rowCount !== 1) throw new AdminAccessDeniedError();

        let catalogItemId: string;
        let externalKey: string;
        let revisionNumber = 1;
        let sourceRevisionId: string | null = null;
        if (existingIdentifier !== undefined) {
          if (!/^[a-z0-9][a-z0-9._-]{0,179}$/i.test(existingIdentifier)) {
            throw new FieldNotFoundError();
          }
          const itemResult = await client.query(
            `SELECT item.id,
                    COALESCE(canonical.external_key, item.id::text) AS external_key
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
              WHERE item.item_type = 'field'
                AND (
                  item.id::text = $1
                  OR EXISTS (
                    SELECT 1
                      FROM public.catalog_item_aliases AS requested_alias
                     WHERE requested_alias.catalog_item_id = item.id
                       AND requested_alias.source_system = 'careerbridge'
                       AND requested_alias.external_type = 'field'
                       AND requested_alias.external_context_key = ''
                       AND requested_alias.external_key = $1
                  )
                )
              LIMIT 1
              FOR UPDATE OF item`,
            [existingIdentifier],
          );
          const item = itemResult.rows[0];
          if (typeof item?.id !== "string" || typeof item.external_key !== "string") {
            throw new FieldNotFoundError();
          }
          catalogItemId = item.id;
          externalKey = item.external_key;
          const latestRevision = await client.query(
            `SELECT id, revision_number
               FROM public.catalog_item_revisions
              WHERE catalog_item_id = $1
              ORDER BY revision_number DESC
              LIMIT 1
              FOR UPDATE`,
            [catalogItemId],
          );
          const latest = latestRevision.rows[0];
          if (typeof latest?.id !== "string" || !Number.isSafeInteger(latest.revision_number)) {
            throw new FieldNotFoundError();
          }
          if (latest.id !== expectedRevisionId) throw new StaleFieldRevisionError();
          sourceRevisionId = latest.id;
          revisionNumber = latest.revision_number + 1;
        } else {
          catalogItemId = "";
          externalKey = getFieldIdentity(input.name);
        }

        const normalizedName = input.name.replace(/\s+/g, " ").toLowerCase();
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
          [`careerbridge:field-name:${normalizedName}`],
        );
        const duplicate = await client.query(
          `SELECT 1
             FROM public.catalog_items AS item
             JOIN public.catalog_item_revisions AS revision
               ON revision.catalog_item_id = item.id
            WHERE item.item_type = 'field'
              AND LOWER(regexp_replace(BTRIM(revision.title), '[[:space:]]+', ' ', 'g')) = $1
              AND revision.revision_number = (
                SELECT MAX(latest.revision_number)
                  FROM public.catalog_item_revisions AS latest
                 WHERE latest.catalog_item_id = item.id
              )
              AND ($2::uuid IS NULL OR item.id <> $2::uuid)
            LIMIT 1`,
          [normalizedName, updating ? catalogItemId : null],
        );
        if (duplicate.rows.length > 0) throw new DuplicateFieldError();

        if (!updating) {
          const identityConflict = await client.query(
            `SELECT 1 FROM public.catalog_item_aliases
              WHERE source_system = 'careerbridge'
                AND external_type = 'field'
                AND external_context_key = ''
                AND external_key = $1
              LIMIT 1`,
            [externalKey],
          );
          if (identityConflict.rows.length > 0) {
            externalKey = `${externalKey.slice(0, 140)}-${randomUUID().replace(/-/g, "").slice(0, 32)}`;
          }

          const itemResult = await client.query(
            "INSERT INTO public.catalog_items (item_type) VALUES ('field') RETURNING id",
          );
          const createdItemId = itemResult.rows[0]?.id;
          if (typeof createdItemId !== "string") throw new Error("Field identity was not created.");
          catalogItemId = createdItemId;
          await client.query(
            `INSERT INTO public.catalog_item_aliases
              (source_system, external_type, external_key, external_context_key, catalog_item_id)
             VALUES ('careerbridge', 'field', $1, '', $2)`,
            [externalKey, catalogItemId],
          );
        }

        const revisionResult = await client.query(
          `INSERT INTO public.catalog_item_revisions
            (catalog_item_id, revision_number, publication_status, title, summary, description,
             data_classification, verification_status, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, 'real', 'unverified', $7, $7)
           RETURNING id`,
          [
            catalogItemId,
            revisionNumber,
            input.publicationStatus,
            input.name,
            input.summary,
            input.description,
            actor.id,
          ],
        );
        const revisionId = revisionResult.rows[0]?.id;
        if (typeof revisionId !== "string") throw new Error("Field draft revision was not created.");

        if (sourceRevisionId) {
          await client.query(
            `INSERT INTO public.catalog_revision_sources
              (revision_id, source_id, claim_key, verification_status)
             SELECT $1, source_id, claim_key, 'unverified'
               FROM public.catalog_revision_sources
              WHERE revision_id = $2
             ON CONFLICT (revision_id, source_id, claim_key) DO NOTHING`,
            [revisionId, sourceRevisionId],
          );
          await client.query(
            "UPDATE public.catalog_items SET updated_at = NOW() WHERE id = $1",
            [catalogItemId],
          );
        }

        let imageData = parsedRequest.imageData;
        let imageContentType = parsedRequest.imageContentType;
        let imageRemoved = parsedRequest.imageAction === "remove";
        if (parsedRequest.imageAction === "keep" && sourceRevisionId) {
          const previousImage = await client.query<{
            imageData: Buffer | null;
            imageContentType: string | null;
            imageRemoved: boolean;
          }>(
            `SELECT CASE WHEN previous_image.image_removed THEN NULL
                         ELSE COALESCE(previous_image.image_data, published_image.image_data)
                     END AS "imageData",
                    CASE WHEN previous_image.image_removed THEN NULL
                         ELSE COALESCE(previous_image.image_content_type, published_image.image_content_type)
                     END AS "imageContentType",
                    COALESCE(previous_image.image_removed, false) AS "imageRemoved"
               FROM public.catalog_item_revisions AS previous_revision
               JOIN public.catalog_items AS item
                 ON item.id = previous_revision.catalog_item_id
               LEFT JOIN public.field_revision_images AS previous_image
                 ON previous_image.revision_id = previous_revision.id
               LEFT JOIN public.field_revision_images AS published_image
                 ON published_image.revision_id = item.published_revision_id
              WHERE previous_revision.id = $1`,
            [sourceRevisionId],
          );
          imageData = previousImage.rows[0]?.imageData ?? null;
          imageContentType = previousImage.rows[0]?.imageContentType ?? null;
          imageRemoved = previousImage.rows[0]?.imageRemoved ?? false;
        }
        await client.query(
          "INSERT INTO public.field_revisions (revision_id, field_content) VALUES ($1, $2::jsonb)",
          [revisionId, JSON.stringify(input.content)],
        );
        if (imageData || imageRemoved) {
          await client.query(
            `INSERT INTO public.field_revision_images
              (revision_id, image_data, image_content_type, image_removed)
             VALUES ($1, $2, $3, $4)`,
            [revisionId, imageData, imageContentType, imageRemoved],
          );
        }

        for (const source of input.sources) {
          const normalizedUrlResult = await client.query(
            "SELECT public.normalize_source_url($1) AS normalized_url",
            [source.canonicalUrl],
          );
          const normalizedUrl = normalizedUrlResult.rows[0]?.normalized_url;
          if (typeof normalizedUrl !== "string") {
            throw new Error("Source URL normalization did not return a value.");
          }
          const existingSource = await client.query(
            "SELECT id FROM public.source_registry WHERE normalized_url = $1",
            [normalizedUrl],
          );
          let sourceId = existingSource.rows[0]?.id;
          if (typeof sourceId !== "string") {
            const insertedSource = await client.query(
              `INSERT INTO public.source_registry
                (source_name, authority, canonical_url, category, source_type, status)
               VALUES ($1, $2, $3, 'field', 'admin_manual_entry', 'active')
               ON CONFLICT (normalized_url) DO NOTHING
               RETURNING id`,
              [source.sourceName, source.authority, source.canonicalUrl],
            );
            sourceId = insertedSource.rows[0]?.id;
            if (typeof sourceId !== "string") {
              const racedSource = await client.query(
                "SELECT id FROM public.source_registry WHERE normalized_url = $1",
                [normalizedUrl],
              );
              sourceId = racedSource.rows[0]?.id;
            }
          }
          if (typeof sourceId !== "string") throw new Error("Source record could not be resolved.");

          await client.query(
            `INSERT INTO public.catalog_revision_sources
              (revision_id, source_id, claim_key, verification_status)
             VALUES ($1, $2, $3, 'unverified')
             ON CONFLICT (revision_id, source_id, claim_key) DO NOTHING`,
            [revisionId, sourceId, `field.${externalKey}.${source.claimField}`],
          );
        }

        await client.query("COMMIT");
        return NextResponse.json(
          {
            id: externalKey,
            catalogItemId,
            revisionId,
            revisionNumber,
            publicationStatus: input.publicationStatus,
          },
          { status: updating ? 200 : 201, headers: noStore },
        );
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof AdminAuthenticationRequiredError) {
      return NextResponse.json({ error: "Sign in before creating a Field." }, { status: 401, headers: noStore });
    }
    if (error instanceof AdminAccessDeniedError) {
      return NextResponse.json({ error: "Catalogue administration is not enabled for this account." }, { status: 403, headers: noStore });
    }
    if (error instanceof FieldNotFoundError) {
      return NextResponse.json({ error: "The Field record could not be found." }, { status: 404, headers: noStore });
    }
    if (error instanceof StaleFieldRevisionError) {
      return NextResponse.json({ error: "This Field changed since it was opened. Reload it before saving another draft." }, { status: 409, headers: noStore });
    }
    if (error instanceof DuplicateFieldError || (isRecord(error) && error.code === "23505")) {
      return NextResponse.json({ error: "A Field with this name or identity already exists." }, { status: 409, headers: noStore });
    }
    console.error("[careerbridge-next] Admin Field draft write failed", error);
    return NextResponse.json({ error: "The Field draft could not be saved." }, { status: 503, headers: noStore });
  }
}

export function createFieldDraft(request: NextRequest) {
  return writeFieldDraft(request);
}

export function updateFieldDraft(request: NextRequest, identifier: string) {
  return writeFieldDraft(request, identifier);
}
