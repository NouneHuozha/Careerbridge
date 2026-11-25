import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeCourseImportValue,
  decideCourseImportRevision,
  hashRealCourseImportRecord,
  validateRealCourseImportRecord,
} from "./course-import-validation.ts";

const field = {
  id: "technology",
  catalogItemId: "11111111-1111-4111-8111-111111111111",
  revisionId: "11111111-1111-4111-8111-111111111112",
  itemType: "field",
  publicationStatus: "published",
  dataClassification: "real",
};

function validBca(overrides = {}) {
  const record = {
    kind: "course",
    id: "bca",
    aliases: [
      {
        sourceSystem: "careerbridge",
        externalType: "course",
        externalKey: "bca",
        externalContextKey: "",
      },
      {
        sourceSystem: "aishe",
        externalType: "course",
        externalKey: "BCA-EXAMPLE",
        externalContextKey: "",
      },
    ],
    field,
    revision: {
      title: "Bachelor of Computer Applications (BCA)",
      summary: "Explore computing, programming and computer applications.",
      description: "BCA introduces computing through programming, software and the systems people use every day.",
      publicationStatus: "draft",
      dataClassification: "real",
      verificationStatus: "pending_review",
      qualification: "Degree",
      stages: ["class-12"],
      entryAfterClass10: "",
      entryAfterClass12: "Entry after Class 12",
      isExplorationCategory: false,
      courseContent: {
        learningAreas: [
          { title: "Programming", description: "Write and test instructions that solve defined problems." },
          { title: "Data and databases", description: "Organise information and understand how software stores and retrieves it." },
        ],
      },
      provenance: [
        { claimKey: "course.qualification", verificationStatus: "pending_review", sourceUrl: "https://example.test/course-guidelines", checkedAt: "2026-11-24" },
        { claimKey: "course.entry_after_class12", verificationStatus: "pending_review", sourceUrl: "https://example.test/course-guidelines", checkedAt: "2026-11-24" },
      ],
    },
    sources: [],
    ...overrides,
  };
  if (overrides.revision) record.revision = overrides.revision;
  if (overrides.sources) record.sources = overrides.sources;
  if (overrides.aliases) record.aliases = overrides.aliases;
  if (overrides.field) record.field = overrides.field;
  return record;
}

test("valid BCA-shaped real draft passes validation", () => {
  assert.doesNotThrow(() => validateRealCourseImportRecord(validBca()));
  assert.match(hashRealCourseImportRecord(validBca()), /^[0-9a-f]{64}$/);
});

test("course identity and canonical alias are required", () => {
  assert.throws(
    () => validateRealCourseImportRecord(validBca({ id: "" })),
    /record\.id/,
  );
  assert.throws(
    () =>
      validateRealCourseImportRecord(validBca({
        aliases: [{ sourceSystem: "careerbridge", externalType: "course", externalKey: "wrong", externalContextKey: "" }],
      })),
    /conflicting CareerBridge course aliases/,
  );
  assert.throws(
    () =>
      validateRealCourseImportRecord(validBca({
        aliases: [{ sourceSystem: "careerbridge", externalType: "institution", externalKey: "bca", externalContextKey: "" }],
      })),
    /revision\.externalType|externalType/,
  );
});

test("published-real field dependency is required", () => {
  for (const fieldUpdate of [
    { publicationStatus: "draft" },
    { dataClassification: "demo" },
    { itemType: "institution" },
  ]) {
    assert.throws(
      () => validateRealCourseImportRecord(validBca({
        field: { ...field, ...fieldUpdate },
      })),
      /field\./,
    );
  }
  assert.throws(
    () => validateRealCourseImportRecord(validBca({ field: null })),
    /field/,
  );
});

test("PostgreSQL UUID values are accepted without RFC version or variant restrictions", () => {
  const record = validBca({
    field: {
      ...field,
      catalogItemId: "4b67cf01-e856-32d0-5679-dd3a6896dba5",
      revisionId: "8ee3b1d6-249d-451a-b416-358bed56273f",
    },
  });
  assert.doesNotThrow(() => validateRealCourseImportRecord(record));
  assert.throws(
    () => validateRealCourseImportRecord({
      ...record,
      field: { ...record.field, catalogItemId: "4b67cf01-e856-32d0-5679-dd3a6896dba" },
    }),
    /field\.catalogItemId: must be a UUID/,
  );
});

