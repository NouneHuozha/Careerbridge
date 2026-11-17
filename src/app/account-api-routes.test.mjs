import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const loadModule = createRequire(import.meta.url);
const Module = loadModule("node:module");
const ts = loadModule("typescript");
const { PgDialect } = loadModule("drizzle-orm/pg-core");
const { getTableName } = loadModule("drizzle-orm");
const pgDialect = new PgDialect();
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

const clerkA = "clerk_account_a";
const clerkB = "clerk_account_b";
const userA = 101;
const userB = 202;
const state = {};

function copy(value) {
  return structuredClone(value);
}

function emptyData() {
  return {
    savedItems: [],
    history: [],
    educationStage: null,
    counsellingSession: null,
    discoveryAnswers: null,
  };
}

function accountAData() {
  return {
    ...emptyData(),
    educationStage: "class-10",
    history: [
      { type: "field", id: "history-a-1", lastVisitedAt: 1, visitCount: 1 },
      { type: "course", id: "history-a-2", lastVisitedAt: 2, visitCount: 2 },
      { type: "pathway", id: "history-a-3", lastVisitedAt: 3, visitCount: 1 },
    ],
    discoveryAnswers: { activityIds: ["fixing", "helping"] },
  };
}

function profile(id) {
  return {
    id,
    firstName: "Test",
    lastName: "Student",
    primaryEmailAddressId: `${id}_email`,
    emailAddresses: [{
      id: `${id}_email`,
      emailAddress: `${id}@example.test`,
      verification: { status: "verified" },
    }],
    privateMetadata: {},
  };
}

function resetState() {
  state.clerkUserId = clerkB;
  state.clerkProfiles = new Map([
    [clerkA, profile(clerkA)],
    [clerkB, profile(clerkB)],
  ]);
  state.users = new Map([
    [clerkA, { id: userA, external_id: clerkA, email: "a@example.test", full_name: "Account A", auth_provider: "clerk" }],
    [clerkB, { id: userB, external_id: clerkB, email: "b@example.test", full_name: "Account B", auth_provider: "clerk" }],
  ]);
  state.accountData = new Map([
    [userA, accountAData()],
    [userB, emptyData()],
  ]);
  state.studentProfiles = new Map();
  state.discoverAnswers = new Map();
  state.failNextDiscoverWrite = false;
  state.dataReads = [];
  state.dataSelects = [];
  state.dataWrites = [];
  state.deleteTargets = [];
  state.clerkDeleteTargets = [];
  state.passwordChecks = [];
  state.statements = [];
};

function normalize(statement) {
  return statement.trim().replace(/\s+/g, " ");
}

function getTableRows(table) {
  const tableName = getTableName(table);
  if (tableName === "student_profiles") return state.studentProfiles;
  if (tableName === "discover_answers") return state.discoverAnswers;
  throw new Error(`Unexpected Drizzle table: ${tableName}`);
}

