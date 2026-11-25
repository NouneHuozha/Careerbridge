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
  getAccountMutationConflictKey,
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
const {
  COMPLETED_COUNSELLING_STORAGE_KEY,
  COUNSELLING_STORAGE_KEY,
} = loadModule("./personal-data-storage-keys.ts");

const emptyData = () => ({
  savedItems: [],
  history: [],
  educationStage: null,
  counsellingSession: null,
  latestCompletedCounsellingSession: null,
  discoveryAnswers: null,
});

function counsellingSession(id, overrides = {}) {
  return {
    version: 1,
    questionBankVersion: 1,
    id,
    status: "active",
    currentQuestionId: "Q001",
    questionPath: ["Q001"],
    pathIndex: 0,
    askedQuestionIds: ["Q001"],
    skippedQuestionIds: [],
    answers: [],
    updatedAt: "2026-03-01T10:00:00.001Z",
    ...overrides,
  };
}

function counsellingAnswer(id, originalText, createdAt, editedAt) {
  return {
    id,
    questionId: "Q001",
    optionIds: ["using-computers-or-technology"],
    originalText,
    interpretationStatus: "clear",
    responseState: "answered",
    createdAt,
    ...(editedAt ? { editedAt } : {}),
  };
}

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

test("account hydration keeps completed possibilities while replacing the resumable session", () => {
  reset();
  const completed = counsellingSession("completed-session", {
    status: "completed",
    currentQuestionId: null,
    answers: [counsellingAnswer("completed-answer", "Completed interest", "2026-03-01T10:00:00.001Z")],
  });
  const active = counsellingSession("active-session", {
    persistedRevision: 3,
    updatedAt: "2026-03-01T10:00:00.003Z",
  });

  hydrateAccountCache({
    ...emptyData(),
    counsellingSession: completed,
    latestCompletedCounsellingSession: completed,
  }, 101);
  hydrateAccountCache({
    ...emptyData(),
    counsellingSession: active,
    latestCompletedCounsellingSession: completed,
  }, 101);

  assert.equal(JSON.parse(sessionStorage.getItem(COUNSELLING_STORAGE_KEY)).id, "active-session");
  assert.deepEqual(
    JSON.parse(sessionStorage.getItem(COMPLETED_COUNSELLING_STORAGE_KEY)),
    completed,
  );

  const nextCompleted = {
    ...active,
    status: "completed",
    currentQuestionId: null,
    answers: [counsellingAnswer("next-answer", "New completed interest", "2026-03-01T10:00:00.004Z")],
    updatedAt: "2026-03-01T10:00:00.004Z",
    persistedRevision: 4,
  };
  hydrateAccountCache({
    ...emptyData(),
    counsellingSession: nextCompleted,
    latestCompletedCounsellingSession: nextCompleted,
  }, 101);
  assert.deepEqual(
    JSON.parse(sessionStorage.getItem(COMPLETED_COUNSELLING_STORAGE_KEY)),
    nextCompleted,
  );

  hydrateAccountCache(emptyData(), 202);
  assert.equal(sessionStorage.getItem(COMPLETED_COUNSELLING_STORAGE_KEY), null);
});

test("guest completed Guided Explorer possibilities survive starting another conversation", () => {
  reset();
  const completed = counsellingSession("guest-completed", {
    status: "completed",
    currentQuestionId: null,
  });
  const active = counsellingSession("guest-active");
  sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(completed));
  sessionStorage.setItem(COMPLETED_COUNSELLING_STORAGE_KEY, JSON.stringify(completed));
  sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(active));

  assert.equal(JSON.parse(sessionStorage.getItem(COUNSELLING_STORAGE_KEY)).id, "guest-active");
  assert.equal(
    JSON.parse(sessionStorage.getItem(COMPLETED_COUNSELLING_STORAGE_KEY)).id,
    "guest-completed",
  );
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

