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

const React = loadModule("react");
const originalUseSyncExternalStore = React.useSyncExternalStore;
React.useSyncExternalStore = (_subscribe, getSnapshot) => getSnapshot();

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
}

const sessionStorage = createStorage();
const localStorage = createStorage();
globalThis.window = {
  sessionStorage,
  localStorage,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
};

const {
  clearAccountMutationQueue,
  clearPersonalDataCache,
  enqueueAccountMutation,
  flushAccountMutations,
  getAccountCacheUserId,
  getAccountMutationQueueKey,
  hasPendingAccountMutations,
  hydrateAccountCache,
  isPersonalDataReady,
  lockPersonalData,
  preserveGuestDataCache,
  restoreGuestDataCache,
  saveAccountMutationQueue,
  setAccountMode,
} = loadModule("./account-data-sync.ts");
const { saveEducationStage, useEducationStage } = loadModule("./education-stage.ts");
const { saveAnswers, useStoredDiscoveryAnswers } = loadModule("./discover/flow-data.ts");

const emptyData = () => ({
  savedItems: [],
  history: [],
  educationStage: null,
  counsellingSession: null,
  discoveryAnswers: null,
});

function reset() {
  sessionStorage.clear();
  localStorage.clear();
  clearPersonalDataCache();
  setAccountMode(false);
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({}) });
}

after(() => {
  React.useSyncExternalStore = originalUseSyncExternalStore;
});

test("guest Discover stage and activities survive navigation and a page refresh", () => {
  reset();

  assert.equal(saveEducationStage("class-12"), true);
  assert.equal(saveAnswers({ activityIds: ["fixing", "helping"] }), true);
  setAccountMode(false);

  assert.deepEqual(useEducationStage(), { status: "saved", stage: "class-12" });
  assert.deepEqual(useStoredDiscoveryAnswers(), {
    status: "saved",
    answers: { activityIds: ["fixing", "helping"] },
  });
  assert.equal(getAccountCacheUserId(), null);
});

test("locking and hydrating the account cache hides guest and previous-account Discover values", () => {
  reset();
  saveEducationStage("class-10");
  saveAnswers({ activityIds: ["fixing"] });

  lockPersonalData();
  assert.equal(isPersonalDataReady(), false);
  assert.deepEqual(useEducationStage(), { status: "loading" });
  assert.deepEqual(useStoredDiscoveryAnswers(), { status: "loading" });

  hydrateAccountCache({
    ...emptyData(),
    educationStage: "class-12",
    discoveryAnswers: { activityIds: ["computers"] },
  }, 101);
  setAccountMode(true);
  assert.deepEqual(useEducationStage(), { status: "saved", stage: "class-12" });
  assert.deepEqual(useStoredDiscoveryAnswers(), {
    status: "saved",
    answers: { activityIds: ["computers"] },
  });

  lockPersonalData();
  assert.deepEqual(useEducationStage(), { status: "loading" });
  assert.deepEqual(useStoredDiscoveryAnswers(), { status: "loading" });
  hydrateAccountCache({
    ...emptyData(),
    educationStage: "class-10",
    discoveryAnswers: { activityIds: ["outdoors"] },
  }, 202);
  setAccountMode(true);
  assert.equal(getAccountCacheUserId(), 202);
  assert.deepEqual(useEducationStage(), { status: "saved", stage: "class-10" });
  assert.deepEqual(useStoredDiscoveryAnswers(), {
    status: "saved",
    answers: { activityIds: ["outdoors"] },
  });
});

test("sign-out cache restoration returns the separate guest Discover values", () => {
  reset();
  const guestData = {
    ...emptyData(),
    educationStage: "class-10",
    discoveryAnswers: { activityIds: ["helping"] },
  };
  preserveGuestDataCache(guestData);
  hydrateAccountCache({
    ...emptyData(),
    educationStage: "class-12",
    discoveryAnswers: { activityIds: ["computers"] },
  }, 101);
  setAccountMode(true);

  restoreGuestDataCache();

  assert.equal(getAccountCacheUserId(), null);
  assert.equal(isPersonalDataReady(), true);
  assert.deepEqual(useEducationStage(), { status: "saved", stage: "class-10" });
  assert.deepEqual(useStoredDiscoveryAnswers(), {
    status: "saved",
    answers: { activityIds: ["helping"] },
  });
});

test("failed account sync keeps guest-visible changes and retries the queued mutation", async () => {
  reset();
  setAccountMode(true);
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("temporary network failure");
    return { ok: true, status: 200, json: async () => ({}) };
  };

  assert.equal(saveAnswers({ activityIds: ["outdoors"] }), true);
  assert.deepEqual(useStoredDiscoveryAnswers(), {
    status: "saved",
    answers: { activityIds: ["outdoors"] },
  });
  assert.equal(await flushAccountMutations(), false);
  assert.equal(await flushAccountMutations(), true);
  assert.equal(attempts, 2);
});

test("queued mutations are associated with active user ID and scoped by account in sessionStorage", async () => {
  reset();
  globalThis.fetch = async () => {
    throw new Error("network failure");
  };

  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);

  assert.equal(saveAnswers({ activityIds: ["computers"] }), true);
  assert.equal(hasPendingAccountMutations(101), true);
  assert.equal(hasPendingAccountMutations(202), false);

  const rawQueue101 = sessionStorage.getItem(getAccountMutationQueueKey(101));
  assert.ok(rawQueue101 !== null);
  const queue101 = JSON.parse(rawQueue101);
  assert.equal(queue101.length, 1);
  assert.equal(queue101[0].userId, 101);
  assert.deepEqual(queue101[0].mutation, {
    type: "progress.discoveryAnswers",
    value: { activityIds: ["computers"] },
  });

  const rawQueue202 = sessionStorage.getItem(getAccountMutationQueueKey(202));
  assert.equal(rawQueue202, null);
});

test("mutations cannot flush under a mismatched target user ID or when account mode is locked", async () => {
  reset();
  let postCalls = 0;
  globalThis.fetch = async () => {
    postCalls += 1;
    return { ok: true, status: 200, json: async () => ({}) };
  };

  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);
  saveAccountMutationQueue(101, [{
    id: "m1",
    userId: 101,
    mutation: { type: "progress.educationStage", value: "class-12" },
    createdAt: Date.now(),
  }]);

  // Target ID 202 does not match active user 101: flush must return false and NOT fetch
  assert.equal(await flushAccountMutations(202), false);
  assert.equal(postCalls, 0);
  assert.equal(hasPendingAccountMutations(101), true);

  // When locked, flush must not send any mutations
  lockPersonalData();
  await flushAccountMutations(101);
  assert.equal(postCalls, 0);

  // Restore active user 101: flush now sends
  setAccountMode(true, 101);
  assert.equal(await flushAccountMutations(101), true);
  assert.equal(postCalls, 1);
  assert.equal(hasPendingAccountMutations(101), false);
});

test("pending account mutations survive sign-out and cache clearing", () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);

  enqueueAccountMutation({
    type: "progress.discoveryAnswers",
    value: { activityIds: ["helping"] },
  });
  assert.equal(hasPendingAccountMutations(101), true);

  clearPersonalDataCache();
  assert.equal(getAccountCacheUserId(), null);
  assert.equal(hasPendingAccountMutations(101), true);

  clearAccountMutationQueue(101);
  assert.equal(hasPendingAccountMutations(101), false);
});
