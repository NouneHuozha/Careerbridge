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
      state.lockClients.push(this);
      if (state.failLockOnce) {
        state.failLockOnce = false;
        throw state.lockError;
      }
      state.identityLocked = true;
      state.events.push("identity-lock");
      return { rows: [] };
    }
    if (query.startsWith("SELECT pg_advisory_unlock")) {
      state.unlockClients.push(this);
      if (state.failUnlockOnce) {
        state.failUnlockOnce = false;
        throw state.unlockError;
      }
      state.identityLocked = false;
      state.events.push("identity-unlock");
      if (state.unlockReturnsFalseOnce) {
        state.unlockReturnsFalseOnce = false;
        return { rows: [{ unlocked: false }] };
      }
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
    if (query.startsWith("SELECT id, email, full_name, auth_provider FROM users WHERE external_id = $1")) {
      const row = state.users.get(values[0]);
      return { rows: row ? [row] : [] };
    }
    if (query.startsWith("UPDATE users SET email = $2")) {
      assert.equal(state.identityLocked, true);
      state.emailUpdateAttempts.push({ externalId: values[0], email: values[1], query });
      if (state.failEmailUpdateOnce) {
        state.failEmailUpdateOnce = false;
        throw state.emailUpdateError;
      }
      if ([...state.users.entries()].some(([externalId, row]) =>
        externalId !== values[0] && row.email === values[1],
      )) {
        throw Object.assign(new Error("duplicate email"), { code: "23505" });
      }
      const row = state.users.get(values[0]);
      if (!row || row.auth_provider !== "clerk") return { rows: [] };
      row.email = values[1];
      state.emailUpdates.push({ externalId: values[0], email: values[1] });
      return { rows: [row] };
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
    state.releasedWithError.push(error);
    state.clientReleaseCount += 1;
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
};
const identityLockPool = {
  async connect() {
    state.directPoolConnects += 1;
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
    currentUserCalls: 0,
    currentUserResponses: [],
    users: new Map(),
    nextId: 7,
    provisionCalls: 0,
    failDeleteOnce: false,
    failClerkDeleteOnce: false,
    failForeignKey: false,
    identityLocked: false,
    inTransaction: false,
    transactionUsers: null,
    releasedWithError: [],
    directPoolConnects: 0,
    clientReleaseCount: 0,
    lockClients: [],
    unlockClients: [],
    failLockOnce: false,
    failUnlockOnce: false,
    unlockReturnsFalseOnce: false,
    lockError: Object.assign(new Error("lock acquisition failed"), { code: "08006" }),
    unlockError: Object.assign(new Error("lock release failed"), { code: "08006" }),
    queries: [],
    events: [],
    reverified: false,
    emailUpdateAttempts: [],
    emailUpdates: [],
    failEmailUpdateOnce: false,
    emailUpdateError: Object.assign(new Error("database unavailable"), { code: "08006" }),
  });
}

