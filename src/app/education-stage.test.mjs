import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test, { after } from "node:test";

const loadModule = createRequire(import.meta.url);
const React = loadModule("react");
const originalUseSyncExternalStore = React.useSyncExternalStore;
React.useSyncExternalStore = (_subscribe, getSnapshot) => getSnapshot();

const ts = loadModule("typescript");
loadModule.extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8");
  const output = ts.transpile(source, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

const { setAccountMode } = loadModule("./account-data-sync.ts");
const { saveEducationStage, useEducationStage } = loadModule("./education-stage.ts");
function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}
const localStorage = createStorage();
const sessionStorage = createStorage();

globalThis.window = {
  localStorage,
  sessionStorage,
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
};
setAccountMode(false);

after(() => {
  React.useSyncExternalStore = originalUseSyncExternalStore;
});

test("education stage persists independently and migrates a saved legacy stage", () => {
  assert.deepEqual(useEducationStage(), { status: "empty" });
  assert.equal(saveEducationStage("class-12"), true);
  assert.deepEqual(useEducationStage(), {
    status: "saved",
    stage: "class-12",
  });
  assert.equal(sessionStorage.getItem("careerbridge:education-stage:v1"), "class-12");

  sessionStorage.removeItem("careerbridge:education-stage:v1");
  localStorage.removeItem("careerbridge:education-stage:v1");
  sessionStorage.setItem(
    "careerbridge:type-1-discovery:v1",
    JSON.stringify({ classContext: "class-10", activityIds: [] }),
  );
  assert.deepEqual(useEducationStage(), {
    status: "saved",
    stage: "class-10",
  });
  assert.equal(sessionStorage.getItem("careerbridge:education-stage:v1"), "class-10");
});
