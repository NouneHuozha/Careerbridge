import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = require("node:fs");
  const output = ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

const {
  DEFAULT_ADMIN_WORKSPACE_PREFERENCES,
  formatAdminDate,
  parseAdminWorkspacePreferences,
} = require("./workspace-preferences.ts");

test("preferences default to the requested values and reject invalid stored values", () => {
  assert.deepEqual(parseAdminWorkspacePreferences(null), DEFAULT_ADMIN_WORKSPACE_PREFERENCES);
  assert.deepEqual(
    parseAdminWorkspacePreferences(
      JSON.stringify({
        recordsPerPage: 50,
        dateFormat: "YYYY-MM-DD",
        tableDensity: "compact",
      }),
    ),
    { recordsPerPage: 50, dateFormat: "YYYY-MM-DD", tableDensity: "compact" },
  );
  assert.throws(
    () => parseAdminWorkspacePreferences('{"recordsPerPage":999,"dateFormat":"invalid","tableDensity":"huge"}'),
    /invalid/,
  );
  assert.throws(() => parseAdminWorkspacePreferences("{"), SyntaxError);
});

test("date formatting respects date-only values, selected formats, and Admin time zone", () => {
  const date = "2026-11-27";
  assert.equal(formatAdminDate(date), "27 Nov 2026");
  assert.equal(formatAdminDate(date, "DD/MM/YYYY"), "27/11/2026");
  assert.equal(formatAdminDate(date, "YYYY-MM-DD"), "2026-11-27");
  assert.equal(
    formatAdminDate("2026-11-27T00:00:00.000Z", "DD MMM YYYY", true),
    "27 Nov 2026, 05:30",
  );
});
