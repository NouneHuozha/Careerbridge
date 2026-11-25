import assert from "node:assert/strict";
import test from "node:test";
import {
  decidePathwayImportRevision,
  hashRealPathwayImportRecord,
  validateRealPathwayImportRecord,
} from "./pathway-import-validation.ts";

const source = {
  sourceKey: "official-pathway",
  sourceName: "Official Pathway Guidance",
  authority: "Example Government Authority",
  canonicalUrl: "https://example.gov/pathways",
  category: "pathways",
  sourceType: "official_public_web_page",
  dataTypes: ["pathway", "entry requirements"],
  status: "active",
};

function validRecord(overrides = {}) {
  const route = { stage: "class-10", courseStage: "class-10", catalogueGroup: "Vocational study", category: "Work-based learning" };
  const revision = {
    title: "Example pathway",
    summary: "Explore a supported learning route.",
    description: "This route describes the official programme structure.",
    publicationStatus: "draft",
    dataClassification: "real",
    verificationStatus: "pending_review",
    routeContent: {
      steps: ["Check requirements", "Complete training"],
      progression: [{ title: "Check requirements", description: "Review the official conditions." }],
      qualification: { title: "Programme outcome", description: "Confirm the award from the official source." },
      considerations: [{ title: "Requirements vary", description: "Confirm current rules for the selected programme." }],
    },
    provenance: [],
  };
  const requiredClaims = [
    "pathway.title", "pathway.summary", "pathway.description", "pathway.stage",
    "pathway.course_stage", "pathway.catalogue_group", "pathway.category", "pathway.steps",
    "pathway.progression", "pathway.qualification", "pathway.considerations",
  ];
  revision.provenance = requiredClaims.map((claimKey) => ({
    claimKey,
    sourceKey: source.sourceKey,
    sourceUrl: source.canonicalUrl,
    checkedAt: "2026-11-25",
    verificationStatus: "pending_review",
  }));
  const record = {
    kind: "pathway",
    id: "example-pathway",
    aliases: [{ sourceSystem: "careerbridge", externalType: "pathway", externalKey: "example-pathway", externalContextKey: "" }],
    route,
    revision,
    sources: [source],
    ...overrides,
  };
  if (overrides.route) record.route = { ...route, ...overrides.route };
  if (overrides.revision) record.revision = { ...revision, ...overrides.revision };
  if (overrides.sources) record.sources = overrides.sources;
  if (overrides.aliases) record.aliases = overrides.aliases;
  return record;
}

test("valid real Pathways draft includes canonical identity and claim-level evidence", () => {
  const record = validRecord();
  assert.doesNotThrow(() => validateRealPathwayImportRecord(record));
  assert.match(hashRealPathwayImportRecord(record), /^[0-9a-f]{64}$/);
});

test("canonical pathway alias is retained and cannot be silently changed", () => {
  assert.throws(() => validateRealPathwayImportRecord(validRecord({ aliases: [] })), /canonical CareerBridge pathway identity/);
  assert.throws(() => validateRealPathwayImportRecord(validRecord({
    aliases: [{ sourceSystem: "careerbridge", externalType: "pathway", externalKey: "different-id", externalContextKey: "" }],
  })), /conflicting CareerBridge pathway aliases/);
});

test("imports are real draft-only and route stages use the existing enum", () => {
  assert.throws(() => validateRealPathwayImportRecord(validRecord({ revision: { ...validRecord().revision, publicationStatus: "published" } })), /draft/);
  assert.throws(() => validateRealPathwayImportRecord(validRecord({ revision: { ...validRecord().revision, dataClassification: "demo" } })), /must be real/);
  assert.throws(() => validateRealPathwayImportRecord(validRecord({ route: { ...validRecord().route, stage: "postgraduate" } })), /route.stage/);
});

test("all required content claims need claim-level provenance", () => {
  const record = validRecord();
  record.revision.provenance = record.revision.provenance.filter((entry) => entry.claimKey !== "pathway.qualification");
  assert.throws(() => validateRealPathwayImportRecord(record), /pathway.qualification.*claim-level evidence/);
});

test("unsupported sources and mismatched source URLs are rejected", () => {
  assert.throws(() => validateRealPathwayImportRecord(validRecord({ sources: [{ ...source, sourceType: "admin_manual_entry" }] })), /sourceType/);
  const record = validRecord();
  record.revision.provenance[0].sourceUrl = "https://example.gov/different";
  assert.throws(() => validateRealPathwayImportRecord(record), /must match the referenced source URL/);
});

test("verification requires dated verified evidence for every required claim", () => {
  const record = validRecord();
  record.revision.verificationStatus = "verified";
  for (const entry of record.revision.provenance) {
    entry.verificationStatus = "verified";
    entry.verifiedAt = "2026-11-25T10:00:00Z";
  }
  assert.doesNotThrow(() => validateRealPathwayImportRecord(record));
  record.revision.provenance[0].verificationStatus = "pending_review";
  delete record.revision.provenance[0].verifiedAt;
  assert.throws(() => validateRealPathwayImportRecord(record), /verified evidence for "pathway.title"/);
});

test("hashing is key-order independent and changes when content or evidence changes", () => {
  const record = validRecord();
  const hash = hashRealPathwayImportRecord(record);
  const reordered = structuredClone(record);
  reordered.revision.routeContent = {
    considerations: record.revision.routeContent.considerations,
    qualification: record.revision.routeContent.qualification,
    progression: record.revision.routeContent.progression,
    steps: record.revision.routeContent.steps,
  };
  assert.equal(hashRealPathwayImportRecord(reordered), hash);
  const changed = structuredClone(record);
  changed.revision.summary = "A different supported route.";
  assert.notEqual(hashRealPathwayImportRecord(changed), hash);
});

test("revision decisions preserve demos and refuse conflicting open drafts", () => {
  const hash = hashRealPathwayImportRecord(validRecord());
  assert.deepEqual(decidePathwayImportRevision(hash), { action: "insert", revisionNumber: 1 });
  assert.equal(decidePathwayImportRevision(hash, { contentHash: "a".repeat(64), revisionNumber: 1, publicationStatus: "draft", dataClassification: "demo" }).action, "conflict");
  assert.equal(decidePathwayImportRevision(hash, { contentHash: "a".repeat(64), revisionNumber: 1, publicationStatus: "draft", dataClassification: "real" }).action, "conflict");
  assert.deepEqual(decidePathwayImportRevision(hash, { contentHash: "a".repeat(64), revisionNumber: 3, publicationStatus: "published", dataClassification: "real" }), { action: "create_revision", revisionNumber: 4 });
  assert.deepEqual(decidePathwayImportRevision(hash, { contentHash: hash, revisionNumber: 3, publicationStatus: "published", dataClassification: "real" }), { action: "unchanged" });
});