test("qualification and stage enums are exact", () => {
  assert.throws(
    () => validateRealCourseImportRecord(validBca({
      revision: { ...validBca().revision, qualification: "Bachelor" },
    })),
    /revision\.qualification/,
  );
  assert.throws(
    () => validateRealCourseImportRecord(validBca({
      revision: { ...validBca().revision, stages: ["postgraduate"] },
    })),
    /revision\.stages/,
  );
  assert.throws(
    () => validateRealCourseImportRecord(validBca({
      revision: { ...validBca().revision, stages: ["class-12", "class-12"] },
    })),
    /duplicate stages/,
  );
  assert.throws(
    () => validateRealCourseImportRecord(validBca({
      revision: { ...validBca().revision, stages: [] },
    })),
    /revision\.stages/,
  );
});

test("learningAreas and optional content properties have strict shapes", () => {
  assert.throws(
    () => validateRealCourseImportRecord(validBca({
      revision: { ...validBca().revision, courseContent: {} },
    })),
    /learningAreas/,
  );
  assert.throws(
    () => validateRealCourseImportRecord(validBca({
      revision: {
        ...validBca().revision,
        courseContent: { learningAreas: [{ title: "Programming" }] },
      },
    })),
    /description/,
  );
  assert.throws(
    () => validateRealCourseImportRecord(validBca({
      revision: {
        ...validBca().revision,
        courseContent: { learningAreas: validBca().revision.courseContent.learningAreas, admission: 42 },
      },
    })),
    /courseContent\.admission/,
  );
  assert.throws(
    () => validateRealCourseImportRecord(validBca({
      revision: {
        ...validBca().revision,
        courseContent: {
          learningAreas: validBca().revision.courseContent.learningAreas,
          learningExperience: [{ title: "", description: "Study." }],
        },
      },
    })),
    /learningExperience\[0\]\.title/,
  );
});

test("draft-only real-course import is enforced", () => {
  for (const publicationStatus of ["in_review", "approved", "published", "archived", "rejected"]) {
    assert.throws(
      () => validateRealCourseImportRecord(validBca({
        revision: { ...validBca().revision, publicationStatus },
      })),
      /revision\.publicationStatus/,
    );
  }
  assert.throws(
    () => validateRealCourseImportRecord(validBca({
      revision: { ...validBca().revision, dataClassification: "demo" },
    })),
    /revision\.dataClassification/,
  );
});

test("source registry metadata uses exact implementation enums", () => {
  const source = {
    sourceKey: "ugc-recognition",
    sourceName: "University Grants Commission recognition FAQ",
    authority: "University Grants Commission",
    canonicalUrl: "https://www.ugc.gov.in/Home/faq",
    normalizedUrl: "https://www.ugc.gov.in/Home/faq",
    category: "institution_recognition",
    sourceType: "official_public_web_page",
    dataTypes: ["institution-recognition"],
    status: "active",
  };
  assert.doesNotThrow(() => validateRealCourseImportRecord(validBca({ sources: [source] })));
  assert.throws(
    () => validateRealCourseImportRecord(validBca({ sources: [{ ...source, sourceType: "blog" }] })),
    /sourceType/,
  );
  assert.throws(
    () => validateRealCourseImportRecord(validBca({ sources: [{ ...source, status: "unknown" }] })),
    /status/,
  );
  assert.throws(
    () => validateRealCourseImportRecord(validBca({ sources: [{ ...source, canonicalUrl: "https://x.test", normalizedUrl: null }] })),
    /canonicalUrl and normalizedUrl/,
  );
});

