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
    latestCompletedCounsellingSession: null,
    discoveryAnswers: null,
  };
}

function counsellingSession(id, overrides = {}) {
  return {
    version: 1,
    questionBankVersion: 1,
    id,
    status: "paused",
    currentQuestionId: "Q008",
    questionPath: ["Q001", "Q002", "Q008"],
    pathIndex: 2,
    askedQuestionIds: ["Q001", "Q008"],
    skippedQuestionIds: ["Q002"],
    answers: [{
      id: `${id}-answer`,
      questionId: "Q008",
      optionIds: ["i-prefer-not-to-say"],
      originalText: "",
      interpretationStatus: "clear",
      responseState: "skip",
      createdAt: "2026-03-01T10:00:00.000Z",
    }],
    updatedAt: "2026-03-01T10:00:00.000Z",
    ...overrides,
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
  state.guidedExplorerSessions = new Map();
  state.guidedExplorerSessionQuestions = new Map();
  state.guidedExplorerAnswers = new Map();
  state.savedItems = new Map();
  state.explorationHistory = new Map();
  const catalogueReferences = [
    ["field", "history-a-1"],
    ["course", "history-a-2"],
    ["pathway", "history-a-3"],
    ["course", "existing-course"],
    ["field", "guest-field"],
    ["field", "existing-field"],
    ["course", "guest-course"],
    ["course", "legacy-course"],
    ["field", "account-saved-field"],
    ["field", "account-history-field"],
    ["field", "guest-saved-field"],
    ["course", "guest-history-course"],
    ["field", "retry-field"],
  ];
  state.catalogAliases = new Map(
    catalogueReferences.map(([externalType, externalKey], index) => {
      const suffix = String(index + 1).padStart(12, "0");
      const row = {
        sourceSystem: "careerbridge",
        externalType,
        externalKey,
        externalContextKey: "",
        catalogItemId: `00000000-0000-4000-8000-${suffix}`,
      };
      return [`${externalType}:${externalKey}:`, row];
    }),
  );
  state.failNextDiscoverWrite = false;
  state.dataReads = [];
  state.dataSelects = [];
  state.dataWrites = [];
  state.deleteTargets = [];
  state.clerkDeleteTargets = [];
  state.statements = [];
  state.reverified = true;
  state.emailSyncUpdates = [];
};

function normalize(statement) {
  return statement.trim().replace(/\s+/g, " ");
}

function getTableRows(table) {
  const tableName = getTableName(table);
  if (tableName === "student_profiles") return state.studentProfiles;
  if (tableName === "discover_answers") return state.discoverAnswers;
  if (tableName === "catalog_item_aliases") return state.catalogAliases;
  if (tableName === "guided_explorer_sessions") return state.guidedExplorerSessions;
  if (tableName === "guided_explorer_session_questions") return state.guidedExplorerSessionQuestions;
  if (tableName === "guided_explorer_answers") return state.guidedExplorerAnswers;
  if (tableName === "saved_items") return state.savedItems;
  if (tableName === "exploration_history") return state.explorationHistory;
  throw new Error(`Unexpected Drizzle table: ${tableName}`);
}

function camelCase(value) {
  return value.replace(/_([a-z])/g, (_, character) => character.toUpperCase());
}

function matchesCondition(row, condition) {
  if (!condition) return true;
  const { sql, params } = pgDialect.sqlToQuery(condition);
  const equalities = [...sql.matchAll(/"([^"]+)"\s*=\s*\$(\d+)/g)];
  const memberships = [...sql.matchAll(/"([^"]+)"\s+in\s*\(([^)]+)\)/gi)];
  return equalities.every(([, column, parameter]) =>
    row[camelCase(column)] === params[Number(parameter) - 1],
  ) && memberships.every(([, column, placeholders]) => {
    const values = [...placeholders.matchAll(/\$(\d+)/g)]
      .map(([, parameter]) => params[Number(parameter) - 1]);
    return values.includes(row[camelCase(column)]);
  });
}

function primaryKeyFor(tableName, row) {
  switch (tableName) {
    case "student_profiles":
    case "discover_answers":
      return row.userId;
    case "catalog_item_aliases":
      return `${row.externalType}:${row.externalKey}:${row.externalContextKey}`;
    case "guided_explorer_sessions":
      return row.id;
    case "guided_explorer_session_questions":
      return `${row.sessionId}:${row.questionId}`;
    case "guided_explorer_answers":
      return row.id;
    case "saved_items":
    case "exploration_history":
      return `${row.userId}:${row.catalogItemId}`;
    default:
      throw new Error(`Unexpected Drizzle table: ${tableName}`);
  }
}

function resolveConflictValue(value, incoming) {
  if (value && typeof value === "object" && "queryChunks" in value) {
    const query = pgDialect.sqlToQuery(value).sql;
    const excluded = query.match(/^excluded\.([a-z_]+)$/i);
    if (excluded) return incoming[camelCase(excluded[1])];
    if (/now\(\)/i.test(query)) return new Date();
  }
  return value;
}

const database = {
  async transaction(operation) {
    const before = {
      accountData: copy(state.accountData),
      studentProfiles: copy(state.studentProfiles),
      discoverAnswers: copy(state.discoverAnswers),
      guidedExplorerSessions: copy(state.guidedExplorerSessions),
      guidedExplorerSessionQuestions: copy(state.guidedExplorerSessionQuestions),
      guidedExplorerAnswers: copy(state.guidedExplorerAnswers),
      savedItems: copy(state.savedItems),
      explorationHistory: copy(state.explorationHistory),
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
        let condition;
        let maximum = Infinity;
        const builder = {
          from(value) {
            table = value;
            return this;
          },
          where(value) {
            condition = value;
            return this;
          },
          limit(value) {
            maximum = value;
            return this;
          },
          orderBy() {
            return this;
          },
          then(resolve, reject) {
            const rows = [...getTableRows(table).values()]
              .filter((row) => matchesCondition(row, condition))
              .slice(0, maximum)
              .map(copy);
            return Promise.resolve(rows).then(resolve, reject);
          },
        };
        return builder;
      },
      insert(table) {
        let values;
        const tableName = getTableName(table);
        const execute = (mode, config = {}) => {
          const rows = getTableRows(table);
          const incomingRows = Array.isArray(values) ? values : [values];
          for (const incoming of incomingRows) {
            if (tableName === "discover_answers" && state.failNextDiscoverWrite) {
              state.failNextDiscoverWrite = false;
              throw new Error("temporary database failure");
            }
            const key = primaryKeyFor(tableName, incoming);
            const current = rows.get(key);
            if (!current) {
              const defaults = tableName === "discover_answers"
                ? { schemaVersion: 1 }
                : {};
              rows.set(key, { ...defaults, ...incoming });
              continue;
            }
            if (mode === "nothing") continue;
            if (mode !== "update" || !matchesCondition(current, config.setWhere)) {
              if (mode === "update") continue;
              throw new Error(`Duplicate key in ${tableName}`);
            }
            const defaults = tableName === "discover_answers"
              ? { schemaVersion: 1 }
              : {};
            const set = Object.fromEntries(
              Object.entries(config.set ?? {}).map(([keyName, value]) => [
                keyName,
                resolveConflictValue(value, incoming),
              ]),
            );
            rows.set(key, {
              ...defaults,
              ...current,
              ...incoming,
              ...set,
              ...(tableName === "student_profiles" || tableName === "discover_answers"
                ? { updatedAt: new Date() }
                : {}),
            });
          }
        };
        const builder = {
          values(value) {
            values = copy(value);
            return this;
          },
          onConflictDoNothing() {
            execute("nothing");
            return Promise.resolve();
          },
          onConflictDoUpdate(config) {
            execute("update", config);
            return Promise.resolve();
          },
          then(resolve, reject) {
            try {
              execute("error");
              return Promise.resolve().then(resolve, reject);
            } catch (error) {
              return Promise.reject(error).then(resolve, reject);
            }
          },
        };
        return builder;
      },
      delete(table) {
        return {
          where(condition) {
            const rows = getTableRows(table);
            let rowCount = 0;
            for (const [key, row] of rows) {
              if (matchesCondition(row, condition)) {
                rows.delete(key);
                rowCount += 1;
              }
            }
            return Promise.resolve({ rowCount });
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
      state.guidedExplorerSessions = before.guidedExplorerSessions;
      state.guidedExplorerSessionQuestions = before.guidedExplorerSessionQuestions;
      state.guidedExplorerAnswers = before.guidedExplorerAnswers;
      state.savedItems = before.savedItems;
      state.explorationHistory = before.explorationHistory;
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
    if (query.startsWith("SELECT id, email, full_name, auth_provider FROM users WHERE external_id = $1")) {
      const user = state.users.get(values[0]);
      return { rows: user ? [user] : [] };
    }
    if (query.startsWith("UPDATE users SET email = $2")) {
      const user = state.users.get(values[0]);
      if (!user || user.auth_provider !== "clerk") return { rows: [] };
      user.email = values[1];
      state.emailSyncUpdates.push({ externalId: values[0], email: values[1] });
      return { rows: [user] };
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
      return {
        rows: [{
          users: "public.users",
          accountData: "public.account_data",
          catalogItemAliases: "public.catalog_item_aliases",
          studentProfiles: "public.student_profiles",
          discoverAnswers: "public.discover_answers",
          guidedExplorerSessions: "public.guided_explorer_sessions",
          guidedExplorerSessionQuestions: "public.guided_explorer_session_questions",
          guidedExplorerAnswers: "public.guided_explorer_answers",
          savedItems: "public.saved_items",
          explorationHistory: "public.exploration_history",
        }],
      };
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
const identityLockPool = {
  async connect() {
    return client;
  },
};

const clerkServer = {
  auth: async () => ({
    userId: state.clerkUserId,
    has: ({ reverification }) => state.reverified && reverification === "strict",
  }),
  reverificationErrorResponse: (reverification) => new Response(JSON.stringify({
    clerk_error: {
      type: "forbidden",
      reason: "reverification-error",
      metadata: { reverification },
    },
  }), { status: 403 }),
  currentUser: async () => state.clerkProfiles.get(state.clerkUserId) ?? null,
  clerkClient: async () => ({
    users: {
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
    return { getPool: () => pool, getIdentityLockPool: () => identityLockPool };
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
  const beforeB = copy(state.accountData.get(userB));

  const removeResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      userId: userA,
      expectedUserId: userA,
      type: "history.remove",
      item: { type: "field", id: "history-a-1", context: {} },
    }),
  );
  const removeResult = await responseBody(removeResponse);

  assert.equal(removeResponse.status, 409);
  assert.match(removeResult.error, /Account session changed/);
  assert.deepEqual(state.dataWrites, []);
  assert.deepEqual(state.accountData.get(userA), beforeA);
  assert.deepEqual(state.accountData.get(userB), beforeB);

  const updateResponse = await accountDataRoute.POST(
    makeRequest(`/api/account/data?userId=${userA}`, "POST", {
      userId: userA,
      expectedUserId: userA,
      type: "progress.discoveryAnswers",
      value: { activityIds: ["computers"] },
    }),
  );
  const updateResult = await responseBody(updateResponse);

  assert.equal(updateResponse.status, 409);
  assert.match(updateResult.error, /Account session changed/);
  assert.deepEqual(state.dataWrites, []);
  assert.deepEqual(state.accountData.get(userA), beforeA);
  assert.deepEqual(state.accountData.get(userB), beforeB);
});

test("Account B's delete route rejects a stale Account A identity", async () => {
  resetState();
  const beforeA = copy(state.accountData.get(userA));
  const beforeB = copy(state.accountData.get(userB));

  const response = await accountRoute.DELETE(
    makeRequest(`/api/account?userId=${userA}`, "DELETE", {
      expectedUserId: clerkA,
      confirmation: "DELETE",
    }),
  );
  const result = await responseBody(response);

  assert.equal(response.status, 409);
  assert.match(result.error, /session changed/);
  assert.deepEqual(state.deleteTargets, []);
  assert.deepEqual(state.clerkDeleteTargets, []);
  assert.deepEqual(state.accountData.get(userA), beforeA);
  assert.deepEqual(state.accountData.get(userB), beforeB);
});

test("freshly reverified Account B can delete only its authenticated identity", async () => {
  resetState();
  const beforeA = copy(state.accountData.get(userA));

  const response = await accountRoute.DELETE(
    makeRequest("/api/account", "DELETE", {
      expectedUserId: clerkB,
      confirmation: "DELETE",
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(state.deleteTargets, [clerkB]);
  assert.deepEqual(state.clerkDeleteTargets, [clerkB]);
  assert.deepEqual(state.accountData.get(userA), beforeA);
});

test("typed confirmation and a client verification flag cannot bypass reverification", async () => {
  resetState();
  state.reverified = false;
  const beforeB = copy(state.accountData.get(userB));

  const response = await accountRoute.DELETE(
    makeRequest("/api/account", "DELETE", {
      expectedUserId: clerkB,
      confirmation: "DELETE",
      verified: true,
    }),
  );
  const result = await responseBody(response);

  assert.equal(response.status, 403);
  assert.deepEqual(result.clerk_error.metadata.reverification, "strict");
  assert.deepEqual(state.deleteTargets, []);
  assert.deepEqual(state.clerkDeleteTargets, []);
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
      expectedUserId: clerkA,
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

test("account deletion requires the exact confirmation word", async () => {
  resetState();
  const beforeA = copy(state.accountData.get(userA));
  const beforeB = copy(state.accountData.get(userB));

  const response = await accountRoute.DELETE(
    makeRequest("/api/account", "DELETE", {
      expectedUserId: clerkB,
      confirmation: "delete",
    }),
  );

  assert.equal(response.status, 422);
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
  assert.equal(state.savedItems.size, 2);
  assert.equal(state.explorationHistory.size, 2);
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

test("guest transfer and repeated sync cannot restore a removed unmapped legacy saved item", async () => {
  resetState();
  const removedItem = {
    type: "field",
    id: "guest-legacy-without-alias",
    savedAt: 10,
  };
  const mappedItem = {
    type: "field",
    id: "guest-field",
    savedAt: 20,
  };
  const guestData = {
    ...emptyData(),
    savedItems: [removedItem, mappedItem],
  };

  const transferResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "migration.keep",
      data: guestData,
    }),
  );
  const transferred = await responseBody(transferResponse);
  assert.equal(transferResponse.status, 200);
  assert.deepEqual(
    transferred.data.savedItems.map(({ id }) => id).sort(),
    [removedItem.id, mappedItem.id].sort(),
  );
  assert.equal(state.savedItems.size, 1);
  const normalizedBeforeRemoval = copy([...state.savedItems.values()]);

  const removeResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "saved.remove",
      item: { type: removedItem.type, id: removedItem.id },
    }),
  );
  assert.equal(removeResponse.status, 200);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const syncResponse = await accountDataRoute.POST(
      makeRequest("/api/account/data", "POST", {
        type: "migration.keep",
        data: guestData,
      }),
    );
    const synced = await responseBody(syncResponse);
    assert.equal(syncResponse.status, 200);
    assert.deepEqual(synced.data.savedItems.map(({ id }) => id), [mappedItem.id]);
  }

  const restoredResponse = await accountDataRoute.GET(
    makeRequest("/api/account/data", "GET"),
  );
  const restored = await responseBody(restoredResponse);
  assert.deepEqual(restored.data.savedItems.map(({ id }) => id), [mappedItem.id]);
  assert.deepEqual([...state.savedItems.values()], normalizedBeforeRemoval);
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
  assert.equal(stageResponse.status, 409);
  assert.equal(answersResponse.status, 409);
  assert.deepEqual(state.studentProfiles.get(userA), beforeA.profile);
  assert.deepEqual(state.discoverAnswers.get(userA), beforeA.answers);
  assert.equal(state.studentProfiles.get(userB).educationStage, "class-10");
  assert.deepEqual(state.discoverAnswers.get(userB).answers, { activityIds: ["computers"] });

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

  assert.equal(transferResponse.status, 409);
  assert.deepEqual(state.studentProfiles.get(userA), beforeA.profile);
  assert.deepEqual(state.discoverAnswers.get(userA), beforeA.answers);
  assert.equal(state.studentProfiles.get(userB).educationStage, "class-10");
  assert.deepEqual(state.discoverAnswers.get(userB).answers, { activityIds: ["computers"] });

  // Valid Account B writes without mismatch succeed
  const validStageResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      expectedUserId: userB,
      type: "progress.educationStage",
      value: "class-12",
    }),
  );
  const validAnswersResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      expectedUserId: userB,
      type: "progress.discoveryAnswers",
      value: { activityIds: ["helping"] },
    }),
  );
  assert.equal(validStageResponse.status, 200);
  assert.equal(validAnswersResponse.status, 200);
  assert.equal(state.studentProfiles.get(userB).educationStage, "class-12");
  assert.deepEqual(state.discoverAnswers.get(userB).answers, { activityIds: ["helping"] });

  state.clerkUserId = clerkA;
  const accountAResponse = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const accountAResult = await responseBody(accountAResponse);
  assert.equal(accountAResult.data.educationStage, "class-12");
  assert.deepEqual(accountAResult.data.discoveryAnswers, { activityIds: ["fixing"] });
});

