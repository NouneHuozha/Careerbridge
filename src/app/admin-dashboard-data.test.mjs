import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    const { readFileSync } = require("node:fs");
    const output = ts.transpile(readFileSync(filename, "utf8"), {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    });
    module._compile(output, filename);
  };
}

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "../../db/pool" && parent?.filename.endsWith("admin\\dashboard-data.ts")) {
    return { getPool: () => ({}) };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const { aggregateCatalogueOverview, getAdminDashboardData } = require("./admin/dashboard-data.ts");
Module._load = originalLoad;

function item({
  type = "field",
  publishedRevisionId = null,
  joinedPublishedRevisionId = null,
  publishedRevisionStatus = null,
  latestPublicationStatus = "draft",
} = {}) {
  return {
    itemType: type,
    publishedRevisionId,
    joinedPublishedRevisionId,
    publishedRevisionStatus,
    latestPublicationStatus,
  };
}

test("catalogue metrics count identities and require a valid published revision", () => {
  const overview = aggregateCatalogueOverview([
    item(),
    item({ publishedRevisionId: "revision-1", joinedPublishedRevisionId: "revision-1", publishedRevisionStatus: "published", latestPublicationStatus: "published" }),
    item({ type: "course", publishedRevisionId: "missing-revision", latestPublicationStatus: "in_review" }),
    item({ type: "pathway", publishedRevisionId: "revision-4", joinedPublishedRevisionId: "revision-4", publishedRevisionStatus: "draft", latestPublicationStatus: "in_review" }),
  ]);

  assert.equal(overview.totalItems, 4);
  assert.equal(overview.publishedItems, 1);
  assert.equal(overview.unpublishedItems, 3);
  assert.equal(overview.inReviewItems, 2);
  assert.deepEqual(
    overview.byType.filter(({ count }) => count > 0),
    [
      { type: "field", count: 2 },
      { type: "course", count: 1 },
      { type: "pathway", count: 1 },
    ],
  );
  assert.equal(overview.byType.reduce((total, entry) => total + entry.count, 0), 4);
});

test("recent activity query orders deterministically and limits results to ten", async () => {
  const queries = [];
  const database = {
    async query(sql, params) {
      queries.push({ sql: String(sql), params });
      if (String(sql).includes("admin_audit_events")) {
        return { rows: [{ id: "latest" }, { id: "oldest-in-window" }] };
      }
      return { rows: [item()] };
    },
  };

  const result = await getAdminDashboardData(database);
  const activityQuery = queries.find(({ sql }) => sql.includes("admin_audit_events"));
  assert.match(activityQuery.sql, /ORDER BY event\.created_at DESC, event\.id DESC\s+LIMIT \$1/);
  assert.deepEqual(activityQuery.params, [10]);
  assert.deepEqual(result.recentActivity, [{ id: "latest" }, { id: "oldest-in-window" }]);
});

test("an empty audit history is returned as an empty list", async () => {
  const database = {
    async query(sql) {
      return String(sql).includes("admin_audit_events")
        ? { rows: [] }
        : { rows: [] };
    },
  };

  const result = await getAdminDashboardData(database);
  assert.deepEqual(result.recentActivity, []);
  assert.equal(result.catalogue.totalItems, 0);
});

test("dashboard data errors remain explicit to the caller", async () => {
  const database = {
    async query() {
      throw new Error("database unavailable");
    },
  };

  await assert.rejects(getAdminDashboardData(database), /database unavailable/);
});
