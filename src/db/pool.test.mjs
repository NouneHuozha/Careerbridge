import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { after } from "node:test";

const loadModule = createRequire(import.meta.url);
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

const poolModule = loadModule("./pool.ts");
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalUnpooledUrl = process.env.DATABASE_URL_UNPOOLED;
const pooledUrl = "postgres://test@ep-test-pooler.region.aws.neon.tech/neondb";
const directUrl = "postgres://test@ep-test.region.aws.neon.tech/neondb";
let identityPool;
let normalPool;

function setDatabaseUrls(pooled, direct) {
  if (pooled === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = pooled;
  if (direct === undefined) delete process.env.DATABASE_URL_UNPOOLED;
  else process.env.DATABASE_URL_UNPOOLED = direct;
}

test("identity lock pool requires valid matching pooled and direct database URLs", () => {
  setDatabaseUrls(undefined, directUrl);
  assert.throws(() => poolModule.getIdentityLockPool(), /DATABASE_URL is required/);

  setDatabaseUrls(pooledUrl, undefined);
  assert.throws(() => poolModule.getIdentityLockPool(), /DATABASE_URL_UNPOOLED is required/);

  setDatabaseUrls(pooledUrl, "not-a-url");
  assert.throws(() => poolModule.getIdentityLockPool(), /valid PostgreSQL URL/);

  setDatabaseUrls(pooledUrl, pooledUrl);
  assert.throws(() => poolModule.getIdentityLockPool(), /same database.*without using a pooler/);

  setDatabaseUrls(pooledUrl, directUrl.replace("/neondb", "/otherdb"));
  assert.throws(() => poolModule.getIdentityLockPool(), /same database.*without using a pooler/);
});

test("identity lock pool connects directly to the matching unpooled URL", () => {
  setDatabaseUrls(pooledUrl, directUrl);
  identityPool = poolModule.getIdentityLockPool();
  assert.equal(identityPool.options.connectionString, directUrl);
  assert.equal(identityPool.options.idleTimeoutMillis, 30_000);
  assert.equal(identityPool.options.keepAlive, true);
  assert.equal(identityPool.options.keepAliveInitialDelayMillis, 10_000);
});

test("normal and direct pools expose idle lifecycle handling without replacing URL separation", () => {
  setDatabaseUrls(pooledUrl, directUrl);
  normalPool = poolModule.getPool();
  identityPool ??= poolModule.getIdentityLockPool();

  assert.equal(normalPool.options.connectionString, pooledUrl);
  assert.equal(identityPool.options.connectionString, directUrl);
  assert.equal(normalPool.options.idleTimeoutMillis, 30_000);
  assert.equal(normalPool.options.keepAlive, true);
  assert.equal(normalPool.options.keepAliveInitialDelayMillis, 10_000);
  assert.ok(normalPool.listenerCount("error") > 0);
  assert.ok(identityPool.listenerCount("error") > 0);
});

test("idle pool errors are logged and do not become unhandled pool events", () => {
  setDatabaseUrls(pooledUrl, directUrl);
  normalPool ??= poolModule.getPool();
  const originalError = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  try {
    normalPool.emit("error", new Error("synthetic idle termination"));
  } finally {
    console.error = originalError;
  }
  assert.equal(logs.length, 1);
  assert.match(String(logs[0][0]), /PostgreSQL pool idle connection error/);
  assert.equal(logs[0][1].message, "synthetic idle termination");
});

after(async () => {
  if (identityPool) await identityPool.end();
  if (normalPool) await normalPool.end();
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalUnpooledUrl === undefined) delete process.env.DATABASE_URL_UNPOOLED;
  else process.env.DATABASE_URL_UNPOOLED = originalUnpooledUrl;
});
