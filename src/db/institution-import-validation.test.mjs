import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeImportValue,
  decideImportRevision,
  hashInstitutionImportRecord,
  validateCampusImportRecord,
  validateCourseOfferingImportRecord,
  validateInstitutionImportRecord,
} from "./institution-import-validation.ts";

const ids = {
  institutionItem: "11111111-1111-4111-8111-111111111111",
  institutionRevision: "11111111-1111-4111-8111-111111111112",
  campusItem: "22222222-2222-4222-8222-222222222221",
  campusRevision: "22222222-2222-4222-8222-222222222222",
  courseItem: "33333333-3333-4333-8333-333333333331",
  courseRevision: "33333333-3333-4333-8333-333333333332",
  source: "44444444-4444-4444-8444-444444444444",
};

function institution(overrides = {}) {
  return {
    kind: "institution",
    id: "kohima-science-college-jotsoma",
    aliases: [
      {
        sourceSystem: "careerbridge",
        externalType: "institution",
        externalKey: "kohima-science-college-jotsoma",
        externalContextKey: "",
      },
    ],
    revision: {
      title: "Kohima Science College",
      summary: null,
      publicationStatus: "draft",
      dataClassification: "real",
      verificationStatus: "pending_review",
      slug: "kohima-science-college-jotsoma",
      initials: "KSC",
      institutionType: "College",
      ownership: "Government",
      content: { website: "https://college.example/" },
      provenance: [],
    },
    ...overrides,
  };
}

function institutionDependency(overrides = {}) {
  return {
    id: "kohima-science-college-jotsoma",
    catalogItemId: ids.institutionItem,
    itemType: "institution",
    publicationStatus: "published",
    dataClassification: "real",
    ...overrides,
  };
}

function campus(overrides = {}) {
  return {
    kind: "campus",
    id: "main",
    aliases: [{
      sourceSystem: "careerbridge",
      externalType: "campus",
      externalKey: "kohima-science-college-jotsoma--main",
      externalContextKey: "",
    }],
    institution: institutionDependency(),
    revision: {
      title: "Jotsoma Campus",
      publicationStatus: "draft",
      dataClassification: "real",
      verificationStatus: "pending_review",
      stateId: null,
      content: { city: "Jotsoma" },
      provenance: [],
    },
    ...overrides,
  };
}

function courseOffering(overrides = {}) {
  return {
    kind: "course_offering",
    id: "kohima-bca-offering",
    institutionId: "kohima-science-college-jotsoma",
    aliases: [{
      sourceSystem: "careerbridge",
      externalType: "institution-offering",
      externalKey: "kohima-bca-offering",
      externalContextKey: "bca",
    }, {
      sourceSystem: "careerbridge",
      externalType: "institution-offering",
      externalKey: "kohima-science-college-jotsoma",
      externalContextKey: "bca",
    }],
    campus: {
      id: "main",
      catalogItemId: ids.campusItem,
      revisionId: ids.campusRevision,
      itemType: "campus",
      institution: institutionDependency(),
      publicationStatus: "published",
      dataClassification: "real",
    },
    course: {
      id: "bca",
      catalogItemId: ids.courseItem,
      revisionId: ids.courseRevision,
      itemType: "course",
      publicationStatus: "published",
      dataClassification: "real",
    },
    revision: {
      title: "BCA at Jotsoma",
      slug: "kohima-bca",
      publicationStatus: "draft",
      dataClassification: "real",
      verificationStatus: "pending_review",
      details: { studyMode: "Full-time" },
      provenance: [],
    },
    ...overrides,
  };
}

function evidence(claimKey, verificationStatus = "pending_review") {
  return {
    claimKey,
    sourceId: ids.source,
    sourceUrl: "https://college.example/admissions",
    checkedAt: verificationStatus === "verified" ? "2026-11-20" : null,
    verifiedAt: verificationStatus === "verified" ? "2026-11-21" : null,
    verificationStatus,
  };
}

test("valid institution, campus, and offering records pass validation", () => {
  assert.doesNotThrow(() => validateInstitutionImportRecord(institution()));
  assert.doesNotThrow(() => validateCampusImportRecord(campus()));
  assert.doesNotThrow(() => validateCourseOfferingImportRecord(courseOffering()));
});

test("PostgreSQL UUIDs with non-RFC version and variant bits are accepted", () => {
  const record = courseOffering({
    course: {
      ...courseOffering().course,
      catalogItemId: "567931b0-a9d8-931b-1cfa-b3df49f01c6e",
    },
  });
  assert.doesNotThrow(() => validateCourseOfferingImportRecord(record));
});

