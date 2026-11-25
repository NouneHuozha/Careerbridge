import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as importer from "../../scripts/import-real-pathway-draft.mjs";
import * as publisher from "../../scripts/publish-real-pathway.mjs";

const require = createRequire(import.meta.url);
const { validateRealPathwayImportRecord } = require("./pathway-import-validation.ts");
const root = fileURLToPath(new URL("../../", import.meta.url));
const pathwayId = "open-schooling";
const revisionId = "52000000-0000-4000-8000-000000000001";
const itemId = "51000000-0000-4000-8000-000000000001";
const sourceId = "53000000-0000-4000-8000-000000000001";
const sourceUrl = "https://official.example/pathway";
const claimKeys = [
  "pathway.title", "pathway.summary", "pathway.description", "pathway.stage",
  "pathway.course_stage", "pathway.catalogue_group", "pathway.category",
  "pathway.steps", "pathway.progression", "pathway.qualification",
  "pathway.considerations",
];

function makeState({ classification = "real", status = "draft", verificationStatus = "pending_review" } = {}) {
  return {
    row: {
      item_id: itemId,
      item_type: "pathway",
      published_revision_id: null,
      id: revisionId,
      catalog_item_id: itemId,
      revision_number: 1,
      publication_status: status,
      data_classification: classification,
      verification_status: verificationStatus,
      updated_by: null,
      title: "Official pathway",
      summary: "A source-backed study route.",
      description: "A route description grounded in an official programme page.",
      published_at: status === "published" ? new Date("2026-11-25T12:00:00Z") : null,
      typed_revision_id: revisionId,
      stage: "class-10",
      course_stage: "class-12",
      catalogue_group: "Continue secondary education",
      category: "Alternative study mode",
      route_content: {
        steps: ["Check requirements", "Complete programme"],
        progression: [{ title: "Check requirements", description: "Confirm current rules." }],
        qualification: { title: "Programme qualification", description: "Meet current programme requirements." },
        considerations: [{ title: "Requirements vary", description: "Confirm details with the provider." }],
      },
    },
    aliases: [{ sourceSystem: "careerbridge", externalType: "pathway", externalKey: pathwayId, externalContextKey: "" }],
    provenance: claimKeys.map((claimKey) => ({
      source_id: sourceId,
      claim_key: claimKey,
      checked_at: new Date("2026-11-25T00:00:00Z"),
      verified_at: verificationStatus === "verified" ? new Date("2026-11-25T12:00:00Z") : null,
      verification_status: verificationStatus,
      source_name: "Official pathway page",
      authority: "Official Authority",
      canonical_url: sourceUrl,
      normalized_url: sourceUrl,
      category: "pathway",
      source_type: "official_public_web_page",
      data_types: ["pathway"],
      terms_notes: null,
      expected_update_behavior: null,
      status: "active",
    })),
  };
}

function fakeClient(initial = {}, userRoles = { 7: "admin", 8: "admin", 9: "admin" }) {
  const state = makeState(initial);
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql: String(sql), params });
      if (["BEGIN", "COMMIT", "ROLLBACK"].includes(String(sql))) return { rowCount: 0, rows: [] };
      if (String(sql).includes("pg_advisory_xact_lock")) return { rowCount: 1, rows: [] };
      if (String(sql).includes("FROM public.users")) {
        return userRoles[params[0]] === "admin"
          ? { rowCount: 1, rows: [{ id: params[0] }] }
          : { rowCount: 0, rows: [] };
      }
      if (String(sql).includes("a.source_system='careerbridge'") && String(sql).includes("r.id=$2")) {
        return params[0] === pathwayId && params[1] === revisionId ? { rowCount: 1, rows: [{ ...state.row }] } : { rowCount: 0, rows: [] };
      }
      if (String(sql).includes("SELECT source_system AS \"sourceSystem\"")) return { rowCount: state.aliases.length, rows: state.aliases };
      if (String(sql).includes("SELECT crs.source_id")) return { rowCount: state.provenance.length, rows: state.provenance };
      if (String(sql).startsWith("UPDATE public.catalog_revision_sources")) {
        for (const entry of state.provenance.filter((item) => item.claim_key === params[1])) {
          entry.checked_at = new Date();
          entry.verified_at = new Date();
          entry.verification_status = "verified";
        }
        return { rowCount: state.provenance.filter((item) => item.claim_key === params[1]).length, rows: [] };
      }
      if (String(sql).startsWith("UPDATE public.catalog_item_revisions")) {
        const statement = String(sql);
        if (statement.includes("SET publication_status='in_review'")) {
          assert.equal(params.length, 2);
          state.row.publication_status = "in_review";
        } else if (statement.includes("SET publication_status='approved'")) {
          assert.equal(params.length, 2);
          state.row.publication_status = "approved";
        }
        else if (statement.includes("SET publication_status='published'")) {
          state.row.publication_status = "published";
          state.row.published_at = new Date(params[2]);
        }
        if (statement.includes("SET verification_status='verified'")) {
          state.row.verification_status = "verified";
          state.row.updated_by = params[1];
        }
        return { rowCount: 1, rows: [{ id: revisionId }] };
      }
      if (String(sql).startsWith("UPDATE public.catalog_items")) {
        const expected = params[2];
        if (state.row.published_revision_id !== expected) return { rowCount: 0, rows: [] };
        state.row.published_revision_id = params[1];
        return { rowCount: 1, rows: [{ id: itemId }] };
      }
      if (String(sql).includes("count(crs.source_id)::int AS provenance_count")) {
        return { rowCount: 1, rows: [{
          published_revision_id: state.row.published_revision_id,
          publication_status: state.row.publication_status,
          data_classification: state.row.data_classification,
          verification_status: state.row.verification_status,
          typed_revision_id: revisionId,
          provenance_count: state.provenance.length,
        }] };
      }
      if (String(sql).startsWith("SELECT claim_key FROM public.catalog_revision_sources")) {
        return { rowCount: state.provenance.length, rows: state.provenance.filter((entry) => entry.verification_status === "verified").map(({ claim_key }) => ({ claim_key })) };
      }
      throw new Error(`Unexpected SQL in fake Pathways lifecycle client: ${String(sql).slice(0, 120)}`);
    },
  };
  return { client, state, calls };
}