test("saved items and exploration history persist as owned normalized rows", async () => {
  resetState();
  state.clerkUserId = clerkA;

  const savedResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "saved.add",
      item: {
        type: "field",
        id: "account-saved-field",
        savedAt: 100,
        context: { stage: "class-10" },
      },
    }),
  );
  const firstVisit = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "history.record",
      item: {
        type: "field",
        id: "account-history-field",
        lastVisitedAt: 200,
        context: { stage: "class-10" },
      },
    }),
  );
  const secondVisit = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "history.record",
      item: {
        type: "field",
        id: "account-history-field",
        lastVisitedAt: 201,
        context: { stage: "class-10" },
      },
    }),
  );
  const loadedResponse = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const [saved, first, second, loaded] = await Promise.all([
    responseBody(savedResponse),
    responseBody(firstVisit),
    responseBody(secondVisit),
    responseBody(loadedResponse),
  ]);

  assert.equal(savedResponse.status, 200);
  assert.equal(firstVisit.status, 200);
  assert.equal(secondVisit.status, 200);
  assert.equal(loadedResponse.status, 200);
  assert.equal(state.savedItems.size, 1);
  assert.equal(state.explorationHistory.size, 4);
  assert.deepEqual(saved.data.savedItems, [{
    type: "field",
    id: "account-saved-field",
    savedAt: 100,
    context: { stage: "class-10" },
  }]);
  assert.equal(
    first.data.history.find(({ id }) => id === "account-history-field").visitCount,
    1,
  );
  assert.equal(
    second.data.history.find(({ id }) => id === "account-history-field").visitCount,
    2,
  );
  assert.deepEqual(loaded.data, second.data);
  assert.equal([...state.savedItems.values()][0].userId, userA);
  assert.equal([...state.explorationHistory.values()][0].userId, userA);

  const restoreResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "history.restore",
      item: {
        type: "course",
        id: "guest-history-course",
        lastVisitedAt: 300,
        visitCount: 4,
      },
    }),
  );
  assert.equal(restoreResponse.status, 200);
  assert.equal(state.explorationHistory.size, 5);

  const clearResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", { type: "history.clear" }),
  );
  assert.equal(clearResponse.status, 200);
  assert.equal(state.explorationHistory.size, 0);

  const removeResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "saved.remove",
      item: { type: "field", id: "account-saved-field" },
    }),
  );
  const afterRemoveResponse = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const afterRemove = await responseBody(afterRemoveResponse);
  assert.equal(removeResponse.status, 200);
  assert.equal(afterRemoveResponse.status, 200);
  assert.equal(state.savedItems.size, 0);
  assert.deepEqual(afterRemove.data.history, []);
  assert.deepEqual(afterRemove.data.savedItems, []);
});

