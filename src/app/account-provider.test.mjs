import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { after } from "node:test";

const loadModule = createRequire(import.meta.url);
const Module = loadModule("node:module");
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
loadModule.extensions[".tsx"] = (module, filename) => {
  const { readFileSync } = loadModule("node:fs");
  const output = ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

let activeHarness;
let clerkUserId = null;
let signOutCalls = 0;
const hooks = {
  createContext: (value) => ({ defaultValue: value, Provider: "AccountContext.Provider" }),
  useState(initial) {
    const index = activeHarness.cursor++;
    if (!activeHarness.slots[index]) {
      activeHarness.slots[index] = {
        kind: "state",
        value: typeof initial === "function" ? initial() : initial,
      };
    }
    const slot = activeHarness.slots[index];
    return [
      slot.value,
      (next) => {
        slot.value = typeof next === "function" ? next(slot.value) : next;
      },
    ];
  },
  useRef(initial) {
    const index = activeHarness.cursor++;
    if (!activeHarness.slots[index]) {
      activeHarness.slots[index] = { kind: "ref", value: { current: initial } };
    }
    return activeHarness.slots[index].value;
  },
  useMemo(factory, dependencies) {
    const index = activeHarness.cursor++;
    const prior = activeHarness.slots[index];
    if (!prior || !sameDependencies(prior.dependencies, dependencies)) {
      activeHarness.slots[index] = {
        kind: "memo",
        dependencies,
        value: factory(),
      };
    }
    return activeHarness.slots[index].value;
  },
  useCallback(callback, dependencies) {
    const index = activeHarness.cursor++;
    const prior = activeHarness.slots[index];
    if (!prior || !sameDependencies(prior.dependencies, dependencies)) {
      activeHarness.slots[index] = {
        kind: "memo",
        dependencies,
        value: callback,
      };
    }
    return activeHarness.slots[index].value;
  },
  useEffect(effect, dependencies) {
    const index = activeHarness.cursor++;
    const prior = activeHarness.slots[index];
    if (!prior || !sameDependencies(prior.dependencies, dependencies)) {
      activeHarness.slots[index] = { kind: "effect", dependencies };
      activeHarness.effects.push(effect);
    }
  },
  useLayoutEffect(effect, dependencies) {
    const index = activeHarness.cursor++;
    const prior = activeHarness.slots[index];
    if (!prior || !sameDependencies(prior.dependencies, dependencies)) {
      activeHarness.slots[index] = { kind: "layout-effect", dependencies };
      activeHarness.layoutEffects.push(effect);
    }
  },
  useContext(context) {
    return context.defaultValue;
  },
  useSyncExternalStore(_subscribe, getSnapshot) {
    return getSnapshot();
  },
};

function sameDependencies(left, right) {
  return left && right && left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]));
}

const jsxRuntime = {
  Fragment: "Fragment",
  jsx: (type, props) => ({ type, props: props ?? {} }),
  jsxs: (type, props) => ({ type, props: props ?? {} }),
};

