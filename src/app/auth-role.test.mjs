import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = require("node:fs");
  const output = ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

const state = { userId: null, role: null, rows: 1, error: null, queries: [] };
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "@clerk/nextjs/server" && parent?.filename.endsWith("auth-role.ts")) {
    return { auth: async () => ({ userId: state.userId }) };
  }
  if (request === "../db/pool" && parent?.filename.endsWith("auth-role.ts")) {
    return {
      getPool: () => ({
        async query(sql, params) {
          state.queries.push({ sql: String(sql), params });
          if (state.error) throw state.error;
          return {
            rowCount: state.rows,
            rows: state.rows ? [{ role: state.role }] : [],
          };
        },
      }),
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { getCurrentCareerBridgeRole } = require("./auth-role.ts");
Module._load = originalLoad;

function reset() {
  state.userId = null;
  state.role = null;
  state.rows = 1;
  state.error = null;
  state.queries = [];
}

test("role routing reads the role for the authenticated Clerk identity from users", async () => {
  reset();
  state.userId = "user_student";
  state.role = "student";

  assert.equal(await getCurrentCareerBridgeRole(), "student");
  assert.deepEqual(state.queries[0].params, ["user_student"]);
  assert.match(state.queries[0].sql, /FROM public\.users/);
  assert.match(state.queries[0].sql, /external_id = \$1 AND auth_provider = 'clerk'/);
});

test("role lookup does not query the database for an unauthenticated visitor", async () => {
  reset();
  assert.equal(await getCurrentCareerBridgeRole(), null);
  assert.equal(state.queries.length, 0);
});

test("role lookup distinguishes an authenticated but unprovisioned identity", async () => {
  reset();
  state.userId = "user_pending";
  state.rows = 0;
  assert.equal(await getCurrentCareerBridgeRole(), "unprovisioned");
});

test("role lookup fails closed on ambiguous mappings, unknown roles, or database errors", async () => {
  reset();
  state.userId = "user_duplicate";
  state.rows = 2;
  await assert.rejects(getCurrentCareerBridgeRole(), /ambiguous CareerBridge mapping/);

  reset();
  state.userId = "user_unknown_role";
  state.role = "owner";
  await assert.rejects(getCurrentCareerBridgeRole(), /unsupported role/);

  reset();
  state.userId = "user_database_error";
  state.error = new Error("database unavailable");
  await assert.rejects(getCurrentCareerBridgeRole(), /database unavailable/);
});
