import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDevelopmentTarget,
  buildRevisionPayload,
  demoCourseRecords,
  expectedBranchId,
  expectedHost,
  expectedProjectId,
  existingRevisionAction,
} from "./import-demo-courses.mjs";

const endpointMetadata = {
  endpoints: [
    {
      host: expectedHost,
      branch_id: expectedBranchId,
      project_id: expectedProjectId,
    },
  ],
};

test("target validation accepts only the confirmed direct development endpoint", () => {
  assert.deepEqual(
    assertDevelopmentTarget(
      `postgresql://user:secret@${expectedHost}/neondb`,
      endpointMetadata,
    ),
    {
      projectId: expectedProjectId,
      branchId: expectedBranchId,
      endpointHost: expectedHost,
    },
  );

  assert.throws(
    () =>
      assertDevelopmentTarget(
        `postgresql://user:secret@${expectedHost.replace(".ap-southeast-1", "-pooler.ap-southeast-1")}/neondb`,
        endpointMetadata,
      ),
    /verified development endpoint/,
  );
  assert.throws(
    () =>
      assertDevelopmentTarget(
        `postgresql://user:secret@${expectedHost}/neondb`,
        { endpoints: [{ ...endpointMetadata.endpoints[0], branch_id: "br-plain-frost-a1os5r9y" }] },
      ),
    /project or branch/,
  );
});

test("all 38 records map only existing catalogue and detail content", () => {
  assert.equal(demoCourseRecords.length, 38);
  assert.equal(new Set(demoCourseRecords.map(({ course }) => course.id)).size, 38);

  const bca = demoCourseRecords.find(({ course }) => course.id === "bca");
  const bcaPayload = buildRevisionPayload(bca.course, bca.detail, {
    itemId: "field-item",
    revisionId: "field-revision",
  });
  assert.equal(bcaPayload.title, bca.course.name);
  assert.equal(bcaPayload.summary, bca.course.description);
  assert.equal(bcaPayload.description, bca.detail.overview);
  assert.deepEqual(bcaPayload.courseContent, {
    learningAreas: bca.detail.learningAreas,
  });
  assert.equal(bcaPayload.dataClassification, "demo");
  assert.equal(bcaPayload.publicationStatus, "draft");
  assert.equal(bcaPayload.verificationStatus, "unverified");
  assert.equal(bcaPayload.publishedAt, null);
  assert.equal("sources" in bcaPayload, false);

  const detailed = demoCourseRecords.find(
    ({ course }) => course.id === "computer-engineering-diploma",
  );
  const detailedPayload = buildRevisionPayload(detailed.course, detailed.detail, {
    itemId: "field-item",
    revisionId: "field-revision",
  });
  assert.deepEqual(detailedPayload.courseContent, {
    learningAreas: detailed.detail.learningAreas,
    simpleExplanation: detailed.detail.simpleExplanation,
    learningExperience: detailed.detail.learningExperience,
    admission: detailed.detail.admission,
    providerDescription: detailed.detail.providerDescription,
  });
});

test("revision planning inserts missing drafts and reuses an exact prior import", () => {
  const record = demoCourseRecords.find(({ course }) => course.id === "bca");
  const expected = buildRevisionPayload(record.course, record.detail, {
    itemId: "field-item",
    revisionId: "field-revision",
  });
  assert.equal(existingRevisionAction([], expected), "insert");

  const existing = {
    revision_id: "course-revision",
    typed_revision_id: "course-revision",
    revision_number: expected.revisionNumber,
    publication_status: expected.publicationStatus,
    title: expected.title,
    summary: expected.summary,
    description: expected.description,
    data_classification: expected.dataClassification,
    verification_status: expected.verificationStatus,
    published_at: null,
    field_item_id: expected.fieldItemId,
    field_revision_id: expected.fieldRevisionId,
    qualification: expected.qualification,
    stages: expected.stages,
    entry_after_class10: expected.entryAfterClass10,
    entry_after_class12: expected.entryAfterClass12,
    is_exploration_category: expected.isExplorationCategory,
    course_content: expected.courseContent,
  };
  assert.equal(existingRevisionAction([existing], expected), "reuse");
});

test("revision planning refuses reviewed, changed, or multiple existing revisions", () => {
  const record = demoCourseRecords.find(({ course }) => course.id === "bca");
  const expected = buildRevisionPayload(record.course, record.detail, {
    itemId: "field-item",
    revisionId: "field-revision",
  });
  const reviewed = {
    revision_id: "course-revision",
    typed_revision_id: "course-revision",
    revision_number: 1,
    publication_status: "published",
    title: expected.title,
    summary: expected.summary,
    description: expected.description,
    data_classification: "real",
    verification_status: "verified",
    published_at: new Date(),
    field_item_id: expected.fieldItemId,
    field_revision_id: expected.fieldRevisionId,
    qualification: expected.qualification,
    stages: expected.stages,
    entry_after_class10: expected.entryAfterClass10,
    entry_after_class12: expected.entryAfterClass12,
    is_exploration_category: expected.isExplorationCategory,
    course_content: expected.courseContent,
  };

  assert.throws(
    () => existingRevisionAction([reviewed], expected),
    /refusing to overwrite or append/,
  );
  assert.throws(
    () => existingRevisionAction([reviewed, reviewed], expected),
    /refusing to overwrite or append/,
  );
});
