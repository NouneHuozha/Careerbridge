import { connection, NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import {
  AdminAccessDeniedError,
  AdminAuthenticationRequiredError,
  requireAdmin,
} from "../../../../admin-auth";
import { getIdentityLockPool } from "../../../../../db/pool";
import { assertDevelopmentTarget } from "../../../../../../scripts/import-real-pathway-draft.mjs";
import {
  associateRealExamScholarshipReviewSource,
  approveRealExamScholarshipDraft,
  getRealExamScholarshipReviewRecord,
  publishApprovedRealExamScholarship,
  recordRealExamScholarshipEvidenceReview,
  rejectRealExamScholarshipDraft,
  submitRealExamScholarshipDraftForReview,
} from "../../../../../../scripts/publish-real-pathway.mjs";

const noStore = { "Cache-Control": "no-store" };
const maxBodyBytes = 32_768;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const configurations = {
  exam: {
    itemType: "examination",
    aliasType: "examination",
    table: "examination_revisions",
    fields: "level, stages, purpose, programmes, authority, regions, fields, official_url",
  },
  scholarship: {
    itemType: "scholarship",
    aliasType: "scholarship",
    table: "scholarship_revisions",
    fields: "category, provider, support, study_levels, eligibility_regions, scholarship_status, official_url, detail",
  },
  institution: {
    itemType: "institution",
    aliasType: "institution",
    table: "institution_revisions",
    fields: "slug, initials, institution_type, ownership, institution_content",
  },
  campus: {
    itemType: "campus",
    aliasType: "campus",
    table: "campus_revisions",
    fields: "institution_item_id, state_id, campus_content",
  },
  course_offering: {
    itemType: "course_offering",
    aliasType: "institution-offering",
    table: "course_offering_revisions",
    fields: "course_item_id, course_revision_id, campus_item_id, campus_revision_id, slug, offering_details",
  },
} as const;

type CatalogueKind = keyof typeof configurations;
type ReviewClaim = {
  claimKey: string;
  decision: "verified" | "disputed" | "unavailable";
  sourceUrls: string[];
  reviewedDirectly?: boolean;
};
type ReviewSource = {
  sourceName: string;
  authority: string;
  canonicalUrl: string;
  category: "examination" | "scholarship" | "institution" | "campus" | "course_offering";
  sourceType: "official_public_web_page";
  status: "active";
};
type LifecycleInput =
  | { action: "submit" | "approve" | "reject"; kind: CatalogueKind; externalKey: string; externalContextKey?: string; revisionId: string }
  | { action: "review"; kind: CatalogueKind; externalKey: string; externalContextKey?: string; revisionId: string; claims: ReviewClaim[] }
  | { action: "associate-source"; kind: CatalogueKind; externalKey: string; externalContextKey?: string; revisionId: string; source: ReviewSource; claimKeys: string[] }
  | { action: "publish"; kind: CatalogueKind; externalKey: string; externalContextKey?: string; revisionId: string; expectedPublishedRevisionId: string | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function validExternalKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9._-]{0,179}$/.test(value);
}

function isCatalogueKind(value: unknown): value is CatalogueKind {
  return value === "exam" || value === "scholarship" ||
    value === "institution" || value === "campus" || value === "course_offering";
}

function isReviewSource(value: unknown, kind: CatalogueKind): value is ReviewSource {
  if (!isRecord(value) ||
      !hasOnlyKeys(value, ["sourceName", "authority", "canonicalUrl", "category", "sourceType", "status"]) ||
      typeof value.sourceName !== "string" || value.sourceName.length < 1 ||
      value.sourceName.length > 200 || value.sourceName !== value.sourceName.trim() ||
      typeof value.authority !== "string" || value.authority.length < 1 ||
      value.authority.length > 200 || value.authority !== value.authority.trim() ||
      typeof value.canonicalUrl !== "string" || value.canonicalUrl.length > 2048 ||
      value.canonicalUrl !== value.canonicalUrl.trim() ||
      value.category !== configurations[kind].itemType ||
      value.sourceType !== "official_public_web_page" ||
      value.status !== "active") return false;
  try {
    const url = new URL(value.canonicalUrl);
    return url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.search === "" &&
      url.hash === "" &&
      url.href === value.canonicalUrl;
  } catch {
    return false;
  }
}

