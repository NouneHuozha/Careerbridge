import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Set TEST_DATABASE_URL to a local disposable PostgreSQL test database.");
}

const parsedDatabaseUrl = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.slice(1));
const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(parsedDatabaseUrl.hostname);
const isTestDatabase = /(?:^|[_-])(?:test|testing|disposable)(?:$|[_-])/i.test(databaseName);
if (!isLocalHost || !isTestDatabase) {
  throw new Error("PostgreSQL integration tests only run against a local database named as a test database.");
}

process.env.DATABASE_URL = databaseUrl;

const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");
const { Pool } = require("pg");
const testPool = new Pool({ connectionString: databaseUrl, max: 2 });
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const syntheticUserIds = [];
let currentClerkUserId = null;
let dataRoute;
let appPool;

require.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = require("node:fs");
  const output = ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

const clerkServer = {
  auth: async () => ({ userId: currentClerkUserId }),
  currentUser: async () =>
    currentClerkUserId
      ? {
          id: currentClerkUserId,
          primaryEmailAddressId: "synthetic-email",
          emailAddresses: [{
            id: "synthetic-email",
            emailAddress: `${currentClerkUserId}@example.test`,
            verification: { status: "verified" },
          }],
          privateMetadata: {},
        }
      : null,
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "@clerk/nextjs/server") return clerkServer;
  if (request === "next/server") {
    return {
      connection: async () => {},
      NextResponse: {
        json: (body, init = {}) =>
          new Response(JSON.stringify(body), {
            status: init.status ?? 200,
            headers: init.headers,
          }),
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

dataRoute = require("./api/account/data/route.ts");
Module._load = originalLoad;

async function applyMigration(client, name) {
  const sql = await readFile(resolve(projectRoot, "drizzle", name), "utf8");
  await client.query("BEGIN");
  try {
    for (const statement of sql.split(/-->\s*statement-breakpoint/g)) {
      if (statement.trim()) await client.query(statement);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function prepareDatabase() {
  const client = await testPool.connect();
  try {
    const database = await client.query("SELECT current_database() AS name");
    assert.equal(database.rows[0].name, databaseName);

    const publicTables = await client.query(
      "SELECT count(*)::int AS count FROM pg_tables WHERE schemaname = 'public'",
    );
    const relationCheck = await client.query(`
      SELECT
        to_regclass('public.users') AS users,
        to_regclass('public.auth_sessions') AS auth_sessions,
        to_regclass('public.account_data') AS account_data,
        to_regclass('public.catalog_item_aliases') AS catalog_item_aliases,
        to_regclass('public.student_profiles') AS student_profiles,
        to_regclass('public.discover_answers') AS discover_answers,
        to_regclass('public.guided_explorer_sessions') AS guided_explorer_sessions,
        to_regclass('public.guided_explorer_session_questions') AS guided_explorer_session_questions,
        to_regclass('public.guided_explorer_answers') AS guided_explorer_answers,
        to_regclass('public.saved_items') AS saved_items,
        to_regclass('public.exploration_history') AS exploration_history
    `);
    const relations = Object.values(relationCheck.rows[0]);

    if (relations.every((relation) => relation === null)) {
      if (publicTables.rows[0].count !== 0) {
        throw new Error("Refusing to bootstrap a non-empty public schema in the test database.");
      }
      await client.query("BEGIN");
      try {
        const authSchema = await readFile(
          resolve(projectRoot, "src", "app", "auth-schema.sql"),
          "utf8",
        );
        await client.query(authSchema);
        const initialSql = await readFile(
          resolve(projectRoot, "drizzle", "0000_initial-schema.sql"),
          "utf8",
        );
        for (const statement of initialSql.split(/-->\s*statement-breakpoint/g)) {
          if (statement.trim()) await client.query(statement);
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    } else if (relations.some((relation) => relation === null)) {
      throw new Error("The test database has a partial CareerBridge schema; use a fresh test database.");
    }

    const uniqueConstraint = await client.query(`
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.guided_explorer_answers'::regclass
        AND conname = 'guided_explorer_answers_session_question_unique'
    `);
    if (uniqueConstraint.rowCount === 0) {
      await applyMigration(client, "0001_unique_guided_explorer_answer.sql");
    }
    const operationReceipts = await client.query(
      "SELECT to_regclass('public.guided_explorer_operation_receipts') AS operation_receipts",
    );
    if (operationReceipts.rows[0].operation_receipts === null) {
      await applyMigration(client, "0002_guided_explorer_operations.sql");
    }
  } finally {
    client.release();
  }
}

async function createUser() {
  const externalId = `student-data-postgres-test-${randomUUID()}`;
  const email = `${externalId}@example.test`;
  const result = await testPool.query(
    `INSERT INTO public.users (external_id, email, full_name, auth_provider)
     VALUES ($1, $2, 'Synthetic Student', 'clerk')
     RETURNING id`,
    [externalId, email],
  );
  const user = { id: result.rows[0].id, externalId };
  syntheticUserIds.push(user.id);
  currentClerkUserId = externalId;
  return user;
}

function request(body) {
  return new Request("http://careerbridge.test/api/account/data", {
    method: "POST",
    headers: {
      origin: "http://careerbridge.test",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function post(mutation, expectedUserId) {
  const body =
    expectedUserId === undefined
      ? mutation
      : { ...mutation, expectedUserId };
  const response = await dataRoute.POST(request(body));
  return { response, body: await response.json() };
}

async function getData() {
  const response = await dataRoute.GET();
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body.data;
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

function counsellingOperation(session, baseRevision = null, operationId = randomUUID()) {
  return {
    type: "progress.counsellingOperation",
    operation: { operationId, baseRevision, session },
  };
}

before(async () => {
  await prepareDatabase();
  appPool = require("../db/pool.ts").getPool();
});

after(async () => {
  if (syntheticUserIds.length) {
    const ids = syntheticUserIds;
    await testPool.query(
      "DELETE FROM public.guided_explorer_operation_receipts WHERE user_id = ANY($1::integer[])",
      [ids],
    );
    await testPool.query(
      `DELETE FROM public.users WHERE id = ANY($1::integer[])`,
      [ids],
    );
  }
  if (appPool) await appPool.end();
  await testPool.end();
});

test("PostgreSQL persists and restores all five student data areas and context shapes", async () => {
  const user = await createUser();

  let result = await post({ type: "progress.educationStage", value: "class-12" });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  result = await post({
    type: "progress.discoveryAnswers",
    value: { activityIds: ["fixing", "helping"] },
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  const sessionId = `pg-session-${randomUUID()}`;
  result = await post({
    type: "progress.counsellingSession",
    value: counsellingSession(sessionId),
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.equal(typeof result.body.data.counsellingSession.persistedUpdatedAt, "string");

  result = await post({
    type: "saved.add",
    item: { type: "field", id: "technology", savedAt: 1_779_690_000_000 },
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  result = await post({
    type: "saved.add",
    item: { type: "course", id: "bca", savedAt: 1_779_690_000_001, context: {} },
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  result = await post({
    type: "history.record",
    item: { type: "field", id: "technology", lastVisitedAt: 1_779_690_000_000 },
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  result = await post({
    type: "history.record",
    item: { type: "field", id: "technology", lastVisitedAt: 1_779_690_000_100 },
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  const restored = await getData();
  assert.equal(restored.educationStage, "class-12");
  assert.deepEqual(restored.discoveryAnswers, { activityIds: ["fixing", "helping"] });
  assert.deepEqual(restored.counsellingSession.questionPath, ["Q001", "Q002", "Q008"]);
  assert.deepEqual(restored.counsellingSession.skippedQuestionIds, ["Q002"]);
  assert.equal(restored.counsellingSession.answers[0].responseState, "skip");
  assert.equal(typeof restored.counsellingSession.persistedUpdatedAt, "string");
  assert.deepEqual(restored.savedItems.find((item) => item.id === "bca").context, {});
  assert.equal("context" in restored.savedItems.find((item) => item.id === "technology"), false);
  assert.equal(restored.history.find((item) => item.id === "technology").visitCount, 2);

  const contexts = await testPool.query(`
    SELECT alias.external_key, saved.context
    FROM public.saved_items AS saved
    JOIN public.catalog_item_aliases AS alias
      ON alias.catalog_item_id = saved.catalog_item_id
    WHERE saved.user_id = $1 AND alias.source_system = 'careerbridge'
  `, [user.id]);
  assert.equal(contexts.rows.find((row) => row.external_key === "technology").context, null);
  assert.deepEqual(contexts.rows.find((row) => row.external_key === "bca").context, {});
});

test("PostgreSQL rejects stale snapshots and serializes concurrent session writes", async () => {
  await createUser();
  const sessionId = `pg-concurrent-${randomUUID()}`;
  let result = await post({
    type: "progress.counsellingSession",
    value: counsellingSession(sessionId),
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  const initial = result.body.data.counsellingSession;

  const newer = {
    ...initial,
    answers: initial.answers.map((answer) => ({ ...answer, originalText: "newer answer" })),
    updatedAt: new Date().toISOString(),
  };
  result = await post({ type: "progress.counsellingSession", value: newer });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  const stale = {
    ...initial,
    updatedAt: new Date(Date.now() + 1_000).toISOString(),
  };
  result = await post({ type: "progress.counsellingSession", value: stale });
  assert.equal(result.response.status, 409);
  assert.match(result.body.error, /changed elsewhere/);
  assert.equal((await getData()).counsellingSession.answers[0].originalText, "newer answer");

  const current = (await getData()).counsellingSession;
  const candidates = ["parallel A", "parallel B"].map((originalText) => ({
    type: "progress.counsellingSession",
    value: {
      ...current,
      answers: current.answers.map((answer) => ({ ...answer, originalText })),
      updatedAt: new Date().toISOString(),
    },
  }));
  const responses = await Promise.all(candidates.map((mutation) => post(mutation)));
  assert.deepEqual(
    responses.map(({ response }) => response.status).sort(),
    [200, 409],
  );
  const finalSession = (await getData()).counsellingSession;
  assert.ok(["parallel A", "parallel B"].includes(finalSession.answers[0].originalText));
});

test("PostgreSQL archives older completed sessions without replacing active progress", async () => {
  const user = await createUser();
  const currentId = `pg-current-${randomUUID()}`;
  let result = await post({
    type: "progress.counsellingSession",
    value: counsellingSession(currentId),
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  const current = result.body.data.counsellingSession;

  const historicalId = `pg-history-${randomUUID()}`;
  const historical = counsellingSession(historicalId, {
    status: "completed",
    currentQuestionId: null,
    updatedAt: new Date(Date.parse(current.updatedAt) - 1_000).toISOString(),
  });
  result = await post({
    type: "progress.counsellingSession",
    value: historical,
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.data.counsellingSession.id, historicalId);

  const restored = await getData();
  assert.equal(restored.counsellingSession.id, currentId);
  assert.equal(restored.counsellingSession.status, "paused");
  assert.equal(restored.latestCompletedCounsellingSession.id, historicalId);
  assert.equal(restored.latestCompletedCounsellingSession.status, "completed");

  const sessions = await testPool.query(`
    SELECT id, status
    FROM public.guided_explorer_sessions
    WHERE user_id = $1
    ORDER BY id
  `, [user.id]);
  assert.deepEqual(
    sessions.rows.map((row) => [row.id, row.status]).sort(([a], [b]) => a.localeCompare(b)),
    [[currentId, "paused"], [historicalId, "completed"]]
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  const historicalAnswers = await testPool.query(
    `SELECT count(*)::int AS count
     FROM public.guided_explorer_answers
     WHERE session_id = $1`,
    [historicalId],
  );
  assert.equal(historicalAnswers.rows[0].count, 1);

  result = await post({
    type: "progress.counsellingSession",
    value: historical,
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.data.counsellingSession.id, historicalId);
  assert.equal((await getData()).counsellingSession.id, currentId);

  result = await post({
    type: "progress.counsellingSession",
    value: counsellingSession(`pg-stale-active-${randomUUID()}`, {
      updatedAt: historical.updatedAt,
    }),
  });
  assert.equal(result.response.status, 409);
  assert.equal((await getData()).counsellingSession.id, currentId);
});

test("PostgreSQL Guided Explorer operations deduplicate retries after an uncertain 503", async () => {
  const user = await createUser();
  const session = counsellingSession(`pg-operation-${randomUUID()}`);
  const operationId = randomUUID();
  const mutation = counsellingOperation(session, null, operationId);

  const first = await post(mutation);
  assert.equal(first.response.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.data.counsellingSession.persistedRevision, 1);

  // A client that received a 503 after commit retries the exact operation ID.
  const retry = await post(mutation);
  assert.equal(retry.response.status, 200, JSON.stringify(retry.body));
  assert.equal(retry.body.data.counsellingSession.persistedRevision, 1);
  const receipts = await testPool.query(
    "SELECT count(*)::int AS count FROM public.guided_explorer_operation_receipts WHERE user_id = $1 AND operation_id = $2",
    [user.id, operationId],
  );
  assert.equal(receipts.rows[0].count, 1);
});

test("PostgreSQL Guided Explorer operations serialize concurrent tabs and return typed conflicts", async () => {
  await createUser();
  const session = counsellingSession(`pg-tabs-${randomUUID()}`);
  let result = await post(counsellingOperation(session));
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  const saved = result.body.data.counsellingSession;
  const candidates = ["tab A", "tab B"].map((originalText) => counsellingOperation({
    ...saved,
    answers: saved.answers.map((answer) => ({ ...answer, originalText })),
    updatedAt: new Date().toISOString(),
  }, saved.persistedRevision));

  const responses = await Promise.all(candidates.map((mutation) => post(mutation)));
  assert.deepEqual(responses.map(({ response }) => response.status).sort(), [200, 409]);
  const conflict = responses.find(({ response }) => response.status === 409).body.conflict;
  assert.equal(conflict.type, "guided-explorer");
  assert.equal(conflict.code, "stale_revision");
  assert.equal(typeof conflict.operationId, "string");
  assert.equal(typeof conflict.authoritativeSession.persistedRevision, "number");
});

test("PostgreSQL operations reject a stale active session, preserve completion history, and isolate accounts", async () => {
  const owner = await createUser();
  const completed = counsellingSession(`pg-completed-${randomUUID()}`, {
    status: "completed",
    currentQuestionId: null,
  });
  let result = await post(counsellingOperation(completed));
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  const active = counsellingSession(`pg-active-${randomUUID()}`, { status: "active" });
  result = await post(counsellingOperation(active));
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  const stale = counsellingSession(`pg-stale-${randomUUID()}`);
  result = await post(counsellingOperation(stale));
  assert.equal(result.response.status, 409);
  assert.equal(result.body.conflict.code, "different_active_session");

  const clearer = await post({ type: "progress.counsellingSession", value: null });
  assert.equal(clearer.response.status, 200, JSON.stringify(clearer.body));
  const history = await getData();
  assert.equal(history.counsellingSession.id, completed.id);

  const other = await createUser();
  result = await post(counsellingOperation({ ...completed, persistedRevision: 1 }, 1));
  assert.equal(result.response.status, 409);
  currentClerkUserId = owner.externalId;
  const ownerData = await getData();
  assert.equal(ownerData.counsellingSession.id, completed.id);
  assert.notEqual(owner.id, other.id);
});

test("PostgreSQL rejects duplicate and traversal-inconsistent answers before persistence", async () => {
  await createUser();
  const sessionId = `pg-invalid-${randomUUID()}`;
  const duplicate = counsellingSession(sessionId);
  duplicate.answers.push({ ...duplicate.answers[0], id: `${sessionId}-duplicate` });
  let result = await post({
    type: "progress.counsellingSession",
    value: duplicate,
  });
  assert.equal(result.response.status, 422);

  const pendingAnswer = counsellingSession(`pg-pending-${randomUUID()}`, {
    currentQuestionId: "Q002",
    pathIndex: 1,
    askedQuestionIds: ["Q001"],
    skippedQuestionIds: [],
  });
  result = await post({
    type: "progress.counsellingSession",
    value: pendingAnswer,
  });
  assert.equal(result.response.status, 422);
  assert.equal((await getData()).counsellingSession, null);

  const constraint = await testPool.query(`
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.guided_explorer_answers'::regclass
      AND conname = 'guided_explorer_answers_session_question_unique'
  `);
  assert.equal(constraint.rowCount, 1);
});

test("PostgreSQL removes unmapped legacy items without removing neighboring data", async () => {
  const user = await createUser();
  const legacySnapshot = {
    savedItems: [
      { type: "field", id: `missing-field-${randomUUID()}`, savedAt: 1 },
      { type: "field", id: "technology", savedAt: 2 },
    ],
    history: [
      {
        type: "course",
        id: `missing-course-${randomUUID()}`,
        lastVisitedAt: 1,
        visitCount: 1,
      },
      { type: "course", id: "bca", lastVisitedAt: 2, visitCount: 1 },
    ],
    educationStage: null,
    counsellingSession: null,
    discoveryAnswers: null,
  };
  await testPool.query(
    "INSERT INTO public.account_data (user_id, data) VALUES ($1, $2::jsonb)",
    [user.id, JSON.stringify(legacySnapshot)],
  );

  let result = await post({
    type: "saved.remove",
    item: { type: "field", id: legacySnapshot.savedItems[0].id },
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  result = await post({
    type: "history.remove",
    item: { type: "course", id: legacySnapshot.history[0].id },
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  const restored = await getData();
  assert.deepEqual(restored.savedItems.map(({ id }) => id), ["technology"]);
  assert.deepEqual(restored.history.map(({ id }) => id), ["bca"]);
});

test("PostgreSQL guest transfer cannot restore a removed unmapped saved item", async () => {
  const user = await createUser();
  const removedItem = {
    type: "field",
    id: `removed-legacy-${randomUUID()}`,
    savedAt: 1,
  };
  const retainedItem = { type: "field", id: "technology", savedAt: 2 };
  const guestData = {
    savedItems: [removedItem, retainedItem],
    history: [],
    educationStage: null,
    counsellingSession: null,
    discoveryAnswers: null,
  };

  let result = await post({ type: "migration.keep", data: guestData });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.deepEqual(
    result.body.data.savedItems.map(({ id }) => id).sort(),
    [removedItem.id, retainedItem.id].sort(),
  );
  result = await post({
    type: "saved.remove",
    item: { type: removedItem.type, id: removedItem.id },
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  for (let attempt = 0; attempt < 2; attempt += 1) {
    result = await post({ type: "migration.keep", data: guestData });
    assert.equal(result.response.status, 200, JSON.stringify(result.body));
    assert.deepEqual(result.body.data.savedItems.map(({ id }) => id), [retainedItem.id]);
  }

  const restored = await getData();
  assert.deepEqual(restored.savedItems.map(({ id }) => id), [retainedItem.id]);
  const normalizedRows = await testPool.query(`
    SELECT alias.external_key
    FROM public.saved_items AS saved
    JOIN public.catalog_item_aliases AS alias
      ON alias.catalog_item_id = saved.catalog_item_id
     AND alias.source_system = 'careerbridge'
    WHERE saved.user_id = $1
    ORDER BY alias.external_key
  `, [user.id]);
  assert.deepEqual(normalizedRows.rows.map(({ external_key }) => external_key), ["technology"]);
});

test("PostgreSQL enforces account ownership and rolls back partial guest transfers", async () => {
  const owner = await createUser();
  const other = await createUser();
  currentClerkUserId = owner.externalId;
  let result = await post({ type: "progress.educationStage", value: "class-12" });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  currentClerkUserId = other.externalId;
  assert.equal((await getData()).educationStage, null);
  result = await post(
    { type: "progress.educationStage", value: "class-10" },
    owner.id,
  );
  assert.equal(result.response.status, 409);

  const transfer = {
    type: "migration.keep",
    data: {
      savedItems: [{ type: "field", id: "technology", savedAt: 1 }],
      history: [{
        type: "field",
        id: `missing-history-${randomUUID()}`,
        lastVisitedAt: 1,
        visitCount: 1,
      }],
      educationStage: "class-10",
      counsellingSession: null,
      discoveryAnswers: { activityIds: ["fixing"] },
    },
  };
  result = await post(transfer);
  assert.equal(result.response.status, 422);
  assert.equal((await getData()).educationStage, null);
  const rollbackState = await testPool.query(
    `SELECT
       (SELECT count(*)::int FROM public.student_profiles WHERE user_id = $1) AS profiles,
       (SELECT count(*)::int FROM public.saved_items WHERE user_id = $1) AS saved`,
    [other.id],
  );
  assert.equal(rollbackState.rows[0].profiles, 0);
  assert.equal(rollbackState.rows[0].saved, 0);

  currentClerkUserId = owner.externalId;
  assert.equal((await getData()).educationStage, "class-12");
});
