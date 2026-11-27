import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const loadModule = createRequire(import.meta.url);
const Module = loadModule("node:module");
const ts = loadModule("typescript");
loadModule.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = loadModule("node:fs");
  const output = ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

class AdminAuthenticationRequiredError extends Error {}
class AdminAccessDeniedError extends Error {}

const state = {
  user: { id: 1 },
  authorized: false,
  authorizationCalls: 0,
  developmentTargetAllowed: true,
  developmentTargetChecks: 0,
  databaseName: "neondb",
  actions: [],
  lookupResult: null,
  lookups: [],
  listRows: [],
  listQuery: null,
};

const adminAuthorization = {
  AdminAuthenticationRequiredError,
  AdminAccessDeniedError,
  async requireAdmin() {
    state.authorizationCalls += 1;
    if (!state.user) throw new AdminAuthenticationRequiredError();
    if (!state.authorized) throw new AdminAccessDeniedError();
    return { id: state.user.id };
  },
};

const database = {
  async query(sql, params) {
    if (/role='admin'/.test(String(sql))) {
      return state.authorized
        ? { rowCount: 1, rows: [{ id: params[0] }] }
        : { rowCount: 0, rows: [] };
    }
    return { rowCount: 1, rows: [{ database_name: state.databaseName }] };
  },
  async connect() {
    return {
      async query(sql, params = []) {
        if (String(sql).trim() === "BEGIN" || String(sql).trim() === "COMMIT" ||
            String(sql).trim() === "ROLLBACK") {
          return { rowCount: 0, rows: [] };
        }
        if (/role='admin'/.test(String(sql))) {
          return state.authorized
            ? { rowCount: 1, rows: [{ id: 1 }] }
            : { rowCount: 0, rows: [] };
        }
        if (String(sql).includes("FROM public.catalog_items i")) {
          state.listQuery = { sql: String(sql), params };
          return { rowCount: state.listRows.length, rows: state.listRows };
        }
        return { rowCount: 1, rows: [{ database_name: state.databaseName }] };
      },
      release() {},
    };
  },
};

const publisher = Object.fromEntries([
  "associateRealExamScholarshipReviewSource",
  "submitRealExamScholarshipDraftForReview",
  "recordRealExamScholarshipEvidenceReview",
  "approveRealExamScholarshipDraft",
  "rejectRealExamScholarshipDraft",
  "publishApprovedRealExamScholarship",
].map((name) => [name, async (_client, input) => {
  state.actions.push({ name, input });
  return { action: name };
}]));
publisher.getRealExamScholarshipReviewRecord = async (_client, input) => {
  state.lookups.push(input);
  return state.lookupResult;
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "next/server") {
    return {
      connection: async () => {},
      NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) },
    };
  }
  if (request === "../../../../admin-auth" && parent?.filename.endsWith("catalogue\\lifecycle\\route.ts")) {
    return adminAuthorization;
  }
  if (request === "../../../../../db/pool" && parent?.filename.endsWith("catalogue\\lifecycle\\route.ts")) {
    return { getIdentityLockPool: () => database };
  }
  if (request === "../../../../../../scripts/import-real-pathway-draft.mjs" &&
      parent?.filename.endsWith("catalogue\\lifecycle\\route.ts")) {
    return {
      assertDevelopmentTarget() {
        state.developmentTargetChecks += 1;
        if (!state.developmentTargetAllowed) throw new Error("Development target refused.");
      },
      verifyNeonDevelopmentEndpoint() {},
    };
  }
  if (request === "../../../../../../scripts/publish-real-pathway.mjs" &&
      parent?.filename.endsWith("catalogue\\lifecycle\\route.ts")) {
    return publisher;
  }
  return originalLoad.call(this, request, parent, isMain);
};
const route = loadModule("./api/admin/catalogue/lifecycle/route.ts");
Module._load = originalLoad;

function request(body, origin = "http://localhost") {
  return new Request("http://localhost/api/admin/catalogue/lifecycle", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body,
  });
}

function reset() {
  state.user = { id: 1 };
  state.authorized = false;
  state.authorizationCalls = 0;
  state.developmentTargetAllowed = true;
  state.developmentTargetChecks = 0;
  state.databaseName = "neondb";
  state.actions = [];
  state.lookupResult = null;
  state.lookups = [];
  state.listRows = [];
  state.listQuery = null;
}

function getRequest(url) {
  return new Request(url);
}

test("catalogue lifecycle rejects unauthenticated submissions", async () => {
  reset();
  state.user = null;
  const response = await route.POST(request(JSON.stringify({
    action: "submit",
    kind: "exam",
    externalKey: "jee-main",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
  })));
  assert.equal(response.status, 401);
  assert.equal(state.actions.length, 0);

  const malformed = await route.POST(request("{"));
  assert.equal(malformed.status, 401);
  assert.equal(state.actions.length, 0);
});

