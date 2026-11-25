import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

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

const { createCareerBridgeAccountDeletionFetcher } = loadModule("./account-deletion.ts");
const strictReverificationResponse = () => new Response(JSON.stringify({
  clerk_error: { metadata: { reverification: "strict" } },
}), { status: 403, headers: { "Content-Type": "application/json" } });

function createAccount() {
  return {
    flushCalls: 0,
    async flushChanges() {
      this.flushCalls += 1;
      return true;
    },
  };
}

function deletionFetcher(account) {
  return createCareerBridgeAccountDeletionFetcher(account);
}

function mockClerkReverification(fetcher, verify = async () => {}) {
  return async (...args) => {
    const response = await fetcher(...args);
    const result = await response.clone().json();
    if (response.status === 403 && result?.clerk_error?.metadata?.reverification === "strict") {
      await verify();
      return fetcher(...args);
    }
    return response;
  };
}

function sessionResponse(status = 200, body = {}) {
  return new Response(JSON.stringify(body), { status });
}

test("deletion succeeds without requiring reverification and returns an unread Response", async () => {
  const account = createAccount();
  const success = new Response(JSON.stringify({ ok: true }), { status: 200 });
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return url === "/api/auth/session" ? sessionResponse() : success;
  };
  const fetcher = deletionFetcher(account);
  const request = mockClerkReverification(fetcher);

  const response = await request("DELETE", "clerk-user-1");

  assert.equal(response, success);
  assert.equal(response.bodyUsed, false);
  assert.equal(requests.filter(({ url }) => url === "/api/account").length, 1);
  assert.equal(JSON.parse(requests[1].options.body).confirmation, "DELETE");
  assert.equal(JSON.parse(requests[1].options.body).expectedUserId, "clerk-user-1");
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(account.flushCalls, 1);
});

test("strict reverification is retried and only the resolved retry response is parsed", async () => {
  const account = createAccount();
  let deletionAttempts = 0;
  const strictResponse = strictReverificationResponse();
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url === "/api/auth/session") return sessionResponse();
    deletionAttempts += 1;
    return deletionAttempts === 1
      ? strictResponse
      : new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  let verifications = 0;
  const request = mockClerkReverification(deletionFetcher(account), async () => {
    verifications += 1;
  });

  const response = await request("DELETE", "clerk-user-2");

  assert.equal(verifications, 1);
  assert.equal(deletionAttempts, 2);
  assert.equal(strictResponse.bodyUsed, false);
  assert.equal(response.ok, true);
  assert.deepEqual(await response.json(), { ok: true });
  const deletionBodies = requests
    .filter(({ url }) => url === "/api/account")
    .map(({ options }) => JSON.parse(options.body));
  assert.deepEqual(deletionBodies, [
    { confirmation: "DELETE", expectedUserId: "clerk-user-2" },
    { confirmation: "DELETE", expectedUserId: "clerk-user-2" },
  ]);
});

test("cancelled reverification propagates without retrying deletion", async () => {
  const account = createAccount();
  let deletionAttempts = 0;
  globalThis.fetch = async (url) => {
    if (url === "/api/auth/session") return sessionResponse();
    deletionAttempts += 1;
    return strictReverificationResponse();
  };
  const cancelled = new Error("reverification cancelled");
  const request = mockClerkReverification(deletionFetcher(account), async () => {
    throw cancelled;
  });

  await assert.rejects(request("DELETE", "clerk-user-3"), cancelled);
  assert.equal(deletionAttempts, 1);
});

test("account identity changes during reverification are rejected on the original expected user ID", async () => {
  const account = createAccount();
  let currentUserId = "clerk-user-4";
  const deleteBodies = [];
  globalThis.fetch = async (url, options) => {
    if (url === "/api/auth/session") return sessionResponse();
    const body = JSON.parse(options.body);
    deleteBodies.push(body);
    return body.expectedUserId === currentUserId
      ? strictReverificationResponse()
      : new Response(JSON.stringify({ error: "Account session changed." }), { status: 409 });
  };
  const request = mockClerkReverification(deletionFetcher(account), async () => {
    currentUserId = "different-clerk-user";
  });

  const response = await request("DELETE", "clerk-user-4");

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Account session changed." });
  assert.deepEqual(deleteBodies, [
    { confirmation: "DELETE", expectedUserId: "clerk-user-4" },
    { confirmation: "DELETE", expectedUserId: "clerk-user-4" },
  ]);
});

test("pending deletion skips account-data flushing and retries deletion", async () => {
  const account = createAccount();
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url === "/api/auth/session") {
      return sessionResponse(409, { deletionPending: true });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  const response = await deletionFetcher(account)("DELETE", "clerk-user-5");

  assert.equal(response.ok, true);
  assert.equal(account.flushCalls, 0);
  assert.equal(requests.filter(({ url }) => url === "/api/account").length, 1);
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    confirmation: "DELETE",
    expectedUserId: "clerk-user-5",
  });
});