function reviewDecision() {
  return {
    reviewerUserId: 7,
    claims: claimKeys.map((claimKey) => ({ claimKey, decision: "verified", sourceUrls: [sourceUrl] })),
  };
}

test("pilot payloads are structurally valid, source-backed, and explicitly left pending review", async () => {
  for (const name of ["nios-senior-secondary.json", "dgt-cts-trades.json", "dgt-apprenticeship.json"]) {
    const value = JSON.parse(await readFile(join(root, "docs/review/pathways-pilot", name), "utf8"));
    assert.doesNotThrow(() => validateRealPathwayImportRecord(value));
    assert.equal(value.revision.publicationStatus, "draft");
    assert.equal(value.revision.dataClassification, "real");
    assert.equal(value.revision.verificationStatus, "pending_review");
    assert.ok(value.revision.provenance.every((entry) => entry.verificationStatus === "pending_review" && !entry.verifiedAt));
  }

  const nios = JSON.parse(await readFile(join(root, "docs/review/pathways-pilot/nios-senior-secondary.json"), "utf8"));
  assert.equal(nios.revision.routeContent.considerations.length, 2);
  assert.ok(nios.revision.provenance
    .filter((entry) => entry.claimKey === "pathway.considerations")
    .every((entry) => entry.sourceKey === "nios-senior-secondary"));
});

test("development target guard refuses absent credentials, incorrect endpoints, and hosted execution", () => {
  assert.throws(() => importer.assertDevelopmentTarget({}), /DATABASE_URL_UNPOOLED/);
  const base = {
    directUrl: "postgresql://user:password@ep-divine-fog-a1uxos5z.ap-southeast-1.aws.neon.tech/neondb",
    pooledUrl: "postgresql://user:password@ep-divine-fog-a1uxos5z-pooler.ap-southeast-1.aws.neon.tech/neondb",
    projectId: "calm-brook-21165945",
    branchId: "br-wandering-flower-a1f6ys66",
    neonBranch: "development",
  };
  assert.throws(() => importer.assertDevelopmentTarget({ ...base, projectId: "production-project" }), /development project/);
  assert.throws(() => importer.assertDevelopmentTarget({ ...base, vercel: "1" }), /local development operations/);
  assert.throws(() => importer.assertDevelopmentTarget({ ...base, directUrl: base.directUrl.replace("ep-divine-fog-a1uxos5z", "production") }), /verified development endpoint/);
  assert.equal(importer.assertDevelopmentTarget(base).branchId, base.branchId);
});

test("draft preflight reaches review only when required claim evidence is present", async () => {
  const mock = fakeClient();
  const result = await publisher.preflightRealPathwayDraft(mock.client, { pathwayId, revisionId });
  assert.equal(result.outcome, "ready_for_review");
  assert.equal(result.requiredClaims.length, claimKeys.length);
  assert.equal(result.evidenceCount, claimKeys.length);
  const missing = fakeClient();
  missing.state.provenance = missing.state.provenance.filter((entry) => entry.claim_key !== "pathway.qualification");
  const blocked = await publisher.preflightRealPathwayDraft(missing.client, { pathwayId, revisionId });
  assert.equal(blocked.outcome, "blocked_evidence");
});