test("obsolete empty Guided Explorer snapshots are discarded when local state matches the authoritative session", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);

  const stale = counsellingSession("guided-stale");
  const server = counsellingSession("guided-current", {
    status: "paused",
    answers: [
      counsellingAnswer(
        "server-answer",
        "Saved answer",
        "2026-03-01T10:00:00.002Z",
      ),
    ],
    updatedAt: "2026-03-01T10:00:00.002Z",
    persistedUpdatedAt: "2026-03-01T10:00:00.002Z",
  });
  sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(server));
  saveAccountMutationQueue(101, [
    {
      id: "guided-stale-1",
      userId: 101,
      mutation: { type: "progress.counsellingSession", value: stale },
      createdAt: 1,
    },
    {
      id: "guided-stale-2",
      userId: 101,
      mutation: { type: "progress.counsellingSession", value: stale },
      createdAt: 2,
    },
    {
      id: "unrelated-stage",
      userId: 101,
      mutation: { type: "progress.educationStage", value: "class-12" },
      createdAt: 3,
    },
  ]);

  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    if (body.type === "progress.counsellingSession") {
      return {
        ok: false,
        status: 409,
        json: async () => ({
          error: "Guided Explorer progress changed elsewhere.",
          data: { counsellingSession: server },
        }),
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  assert.equal(await flushAccountMutations(), true);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].value.id, "guided-stale");
  assert.equal(requests[1].type, "progress.educationStage");
  assert.equal(hasPendingAccountMutations(101), false);
  assert.deepEqual(
    JSON.parse(sessionStorage.getItem(COUNSELLING_STORAGE_KEY)),
    server,
  );
});

test("a newer local Guided Explorer answer is rebased onto a different authoritative session ID", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);

  const stale = counsellingSession("guided-stale");
  const persistedAt = "2026-03-01T10:00:00.002Z";
  const server = counsellingSession("guided-current", {
    status: "paused",
    answers: [
      counsellingAnswer("shared-answer", "Server answer", persistedAt),
    ],
    updatedAt: persistedAt,
    persistedUpdatedAt: persistedAt,
  });
  const local = {
    ...server,
    status: "completed",
    completionReason: "finished_early",
    currentQuestionId: null,
    questionPath: ["Q001", "Q002"],
    pathIndex: 1,
    skippedQuestionIds: ["Q002"],
    answers: [
      counsellingAnswer(
        "shared-answer-local",
        "New local answer",
        persistedAt,
        "2026-03-01T10:00:00.003Z",
      ),
    ],
    updatedAt: "2026-03-01T10:00:00.003Z",
  };
  sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(local));
  saveAccountMutationQueue(101, [{
    id: "guided-stale-1",
    userId: 101,
    mutation: { type: "progress.counsellingSession", value: stale },
    createdAt: 1,
  }]);

  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    if (requests.length === 1) {
      return {
        ok: false,
        status: 409,
        json: async () => ({
          error: "Guided Explorer progress changed elsewhere.",
          data: { counsellingSession: server },
        }),
      };
    }

    assert.equal(body.expectedUserId, 101);
    assert.equal(body.value.id, "guided-current");
    assert.equal(body.value.persistedUpdatedAt, persistedAt);
    assert.equal(body.value.status, "completed");
    assert.equal(body.value.currentQuestionId, null);
    assert.deepEqual(body.value.questionPath, ["Q001", "Q002"]);
    assert.deepEqual(body.value.skippedQuestionIds, ["Q002"]);
    assert.equal(body.value.answers[0].originalText, "New local answer");
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
  assert.equal(requests.length, 2);
  assert.equal(requests[0].value.id, "guided-stale");
  assert.equal(requests[1].value.id, "guided-current");
  assert.equal(hasPendingAccountMutations(101), false);
  assert.equal(
    JSON.parse(sessionStorage.getItem(COUNSELLING_STORAGE_KEY)).answers[0].originalText,
    "New local answer",
  );
});

