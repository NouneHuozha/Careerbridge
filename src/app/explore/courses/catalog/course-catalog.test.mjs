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

test("catalogue course IDs are unique and every course has a detail page", () => {
  const ids = courseCatalog.map((course) => course.id);

  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.ok(courseDetails[id], `Missing detail content for ${id}`);
  }
});

test("legacy named technology examples are present at the appropriate stages", () => {
  const technologyCourses = courseCatalog.filter(
    (course) => course.fieldId === "technology",
  );
  const class10Ids = technologyCourses
    .filter((course) => course.stages.includes("class-10"))
    .map((course) => course.id);
  const class12Ids = technologyCourses
    .filter((course) => course.stages.includes("class-12"))
    .map((course) => course.id);

  assert.ok(class10Ids.includes("higher-secondary-science"));
  assert.ok(class10Ids.includes("computer-engineering-diploma"));
  assert.ok(class10Ids.includes("electronics-trade"));
  assert.ok(class10Ids.includes("digital-skills"));
  assert.ok(class12Ids.includes("bca"));
  assert.ok(class12Ids.includes("btech-computer-science"));
  assert.ok(class12Ids.includes("technology-diploma"));
  assert.ok(class12Ids.includes("computing-certificate"));
});

test("broad technology options are explicitly marked as exploration categories", () => {
  for (const id of [
    "electronics-trade",
    "digital-skills",
    "technology-diploma",
    "computing-certificate",
  ]) {
    assert.equal(
      courseCatalog.find((course) => course.id === id)?.isExplorationCategory,
      true,
    );
  }
});
