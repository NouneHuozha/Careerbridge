import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import test, { after, before } from "node:test";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Set TEST_DATABASE_URL to a disposable local identity-lock test database.");
}

const parsedDatabaseUrl = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.slice(1));
if (
  !["localhost", "127.0.0.1", "::1"].includes(parsedDatabaseUrl.hostname) ||
  !/^careerbridge_identity_lock_test_[a-f0-9]{12}$/i.test(databaseName)
) {
  throw new Error("Identity-lock PostgreSQL tests only run against a disposable local test database.");
}

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalUnpooledUrl = process.env.DATABASE_URL_UNPOOLED;
process.env.DATABASE_URL = databaseUrl;
process.env.DATABASE_URL_UNPOOLED = databaseUrl;

const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");
const { Pool } = require("pg");
const fixturePool = new Pool({ connectionString: databaseUrl, max: 2 });
const userIdContext = new AsyncLocalStorage();
const instrumentation = {
  failNextLock: null,
  failNextUnlock: null,
  insertDelayMs: 0,
  activeInserts: 0,
  maxActiveInserts: 0,
  backendEvents: [],
};
let fixtureTablesCreated = false;

require.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = require("node:fs");
  const output = ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

const poolModule = require("../db/pool.ts");
const originalGetIdentityLockPool = poolModule.getIdentityLockPool;
const actualIdentityLockPool = originalGetIdentityLockPool();
const originalLoad = Module._load;
const clerkServer = {
  auth: async () => ({ userId: userIdContext.getStore()?.userId ?? null }),
  currentUser: async () => {
    const context = userIdContext.getStore();
    if (context?.callbackError) throw context.callbackError;
    if (!context?.userId) return null;
    const id = context.profileUserId ?? context.userId;
    return {
      id,
      firstName: "Synthetic",
      lastName: "Student",
      primaryEmailAddressId: "synthetic-email",
      emailAddresses: [{
        id: "synthetic-email",
        emailAddress: `${id}@example.test`,
        verification: { status: "verified" },
      }],
      privateMetadata: {},
    };
  },
};

function queryText(args) {
  return typeof args[0] === "string" ? args[0].trim() : args[0]?.text?.trim() ?? "";
}

async function recordBackend(target, kind) {
  const result = await target.query("SELECT pg_backend_pid() AS pid");
  instrumentation.backendEvents.push({ kind, pid: result.rows[0].pid });
}

const instrumentedIdentityLockPool = {
  async connect() {
    const target = await actualIdentityLockPool.connect();
    return new Proxy(target, {
      get(client, property) {
        if (property === "query") {
          return async (...args) => {
            const statement = queryText(args);
            if (statement.startsWith("SELECT pg_advisory_lock(")) {
              await recordBackend(client, "lock");
              if (instrumentation.failNextLock) {
                const error = instrumentation.failNextLock;
                instrumentation.failNextLock = null;
                throw error;
              }
            }
            if (statement.startsWith("SELECT pg_advisory_unlock(")) {
              await recordBackend(client, "unlock");
              if (instrumentation.failNextUnlock) {
                const error = instrumentation.failNextUnlock;
                instrumentation.failNextUnlock = null;
                throw error;
              }
            }
            if (statement.startsWith("INSERT INTO users")) {
              await recordBackend(client, "callback");
              instrumentation.activeInserts += 1;
              instrumentation.maxActiveInserts = Math.max(
                instrumentation.maxActiveInserts,
                instrumentation.activeInserts,
              );
              try {
                if (instrumentation.insertDelayMs) {
                  await new Promise((resolve) => setTimeout(resolve, instrumentation.insertDelayMs));
                }
                return await client.query(...args);
              } finally {
                instrumentation.activeInserts -= 1;
              }
            }
            return client.query(...args);
          };
        }
        if (property === "release") return client.release.bind(client);
        const value = Reflect.get(client, property, client);
        return typeof value === "function" ? value.bind(client) : value;
      },
    });
  },
};

poolModule.getIdentityLockPool = () => instrumentedIdentityLockPool;
Module._load = function (request, parent, isMain) {
  if (request === "@clerk/nextjs/server") return clerkServer;
  return originalLoad.call(this, request, parent, isMain);
};
const authServer = require("./auth-server.ts");
Module._load = originalLoad;

const fixtureTables = [
  "public.exploration_history",
  "public.saved_items",
  "public.guided_explorer_answers",
  "public.guided_explorer_session_questions",
  "public.guided_explorer_sessions",
  "public.discover_answers",
  "public.student_profiles",
  "public.catalog_item_aliases",
  "public.account_data",
  "public.users",
];

async function provisionAs(userId, overrides = {}) {
  return userIdContext.run({ userId, ...overrides }, () =>
    authServer.provisionCurrentUser({
      privacyAccepted: true,
      ageAttestation: "adult",
    }),
  );
}

