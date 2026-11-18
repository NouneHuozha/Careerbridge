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
const { COUNSELLING_STORAGE_KEY } = loadModule("./personal-data-storage-keys.ts");

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
  let lastBody = null;
  globalThis.fetch = async (url, options) => {
    postCalls += 1;
    lastBody = JSON.parse(options.body);
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

  // Restore active user 101: flush now sends with expectedUserId
  setAccountMode(true, 101);
  assert.equal(await flushAccountMutations(101), true);
  assert.equal(postCalls, 1);
  assert.equal(lastBody.expectedUserId, 101);
  assert.equal(lastBody.type, "progress.educationStage");
  assert.equal(lastBody.value, "class-12");
  assert.equal(hasPendingAccountMutations(101), false);

  // When server rejects with 409, queue is preserved for recovery
  saveAccountMutationQueue(101, [{
    id: "m2",
    userId: 101,
    mutation: { type: "progress.educationStage", value: "class-10" },
    createdAt: Date.now(),
  }]);
  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    json: async () => ({ error: "Account session changed." }),
  });
  assert.equal(await flushAccountMutations(101), false);
  assert.equal(hasPendingAccountMutations(101), true);
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

test("queued Guided Explorer snapshots are rebased onto each successful server version", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);

  const firstVersion = "2026-03-01T10:00:00.001Z";
  const secondVersion = "2026-03-01T10:00:00.002Z";
  const thirdVersion = "2026-03-01T10:00:00.003Z";
  const session = { id: "guided-queue", persistedUpdatedAt: firstVersion, status: "paused" };
  const laterSnapshot = { ...session, pathIndex: 2 };
  sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(laterSnapshot));
  saveAccountMutationQueue(101, [
    {
      id: "guided-queue-1",
      userId: 101,
      mutation: { type: "progress.counsellingSession", value: session },
      createdAt: 1,
    },
    {
      id: "guided-queue-2",
      userId: 101,
      mutation: { type: "progress.counsellingSession", value: laterSnapshot },
      createdAt: 2,
    },
  ]);

  const requests = [];
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    const persistedUpdatedAt = requests.length === 1 ? secondVersion : thirdVersion;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          counsellingSession: {
            ...requests[requests.length - 1].value,
            id: "guided-queue",
            updatedAt: requests.length === 1 ? secondVersion : thirdVersion,
            answers: [],
            questionPath: ["Q001"],
            persistedUpdatedAt,
          },
        },
      }),
    };
  };

  assert.equal(await flushAccountMutations(), true);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].value.persistedUpdatedAt, firstVersion);
  assert.equal(requests[1].value.persistedUpdatedAt, secondVersion);
  assert.equal(
    JSON.parse(sessionStorage.getItem(COUNSELLING_STORAGE_KEY)).persistedUpdatedAt,
    thirdVersion,
  );
});

test("Guided Explorer repeated 409 conflicts stop after one recovery attempt", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);

  const local = {
    id: "guided-conflict",
    status: "paused",
    updatedAt: "2026-03-01T10:00:00.003Z",
    answers: [],
  };
  saveAccountMutationQueue(101, [{
    id: "guided-conflict-1",
    userId: 101,
    mutation: { type: "progress.counsellingSession", value: local },
    createdAt: 1,
  }]);

  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return {
      ok: false,
      status: 409,
      json: async () => ({
        error: "Guided Explorer progress changed elsewhere.",
        data: {
          counsellingSession: {
            ...local,
            updatedAt: "2026-03-01T10:00:00.002Z",
            persistedUpdatedAt: "2026-03-01T10:00:00.002Z",
          },
        },
      }),
    };
  };

  assert.equal(await flushAccountMutations(), false);
  assert.equal(requestCount, 2);
  assert.equal(hasPendingAccountMutations(101), true);
});

test("Guided Explorer 409 recovery succeeds when a newer local snapshot is rebased", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);

  const local = {
    id: "guided-recovery",
    status: "paused",
    currentQuestionId: "Q001",
    questionPath: ["Q001"],
    pathIndex: 0,
    askedQuestionIds: ["Q001"],
    skippedQuestionIds: [],
    updatedAt: "2026-03-01T10:00:00.003Z",
    answers: [{
      questionId: "Q001",
      originalText: "newer local answer",
      createdAt: "2026-03-01T10:00:00.003Z",
    }],
  };
  saveAccountMutationQueue(101, [{
    id: "guided-recovery-1",
    userId: 101,
    mutation: { type: "progress.counsellingSession", value: local },
    createdAt: 1,
  }]);

  let requestCount = 0;
  globalThis.fetch = async (_url, options) => {
    requestCount += 1;
    const body = JSON.parse(options.body);
    if (requestCount === 1) {
      return {
        ok: false,
        status: 409,
        json: async () => ({
          error: "Guided Explorer progress changed elsewhere.",
          data: {
            counsellingSession: {
              ...local,
              updatedAt: "2026-03-01T10:00:00.002Z",
              persistedUpdatedAt: "2026-03-01T10:00:00.002Z",
              answers: [],
            },
          },
        }),
      };
    }
    assert.equal(body.value.persistedUpdatedAt, "2026-03-01T10:00:00.002Z");
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          counsellingSession: {
            ...body.value,
            updatedAt: "2026-03-01T10:00:00.004Z",
            persistedUpdatedAt: "2026-03-01T10:00:00.004Z",
          },
        },
      }),
    };
  };

  assert.equal(await flushAccountMutations(), true);
  assert.equal(requestCount, 2);
  assert.equal(hasPendingAccountMutations(101), false);
});

