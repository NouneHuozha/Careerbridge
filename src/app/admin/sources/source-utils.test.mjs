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
  filterSourceDirectory,
  getSourceDirectoryCounts,
  getSourceMaintenanceCounts,
  getSourceMaintenanceIssues,
} = require("./source-utils.ts");
const { sourcePreviewRecords } = require("./source-preview-data.ts");

const initialFilters = {
  query: "",
  authority: "all",
  issuingOrganisation: "all",
  status: "all",
  lastChecked: "all",
};

test("source overview and maintenance counts reflect the preview records", () => {
  assert.deepEqual(getSourceDirectoryCounts(sourcePreviewRecords), {
    total: 4,
    official: 3,
    needsChecking: 3,
  });
  assert.deepEqual(getSourceMaintenanceCounts(sourcePreviewRecords), {
    due: 1,
    failed: 1,
    changed: 1,
    inactive: 1,
  });
});

test("directory filters compose across search, classification, issuer, status and last check", () => {
  const results = filterSourceDirectory(
    sourcePreviewRecords,
    {
      ...initialFilters,
      query: "nta.ac.in",
      authority: "government",
      issuingOrganisation: "National Testing Agency",
      status: "needs_check",
      lastChecked: "7d",
    },
  );

  assert.deepEqual(results.map((source) => source.id), ["national-testing-agency"]);
});

test("maintenance issues distinguish overdue, failed, changed and inactive sources", () => {
  assert.deepEqual(
    sourcePreviewRecords.map((source) => getSourceMaintenanceIssues(source)),
    [["due"], ["failed"], ["changed"], ["inactive"]],
  );
});

test("unknown searches and last-check filters can return an empty directory", () => {
  assert.deepEqual(
    filterSourceDirectory(sourcePreviewRecords, {
      ...initialFilters,
      query: "no source matches",
    }),
    [],
  );
  assert.deepEqual(
    filterSourceDirectory(sourcePreviewRecords, {
      ...initialFilters,
      lastChecked: "not_checked",
    }).map((source) => source.id),
    ["archived-directory-snapshot"],
  );
});

test("directory sorting keeps unchecked sources last and supports name ordering", () => {
  const oldestFirst = filterSourceDirectory(
    sourcePreviewRecords,
    initialFilters,
    "2026-11-27",
    "last_checked_asc",
  );
  assert.deepEqual(oldestFirst.map((source) => source.id), [
    "assam-down-town-university",
    "sample-official-document",
    "national-testing-agency",
    "archived-directory-snapshot",
  ]);

  const nameOrder = filterSourceDirectory(
    sourcePreviewRecords,
    initialFilters,
    "2026-11-27",
    "name_asc",
  );
  assert.deepEqual(nameOrder.map((source) => source.name), [
    "Archived directory snapshot",
    "Assam Down Town University",
    "National Testing Agency",
    "Sample official guidance document",
  ]);
});