test("Account B cannot read or clear Account A's normalized catalogue data", async () => {
  resetState();
  state.clerkUserId = clerkA;
  await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "saved.add",
      item: { type: "field", id: "account-saved-field", savedAt: 100 },
    }),
  );
  await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "history.record",
      item: { type: "field", id: "account-history-field", lastVisitedAt: 100 },
    }),
  );
  const beforeSaved = copy(state.savedItems);
  const beforeHistory = copy(state.explorationHistory);

  state.clerkUserId = clerkB;
  const getResponse = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const clearResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", { type: "history.clear" }),
  );
  const accountB = await responseBody(getResponse);

  assert.equal(getResponse.status, 200);
  assert.equal(clearResponse.status, 200);
  assert.deepEqual(accountB.data.savedItems, []);
  assert.deepEqual(accountB.data.history, []);
  assert.deepEqual(state.savedItems, beforeSaved);
  assert.deepEqual(state.explorationHistory, beforeHistory);
});

test("Guided Explorer preserves question order, skipped questions, answer states, and early resume", async () => {
  resetState();
  state.clerkUserId = clerkA;
  const paused = counsellingSession("guided-a");

  const saveResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "progress.counsellingSession",
      value: paused,
    }),
  );
  const saved = await responseBody(saveResponse);
  assert.equal(saveResponse.status, 200);
  assert.deepEqual(saved.data.counsellingSession.questionPath, paused.questionPath);
  assert.equal(typeof saved.data.counsellingSession.persistedUpdatedAt, "string");
  assert.equal(state.guidedExplorerSessions.get("guided-a").status, "paused");
  assert.equal(state.guidedExplorerSessionQuestions.get("guided-a:Q001").state, "asked");
  assert.equal(state.guidedExplorerSessionQuestions.get("guided-a:Q002").state, "skipped");
  assert.equal(state.guidedExplorerSessionQuestions.get("guided-a:Q008").state, "asked");
  assert.equal(state.guidedExplorerAnswers.get("guided-a-answer").responseState, "declined");

  const early = {
    ...saved.data.counsellingSession,
    status: "completed",
    completionReason: "finished_early",
    updatedAt: new Date().toISOString(),
  };
  const completeResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "progress.counsellingSession",
      value: early,
    }),
  );
  const completed = await responseBody(completeResponse);
  assert.equal(completeResponse.status, 200);
  assert.equal(state.guidedExplorerSessions.get("guided-a").currentQuestionId, null);
  assert.equal(state.guidedExplorerSessions.get("guided-a").resumeQuestionId, "Q008");
  assert.equal(completed.data.counsellingSession.currentQuestionId, "Q008");
  assert.equal(completed.data.counsellingSession.completionReason, "finished_early");

  const resumed = {
    ...completed.data.counsellingSession,
    status: "active",
    completionReason: undefined,
    updatedAt: new Date().toISOString(),
  };
  const resumeResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "progress.counsellingSession",
      value: resumed,
    }),
  );
  const resumeBody = await responseBody(resumeResponse);
  assert.equal(resumeResponse.status, 200);
  assert.equal(resumeBody.data.counsellingSession.status, "active");
  assert.equal(resumeBody.data.counsellingSession.currentQuestionId, "Q008");
  assert.equal(state.guidedExplorerSessions.get("guided-a").resumeQuestionId, null);

  const completedResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "progress.counsellingSession",
      value: {
        ...resumeBody.data.counsellingSession,
        status: "completed",
        currentQuestionId: null,
        updatedAt: new Date().toISOString(),
      },
    }),
  );
  const completedBody = await responseBody(completedResponse);
  assert.equal(completedResponse.status, 200);
  assert.equal(completedBody.data.counsellingSession.status, "completed");
  assert.equal(completedBody.data.counsellingSession.currentQuestionId, null);

  const clearResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "progress.counsellingSession",
      value: null,
    }),
  );
  const cleared = await responseBody(clearResponse);
  assert.equal(clearResponse.status, 200);
  assert.equal(cleared.data.counsellingSession.id, "guided-a");
  assert.equal(cleared.data.counsellingSession.status, "completed");
  assert.equal(state.guidedExplorerSessions.size, 1);
  assert.equal(state.guidedExplorerSessionQuestions.size, 3);
  assert.equal(state.guidedExplorerAnswers.size, 1);
});

