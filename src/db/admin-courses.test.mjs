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
  if (request === "./pool" && parent?.filename.endsWith("admin-courses.ts")) {
    return { getPool: () => { throw new Error("Tests must inject a database."); } };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const {
  getAdminCourseDetail,
  getAdminCoursesDirectory,
  normalizeAdminCoursesFilters,
} = require("./admin-courses.ts");
Module._load = originalLoad;

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

test("Admin Courses filters are normalized and invalid sort/filter values are rejected", () => {
  assert.deepEqual(
    normalizeAdminCoursesFilters({
      search: "  BCA  ",
      publicationState: "invalid",
      fieldId: "technology",
      qualification: "Degree",
      entryStage: "invalid",
      sort: "title; DROP TABLE catalog_items",
      page: -1,
      pageSize: 100,
    }),
    {
      search: "BCA",
      publicationState: "all",
      fieldId: "technology",
      qualification: "Degree",
      entryStage: "all",
      sort: "updated_desc",
      page: 1,
      pageSize: 10,
    },
  );
});

test("directory keeps Published and Needs Review counts independent and excludes demo records", async () => {
  const metrics = {
    totalCourses: 2,
    publishedCourses: 1,
    needsReviewCourses: 1,
    draftCourses: 1,
    totalFiltered: 1,
    qualifications: ["Degree"],
    fields: [{ id: "technology", title: "Technology" }],
  };
  const record = {
    catalogItemId: "course-item-bca",
    id: "bca",
    latestRevisionId: "course-revision-2",
    publishedRevisionId: "course-revision-1",
    title: "Bachelor of Computer Applications (BCA)",
    summary: "A degree in computer applications.",
    revisionNumber: 2,
    publicationStatus: "in_review",
    publishedVersionAvailable: true,
    updatedAt: new Date("2026-11-28T00:00:00.000Z"),
    qualification: "Degree",
    stages: ["class-12"],
    fieldId: "technology",
    fieldTitle: "Technology",
    institutionCount: 1,
  };
  const mock = createDatabase([
    { rows: [metrics] },
    { rows: [record] },
  ]);

  const result = await getAdminCoursesDirectory({
    search: "BCA",
    publicationState: "needs_review",
    fieldId: "technology",
    qualification: "Degree",
    entryStage: "class-12",
    sort: "name_asc",
    page: 1,
    pageSize: 25,
  }, mock.database);

  assert.deepEqual(result.metrics, {
    totalCourses: 2,
    publishedCourses: 1,
    needsReviewCourses: 1,
    draftCourses: 1,
  });
  assert.deepEqual(result.fields, [{ id: "technology", title: "Technology" }]);
  assert.deepEqual(result.qualifications, ["Degree"]);
  assert.equal(result.records[0].publishedVersionAvailable, true);
  assert.equal(result.records[0].publicationStatus, "in_review");
  assert.equal(result.totalFiltered, 1);
  assert.equal(mock.calls.length, 2);
  assert.match(mock.calls[0].sql, /revision\.data_classification = 'real'/);
  assert.match(mock.calls[0].sql, /item\.item_type = 'course'/);
  assert.match(mock.calls[0].sql, /publicationStatus.*IN \('in_review', 'approved'\)/s);
  assert.match(mock.calls[1].sql, /course_offering/);
  assert.match(mock.calls[1].sql, /COUNT\(DISTINCT institution_item\.id\)/);
  assert.doesNotMatch(mock.calls[0].sql, /item_type = 'course_offering'/);
  assert.deepEqual(mock.calls[0].params, ["BCA", "technology", "Degree", "class-12"]);
  assert.deepEqual(mock.calls[1].params, ["BCA", "technology", "Degree", "class-12", 25, 0]);
  assert.match(mock.calls[1].sql, /ORDER BY course\.title ASC/);
});

test("directory clamps out-of-range pages to the last available page", async () => {
  const summary = {
    totalCourses: 0,
    publishedCourses: 0,
    needsReviewCourses: 0,
    draftCourses: 0,
    totalFiltered: 21,
    qualifications: [],
    fields: [],
  };
  const mock = createDatabase([
    { rows: [summary] },
    { rows: [] },
  ]);

  const result = await getAdminCoursesDirectory({
    page: 9,
    pageSize: 10,
  }, mock.database);

  assert.equal(result.page, 3);
  assert.equal(result.pageCount, 3);
  assert.deepEqual(mock.calls[1].params, [10, 20]);
});

test("Course detail reads real revisions, Course evidence, and offerings separately", async () => {
  const course = {
    catalogItemId: "course-item-bca",
    id: "bca",
    latestRevisionId: "course-revision-2",
    publishedRevisionId: "course-revision-2",
    title: "Bachelor of Computer Applications (BCA)",
    summary: "Course summary",
    description: "Course description",
    revisionNumber: 2,
    publicationStatus: "published",
    verificationStatus: "pending_review",
    publishedVersionAvailable: true,
    updatedAt: new Date("2026-11-25T04:59:50.801Z"),
    publishedAt: new Date("2026-11-25T04:59:50.801Z"),
    qualification: "Degree",
    stages: ["class-12"],
    fieldId: "technology",
    fieldTitle: "Technology",
    entryAfterClass10: "",
    entryAfterClass12: "Entry after Class 12",
    content: {},
  };
  const revision = { id: "course-revision-2", revisionNumber: 2, content: {} };
  const source = { id: "source-1", category: "course_syllabus", claims: [] };
  const offering = {
    id: "institution-course",
    latestRevisionId: "offering-revision-1",
    publicationStatus: "published",
  };
  const offeringSource = {
    revisionId: "offering-revision-1",
    id: "offering-source-1",
    category: "course_offering",
    claims: [],
  };
  const mock = createDatabase([
    { rows: [course] },
    { rows: [revision] },
    { rows: [source] },
    { rows: [offering] },
    { rows: [offeringSource] },
  ]);

  const result = await getAdminCourseDetail("bca", mock.database);

  assert.equal(result.id, "bca");
  assert.equal(result.latestRevisionId, "course-revision-2");
  assert.deepEqual(result.revisions, [revision]);
  assert.deepEqual(result.sources, [source]);
  assert.deepEqual(result.offerings, [{ ...offering, sources: [offeringSource] }]);
  assert.equal(mock.calls.length, 5);
  assert.match(mock.calls[0].sql, /item\.item_type = 'course'/);
  assert.match(mock.calls[0].sql, /revision\.data_classification = 'real'/);
  assert.match(mock.calls[1].sql, /revision\.data_classification = 'real'/);
  assert.deepEqual(mock.calls[2].params, ["course-revision-2"]);
  assert.deepEqual(mock.calls[3].params, ["course-item-bca", "course-revision-2", "bca"]);
  assert.match(mock.calls[2].sql, /catalog_revision_sources/);
  assert.match(mock.calls[3].sql, /course_offering_revisions/);
  assert.deepEqual(mock.calls[4].params, [["offering-revision-1"]]);
});

test("Course detail does not query related data for an unknown Course", async () => {
  const mock = createDatabase([{ rows: [] }]);

  assert.equal(await getAdminCourseDetail("not-a-course", mock.database), null);
  assert.equal(mock.calls.length, 1);
});