function isLifecycleInput(value: unknown): value is LifecycleInput {
  if (!isRecord(value) ||
      !isCatalogueKind(value.kind) ||
      !validExternalKey(value.externalKey) ||
      typeof value.revisionId !== "string" ||
      !uuidPattern.test(value.revisionId) ||
      typeof value.action !== "string") return false;
  const hasContextKey = Object.hasOwn(value, "externalContextKey");
  if (value.kind === "course_offering"
    ? !validExternalKey(value.externalContextKey)
    : hasContextKey && value.externalContextKey !== "") return false;
  const base = ["action", "kind", "externalKey", "revisionId"];
  if (value.kind === "course_offering" || hasContextKey) base.push("externalContextKey");
  if (["submit", "approve", "reject"].includes(value.action)) return hasOnlyKeys(value, base);
  if (value.action === "review") {
    return hasOnlyKeys(value, [...base, "claims"]) &&
      Array.isArray(value.claims) &&
      value.claims.length > 0 &&
      value.claims.length <= 40 &&
      value.claims.every((claim) =>
        isRecord(claim) &&
        hasOnlyKeys(claim, ["claimKey", "decision", "sourceUrls", "reviewedDirectly"]) &&
        typeof claim.claimKey === "string" && claim.claimKey.length > 0 && claim.claimKey.length <= 160 &&
        ["verified", "disputed", "unavailable"].includes(String(claim.decision)) &&
        Array.isArray(claim.sourceUrls) &&
        claim.sourceUrls.length > 0 &&
        claim.sourceUrls.length <= 10 &&
        claim.sourceUrls.every((url) => typeof url === "string" && url.length <= 2048) &&
        (claim.reviewedDirectly === undefined || typeof claim.reviewedDirectly === "boolean") &&
        (claim.decision !== "verified" || claim.reviewedDirectly === true),
      );
  }
  if (value.action === "associate-source") {
    const claimPrefix = value.kind === "exam" ? "examination." :
      value.kind === "scholarship" ? "scholarship." :
        value.kind === "course_offering" ? "offering." : `${value.kind}.`;
    return hasOnlyKeys(value, [...base, "source", "claimKeys"]) &&
      isReviewSource(value.source, value.kind) &&
      Array.isArray(value.claimKeys) &&
      value.claimKeys.length > 0 &&
      value.claimKeys.length <= 40 &&
      new Set(value.claimKeys).size === value.claimKeys.length &&
      value.claimKeys.every((claimKey) =>
        typeof claimKey === "string" &&
        claimKey.startsWith(claimPrefix) &&
        claimKey.length <= 160,
      );
  }
  if (value.action === "publish") {
    return hasOnlyKeys(value, [...base, "expectedPublishedRevisionId"]) &&
      (value.expectedPublishedRevisionId === null ||
        typeof value.expectedPublishedRevisionId === "string" &&
        uuidPattern.test(value.expectedPublishedRevisionId));
  }
  return false;
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

async function verifyDevelopmentTarget() {
  assertDevelopmentTarget({
    directUrl: process.env.DATABASE_URL_UNPOOLED,
    pooledUrl: process.env.DATABASE_URL,
    projectId: process.env.NEON_PROJECT_ID,
    branchId: process.env.NEON_BRANCH_ID,
    neonBranch: process.env.NEON_BRANCH,
    vercel: process.env.VERCEL,
  });
}

function typedValues(kind: CatalogueKind, row: Record<string, unknown>) {
  if (kind === "exam") {
    return {
      level: row.level,
      stages: row.stages,
      purpose: row.purpose,
      programmes: row.programmes,
      authority: row.authority,
      regions: row.regions,
      fields: row.fields,
      officialUrl: row.official_url,
    };
  }
  if (kind === "scholarship") return {
    category: row.category,
    provider: row.provider,
    support: row.support,
    studyLevels: row.study_levels,
    eligibilityRegions: row.eligibility_regions,
    status: row.scholarship_status,
    officialUrl: row.official_url,
    detail: row.detail,
  };
  if (kind === "institution") return {
    slug: row.slug,
    initials: row.initials,
    institutionType: row.institution_type,
    ownership: row.ownership,
    content: row.institution_content,
  };
  if (kind === "campus") return {
    institutionItemId: row.institution_item_id,
    stateId: row.state_id,
    content: row.campus_content,
  };
  return {
    courseItemId: row.course_item_id,
    courseRevisionId: row.course_revision_id,
    campusItemId: row.campus_item_id,
    campusRevisionId: row.campus_revision_id,
    slug: row.slug,
    details: row.offering_details,
  };
}

async function listReviewRecords(client: PoolClient, kind: CatalogueKind, limit: number, offset: number) {
  const config = configurations[kind];
  const offeringContextJoins = kind === "course_offering" ? `
       JOIN public.catalog_item_aliases course_context
         ON course_context.catalog_item_id=t.course_item_id
        AND course_context.source_system='careerbridge'
        AND course_context.external_type='course'
        AND course_context.external_context_key=''
        AND course_context.external_key=a.external_context_key
       JOIN public.campus_revisions offering_campus
         ON offering_campus.revision_id=t.campus_revision_id` : "";
  const contextFilter = kind === "course_offering" ? `
        AND a.external_context_key <> ''
        AND NOT EXISTS (
          SELECT 1
            FROM public.catalog_item_aliases parent_alias
           WHERE parent_alias.catalog_item_id=offering_campus.institution_item_id
             AND parent_alias.source_system='careerbridge'
             AND parent_alias.external_type='institution'
             AND parent_alias.external_context_key=''
             AND parent_alias.external_key=a.external_key
        )` : "AND a.external_context_key=''";
  const result = await client.query(
    `SELECT i.id AS item_id, i.published_revision_id, a.external_key,
            a.external_context_key,
            r.id AS revision_id, r.revision_number, r.publication_status,
            r.verification_status, r.title, r.summary, r.updated_at,
            t.revision_id AS typed_revision_id, t.${config.fields}
       FROM public.catalog_items i
       JOIN public.catalog_item_aliases a
         ON a.catalog_item_id=i.id AND a.source_system='careerbridge'
        AND a.external_type=$4
       JOIN public.catalog_item_revisions r ON r.catalog_item_id=i.id
       LEFT JOIN public.${config.table} t ON t.revision_id=r.id
       ${offeringContextJoins}
      WHERE i.item_type=$1 AND r.data_classification='real'
        AND r.publication_status IN ('draft', 'in_review', 'approved', 'rejected')
        ${contextFilter}
      ORDER BY r.updated_at DESC, r.id
      LIMIT $2 OFFSET $3`,
    [config.itemType, limit, offset, config.aliasType],
  );
  return result.rows.map((row) => ({
    kind,
    externalKey: row.external_key,
    externalContextKey: row.external_context_key,
    itemId: row.item_id,
    publishedRevisionId: row.published_revision_id,
    revision: {
      id: row.revision_id,
      number: row.revision_number,
      publicationStatus: row.publication_status,
      verificationStatus: row.verification_status,
      title: row.title,
      summary: row.summary,
      updatedAt: row.updated_at,
      hasTypedRevision: row.typed_revision_id === row.revision_id,
      typed: typedValues(kind, row),
    },
  }));
}

async function openAuthorizedClient(actorId: number) {
  const client = await getIdentityLockPool().connect();
  try {
    const database = await client.query("SELECT current_database() AS database_name");
    if (database.rows[0]?.database_name !== "neondb") {
      throw new Error("Catalogue lifecycle operation refused because the database is not the verified development database.");
    }
    const user = await client.query(
      `SELECT id FROM public.users
        WHERE id=$1 AND role='admin' AND auth_provider='clerk' AND external_id IS NOT NULL
        FOR SHARE`,
      [actorId],
    );
    if (user.rowCount !== 1) {
      throw new Error("Catalogue administration is not enabled for this account.");
    }
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
}

export async function GET(request: NextRequest) {
  await connection();
  try {
    await verifyDevelopmentTarget();
    const actor = await requireAdmin();
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind");
    if (!isCatalogueKind(kind)) {
      return NextResponse.json({ error: "Select a supported catalogue." }, { status: 400, headers: noStore });
    }
    const externalKey = params.get("externalKey");
    const externalContextKey = params.get("externalContextKey");
    const revisionId = params.get("revisionId");
    const client = await openAuthorizedClient(actor.id);
    try {
      await client.query("BEGIN");
      try {
        const role = await client.query(
          `SELECT id FROM public.users
            WHERE id=$1 AND role='admin' AND auth_provider='clerk' AND external_id IS NOT NULL
            FOR SHARE`,
          [actor.id],
        );
        if (role.rowCount !== 1) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Catalogue administration is not enabled for this account." }, { status: 403, headers: noStore });
        }
        if (externalKey !== null || revisionId !== null || externalContextKey !== null) {
          const contextKey = externalContextKey ?? "";
          if (!validExternalKey(externalKey) || !revisionId || !uuidPattern.test(revisionId) ||
              (kind === "course_offering"
                ? !validExternalKey(contextKey)
                : contextKey !== "")) {
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "Provide a valid catalogue key, context key, and revision ID." }, { status: 400, headers: noStore });
          }
          const record = await getRealExamScholarshipReviewRecord(client, {
            kind, externalKey, externalContextKey: contextKey, revisionId,
          });
          if (!record) {
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "Catalogue draft was not found." }, { status: 404, headers: noStore });
          }
          await client.query("COMMIT");
          return NextResponse.json(record, { headers: noStore });
        }
        const limitValue = params.get("limit");
        const offsetValue = params.get("offset");
        const limit = limitValue === null ? 20 : Number(limitValue);
        const offset = offsetValue === null ? 0 : Number(offsetValue);
        if (!Number.isInteger(limit) || limit < 1 || limit > 50 ||
            !Number.isInteger(offset) || offset < 0 || offset > 5000) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Pagination values are invalid." }, { status: 400, headers: noStore });
        }
        const records = await listReviewRecords(client, kind, limit, offset);
        await client.query("COMMIT");
        return NextResponse.json({ records, limit, offset }, { headers: noStore });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof AdminAuthenticationRequiredError) {
      return NextResponse.json({ error: "Sign in before managing catalogue records." }, { status: 401, headers: noStore });
    }
    if (error instanceof AdminAccessDeniedError) {
      return NextResponse.json({ error: "Catalogue administration is not enabled for this account." }, { status: 403, headers: noStore });
    }
    console.error("[careerbridge-next] Catalogue review retrieval failed", error);
    return NextResponse.json({ error: "Catalogue review data could not be retrieved." }, { status: 503, headers: noStore });
  }
}