test("stale Guided Explorer snapshots conflict instead of replacing newer answers", async () => {
  resetState();
  state.clerkUserId = clerkA;
  const initialResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "progress.counsellingSession",
      value: counsellingSession("guided-stale"),
    }),
  );
  const initial = (await responseBody(initialResponse)).data.counsellingSession;

  const newer = {
    ...initial,
    answers: initial.answers.map((answer) => ({ ...answer, originalText: "newer answer" })),
    updatedAt: new Date(Date.now() + 10).toISOString(),
  };
  const newerResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "progress.counsellingSession",
      value: newer,
    }),
  );
  assert.equal(newerResponse.status, 200);

  const stale = {
    ...initial,
    updatedAt: new Date(Date.now() + 20).toISOString(),
  };
  const staleResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "progress.counsellingSession",
      value: stale,
    }),
  );
  const staleBody = await responseBody(staleResponse);
  assert.equal(staleResponse.status, 409);
  assert.match(staleBody.error, /changed elsewhere/);
  assert.equal(staleBody.data.counsellingSession.answers[0].originalText, "newer answer");
  assert.equal(typeof staleBody.data.counsellingSession.persistedUpdatedAt, "string");

  const restoredResponse = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const restored = await responseBody(restoredResponse);
  assert.equal(restored.data.counsellingSession.answers[0].originalText, "newer answer");
});

