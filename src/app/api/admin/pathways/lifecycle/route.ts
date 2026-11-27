import { connection, NextRequest, NextResponse } from "next/server";
import {
  AdminAccessDeniedError,
  AdminAuthenticationRequiredError,
  requireAdmin,
} from "../../../../admin-auth";
import { getIdentityLockPool } from "../../../../../db/pool";
import {
  assertDevelopmentTarget,
  verifyNeonDevelopmentEndpoint,
} from "../../../../../../scripts/import-real-pathway-draft.mjs";
import {
  approveRealPathwayDraft,
  publishApprovedRealPathway,
  recordRealPathwayEvidenceReview,
  submitRealPathwayDraftForReview,
} from "../../../../../../scripts/publish-real-pathway.mjs";

const noStore = { "Cache-Control": "no-store" };
const maxBodyBytes = 16_384;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type LifecycleInput =
  | { action: "submit" | "approve"; pathwayId: string; revisionId: string }
  | { action: "review"; pathwayId: string; revisionId: string; claims: Array<{ claimKey: string; decision: "verified"; sourceUrls: string[] }> }
  | { action: "publish"; pathwayId: string; revisionId: string; expectedPublishedRevisionId: string | null };

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isLifecycleInput(value: unknown): value is LifecycleInput {
  if (!isRecord(value) ||
      typeof value.pathwayId !== "string" ||
      !/^[a-z0-9-]{1,80}$/.test(value.pathwayId) ||
      typeof value.revisionId !== "string" ||
      !uuidPattern.test(value.revisionId) ||
      typeof value.action !== "string") {
    return false;
  }

  const baseKeys = ["action", "pathwayId", "revisionId"];
  if (value.action === "submit" || value.action === "approve") {
    return hasOnlyKeys(value, baseKeys);
  }
  if (value.action === "review") {
    return hasOnlyKeys(value, [...baseKeys, "claims"]) &&
      Array.isArray(value.claims) &&
      value.claims.length > 0 &&
      value.claims.length <= 12 &&
      value.claims.every((claim) =>
        isRecord(claim) &&
        hasOnlyKeys(claim, ["claimKey", "decision", "sourceUrls"]) &&
        typeof claim.claimKey === "string" &&
        claim.claimKey.length > 0 &&
        claim.decision === "verified" &&
        Array.isArray(claim.sourceUrls) &&
        claim.sourceUrls.length > 0 &&
        claim.sourceUrls.every((url) => typeof url === "string" && url.length <= 2048),
      );
  }
  if (value.action === "publish") {
    return hasOnlyKeys(value, [...baseKeys, "expectedPublishedRevisionId"]) &&
      (value.expectedPublishedRevisionId === null ||
        typeof value.expectedPublishedRevisionId === "string" &&
        uuidPattern.test(value.expectedPublishedRevisionId));
  }
  return false;
}

export async function POST(request: NextRequest) {
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
    verifyNeonDevelopmentEndpoint();

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
      return NextResponse.json({ error: "Please send a valid Pathways lifecycle request." }, { status: 400, headers: noStore });
    }

    if (!isLifecycleInput(input)) {
      return NextResponse.json({ error: "The Pathways lifecycle request is invalid." }, { status: 422, headers: noStore });
    }

    const client = await getIdentityLockPool().connect();
    try {
      const database = await client.query("SELECT current_database() AS database_name");
      if (database.rows[0]?.database_name !== "neondb") {
        throw new Error("Pathways lifecycle operation refused because the database is not the verified development database.");
      }
      const role = await client.query(
        `SELECT id FROM public.users
          WHERE id=$1 AND role='admin' AND auth_provider='clerk' AND external_id IS NOT NULL
          FOR SHARE`,
        [actor.id],
      );
      if (role.rowCount !== 1) {
        throw new AdminAccessDeniedError();
      }

      let result;
      switch (input.action) {
        case "submit":
          result = await submitRealPathwayDraftForReview(client, {
            pathwayId: input.pathwayId,
            revisionId: input.revisionId,
            reviewerUserId: actor.id,
          });
          break;
        case "review":
          result = await recordRealPathwayEvidenceReview(client, {
            pathwayId: input.pathwayId,
            revisionId: input.revisionId,
            review: { reviewerUserId: actor.id, claims: input.claims },
          });
          break;
        case "approve":
          result = await approveRealPathwayDraft(client, {
            pathwayId: input.pathwayId,
            revisionId: input.revisionId,
            reviewerUserId: actor.id,
          });
          break;
        case "publish":
          result = await publishApprovedRealPathway(client, {
            pathwayId: input.pathwayId,
            revisionId: input.revisionId,
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
      return NextResponse.json({ error: "Sign in before managing Pathways." }, { status: 401, headers: noStore });
    }
    if (error instanceof AdminAccessDeniedError) {
      return NextResponse.json({ error: "Catalogue administration is not enabled for this account." }, { status: 403, headers: noStore });
    }
    console.error("[careerbridge-next] Pathways lifecycle action failed", error);
    return NextResponse.json(
      { error: "The Pathways lifecycle action could not be completed." },
      { status: 503, headers: noStore },
    );
  }
}
