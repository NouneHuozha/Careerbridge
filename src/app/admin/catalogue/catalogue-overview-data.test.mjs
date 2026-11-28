import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Module = require("node:module");
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

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "../../../db/pool" && parent?.filename.endsWith("catalogue-overview-data.ts")) {
    return { getPool: () => ({}) };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { getCatalogueOverviewData } = require("./catalogue-overview-data.ts");
Module._load = originalLoad;

const summary = {
  totalItems: 145,
  publishedItems: 8,
  inReviewItems: 2,
  withoutPublishedVersion: 137,
  fields: 13,
  courses: 83,
  institutions: 23,
  pathways: 11,
  examinations: 7,
  scholarships: 8,
};

test("catalogue overview returns four metrics, six rolled-up categories and five recent records", async () => {
  const calls = [];
  const records = Array.from({ length: 5 }, (_, index) => ({
    id: `record-${index + 1}`,
    itemType: "course",
    title: `Course ${index + 1}`,
    revisionNumber: 3 - index,
    publicationStatus: index === 0 ? "in_review" : "published",
    updatedAt: new Date(`2026-11-${String(26 - index).padStart(2, "0")}T12:00:00.000Z`),
  }));
  const database = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      return String(sql).includes("WITH item_states")
        ? { rows: [summary] }
        : { rows: records };
    },
  };

  const result = await getCatalogueOverviewData(database);

  assert.deepEqual(result.metrics, {
    totalItems: 145,
    publishedItems: 8,
    inReviewItems: 2,
    withoutPublishedVersion: 137,
  });
  assert.deepEqual(
    result.categories.map(({ label, count }) => [label, count]),
    [
      ["Fields", 13],
      ["Courses", 83],
      ["Institutions", 23],
      ["Pathways", 11],
      ["Examinations", 7],
      ["Scholarships", 8],
    ],
  );
  assert.equal(result.categories.length, 6);
  assert.equal(result.recentRecords.length, 5);
  assert.deepEqual(calls.map(({ params }) => params), [undefined, [5]]);
  assert.match(calls[0].sql, /published_revision_status = 'published'/);
  assert.match(calls[0].sql, /latest_publication_status = 'in_review'/);
  assert.match(calls[0].sql, /revision\.revision_number DESC\s+LIMIT 1/);
  assert.match(calls[1].sql, /latest\.data_classification = 'real'/);
  assert.match(calls[1].sql, /ORDER BY latest\.updated_at DESC, item\.id DESC\s+LIMIT \$1/);
  assert.doesNotMatch(calls[0].sql, /admin_audit_events|SELECT \*/);
});

test("empty catalogues retain all six zero-count categories", async () => {
  const database = {
    async query(sql) {
      return String(sql).includes("WITH item_states")
        ? {
            rows: [{
              ...summary,
              totalItems: 0,
              publishedItems: 0,
              inReviewItems: 0,
              withoutPublishedVersion: 0,
              fields: 0,
              courses: 0,
              institutions: 0,
              pathways: 0,
              examinations: 0,
              scholarships: 0,
            }],
          }
        : { rows: [] };
    },
  };

  const result = await getCatalogueOverviewData(database);
  assert.equal(result.recentRecords.length, 0);
  assert.deepEqual(result.categories.map(({ count }) => count), [0, 0, 0, 0, 0, 0]);
});

test("database failures are propagated instead of returning empty-shaped data", async () => {
  const database = {
    async query() {
      throw new Error("database unavailable");
    },
  };

  await assert.rejects(getCatalogueOverviewData(database), /database unavailable/);
});