test("Guided Explorer rejects duplicate and traversal-inconsistent answers", async () => {
  resetState();
  state.clerkUserId = clerkA;

  const duplicateAnswer = counsellingSession("guided-duplicate");
  duplicateAnswer.answers.push({ ...duplicateAnswer.answers[0], id: "another-answer" });
  const duplicateResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "progress.counsellingSession",
      value: duplicateAnswer,
    }),
  );
  assert.equal(duplicateResponse.status, 422);

  const unansweredQuestion = counsellingSession("guided-pending", {
    currentQuestionId: "Q002",
    pathIndex: 1,
    askedQuestionIds: ["Q001"],
    skippedQuestionIds: [],
  });
  const pendingResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "progress.counsellingSession",
      value: unansweredQuestion,
    }),
  );
  assert.equal(pendingResponse.status, 422);
  assert.equal(state.guidedExplorerSessions.size, 0);
});

test("guest transfer retains existing account Guided Explorer progress", async () => {
  resetState();
  const accountSession = counsellingSession("account-guided");
  const guestSession = counsellingSession("guest-guided", {
    currentQuestionId: "Q001",
    questionPath: ["Q001"],
    pathIndex: 0,
    askedQuestionIds: ["Q001"],
    skippedQuestionIds: [],
    answers: [],
  });
  state.accountData.set(userB, {
    ...emptyData(),
    counsellingSession: accountSession,
  });

  const response = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "migration.keep",
      data: { ...emptyData(), counsellingSession: guestSession },
    }),
  );
  const result = await responseBody(response);

  assert.equal(response.status, 200);
  assert.equal(result.data.counsellingSession.id, "account-guided");
  assert.equal(state.guidedExplorerSessions.has("account-guided"), true);
  assert.equal(state.guidedExplorerSessions.has("guest-guided"), false);
});