test("successful persistence updates its version without replacing newer local Guided session state", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);

  const persistedAt = "2026-03-01T10:00:00.001Z";
  const queued = counsellingSession("guided-local-state", {
    persistedUpdatedAt: persistedAt,
  });
  const local = counsellingSession("guided-local-state", {
    status: "completed",
    completionReason: "finished_early",
    currentQuestionId: null,
    questionPath: ["Q001", "Q002"],
    pathIndex: 1,
    skippedQuestionIds: ["Q002"],
    updatedAt: "2026-03-01T10:00:00.003Z",
    persistedUpdatedAt: persistedAt,
  });
  sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(local));
  saveAccountMutationQueue(101, [{
    id: "guided-local-state-1",
    userId: 101,
    mutation: { type: "progress.counsellingSession", value: queued },
    createdAt: 1,
  }]);

  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          counsellingSession: {
            ...body.value,
            updatedAt: "2026-03-01T10:00:00.002Z",
            persistedUpdatedAt: "2026-03-01T10:00:00.002Z",
          },
        },
      }),
    };
  };

  assert.equal(await flushAccountMutations(), true);
  const rebased = JSON.parse(sessionStorage.getItem(COUNSELLING_STORAGE_KEY));
  assert.equal(rebased.status, "completed");
  assert.equal(rebased.completionReason, "finished_early");
  assert.deepEqual(rebased.questionPath, ["Q001", "Q002"]);
  assert.deepEqual(rebased.skippedQuestionIds, ["Q002"]);
  assert.equal(rebased.persistedUpdatedAt, "2026-03-01T10:00:00.002Z");
});

test("legacy Guided Explorer snapshots are quarantined without blocking a completed operation session", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);

  const oldSessionId = "1a7df401-4c86-4ff1-9a06-8d5bfa323f73";
  const currentSessionId = "e08b1e19-bb3f-40b2-9a3b-d3559eaf0504";
  const firstLegacy = counsellingSession(oldSessionId, {
    answers: [
      counsellingAnswer(
        "stale-answer",
        "Unsynced answer",
        "2026-03-01T10:00:00.001Z",
      ),
    ],
  });
  const secondLegacy = {
    ...firstLegacy,
    status: "completed",
    currentQuestionId: null,
    updatedAt: "2026-03-01T10:00:00.002Z",
  };
  const current = counsellingSession(currentSessionId, {
    status: "completed",
    currentQuestionId: null,
    answers: [
      counsellingAnswer(
        "current-answer",
        "Current completed answer",
        "2026-03-01T10:00:00.003Z",
      ),
    ],
    updatedAt: "2026-03-01T10:00:00.003Z",
    persistedUpdatedAt: "2026-03-01T10:00:00.003Z",
    persistedRevision: 3,
  });
  const legacyItems = [
    {
      id: "1795082397441-47hq27",
      userId: 101,
      mutation: { type: "progress.counsellingSession", value: firstLegacy },
      createdAt: 1,
    },
    {
      id: "legacy-completed-snapshot",
      userId: 101,
      mutation: { type: "progress.counsellingSession", value: secondLegacy },
      createdAt: 2,
    },
  ];
  sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(current));
  saveAccountMutationQueue(101, [
    ...legacyItems,
    {
      id: "current-operation",
      userId: 101,
      mutation: {
        type: "progress.counsellingOperation",
        operation: {
          operationId: "current-operation-id",
          baseRevision: 3,
          session: current,
        },
      },
      createdAt: 3,
    },
  ]);
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    if (body.type === "progress.counsellingSession") {
      return {
        ok: false,
        status: 409,
        json: async () => ({
          error: "Guided Explorer progress changed elsewhere.",
          data: { counsellingSession: current },
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          counsellingSession: {
            ...current,
            persistedUpdatedAt: "2026-03-01T10:00:00.004Z",
            persistedRevision: 4,
          },
        },
      }),
    };
  };

  assert.equal(await flushAccountMutations(), true);
  assert.deepEqual(requests.map((request) => request.type), [
    "progress.counsellingSession",
    "progress.counsellingOperation",
  ]);
  assert.equal(hasPendingAccountMutations(101), false);
  assert.deepEqual(
    JSON.parse(sessionStorage.getItem(getAccountMutationConflictKey(101))),
    legacyItems,
  );
  assert.equal(sessionStorage.getItem(getAccountMutationConflictKey(202)), null);
  assert.equal(await flushAccountMutations(), true);
  assert.equal(requests.length, 2);
  assert.deepEqual(
    JSON.parse(sessionStorage.getItem(COUNSELLING_STORAGE_KEY)),
    {
      ...current,
      persistedUpdatedAt: "2026-03-01T10:00:00.004Z",
      persistedRevision: 4,
    },
  );
});