test("institution typed fields and source references are validated", () => {
  const record = institution({
    sources: [{
      sourceKey: "college-site",
      sourceName: "College website",
      authority: "Kohima Science College",
      canonicalUrl: "https://college.example/",
      category: "institution",
      sourceType: "official_public_web_page",
    }],
    revision: {
      ...institution().revision,
      provenance: [{
        claimKey: "institution.website",
        sourceKey: "college-site",
        sourceUrl: "https://college.example/",
        verificationStatus: "pending_review",
      }],
    },
  });
  assert.doesNotThrow(() => validateInstitutionImportRecord(record));
  assert.throws(
    () => validateInstitutionImportRecord({
      ...record,
      revision: { ...record.revision, slug: "different-stable-id" },
    }),
    /revision.slug: must match the stable institution ID/,
  );
  assert.throws(
    () => validateInstitutionImportRecord({
      ...record,
      revision: {
        ...record.revision,
        provenance: [{ ...record.revision.provenance[0], sourceKey: "missing-source" }],
      },
    }),
    /revision.provenance\[0\].sourceKey: must reference a source in record.sources/,
  );
  assert.throws(
    () => validateInstitutionImportRecord({
      ...record,
      sources: [{ ...record.sources[0], canonicalUrl: "javascript:alert(1)" }],
    }),
    /sources\[0\].canonicalUrl: must be an absolute HTTP\(S\) URL/,
  );
});

test("required fields, identifiers, enums, and draft-only imports are checked", () => {
  assert.throws(
    () => validateInstitutionImportRecord(institution({ revision: { title: " ", publicationStatus: "draft" } })),
    /revision.title: must be a non-empty string/,
  );
  assert.throws(
    () => validateCampusImportRecord(campus({
      institution: institutionDependency({ catalogItemId: "not-a-uuid" }),
    })),
    /record.institution.catalogItemId: must be a UUID/,
  );
  assert.throws(
    () => validateInstitutionImportRecord(institution({
      revision: { ...institution().revision, publicationStatus: "published" },
    })),
    /imports may only create draft revisions/,
  );
  assert.throws(
    () => validateInstitutionImportRecord(institution({
      revision: { ...institution().revision, dataClassification: "pending_review" },
    })),
    /revision.dataClassification: must be one of/,
  );
});

test("real offering references must identify matching published real course and campus records", () => {
  assert.throws(
    () => validateCourseOfferingImportRecord(courseOffering({
      course: {
        ...courseOffering().course,
        dataClassification: "demo",
      },
    })),
    /a real offering requires a published real course revision/,
  );
  assert.throws(
    () => validateCourseOfferingImportRecord(courseOffering({
      campus: {
        ...courseOffering().campus,
        institution: institutionDependency({ id: "another-institution" }),
      },
    })),
    /does not match record.institutionId/,
  );
  assert.throws(
    () => validateCourseOfferingImportRecord(courseOffering({
      campus: { ...courseOffering().campus, itemType: "institution" },
    })),
    /record.campus.itemType: must be "campus"/,
  );
  assert.throws(
    () => validateCampusImportRecord(campus({
      revision: { ...campus().revision, dataClassification: "real" },
      institution: institutionDependency({ dataClassification: "demo" }),
    })),
    /a real campus cannot belong to a demo or test institution/,
  );
});

test("real admission and financial claims require claim-level source provenance", () => {
  assert.throws(
    () => validateCourseOfferingImportRecord(courseOffering({
      revision: {
        ...courseOffering().revision,
        details: { fees: "₹40,000 per year" },
      },
    })),
    /requires claim-level provenance/,
  );
  assert.throws(
    () => validateCourseOfferingImportRecord(courseOffering({
      revision: {
        ...courseOffering().revision,
        details: { eligibility: "Class 12 pass" },
        verificationStatus: "verified",
        provenance: [evidence("offering.eligibility", "pending_review")],
      },
    })),
    /cannot be part of a verified revision without verified claim-level evidence/,
  );
  assert.throws(
    () => validateCourseOfferingImportRecord(courseOffering({
      revision: {
        ...courseOffering().revision,
        details: { fees: "₹40,000 per year" },
        provenance: [{
          claimKey: "offering.fees",
          sourceUrl: "https://college.example/fees",
          verificationStatus: "verified",
        }],
      },
    })),
    /verified evidence requires supplied checkedAt and verifiedAt dates/,
  );
});