async function canAcquireIdentityLock(userId) {
  const client = await actualIdentityLockPool.connect();
  try {
    const result = await client.query(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS acquired",
      [userId],
    );
    if (result.rows[0].acquired) {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [userId]);
    }
    return result.rows[0].acquired;
  } finally {
    client.release();
  }
}

function resetInstrumentation() {
  instrumentation.failNextLock = null;
  instrumentation.failNextUnlock = null;
  instrumentation.insertDelayMs = 0;
  instrumentation.activeInserts = 0;
  instrumentation.maxActiveInserts = 0;
  instrumentation.backendEvents = [];
}

before(async () => {
  const identity = await fixturePool.query(
    "SELECT current_database() AS database, version() AS version",
  );
  assert.equal(identity.rows[0].database, databaseName);
  console.log(`Identity-lock PostgreSQL test server: ${identity.rows[0].version}`);

  const existingTables = await fixturePool.query(
    "SELECT count(*)::int AS count FROM pg_tables WHERE schemaname = 'public'",
  );
  assert.equal(existingTables.rows[0].count, 0, "test database public schema must be empty");

  await fixturePool.query("BEGIN");
  try {
    await fixturePool.query(`
      CREATE TABLE public.users (
        id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        external_id text NOT NULL UNIQUE,
        email text NOT NULL,
        full_name text,
        auth_provider text NOT NULL,
        privacy_notice_version text,
        privacy_notice_accepted_at timestamptz,
        age_attestation text,
        age_attested_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    for (const table of fixtureTables.slice(0, -1)) {
      await fixturePool.query(`CREATE TABLE ${table} (id integer PRIMARY KEY)`);
    }
    await fixturePool.query("COMMIT");
    fixtureTablesCreated = true;
  } catch (error) {
    await fixturePool.query("ROLLBACK");
    throw error;
  }
});

after(async () => {
  const cleanupErrors = [];
  poolModule.getIdentityLockPool = originalGetIdentityLockPool;
  if (fixtureTablesCreated) {
    try {
      await fixturePool.query(`DROP TABLE ${fixtureTables.join(", ")}`);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  try {
    await poolModule.getPool().end();
  } catch (error) {
    cleanupErrors.push(error);
  }
  try {
    await actualIdentityLockPool.end();
  } catch (error) {
    cleanupErrors.push(error);
  }
  try {
    await fixturePool.end();
  } catch (error) {
    cleanupErrors.push(error);
  }
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalUnpooledUrl === undefined) delete process.env.DATABASE_URL_UNPOOLED;
  else process.env.DATABASE_URL_UNPOOLED = originalUnpooledUrl;
  if (cleanupErrors.length) {
    throw new AggregateError(cleanupErrors, "PostgreSQL identity-lock integration cleanup failed.");
  }
});

test("independent PostgreSQL connections contend for the same advisory lock", { timeout: 10000 }, async () => {
  const userId = `careerbridge-lock-test-${randomUUID()}`;
  const first = await actualIdentityLockPool.connect();
  const second = await actualIdentityLockPool.connect();
  let firstLocked = false;
  let secondLocked = false;
  try {
    await first.query("SELECT pg_advisory_lock(hashtext($1))", [userId]);
    firstLocked = true;
    const blocked = await second.query(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS acquired",
      [userId],
    );
    assert.equal(blocked.rows[0].acquired, false);

    await first.query("SELECT pg_advisory_unlock(hashtext($1))", [userId]);
    firstLocked = false;
    const acquired = await second.query(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS acquired",
      [userId],
    );
    assert.equal(acquired.rows[0].acquired, true);
    secondLocked = true;
  } finally {
    if (firstLocked) await first.query("SELECT pg_advisory_unlock(hashtext($1))", [userId]);
    if (secondLocked) await second.query("SELECT pg_advisory_unlock(hashtext($1))", [userId]);
    first.release();
    second.release();
  }
});

test("different identity keys can hold advisory locks concurrently", { timeout: 10000 }, async () => {
  const firstId = `careerbridge-lock-test-${randomUUID()}`;
  const secondId = `careerbridge-lock-test-${randomUUID()}`;
  const first = await actualIdentityLockPool.connect();
  const second = await actualIdentityLockPool.connect();
  let firstLocked = false;
  let secondLocked = false;
  try {
    await first.query("SELECT pg_advisory_lock(hashtext($1))", [firstId]);
    firstLocked = true;
    const acquired = await second.query(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS acquired",
      [secondId],
    );
    assert.equal(acquired.rows[0].acquired, true);
    secondLocked = true;
  } finally {
    if (firstLocked) await first.query("SELECT pg_advisory_unlock(hashtext($1))", [firstId]);
    if (secondLocked) await second.query("SELECT pg_advisory_unlock(hashtext($1))", [secondId]);
    first.release();
    second.release();
  }
});

test("successful provisioning releases the lock on the same PostgreSQL backend", { timeout: 10000 }, async () => {
  resetInstrumentation();
  const userId = `careerbridge-lock-test-${randomUUID()}`;
  const user = await provisionAs(userId);
  assert.ok(user.id > 0);
  assert.equal(await canAcquireIdentityLock(userId), true);

  const events = instrumentation.backendEvents;
  assert.deepEqual(events.map((event) => event.kind), ["lock", "callback", "unlock"]);
  assert.equal(new Set(events.map((event) => event.pid)).size, 1);
});

test("callback failure still releases the session lock", { timeout: 10000 }, async () => {
  resetInstrumentation();
  const userId = `careerbridge-lock-test-${randomUUID()}`;
  const callbackError = new Error("synthetic callback failure");
  await assert.rejects(provisionAs(userId, { callbackError }), (error) => error === callbackError);
  assert.equal(await canAcquireIdentityLock(userId), true);
  assert.deepEqual(instrumentation.backendEvents.map((event) => event.kind), ["lock", "unlock"]);
});

test("unlock failure preserves the callback error and discards the locked connection", { timeout: 10000 }, async () => {
  resetInstrumentation();
  const userId = `careerbridge-lock-test-${randomUUID()}`;
  const callbackError = new Error("original synthetic callback failure");
  const unlockError = new Error("simulated PostgreSQL unlock failure");
  instrumentation.failNextUnlock = unlockError;
  const originalConsoleError = console.error;
  let cleanupWasReported = false;
  console.error = (...args) => {
    cleanupWasReported = args[0] === "[careerbridge-next] Clerk identity lock cleanup failed";
  };
  try {
    await assert.rejects(provisionAs(userId, { callbackError }), (error) => error === callbackError);
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(cleanupWasReported, true);
  assert.equal(await canAcquireIdentityLock(userId), true);
});

test("lock acquisition failure does not execute provisioning", { timeout: 10000 }, async () => {
  resetInstrumentation();
  const userId = `careerbridge-lock-test-${randomUUID()}`;
  const lockError = new Error("simulated advisory-lock acquisition failure");
  instrumentation.failNextLock = lockError;
  await assert.rejects(provisionAs(userId), (error) => error === lockError);
  assert.deepEqual(instrumentation.backendEvents.map((event) => event.kind), ["lock"]);
  assert.equal(await canAcquireIdentityLock(userId), true);

  const count = await fixturePool.query(
    "SELECT count(*)::int AS count FROM public.users WHERE external_id = $1",
    [userId],
  );
  assert.equal(count.rows[0].count, 0);
});

test("concurrent provisioning for one identity serializes and leaves one row", { timeout: 12000 }, async () => {
  resetInstrumentation();
  instrumentation.insertDelayMs = 200;
  const userId = `careerbridge-lock-test-${randomUUID()}`;
  const [first, second] = await Promise.all([
    provisionAs(userId),
    provisionAs(userId),
  ]);
  assert.equal(first.id, second.id);
  assert.equal(instrumentation.maxActiveInserts, 1);

  const result = await fixturePool.query(
    "SELECT count(*)::int AS count FROM public.users WHERE external_id = $1",
    [userId],
  );
  assert.equal(result.rows[0].count, 1);
});

test("a retry after a post-write unlock failure reuses the synthetic user row", { timeout: 10000 }, async () => {
  resetInstrumentation();
  const userId = `careerbridge-lock-test-${randomUUID()}`;
  instrumentation.failNextUnlock = new Error("simulated post-write unlock failure");
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    await assert.rejects(provisionAs(userId), /simulated post-write unlock failure/);
  } finally {
    console.error = originalConsoleError;
  }

  const retry = await provisionAs(userId);
  const result = await fixturePool.query(
    "SELECT count(*)::int AS count FROM public.users WHERE external_id = $1",
    [userId],
  );
  assert.ok(retry.id > 0);
  assert.equal(result.rows[0].count, 1);
});

test("different identities provision independently and remain isolated", { timeout: 12000 }, async () => {
  resetInstrumentation();
  instrumentation.insertDelayMs = 250;
  const firstId = `careerbridge-lock-test-${randomUUID()}`;
  const secondId = `careerbridge-lock-test-${randomUUID()}`;
  const [first, second] = await Promise.all([
    provisionAs(firstId),
    provisionAs(secondId),
  ]);

  assert.notEqual(first.id, second.id);
  assert.equal(instrumentation.maxActiveInserts, 2);
  const records = await fixturePool.query(
    "SELECT external_id, id FROM public.users WHERE external_id = ANY($1::text[])",
    [[firstId, secondId]],
  );
  assert.equal(records.rows.length, 2);
  assert.notEqual(records.rows[0].id, records.rows[1].id);
});