const testState = {
  dataForUser: () => emptyData(),
  pendingAccountData: null,
  failNextAccountData: false,
  requests: [],
  transfers: [],
};
const clerkSignOut = async () => {
  signOutCalls += 1;
  clerkUserId = null;
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "react") return hooks;
  if (request === "react/jsx-runtime") return jsxRuntime;
  if (request === "@clerk/nextjs") {
    return {
      useAuth: () => ({ isLoaded: true, userId: clerkUserId }),
      useClerk: () => ({ signOut: clerkSignOut }),
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { AccountProvider } = loadModule("./account-provider.tsx");
Module._load = originalLoad;

const actualReact = loadModule("react");
const originalUseSyncExternalStore = actualReact.useSyncExternalStore;
actualReact.useSyncExternalStore = (_subscribe, getSnapshot) => getSnapshot();
const sync = loadModule("./account-data-sync.ts");
const { DISCOVERY_STORAGE_KEY, EDUCATION_STAGE_STORAGE_KEY } = loadModule("./personal-data-storage-keys.ts");
const { saveEducationStage, useEducationStage } = loadModule("./education-stage.ts");
const { saveAnswers, useStoredDiscoveryAnswers } = loadModule("./discover/flow-data.ts");

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
}

let sessionStorage;
let localStorage;
let windowListeners;
let personalDataReadyListeners;
let accountSyncListeners;
let renderingProvider = false;
let personalDataReadyDuringRender;
let personalDataReadyCount;

class TestBroadcastChannel {
  postMessage() {}
  close() {}
}

function setupBrowser() {
  sessionStorage = createStorage();
  localStorage = createStorage();
  windowListeners = new Map();
  personalDataReadyListeners = new Set();
  accountSyncListeners = new Set();
  renderingProvider = false;
  personalDataReadyDuringRender = false;
  personalDataReadyCount = 0;
  globalThis.window = {
    sessionStorage,
    localStorage,
    location: { pathname: "/discover", search: "" },
    BroadcastChannel: TestBroadcastChannel,
    addEventListener(name, callback) {
      windowListeners.set(name, callback);
      if (name === sync.PERSONAL_DATA_READY_EVENT) {
        personalDataReadyListeners.add(callback);
      }
      if (name === sync.ACCOUNT_SYNC_EVENT) {
        accountSyncListeners.add(callback);
      }
    },
    removeEventListener(name) {
      windowListeners.delete(name);
      if (name === sync.PERSONAL_DATA_READY_EVENT) {
        personalDataReadyListeners.clear();
      }
      if (name === sync.ACCOUNT_SYNC_EVENT) {
        accountSyncListeners.clear();
      }
    },
    dispatchEvent(event) {
      if (event.type === sync.PERSONAL_DATA_READY_EVENT) {
        personalDataReadyCount += 1;
        if (renderingProvider) personalDataReadyDuringRender = true;
        for (const listener of personalDataReadyListeners) listener(event);
      }
      if (event.type === sync.ACCOUNT_SYNC_EVENT) {
        for (const listener of accountSyncListeners) listener(event);
      }
      return true;
    },
  };
  globalThis.BroadcastChannel = TestBroadcastChannel;
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

function accountSnapshot(stage, activityIds) {
  return {
    ...emptyData(),
    educationStage: stage,
    discoveryAnswers: activityIds ? { activityIds } : null,
  };
}

function response(status, value) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function reset() {
  setupBrowser();
  activeHarness = { cursor: 0, slots: [], effects: [], layoutEffects: [] };
  clerkUserId = null;
  signOutCalls = 0;
  testState.dataForUser = () => emptyData();
  testState.pendingAccountData = null;
  testState.failNextAccountData = false;
  testState.failNextPost = false;
  testState.overrideStage = null;
  testState.requests = [];
  testState.transfers = [];
  sync.clearPersonalDataCache();
  sync.clearGuestDataCache();
  sync.clearAccountMutationQueue(101);
  sync.clearAccountMutationQueue(202);
  sync.setAccountMode(false);
  globalThis.fetch = async (url, init = {}) => {
    const method = init.method ?? "GET";
    testState.requests.push({ url, method, body: init.body });
    if (url === "/api/auth/session") {
      const user = clerkUserId === null
        ? null
        : { id: clerkUserId === "clerk-a" ? 101 : 202, email: `${clerkUserId}@example.test`, name: "Test" };
      return response(200, { user });
    }
    if (url === "/api/account/data" && method === "GET") {
      if (testState.failNextAccountData) {
        testState.failNextAccountData = false;
        return response(503, { error: "Account data is unavailable." });
      }
      if (testState.pendingAccountData) {
        return new Promise((resolve) => {
          testState.pendingAccountData.resolve = resolve;
        });
      }
      const id = clerkUserId === "clerk-a" ? 101 : 202;
      const data = { ...testState.dataForUser(id) };
      if (testState.overrideStage) {
        data.educationStage = testState.overrideStage;
      }
      return response(200, { data });
    }
    if (url === "/api/account/data" && method === "POST") {
      const body = JSON.parse(init.body);
      testState.transfers.push(body);
      if (testState.failNextPost) {
        testState.failNextPost = false;
        return response(503, { error: "Failed to update account data." });
      }
      const activeId = clerkUserId === "clerk-a" ? 101 : 202;
      if (body.expectedUserId !== undefined && body.expectedUserId !== activeId) {
        return response(409, { error: "Account session changed. This change was not saved to this account." });
      }
      if (body.type === "progress.educationStage") {
        testState.overrideStage = body.value;
      }
      return response(200, { data: testState.transferResult ?? emptyData() });
    }
    throw new Error(`Unexpected fetch ${method} ${url}`);
  };
}

function render(harness, { deferLayoutEffects = false } = {}) {
  harness.cursor = 0;
  harness.effects = [];
  harness.layoutEffects = [];
  activeHarness = harness;
  renderingProvider = true;
  let tree;
  try {
    tree = AccountProvider({ children: { type: "test-child", props: {} } });
  } finally {
    activeHarness = null;
    renderingProvider = false;
  }
  if (!deferLayoutEffects) runLayoutEffects(harness);
  return tree;
}

function runLayoutEffects(harness) {
  const effects = harness.layoutEffects;
  harness.layoutEffects = [];
  for (const effect of effects) effect();
}

function runEffects(harness) {
  const effects = harness.effects;
  harness.effects = [];
  for (const effect of effects) effect();
}

function providerValue(harness) {
  return render(harness).props.value;
}

function findNode(node, predicate) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findNode(child, predicate);
      if (found) return found;
    }
    return null;
  }
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  return findNode(node.props?.children, predicate);
}