test("completed obsolete sessions are archived without replacing the authoritative session", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);

  const server = counsellingSession("guided-current", {
    answers: [
      counsellingAnswer(
        "current-answer",
        "Current answer",
        "2026-03-01T10:00:00.010Z",
      ),
    ],
    updatedAt: "2026-03-01T10:00:00.010Z",
    persistedUpdatedAt: "2026-03-01T10:00:00.010Z",
  });
  const completedSession = (id, answerId, originalText, updatedAt) =>
    counsellingSession(id, {
      status: "completed",
      currentQuestionId: null,
      answers: [
        counsellingAnswer(answerId, originalText, updatedAt),
      ],
      updatedAt,
    });
  const firstActive = counsellingSession("guided-old-a", {
    answers: [
      counsellingAnswer("old-a-answer", "Old A answer", "2026-03-01T10:00:00.001Z"),
    ],
    updatedAt: "2026-03-01T10:00:00.001Z",
  });
  const firstCompleted = completedSession(
    "guided-old-a",
    "old-a-answer",
    "Old A answer",
    "2026-03-01T10:00:00.002Z",
  );
  const secondActive = counsellingSession("guided-old-b", {
    answers: [
      counsellingAnswer("old-b-answer", "Old B answer", "2026-03-01T10:00:00.003Z"),
    ],
    updatedAt: "2026-03-01T10:00:00.003Z",
  });
  const secondCompleted = completedSession(
    "guided-old-b",
    "old-b-answer",
    "Old B answer",
    "2026-03-01T10:00:00.004Z",
  );
  sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(server));
  saveAccountMutationQueue(101, [
    { id: "old-a-active", userId: 101, mutation: { type: "progress.counsellingSession", value: firstActive }, createdAt: 1 },
    { id: "old-a-completed", userId: 101, mutation: { type: "progress.counsellingSession", value: firstCompleted }, createdAt: 2 },
    { id: "old-b-active", userId: 101, mutation: { type: "progress.counsellingSession", value: secondActive }, createdAt: 3 },
    { id: "old-b-completed", userId: 101, mutation: { type: "progress.counsellingSession", value: secondCompleted }, createdAt: 4 },
  ]);

  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    if (requests.length === 1) {
      return {
        ok: false,
        status: 409,
        json: async () => ({
          error: "Guided Explorer progress changed elsewhere.",
          data: { counsellingSession: server },
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          counsellingSession: {
            ...body.value,
            updatedAt: `2026-03-01T10:00:00.00${requests.length + 4}Z`,
            persistedUpdatedAt: `2026-03-01T10:00:00.00${requests.length + 4}Z`,
          },
        },
      }),
    };
  };

  assert.equal(await flushAccountMutations(), true);
  assert.deepEqual(requests.map(({ value }) => value.id), [
    "guided-old-a",
    "guided-old-a",
    "guided-old-b",
  ]);
  assert.equal(requests[1].value.status, "completed");
  assert.equal(requests[1].value.answers[0].originalText, "Old A answer");
  assert.equal(requests[2].value.status, "completed");
  assert.equal(requests[2].value.answers[0].originalText, "Old B answer");
  assert.equal(hasPendingAccountMutations(101), false);
  assert.deepEqual(
    JSON.parse(sessionStorage.getItem(COUNSELLING_STORAGE_KEY)),
    server,
  );
});

