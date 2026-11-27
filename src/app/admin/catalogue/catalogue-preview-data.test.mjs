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
  catalogueCategoryDefinitions,
  getCataloguePreviewRecord,
} = require("./catalogue-preview-data.ts");

test("all seven catalogue categories have preview records and both status filters", () => {
  assert.deepEqual(
    catalogueCategoryDefinitions.map(({ slug }) => slug),
    [
      "courses",
      "institutions",
      "campuses",
      "course-offerings",
      "pathways",
      "examinations",
      "scholarships",
    ],
  );

  for (const category of catalogueCategoryDefinitions) {
    assert.ok(category.records.length > 0, `${category.slug} has preview records`);
    assert.ok(
      category.filters.some((filter) => filter.key === "publicationStatus"),
      `${category.slug} filters by publication state`,
    );
    assert.ok(
      category.filters.some((filter) => filter.key === "verificationStatus"),
      `${category.slug} filters by verification state`,
    );
    assert.ok(category.editorFields.length > 0, `${category.slug} has type-specific fields`);
  }
});

test("category editor options follow catalogue revision schema constraints", () => {
  const fields = Object.fromEntries(
    catalogueCategoryDefinitions.map((category) => [
      category.slug,
      Object.fromEntries(category.editorFields.map((field) => [field.key, field])),
    ]),
  );

  assert.deepEqual(fields.courses.qualification.options, [
    "Higher secondary",
    "Degree",
    "Diploma",
    "Certificate",
    "Vocational",
    "Professional",
    "Skill training",
  ]);
  assert.deepEqual(fields.institutions.institutionType.options, [
    "College",
    "University",
    "Institute",
    "School",
    "Training centre",
  ]);
  assert.deepEqual(fields.examinations.level.options, ["national", "state", "institution"]);
  assert.deepEqual(fields.scholarships.scholarshipStatus.options, [
    "open",
    "upcoming",
    "closed",
    "unknown",
  ]);
});

test("record preview keeps revision, evidence, and schema-backed relationships together", () => {
  const bca = getCataloguePreviewRecord("courses", "CB-COURSE-001");
  assert.equal(bca.record.publicationStatus, "published");
  assert.equal(bca.detail.revisions.filter((revision) => revision.current).length, 1);
  assert.equal(bca.detail.sources.length, 1);
  assert.ok(
    bca.detail.relationships.some((relationship) => relationship.itemType === "course_offering"),
  );
  assert.ok(
    bca.detail.relationships.some((relationship) => relationship.itemType === "campus"),
  );

  const review = getCataloguePreviewRecord("courses", "CB-COURSE-002");
  assert.equal(review.record.publicationStatus, "in_review");
  assert.ok(review.detail.claims.some((claim) => claim.status === "unavailable"));
  assert.equal(getCataloguePreviewRecord("courses", "missing-id"), undefined);
});