test("unmapped catalogue references and foreign Guided Explorer session IDs are rejected", async () => {
  resetState();
  state.clerkUserId = clerkA;

  const invalidCatalogue = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "saved.add",
      item: { type: "field", id: "not-in-catalogue", savedAt: 100 },
    }),
  );
  assert.equal(invalidCatalogue.status, 422);
  assert.equal(state.savedItems.size, 0);

  const foreignSession = counsellingSession("foreign-guided");
  state.guidedExplorerSessions.set("foreign-guided", {
    id: "foreign-guided",
    userId: userB,
    version: 1,
    questionBankVersion: 1,
    status: "paused",
    completionReason: null,
    currentQuestionId: "Q008",
    resumeQuestionId: null,
    pathIndex: 1,
    createdAt: new Date(foreignSession.updatedAt),
    updatedAt: new Date(foreignSession.updatedAt),
  });
  const foreignUpdate = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "progress.counsellingSession",
      value: foreignSession,
    }),
  );
  const result = await responseBody(foreignUpdate);
  assert.equal(foreignUpdate.status, 409);
  assert.match(result.error, /belongs to another account/);
  assert.equal(state.guidedExplorerSessions.get("foreign-guided").userId, userB);
  assert.equal(state.guidedExplorerSessionQuestions.size, 0);

  const malformedSession = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "progress.counsellingSession",
      value: counsellingSession(""),
    }),
  );
  assert.equal(malformedSession.status, 422);
  assert.equal(state.guidedExplorerSessions.size, 1);
});