test("catalogue lifecycle GET rejects unauthenticated and non-admin requests", async () => {
  reset();
  state.user = null;
  const unauthenticated = await route.GET(getRequest(
    "http://localhost/api/admin/catalogue/lifecycle?kind=campus",
  ));
  assert.equal(unauthenticated.status, 401);
  assert.equal(state.authorizationCalls, 1);

  reset();
  const nonAdmin = await route.GET(getRequest(
    "http://localhost/api/admin/catalogue/lifecycle?kind=campus",
  ));
  assert.equal(nonAdmin.status, 403);
  assert.equal(state.authorizationCalls, 1);
});

test("catalogue lifecycle rejects non-admin submissions", async () => {
  reset();
  const response = await route.POST(request(JSON.stringify({
    action: "submit",
    kind: "exam",
    externalKey: "jee-main",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
  })));
  assert.equal(response.status, 403);
  assert.equal(state.actions.length, 0);

  const malformed = await route.POST(request("{"));
  assert.equal(malformed.status, 403);
  assert.equal(state.actions.length, 0);
});

test("catalogue lifecycle cannot be authorized by client-supplied actor fields", async () => {
  reset();
  state.authorized = true;
  const response = await route.POST(request(JSON.stringify({
    action: "submit",
    kind: "exam",
    externalKey: "jee-main",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
    actorId: 99,
    role: "admin",
  })));
  assert.equal(response.status, 422);
  assert.equal(state.authorizationCalls, 1);
  assert.equal(state.actions.length, 0);
});

test("catalogue lifecycle refuses a failed development target guard", async () => {
  reset();
  state.authorized = true;
  state.developmentTargetAllowed = false;
  const response = await route.POST(request(JSON.stringify({
    action: "submit",
    kind: "exam",
    externalKey: "jee-main",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
  })));
  assert.equal(response.status, 503);
  assert.equal(state.developmentTargetChecks, 1);
  assert.equal(state.authorizationCalls, 0);
  assert.equal(state.actions.length, 0);
});

test("catalogue lifecycle refuses a connection outside neondb", async () => {
  reset();
  state.authorized = true;
  state.databaseName = "production";
  const response = await route.POST(request(JSON.stringify({
    action: "submit",
    kind: "exam",
    externalKey: "jee-main",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
  })));
  assert.equal(response.status, 503);
  assert.equal(state.actions.length, 0);
});

test("catalogue lifecycle derives actor ID and requires direct review attestation", async () => {
  reset();
  state.authorized = true;
  const missingAttestation = await route.POST(request(JSON.stringify({
    action: "review",
    kind: "scholarship",
    externalKey: "test-scholarship",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
    claims: [{
      claimKey: "scholarship.title",
      decision: "verified",
      sourceUrls: ["https://official.example/source"],
    }],
  })));
  assert.equal(missingAttestation.status, 422);
  assert.equal(state.actions.length, 0);

  const response = await route.POST(request(JSON.stringify({
    action: "review",
    kind: "scholarship",
    externalKey: "test-scholarship",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
    claims: [{
      claimKey: "scholarship.title",
      decision: "verified",
      sourceUrls: ["https://official.example/source"],
      reviewedDirectly: true,
    }],
  })));
  assert.equal(response.status, 200);
  assert.equal(state.actions[0].input.reviewerUserId, 1);
});

test("catalogue lifecycle associates only valid active official sources for existing claim keys", async () => {
  reset();
  state.authorized = true;
  const source = {
    sourceName: "NATIONAL ELIGIBILITY CUM ENTRANCE TEST | NEET | India",
    authority: "National Testing Agency, Ministry of Education, Government of India",
    canonicalUrl: "https://neet.nta.nic.in/",
    category: "examination",
    sourceType: "official_public_web_page",
    status: "active",
  };
  const body = {
    action: "associate-source",
    kind: "exam",
    externalKey: "neet-ug",
    revisionId: "47076958-a045-4a70-aa1f-5fc8f05ed649",
    source,
    claimKeys: ["examination.level", "examination.purpose", "examination.authority"],
  };
  const response = await route.POST(request(JSON.stringify(body)));
  assert.equal(response.status, 200);
  assert.equal(state.actions[0].name, "associateRealExamScholarshipReviewSource");
  assert.equal(state.actions[0].input.reviewerUserId, 1);
  assert.deepEqual(state.actions[0].input.claimKeys, body.claimKeys);

  reset();
  state.authorized = true;
  const invalid = await route.POST(request(JSON.stringify({
    ...body,
    source: { ...source, canonicalUrl: "http://neet.nta.nic.in/" },
  })));
  assert.equal(invalid.status, 422);
  assert.equal(state.actions.length, 0);

  const mismatchedCategory = await route.POST(request(JSON.stringify({
    ...body,
    source: { ...source, category: "scholarship" },
  })));
  assert.equal(mismatchedCategory.status, 422);
  assert.equal(state.actions.length, 0);

  state.authorized = false;
  const nonAdmin = await route.POST(request(JSON.stringify(body)));
  assert.equal(nonAdmin.status, 403);
  assert.equal(state.actions.length, 0);
});

