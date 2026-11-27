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
class AccountIdentityConflictError extends Error {}
class AccountProvisioningRequiredError extends Error {}

const state = {
  user: null,
  authorized: false,
  queries: [],
  authError: null,
  databaseError: null,
};
const authServer = {
  AuthenticationRequiredError,
  AccountDeletionPendingError,
  AccountIdentityConflictError,
  AccountProvisioningRequiredError,
  async getCurrentUser() {
    if (state.authError) throw state.authError;
    return state.user;
  },
};
const database = {
  async query(sql, params) {
    state.queries.push({ sql: String(sql), params });
    if (state.databaseError) throw state.databaseError;
    return state.authorized
      ? { rowCount: 1, rows: [{ id: params[0] }] }
      : { rowCount: 0, rows: [] };
  },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "./auth-server" && parent?.filename.endsWith("admin-auth.ts")) return authServer;
  if (request === "../db/pool" && parent?.filename.endsWith("admin-auth.ts")) {
    return { getPool: () => database };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const authorization = loadModule("./admin-auth.ts");
Module._load = originalLoad;

function reset() {
  state.user = null;
  state.authorized = false;
  state.queries = [];
  state.authError = null;
  state.databaseError = null;
}

test("Admin authorization rejects unauthenticated sessions", async () => {
  reset();
  await assert.rejects(
    authorization.requireAdmin(),
    authorization.AdminAuthenticationRequiredError,
  );
  assert.equal(state.queries.length, 0);
});

test("Admin authorization rejects an authenticated non-admin", async () => {
  reset();
  state.user = { id: 21, email: "student@example.test", name: "Student" };
  await assert.rejects(
    authorization.requireAdmin(),
    authorization.AdminAccessDeniedError,
  );
  assert.equal(state.queries[0].params[0], 21);
  assert.match(state.queries[0].sql, /role='admin'/);
  assert.match(state.queries[0].sql, /auth_provider='clerk'/);
  assert.match(state.queries[0].sql, /external_id IS NOT NULL/);
});

test("Admin authorization returns only the mapped internal actor ID", async () => {
  reset();
  state.user = { id: 42, email: "admin@example.test", name: "Admin" };
  state.authorized = true;
  const actor = await authorization.requireAdmin({
    id: 7,
    role: "admin",
    email: "forged@example.test",
  });
  assert.deepEqual(actor, { id: 42 });
  assert.deepEqual(state.queries[0].params, [42]);
});

test("Admin authorization fails closed when Clerk identity lookup throws", async () => {
  reset();
  state.authError = new AuthenticationRequiredError("Sign in again.");
  await assert.rejects(
    authorization.requireAdmin(),
    authorization.AdminAuthenticationRequiredError,
  );
  assert.equal(state.queries.length, 0);
});

test("Admin authorization fails closed when internal-user lookup throws", async () => {
  reset();
  state.user = { id: 42, email: "admin@example.test", name: "Admin" };
  state.databaseError = new Error("database unavailable");
  await assert.rejects(
    authorization.requireAdmin(),
    authorization.AdminAccessUnavailableError,
  );
  assert.equal(state.queries.length, 1);
});