test("unmapped legacy saved items and history can be removed without affecting other entries", async () => {
  resetState();
  state.clerkUserId = clerkA;
  state.accountData.set(userA, {
    ...emptyData(),
    savedItems: [
      { type: "field", id: "legacy-saved-remove", savedAt: 100 },
      { type: "field", id: "legacy-saved-keep", savedAt: 200 },
    ],
    history: [
      { type: "course", id: "legacy-history-remove", lastVisitedAt: 100, visitCount: 2 },
      { type: "course", id: "legacy-history-keep", lastVisitedAt: 200, visitCount: 1 },
    ],
  });

  const savedRemoval = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "saved.remove",
      item: { type: "field", id: "legacy-saved-remove" },
    }),
  );
  assert.equal(savedRemoval.status, 200);

  const historyRemoval = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "history.remove",
      item: { type: "course", id: "legacy-history-remove" },
    }),
  );
  assert.equal(historyRemoval.status, 200);

  const restoredResponse = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const restored = await responseBody(restoredResponse);
  assert.deepEqual(restored.data.savedItems.map(({ id }) => id), ["legacy-saved-keep"]);
  assert.deepEqual(restored.data.history.map(({ id }) => id), ["legacy-history-keep"]);

  const repeatedSavedRemoval = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "saved.remove",
      item: { type: "field", id: "legacy-saved-remove" },
    }),
  );
  const repeatedHistoryRemoval = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "history.remove",
      item: { type: "course", id: "legacy-history-remove" },
    }),
  );
  assert.equal(repeatedSavedRemoval.status, 200);
  assert.equal(repeatedHistoryRemoval.status, 200);

  const repeatedRestoredResponse = await accountDataRoute.GET(
    makeRequest("/api/account/data", "GET"),
  );
  const repeatedRestored = await responseBody(repeatedRestoredResponse);
  assert.deepEqual(repeatedRestored.data.savedItems.map(({ id }) => id), ["legacy-saved-keep"]);
  assert.deepEqual(repeatedRestored.data.history.map(({ id }) => id), ["legacy-history-keep"]);
});

