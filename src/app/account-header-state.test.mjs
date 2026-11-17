import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const loadModule = createRequire(import.meta.url);
const ts = loadModule("typescript");
loadModule.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = loadModule("node:fs");
  module._compile(ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  }), filename);
};

const { accountHeaderState } = loadModule("./account-header-state.ts");

test("landing header waits for account hydration and distinguishes signed-in from signed-out", () => {
  assert.equal(accountHeaderState("loading"), "loading");
  assert.equal(accountHeaderState("authenticated"), "signed-in");
  assert.equal(accountHeaderState("guest"), "signed-out");
  assert.equal(accountHeaderState("unavailable"), "unavailable");
});
