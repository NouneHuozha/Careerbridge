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

const state = {};
const client = {
  async query(statement, values = []) {
    const query = statement.trim().replace(/\s+/g, " ");
    state.queries.push(query);

    if (query.startsWith("SELECT pg_advisory_lock")) {
      state.identityLocked = true;
      state.events.push("identity-lock");
      return { rows: [] };
    }
    if (query.startsWith("SELECT pg_advisory_unlock")) {
      state.identityLocked = false;
      state.events.push("identity-unlock");
      return { rows: [{ unlocked: true }] };
    }
    if (query === "BEGIN") {
      state.inTransaction = true;
      state.transactionUsers = new Map(state.users);
      state.events.push("begin");
      return { rows: [] };
    }
    if (query === "COMMIT") {
      state.inTransaction = false;
      state.transactionUsers = null;
      state.events.push("commit");
      return { rows: [] };
    }
    if (query === "ROLLBACK") {
      state.inTransaction = false;
      if (state.transactionUsers) state.users = new Map(state.transactionUsers);
      state.transactionUsers = null;
      state.events.push("rollback");
      return { rows: [] };
    }
    if (query.startsWith("DELETE FROM users")) {
      assert.equal(state.inTransaction, true);
      if (state.failForeignKey) {
        throw Object.assign(new Error("restricted reference"), { code: "23503" });
      }
      if (state.failDeleteOnce) {
        state.failDeleteOnce = false;
        throw Object.assign(new Error("temporary database failure"), { code: "08006" });
      }
      const existed = state.users.delete(values[0]);
      state.events.push("delete-careerbridge-user");
      return { rowCount: existed ? 1 : 0, rows: [] };
    }
    if (query.startsWith("INSERT INTO users")) {
      assert.equal(state.identityLocked, true);
      state.provisionCalls += 1;
      const [externalId, email, fullName] = values;
      let row = state.users.get(externalId);
      if (!row) {
        row = { id: state.nextId++, email, full_name: fullName, auth_provider: "clerk" };
        state.users.set(externalId, row);
      } else {
        row.email = email;
        row.full_name = fullName;
      }
      return { rows: [row], rowCount: 1 };
    }
    throw new Error(`Unexpected database statement: ${query}`);
  },
  release(error) {
    state.releasedWithError = error;
  },
};

const pool = {
  async query(statement, values = []) {
    const query = statement.trim().replace(/\s+/g, " ");
    state.queries.push(query);
    if (query.includes("to_regclass")) {
      return { rows: [{ users: "public.users", accountData: "public.account_data" }] };
    }
    if (query.startsWith("SELECT id, email, full_name")) {
      const row = state.users.get(values[0]);
      return { rows: row ? [row] : [] };
    }
    throw new Error(`Unexpected pool statement: ${query}`);
  },
  async connect() {
    return client;
  },
};

function resetState() {
  Object.assign(state, {
    clerkUserId: "user_test_123",
    clerkExists: true,
    clerkUser: {
      id: "user_test_123",
      firstName: "Test",
      lastName: "Student",
      primaryEmailAddressId: "email_test",
      emailAddresses: [{
        id: "email_test",
        emailAddress: "student@example.test",
        verification: { status: "verified" },
      }],
      privateMetadata: {},
    },
    users: new Map(),
    nextId: 7,
    provisionCalls: 0,
    failDeleteOnce: false,
    failClerkDeleteOnce: false,
    failForeignKey: false,
    identityLocked: false,
    inTransaction: false,
    transactionUsers: null,
    releasedWithError: null,
    queries: [],
    events: [],
  });
}

