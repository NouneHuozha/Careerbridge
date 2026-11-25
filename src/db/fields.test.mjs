import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const loadModule = createRequire(import.meta.url);
const Module = loadModule("node:module");
const ts = loadModule("typescript");
const { PgDialect } = loadModule("drizzle-orm/pg-core");
const { getTableName } = loadModule("drizzle-orm");
const dialect = new PgDialect();
let activeDatabase;

loadModule.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = loadModule("node:fs");
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
  if (request === "./client" && parent?.filename.endsWith("src\\db\\fields.ts")) {
    return { getDb: () => activeDatabase };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const fieldReader = loadModule("./fields.ts");
Module._load = originalLoad;

function compile(expression) {
  return dialect.sqlToQuery(expression);
}

function createDatabase(responses) {
  const state = { responses: [...responses], queries: [] };

  class Query {
    constructor(selection) {
      this.selection = selection;
      this.innerJoins = [];
      this.leftJoins = [];
      this.query = { selection, innerJoins: this.innerJoins, leftJoins: this.leftJoins };
      state.queries.push(this.query);
    }

    from(table) {
      this.query.from = getTableName(table);
      return this;
    }

    innerJoin(table, condition) {
      this.innerJoins.push({ table: getTableName(table), ...compile(condition) });
      return this;
    }

    leftJoin(table, condition) {
      this.leftJoins.push({ table: getTableName(table), ...compile(condition) });
      return this;
    }

    where(condition) {
      this.query.where = compile(condition);
      return this;
    }

    orderBy(...expressions) {
      this.query.orderBy = expressions.map(compile);
      return this;
    }

    then(resolve, reject) {
      return Promise.resolve(state.responses.shift() ?? []).then(resolve, reject);
    }
  }

  return {
    state,
    database: {
      select(selection) {
        return new Query(selection);
      },
    },
  };
}

const fieldContent = {
  introduction: "An introduction.",
  broadlyInvolves: "Broad themes.",
  activitiesAndWorkAreas: "Example activities.",
  learningAndSubjectConnections: "Learning foundations.",
  courseFamiliesToExplore: "Course families.",
  furtherExploration: "Further checks.",
};

function fieldRow(overrides = {}) {
  return {
    catalogItemId: "catalog-item-1",
    revisionId: "revision-1",
    title: "Technology",
    summary: "Computers and digital systems.",
    description: null,
    fieldContent: { ...fieldContent },
    aliasSourceSystem: "careerbridge",
    aliasExternalType: "field",
    aliasExternalKey: "technology",
    aliasExternalContextKey: "",
    sourceId: "source-1",
    sourceName: "National Career Service",
    authority: "Directorate General of Employment",
    canonicalUrl: "https://ncs.gov.in/about-us",
    category: "career_guidance",
    sourceType: "official_public_web_page",
    claimKey: "field.technology.general-discovery-context",
    checkedAt: new Date("2026-11-19T00:00:00.000Z"),
    verifiedAt: null,
    verificationStatus: "pending_review",
    ...overrides,
  };
}

function setup(responses) {
  const mock = createDatabase(responses);
  activeDatabase = mock.database;
  return mock.state;
}

function assertPublishedQuery(query, extraParams = []) {
  assert.match(query.where.sql, /"catalog_items"\."item_type" =/);
  assert.match(query.where.sql, /"catalog_items"\."published_revision_id" is not null/);
  assert.match(query.where.sql, /"catalog_item_revisions"\."publication_status" =/);
  assert.match(query.where.sql, /"catalog_item_revisions"\."data_classification" =/);
  assert.deepEqual(query.where.params, ["field", "published", "real", ...extraParams]);
  assert.equal(query.innerJoins[0].table, "catalog_item_revisions");
  assert.match(query.innerJoins[0].sql, /"catalog_item_revisions"\."id".*"catalog_items"\."published_revision_id"/);
  assert.match(query.innerJoins[0].sql, /"catalog_item_revisions"\."catalog_item_id".*"catalog_items"\."id"/);
  assert.equal(query.innerJoins[1].table, "field_revisions");
}

test("published fields are returned with all six content values and provenance", async () => {
  const state = setup([[fieldRow()]]);

  const fields = await fieldReader.listPublishedFields();

  assert.equal(fields.length, 1);
  assert.deepEqual(fields[0].content, fieldContent);
  assert.deepEqual(fields[0].provenance, [{
    sourceId: "source-1",
    sourceName: "National Career Service",
    authority: "Directorate General of Employment",
    canonicalUrl: "https://ncs.gov.in/about-us",
    category: "career_guidance",
    sourceType: "official_public_web_page",
    claimKey: "field.technology.general-discovery-context",
    checkedAt: new Date("2026-11-19T00:00:00.000Z"),
    verifiedAt: null,
    verificationStatus: "pending_review",
  }]);
  assertPublishedQuery(state.queries[0]);
});

test("draft and rejected revisions are excluded by the publication-status predicate", async () => {
  for (const status of ["draft", "rejected"]) {
    const state = setup([[]]);
    assert.deepEqual(await fieldReader.listPublishedFields(), []);
    assert.ok(state.queries[0].where.sql.includes('"catalog_item_revisions"."publication_status" ='));
    assert.ok(state.queries[0].where.params.includes("published"));
    assert.notEqual(state.queries[0].where.params.includes(status), true);
  }
});

test("unpublished fields are excluded by the published-revision pointer join", async () => {
  const state = setup([[]]);

  assert.deepEqual(await fieldReader.listPublishedFields(), []);

  assertPublishedQuery(state.queries[0]);
});

test("demo and test revisions are excluded by the real-data classification predicate", async () => {
  const state = setup([[]]);

  assert.deepEqual(await fieldReader.listPublishedFields(), []);

  assert.ok(state.queries[0].where.sql.includes('"catalog_item_revisions"."data_classification" ='));
  assert.ok(state.queries[0].where.params.includes("real"));
  assert.notEqual(state.queries[0].where.params.includes("demo"), true);
  assert.notEqual(state.queries[0].where.params.includes("test"), true);
});

test("an empty catalogue list returns an empty array", async () => {
  setup([[]]);

  assert.deepEqual(await fieldReader.listPublishedFields(), []);
});

test("missing aliases and aliases without a published revision return null", async () => {
  const missingAlias = setup([[]]);
  assert.equal(await fieldReader.getPublishedField("not-a-field"), null);
  assert.equal(missingAlias.queries.length, 1);

  const unpublishedAlias = setup([[{ catalogItemId: "catalog-item-1" }], []]);
  assert.equal(await fieldReader.getPublishedField("technology"), null);
  assert.equal(unpublishedAlias.queries.length, 2);
});

test("alias lookup resolves the canonical field ID and preserves all aliases", async () => {
  const state = setup([
    [{ catalogItemId: "catalog-item-1" }],
    [
      fieldRow(),
      fieldRow({
        aliasSourceSystem: "legacy-import",
        aliasExternalKey: "old-technology",
        sourceId: null,
        sourceName: null,
        authority: null,
        canonicalUrl: null,
        category: null,
        sourceType: null,
        claimKey: null,
        checkedAt: null,
        verifiedAt: null,
        verificationStatus: null,
      }),
    ],
  ]);

  const field = await fieldReader.getPublishedField("old-technology");

  assert.equal(field.id, "technology");
  assert.equal(field.catalogItemId, "catalog-item-1");
  assert.deepEqual(field.aliases.map((alias) => alias.externalKey).sort(), [
    "old-technology",
    "technology",
  ]);
  assert.equal(state.queries.length, 2);
  assert.equal(state.queries[0].where.params.at(-1), "old-technology");
  assertPublishedQuery(state.queries[1], ["catalog-item-1"]);
});

test("canonical catalogue UUID lookup is supported", async () => {
  const state = setup([
    [{ catalogItemId: "11111111-1111-4111-8111-111111111111" }],
    [fieldRow({ catalogItemId: "11111111-1111-4111-8111-111111111111" })],
  ]);

  const field = await fieldReader.getPublishedField("11111111-1111-4111-8111-111111111111");

  assert.equal(field.id, "technology");
  assert.equal(
    state.queries[0].where.params.includes("11111111-1111-4111-8111-111111111111"),
    true,
  );
});