export async function POST(request: NextRequest) {
  await connection();
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403, headers: noStore });
  }
  try {
    await verifyDevelopmentTarget();
    const actor = await requireAdmin();
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > maxBodyBytes) {
      return NextResponse.json({ error: "This request is too large." }, { status: 413, headers: noStore });
    }
    let input: unknown;
    try {
      const body = await request.text();
      if (new TextEncoder().encode(body).byteLength > maxBodyBytes) {
        return NextResponse.json({ error: "This request is too large." }, { status: 413, headers: noStore });
      }
      input = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Please send a valid catalogue lifecycle request." }, { status: 400, headers: noStore });
    }
    if (!isLifecycleInput(input)) {
      return NextResponse.json({ error: "The catalogue lifecycle request is invalid." }, { status: 422, headers: noStore });
    }
    const client = await openAuthorizedClient(actor.id);
    try {
      let result;
      const identity = {
        kind: input.kind,
        externalKey: input.externalKey,
        externalContextKey: input.externalContextKey ?? "",
        revisionId: input.revisionId,
      };
      switch (input.action) {
        case "associate-source":
          result = await associateRealExamScholarshipReviewSource(client, {
            ...identity,
            reviewerUserId: actor.id,
            source: input.source,
            claimKeys: input.claimKeys,
          });
          break;
        case "submit":
          result = await submitRealExamScholarshipDraftForReview(client, {
            ...identity,
            reviewerUserId: actor.id,
          });
          break;
        case "review":
          result = await recordRealExamScholarshipEvidenceReview(client, {
            ...identity,
            reviewerUserId: actor.id,
            claims: input.claims,
          });
          break;
        case "approve":
          result = await approveRealExamScholarshipDraft(client, {
            ...identity,
            reviewerUserId: actor.id,
          });
          break;
        case "reject":
          result = await rejectRealExamScholarshipDraft(client, {
            ...identity,
            reviewerUserId: actor.id,
          });
          break;
        case "publish":
          result = await publishApprovedRealExamScholarship(client, {
            ...identity,
            expectedPublishedRevisionId: input.expectedPublishedRevisionId,
            publisherUserId: actor.id,
          });
          break;
      }
      return NextResponse.json(result, { headers: noStore });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof AdminAuthenticationRequiredError) {
      return NextResponse.json({ error: "Sign in before managing catalogue records." }, { status: 401, headers: noStore });
    }
    if (error instanceof AdminAccessDeniedError) {
      return NextResponse.json({ error: "Catalogue administration is not enabled for this account." }, { status: 403, headers: noStore });
    }
    const message = error instanceof Error ? error.message : "";
    if (/existing Clerk-backed CareerBridge administrator|administration is not enabled/i.test(message)) {
      return NextResponse.json({ error: "Catalogue administration is not enabled for this account." }, { status: 403, headers: noStore });
    }
    if (/not found/i.test(message)) {
      return NextResponse.json({ error: "Catalogue identity or revision was not found." }, { status: 404, headers: noStore });
    }
    if (/unsupported|must be|must list|must cover|must match|requires a direct-support/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 422, headers: noStore });
    }
    if (/changed|conflict|only an|not ready|pointer|evidence|revision|registered provenance|reviewed source URLs/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 409, headers: noStore });
    }
    console.error("[careerbridge-next] Catalogue lifecycle action failed", error);
    return NextResponse.json({ error: "The catalogue lifecycle action could not be completed." }, { status: 503, headers: noStore });
  }
}
