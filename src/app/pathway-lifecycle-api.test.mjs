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
  user: { id: 42, email: "admin@example.test", name: "Test Admin" },
  authorized: false,
  authCalls: 0,
  actions: [],
  queries: [],
};
const authServer = {
  AccountDeletionPendingError,
  AccountProvisioningRequiredError,
  AuthenticationRequiredError,
  async getCurrentUser() {
    state.authCalls += 1;
    return state.user;
  },
};
const database = {
  async query(sql, params) {
    state.queries.push({ sql: String(sql), params });
    return state.authorized ? { rowCount: 1, rows: [{ id: params[0] }] } : { rowCount: 0, rows: [] };
  },
  async connect() {
    return {
      async query() {
        return { rowCount: 1, rows: [{ database_name: "neondb" }] };
      },
      release() {},
    };
  },
};
const publisher = Object.fromEntries(
  ["submitRealPathwayDraftForReview", "recordRealPathwayEvidenceReview", "approveRealPathwayDraft", "publishApprovedRealPathway"]
    .map((name) => [name, async (_client, input) => {
      state.actions.push({ name, input });
      return { action: name };
    }]),
);
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "next/server") {
    return {
      connection: async () => {},
      NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) },
    };
  }
  if (request === "../../../../auth-server" && parent?.filename.endsWith("pathways\\lifecycle\\route.ts")) return authServer;
  if (request === "../../../../../db/pool" && parent?.filename.endsWith("pathways\\lifecycle\\route.ts")) {
    return { getPool: () => database, getIdentityLockPool: () => database };
  }
  if (request === "../../../../../../scripts/import-real-pathway-draft.mjs" && parent?.filename.endsWith("pathways\\lifecycle\\route.ts")) {
    return { assertDevelopmentTarget() {}, verifyNeonDevelopmentEndpoint() {} };
  }
  if (request === "../../../../../../scripts/publish-real-pathway.mjs" && parent?.filename.endsWith("pathways\\lifecycle\\route.ts")) {
    return publisher;
  }
  return originalLoad.call(this, request, parent, isMain);
};
const route = loadModule("./api/admin/pathways/lifecycle/route.ts");
Module._load = originalLoad;

function request(body, origin = "http://localhost") {
  return new Request("http://localhost/api/admin/pathways/lifecycle", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body,
  });
}

function reset() {
  state.user = { id: 42, email: "admin@example.test", name: "Test Admin" };
  state.authorized = false;
  state.authCalls = 0;
  state.actions = [];
  state.queries = [];
}

test("lifecycle route rejects client-selected reviewer identities", async () => {
  reset();
  const response = await route.POST(request(JSON.stringify({
    action: "submit",
    pathwayId: "open-schooling",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
    reviewerUserId: 7,
  })));

  assert.equal(response.status, 422);
  assert.equal(state.authCalls, 0);
  assert.equal(state.actions.length, 0);
});

test("lifecycle route rejects unauthenticated and cross-origin requests", async () => {
  reset();
  state.user = null;
  const unauthenticated = await route.POST(request(JSON.stringify({
    action: "submit",
    pathwayId: "open-schooling",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
  })));
  assert.equal(unauthenticated.status, 401);
  assert.equal(state.actions.length, 0);

  reset();
  const crossOrigin = await route.POST(request(JSON.stringify({
    action: "submit",
    pathwayId: "open-schooling",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
  }), "http://attacker.test"));
  assert.equal(crossOrigin.status, 403);
  assert.equal(state.authCalls, 0);
  assert.equal(state.actions.length, 0);
});

test("lifecycle route requires an authorized Clerk-backed admin session", async () => {
  reset();
  const response = await route.POST(request(JSON.stringify({
    action: "submit",
    pathwayId: "open-schooling",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
  })));

  assert.equal(response.status, 403);
  assert.equal(state.actions.length, 0);
  assert.equal(state.queries[0].params[0], 42);
  assert.match(state.queries[0].sql, /role='admin'/);
  assert.match(state.queries[0].sql, /auth_provider='clerk'/);
});

test("lifecycle route derives the actor from Clerk and delegates only after authorization", async () => {
  reset();
  state.authorized = true;
  const response = await route.POST(request(JSON.stringify({
    action: "submit",
    pathwayId: "open-schooling",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
  })));

  assert.equal(response.status, 200);
  assert.equal(state.actions.length, 1);
  assert.deepEqual(state.actions[0], {
    name: "submitRealPathwayDraftForReview",
    input: {
      pathwayId: "open-schooling",
      revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
      reviewerUserId: 42,
    },
  });
});

test("lifecycle review uses the authenticated actor instead of a client reviewer ID", async () => {
  reset();
  state.authorized = true;
  const claims = [{
    claimKey: "pathway.title",
    decision: "verified",
    sourceUrls: ["https://official.example/pathway"],
  }];
  const response = await route.POST(request(JSON.stringify({
    action: "review",
    pathwayId: "open-schooling",
    revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
    claims,
  })));

  assert.equal(response.status, 200);
  assert.deepEqual(state.actions[0], {
    name: "recordRealPathwayEvidenceReview",
    input: {
      pathwayId: "open-schooling",
      revisionId: "4e059b7f-91eb-4e84-aba0-11268020cac3",
      review: { reviewerUserId: 42, claims },
    },
  });
});