resetState();
const clerkServer = {
  auth: async () => ({ userId: state.clerkUserId }),
  currentUser: async () => state.clerkExists ? state.clerkUser : null,
  clerkClient: async () => ({
    users: {
      verifyPassword: async ({ password }) => {
        state.events.push("verify-password");
        if (password !== "correct-password") {
          throw Object.assign(new Error("invalid password"), { status: 422 });
        }
      },
      updateUserMetadata: async (_userId, metadata) => {
        state.events.push(metadata.privateMetadata.careerbridgeDeletionPending ? "mark-deletion" : "clear-deletion");
        if (metadata.privateMetadata.careerbridgeDeletionPending === null) {
          delete state.clerkUser.privateMetadata.careerbridgeDeletionPending;
        } else {
          Object.assign(state.clerkUser.privateMetadata, metadata.privateMetadata);
        }
      },
      deleteUser: async () => {
        assert.equal(state.inTransaction, false, "Clerk deletion must run outside a PostgreSQL transaction");
        state.events.push("delete-clerk-user");
        if (state.failClerkDeleteOnce) {
          state.failClerkDeleteOnce = false;
          throw Object.assign(new Error("temporary Clerk failure"), { status: 503 });
        }
        if (!state.clerkExists) {
          throw Object.assign(new Error("user not found"), { status: 404 });
        }
        state.clerkExists = false;
      },
    },
  }),
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "@clerk/nextjs/server") return clerkServer;
  if (request === "../db/pool" && parent?.filename.endsWith("auth-server.ts")) {
    return { getPool: () => pool };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const authServer = loadModule("./auth-server.ts");
Module._load = originalLoad;

test("missing internal users recover through idempotent Clerk provisioning", async () => {
  resetState();
  await assert.rejects(authServer.getCurrentUser(), authServer.AccountProvisioningRequiredError);

  const first = await authServer.provisionCurrentUser({
    privacyAccepted: true,
    ageAttestation: "adult",
  });
  const repeated = await authServer.provisionCurrentUser({
    privacyAccepted: true,
    ageAttestation: "adult",
  });

  assert.equal(first.id, repeated.id);
  assert.equal(state.users.size, 1);
  assert.equal(state.provisionCalls, 2);
  assert.equal(
    state.queries.some((query) => query.includes("ON CONFLICT (external_id) DO UPDATE")),
    true,
  );
  assert.equal(
    state.queries.some((query) => query.includes("userId")),
    false,
    "provisioning must not use a client-supplied internal ID",
  );
});

test("provisioning is blocked while account deletion is pending", async () => {
  resetState();
  state.clerkUser.privateMetadata.careerbridgeDeletionPending = true;

  await assert.rejects(
    authServer.provisionCurrentUser({ privacyAccepted: true, ageAttestation: "adult" }),
    authServer.AccountDeletionPendingError,
  );
  assert.equal(state.provisionCalls, 0);
});

test("incorrect reauthentication leaves both identities and data untouched", async () => {
  resetState();
  state.users.set(state.clerkUserId, { id: 7, auth_provider: "clerk" });

  assert.equal(await authServer.deleteAccount("wrong-password"), false);
  assert.equal(state.users.size, 1);
  assert.equal(state.clerkExists, true);
  assert.equal(state.clerkUser.privateMetadata.careerbridgeDeletionPending, undefined);
  assert.equal(state.events.includes("delete-careerbridge-user"), false);
  assert.equal(state.events.includes("delete-clerk-user"), false);
});

test("database failure keeps Clerk active and a retry finishes deletion", async () => {
  resetState();
  state.users.set(state.clerkUserId, { id: 7, auth_provider: "clerk" });
  state.failDeleteOnce = true;

  await assert.rejects(
    authServer.deleteAccount("correct-password"),
    authServer.AccountDeletionPartialError,
  );
  assert.equal(state.users.size, 1);
  assert.equal(state.clerkExists, true);
  assert.equal(state.clerkUser.privateMetadata.careerbridgeDeletionPending, true);

  assert.equal(await authServer.deleteAccount("correct-password"), true);
  assert.equal(state.users.size, 0);
  assert.equal(state.clerkExists, false);
  assert.ok(state.events.indexOf("commit") < state.events.indexOf("delete-clerk-user"));
});

test("Clerk failure after database commit can be retried without a user row", async () => {
  resetState();
  state.users.set(state.clerkUserId, { id: 7, auth_provider: "clerk" });
  state.failClerkDeleteOnce = true;

  await assert.rejects(
    authServer.deleteAccount("correct-password"),
    authServer.AccountDeletionPartialError,
  );
  assert.equal(state.users.size, 0);
  assert.equal(state.clerkExists, true);
  assert.equal(state.clerkUser.privateMetadata.careerbridgeDeletionPending, true);

  assert.equal(await authServer.deleteAccount("correct-password"), true);
  assert.equal(state.users.size, 0);
  assert.equal(state.clerkExists, false);
  assert.equal(
    state.events.filter((event) => event === "delete-careerbridge-user").length,
    2,
  );
});

test("restrictive catalogue references preserve the user and clear deletion state", async () => {
  resetState();
  state.users.set(state.clerkUserId, { id: 7, auth_provider: "clerk" });
  state.failForeignKey = true;

  await assert.rejects(
    authServer.deleteAccount("correct-password"),
    authServer.AccountDeletionBlockedError,
  );
  assert.equal(state.users.size, 1);
  assert.equal(state.clerkExists, true);
  assert.equal(state.clerkUser.privateMetadata.careerbridgeDeletionPending, undefined);
  assert.equal(state.events.includes("delete-clerk-user"), false);
});
