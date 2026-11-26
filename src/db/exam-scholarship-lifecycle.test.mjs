import assert from "node:assert/strict";
import test from "node:test";
import * as publisher from "../../scripts/publish-real-pathway.mjs";

const externalKey = "neet-ug";
const revisionId = "47076958-a045-4a70-aa1f-5fc8f05ed649";
const itemId = "4dfc9323-b842-44c9-e3d3-259be5651f3b";
const originalSourceId = "53000000-0000-4000-8000-000000000001";
const alternativeSourceId = "53000000-0000-4000-8000-000000000002";
const originalSourceUrl = "https://www.nta.gov.in/exams/neet/";
const alternativeSourceUrl = "https://neet.nta.nic.in/";
const verifiedClaims = [
  "examination.level",
  "examination.purpose",
  "examination.authority",
];
const requiredClaims = [
  "examination.title",
  "examination.summary",
  "examination.description",
  "examination.level",
  "examination.stages",
  "examination.purpose",
  "examination.authority",
  "examination.programmes",
  "examination.official_url",
];

function sourceRecord({
  id,
  sourceName,
  authority,
  canonicalUrl,
  category = "examination",
}) {
  return {
    id,
    source_name: sourceName,
    authority,
    canonical_url: canonicalUrl,
    normalized_url: canonicalUrl,
    category,
    source_type: "official_public_web_page",
    data_types: [],
    terms_notes: null,
    expected_update_behavior: null,
    status: "active",
  };
}

function makeClient() {
  const originalSource = sourceRecord({
    id: originalSourceId,
    sourceName: "NEET (UG) 2027 information",
    authority: "National Testing Agency, Ministry of Education, Government of India",
    canonicalUrl: originalSourceUrl,
  });
  const state = {
    sourceRegistry: [originalSource],
    provenance: requiredClaims.map((claimKey) => ({
      source_id: originalSourceId,
      claim_key: claimKey,
      checked_at: new Date("2026-11-26T05:43:27.457Z"),
      verified_at: null,
      verification_status: "unavailable",
      ...originalSource,
    })),
    revision: {
      item_id: itemId,
      item_type: "examination",
      published_revision_id: null,
      id: revisionId,
      catalog_item_id: itemId,
      revision_number: 1,
      publication_status: "in_review",
      data_classification: "real",
      verification_status: "unavailable",
      updated_by: 1,
      title: "National Eligibility-cum-Entrance Test (UG) (NEET-UG) 2027",
      summary: "A national entrance examination for undergraduate medical study.",
      description: "Use official current-cycle information for eligibility and application details.",
      published_at: null,
      published_by: null,
      typed_revision_id: revisionId,
      level: "national",
      stages: ["class-12"],
      purpose: "Single national entrance test for undergraduate medical programmes.",
      programmes: ["MBBS"],
      authority: "National Testing Agency, Ministry of Education, Government of India",
      regions: [],
      fields: [],
      official_url: originalSourceUrl,
    },
    aliases: [{
      sourceSystem: "careerbridge",
      externalType: "examination",
      externalKey,
      externalContextKey: "",
    }],
  };

  const client = {
    async query(sql, params = []) {
      const statement = String(sql).trim();
      if (/^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)\b/.test(statement)) {
        return { rowCount: 0, rows: [] };
      }
      if (statement.includes("pg_advisory_xact_lock")) return { rowCount: 1, rows: [] };
      if (statement.includes("FROM public.users")) return { rowCount: 1, rows: [{ id: params[0] }] };
      if (statement.includes("a.source_system='careerbridge'") && statement.includes("r.id=$3")) {
        return params[1] === externalKey && params[2] === revisionId
          ? { rowCount: 1, rows: [{ ...state.revision }] }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes('SELECT source_system AS "sourceSystem"')) {
        return { rowCount: state.aliases.length, rows: state.aliases };
      }
      if (statement.includes("SELECT crs.source_id")) {
        const rows = state.provenance
          .slice()
          .sort((left, right) =>
            left.claim_key.localeCompare(right.claim_key) || left.source_id.localeCompare(right.source_id),
          );
        return { rowCount: rows.length, rows };
      }
      if (statement.includes("SELECT public.normalize_source_url($1)")) {
        return { rowCount: 1, rows: [{ normalized_url: params[0] }] };
      }
      if (statement.includes("FROM public.source_registry") && statement.includes("WHERE normalized_url = $1")) {
        const matches = state.sourceRegistry.filter((source) => source.normalized_url === params[0]);
        return { rowCount: matches.length, rows: matches.slice(0, 2) };
      }
      if (statement.startsWith("INSERT INTO public.source_registry")) {
        const source = sourceRecord({
          id: alternativeSourceId,
          sourceName: params[0],
          authority: params[1],
          canonicalUrl: params[2],
          category: params[3],
        });
        source.source_type = params[4];
        source.data_types = params[5];
        source.terms_notes = params[6];
        source.expected_update_behavior = params[7];
        source.status = params[8];
        state.sourceRegistry.push(source);
        return { rowCount: 1, rows: [source] };
      }
      if (statement.startsWith("INSERT INTO public.catalog_revision_sources")) {
        const [, sourceId, claimKey] = params;
        const exists = state.provenance.some((entry) =>
          entry.source_id === sourceId && entry.claim_key === claimKey,
        );
        if (exists) return { rowCount: 0, rows: [] };
        const source = state.sourceRegistry.find((entry) => entry.id === sourceId);
        state.provenance.push({
          ...source,
          source_id: sourceId,
          claim_key: claimKey,
          checked_at: null,
          verified_at: null,
          verification_status: "pending_review",
        });
        return { rowCount: 1, rows: [{ source_id: sourceId }] };
      }
      if (statement.startsWith("UPDATE public.catalog_revision_sources AS crs")) {
        const [targetRevisionId, claimKey, decision, sourceUrls] = params;
        const matches = state.provenance.filter((entry) =>
          targetRevisionId === revisionId &&
          entry.claim_key === claimKey &&
          sourceUrls.includes(entry.canonical_url ?? entry.normalized_url),
        );
        for (const entry of matches) {
          entry.checked_at = new Date();
          entry.verified_at = decision === "verified" ? new Date() : null;
          entry.verification_status = decision;
        }
        return { rowCount: matches.length, rows: [] };
      }
      if (statement.includes("BOOL_OR(verification_status='verified'")) {
        const rows = [...new Set(state.provenance.map((entry) => entry.claim_key))].map((claimKey) => {
          const entries = state.provenance.filter((entry) => entry.claim_key === claimKey);
          return {
            claim_key: claimKey,
            has_verified: entries.some((entry) => entry.verification_status === "verified" && entry.verified_at),
            has_disputed: entries.some((entry) => entry.verification_status === "disputed"),
          };
        });
        return { rowCount: rows.length, rows };
      }
      if (statement.startsWith("UPDATE public.catalog_item_revisions")) {
        state.revision.verification_status = params[1];
        state.revision.updated_by = params[2];
        return { rowCount: 1, rows: [{ id: revisionId }] };
      }
      throw new Error(`Unexpected SQL in exam-scholarship lifecycle test: ${statement.slice(0, 120)}`);
    },
  };
  return { client, state };
}