function textContent(node) {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join(" ");
  return textContent(node.props?.children);
}

function findButton(tree, label) {
  return findNode(tree, (node) =>
    node.type === "button" && textContent(node.props.children).includes(label),
  );
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail(`Timed out waiting for account provider state: ${JSON.stringify(testState.requests)}`);
}

function useDiscoverHooks() {
  return {
    stage: useEducationStage(),
    answers: useStoredDiscoveryAnswers(),
  };
}

test("account hydration hides guest values until the account snapshot is loaded", async () => {
  reset();
  clerkUserId = "clerk-a";
  sessionStorage.setItem(EDUCATION_STAGE_STORAGE_KEY, "class-10");
  sessionStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify({ activityIds: ["fixing"] }));
  testState.dataForUser = () => accountSnapshot("class-12", ["computers"]);
  testState.pendingAccountData = {};

  const harness = activeHarness;
  render(harness);
  runEffects(harness);
  await waitFor(() => testState.pendingAccountData.resolve !== undefined);
  assert.equal(providerValue(harness).status, "loading");
  assert.deepEqual(useDiscoverHooks(), {
    stage: { status: "loading" },
    answers: { status: "loading" },
  });

  testState.pendingAccountData.resolve(response(200, {
    data: accountSnapshot("class-12", ["computers"]),
  }));
  testState.pendingAccountData = null;
  await waitFor(() => sync.getAccountCacheUserId() === 101);

  assert.equal(providerValue(harness).status, "authenticated");
  assert.deepEqual(useDiscoverHooks(), {
    stage: { status: "saved", stage: "class-12" },
    answers: { status: "saved", answers: { activityIds: ["computers"] } },
  });
});

test("declining guest transfer leaves account data untouched and restores guest data on sign-out", async () => {
  reset();
  clerkUserId = "clerk-a";
  sessionStorage.setItem(EDUCATION_STAGE_STORAGE_KEY, "class-10");
  sessionStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify({ activityIds: ["fixing"] }));
  testState.dataForUser = () => accountSnapshot("class-12", ["computers"]);

  const harness = activeHarness;
  render(harness);
  runEffects(harness);
  await waitFor(() => sync.getAccountCacheUserId() === 101);

  const tree = render(harness);
  const modalText = textContent(findNode(tree, (node) => node.type === "dialog"));
  assert.match(modalText, /Class 10/);
  assert.match(modalText, /Fixing or building things/);
  assert.match(modalText, /Class 12/);
  assert.match(modalText, /Using computers or phones/);
  findButton(tree, "Don't transfer this session").props.onClick();
  await waitFor(() => findNode(render(harness), (node) => node.type === "dialog")?.props.children === null);

  assert.equal(testState.transfers.length, 0);
  assert.deepEqual(useDiscoverHooks(), {
    stage: { status: "saved", stage: "class-12" },
    answers: { status: "saved", answers: { activityIds: ["computers"] } },
  });
  assert.equal(await providerValue(harness).signOut(), true);
  assert.equal(signOutCalls, 1);
  assert.equal(sync.getAccountCacheUserId(), null);
  assert.deepEqual(useDiscoverHooks(), {
    stage: { status: "saved", stage: "class-10" },
    answers: { status: "saved", answers: { activityIds: ["fixing"] } },
  });
});

