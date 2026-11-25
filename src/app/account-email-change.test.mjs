import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const loadModule = createRequire(import.meta.url);
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

const accountEmailChange = loadModule("./account-email-change.ts");

test("a verified email is promoted before the server synchronizes it", async () => {
  const events = [];
  let requestBody;
  const result = await accountEmailChange.verifyPromoteAndSyncEmail(
    { id: "email_new", verification: { status: "unverified" } },
    "123456",
    async (address) => {
      events.push("verify");
      return { ...address, verification: { status: "verified" } };
    },
    async (emailAddressId) => {
      events.push("promote");
      assert.equal(emailAddressId, "email_new");
    },
    "user_test_123",
    () => events.push("verified"),
    async (url, options) => {
      events.push("sync");
      assert.equal(url, "/api/account/email/sync");
      requestBody = JSON.parse(options.body);
      return new Response(JSON.stringify({ user: { id: 7 } }), { status: 200 });
    },
  );

  assert.deepEqual(result, { promoted: true, synced: true });
  assert.deepEqual(events, ["verify", "verified", "promote", "sync"]);
  assert.deepEqual(requestBody, { expectedUserId: "user_test_123" });
});

test("a Neon failure after Clerk promotion leaves a retry that does not repeat verification", async () => {
  const events = [];
  let primaryEmailId = "email_old";
  let syncAttempt = 0;
  const fetcher = async (_url, options) => {
    events.push("sync");
    assert.deepEqual(JSON.parse(options.body), { expectedUserId: "user_test_123" });
    syncAttempt += 1;
    return syncAttempt === 1
      ? new Response(JSON.stringify({ error: "Database unavailable." }), { status: 503 })
      : new Response(JSON.stringify({ user: { id: 7 } }), { status: 200 });
  };

  const result = await accountEmailChange.verifyPromoteAndSyncEmail(
    { id: "email_new", verification: { status: "unverified" } },
    "123456",
    async (address) => {
      events.push("verify");
      return { ...address, verification: { status: "verified" } };
    },
    async (emailAddressId) => {
      events.push("promote");
      primaryEmailId = emailAddressId;
    },
    "user_test_123",
    () => events.push("verified"),
    fetcher,
  );

  assert.equal(result.promoted, true);
  assert.equal(result.synced, false);
  assert.match(result.error.message, /Database unavailable/);
  assert.equal(primaryEmailId, "email_new");

  await accountEmailChange.requestPrimaryEmailSync("user_test_123", fetcher);
  assert.deepEqual(events, ["verify", "verified", "promote", "sync", "sync"]);
  assert.equal(syncAttempt, 2);
});