const source = {
  sourceName: "NATIONAL ELIGIBILITY CUM ENTRANCE TEST | NEET | India",
  authority: "National Testing Agency, Ministry of Education, Government of India",
  canonicalUrl: alternativeSourceUrl,
  category: "examination",
  sourceType: "official_public_web_page",
  status: "active",
};

function associationInput(claimKeys = verifiedClaims) {
  return {
    kind: "exam",
    externalKey,
    revisionId,
    reviewerUserId: 7,
    source,
    claimKeys,
  };
}

test("source association is idempotent and review changes only the selected source rows", async () => {
  const mock = makeClient();
  const first = await publisher.associateRealExamScholarshipReviewSource(
    mock.client,
    associationInput(),
  );
  assert.equal(first.sourceRegistryAction, "inserted");
  assert.equal(first.associationsAdded, 3);

  const repeated = await publisher.associateRealExamScholarshipReviewSource(
    mock.client,
    associationInput(),
  );
  assert.equal(repeated.sourceRegistryAction, "reused");
  assert.equal(repeated.associationsAdded, 0);
  assert.equal(mock.state.provenance.length, 12);

  const claims = requiredClaims.map((claimKey) => ({
    claimKey,
    decision: verifiedClaims.includes(claimKey) ? "verified" : "unavailable",
    sourceUrls: [verifiedClaims.includes(claimKey) ? alternativeSourceUrl : originalSourceUrl],
    ...(verifiedClaims.includes(claimKey) ? { reviewedDirectly: true } : {}),
  }));
  const result = await publisher.recordRealExamScholarshipEvidenceReview(mock.client, {
    kind: "exam",
    externalKey,
    revisionId,
    reviewerUserId: 7,
    claims,
  });

  assert.deepEqual(result.verifiedClaims.sort(), [...verifiedClaims].sort());
  assert.equal(result.unresolvedClaims.length, 6);
  assert.equal(result.evidenceCount, 12);
  assert.equal(mock.state.revision.publication_status, "in_review");
  assert.equal(mock.state.revision.published_revision_id, null);
  assert.equal(mock.state.revision.verification_status, "partially_verified");
  assert.equal(mock.state.provenance.filter((entry) => entry.verification_status === "verified").length, 3);
  assert.equal(mock.state.provenance.filter((entry) => entry.verification_status === "unavailable").length, 9);
  assert.ok(mock.state.provenance
    .filter((entry) => entry.source_id === originalSourceId)
    .every((entry) => entry.verification_status === "unavailable" && entry.verified_at === null));
});

test("source association rejects claim keys outside the revision without adding registry records", async () => {
  const mock = makeClient();
  await assert.rejects(
    publisher.associateRealExamScholarshipReviewSource(
      mock.client,
      associationInput(["examination.not_a_claim"]),
    ),
    /existing required claim keys/,
  );
  assert.equal(mock.state.sourceRegistry.length, 1);
  assert.equal(mock.state.provenance.length, 9);
});
