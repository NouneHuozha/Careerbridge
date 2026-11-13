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

const {
  emptyPersonalData,
  isPersonalDataMutation,
  isPersonalDataSnapshot,
} = loadModule("./personal-data-validation.ts");

test("validates account snapshots and guest-data transfer mutations", () => {
  const data = {
    ...emptyPersonalData(),
    savedItems: [{ type: "course", id: "bca", savedAt: 1 }],
  };

  assert.equal(isPersonalDataSnapshot(data), true);
  assert.equal(isPersonalDataMutation({ type: "migration.keep", data }), true);
});

test("rejects malformed personal data at the account mutation boundary", () => {
  assert.equal(
    isPersonalDataMutation({
      type: "saved.add",
      item: { type: "unknown", id: "item", savedAt: 1 },
    }),
    false,
  );
  assert.equal(
    isPersonalDataMutation({
      type: "progress.educationStage",
      value: "class-11",
    }),
    false,
  );
});
