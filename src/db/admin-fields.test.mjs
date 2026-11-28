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
  if (request === "./pool" && parent?.filename.endsWith("admin-fields.ts")) {
    return { getPool: () => { throw new Error("Tests must inject a database."); } };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const {
  getAdminFieldDetail,
  getAdminFieldsDirectory,
  normalizeAdminFieldsFilters,
} = require("./admin-fields.ts");
Module._load = originalLoad;

const metrics = {
  totalRecords: 13,
  publishedRecords: 13,
  needsReviewRecords: 1,
};

function createDatabase(responses) {
  const calls = [];
  return {
    calls,
    database: {
      query(sql, params) {
        calls.push({ sql: String(sql), params });
        return Promise.resolve(responses.shift());
      },
    },
  };
}

test("Admin Fields metrics use latest revisions and keep publication separate from verification", async () => {
  const record = {
    id: "technology",
    catalogItemId: "item-technology",
    latestRevisionId: "revision-2",
    publishedRevisionId: "revision-2",
    title: "Technology",
    summary: "Digital systems and computing.",
    revisionNumber: 2,
    publicationStatus: "published",
    verificationStatus: "pending_review",
    publishedVersionAvailable: true,
    createdAt: new Date("2026-11-19T05:31:01.686Z"),
    updatedAt: new Date("2026-11-20T05:31:01.686Z"),
    dataClassification: "real",
    provenanceCount: 2,
  };
  const mock = createDatabase([
    { rows: [metrics] },
    { rows: [{ total: 1 }] },
    { rows: [record] },
  ]);

  const result = await getAdminFieldsDirectory({
    search: "technology",
    publicationState: "published",
    reviewState: "needs_review",
    updatedWithin: "30",
    sort: "name_asc",
    page: 1,
  }, mock.database);

  assert.deepEqual(result.metrics, metrics);
  assert.equal(result.records[0].publicationStatus, "published");
  assert.equal(result.records[0].verificationStatus, "pending_review");
  assert.equal(result.totalFiltered, 1);
  assert.equal(result.page, 1);
  assert.equal(mock.calls.length, 3);
  assert.match(mock.calls[0].sql, /ORDER BY revision\.revision_number DESC\s+LIMIT 1/);
  assert.match(mock.calls[0].sql, /"publicationStatus" IN \('in_review', 'approved'\)/);
  assert.match(mock.calls[0].sql, /published\.id IS NOT NULL/);
  assert.match(mock.calls[1].sql, /field\."publishedVersionAvailable"/);
  assert.match(mock.calls[1].sql, /field\."publicationStatus" IN \('in_review', 'approved'\)/);
  assert.match(mock.calls[2].sql, /COALESCE\(field\.title, ''\)/);
  assert.deepEqual(mock.calls[1].params, ["technology"]);
  assert.deepEqual(mock.calls[2].params, ["technology", 10, 0]);
  assert.doesNotMatch(mock.calls[0].sql, /SELECT \*/);
});

test("filter values are validated and requested pages are clamped to actual results", async () => {
  assert.deepEqual(
    normalizeAdminFieldsFilters({
      search: "  keyword  ",
      publicationState: "invalid",
      reviewState: "invalid",
      sort: "title; DROP TABLE catalog_items",
      page: -2,
    }),
    {
      search: "keyword",
      publicationState: "all",
      reviewState: "all",
      sort: "name_asc",
      page: 1,
    },
  );

  const mock = createDatabase([
    { rows: [metrics] },
    { rows: [{ total: 26 }] },
    { rows: [] },
  ]);
  const result = await getAdminFieldsDirectory({ page: 99 }, mock.database);

  assert.equal(result.page, 3);
  assert.equal(result.pageCount, 3);
  assert.deepEqual(mock.calls[2].params, [10, 20]);
  assert.match(mock.calls[2].sql, /ORDER BY field\.title ASC NULLS LAST/);
});

test("Field detail reads only that identity's revision history and maps its related data", async () => {
  const fieldContent = {
    introduction: "An introduction.",
    broadlyInvolves: "Themes.",
  };
  const mock = createDatabase([
    {
      rows: [{
        id: "technology",
        catalogItemId: "item-technology",
        latestRevisionId: "revision-2",
        title: "Technology",
        summary: "Digital systems.",
        description: null,
        revisionNumber: 2,
        publicationStatus: "published",
        verificationStatus: "pending_review",
        publishedVersionAvailable: true,
        updatedAt: new Date("2026-11-20T05:31:01.686Z"),
        dataClassification: "real",
        fieldContent,
      }],
    },
    {
      rows: [{
        id: "revision-2",
        revisionNumber: 2,
        title: "Technology",
        summary: "Digital systems.",
        description: null,
        publicationStatus: "published",
        verificationStatus: "pending_review",
        dataClassification: "real",
        createdAt: new Date("2026-11-20T00:00:00.000Z"),
        updatedAt: new Date("2026-11-20T05:31:01.686Z"),
        publishedAt: new Date("2026-11-20T05:31:01.686Z"),
        provenanceCount: 2,
        fieldContent,
      }],
    },
    {
      rows: [{
        id: "source-1",
        name: "National Career Service",
        authority: "Directorate General of Employment",
        url: "https://ncs.gov.in",
        claimKey: "field.technology.introduction",
        checkedAt: null,
        verifiedAt: null,
        verificationStatus: "pending_review",
      }],
    },
    {
      rows: [{
        id: "course-1",
        catalogItemId: "course-item-1",
        title: "Bachelor of Computer Application",
        revisionNumber: 3,
        fieldRevisionNumber: 2,
      }],
    },
  ]);

  const result = await getAdminFieldDetail("technology", mock.database);

  assert.equal(result.id, "technology");
  assert.equal(result.revisions.length, 1);
  assert.equal(result.revisions[0].content.introduction, "An introduction.");
  assert.equal(result.sources[0].claimKey, "field.technology.introduction");
  assert.equal(result.courses[0].fieldRevisionNumber, 2);
  assert.match(mock.calls[0].sql, /requested_alias\.external_key = \$1/);
  assert.match(mock.calls[1].sql, /WHERE revision\.catalog_item_id = \$1\s+ORDER BY revision\.revision_number DESC/);
  assert.deepEqual(mock.calls.map(({ params }) => params), [
    ["technology"],
    ["item-technology"],
    ["revision-2"],
    ["item-technology"],
  ]);
});

test("missing Field identities return null without querying unrelated records", async () => {
  const mock = createDatabase([{ rows: [] }]);

  assert.equal(await getAdminFieldDetail("missing-field", mock.database), null);
  assert.equal(mock.calls.length, 1);
});
