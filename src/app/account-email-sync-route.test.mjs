import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const loadModule = createRequire(import.meta.url);
const Module = loadModule("node:module");
const ts = loadModule("typescript");
loadModule.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = loadModule("node:fs");
  const source = readFileSync(filename, "utf8");
  const output = ts.transpile(source, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

class AuthenticationRequiredError extends Error {}
class AccountDeletionPendingError extends Error {}
class AccountEmailConflictError extends Error {}
class AccountIdentityConflictError extends Error {}
class AccountProvisioningRequiredError extends Error {}
class AccountSessionChangedError extends Error {}
class AccountSetupValidationError extends Error {}

const state = { expectedUserId: null, error: null };
const authServer = {
  AccountDeletionPendingError,
  AccountEmailConflictError,
  AccountIdentityConflictError,
  AccountProvisioningRequiredError,
  AccountSessionChangedError,
  AccountSetupValidationError,
  AuthenticationRequiredError,
  async syncCurrentUserPrimaryEmail(expectedUserId) {
    state.expectedUserId = expectedUserId;
    if (state.error) throw state.error;
    return { id: 7, email: "student@example.test", name: "Test Student" };
  },
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "next/server") {
    return {
      connection: async () => {},
      NextResponse: {
        json: (body, init) => new Response(JSON.stringify(body), init),
      },
    };
  }
  if (request === "../../../../auth-server" && parent?.filename.endsWith("account\\email\\sync\\route.ts")) {
    return authServer;
  }
  return originalLoad.call(this, request, parent, isMain);
};
const route = loadModule("./api/account/email/sync/route.ts");
Module._load = originalLoad;

function request(body, origin = "http://localhost") {
  return new Request("http://localhost/api/account/email/sync", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
    },
    body,
  });
}

test("email sync route accepts only the expected Clerk identity and sends no email", async () => {
  state.expectedUserId = null;
  state.error = null;
  const response = await route.POST(request(JSON.stringify({ expectedUserId: "user_test_123" })));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    user: { id: 7, email: "student@example.test", name: "Test Student" },
  });
  assert.equal(state.expectedUserId, "user_test_123");
});

test("email sync route rejects client-supplied email addresses", async () => {
  state.expectedUserId = null;
  const response = await route.POST(request(JSON.stringify({
    expectedUserId: "user_test_123",
    email: "attacker@example.test",
  })));

  assert.equal(response.status, 422);
  assert.equal(state.expectedUserId, null);
});

test("email sync route rejects cross-origin requests", async () => {
  state.expectedUserId = null;
  const response = await route.POST(request(JSON.stringify({ expectedUserId: "user_test_123" }), "http://attacker.test"));

  assert.equal(response.status, 403);
  assert.equal(state.expectedUserId, null);
});

test("email conflict is reported without a success response", async () => {
  state.error = new AccountEmailConflictError("That email is already in use.");
  try {
    const response = await route.POST(request(JSON.stringify({ expectedUserId: "user_test_123" })));
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "That email is already in use." });
  } finally {
    state.error = null;
  }
});