test("a same-ID conflict does not replace a different newer local Guided session", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);

  const stale = counsellingSession("guided-old-current", {
    persistedUpdatedAt: "2026-03-01T10:00:00.001Z",
  });
  const server = counsellingSession("guided-old-current", {
    updatedAt: "2026-03-01T10:00:00.002Z",
    persistedUpdatedAt: "2026-03-01T10:00:00.002Z",
  });
  const local = counsellingSession("guided-new-local", {
    answers: [
      counsellingAnswer(
        "new-local-answer",
        "Keep this newer answer",
        "2026-03-01T10:00:00.003Z",
      ),
    ],
    updatedAt: "2026-03-01T10:00:00.003Z",
  });
  sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(local));
  saveAccountMutationQueue(101, [{
    id: "guided-old-current-1",
    userId: 101,
    mutation: { type: "progress.counsellingSession", value: stale },
    createdAt: 1,
  }]);
  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    json: async () => ({
      error: "Guided Explorer progress changed elsewhere.",
      data: { counsellingSession: server },
    }),
  });

  assert.equal(await flushAccountMutations(), false);
  assert.equal(hasPendingAccountMutations(101), true);
  assert.deepEqual(
    JSON.parse(sessionStorage.getItem(COUNSELLING_STORAGE_KEY)),
    local,
  );
});

test("different-ID Guided Explorer conflicts stop after one recovery and retain local answers", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);

  const stale = counsellingSession("guided-stale");
  const server = counsellingSession("guided-current", {
    status: "paused",
    answers: [
      counsellingAnswer(
        "server-answer",
        "Server answer",
        "2026-03-01T10:00:00.002Z",
      ),
    ],
    updatedAt: "2026-03-01T10:00:00.002Z",
    persistedUpdatedAt: "2026-03-01T10:00:00.002Z",
  });
  const local = {
    ...server,
    answers: [
      counsellingAnswer(
        "local-answer",
        "Latest local answer",
        "2026-03-01T10:00:00.003Z",
        "2026-03-01T10:00:00.003Z",
      ),
    ],
    updatedAt: "2026-03-01T10:00:00.003Z",
  };
  sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(local));
  saveAccountMutationQueue(101, [{
    id: "guided-stale-1",
    userId: 101,
    mutation: { type: "progress.counsellingSession", value: stale },
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
            ...server,
            updatedAt: `2026-03-01T10:00:00.00${requestCount + 2}Z`,
            persistedUpdatedAt: `2026-03-01T10:00:00.00${requestCount + 2}Z`,
          },
        },
      }),
    };
  };

  assert.equal(await flushAccountMutations(), false);
  assert.equal(requestCount, 2);
  assert.equal(hasPendingAccountMutations(101), true);
  assert.equal(
    JSON.parse(sessionStorage.getItem(COUNSELLING_STORAGE_KEY)).answers[0].originalText,
    "Latest local answer",
  );
});

test("a different-ID conflict received after account switching cannot mutate the new account", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);

  const stale = counsellingSession("account-a-stale");
  const server = counsellingSession("account-a-current");
  const accountBSession = counsellingSession("account-b-current");
  sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(stale));
  saveAccountMutationQueue(101, [{
    id: "account-a-stale-1",
    userId: 101,
    mutation: { type: "progress.counsellingSession", value: stale },
    createdAt: 1,
  }]);

  globalThis.fetch = async () => {
    hydrateAccountCache(emptyData(), 202);
    setAccountMode(true, 202);
    sessionStorage.setItem(
      COUNSELLING_STORAGE_KEY,
      JSON.stringify(accountBSession),
    );
    return {
      ok: false,
      status: 409,
      json: async () => ({
        error: "Guided Explorer progress changed elsewhere.",
        data: { counsellingSession: server },
      }),
    };
  };

  assert.equal(await flushAccountMutations(101), false);
  assert.equal(hasPendingAccountMutations(101), true);
  assert.equal(hasPendingAccountMutations(202), false);
  assert.deepEqual(
    JSON.parse(sessionStorage.getItem(COUNSELLING_STORAGE_KEY)),
    accountBSession,
  );
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

test("Guided Explorer operation retries the same ID after a 503 and receives the persisted revision", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);
  const session = counsellingSession("guided-operation");
  sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(session));
  const operationId = "operation-retry";
  saveAccountMutationQueue(101, [{
    id: "queue-operation-retry",
    userId: 101,
    createdAt: 1,
    mutation: {
      type: "progress.counsellingOperation",
      operation: { operationId, baseRevision: null, session },
    },
  }]);

  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls += 1;
    assert.equal(JSON.parse(options.body).operation.operationId, operationId);
    if (calls === 1) {
      return { ok: false, status: 503, json: async () => ({ error: "Unavailable" }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          counsellingSession: {
            ...session,
            persistedUpdatedAt: "2026-03-01T10:00:00.002Z",
            persistedRevision: 1,
          },
        },
      }),
    };
  };

  assert.equal(await flushAccountMutations(), false);
  assert.equal(hasPendingAccountMutations(101), true);
  assert.equal(await flushAccountMutations(), true);
  assert.equal(calls, 2);
  assert.equal(hasPendingAccountMutations(101), false);
  assert.equal(
    JSON.parse(sessionStorage.getItem(COUNSELLING_STORAGE_KEY)).persistedRevision,
    1,
  );
});