test("verified provenance requires URL, checked date and verified date", () => {
  const sourceUrl = "https://example.test/course-guidelines";
  assert.doesNotThrow(() =>
    validateRealCourseImportRecord(validBca({
      revision: {
        ...validBca().revision,
        provenance: [{
          claimKey: "course.qualification",
          sourceUrl,
          checkedAt: "2026-11-24",
          verifiedAt: "2026-11-24T10:00:00Z",
          verificationStatus: "verified",
        }, {
          claimKey: "course.entry_after_class12",
          sourceUrl,
          checkedAt: "2026-11-24",
          verifiedAt: "2026-11-24T10:00:00Z",
          verificationStatus: "verified",
        }],
      },
    })),
  );
  assert.throws(
    () =>
      validateRealCourseImportRecord(validBca({
        revision: {
          ...validBca().revision,
          provenance: [{
            claimKey: "course.entry_requirements",
            checkedAt: "2026-11-24",
            verifiedAt: "2026-11-24",
            verificationStatus: "verified",
          }],
        },
      })),
    /sourceUrl/,
  );
  assert.throws(
    () =>
      validateRealCourseImportRecord(validBca({
        revision: {
          ...validBca().revision,
          provenance: [{
            claimKey: "course.entry_requirements",
            sourceUrl,
            checkedAt: null,
            verifiedAt: null,
            verificationStatus: "verified",
          }],
        },
      })),
    /checkedAt and verifiedAt/,
  );
});

test("non-verified provenance rejects verified_at", () => {
  assert.throws(
    () =>
      validateRealCourseImportRecord(validBca({
        revision: {
          ...validBca().revision,
          provenance: [{
            claimKey: "course.entry_requirements",
            sourceUrl: "https://example.test/course-guidelines",
            checkedAt: "2026-11-24",
            verifiedAt: "2026-11-24",
            verificationStatus: "pending_review",
          }],
        },
      })),
    /verifiedAt/,
  );
});

test("provenance sourceKey must exist in the source list", () => {
  assert.throws(
    () =>
      validateRealCourseImportRecord(validBca({
        revision: {
          ...validBca().revision,
          provenance: [{
            claimKey: "course.entry_requirements",
            sourceKey: "missing-source",
            verificationStatus: "pending_review",
          }],
        },
      })),
    /sourceKey/,
  );
});

test("canonical hashing ignores object key order but preserves array order", () => {
  const first = validBca();
  const second = validBca({
    revision: {
      ...validBca().revision,
      courseContent: {
        learningAreas: [...validBca().revision.courseContent.learningAreas].reverse(),
      },
    },
  });
  assert.notEqual(hashRealCourseImportRecord(first), hashRealCourseImportRecord(second));
  assert.equal(
    canonicalizeCourseImportValue({ b: 2, a: 1 }),
    canonicalizeCourseImportValue({ a: 1, b: 2 }),
  );
});

test("duplicate identical content is unchanged", () => {
  const hash = hashRealCourseImportRecord(validBca());
  assert.deepEqual(
    decideCourseImportRevision(hash, {
      contentHash: hash,
      revisionNumber: 1,
      publicationStatus: "draft",
      dataClassification: "real",
    }),
    { action: "unchanged" },
  );
});

test("conflicting content and lifecycle states are rejected safely", () => {
  const hash = hashRealCourseImportRecord(validBca());
  assert.deepEqual(
    decideCourseImportRevision(hash, {
      contentHash: "a".repeat(64),
      revisionNumber: 1,
      publicationStatus: "draft",
      dataClassification: "real",
    }),
    {
      action: "conflict",
      reason: "A non-published revision exists with different content; resolve it before importing again.",
    },
  );
  assert.deepEqual(
    decideCourseImportRevision(hash, {
      contentHash: "a".repeat(64),
      revisionNumber: 2,
      publicationStatus: "published",
      dataClassification: "real",
    }),
    { action: "create_revision", revisionNumber: 3 },
  );
  assert.deepEqual(
    decideCourseImportRevision(hash, {
      contentHash: hash,
      revisionNumber: 1,
      publicationStatus: "archived",
      dataClassification: "real",
    }),
    { action: "unchanged" },
  );
  assert.deepEqual(
    decideCourseImportRevision(hash, {
      contentHash: "b".repeat(64),
      revisionNumber: 1,
      publicationStatus: "archived",
      dataClassification: "real",
    }),
    { action: "create_revision", revisionNumber: 2 },
  );
});