test("account switching locks the old cache and retries failed account hydration", async () => {
  reset();
  sync.hydrateAccountCache(accountSnapshot("class-10", ["fixing"]), 101);
  sync.setAccountMode(true);
  clerkUserId = "clerk-a";
  testState.dataForUser = (id) => id === 101
    ? accountSnapshot("class-10", ["fixing"])
    : accountSnapshot("class-12", ["computers"]);

  const harness = activeHarness;
  render(harness);
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "authenticated");
  assert.deepEqual(useDiscoverHooks(), {
    stage: { status: "saved", stage: "class-10" },
    answers: { status: "saved", answers: { activityIds: ["fixing"] } },
  });

  clerkUserId = "clerk-b";
  testState.failNextAccountData = true;
  render(harness);
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "unavailable");
  assert.deepEqual(useDiscoverHooks(), {
    stage: { status: "loading" },
    answers: { status: "loading" },
  });

  testState.failNextAccountData = false;
  await providerValue(harness).refresh();
  assert.equal(providerValue(harness).status, "authenticated");
  assert.equal(sync.getAccountCacheUserId(), 202);
  assert.deepEqual(useDiscoverHooks(), {
    stage: { status: "saved", stage: "class-12" },
    answers: { status: "saved", answers: { activityIds: ["computers"] } },
  });
});

test("Account A pending writes are preserved and NEVER sent under Account B session", async () => {
  reset();
  clerkUserId = "clerk-a";
  testState.dataForUser = (id) => id === 101
    ? accountSnapshot("class-10", ["fixing"])
    : accountSnapshot("class-12", ["computers"]);

  const harness = activeHarness;
  render(harness);
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "authenticated");

  // Account A makes a change, but network sync fails
  testState.failNextPost = true;
  assert.equal(saveAnswers({ activityIds: ["fixing", "helping"] }), true);
  await waitFor(() => sync.hasPendingAccountMutations(101));

  // Account A has pending writes
  assert.equal(sync.hasPendingAccountMutations(101), true);
  assert.equal(sync.hasPendingAccountMutations(202), false);
  testState.transfers = [];

  // Account B signs in
  clerkUserId = "clerk-b";
  render(harness);
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "authenticated");
  assert.equal(sync.getAccountCacheUserId(), 202);

  // Account A's pending writes MUST NOT be sent under Account B!
  assert.equal(testState.transfers.length, 0);
  assert.equal(sync.hasPendingAccountMutations(101), true);
  assert.equal(sync.hasPendingAccountMutations(202), false);

  // Account B performs a write
  assert.equal(saveEducationStage("class-12"), true);
  await waitFor(() => testState.transfers.length === 1);
  assert.deepEqual(testState.transfers[0], {
    type: "progress.educationStage",
    value: "class-12",
    expectedUserId: 202,
  });
  assert.equal(sync.hasPendingAccountMutations(202), false);

  // Account B signs out
  assert.equal(await providerValue(harness).signOut(), true);
  assert.equal(sync.getAccountCacheUserId(), null);

  // Account A signs back in
  clerkUserId = "clerk-a";
  render(harness);
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "authenticated");
  assert.equal(sync.getAccountCacheUserId(), 101);

  // Account A's pending writes are flushed under Account A's session
  await waitFor(() => !sync.hasPendingAccountMutations(101));
  const accountAPosts = testState.transfers.filter((t) => t.type === "progress.discoveryAnswers");
  assert.equal(accountAPosts.length, 1);
  assert.deepEqual(accountAPosts[0].value, { activityIds: ["fixing", "helping"] });
  assert.equal(accountAPosts[0].expectedUserId, 101);
});

test("Account A queued mutation reaching API while Account B is authenticated is rejected with 409 and preserved for recovery", async () => {
  reset();
  clerkUserId = "clerk-a";
  testState.dataForUser = (id) => id === 101
    ? accountSnapshot("class-10", ["fixing"])
    : accountSnapshot("class-12", ["computers"]);

  const harness = activeHarness;
  render(harness);
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "authenticated");

  // Account A enqueues a change while network is offline/slow
  testState.failNextPost = true;
  assert.equal(saveAnswers({ activityIds: ["fixing", "helping"] }), true);
  await waitFor(() => sync.hasPendingAccountMutations(101));
  assert.equal(sync.hasPendingAccountMutations(101), true);

  // Rapid switch to Account B
  clerkUserId = "clerk-b";
  render(harness);
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "authenticated");
  assert.equal(sync.getAccountCacheUserId(), 202);

  // Simulate an in-flight or delayed flush of Account A's mutation arriving while Account B is authenticated
  const rogueResponse = await globalThis.fetch("/api/account/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "progress.discoveryAnswers",
      value: { activityIds: ["fixing", "helping"] },
      expectedUserId: 101,
    }),
  });
  assert.equal(rogueResponse.status, 409);
  const rogueJson = await rogueResponse.json();
  assert.match(rogueJson.error, /Account session changed/);

  // Assert Account B was NOT modified
  assert.deepEqual(useDiscoverHooks().answers, {
    status: "saved",
    answers: { activityIds: ["computers"] },
  });
  // Assert Account A's queue remains intact in sessionStorage
  assert.equal(sync.hasPendingAccountMutations(101), true);

  // Account B signs out and Account A signs back in
  assert.equal(await providerValue(harness).signOut(), true);
  clerkUserId = "clerk-a";
  render(harness);
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "authenticated");
  assert.equal(sync.getAccountCacheUserId(), 101);

  // Account A's pending write is now safely synced
  await waitFor(() => !sync.hasPendingAccountMutations(101));
  assert.equal(sync.hasPendingAccountMutations(101), false);
});

