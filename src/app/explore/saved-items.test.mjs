import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { after } from "node:test";

const loadModule = createRequire(import.meta.url);
const React = loadModule("react");
const originalUseSyncExternalStore = React.useSyncExternalStore;
React.useSyncExternalStore = (_subscribe, getSnapshot) => getSnapshot();

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

const storageKey = "careerbridge:saved-items:v1";
const values = new Map();
const sessionValues = new Map();
const localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};
const sessionStorage = {
  getItem: (key) => sessionValues.get(key) ?? null,
  setItem: (key, value) => sessionValues.set(key, String(value)),
  removeItem: (key) => sessionValues.delete(key),
};

globalThis.window = {
  localStorage,
  sessionStorage,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
};
loadModule("../account-data-sync.ts").setAccountMode(false);

const {
  addSavedItem,
  removeSavedItem,
  savedItemKey,
  useSavedItems,
} = loadModule("./saved-items.ts");

after(() => {
  React.useSyncExternalStore = originalUseSyncExternalStore;
});

test("saved items deduplicate, keep course offerings distinct, and support undo", () => {
  assert.deepEqual(useSavedItems(), { status: "saved", items: [] });

  const field = { type: "field", id: "technology", savedAt: 1 };
  assert.equal(addSavedItem(field), true);
  assert.equal(addSavedItem({ ...field, savedAt: 2 }), true);
  assert.equal(useSavedItems().items.length, 1);

  const firstOffering = {
    type: "institution-offering",
    id: "kohima-college",
    context: { courseId: "bca" },
    savedAt: 3,
  };
  const secondOffering = {
    ...firstOffering,
    context: { courseId: "bsc-computer-science" },
  };
  assert.notEqual(savedItemKey(firstOffering), savedItemKey(secondOffering));
  assert.notEqual(
    savedItemKey(firstOffering),
    savedItemKey({ type: "institution", id: firstOffering.id }),
  );
  assert.equal(addSavedItem(firstOffering), true);
  assert.equal(addSavedItem(secondOffering), true);

  assert.equal(removeSavedItem(field), true);
  assert.equal(addSavedItem(field), true);
  assert.notEqual(sessionStorage.getItem(storageKey), null);
  assert.equal(localStorage.getItem(storageKey), null);
  assert.deepEqual(
    useSavedItems().items.find((item) => item.type === "field"),
    field,
  );
});

test("invalid saved data is preserved and cannot be overwritten", () => {
  const invalid = "{not valid saved data";
  sessionStorage.removeItem(storageKey);
  localStorage.setItem(storageKey, invalid);

  assert.deepEqual(useSavedItems(), { status: "invalid" });
  assert.equal(addSavedItem({ type: "course", id: "bca" }), false);
  assert.equal(localStorage.getItem(storageKey), invalid);
});

test("inaccessible session storage is reported as unavailable", () => {
  window.sessionStorage = {
    getItem() {
      throw new Error("storage blocked");
    },
    setItem() {},
  };
  assert.deepEqual(useSavedItems(), { status: "unavailable" });
  window.sessionStorage = sessionStorage;
});