test("demo and test existing revisions cannot be converted to real", () => {
  const hash = hashRealCourseImportRecord(validBca());
  for (const dataClassification of ["demo", "test"]) {
    assert.match(
      decideCourseImportRevision(hash, {
        contentHash: "a".repeat(64),
        revisionNumber: 1,
        publicationStatus: "draft",
        dataClassification,
      }).reason,
      /converting demo or test/,
    );
  }
});

test("invalid hashes and revision numbers are rejected", () => {
  assert.throws(
    () => decideCourseImportRevision("not-a-hash"),
    /contentHash/,
  );
  assert.throws(
    () => decideCourseImportRevision("a".repeat(64), {
      contentHash: "a".repeat(64),
      revisionNumber: 0,
      publicationStatus: "draft",
      dataClassification: "real",
    }),
    /revisionNumber/,
  );
});

test("conflicting CareerBridge course aliases are rejected", () => {
  assert.throws(
    () => validateRealCourseImportRecord(validBca({
      aliases: [
        { sourceSystem: "careerbridge", externalType: "course", externalKey: "bca", externalContextKey: "" },
        { sourceSystem: "careerbridge", externalType: "course", externalKey: "bcom", externalContextKey: "" },
      ],
    })),
    /conflicting CareerBridge course aliases/,
  );
});

test("actionable course claims require matching provenance", () => {
  const ordinary = validBca({
    revision: {
      ...validBca().revision,
      entryAfterClass12: "",
      provenance: [{ claimKey: "course.qualification", verificationStatus: "pending_review", sourceUrl: "https://example.test/course-guidelines", checkedAt: "2026-11-24" }],
    },
  });
  assert.doesNotThrow(() => validateRealCourseImportRecord(ordinary));

  assert.throws(
    () => validateRealCourseImportRecord(validBca({
      revision: {
        ...validBca().revision,
        entryAfterClass12: "Entry after Class 12",
        provenance: [{ claimKey: "course.qualification", verificationStatus: "pending_review", sourceUrl: "https://example.test/course-guidelines", checkedAt: "2026-11-24" }],
      },
    })),
    /course\.entry_after_class12/,
  );

  assert.throws(
    () => validateRealCourseImportRecord(validBca({
      revision: {
        ...validBca().revision,
        courseContent: {
          learningAreas: validBca().revision.courseContent.learningAreas,
          admission: "Applications open in May",
        },
        provenance: [],
      },
    })),
    /course\.qualification/,
  );
});

test("verified revision status requires verified evidence for every actionable claim", () => {
  assert.throws(
    () => validateRealCourseImportRecord(validBca({
      revision: {
        ...validBca().revision,
        verificationStatus: "verified",
        provenance: [
          { claimKey: "course.qualification", verificationStatus: "pending_review", sourceUrl: "https://example.test/course-guidelines", checkedAt: "2026-11-24" },
          { claimKey: "course.entry_after_class12", verificationStatus: "verified", sourceUrl: "https://example.test/course-guidelines", checkedAt: "2026-11-24", verifiedAt: "2026-11-24" },
        ],
      },
    })),
    /verified claim-level evidence.*course\.qualification/,
  );

  assert.doesNotThrow(() =>
    validateRealCourseImportRecord(validBca({
      revision: {
        ...validBca().revision,
        verificationStatus: "verified",
        provenance: [
          { claimKey: "course.qualification", verificationStatus: "verified", sourceUrl: "https://example.test/course-guidelines", checkedAt: "2026-11-24", verifiedAt: "2026-11-24" },
          { claimKey: "course.entry_after_class12", verificationStatus: "verified", sourceUrl: "https://example.test/course-guidelines", checkedAt: "2026-11-24", verifiedAt: "2026-11-24" },
        ],
      },
    })),
  );
});

