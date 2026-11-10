import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

const {
  fieldGuideData,
  getActivityConnections,
  getPossibilityFields,
  possibilityFields,
} = loadModule("./field-data.ts");
const { possibilityFields: sharedPossibilities } = loadModule("../../discover/possibility-fields.ts");
const { courseCatalog } = loadModule("../courses/catalog/course-catalog-data.ts");

test("all field experiences consume one complete record for each field", () => {
  assert.equal(possibilityFields.length, 13);
  assert.equal(new Set(possibilityFields.map((field) => field.id)).size, 13);
  assert.equal(
    new Set(possibilityFields.map((field) => field.introduction.join(" "))).size,
    possibilityFields.length,
  );
  assert.strictEqual(sharedPossibilities, possibilityFields);

  for (const field of possibilityFields) {
    assert.strictEqual(fieldGuideData[field.id], field);
    assert.ok(field.name && field.description && field.image && field.imageAlt);
    assert.ok(
      field.overview.shortDescription &&
        field.overview.introduction &&
        field.overview.everydayExample,
      `Missing Discover overview copy for ${field.id}`,
    );
    assert.equal(field.overview.activities.length, 3);
    assert.equal(new Set(field.overview.activities).size, 3);
    assert.equal(field.overview.areas.length, 4);
    assert.ok(field.overview.areas.every(Boolean));
    assert.ok(field.introduction.length > 0);
    assert.ok(field.workExamples.length > 0);
    assert.ok(field.areas.length > 0);
    assert.ok(field.studyRoutes["class-10"].length > 0);
    assert.ok(field.studyRoutes["class-12"].length > 0);
    assert.ok(field.opportunities.length > 0);
    assert.ok(existsSync(new URL(`../../../../public${field.image}`, import.meta.url)));
  }
});

test("Healthcare overview uses the approved Discover copy", () => {
  const healthcare = fieldGuideData.healthcare.overview;
  assert.equal(
    healthcare.shortDescription,
    "Protecting health, preventing illness and helping people recover.",
  );
  assert.equal(
    healthcare.activities[0],
    "Listen to patients describe their symptoms and gather information that helps the care team understand their health.",
  );
  assert.deepEqual(healthcare.areas, [
    "Medical care",
    "Nursing and patient care",
    "Medical laboratory science",
    "Pharmacy",
  ]);
});

test("field filters cover the course catalogue and map each activity to focused fields", () => {
  const fieldIds = new Set(possibilityFields.map((field) => field.id));
  for (const course of courseCatalog) {
    assert.ok(fieldIds.has(course.fieldId), `Unknown field ${course.fieldId} on ${course.id}`);
  }
  assert.deepEqual(getPossibilityFields([]), possibilityFields);

  const expectedConnections = {
    fixing: ["engineering", "technology", "science"],
    helping: ["healthcare", "education", "social-sciences"],
    outdoors: ["agriculture-environment", "science"],
    computers: ["technology", "engineering", "media"],
    organising: ["business", "hospitality-tourism", "government"],
    creative: ["arts-design", "media", "engineering"],
    numbers: ["science", "business", "technology"],
    teaching: ["education", "media"],
    talking: ["media", "law", "education"],
    "problem-solving": ["engineering", "science", "law"],
  };
  const mappedFieldIds = new Set();
  for (const [activityId, expectedFieldIds] of Object.entries(expectedConnections)) {
    const actualFieldIds = getPossibilityFields([activityId]).map(({ id }) => id);
    assert.deepEqual(actualFieldIds, expectedFieldIds, `Unexpected mapping for ${activityId}`);
    assert.ok(actualFieldIds.length <= 3, `${activityId} maps too broadly`);
    actualFieldIds.forEach((fieldId) => {
      mappedFieldIds.add(fieldId);
      const [connection] = getActivityConnections(fieldId, [activityId]);
      assert.ok(connection?.reason, `Missing connection explanation for ${activityId} → ${fieldId}`);
    });
  }
  assert.deepEqual([...mappedFieldIds].sort(), [...fieldIds].sort());
  assert.deepEqual(getActivityConnections("technology", ["computers"]), [
    {
      activityId: "computers",
      reason: "Technology includes creating software and maintaining computer systems.",
    },
  ]);
  assert.deepEqual(getActivityConnections("technology", ["helping"]), []);
  assert.deepEqual(getActivityConnections("technology", []), []);

  const activityIds = Object.keys(expectedConnections);
  const threeActivitySpreads = [];
  for (let first = 0; first < activityIds.length; first += 1) {
    for (let second = first + 1; second < activityIds.length; second += 1) {
      for (let third = second + 1; third < activityIds.length; third += 1) {
        threeActivitySpreads.push(
          getPossibilityFields([
            activityIds[first],
            activityIds[second],
            activityIds[third],
          ]).length,
        );
      }
    }
  }
  assert.ok(
    threeActivitySpreads.reduce((total, spread) => total + spread, 0) /
      threeActivitySpreads.length <= 7,
    "Three selected activities should map to an average of no more than seven fields",
  );
});
