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

const {
  institutionRecords,
  institutionRecordsById,
} = loadModule("./institution-registry.ts");
const {
  getProgrammeCounts,
  institutionProfilePages,
  institutionProfiles,
} = loadModule("./institution-profile-data.ts");
const {
  institutionCampusOfferings,
  resolveInstitutionOffering,
} = loadModule("../institutions/institution-data.ts");
const { courseCatalog } = loadModule("../courses/catalog/course-catalog-data.ts");

test("institution and campus identities are unique and every offering reference resolves", () => {
  assert.equal(
    new Set(institutionRecords.map((record) => record.id)).size,
    institutionRecords.length,
  );
  assert.equal(
    new Set(institutionRecords.map((record) => record.slug)).size,
    institutionRecords.length,
  );
  assert.equal(
    new Set(institutionCampusOfferings.map((offering) => offering.slug)).size,
    institutionCampusOfferings.length,
  );

  for (const institution of institutionRecords) {
    assert.equal(
      new Set(institution.campuses.map((campus) => campus.id)).size,
      institution.campuses.length,
      `Duplicate campus ID for ${institution.id}`,
    );
  }

  for (const offering of institutionCampusOfferings) {
    const resolved = resolveInstitutionOffering(offering);
    assert.equal(resolved.institution.id, offering.institutionId);
    assert.equal(resolved.campus.id, offering.campusId);
    assert.ok(
      courseCatalog.some((course) => course.id === offering.courseId),
      `Unknown course ${offering.courseId} on ${offering.id}`,
    );
  }

  assert.throws(
    () =>
      resolveInstitutionOffering({
        id: "broken",
        slug: "broken",
        institutionId: "missing",
        campusId: "missing",
        courseId: "bca",
      }),
    /unknown institution/,
  );
});

test("general institution profiles and course offerings reference the shared course catalogue", () => {
  assert.equal(institutionProfilePages.length, institutionProfiles.length);

  for (const profile of institutionProfiles) {
    assert.ok(institutionRecordsById.has(profile.institutionId));
    for (const programme of profile.programmes ?? []) {
      if (programme.courseId) {
        assert.ok(
          courseCatalog.some((course) => course.id === programme.courseId),
          `Unknown course ${programme.courseId} on ${profile.institutionId}`,
        );
      }
    }
  }
});

test("reported, recorded, and individually verified programme counts stay distinct", () => {
  const kohima = institutionProfiles.find(
    (profile) => profile.institutionId === "kohima-science-college-jotsoma",
  );
  assert.ok(kohima);

  assert.deepEqual(getProgrammeCounts(kohima), {
    reported: 13,
    recorded: 4,
    verified: 0,
  });
  assert.deepEqual(getProgrammeCounts({}), {
    reported: undefined,
    recorded: 0,
    verified: 0,
  });

  const validVerifiedProgramme = {
    name: "Test programme",
    qualification: "Degree",
    source: {
      label: "Official source",
      url: "https://example.com/programme",
      verificationStatus: "verified",
    },
    verificationStatus: "verified",
    verifiedDate: "6 November 2026",
  };
  assert.equal(
    getProgrammeCounts({ programmes: [validVerifiedProgramme] }).verified,
    1,
  );

  for (const programme of [
    { ...validVerifiedProgramme, verifiedDate: undefined },
    { ...validVerifiedProgramme, verifiedDate: "not a date" },
    {
      ...validVerifiedProgramme,
      source: { ...validVerifiedProgramme.source, verificationStatus: "outdated" },
    },
    { ...validVerifiedProgramme, verificationStatus: "outdated" },
    { ...validVerifiedProgramme, verificationStatus: "unverified" },
  ]) {
    assert.equal(
      getProgrammeCounts({ programmes: [programme] }).verified,
      0,
    );
  }
});

test("academic-year admissions are scoped to their cycle and demos remain identifiable", () => {
  const detailedOffering = resolveInstitutionOffering(
    institutionCampusOfferings.find((offering) => offering.id === "demo-01"),
  );
  assert.equal(detailedOffering.isDemo, true);
  assert.equal(
    detailedOffering.offering?.admissionCycles?.[0]?.academicYear,
    "2026–27",
  );
  assert.equal(detailedOffering.offering?.admissionCycles?.length, 1);
  assert.equal(
    institutionRecordsById.get("sample-hillside-college")?.isDemo,
    true,
  );
});