resetState();
const clerkServer = {
  auth: async () => ({
    userId: state.clerkUserId,
    has: ({ reverification }) => {
      state.events.push(`reverification:${reverification}:${state.reverified}`);
      return state.reverified && reverification === "strict";
    },
  }),
  currentUser: async () => {
    state.currentUserCalls += 1;
    if (state.currentUserResponses.length) {
      const response = state.currentUserResponses.shift();
      if (response instanceof Error) throw response;
      return response;
    }
    return state.clerkExists ? state.clerkUser : null;
  },
  clerkClient: async () => ({
    users: {
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
    return {
      getPool: () => pool,
      getIdentityLockPool: () => identityLockPool,
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const authServer = loadModule("./auth-server.ts");
Module._load = originalLoad;

function clerkApiError(status, code, message) {
  const error = Object.assign(new Error("ClerkAPIResponseError"), {
    errors: [{ code, message }],
  });
  if (status !== null) error.status = status;
  return error;
}

async function captureClerkLogs(action) {
  const logs = [];
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = (...args) => logs.push(args);
  console.error = (...args) => logs.push(args);
  try {
    const value = await action();
    return { value, logs };
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
}

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
  assert.equal(state.directPoolConnects, 2);
  assert.equal(state.lockClients.length, 2);
  assert.equal(state.unlockClients.length, 2);
  assert.ok(state.lockClients.every((lockClient, index) => lockClient === state.unlockClients[index]));
  assert.deepEqual(state.releasedWithError, [undefined, undefined]);
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

test("verified primary email sync updates only the authenticated Clerk user's email", async () => {
  resetState();
  state.users.set(state.clerkUserId, {
    id: 7,
    email: "old@example.test",
    full_name: "Test Student",
    auth_provider: "clerk",
  });
  state.users.set("user_other_456", {
    id: 8,
    email: "other@example.test",
    full_name: "Other Student",
    auth_provider: "clerk",
  });

  const result = await authServer.syncCurrentUserPrimaryEmail(state.clerkUserId);

  assert.deepEqual(result, { id: 7, email: "student@example.test", name: "Test Student" });
  assert.deepEqual(state.emailUpdates, [{
    externalId: state.clerkUserId,
    email: "student@example.test",
  }]);
  assert.match(state.emailUpdateAttempts[0].query, /^UPDATE users SET email = \$2 WHERE external_id = \$1 AND auth_provider = 'clerk'/);
  assert.equal(state.emailUpdateAttempts[0].query.includes("full_name ="), false);
  assert.equal(state.users.get("user_other_456").email, "other@example.test");
});

test("an unverified secondary email cannot be synced as the primary email", async () => {
  resetState();
  state.users.set(state.clerkUserId, {
    id: 7,
    email: "old@example.test",
    full_name: "Test Student",
    auth_provider: "clerk",
  });
  state.clerkUser.primaryEmailAddressId = "email_unverified";
  state.clerkUser.emailAddresses.push({
    id: "email_unverified",
    emailAddress: "new@example.test",
    verification: { status: "unverified" },
  });

  await assert.rejects(
    authServer.syncCurrentUserPrimaryEmail(state.clerkUserId),
    authServer.AccountSetupValidationError,
  );
  assert.equal(state.emailUpdateAttempts.length, 0);
  assert.equal(state.users.get(state.clerkUserId).email, "old@example.test");
});

test("email synchronization fails after Clerk changes but succeeds on retry", async () => {
  resetState();
  state.users.set(state.clerkUserId, {
    id: 7,
    email: "old@example.test",
    full_name: "Test Student",
    auth_provider: "clerk",
  });
  state.failEmailUpdateOnce = true;

  await assert.rejects(
    authServer.syncCurrentUserPrimaryEmail(state.clerkUserId),
    /database unavailable/,
  );
  assert.equal(state.clerkUser.primaryEmailAddressId, "email_test");
  assert.equal(state.users.get(state.clerkUserId).email, "old@example.test");

  const retry = await authServer.syncCurrentUserPrimaryEmail(state.clerkUserId);
  assert.equal(retry.email, "student@example.test");
  assert.equal(state.emailUpdateAttempts.length, 2);
  assert.equal(state.emailUpdates.length, 1);
});

test("duplicate email conflicts do not update either user's row", async () => {
  resetState();
  state.users.set(state.clerkUserId, {
    id: 7,
    email: "old@example.test",
    full_name: "Test Student",
    auth_provider: "clerk",
  });
  state.users.set("user_other_456", {
    id: 8,
    email: "student@example.test",
    full_name: "Other Student",
    auth_provider: "clerk",
  });

  await assert.rejects(
    authServer.syncCurrentUserPrimaryEmail(state.clerkUserId),
    authServer.AccountEmailConflictError,
  );
  assert.equal(state.users.get(state.clerkUserId).email, "old@example.test");
  assert.equal(state.users.get("user_other_456").email, "student@example.test");
});

test("repeated primary-email synchronization is idempotent", async () => {
  resetState();
  state.users.set(state.clerkUserId, {
    id: 7,
    email: "old@example.test",
    full_name: "Test Student",
    auth_provider: "clerk",
  });

  const first = await authServer.syncCurrentUserPrimaryEmail(state.clerkUserId);
  const repeated = await authServer.syncCurrentUserPrimaryEmail(state.clerkUserId);

  assert.equal(first.email, repeated.email);
  assert.equal(state.emailUpdateAttempts.length, 1);
  assert.equal(state.emailUpdates.length, 1);
});

test("session lookup synchronizes an externally changed verified Clerk primary email", async () => {
  resetState();
  state.users.set(state.clerkUserId, {
    id: 7,
    email: "old@example.test",
    full_name: "Test Student",
    auth_provider: "clerk",
  });

  const user = await authServer.getCurrentUser();

  assert.equal(user.email, "student@example.test");
  assert.equal(state.users.get(state.clerkUserId).email, "student@example.test");
  assert.equal(state.emailUpdates.length, 1);
});

test("a request for a different account cannot synchronize the current Clerk user's email", async () => {
  resetState();
  state.users.set(state.clerkUserId, {
    id: 7,
    email: "old@example.test",
    full_name: "Test Student",
    auth_provider: "clerk",
  });
  state.users.set("user_other_456", {
    id: 8,
    email: "other@example.test",
    full_name: "Other Student",
    auth_provider: "clerk",
  });

  await assert.rejects(
    authServer.syncCurrentUserPrimaryEmail("user_other_456"),
    authServer.AccountSessionChangedError,
  );
  assert.equal(state.emailUpdateAttempts.length, 0);
  assert.equal(state.users.get(state.clerkUserId).email, "old@example.test");
  assert.equal(state.users.get("user_other_456").email, "other@example.test");
});

test("provisioning callback failures still release the lock on the same client", async () => {
  resetState();
  state.clerkUser.emailAddresses[0].verification.status = "unverified";

  await assert.rejects(
    authServer.provisionCurrentUser({ privacyAccepted: true, ageAttestation: "adult" }),
    authServer.AccountSetupValidationError,
  );

  assert.deepEqual(state.events.filter((event) => event.startsWith("identity-")), [
    "identity-lock",
    "identity-unlock",
  ]);
  assert.equal(state.lockClients[0], state.unlockClients[0]);
  assert.deepEqual(state.releasedWithError, [undefined]);
});

test("callback errors survive unlock failures", async () => {
  resetState();
  state.clerkUser.emailAddresses[0].verification.status = "unverified";
  state.failUnlockOnce = true;
  const loggedErrors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => loggedErrors.push(args);

  try {
    await assert.rejects(
      authServer.provisionCurrentUser({ privacyAccepted: true, ageAttestation: "adult" }),
      authServer.AccountSetupValidationError,
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(loggedErrors.length, 1);
  assert.match(loggedErrors[0][0], /identity lock cleanup failed/);
  assert.equal(state.lockClients[0], state.unlockClients[0]);
  assert.equal(state.releasedWithError[0], state.unlockError);
});

test("lock acquisition failure skips the callback and discards the client", async () => {
  resetState();
  state.failLockOnce = true;

  await assert.rejects(
    authServer.provisionCurrentUser({ privacyAccepted: true, ageAttestation: "adult" }),
    /lock acquisition failed/,
  );

  assert.equal(state.provisionCalls, 0);
  assert.equal(state.unlockClients.length, 0);
  assert.equal(state.directPoolConnects, 1);
  assert.equal(state.releasedWithError[0], state.lockError);
});

test("provisioning retry reuses the row after a post-write unlock failure", async () => {
  resetState();
  state.unlockReturnsFalseOnce = true;

  await assert.rejects(
    authServer.provisionCurrentUser({ privacyAccepted: true, ageAttestation: "adult" }),
    /could not be released/,
  );
  assert.equal(state.users.size, 1);
  const existingId = state.users.get(state.clerkUserId).id;

  const retry = await authServer.provisionCurrentUser({
    privacyAccepted: true,
    ageAttestation: "adult",
  });

  assert.equal(retry.id, existingId);
  assert.equal(state.users.size, 1);
  assert.equal(state.provisionCalls, 2);
  assert.equal(state.lockClients[0], state.unlockClients[0]);
  assert.equal(state.lockClients[1], state.unlockClients[1]);
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

test("authenticated deletion requires fresh strict reverification and no password", async () => {
  resetState();
  state.users.set(state.clerkUserId, { id: 7, auth_provider: "clerk" });

  await assert.rejects(
    authServer.deleteAccount(state.clerkUserId),
    authServer.AccountReverificationRequiredError,
  );
  assert.equal(state.users.size, 1);
  assert.equal(state.events.includes("mark-deletion"), false);

  state.reverified = true;
  assert.equal(await authServer.deleteAccount(state.clerkUserId), true);
  assert.equal(state.users.size, 0);
  assert.equal(state.clerkExists, false);
  assert.equal(state.events.includes("verify-password"), false);
  assert.equal(state.events.includes("delete-careerbridge-user"), true);
  assert.equal(state.events.includes("delete-clerk-user"), true);
});

test("account deletion holds and releases the identity lock on its dedicated client", async () => {
  resetState();
  state.users.set(state.clerkUserId, { id: 7, auth_provider: "clerk" });
  state.reverified = true;

  assert.equal(await authServer.deleteAccount(state.clerkUserId), true);

  assert.equal(state.directPoolConnects, 1);
  assert.equal(state.lockClients[0], state.unlockClients[0]);
  assert.ok(
    state.events.indexOf("identity-lock") < state.events.indexOf("delete-careerbridge-user"),
  );
  assert.ok(
    state.events.indexOf("delete-clerk-user") < state.events.indexOf("identity-unlock"),
  );
});

test("fresh email-code verification can satisfy the strict Clerk server check", async () => {
  resetState();
  state.users.set(state.clerkUserId, { id: 7, auth_provider: "clerk" });
  state.reverified = true;

  assert.equal(await authServer.deleteAccount(state.clerkUserId), true);
  assert.equal(state.users.size, 0);
  assert.ok(state.events.includes("reverification:strict:true"));
});

test("a stale expected identity cannot delete the currently authenticated account", async () => {
  resetState();
  state.users.set(state.clerkUserId, { id: 7, auth_provider: "clerk" });
  state.reverified = true;

  await assert.rejects(
    authServer.deleteAccount("user_account_a"),
    authServer.AccountSessionChangedError,
  );
  assert.equal(state.users.size, 1);
  assert.equal(state.clerkExists, true);
  assert.equal(state.events.includes("mark-deletion"), false);
});

test("database failure keeps Clerk active and a retry finishes deletion", async () => {
  resetState();
  state.users.set(state.clerkUserId, { id: 7, auth_provider: "clerk" });
  state.failDeleteOnce = true;
  state.reverified = true;

  await assert.rejects(
    authServer.deleteAccount(state.clerkUserId),
    authServer.AccountDeletionPartialError,
  );
  assert.equal(state.users.size, 1);
  assert.equal(state.clerkExists, true);
  assert.equal(state.clerkUser.privateMetadata.careerbridgeDeletionPending, true);

  assert.equal(await authServer.deleteAccount(state.clerkUserId), true);
  assert.equal(state.users.size, 0);
  assert.equal(state.clerkExists, false);
  assert.ok(state.events.indexOf("commit") < state.events.indexOf("delete-clerk-user"));
});

test("Clerk failure after database commit can be retried without a user row", async () => {
  resetState();
  state.users.set(state.clerkUserId, { id: 7, auth_provider: "clerk" });
  state.failClerkDeleteOnce = true;
  state.reverified = true;

  await assert.rejects(
    authServer.deleteAccount(state.clerkUserId),
    authServer.AccountDeletionPartialError,
  );
  assert.equal(state.users.size, 0);
  assert.equal(state.clerkExists, true);
  assert.equal(state.clerkUser.privateMetadata.careerbridgeDeletionPending, true);

  assert.equal(await authServer.deleteAccount(state.clerkUserId), true);
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
  state.reverified = true;

  await assert.rejects(
    authServer.deleteAccount(state.clerkUserId),
    authServer.AccountDeletionBlockedError,
  );
  assert.equal(state.users.size, 1);
  assert.equal(state.clerkExists, true);
  assert.equal(state.clerkUser.privateMetadata.careerbridgeDeletionPending, undefined);
  assert.equal(state.events.includes("delete-clerk-user"), false);
});

test("current-user lookup retries transport failures and 5xx responses", async () => {
  resetState();
  state.users.set(state.clerkUserId, {
    id: 7,
    email: "student@example.test",
    full_name: "Test Student",
    auth_provider: "clerk",
  });
  state.currentUserResponses = [
    clerkApiError(null, "unexpected_error", "fetch failed"),
    state.clerkUser,
  ];

  const transportResult = await captureClerkLogs(() => authServer.getCurrentUser());

  assert.equal(transportResult.value.id, 7);
  assert.equal(state.currentUserCalls, 2);
  assert.equal(transportResult.logs[0][1].failureCategory, "transport");
  assert.equal(transportResult.logs[0][1].attempt, 1);
  assert.equal(transportResult.logs[0][1].retrying, true);

  resetState();
  state.users.set(state.clerkUserId, {
    id: 7,
    email: "student@example.test",
    full_name: "Test Student",
    auth_provider: "clerk",
  });
  state.currentUserResponses = [
    clerkApiError(503, "internal_server_error", "private@example.test token-value"),
    state.clerkUser,
  ];

  const serverResult = await captureClerkLogs(() => authServer.getCurrentUser());

  assert.equal(serverResult.value.id, 7);
  assert.equal(state.currentUserCalls, 2);
  assert.equal(serverResult.logs[0][1].failureCategory, "server");
  assert.equal(serverResult.logs[0][1].status, 503);
  assert.equal(JSON.stringify(serverResult.logs).includes("private@example.test"), false);
  assert.equal(JSON.stringify(serverResult.logs).includes("token-value"), false);
});

test("exhausted Clerk retries stop at the attempt limit and return a safe error", async () => {
  resetState();
  state.currentUserResponses = [
    clerkApiError(503, "internal_server_error", "sensitive@example.test secret-value"),
    clerkApiError(502, "internal_server_error", "sensitive@example.test secret-value"),
    clerkApiError(503, "internal_server_error", "sensitive@example.test secret-value"),
  ];

  const result = await captureClerkLogs(() =>
    assert.rejects(
      authServer.getCurrentUser(),
      authServer.ClerkUserLookupUnavailableError,
    ),
  );

  assert.equal(state.currentUserCalls, 3);
  assert.equal(result.logs.length, 3);
  assert.equal(result.logs[2][1].attempt, 3);
  assert.equal(result.logs[2][1].maxAttempts, 3);
  assert.equal(result.logs[2][1].retrying, false);
  assert.equal(JSON.stringify(result.logs).includes("sensitive@example.test"), false);
  assert.equal(JSON.stringify(result.logs).includes("secret-value"), false);
});

test("non-retryable Clerk responses and identity failures are not retried", async () => {
  for (const status of [401, 403]) {
    resetState();
    state.currentUserResponses = [
      clerkApiError(status, "authentication_invalid", "request rejected"),
    ];

    await captureClerkLogs(() =>
      assert.rejects(
        authServer.getCurrentUser(),
        authServer.ClerkUserLookupUnavailableError,
      ),
    );
    assert.equal(state.currentUserCalls, 1);
  }

  resetState();
  state.clerkUser = { ...state.clerkUser, id: "user_other_456" };
  await assert.rejects(
    authServer.getCurrentUser(),
    authServer.AuthenticationRequiredError,
  );
  assert.equal(state.currentUserCalls, 1);
});

test("a missing Clerk user is not retried", async () => {
  resetState();
  state.clerkExists = false;

  await assert.rejects(
    authServer.getCurrentUser(),
    authServer.AuthenticationRequiredError,
  );

  assert.equal(state.currentUserCalls, 1);
});
