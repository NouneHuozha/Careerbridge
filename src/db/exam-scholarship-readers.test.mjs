import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");
const { PgDialect } = require("drizzle-orm/pg-core");
const { getTableName } = require("drizzle-orm");
const dialect = new PgDialect();
let activeDatabase;

require.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = require("node:fs");
  const output = ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "./client" && /src[\\/]db[\\/](examinations|scholarships)\.ts$/.test(parent?.filename ?? "")) {
    return { getDb: () => activeDatabase };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const examinations = require("./examinations.ts");
const scholarships = require("./scholarships.ts");
Module._load = originalLoad;

function compile(expression) {
  return dialect.sqlToQuery(expression);
}
function createDatabase(responses) {
  const state = { responses: [...responses], queries: [] };
  class Query {
    constructor(selection) {
      this.innerJoins = [];
      this.leftJoins = [];
      this.query = { selection, innerJoins: this.innerJoins, leftJoins: this.leftJoins };
      state.queries.push(this.query);
    }
    from(table) { this.query.from = getTableName(table); return this; }
    innerJoin(table, condition) { this.innerJoins.push({ table: getTableName(table), ...compile(condition) }); return this; }
    leftJoin(table, condition) { this.leftJoins.push({ table: getTableName(table), ...compile(condition) }); return this; }
    where(condition) { this.query.where = compile(condition); return this; }
    orderBy(...expressions) { this.query.orderBy = expressions.map(compile); return this; }
    then(resolve, reject) {
      const response = state.responses.shift() ?? [];
      return Promise.resolve(typeof response === "function" ? response() : response).then(resolve, reject);
    }
  }
  return { state, database: { select(selection) { return new Query(selection); } } };
}
function setDatabase(responses) {
  const mock = createDatabase(responses);
  activeDatabase = mock.database;
  return mock.state;
}
function examRow(overrides = {}) {
  return {
    catalogItemId: "exam-item-1", revisionId: "exam-revision-1", revisionNumber: 3,
    title: "Sample entrance exam", summary: "A summary", publicationStatus: "published",
    dataClassification: "real", verificationStatus: "verified", level: "national",
    stages: ["class-12"], purpose: "Admission to specified programmes.",
    programmes: ["Example degree"], authority: "Official Test Authority", regions: [], fields: ["technology"],
    officialUrl: "https://authority.example/exam", aliasSourceSystem: "careerbridge",
    aliasExternalType: "examination", aliasExternalKey: "canonical-exam", aliasExternalContextKey: "",
    sourceId: "source-1", sourceName: "Official exam notice", sourceAuthority: "Authority",
    canonicalUrl: "https://authority.example/notice", normalizedUrl: "https://authority.example/notice",
    sourceType: "official", sourceStatus: "active", claimKey: "examination.purpose",
    checkedAt: new Date("2026-11-20T00:00:00Z"), verifiedAt: new Date("2026-11-21T00:00:00Z"),
    sourceVerificationStatus: "verified", ...overrides,
  };
}
function scholarshipRow(overrides = {}) {
  return {
    catalogItemId: "scholarship-item-1", revisionId: "scholarship-revision-2", revisionNumber: 2,
    title: "Sample scholarship", summary: "Support for eligible students.", publicationStatus: "published",
    dataClassification: "real", verificationStatus: "verified", category: "Merit assistance",
    provider: "Education Authority", support: "Financial assistance; amount not specified.",
    studyLevels: ["higher-secondary", "undergraduate"], eligibilityRegions: ["Assam", "Nagaland"],
    scholarshipStatus: "unknown", officialUrl: "https://authority.example/scholarship",
    detail: { benefitNotes: ["Check the official scheme notice."], eligibility: [{ title: "Eligibility", description: "As stated by the provider." }] },
    aliasSourceSystem: "careerbridge", aliasExternalType: "scholarship", aliasExternalKey: "canonical-scholarship", aliasExternalContextKey: "",
    sourceId: "source-2", sourceName: "Official scheme notice", sourceAuthority: "Authority",
    canonicalUrl: "https://authority.example/scheme", normalizedUrl: "https://authority.example/scheme",
    sourceType: "official", sourceStatus: "active", claimKey: "scholarship.eligibility",
    checkedAt: new Date("2026-11-19T00:00:00Z"), verifiedAt: new Date("2026-11-21T00:00:00Z"),
    sourceVerificationStatus: "verified", ...overrides,
  };
}

const envBefore = { nodeEnv: process.env.NODE_ENV, vercel: process.env.VERCEL, vercelEnv: process.env.VERCEL_ENV };
function restoreEnv() {
  for (const [key, value] of Object.entries({ NODE_ENV: envBefore.nodeEnv, VERCEL: envBefore.vercel, VERCEL_ENV: envBefore.vercelEnv })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
function assertPublishedQuery(query, type) {
  assert.match(query.where.sql, /"catalog_items"\."item_type" =/);
  assert.match(query.where.sql, /"catalog_items"\."published_revision_id" is not null/);
  assert.match(query.where.sql, /"catalog_item_revisions"\."publication_status" =/);
  assert.match(query.where.sql, /"catalog_item_revisions"\."data_classification" =/);
  assert.match(query.where.sql, /"catalog_item_revisions"\."verification_status" =/);
  assert.deepEqual(query.where.params, [type, "published", "real", "verified"]);
  assert.match(query.innerJoins[0].sql, /"catalog_item_revisions"\."id".*"catalog_items"\."published_revision_id"/);
  assert.ok(query.leftJoins.some((join) => join.table === "catalog_revision_sources"));
  assert.ok(query.leftJoins.some((join) => join.table === "source_registry"));
}

test("published Examination reader maps canonical alias and claim-level evidence", async () => {
  const state = setDatabase([[examRow()]]);
  const rows = await examinations.listPublishedExaminations();
  assert.equal(rows[0].id, "canonical-exam");
  assert.equal(rows[0].revisionId, "exam-revision-1");
  assert.equal(rows[0].sources[0].claimKey, "examination.purpose");
  assert.equal(rows[0].sources[0].sourceName, "Official exam notice");
  assert.equal(rows[0].sources[0].checkedAt, "2026-11-20T00:00:00.000Z");
  assertPublishedQuery(state.queries[0], "examination");
  assert.equal(state.queries[0].innerJoins[1].table, "examination_revisions");
});

test("published Scholarship reader maps typed detail, region and claim provenance", async () => {
  const state = setDatabase([[scholarshipRow()]]);
  const rows = await scholarships.listPublishedScholarships();
  assert.equal(rows[0].id, "canonical-scholarship");
  assert.deepEqual(rows[0].studyLevels, ["higher-secondary", "undergraduate"]);
  assert.deepEqual(rows[0].eligibilityRegions, ["Assam", "Nagaland"]);
  assert.equal(rows[0].status, "unknown");
  assert.equal(rows[0].detail.eligibility[0].title, "Eligibility");
  assert.equal(rows[0].sources[0].claimKey, "scholarship.eligibility");
  assertPublishedQuery(state.queries[0], "scholarship");
  assert.equal(state.queries[0].innerJoins[1].table, "scholarship_revisions");
});

test("typed invalid data and missing CareerBridge aliases fail closed", async () => {
  setDatabase([[examRow({ stages: ["college"] })]]);
  await assert.rejects(examinations.listPublishedExaminations(), /stage "college" is unsupported/);
  setDatabase([[scholarshipRow({ scholarshipStatus: "accepting-applications" })]]);
  await assert.rejects(scholarships.listPublishedScholarships(), /status "accepting-applications" is unsupported/);
  setDatabase([[examRow({ aliasExternalKey: null })]]);
  await assert.rejects(examinations.listPublishedExaminations(), /no canonical CareerBridge examination ID/);
  setDatabase([[scholarshipRow({ detail: { relatedCourses: [{ name: "BSc", href: "https://outside.example" }] } })]]);
  await assert.rejects(scholarships.listPublishedScholarships(), /invalid internal link/);
});

test("source evidence deduplicates joined rows and publication filters reject unverified or demo records", async () => {
  const state = setDatabase([[examRow(), examRow({ aliasExternalKey: "canonical-exam", claimKey: "examination.authority", sourceId: "source-3", sourceName: "Other official source" })]]);
  const rows = await examinations.listPublishedExaminations();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sources.length, 2);
  assertPublishedQuery(state.queries[0], "examination");
  setDatabase([[scholarshipRow({ verificationStatus: "unverified" })]]);
  await assert.rejects(scholarships.listPublishedScholarships(), /invalid common or publication metadata/);
});

test("demo readers only select draft demo revisions and are unavailable outside local development", async () => {
  try {
    process.env.NODE_ENV = "production";
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    const guarded = setDatabase([[]]);
    await assert.rejects(examinations.listDemoExaminationsForDevelopment(), /only in a development environment/);
    await assert.rejects(scholarships.listDemoScholarshipsForDevelopment(), /only in a development environment/);
    assert.equal(guarded.queries.length, 0);
    process.env.NODE_ENV = "development";
    const demoState = setDatabase([
      [examRow({ publicationStatus: "draft", dataClassification: "demo", verificationStatus: "unverified" })],
      [scholarshipRow({ publicationStatus: "draft", dataClassification: "demo", verificationStatus: "unverified" })],
    ]);
    assert.equal((await examinations.listDemoExaminationsForDevelopment())[0].dataClassification, "demo");
    assert.equal((await scholarships.listDemoScholarshipsForDevelopment())[0].dataClassification, "demo");
    assert.deepEqual(demoState.queries[0].where.params, ["examination", "draft", "demo"]);
    assert.deepEqual(demoState.queries[1].where.params, ["scholarship", "draft", "demo"]);
    process.env.VERCEL = "1";
    process.env.VERCEL_ENV = "preview";
    setDatabase([[]]);
    await assert.rejects(examinations.listDemoExaminationsForDevelopment(), /only in a development environment/);
  } finally {
    restoreEnv();
  }
});
