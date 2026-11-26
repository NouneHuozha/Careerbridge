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

class AuthenticationRequiredError extends Error {}
class AccountDeletionPendingError extends Error {}
class AccountProvisioningRequiredError extends Error {}

const state = {
  user: { id: 1 },
  authorized: false,
  actions: [],
};

const authServer = {
  AuthenticationRequiredError,
  AccountDeletionPendingError,
  AccountProvisioningRequiredError,
  async getCurrentUser() {
    return state.user;
  },
};

const database = {
  async query(sql, params) {
    if (/role='admin'/.test(String(sql))) {
      return state.authorized
        ? { rowCount: 1, rows: [{ id: params[0] }] }
        : { rowCount: 0, rows: [] };
    }
    return { rowCount: 1, rows: [{ database_name: "neondb" }] };
  },
  async connect() {
    return {
      async query(sql) {
        if (String(sql).trim() === "BEGIN" || String(sql).trim() === "COMMIT" ||
            String(sql).trim() === "ROLLBACK") {
          return { rowCount: 0, rows: [] };
        }
        if (/role='admin'/.test(String(sql))) {
          return state.authorized
            ? { rowCount: 1, rows: [{ id: 1 }] }
            : { rowCount: 0, rows: [] };
        }
        return { rowCount: 1, rows: [{ database_name: "neondb" }] };
      },
      release() {},
    };
  },
};

const publisher = Object.fromEntries([
  "submitRealExamScholarshipDraftForReview",
  "recordRealExamScholarshipEvidenceReview",
  "approveRealExamScholarshipDraft",
  "rejectRealExamScholarshipDraft",
  "publishApprovedRealExamScholarship",
].map((name) => [name, async (_client, input) => {
  state.actions.push({ name, input });
  return { action: name };
}]));
publisher.getRealExamScholarshipReviewRecord = async () => null;

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "next/server") {
    return {
      connection: async () => {},
      NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) },
    };
  }
  if (request === "../../../../auth-server" && parent?.filename.endsWith("catalogue\\lifecycle\\route.ts")) {
    return authServer;
  }
  if (request === "../../../../../db/pool" && parent?.filename.endsWith("catalogue\\lifecycle\\route.ts")) {
    return { getPool: () => database, getIdentityLockPool: () => database };
  }
  if (request === "../../../../../../scripts/import-real-pathway-draft.mjs" &&
      parent?.filename.endsWith("catalogue\\lifecycle\\route.ts")) {
    return { assertDevelopmentTarget() {}, verifyNeonDevelopmentEndpoint() {} };
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
  state.actions = [];
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
