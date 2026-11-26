import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import Module from "node:module";
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

const databasePath = loadModule.resolve("../../db/institutions");
const readers = {
  getPublishedCampus: async () => null,
  getPublishedCourseOffering: async () => null,
  getPublishedInstitution: async () => null,
  listPublishedCampuses: async () => [],
  listPublishedCourseOfferings: async () => [],
  listPublishedInstitutions: async () => [],
};
const databaseModule = new Module(databasePath);
databaseModule.exports = readers;
databaseModule.loaded = true;
loadModule.cache[databasePath] = databaseModule;

const {
  getPublicCourseInstitutionOffering,
  getPublicInstitutionProfile,
  listPublicCourseInstitutionOfferings,
  listPublicInstitutionDirectory,
} = loadModule("./institution-page-data.ts");
const { institutionDetailHref } = loadModule("./institutions/institution-route-params.ts");

const institution = {
  catalogItemId: "institution-1",
  revisionId: "institution-revision-1",
  title: "North Valley College",
  summary: "Published institution summary",
  description: null,
  aliases: [],
  provenance: [],
  id: "institution-1",
  slug: "north-valley-college",
  initials: "NV",
  institutionType: "College",
  ownership: "Public",
  content: {},
};
const campus = {
  catalogItemId: "campus-1",
  revisionId: "campus-revision-1",
  title: "Main campus",
  summary: null,
  description: null,
  aliases: [],
  provenance: [],
  institutionItemId: institution.catalogItemId,
  stateId: null,
  content: { city: "North Valley" },
};
const offering = {
  catalogItemId: "offering-1",
  revisionId: "offering-revision-1",
  title: "North Valley BCA",
  summary: null,
  description: null,
  aliases: [
    {
      sourceSystem: "careerbridge",
      externalType: "institution-offering",
      externalKey: "north-valley-bca",
      externalContextKey: "bca",
    },
  ],
  provenance: [
    {
      sourceName: "North Valley official programme",
      canonicalUrl: "https://college.example/bca",
      claimKey: "offering.programme",
      checkedAt: new Date("2026-11-20T00:00:00.000Z"),
      verifiedAt: new Date("2026-11-26T00:00:00.000Z"),
      verificationStatus: "verified",
    },
    {
      sourceName: "North Valley official programme",
      canonicalUrl: "https://college.example/bca",
      claimKey: "offering.duration",
      checkedAt: new Date("2026-11-20T00:00:00.000Z"),
      verifiedAt: new Date("2026-11-26T00:00:00.000Z"),
      verificationStatus: "verified",
    },
  ],
  id: "offering-1",
  slug: "north-valley-bca",
  courseItemId: "course-bca",
  courseRevisionId: "course-revision-bca",
  campusItemId: campus.catalogItemId,
  campusRevisionId: campus.revisionId,
  institutionItemId: institution.catalogItemId,
  details: { description: "Published course description", duration: "4 years" },
};

test("public directory and profile loaders return only published-reader records", async () => {
  readers.listPublishedInstitutions = async () => [institution];
  readers.listPublishedCampuses = async () => [campus];
  readers.getPublishedInstitution = async (identifier) =>
    identifier === institution.slug ? institution : null;

  const [directory, profile, missingProfile] = await Promise.all([
    listPublicInstitutionDirectory(),
    getPublicInstitutionProfile(institution.slug),
    getPublicInstitutionProfile("missing"),
  ]);

  assert.equal(directory.length, 1);
  assert.equal(directory[0].slug, institution.slug);
  assert.equal(directory[0].campuses[0].name, campus.title);
  assert.equal(profile?.name, institution.title);
  assert.equal(missingProfile, null);
});