test("catalogue lifecycle reuses authenticated review actions for institution records", async () => {
  reset();
  state.authorized = true;
  const body = {
    action: "associate-source",
    kind: "course_offering",
    externalKey: "a3-bca-offering",
    externalContextKey: "a3-course",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
    source: {
      sourceName: "A3 Institution Admissions",
      authority: "A3 Institution",
      canonicalUrl: "https://college.example/admissions",
      category: "course_offering",
      sourceType: "official_public_web_page",
      status: "active",
    },
    claimKeys: ["offering.eligibility"],
  };
  const contextless = { ...body };
  delete contextless.externalContextKey;
  const contextlessResponse = await route.POST(request(JSON.stringify(contextless)));
  assert.equal(contextlessResponse.status, 422);
  assert.equal(state.actions.length, 0);

  const response = await route.POST(request(JSON.stringify(body)));
  assert.equal(response.status, 200);
  assert.equal(state.actions[0].name, "associateRealExamScholarshipReviewSource");
  assert.equal(state.actions[0].input.kind, "course_offering");
  assert.equal(state.actions[0].input.externalContextKey, "a3-course");

  reset();
  state.authorized = true;
  const invalidClaim = await route.POST(request(JSON.stringify({
    ...body,
    claimKeys: ["institution.website"],
  })));
  assert.equal(invalidClaim.status, 422);
  assert.equal(state.actions.length, 0);

  reset();
  state.authorized = true;
  const review = await route.POST(request(JSON.stringify({
    action: "review",
    kind: "institution",
    externalKey: "a3-institution",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
    claims: [{
      claimKey: "institution.website",
      decision: "verified",
      sourceUrls: ["https://college.example/"],
      reviewedDirectly: true,
    }],
  })));
  assert.equal(review.status, 200);
  assert.equal(state.actions[0].name, "recordRealExamScholarshipEvidenceReview");
  assert.equal(state.actions[0].input.kind, "institution");
  assert.equal(state.actions[0].input.externalContextKey, "");
});

test("course-offering lifecycle lookup requires and forwards the exact course context", async () => {
  reset();
  state.authorized = true;
  const baseUrl = "http://localhost/api/admin/catalogue/lifecycle";
  const lookup = {
    kind: "course_offering",
    externalKey: "a3-bca-offering",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
  };
  const missingContext = await route.GET(getRequest(
    `${baseUrl}?kind=course_offering&externalKey=${lookup.externalKey}&revisionId=${lookup.revisionId}`,
  ));
  assert.equal(missingContext.status, 400);
  assert.equal(state.lookups.length, 0);

  state.lookupResult = { ...lookup, externalContextKey: "a3-course" };
  const response = await route.GET(getRequest(
    `${baseUrl}?kind=course_offering&externalKey=${lookup.externalKey}&externalContextKey=a3-course&revisionId=${lookup.revisionId}`,
  ));
  assert.equal(response.status, 200);
  assert.deepEqual(state.lookups[0], { ...lookup, externalContextKey: "a3-course" });

  const invalidContext = await route.GET(getRequest(
    `${baseUrl}?kind=course_offering&externalKey=${lookup.externalKey}&externalContextKey=&revisionId=${lookup.revisionId}`,
  ));
  assert.equal(invalidContext.status, 400);
  assert.equal(state.lookups.length, 1);
});

test("review lists keep empty contexts for ordinary records and return canonical offering context", async () => {
  reset();
  state.authorized = true;
  state.listRows = [{
    item_id: "a3000000-0000-4000-8000-000000000031",
    published_revision_id: null,
    external_key: "a3-bca-offering",
    external_context_key: "a3-course",
    revision_id: "4e059b7f-91eb-4e84-aba0-11268020cac3",
    revision_number: 1,
    publication_status: "draft",
    verification_status: "pending_review",
    title: "A3 BCA Offering",
    summary: null,
    updated_at: new Date("2026-11-26T00:00:00.000Z"),
    typed_revision_id: "4e059b7f-91eb-4e84-aba0-11268020cac3",
  }];
  const baseUrl = "http://localhost/api/admin/catalogue/lifecycle";

  const offeringResponse = await route.GET(getRequest(`${baseUrl}?kind=course_offering`));
  assert.equal(offeringResponse.status, 200);
  const offeringBody = await offeringResponse.json();
  assert.equal(offeringBody.records[0].externalContextKey, "a3-course");
  assert.match(state.listQuery.sql, /course_context\.external_key=a\.external_context_key/);
  assert.match(state.listQuery.sql, /a\.external_context_key <> ''/);
  assert.match(state.listQuery.sql, /parent_alias\.external_key=a\.external_key/);

  reset();
  state.authorized = true;
  const ordinaryResponse = await route.GET(getRequest(`${baseUrl}?kind=campus`));
  assert.equal(ordinaryResponse.status, 200);
  assert.match(state.listQuery.sql, /AND a\.external_context_key=''/);
});