test("server-winning Guided Explorer conflict restores the full session before the next local edit", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);

  const local = {
    id: "guided-server-wins",
    status: "paused",
    currentQuestionId: "Q001",
    questionPath: ["Q001", "Q002"],
    pathIndex: 0,
    askedQuestionIds: ["Q001"],
    skippedQuestionIds: [],
    answers: [{
      id: "local-answer",
      questionId: "Q001",
      originalText: "older local answer",
      createdAt: "2026-03-01T10:00:00.001Z",
    }],
    updatedAt: "2026-03-01T10:00:00.001Z",
    persistedUpdatedAt: "2026-03-01T10:00:00.001Z",
  };
  const server = {
    ...local,
    currentQuestionId: "Q002",
    pathIndex: 1,
    askedQuestionIds: ["Q001", "Q002"],
    answers: [{
      id: "server-answer",
      questionId: "Q001",
      originalText: "newer server answer",
      createdAt: "2026-03-01T10:00:00.002Z",
    }],
    updatedAt: "2026-03-01T10:00:00.002Z",
    persistedUpdatedAt: "2026-03-01T10:00:00.002Z",
  };
  sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(local));
  saveAccountMutationQueue(101, [{
    id: "guided-server-wins-1",
    userId: 101,
    mutation: { type: "progress.counsellingSession", value: local },
    createdAt: 1,
  }]);

  let requestCount = 0;
  globalThis.fetch = async (_url, options) => {
    requestCount += 1;
    if (requestCount === 1) {
      return {
        ok: false,
        status: 409,
        json: async () => ({
          error: "Guided Explorer progress changed elsewhere.",
          data: { counsellingSession: server },
        }),
      };
    }

    const body = JSON.parse(options.body);
    assert.deepEqual(body.value.answers[0], server.answers[0]);
    assert.equal(body.value.answers[1].questionId, "Q002");
    assert.equal(body.value.pathIndex, 1);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          counsellingSession: {
            ...body.value,
            updatedAt: "2026-03-01T10:00:00.004Z",
            persistedUpdatedAt: "2026-03-01T10:00:00.004Z",
          },
        },
      }),
    };
  };

  assert.equal(await flushAccountMutations(), true);
  const restored = JSON.parse(sessionStorage.getItem(COUNSELLING_STORAGE_KEY));
  assert.deepEqual(restored, server);
  assert.equal(hasPendingAccountMutations(101), false);

  const nextLocalEdit = {
    ...restored,
    currentQuestionId: null,
    status: "completed",
    pathIndex: 1,
    answers: [
      ...restored.answers,
      {
        id: "local-follow-up",
        questionId: "Q002",
        originalText: "new local follow-up",
        createdAt: "2026-03-01T10:00:00.003Z",
      },
    ],
    updatedAt: "2026-03-01T10:00:00.003Z",
  };
  sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(nextLocalEdit));
  enqueueAccountMutation({
    type: "progress.counsellingSession",
    value: nextLocalEdit,
  });
  assert.equal(await flushAccountMutations(), true);
  assert.equal(requestCount, 2);
  assert.deepEqual(
    JSON.parse(sessionStorage.getItem(COUNSELLING_STORAGE_KEY)).answers,
    [...server.answers, nextLocalEdit.answers[1]],
  );
});

test("409 flush does not cross account identities", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);
  saveAccountMutationQueue(101, [{
    id: "account-101-mutation",
    userId: 101,
    mutation: { type: "progress.educationStage", value: "class-12" },
    createdAt: 1,
  }]);

  globalThis.fetch = async () => {
    setAccountMode(true, 202);
    return {
      ok: false,
      status: 409,
      json: async () => ({ error: "Account session changed." }),
    };
  };

  assert.equal(await flushAccountMutations(101), false);
  assert.equal(hasPendingAccountMutations(101), true);
  assert.equal(hasPendingAccountMutations(202), false);
});