test("sourceKey provenance validates supplied URL consistency", () => {
  const source = {
    sourceKey: "course-source",
    sourceName: "Official course guidelines",
    canonicalUrl: "https://example.test/guidelines",
    normalizedUrl: "https://example.test/guidelines",
    category: "course_guidelines",
    sourceType: "official_public_web_page",
    status: "active",
  };
  assert.doesNotThrow(() =>
    validateRealCourseImportRecord(validBca({
      sources: [source],
      revision: {
        ...validBca().revision,
        provenance: [
          { claimKey: "course.qualification", sourceKey: "course-source", sourceUrl: "https://example.test/guidelines", checkedAt: "2026-11-24", verificationStatus: "pending_review" },
          { claimKey: "course.entry_after_class12", sourceKey: "course-source", sourceUrl: "https://example.test/guidelines", checkedAt: "2026-11-24", verificationStatus: "pending_review" },
        ],
      },
    })),
  );
  assert.throws(
    () =>
      validateRealCourseImportRecord(validBca({
        sources: [source],
        revision: {
          ...validBca().revision,
          provenance: [
            { claimKey: "course.qualification", sourceKey: "course-source", sourceUrl: "https://example.test/conflicting", checkedAt: "2026-11-24", verificationStatus: "pending_review" },
            { claimKey: "course.entry_after_class12", sourceKey: "course-source", sourceUrl: "https://example.test/guidelines", checkedAt: "2026-11-24", verificationStatus: "pending_review" },
          ],
        },
      })),
    /sourceUrl.*canonicalUrl or normalizedUrl/,
  );
});

test("complete lifecycle decision table covers draft, review, approved, published, archived and rejected", () => {
  const hash = hashRealCourseImportRecord(validBca());
  const cases = [
    ["draft", hash, { action: "unchanged" }],
    ["draft", "a".repeat(64), { action: "conflict", reason: "A non-published revision exists with different content; resolve it before importing again." }],
    ["in_review", "a".repeat(64), { action: "conflict", reason: "A non-published revision exists with different content; resolve it before importing again." }],
    ["approved", "a".repeat(64), { action: "conflict", reason: "A non-published revision exists with different content; resolve it before importing again." }],
    ["published", hash, { action: "unchanged" }],
    ["published", "a".repeat(64), { action: "create_revision", revisionNumber: 3 }],
    ["archived", hash, { action: "unchanged" }],
    ["archived", "a".repeat(64), { action: "create_revision", revisionNumber: 3 }],
    ["rejected", "a".repeat(64), { action: "create_revision", revisionNumber: 3 }],
  ];
  for (const [status, existingHash, expected] of cases) {
    const actual = decideCourseImportRevision(hash, {
      contentHash: existingHash,
      revisionNumber: 2,
      publicationStatus: status,
      dataClassification: "real",
    });
    assert.deepEqual(actual, expected);
  }
});

test("fingerprint changes with revision and provenance verification metadata", () => {
  const base = validBca();
  const baseHash = hashRealCourseImportRecord(base);

  const verifiedRevision = validBca({
    revision: {
      ...validBca().revision,
      verificationStatus: "verified",
      provenance: [
        { claimKey: "course.qualification", verificationStatus: "verified", sourceUrl: "https://example.test/course-guidelines", checkedAt: "2026-11-24", verifiedAt: "2026-11-24" },
        { claimKey: "course.entry_after_class12", verificationStatus: "verified", sourceUrl: "https://example.test/course-guidelines", checkedAt: "2026-11-24", verifiedAt: "2026-11-24" },
      ],
    },
  });
  assert.notEqual(hashRealCourseImportRecord(verifiedRevision), baseHash);

  const changedVerifiedAt = validBca({
    revision: {
      ...validBca().revision,
      provenance: [
        { claimKey: "course.qualification", verificationStatus: "verified", sourceUrl: "https://example.test/course-guidelines", checkedAt: "2026-11-24", verifiedAt: "2026-11-25" },
        { claimKey: "course.entry_after_class12", verificationStatus: "verified", sourceUrl: "https://example.test/course-guidelines", checkedAt: "2026-11-24", verifiedAt: "2026-11-25" },
      ],
    },
  });
  assert.notEqual(hashRealCourseImportRecord(changedVerifiedAt), baseHash);
});