test("demo revisions cannot enter review, approval, or publication", async () => {
  const mock = fakeClient({ classification: "demo" });
  const result = await publisher.preflightRealPathwayDraft(mock.client, { pathwayId, revisionId });
  assert.equal(result.outcome, "invalid_state");
  await assert.rejects(publisher.submitRealPathwayDraftForReview(mock.client, { pathwayId, revisionId, reviewerUserId: 7 }), /Only real pathway revisions/);
});

test("student users cannot submit, review, approve, or publish pathways", async () => {
  const denied = new Error("Pathway lifecycle actions require an existing Clerk-backed CareerBridge administrator.");
  const student = { 7: "student" };

  await assert.rejects(
    publisher.submitRealPathwayDraftForReview(fakeClient({}, student).client, { pathwayId, revisionId, reviewerUserId: 7 }),
    denied,
  );
  await assert.rejects(
    publisher.recordRealPathwayEvidenceReview(
      fakeClient({ status: "in_review" }, student).client,
      { pathwayId, revisionId, review: reviewDecision() },
    ),
    denied,
  );
  await assert.rejects(
    publisher.approveRealPathwayDraft(
      fakeClient({ status: "in_review" }, student).client,
      { pathwayId, revisionId, reviewerUserId: 7 },
    ),
    denied,
  );
  const publishMock = fakeClient({ status: "approved", verificationStatus: "verified" }, student);
  await assert.rejects(
    publisher.publishApprovedRealPathway(publishMock.client, {
      pathwayId,
      revisionId,
      expectedPublishedRevisionId: null,
      publisherUserId: 7,
    }),
    denied,
  );
  assert.equal(publishMock.state.row.published_revision_id, null);
});

test("reviewer attestation, approval, and expected-pointer publication operate as separate transitions", async () => {
  const mock = fakeClient();
  const submitted = await publisher.submitRealPathwayDraftForReview(mock.client, { pathwayId, revisionId, reviewerUserId: 7 });
  assert.equal(submitted.action, "submitted_for_review");
  assert.equal(mock.state.row.publication_status, "in_review");
  await assert.rejects(
    publisher.approveRealPathwayDraft(mock.client, { pathwayId, revisionId, reviewerUserId: 7 }),
    /Every required claim must have verified source evidence/,
  );
  const invalidReview = reviewDecision();
  invalidReview.claims[0].sourceUrls = ["https://wrong.example/source"];
  await assert.rejects(publisher.recordRealPathwayEvidenceReview(mock.client, { pathwayId, revisionId, review: invalidReview }), /do not match/);
  assert.ok(mock.state.provenance.every((entry) => entry.verification_status === "pending_review"));
  const reviewed = await publisher.recordRealPathwayEvidenceReview(mock.client, { pathwayId, revisionId, review: reviewDecision() });
  assert.equal(reviewed.action, "evidence_verified");
  assert.equal(mock.state.row.verification_status, "verified");
  assert.equal(mock.state.row.updated_by, 7);
  assert.ok(mock.state.provenance.every((entry) => entry.verification_status === "verified" && entry.verified_at));
  const approved = await publisher.approveRealPathwayDraft(mock.client, { pathwayId, revisionId, reviewerUserId: 8 });
  const actorCheck = mock.calls.find((call) => call.sql.includes("FROM public.users"));
  assert.match(actorCheck.sql, /role='admin'/);
  assert.match(actorCheck.sql, /auth_provider='clerk'/);
  assert.match(actorCheck.sql, /external_id IS NOT NULL/);
  assert.match(actorCheck.sql, /FOR SHARE/);
  assert.equal(approved.action, "approved");
  assert.equal(mock.state.row.publication_status, "approved");
  assert.equal(approved.approverUserId, 8);
  assert.equal(approved.reviewerUserId, 7);
  const published = await publisher.publishApprovedRealPathway(mock.client, {
    pathwayId,
    revisionId,
    expectedPublishedRevisionId: null,
    publisherUserId: 9,
  });
  assert.equal(published.action, "published");
  assert.equal(mock.state.row.published_revision_id, revisionId);
  assert.equal(mock.state.row.publication_status, "published");
  assert.equal(published.reviewerUserId, 7);
  assert.equal(mock.state.row.updated_by, 7);
  assert.ok(mock.calls.some((call) => call.sql.includes("pg_advisory_xact_lock")));
});

test("publication refuses a stale expected pointer without replacing the current pointer", async () => {
  const mock = fakeClient({ status: "approved", verificationStatus: "verified" });
  await assert.rejects(
    publisher.publishApprovedRealPathway(mock.client, {
      pathwayId,
      revisionId,
      expectedPublishedRevisionId: "54000000-0000-4000-8000-000000000001",
      publisherUserId: 7,
    }),
    /published pointer does not match the expected revision/,
  );
  assert.equal(mock.state.row.published_revision_id, null);
  assert.equal(mock.state.row.publication_status, "approved");
});