const database = {
  async transaction(operation) {
    const before = {
      accountData: copy(state.accountData),
      studentProfiles: copy(state.studentProfiles),
      discoverAnswers: copy(state.discoverAnswers),
    };
    const tx = {
      userId: null,
      insertedAccountData: false,
      async execute(statement) {
        const { sql, params } = pgDialect.sqlToQuery(statement);
        const query = normalize(sql);
        state.statements.push({ query, values: copy(params) });
        if (query.startsWith("INSERT INTO public.account_data")) {
          tx.userId = params[0];
          tx.insertedAccountData = true;
          if (!state.accountData.has(tx.userId)) {
            state.accountData.set(tx.userId, emptyData());
          }
          return { rows: [] };
        }
        if (query.startsWith("SELECT data FROM public.account_data")) {
          tx.userId = params[0];
          if (tx.insertedAccountData) state.dataSelects.push(tx.userId);
          else state.dataReads.push(tx.userId);
          const data = state.accountData.get(tx.userId);
          return { rows: data ? [{ data: copy(data) }] : [] };
        }
        if (query.startsWith("UPDATE public.account_data SET data")) {
          const userId = params[1];
          state.dataWrites.push(userId);
          state.accountData.set(userId, JSON.parse(params[0]));
          return { rows: [] };
        }
        throw new Error(`Unexpected Drizzle statement: ${query}`);
      },
      select() {
        let table;
        const builder = {
          from(value) {
            table = value;
            return this;
          },
          where() {
            return this;
          },
          limit() {
            return this;
          },
          then(resolve, reject) {
            const row = getTableRows(table).get(tx.userId);
            return Promise.resolve(row ? [copy(row)] : []).then(resolve, reject);
          },
        };
        return builder;
      },
      insert(table) {
        let values;
        return {
          values(value) {
            values = copy(value);
            return this;
          },
          onConflictDoNothing() {
            const rows = getTableRows(table);
            if (!rows.has(values.userId)) {
              const defaults = getTableName(table) === "discover_answers"
                ? { schemaVersion: 1 }
                : {};
              rows.set(values.userId, { ...defaults, ...values });
            }
            return Promise.resolve();
          },
          onConflictDoUpdate({ set }) {
            const tableName = getTableName(table);
            if (tableName === "discover_answers" && state.failNextDiscoverWrite) {
              state.failNextDiscoverWrite = false;
              throw new Error("temporary database failure");
            }
            const rows = getTableRows(table);
            const current = rows.get(values.userId);
            const defaults = tableName === "discover_answers"
              ? { schemaVersion: 1 }
              : {};
            rows.set(values.userId, {
              ...defaults,
              ...values,
              ...(current ?? {}),
              ...set,
              updatedAt: new Date(),
            });
            return Promise.resolve();
          },
        };
      },
      delete(table) {
        return {
          where() {
            const deleted = getTableRows(table).delete(tx.userId);
            return Promise.resolve({ rowCount: deleted ? 1 : 0 });
          },
        };
      },
    };
    try {
      return await operation(tx);
    } catch (error) {
      state.accountData = before.accountData;
      state.studentProfiles = before.studentProfiles;
      state.discoverAnswers = before.discoverAnswers;
      throw error;
    }
  },
};

const client = {
  async query(statement, values = []) {
    const query = normalize(statement);
    state.statements.push({ query, values: copy(values) });

    if (query.startsWith("SELECT pg_advisory_lock") || query.startsWith("SELECT pg_advisory_unlock")) {
      return { rows: [{ unlocked: true }] };
    }
    if (query === "BEGIN" || query === "COMMIT" || query === "ROLLBACK") {
      return { rows: [] };
    }
    if (query.startsWith("INSERT INTO account_data")) {
      return { rows: [] };
    }
    if (query.startsWith("SELECT data FROM account_data WHERE user_id = $1 FOR UPDATE")) {
      state.dataSelects.push(values[0]);
      const data = state.accountData.get(values[0]);
      return { rows: data ? [{ data: copy(data) }] : [] };
    }
    if (query.startsWith("UPDATE account_data SET data = $2::jsonb")) {
      state.dataWrites.push(values[0]);
      state.accountData.set(values[0], JSON.parse(values[1]));
      return { rows: [] };
    }
    if (query.startsWith("DELETE FROM users")) {
      // Record the target without deleting fixture data.
      state.deleteTargets.push(values[0]);
      return { rowCount: 1, rows: [] };
    }
    throw new Error(`Unexpected client query: ${query}`);
  },
  release() {},
};

const pool = {
  async query(statement, values = []) {
    const query = normalize(statement);
    state.statements.push({ query, values: copy(values) });

    if (query.includes("to_regclass")) {
      return { rows: [{ users: "public.users", accountData: "public.account_data" }] };
    }
    if (query.startsWith("SELECT id, email, full_name, auth_provider FROM users")) {
      const user = state.users.get(values[0]);
      return { rows: user ? [user] : [] };
    }
    if (query.startsWith("SELECT data FROM account_data WHERE user_id = $1")) {
      state.dataReads.push(values[0]);
      const data = state.accountData.get(values[0]);
      return { rows: data ? [{ data: copy(data) }] : [] };
    }
    throw new Error(`Unexpected pool query: ${query}`);
  },
  async connect() {
    return client;
  },
};