test("course list uses matching published offering aliases and relationships", async () => {
  readers.listPublishedCourseOfferings = async () => [
    offering,
    {
      ...offering,
      catalogItemId: "other-course",
      aliases: offering.aliases.map((alias) => ({
        ...alias,
        externalContextKey: "other-course",
      })),
    },
    {
      ...offering,
      catalogItemId: "mismatched-campus",
      campusItemId: "unrelated-campus",
    },
  ];
  readers.listPublishedInstitutions = async () => [institution];
  readers.listPublishedCampuses = async () => [campus];

  const results = await listPublicCourseInstitutionOfferings("bca");

  assert.equal(results.length, 1);
  assert.equal(results[0].slug, "north-valley-bca");
  assert.equal(results[0].courseId, "bca");
  assert.equal(results[0].institution.name, institution.title);
  assert.equal(results[0].campus.name, campus.title);
  assert.equal(results[0].offering?.programme?.value, offering.title);
  assert.equal(results[0].offering?.programme?.source?.url, "https://college.example/bca");
  assert.equal(results[0].offering?.programme?.verificationStatus, "verified");
  assert.equal(results[0].offering?.duration?.value, "4 years");
  assert.equal(results[0].offering?.description?.value, "Published course description");
});

test("course detail resolves the published offering and rejects missing course context", async () => {
  readers.getPublishedCourseOffering = async (identifier, courseId) =>
    identifier === "north-valley-bca" && courseId === "bca" ? offering : null;
  readers.getPublishedInstitution = async (identifier) =>
    identifier === institution.catalogItemId ? institution : null;
  readers.getPublishedCampus = async (identifier) =>
    identifier === campus.catalogItemId ? campus : null;

  const [detail, wrongCourse, wrongSlug] = await Promise.all([
    getPublicCourseInstitutionOffering("north-valley-bca", "bca"),
    getPublicCourseInstitutionOffering("north-valley-bca", "wrong-course"),
    getPublicCourseInstitutionOffering("missing", "bca"),
  ]);

  assert.equal(detail?.slug, "north-valley-bca");
  assert.equal(detail?.courseId, "bca");
  assert.equal(detail?.offering?.programme?.value, offering.title);
  assert.equal(wrongCourse, null);
  assert.equal(wrongSlug, null);
});

test("empty published catalogue stays empty without demo fallback", async () => {
  readers.listPublishedInstitutions = async () => [];
  readers.listPublishedCampuses = async () => [];
  readers.listPublishedCourseOfferings = async () => [];
  readers.getPublishedInstitution = async () => null;
  readers.getPublishedCourseOffering = async () => null;

  assert.deepEqual(await listPublicInstitutionDirectory(), []);
  assert.deepEqual(await listPublicCourseInstitutionOfferings("bca"), []);
  assert.equal(await getPublicInstitutionProfile("sample-hillside-college"), null);
  assert.equal(
    await getPublicCourseInstitutionOffering("demo-01", "bca"),
    null,
  );
});

test("institution detail links retain course context and return filters", () => {
  const href = institutionDetailHref({
    slug: "north-valley-bca",
    searchParams: "course=bca&field=science&stage=class-12&q=old&state=East",
    courseId: "bca",
    courseName: "BCA",
    fieldId: "science",
    stage: "class-12",
    filters: {
      q: "college",
      state: "North",
      district: "",
      type: "College",
      ownership: "",
      sort: "za",
      page: "2",
    },
  });
  const detail = new URL(href, "https://careerbridge.test");
  const returnTo = new URL(
    detail.searchParams.get("returnTo"),
    "https://careerbridge.test",
  );

  assert.equal(detail.searchParams.get("course"), "bca");
  assert.equal(detail.searchParams.get("field"), "science");
  assert.equal(detail.searchParams.get("stage"), "class-12");
  assert.equal(returnTo.searchParams.get("course"), "bca");
  assert.equal(returnTo.searchParams.get("q"), "college");
  assert.equal(returnTo.searchParams.get("state"), "North");
  assert.equal(returnTo.searchParams.get("district"), null);
  assert.equal(returnTo.searchParams.get("type"), "College");
  assert.equal(returnTo.searchParams.get("sort"), "za");
  assert.equal(returnTo.searchParams.get("page"), "2");
});
