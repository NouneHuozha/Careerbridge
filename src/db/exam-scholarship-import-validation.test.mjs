import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

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

const { validateRealExaminationImportRecord } =
  require("./examination-import-validation.ts");
const { validateRealScholarshipImportRecord } =
  require("./scholarship-import-validation.ts");

const aliases = (kind, id) => [{
  sourceSystem: "careerbridge",
  externalType: kind,
  externalKey: id,
  externalContextKey: "",
}];
const source = {
  sourceKey: "official-source",
  sourceName: "Official source",
  authority: "Official authority",
  canonicalUrl: "https://official.example/information",
  category: "catalogue",
  sourceType: "official_public_web_page",
  status: "active",
};
const provenance = (claimKeys) => claimKeys.map((claimKey) => ({
  claimKey,
  sourceKey: "official-source",
  sourceUrl: "https://official.example/information",
  checkedAt: "2026-11-26",
  verificationStatus: "pending_review",
}));

test("accepts a valid real examination draft with stage and claim provenance", () => {
  const record = {
    kind: "exam",
    id: "jee-main",
    aliases: aliases("examination", "jee-main"),
    sources: [source],
    revision: {
      title: "JEE Main",
      summary: "National engineering entrance examination",
      description: "Entrance examination for participating programmes.",
      publicationStatus: "draft",
      dataClassification: "real",
      verificationStatus: "pending_review",
      examination: {
        level: "national",
        stages: ["class-12"],
        purpose: "Admission to participating engineering programmes.",
        programmes: ["B.E./B.Tech"],
        authority: "National Testing Agency",
        regions: [],
        fields: ["engineering"],
        officialUrl: "https://official.example/information",
      },
      provenance: provenance([
        "examination.title",
        "examination.summary",
        "examination.description",
        "examination.level",
        "examination.stages",
        "examination.purpose",
        "examination.authority",
        "examination.programmes",
        "examination.fields",
        "examination.official_url",
      ]),
    },
  };

  assert.doesNotThrow(() => validateRealExaminationImportRecord(record));
});

test("rejects unsupported examination stages", () => {
  const record = {
    kind: "exam",
    id: "invalid-exam",
    aliases: aliases("examination", "invalid-exam"),
    sources: [source],
    revision: {
      title: "Invalid",
      summary: "Invalid",
      description: "Invalid",
      publicationStatus: "draft",
      dataClassification: "real",
      verificationStatus: "pending_review",
      examination: {
        level: "national",
        stages: ["class-8"],
        purpose: "Invalid",
        programmes: [],
        authority: "Official authority",
        regions: [],
        fields: [],
      },
      provenance: provenance(["examination.title"]),
    },
  };

  assert.throws(
    () => validateRealExaminationImportRecord(record),
    /revision\.examination\.stages\[0\]/,
  );
});

test("accepts valid scholarship regions and rejects missing required provenance", () => {
  const record = {
    kind: "scholarship",
    id: "test-scholarship",
    aliases: aliases("scholarship", "test-scholarship"),
    sources: [source],
    revision: {
      title: "Test scholarship",
      summary: "Test support",
      description: "Support for eligible students.",
      publicationStatus: "draft",
      dataClassification: "real",
      verificationStatus: "pending_review",
      scholarship: {
        category: "School education",
        provider: "Official authority",
        support: "Financial assistance",
        studyLevels: ["school", "higher-secondary"],
        eligibilityRegions: ["Assam", "Meghalaya"],
        status: "unknown",
        officialUrl: "https://official.example/information",
        detail: {
          benefitNotes: ["Amount not yet verified."],
          lastChecked: "2026-11-26",
          relatedCourses: [{ name: "Related course", href: "/explore/courses/test" }],
        },
      },
      provenance: provenance([
        "scholarship.title",
        "scholarship.summary",
        "scholarship.description",
        "scholarship.category",
        "scholarship.provider",
        "scholarship.support",
        "scholarship.study_levels",
        "scholarship.eligibility_regions",
        "scholarship.official_url",
        "scholarship.detail.benefitNotes",
        "scholarship.detail.lastChecked",
        "scholarship.detail.relatedCourses",
      ]),
    },
  };

  assert.doesNotThrow(() => validateRealScholarshipImportRecord(record));

  record.revision.provenance = record.revision.provenance.filter(
    (entry) => entry.claimKey !== "scholarship.provider",
  );
  assert.throws(
    () => validateRealScholarshipImportRecord(record),
    /scholarship\.provider/,
  );
});