const clerkServer = {
  auth: async () => ({ userId: state.clerkUserId }),
  currentUser: async () => state.clerkProfiles.get(state.clerkUserId) ?? null,
  clerkClient: async () => ({
    users: {
      verifyPassword: async ({ userId, password }) => {
        state.passwordChecks.push(userId);
        if (password !== "test-password") {
          throw Object.assign(new Error("invalid password"), { status: 422 });
        }
      },
      updateUserMetadata: async (userId, metadata) => {
        const privateMetadata = metadata.privateMetadata;
        if (privateMetadata.careerbridgeDeletionPending === null) {
          delete state.clerkProfiles.get(userId).privateMetadata.careerbridgeDeletionPending;
        } else {
          Object.assign(state.clerkProfiles.get(userId).privateMetadata, privateMetadata);
        }
      },
      deleteUser: async (userId) => {
        state.clerkDeleteTargets.push(userId);
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
  if (request === "../db/client" && parent?.filename.endsWith("auth-server.ts")) {
    return { getDb: () => database };
  }
  if (request === "next/server") {
    return { ...originalLoad.call(this, request, parent, isMain), connection: async () => {} };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const accountDataRoute = loadModule("./api/account/data/route.ts");
const accountRoute = loadModule("./api/account/route.ts");
Module._load = originalLoad;

function makeRequest(path, method, body) {
  const headers = new Headers({ origin: "http://careerbridge.test" });
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(`http://careerbridge.test${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function responseBody(response) {
  return response.json();
}

test("Account B reads only its own data when the query supplies Account A's internal ID", async () => {
  resetState();
  const beforeA = copy(state.accountData.get(userA));

  const response = await accountDataRoute.GET(
    makeRequest(`/api/account/data?userId=${userA}`, "GET"),
  );
  const result = await responseBody(response);

  assert.equal(response.status, 200);
  assert.deepEqual(result.data, emptyData());
  assert.deepEqual(state.dataReads, [userB]);
  assert.deepEqual(state.accountData.get(userA), beforeA);
});

test("Account A reads its own Discover answers and exploration history", async () => {
  resetState();
  state.clerkUserId = clerkA;
  const ownData = copy(state.accountData.get(userA));

  const response = await accountDataRoute.GET(
    makeRequest(`/api/account/data?userId=${userB}`, "GET"),
  );
  const result = await responseBody(response);

  assert.equal(response.status, 200);
  assert.deepEqual(result.data, ownData);
  assert.deepEqual(state.dataReads, [userA]);
});

test("Account B's body-supplied Account A ID cannot read, modify, or remove Account A data", async () => {
  resetState();
  const beforeA = copy(state.accountData.get(userA));

  const removeResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      userId: userA,
      type: "history.remove",
      item: { type: "field", id: "history-a-1", context: {} },
    }),
  );
  const removeResult = await responseBody(removeResponse);

  assert.equal(removeResponse.status, 200);
  assert.deepEqual(removeResult.data, emptyData());
  assert.deepEqual(state.dataSelects, [userB]);
  assert.deepEqual(state.dataWrites, [userB]);
  assert.deepEqual(state.accountData.get(userA), beforeA);

  const updateResponse = await accountDataRoute.POST(
    makeRequest(`/api/account/data?userId=${userA}`, "POST", {
      userId: userA,
      type: "progress.discoveryAnswers",
      value: { activityIds: ["computers"] },
    }),
  );
  const updateResult = await responseBody(updateResponse);

  assert.equal(updateResponse.status, 200);
  assert.deepEqual(updateResult.data.discoveryAnswers, { activityIds: ["computers"] });
  assert.deepEqual(state.dataSelects, [userB, userB]);
  assert.deepEqual(state.dataWrites, [userB, userB]);
  assert.deepEqual(state.accountData.get(userA), beforeA);
});

test("Account B's delete route ignores Account A IDs and targets Account B", async () => {
  resetState();
  const beforeA = copy(state.accountData.get(userA));
  const beforeB = copy(state.accountData.get(userB));

  const response = await accountRoute.DELETE(
    makeRequest(`/api/account?userId=${userA}`, "DELETE", {
      userId: userA,
      password: "test-password",
      confirmation: "DELETE",
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(state.passwordChecks, [clerkB]);
  assert.deepEqual(state.deleteTargets, [clerkB]);
  assert.deepEqual(state.clerkDeleteTargets, [clerkB]);
  assert.deepEqual(state.accountData.get(userA), beforeA);
  assert.deepEqual(state.accountData.get(userB), beforeB);
});

test("unauthenticated account-data and deletion requests are rejected without data changes", async () => {
  resetState();
  state.clerkUserId = null;
  const beforeA = copy(state.accountData.get(userA));
  const beforeB = copy(state.accountData.get(userB));

  const getResponse = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const postResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      userId: userA,
      type: "history.clear",
    }),
  );
  const deleteResponse = await accountRoute.DELETE(
    makeRequest("/api/account", "DELETE", {
      userId: userA,
      password: "test-password",
      confirmation: "DELETE",
    }),
  );

  assert.equal(getResponse.status, 401);
  assert.equal(postResponse.status, 401);
  assert.equal(deleteResponse.status, 401);
  assert.deepEqual(state.dataWrites, []);
  assert.deepEqual(state.deleteTargets, []);
  assert.deepEqual(state.clerkDeleteTargets, []);
  assert.deepEqual(state.accountData.get(userA), beforeA);
  assert.deepEqual(state.accountData.get(userB), beforeB);
});

test("a rejected Account B deletion request leaves both accounts' data unchanged", async () => {
  resetState();
  const beforeA = copy(state.accountData.get(userA));
  const beforeB = copy(state.accountData.get(userB));

  const response = await accountRoute.DELETE(
    makeRequest("/api/account", "DELETE", {
      userId: userA,
      password: "wrong-password",
      confirmation: "DELETE",
    }),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(state.passwordChecks, [clerkB]);
  assert.deepEqual(state.deleteTargets, []);
  assert.deepEqual(state.clerkDeleteTargets, []);
  assert.deepEqual(state.accountData.get(userA), beforeA);
  assert.deepEqual(state.accountData.get(userB), beforeB);
});

test("education-stage changes save and retrieve both supported stages", async () => {
  resetState();
  state.clerkUserId = clerkA;

  for (const stage of ["class-10", "class-12"]) {
    const saveResponse = await accountDataRoute.POST(
      makeRequest("/api/account/data", "POST", {
        type: "progress.educationStage",
        value: stage,
      }),
    );
    const saved = await responseBody(saveResponse);
    const getResponse = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
    const loaded = await responseBody(getResponse);

    assert.equal(saveResponse.status, 200);
    assert.equal(getResponse.status, 200);
    assert.equal(saved.data.educationStage, stage);
    assert.equal(loaded.data.educationStage, stage);
    assert.equal(state.studentProfiles.get(userA).educationStage, stage);
  }
});

test("Discover answers persist, while invalid, duplicate, and excessive IDs are rejected", async () => {
  resetState();
  state.clerkUserId = clerkA;

  const validResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "progress.discoveryAnswers",
      value: { activityIds: ["computers", "helping"] },
    }),
  );
  const validResult = await responseBody(validResponse);
  const getResponse = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const loaded = await responseBody(getResponse);

  assert.equal(validResponse.status, 200);
  assert.deepEqual(validResult.data.discoveryAnswers, { activityIds: ["computers", "helping"] });
  assert.deepEqual(loaded.data.discoveryAnswers, { activityIds: ["computers", "helping"] });
  assert.deepEqual(state.discoverAnswers.get(userA).answers, { activityIds: ["computers", "helping"] });
  assert.equal(state.discoverAnswers.get(userA).schemaVersion, 1);
  assert.ok(state.discoverAnswers.get(userA).updatedAt);

  state.discoverAnswers.get(userA).schemaVersion = 2;
  const updateResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "progress.discoveryAnswers",
      value: { activityIds: ["fixing"] },
    }),
  );
  assert.equal(updateResponse.status, 200);
  assert.deepEqual(state.discoverAnswers.get(userA).answers, { activityIds: ["fixing"] });
  assert.equal(state.discoverAnswers.get(userA).schemaVersion, 2);

  for (const activityIds of [
    ["not-a-known-activity"],
    ["computers", "computers"],
    ["fixing", "helping", "outdoors", "computers"],
  ]) {
    const invalidResponse = await accountDataRoute.POST(
      makeRequest("/api/account/data", "POST", {
        type: "progress.discoveryAnswers",
        value: { activityIds },
      }),
    );
    assert.equal(invalidResponse.status, 422);
  }
  assert.deepEqual(state.discoverAnswers.get(userA).answers, { activityIds: ["fixing"] });
});

test("clearing stage and answers is reflected without recovering stale legacy values", async () => {
  resetState();
  state.clerkUserId = clerkA;
  state.studentProfiles.set(userA, { userId: userA, educationStage: "class-12" });
  state.discoverAnswers.set(userA, {
    userId: userA,
    answers: { activityIds: ["computers"] },
    schemaVersion: 1,
  });

  for (const mutation of [
    { type: "progress.educationStage", value: null },
    { type: "progress.discoveryAnswers", value: null },
  ]) {
    const response = await accountDataRoute.POST(
      makeRequest("/api/account/data", "POST", mutation),
    );
    assert.equal(response.status, 200);
  }

  const getResponse = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const result = await responseBody(getResponse);

  assert.equal(result.data.educationStage, null);
  assert.equal(result.data.discoveryAnswers, null);
  assert.equal(state.studentProfiles.get(userA).educationStage, null);
  assert.equal(state.discoverAnswers.has(userA), false);
  assert.equal(Object.hasOwn(state.accountData.get(userA), "educationStage"), false);
  assert.equal(Object.hasOwn(state.accountData.get(userA), "discoveryAnswers"), false);
});

test("legacy values are backfilled once and returned in the existing snapshot shape", async () => {
  resetState();
  state.clerkUserId = clerkA;

  const firstResponse = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const first = await responseBody(firstResponse);
  const writesAfterBackfill = state.dataWrites.length;
  const secondResponse = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const second = await responseBody(secondResponse);

  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);
  assert.equal(first.data.educationStage, "class-10");
  assert.deepEqual(first.data.discoveryAnswers, { activityIds: ["fixing", "helping"] });
  assert.deepEqual(second.data, first.data);
  assert.equal(state.studentProfiles.get(userA).educationStage, "class-10");
  assert.deepEqual(state.discoverAnswers.get(userA).answers, { activityIds: ["fixing", "helping"] });
  assert.equal(Object.hasOwn(state.accountData.get(userA), "educationStage"), false);
  assert.equal(Object.hasOwn(state.accountData.get(userA), "discoveryAnswers"), false);
  assert.equal(writesAfterBackfill, 1);
  assert.equal(state.dataWrites.length, writesAfterBackfill);
});

test("dedicated values take precedence over conflicting legacy snapshot values", async () => {
  resetState();
  state.clerkUserId = clerkA;
  state.studentProfiles.set(userA, { userId: userA, educationStage: "class-12" });
  state.discoverAnswers.set(userA, {
    userId: userA,
    answers: { activityIds: ["computers"] },
    schemaVersion: 1,
  });

  const response = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const result = await responseBody(response);

  assert.equal(result.data.educationStage, "class-12");
  assert.deepEqual(result.data.discoveryAnswers, { activityIds: ["computers"] });
  assert.equal(state.studentProfiles.get(userA).educationStage, "class-12");
  assert.deepEqual(state.discoverAnswers.get(userA).answers, { activityIds: ["computers"] });
  assert.equal(Object.hasOwn(state.accountData.get(userA), "educationStage"), false);
  assert.equal(Object.hasOwn(state.accountData.get(userA), "discoveryAnswers"), false);
});

test("guest transfer keeps existing Discover values and merges saved items and history", async () => {
  resetState();
  state.studentProfiles.set(userB, { userId: userB, educationStage: "class-12" });
  state.discoverAnswers.set(userB, {
    userId: userB,
    answers: { activityIds: ["computers"] },
    schemaVersion: 1,
  });
  state.accountData.set(userB, {
    ...emptyData(),
    savedItems: [{ type: "course", id: "existing-course", savedAt: 1 }],
    history: [{ type: "field", id: "existing-field", lastVisitedAt: 1, visitCount: 1 }],
    counsellingSession: null,
  });
  const guestData = {
    ...emptyData(),
    savedItems: [{ type: "field", id: "guest-field", savedAt: 2 }],
    history: [{ type: "course", id: "guest-course", lastVisitedAt: 3, visitCount: 1 }],
  };

  const firstResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", { type: "migration.keep", data: guestData }),
  );
  const first = await responseBody(firstResponse);
  const retryResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", { type: "migration.keep", data: guestData }),
  );
  const retry = await responseBody(retryResponse);

  assert.equal(firstResponse.status, 200);
  assert.equal(retryResponse.status, 200);
  assert.equal(first.data.educationStage, "class-12");
  assert.deepEqual(first.data.discoveryAnswers, { activityIds: ["computers"] });
  assert.equal(retry.data.educationStage, "class-12");
  assert.deepEqual(retry.data.discoveryAnswers, { activityIds: ["computers"] });
  assert.deepEqual(retry.data.savedItems.map(({ id }) => id).sort(), ["existing-course", "guest-field"]);
  assert.deepEqual(retry.data.history.map(({ id }) => id).sort(), ["existing-field", "guest-course"]);
  assert.equal(retry.data.counsellingSession, null);
  assert.equal(state.studentProfiles.get(userB).educationStage, "class-12");
  assert.deepEqual(state.discoverAnswers.get(userB).answers, { activityIds: ["computers"] });

  const nonemptyGuestData = {
    ...guestData,
    educationStage: "class-10",
    discoveryAnswers: { activityIds: ["fixing"] },
  };
  const transferResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "migration.keep",
      data: nonemptyGuestData,
    }),
  );
  const transferred = await responseBody(transferResponse);

  assert.equal(transferResponse.status, 200);
  assert.equal(transferred.data.educationStage, "class-12");
  assert.deepEqual(transferred.data.discoveryAnswers, { activityIds: ["computers"] });
  assert.equal(state.studentProfiles.get(userB).educationStage, "class-12");
  assert.deepEqual(state.discoverAnswers.get(userB).answers, { activityIds: ["computers"] });
  assert.equal(Object.hasOwn(state.accountData.get(userB), "educationStage"), false);
  assert.equal(Object.hasOwn(state.accountData.get(userB), "discoveryAnswers"), false);
});

test("guest Discover values transfer independently when only one account value exists", async () => {
  const scenarios = [
    {
      profile: { userId: userB, educationStage: "class-12" },
      answers: null,
      expectedStage: "class-12",
      expectedAnswers: { activityIds: ["fixing"] },
    },
    {
      profile: null,
      answers: {
        userId: userB,
        answers: { activityIds: ["computers"] },
        schemaVersion: 1,
      },
      expectedStage: "class-10",
      expectedAnswers: { activityIds: ["computers"] },
    },
  ];

  for (const scenario of scenarios) {
    resetState();
    if (scenario.profile) state.studentProfiles.set(userB, scenario.profile);
    if (scenario.answers) state.discoverAnswers.set(userB, scenario.answers);

    const response = await accountDataRoute.POST(
      makeRequest("/api/account/data", "POST", {
        type: "migration.keep",
        data: {
          ...emptyData(),
          educationStage: "class-10",
          discoveryAnswers: { activityIds: ["fixing"] },
        },
      }),
    );
    const result = await responseBody(response);

    assert.equal(response.status, 200);
    assert.equal(result.data.educationStage, scenario.expectedStage);
    assert.deepEqual(result.data.discoveryAnswers, scenario.expectedAnswers);
    assert.equal(state.studentProfiles.get(userB).educationStage, scenario.expectedStage);
    assert.deepEqual(state.discoverAnswers.get(userB).answers, scenario.expectedAnswers);
  }
});

test("legacy Discover values are backfilled and preserved during guest transfer", async () => {
  resetState();
  state.accountData.set(userB, {
    ...emptyData(),
    educationStage: "class-12",
    discoveryAnswers: { activityIds: ["computers"] },
    savedItems: [{ type: "course", id: "legacy-course", savedAt: 1 }],
  });

  const response = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "migration.keep",
      data: {
        ...emptyData(),
        educationStage: "class-10",
        discoveryAnswers: { activityIds: ["fixing"] },
      },
    }),
  );
  const result = await responseBody(response);

  assert.equal(response.status, 200);
  assert.equal(result.data.educationStage, "class-12");
  assert.deepEqual(result.data.discoveryAnswers, { activityIds: ["computers"] });
  assert.deepEqual(result.data.savedItems.map(({ id }) => id), ["legacy-course"]);
  assert.equal(state.studentProfiles.get(userB).educationStage, "class-12");
  assert.deepEqual(state.discoverAnswers.get(userB).answers, { activityIds: ["computers"] });
  assert.equal(Object.hasOwn(state.accountData.get(userB), "educationStage"), false);
  assert.equal(Object.hasOwn(state.accountData.get(userB), "discoveryAnswers"), false);
});

test("guest transfer is atomic on partial failure and safe to retry", async () => {
  resetState();
  const beforeAccount = copy(state.accountData.get(userB));
  const guestData = {
    ...emptyData(),
    educationStage: "class-10",
    discoveryAnswers: { activityIds: ["fixing"] },
  };
  state.failNextDiscoverWrite = true;

  const failedResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", { type: "migration.keep", data: guestData }),
  );
  assert.equal(failedResponse.status, 503);
  assert.equal(state.studentProfiles.has(userB), false);
  assert.equal(state.discoverAnswers.has(userB), false);
  assert.deepEqual(state.accountData.get(userB), beforeAccount);

  const retryResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", { type: "migration.keep", data: guestData }),
  );
  const retry = await responseBody(retryResponse);

  assert.equal(retryResponse.status, 200);
  assert.equal(retry.data.educationStage, "class-10");
  assert.deepEqual(retry.data.discoveryAnswers, { activityIds: ["fixing"] });
  assert.equal(state.studentProfiles.size, 1);
  assert.equal(state.discoverAnswers.size, 1);
});

test("Account B cannot read or change Account A's dedicated Discover data", async () => {
  resetState();
  state.studentProfiles.set(userA, { userId: userA, educationStage: "class-12" });
  state.discoverAnswers.set(userA, {
    userId: userA,
    answers: { activityIds: ["fixing"] },
    schemaVersion: 1,
  });
  state.studentProfiles.set(userB, { userId: userB, educationStage: "class-10" });
  state.discoverAnswers.set(userB, {
    userId: userB,
    answers: { activityIds: ["computers"] },
    schemaVersion: 1,
  });
  const beforeA = {
    profile: copy(state.studentProfiles.get(userA)),
    answers: copy(state.discoverAnswers.get(userA)),
  };

  const getResponse = await accountDataRoute.GET(
    makeRequest(`/api/account/data?userId=${userA}`, "GET"),
  );
  const getResult = await responseBody(getResponse);
  const stageResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      userId: userA,
      type: "progress.educationStage",
      value: "class-12",
    }),
  );
  const answersResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      userId: userA,
      type: "progress.discoveryAnswers",
      value: { activityIds: ["helping"] },
    }),
  );

  assert.equal(getResponse.status, 200);
  assert.equal(getResult.data.educationStage, "class-10");
  assert.deepEqual(getResult.data.discoveryAnswers, { activityIds: ["computers"] });
  assert.equal(stageResponse.status, 200);
  assert.equal(answersResponse.status, 200);
  assert.deepEqual(state.studentProfiles.get(userA), beforeA.profile);
  assert.deepEqual(state.discoverAnswers.get(userA), beforeA.answers);
  assert.equal(state.studentProfiles.get(userB).educationStage, "class-12");
  assert.deepEqual(state.discoverAnswers.get(userB).answers, { activityIds: ["helping"] });

  const transferResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      userId: userA,
      type: "migration.keep",
      data: {
        ...emptyData(),
        educationStage: "class-10",
        discoveryAnswers: { activityIds: ["outdoors"] },
      },
    }),
  );
  const transferred = await responseBody(transferResponse);

  assert.equal(transferResponse.status, 200);
  assert.equal(transferred.data.educationStage, "class-12");
  assert.deepEqual(transferred.data.discoveryAnswers, { activityIds: ["helping"] });
  assert.deepEqual(state.studentProfiles.get(userA), beforeA.profile);
  assert.deepEqual(state.discoverAnswers.get(userA), beforeA.answers);
  assert.equal(state.studentProfiles.get(userB).educationStage, "class-12");
  assert.deepEqual(state.discoverAnswers.get(userB).answers, { activityIds: ["helping"] });

  state.clerkUserId = clerkA;
  const accountAResponse = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const accountAResult = await responseBody(accountAResponse);
  assert.equal(accountAResult.data.educationStage, "class-12");
  assert.deepEqual(accountAResult.data.discoveryAnswers, { activityIds: ["fixing"] });
});

resetState();
