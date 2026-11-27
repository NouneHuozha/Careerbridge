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
  filterReviewQueueEntries,
  getReviewQueueCounts,
  REVIEW_QUEUE_PREVIEW_AS_OF,
} = require("./review-queue-utils.ts");
const { reviewQueuePreviewEntries } = require("./review-queue-preview-data.ts");
const { getCataloguePreviewRecord } = require("../catalogue/catalogue-preview-data.ts");

test("queue preview entries resolve to catalogue records and present coherent workflow counts", () => {
  for (const entry of reviewQueuePreviewEntries) {
    assert.ok(
      getCataloguePreviewRecord(entry.categorySlug, entry.recordId),
      `${entry.categorySlug}/${entry.recordId} resolves to its preview record`,
    );
  }

  assert.deepEqual(getReviewQueueCounts(reviewQueuePreviewEntries), {
    awaiting_review: 4,
    in_progress: 1,
    needs_changes: 1,
  });

  const neet = reviewQueuePreviewEntries.find((entry) => entry.recordId === "CB-EXAM-003");
  assert.equal(neet.evidenceSummary, "3 verified · 1 pending · 6 unavailable");
});

test("queue filters compose across search, status, type, reviewer and submitted date", () => {
  const results = filterReviewQueueEntries(
    reviewQueuePreviewEntries,
    {
      query: "NEET",
      status: "awaiting_review",
      category: "examinations",
      dateRange: "today",
      reviewer: "unassigned",
    },
    REVIEW_QUEUE_PREVIEW_AS_OF,
  );

  assert.equal(results.length, 1);
  assert.equal(results[0].recordId, "CB-EXAM-003");
});

test("queue supports needs-changes, reviewer search, and empty results", () => {
  const needsChanges = filterReviewQueueEntries(
    reviewQueuePreviewEntries,
    {
      query: "",
      status: "needs_changes",
      category: "all",
      dateRange: "all",
      reviewer: "all",
    },
    REVIEW_QUEUE_PREVIEW_AS_OF,
  );
  assert.equal(needsChanges.length, 1);
  assert.equal(needsChanges[0].recordId, "CB-SCHOLARSHIP-002");

  const assignedToReviewer = filterReviewQueueEntries(
    reviewQueuePreviewEntries,
    {
      query: "A. Sharma",
      status: "all",
      category: "all",
      dateRange: "all",
      reviewer: "all",
    },
    REVIEW_QUEUE_PREVIEW_AS_OF,
  );
  assert.equal(assignedToReviewer.length, 2);

  const noMatches = filterReviewQueueEntries(
    reviewQueuePreviewEntries,
    {
      query: "not a record",
      status: "all",
      category: "all",
      dateRange: "all",
      reviewer: "all",
    },
    REVIEW_QUEUE_PREVIEW_AS_OF,
  );
  assert.deepEqual(noMatches, []);
});