test("queued malformed Guided Explorer operations repair their path before retrying", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);
  const createdAt = "2026-11-19T12:30:50.000Z";
  const broken = counsellingSession("15328863-18fe-48d9-aa40-475bd8463579", {
    currentQuestionId: null,
    questionPath: ["Q001", "Q002"],
    pathIndex: 1,
    askedQuestionIds: ["Q001", "T01", "Q005", "B01", "Q002"],
    answers: [
      counsellingAnswer("answer-Q001", "", createdAt),
      { ...counsellingAnswer("answer-T01", "", createdAt), questionId: "T01", optionIds: ["creating-digital-things"] },
      { ...counsellingAnswer("answer-Q005", "", createdAt), questionId: "Q005", optionIds: ["business-or-money"] },
      { ...counsellingAnswer("answer-B01", "", createdAt), questionId: "B01", optionIds: ["understanding-money-and-budgets"] },
      { ...counsellingAnswer("answer-Q002", "", createdAt), questionId: "Q002", optionIds: ["creating-something"] },
    ],
    persistedRevision: 19,
  });
  saveAccountMutationQueue(101, [{
    id: "queued-422-operation",
    userId: 101,
    createdAt: 1,
    mutation: {
      type: "progress.counsellingOperation",
      operation: {
        operationId: "973d8d8e-9e85-48df-bd05-b1cf8016bd33",
        baseRevision: 19,
        session: broken,
      },
    },
  }]);
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.operation.operationId, "973d8d8e-9e85-48df-bd05-b1cf8016bd33");
    assert.equal(body.operation.baseRevision, 19);
    assert.deepEqual(body.operation.session.questionPath, ["Q001", "T01", "Q005", "B01", "Q002"]);
    assert.deepEqual(body.operation.session.answers.map(({ questionId }) => questionId), ["Q001", "T01", "Q005", "B01", "Q002"]);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          counsellingSession: {
            ...body.operation.session,
            persistedUpdatedAt: "2026-11-19T12:30:53.000Z",
            persistedRevision: 20,
          },
        },
      }),
    };
  };

  assert.equal(await flushAccountMutations(), true);
  assert.equal(hasPendingAccountMutations(101), false);
});

test("typed Guided Explorer conflicts do not block later account saves", async () => {
  reset();
  hydrateAccountCache(emptyData(), 101);
  setAccountMode(true, 101);
  const session = counsellingSession("guided-conflict-operation", { persistedRevision: 1 });
  saveAccountMutationQueue(101, [
    {
      id: "queue-guided-conflict",
      userId: 101,
      createdAt: 1,
      mutation: {
        type: "progress.counsellingOperation",
        operation: { operationId: "operation-conflict", baseRevision: 1, session },
      },
    },
    {
      id: "queue-stage-after-conflict",
      userId: 101,
      createdAt: 2,
      mutation: { type: "progress.educationStage", value: "class-12" },
    },
  ]);

  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls += 1;
    const body = JSON.parse(options.body);
    if (calls === 1) {
      return {
        ok: false,
        status: 409,
        json: async () => ({
          error: "Changed elsewhere",
          conflict: {
            type: "guided-explorer",
            code: "stale_revision",
            operationId: body.operation.operationId,
            authoritativeSession: { ...session, persistedRevision: 2 },
          },
        }),
      };
    }
    return { ok: true, status: 200, json: async () => ({ data: {} }) };
  };

  assert.equal(await flushAccountMutations(), true);
  assert.equal(calls, 2);
  assert.equal(hasPendingAccountMutations(101), false);
});