test("failed writes do not overwrite browser snapshot on refresh or focus", async () => {
  reset();
  clerkUserId = "clerk-a";
  testState.dataForUser = () => accountSnapshot("class-10", ["fixing"]);

  const harness = activeHarness;
  render(harness);
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "authenticated");
  assert.deepEqual(useDiscoverHooks().stage, { status: "saved", stage: "class-10" });

  // Update locally to class-12, but sync fails
  testState.failNextPost = true;
  assert.equal(saveEducationStage("class-12"), true);
  await waitFor(() => sync.hasPendingAccountMutations(101));
  assert.deepEqual(useDiscoverHooks().stage, { status: "saved", stage: "class-12" });

  // Focus-triggered refresh occurs (mocking another tab switch / window focus)
  testState.failNextPost = true; // Still fails
  const onFocus = windowListeners.get("focus");
  assert.ok(typeof onFocus === "function");
  onFocus();
  await waitFor(() => providerValue(harness).syncError !== null);

  // Local data must NOT be overwritten with server's class-10!
  assert.deepEqual(useDiscoverHooks().stage, { status: "saved", stage: "class-12" });
  assert.equal(sync.hasPendingAccountMutations(101), true);

  // Page refresh simulation: harness is fresh, but sessionStorage retains state
  const reloadedHarness = { cursor: 0, slots: [], effects: [] };
  testState.failNextPost = true; // Server still fails
  render(reloadedHarness);
  runEffects(reloadedHarness);
  await waitFor(() => providerValue(reloadedHarness).status === "authenticated");

  // Still retains class-12 despite server returning class-10!
  assert.deepEqual(useDiscoverHooks().stage, { status: "saved", stage: "class-12" });

  // Retry sync recovers once network is healthy
  testState.failNextPost = false;
  providerValue(reloadedHarness).retrySync();
  await waitFor(() => !sync.hasPendingAccountMutations(101));
  assert.deepEqual(useDiscoverHooks().stage, { status: "saved", stage: "class-12" });
});

test("refresh preserves a specific queued mutation conflict instead of replacing it with the generic warning", async () => {
  reset();
  clerkUserId = "clerk-a";

  const harness = activeHarness;
  render(harness);
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "authenticated");

  const specificError = "This Guided Explorer update conflicts with a newer saved session.";
  const fetchWithoutConflict = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    if (url === "/api/account/data" && init.method === "POST") {
      return response(409, { error: specificError });
    }
    return fetchWithoutConflict(url, init);
  };
  sync.saveAccountMutationQueue(101, [{
    id: "specific-conflict",
    userId: 101,
    mutation: { type: "progress.educationStage", value: "class-12" },
    createdAt: 1,
  }]);

  await providerValue(harness).refresh();

  assert.equal(providerValue(harness).syncError, specificError);
  assert.equal(sync.hasPendingAccountMutations(101), true);
});

test("synchronous identity isolation prevents rendering previous account data during transition and rejects stale clicks", async () => {
  reset();
  clerkUserId = "clerk-a";
  testState.dataForUser = (id) => id === 101
    ? accountSnapshot("class-10", ["fixing"])
    : accountSnapshot("class-12", ["computers"]);

  const harness = activeHarness;
  render(harness);
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "authenticated");
  assert.deepEqual(useDiscoverHooks(), {
    stage: { status: "saved", stage: "class-10" },
    answers: { status: "saved", answers: { activityIds: ["fixing"] } },
  });

  // Identity switches to clerk-b
  clerkUserId = "clerk-b";
  // The provider masks the identity during render, then locks stores in layout.
  const transitionTree = render(harness, { deferLayoutEffects: true });

  assert.equal(transitionTree.props.value.status, "loading");
  assert.equal(transitionTree.props.value.user, null);
  assert.equal(personalDataReadyDuringRender, false);
  runLayoutEffects(harness);
  assert.equal(sync.isPersonalDataReady(), false);
  assert.equal(personalDataReadyDuringRender, false);
  assert.deepEqual(useDiscoverHooks(), {
    stage: { status: "loading" },
    answers: { status: "loading" },
  });

  // Stale interaction during transition must be rejected immediately
  assert.equal(saveAnswers({ activityIds: ["outdoors"] }), false);
  assert.equal(saveEducationStage("class-12"), false);
  assert.equal(sync.hasPendingAccountMutations(202), false);

  // Now run effects to allow Account B hydration to complete
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "authenticated");
  assert.equal(sync.getAccountCacheUserId(), 202);
  assert.deepEqual(useDiscoverHooks(), {
    stage: { status: "saved", stage: "class-12" },
    answers: { status: "saved", answers: { activityIds: ["computers"] } },
  });
});

