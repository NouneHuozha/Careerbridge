import assert from "node:assert/strict";
import test from "node:test";
import {
  filterIntakeJobs,
  getMissingIntakeFields,
  getImportPreviewSummary,
  isSupportedSpreadsheetFileName,
} from "./data-intake-utils.ts";

const jobs = [
  {
    id: "preview-job-0001",
    title: "institutions.xlsx",
    kind: "import",
    status: "preview_completed",
    createdAt: "2026-11-26T10:00:00.000Z",
    recordTypeLabel: "Institutions",
    recordsLabel: "25 example rows",
    detail: "Example import.",
  },
  {
    id: "preview-job-0002",
    title: "manual-entry-preview",
    kind: "manual",
    status: "preview_completed",
    createdAt: "2026-11-27T10:00:00.000Z",
    recordTypeLabel: "Institution",
    recordsLabel: "1 example record",
    detail: "Example manual-entry preview.",
  },
];

test("intake history filters by kind and searches preview job details", () => {
  assert.deepEqual(
    filterIntakeJobs(jobs, "MANUAL", "manual").map(({ id }) => id),
    ["preview-job-0002"],
  );
  assert.deepEqual(
    filterIntakeJobs(jobs, "", "all").map(({ id }) => id),
    ["preview-job-0002", "preview-job-0001"],
  );
});

test("spreadsheet selection accepts supported extensions without reading file content", () => {
  assert.equal(isSupportedSpreadsheetFileName("institutions.XLSX"), true);
  assert.equal(isSupportedSpreadsheetFileName("records.csv"), true);
  assert.equal(isSupportedSpreadsheetFileName("notes.pdf"), false);
  assert.equal(isSupportedSpreadsheetFileName(""), false);
});

test("required Catalogue fields must all be mapped and skipped columns do not count", () => {
  assert.deepEqual(
    getMissingIntakeFields(["title", "institutionType"], {
      "College name": "title",
      "Institution type": "__skip__",
    }),
    ["institutionType"],
  );
  assert.deepEqual(
    getMissingIntakeFields(["title", "institutionType"], {
      "College name": "title",
      "Institution type": "institutionType",
    }),
    [],
  );
});

test("duplicate resolution changes only the illustrative import summary", () => {
  assert.deepEqual(getImportPreviewSummary("use-existing"), {
    newDraftCandidates: 12,
    revisionCandidates: 4,
    skippedRows: 2,
    failedRows: 0,
  });
  assert.deepEqual(getImportPreviewSummary("create-new"), {
    newDraftCandidates: 13,
    revisionCandidates: 3,
    skippedRows: 2,
    failedRows: 0,
  });
  assert.deepEqual(getImportPreviewSummary("skip"), {
    newDraftCandidates: 12,
    revisionCandidates: 3,
    skippedRows: 3,
    failedRows: 0,
  });
});