test("unverified admission and financial claims stay explicitly unverified", () => {
  const record = courseOffering({
    revision: {
      ...courseOffering().revision,
      details: {
        eligibility: "Class 12 pass",
        admissionCycles: [{ admissionProcess: "Apply online" }],
        fees: "₹40,000 per year",
      },
      provenance: [
        evidence("offering.eligibility"),
        evidence("offering.admission_cycles[0].admission_process"),
        evidence("offering.fees"),
      ],
    },
  });

  assert.doesNotThrow(() => validateCourseOfferingImportRecord(record));
  assert.equal(record.revision.provenance.every((entry) => entry.verificationStatus === "pending_review"), true);
  assert.equal(record.revision.provenance.every((entry) => entry.verifiedAt === null), true);
});

test("canonical hashing ignores object key order but preserves array order and meaningful text", () => {
  const left = institution({
    revision: {
      ...institution().revision,
      content: { website: "https://college.example/", facts: { location: "Jotsoma", founded: 1961 } },
    },
  });
  const right = institution({
    revision: {
      ...institution().revision,
      content: { facts: { founded: 1961, location: "Jotsoma" }, website: "https://college.example/" },
    },
  });
  assert.equal(hashInstitutionImportRecord(left), hashInstitutionImportRecord(right));
  assert.notEqual(
    hashInstitutionImportRecord(left),
    hashInstitutionImportRecord({ ...left, revision: { ...left.revision, content: { ...left.revision.content, website: " https://college.example/" } } }),
  );
  assert.equal(
    canonicalizeImportValue({ b: 2, a: [1, 2] }),
    canonicalizeImportValue({ a: [1, 2], b: 2 }),
  );
});

test("null, empty, and omitted optional values remain distinct in hashes", () => {
  const omitted = institution({ revision: { ...institution().revision } });
  delete omitted.revision.summary;
  const nullSummary = institution({ revision: { ...institution().revision, summary: null } });
  const emptySummary = institution({ revision: { ...institution().revision, summary: "" } });
  assert.notEqual(hashInstitutionImportRecord(omitted), hashInstitutionImportRecord(nullSummary));
  assert.notEqual(hashInstitutionImportRecord(nullSummary), hashInstitutionImportRecord(emptySummary));
  assert.notEqual(
    hashInstitutionImportRecord(institution({ revision: { ...institution().revision, content: { optional: null } } })),
    hashInstitutionImportRecord(institution({ revision: { ...institution().revision, content: { optional: "" } } })),
  );
  assert.throws(() => canonicalizeImportValue({ optional: undefined }), /JSON-compatible values/);
});

test("legacy institution-offering aliases are retained alongside a course-bound canonical alias", () => {
  const legacyContext = courseOffering({
    aliases: [{
      sourceSystem: "careerbridge",
      externalType: "institution-offering",
      externalKey: "kohima-bca-offering",
      externalContextKey: "bca",
    }, {
      sourceSystem: "careerbridge",
      externalType: "institution-offering",
      externalKey: "kohima-science-college-jotsoma",
      externalContextKey: "",
    }],
  });
  assert.doesNotThrow(() => validateCourseOfferingImportRecord(legacyContext));
  assert.doesNotThrow(() => validateCourseOfferingImportRecord(courseOffering()));
  assert.throws(
    () => validateCourseOfferingImportRecord(courseOffering({
      aliases: [{
        sourceSystem: "careerbridge",
        externalType: "institution-offering",
        externalKey: "kohima-bca-offering",
        externalContextKey: "bsc",
      }],
    })),
    /offering context must match the offering's canonical course ID/,
  );
});

test("revision decisions skip identical content and never overwrite published revisions", () => {
  const hash = hashInstitutionImportRecord(institution());
  assert.deepEqual(decideImportRevision(hash, "real"), {
    action: "insert",
    revisionNumber: 1,
  });
  assert.deepEqual(
    decideImportRevision(hash, "real", {
      contentHash: hash,
      revisionNumber: 3,
      publicationStatus: "published",
      dataClassification: "real",
    }),
    { action: "unchanged" },
  );
  assert.deepEqual(
    decideImportRevision("a".repeat(64), "real", {
      contentHash: hash,
      revisionNumber: 3,
      publicationStatus: "published",
      dataClassification: "real",
    }),
    { action: "create_revision", revisionNumber: 4 },
  );
  assert.equal(
    decideImportRevision("a".repeat(64), "real", {
      contentHash: hash,
      revisionNumber: 3,
      publicationStatus: "draft",
      dataClassification: "real",
    }).action,
    "conflict",
  );
});
