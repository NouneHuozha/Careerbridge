/**
 * Tests for the course catalogue search and filter logic.
 *
 * The filtering runs in the browser component (course-catalog.tsx) but the
 * logic is pure JS so we replicate it here and verify correctness without a
 * DOM, particularly the subject-search fix (learning area titles and
 * descriptions must be searchable when the UI hint promises subjects can be
 * searched).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const loadModule = createRequire(import.meta.url);
const ts = loadModule("typescript");

loadModule.extensions[".ts"] = (module, filename) => {
  const source = readFileSync(filename, "utf8");
  const output = ts.transpile(source, {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

const { courseCatalog } = loadModule("./course-catalog-data.ts");
const { courseDetails } = loadModule("./course-detail-data.ts");

/**
 * Replicates the filtering logic from course-catalog.tsx so we can unit-test
 * it without a React/DOM environment.  Keep this in sync with the component.
 */
function filterCourses(courses, { stage = "all", field = "all", qualification = "all", search = "" } = {}) {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  return courses.filter((course) => {
    const matchesStage = stage === "all" || (course.stages ?? []).includes(stage);
    const matchesField = field === "all" || course.fieldId === field;
    const matchesQualification = qualification === "all" || course.qualification === qualification;

    // Build the searchable text the same way the component does after the fix:
    // name + description + fieldId + qualification + learning area titles + descriptions.
    const detail = courseDetails[course.id];
    const learningAreaText = (detail?.learningAreas ?? [])
      .flatMap((area) => [area.title, area.description])
      .join(" ");
    const matchesSearch =
      !normalizedSearch ||
      `${course.name} ${course.description} ${course.fieldId} ${course.qualification} ${learningAreaText}`
        .toLocaleLowerCase()
        .includes(normalizedSearch);

    return matchesStage && matchesField && matchesQualification && matchesSearch;
  });
}

// ── Subject / learning-area search ───────────────────────────────────────────

test("searching a learning area title returns courses that cover that subject", () => {
  // "Programming" is a learning area title in BCA (course-detail-data.ts).
  const results = filterCourses(courseCatalog, { search: "programming" });
  const ids = results.map((c) => c.id);
  assert.ok(ids.includes("bca"), "BCA should match because its learning areas include 'Programming'");
  // iti-copa also has "Programming basics" — verify it too
  assert.ok(ids.includes("iti-copa"), "ITI COPA should match because it has 'Programming basics'");
});

test("searching a learning area description term returns matching courses", () => {
  // BCA learning areas include "Write and test programs" in a description.
  const results = filterCourses(courseCatalog, { search: "write and test" });
  const ids = results.map((c) => c.id);
  assert.ok(ids.includes("bca"), "BCA should match the description phrase 'write and test'");
});

test("a subject term that only appears in learning areas does not match the wrong course", () => {
  // "Ecosystems" appears only in environmental-science learning areas.
  const results = filterCourses(courseCatalog, { search: "ecosystems" });
  const ids = results.map((c) => c.id);
  assert.ok(ids.includes("environmental-science"), "Environmental science should match 'ecosystems'");
  assert.ok(!ids.includes("bca"), "BCA should not match 'ecosystems'");
});

test("empty search returns all courses unfiltered", () => {
  const results = filterCourses(courseCatalog, { search: "" });
  assert.equal(results.length, courseCatalog.length);
});

test("whitespace-only search returns all courses unfiltered", () => {
  const results = filterCourses(courseCatalog, { search: "   " });
  assert.equal(results.length, courseCatalog.length);
});

// ── Stage / field / qualification filters (regression guard) ─────────────────

test("class-10 filter only returns courses with that stage", () => {
  const results = filterCourses(courseCatalog, { stage: "class-10" });
  for (const course of results) {
    assert.ok(course.stages.includes("class-10"), `${course.id} should have class-10 stage`);
  }
  assert.ok(results.length > 0, "At least one class-10 course should exist");
});

test("class-12 filter only returns courses with that stage", () => {
  const results = filterCourses(courseCatalog, { stage: "class-12" });
  for (const course of results) {
    assert.ok(course.stages.includes("class-12"), `${course.id} should have class-12 stage`);
  }
});

test("technology field filter returns only technology courses", () => {
  const results = filterCourses(courseCatalog, { field: "technology" });
  for (const course of results) {
    assert.equal(course.fieldId, "technology", `${course.id} should have fieldId technology`);
  }
  assert.ok(results.map((c) => c.id).includes("bca"), "BCA is a technology course");
});

test("qualification filter returns only courses with that qualification", () => {
  const results = filterCourses(courseCatalog, { qualification: "Degree" });
  for (const course of results) {
    assert.equal(course.qualification, "Degree", `${course.id} should be a Degree`);
  }
});

// ── Data boundary: general course descriptions must be institution-neutral ────

test("BCA catalogue description does not name a specific institution or duration", () => {
  const bca = courseCatalog.find((c) => c.id === "bca");
  assert.ok(bca, "BCA should be in the catalogue");
  const text = (bca.description ?? "").toLocaleLowerCase();
  // Institution-specific names that must not appear in the general description.
  assert.ok(!text.includes("madhab"), "BCA description must not mention Madhab Choudhury College");
  assert.ok(!text.includes("choudhury"), "BCA description must not mention Choudhury");
  assert.ok(!text.includes("assam down town"), "BCA description must not mention a specific institution");
  // Duration claims belong to offerings, not the general course entry.
  assert.ok(
    !text.includes("3 year") && !text.includes("three year") && !text.includes("4 year"),
    "BCA general description must not state a specific duration",
  );
});

test("BCA detail overview does not contain institution-specific references", () => {
  const bcaDetail = courseDetails["bca"];
  assert.ok(bcaDetail, "BCA detail should exist");
  const text = (bcaDetail.overview ?? "").toLocaleLowerCase();
  assert.ok(!text.includes("madhab"), "BCA overview must not mention Madhab Choudhury College");
  assert.ok(!text.includes("choudhury"), "BCA overview must not mention Choudhury");
  assert.ok(!text.includes("assam down town"), "BCA overview must not mention Assam down town University");
  assert.ok(
    !text.includes("3 year") && !text.includes("three year") && !text.includes("4 year"),
    "BCA overview must not state a specific duration",
  );
});

test("every course in course-detail-data has a general neutral overview (no institution names)", () => {
  // Institution names that should never appear in general course overviews.
  const institutionKeywords = [
    "madhab", "choudhury", "assam down town", "kohima", "gauhati", "dibrugarh",
  ];
  for (const [id, detail] of Object.entries(courseDetails)) {
    const text = (detail.overview ?? "").toLocaleLowerCase();
    for (const keyword of institutionKeywords) {
      assert.ok(
        !text.includes(keyword),
        `Course "${id}" overview mentions institution name "${keyword}" — must be institution-neutral`,
      );
    }
  }
});