test("legacy aliases for one catalogue item backfill to one saved and history record", async () => {
  resetState();
  state.clerkUserId = clerkA;
  const savedAlias = state.catalogAliases.get("field:account-saved-field:");
  const historyAlias = state.catalogAliases.get("field:account-history-field:");
  state.catalogAliases.set("field:alternate-saved-field:", {
    ...savedAlias,
    externalKey: "alternate-saved-field",
  });
  state.catalogAliases.set("field:alternate-history-field:", {
    ...historyAlias,
    externalKey: "alternate-history-field",
  });
  state.accountData.set(userA, {
    ...emptyData(),
    savedItems: [
      { type: "field", id: "account-saved-field", savedAt: 100 },
      { type: "field", id: "alternate-saved-field", savedAt: 200 },
    ],
    history: [
      { type: "field", id: "account-history-field", lastVisitedAt: 100, visitCount: 2 },
      { type: "field", id: "alternate-history-field", lastVisitedAt: 200, visitCount: 4 },
    ],
  });

  const response = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const result = await responseBody(response);
  assert.equal(response.status, 200);
  assert.equal(result.data.savedItems.length, 1);
  assert.equal(result.data.savedItems[0].savedAt, 200);
  assert.equal(result.data.history.length, 1);
  assert.equal(result.data.history[0].lastVisitedAt, 200);
  assert.equal(result.data.history[0].visitCount, 4);
  assert.equal(state.savedItems.size, 1);
  assert.equal(state.explorationHistory.size, 1);

  const removeResponse = await accountDataRoute.POST(
    makeRequest("/api/account/data", "POST", {
      type: "saved.remove",
      item: { type: "field", id: "alternate-saved-field" },
    }),
  );
  const afterRemoveResponse = await accountDataRoute.GET(makeRequest("/api/account/data", "GET"));
  const afterRemove = await responseBody(afterRemoveResponse);
  assert.equal(removeResponse.status, 200);
  assert.equal(afterRemoveResponse.status, 200);
  assert.equal(afterRemove.data.savedItems.length, 0);
  assert.equal(state.savedItems.size, 0);
});

resetState();