test("Account A refresh completing after an A-to-B transition cannot restore A data", async () => {
  reset();
  clerkUserId = "clerk-a";
  testState.dataForUser = (id) => id === 101
    ? accountSnapshot("class-10", ["fixing"])
    : accountSnapshot("class-12", ["computers"]);

  const harness = activeHarness;
  render(harness);
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "authenticated");

  testState.pendingAccountData = {};
  const staleRefresh = providerValue(harness).refresh();
  await waitFor(() => testState.pendingAccountData.resolve !== undefined);

  let subscriberUpdates = 0;
  window.addEventListener(sync.PERSONAL_DATA_READY_EVENT, () => {
    subscriberUpdates += 1;
    assert.equal(renderingProvider, false);
    if (subscriberUpdates === 1) assert.equal(sync.isPersonalDataReady(), false);
  });
  const eventsBeforeTransition = personalDataReadyCount;
  clerkUserId = "clerk-b";
  const transitionTree = render(harness, { deferLayoutEffects: true });

  assert.equal(transitionTree.props.value.status, "loading");
  assert.equal(transitionTree.props.value.user, null);
  assert.equal(personalDataReadyCount, eventsBeforeTransition);
  assert.equal(personalDataReadyDuringRender, false);

  runLayoutEffects(harness);
  assert.equal(personalDataReadyCount, eventsBeforeTransition + 1);
  assert.equal(subscriberUpdates, 1);
  assert.deepEqual(useDiscoverHooks(), {
    stage: { status: "loading" },
    answers: { status: "loading" },
  });

  const resolveStaleAccountData = testState.pendingAccountData.resolve;
  testState.pendingAccountData = null;
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "authenticated");
  assert.equal(sync.getAccountCacheUserId(), 202);

  resolveStaleAccountData(response(200, {
    data: accountSnapshot("class-10", ["fixing"]),
  }));
  await staleRefresh;
  assert.deepEqual(useDiscoverHooks(), {
    stage: { status: "saved", stage: "class-12" },
    answers: { status: "saved", answers: { activityIds: ["computers"] } },
  });
});

test("guest-to-account transition locks guest data and notifies subscribers after render", async () => {
  reset();
  clerkUserId = null;
  const harness = activeHarness;
  render(harness);
  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "guest");

  saveEducationStage("class-10");
  assert.deepEqual(useEducationStage(), { status: "saved", stage: "class-10" });
  let subscriberUpdates = 0;
  window.addEventListener(sync.PERSONAL_DATA_READY_EVENT, () => {
    subscriberUpdates += 1;
    assert.equal(renderingProvider, false);
    if (subscriberUpdates === 1) assert.equal(sync.isPersonalDataReady(), false);
  });
  const eventsBeforeTransition = personalDataReadyCount;

  clerkUserId = "clerk-a";
  const transitionTree = render(harness, { deferLayoutEffects: true });
  assert.equal(transitionTree.props.value.status, "loading");
  assert.equal(transitionTree.props.value.user, null);
  assert.equal(personalDataReadyCount, eventsBeforeTransition);
  assert.equal(personalDataReadyDuringRender, false);

  runLayoutEffects(harness);
  assert.equal(personalDataReadyCount, eventsBeforeTransition + 1);
  assert.equal(subscriberUpdates, 1);
  assert.deepEqual(useEducationStage(), { status: "loading" });

  runEffects(harness);
  await waitFor(() => providerValue(harness).status === "authenticated");
  assert.equal(sync.getAccountCacheUserId(), 101);
});

after(() => {
  Module._load = originalLoad;
  actualReact.useSyncExternalStore = originalUseSyncExternalStore;
});
