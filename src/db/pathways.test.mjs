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
  if (request === "./client" && /src[\\/]db[\\/]pathways\.ts$/.test(parent?.filename ?? "")) {
    return { getDb: () => activeDatabase };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const pathways = require("./pathways.ts");
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

function pathwayRow(overrides = {}) {
  return {
    catalogItemId: "pathway-item-1",
    revisionId: "pathway-revision-1",
    revisionNumber: 1,
    title: "Senior Secondary through NIOS",
    summary: "Study toward Senior Secondary through an open-schooling programme.",
    introduction: "Check current NIOS rules and subject availability.",
    publicationStatus: "published",
    dataClassification: "real",
    verificationStatus: "verified",
    stage: "class-10",
    courseStage: "class-12",
    catalogueGroup: "Continue secondary education",
    category: "Alternative study mode",
    routeContent: {
      steps: ["Check entry requirements", "Choose subjects", "Complete assessments"],
      progression: [{ title: "Check entry requirements", description: "Confirm current rules.", nextStage: "Subject selection" }],
      qualification: { title: "Senior Secondary", description: "Meet the programme requirements." },
      considerations: [{ title: "Subject availability varies", description: "Confirm current options." }],
    },
    aliasSourceSystem: "careerbridge",
    aliasExternalType: "pathway",
    aliasExternalKey: "open-schooling",
    aliasExternalContextKey: "",
    sourceId: "source-1",
    sourceName: "NIOS Senior Secondary course",
    authority: "National Institute of Open Schooling",
    canonicalUrl: "https://www.nios.ac.in/online-course-material/secondary-courses/admission-detail-for-various-courses.aspx",
    normalizedUrl: "https://www.nios.ac.in/online-course-material/secondary-courses/admission-detail-for-various-courses.aspx",
    claimKey: "pathway.summary",
    checkedAt: new Date("2026-11-25T00:00:00Z"),
    verifiedAt: new Date("2026-11-25T00:00:00Z"),
    sourceVerificationStatus: "verified",
    ...overrides,
  };
}

function setDatabase(responses) {
  const mock = createDatabase(responses);
  activeDatabase = mock.database;
  return mock.state;
}

const envBefore = {
  nodeEnv: process.env.NODE_ENV,
  vercel: process.env.VERCEL,
  vercelEnv: process.env.VERCEL_ENV,
};
function restoreEnv() {
  for (const [key, value] of [["NODE_ENV", envBefore.nodeEnv], ["VERCEL", envBefore.vercel], ["VERCEL_ENV", envBefore.vercelEnv]]) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test("published Pathways map canonical identity and claim-level source evidence", async () => {
  const state = setDatabase([[pathwayRow()]]);
  const routes = await pathways.listPublishedPathways();
  assert.equal(routes.length, 1);
  assert.equal(routes[0].id, "open-schooling");
  assert.equal(routes[0].stage, "class-10");
  assert.equal(routes[0].title, "Senior Secondary through NIOS");
  assert.equal(routes[0].sources[0].claimKey, "pathway.summary");
  assert.equal(routes[0].sources[0].sourceName, "NIOS Senior Secondary course");
  assertPublishedPredicate(state.queries[0]);
  assert.equal(state.queries[0].innerJoins[1].table, "pathway_revisions");
  assert.equal(state.queries[0].leftJoins.some((join) => join.table === "catalog_revision_sources"), true);
  assert.equal(state.queries[0].leftJoins.some((join) => join.table === "source_registry"), true);
});

function assertPublishedPredicate(query) {
  assert.match(query.where.sql, /"catalog_items"\."item_type" =/);
  assert.match(query.where.sql, /"catalog_items"\."published_revision_id" is not null/);
  assert.match(query.where.sql, /"catalog_item_revisions"\."publication_status" =/);
  assert.match(query.where.sql, /"catalog_item_revisions"\."data_classification" =/);
  assert.match(query.where.sql, /"catalog_item_revisions"\."verification_status" =/);
  assert.deepEqual(query.where.params, ["pathway", "published", "real", "verified"]);
  assert.match(query.innerJoins[0].sql, /"catalog_item_revisions"\."id".*"catalog_items"\."published_revision_id"/);
  assert.match(query.innerJoins[0].sql, /"catalog_item_revisions"\."catalog_item_id".*"catalog_items"\."id"/);
}

test("published reader excludes draft, demo, test, and unverified rows even when results are empty", async () => {
  const state = setDatabase([[]]);
  assert.deepEqual(await pathways.listPublishedPathways(), []);
  assertPublishedPredicate(state.queries[0]);
  assert.equal(state.queries[0].where.params.includes("draft"), false);
  assert.equal(state.queries[0].where.params.includes("demo"), false);
  assert.equal(state.queries[0].where.params.includes("test"), false);
});

test("malformed typed route content fails instead of rendering partial copy", async () => {
  setDatabase([[pathwayRow({ routeContent: {
    steps: [],
    progression: [{ title: "Continue", description: "Check current rules." }],
    qualification: { title: "Qualification", description: "Meet current requirements." },
    considerations: [{ title: "Requirements vary", description: "Confirm current details." }],
  } })]]);
  await assert.rejects(pathways.listPublishedPathways(), /steps.*non-empty array/);
});

test("development demo reads are gated and select only draft demo revisions", async () => {
  const state = setDatabase([[]]);
  try {
    process.env.NODE_ENV = "production";
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    await assert.rejects(pathways.listDemoPathwaysForDevelopment(), /only in a development environment/);
    assert.equal(state.queries.length, 0);

    process.env.NODE_ENV = "development";
    const demoState = setDatabase([[pathwayRow({ publicationStatus: "draft", dataClassification: "demo", verificationStatus: "unverified" })]]);
    const routes = await pathways.listDemoPathwaysForDevelopment();
    assert.equal(routes[0].dataClassification, "demo");
    assert.deepEqual(demoState.queries[0].where.params, ["pathway", "draft", "demo"]);
    assert.equal(demoState.queries[0].where.params.includes("published"), false);
  } finally {
    restoreEnv();
  }
});

test("demo reads reject hosted preview and production contexts", async () => {
  try {
    process.env.NODE_ENV = "development";
    process.env.VERCEL = "1";
    delete process.env.VERCEL_ENV;
    setDatabase([[]]);
    await assert.rejects(pathways.listDemoPathwaysForDevelopment(), /only in a development environment/);
    process.env.VERCEL_ENV = "preview";
    await assert.rejects(pathways.listDemoPathwaysForDevelopment(), /only in a development environment/);
  } finally {
    restoreEnv();
  }
});

test("database errors propagate rather than masquerading as an empty catalogue", async () => {
  const error = new Error("connection failed");
  setDatabase([() => Promise.reject(error)]);
  await assert.rejects(pathways.listPublishedPathways(), (caught) => caught === error);
});
