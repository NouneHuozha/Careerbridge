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
  if (request === "./client" && /src[\\/]db[\\/]institutions\.ts$/.test(parent?.filename ?? "")) {
    return { getDb: () => activeDatabase };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const institutionReader = loadModule("./institutions.ts");
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
      const response = state.responses.shift() ?? [];
      return Promise.resolve(typeof response === "function" ? response() : response).then(
        resolve,
        reject,
      );
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

function setup(responses) {
  const mock = createDatabase(responses);
  activeDatabase = mock.database;
  return mock.state;
}

const evidence = {
  sourceId: null,
  sourceName: null,
  authority: null,
  canonicalUrl: null,
  claimKey: null,
  checkedAt: null,
  verifiedAt: null,
  verificationStatus: null,
};

function institutionRow(overrides = {}) {
  return {
    catalogItemId: "institution-item-1",
    revisionId: "institution-revision-1",
    revisionNumber: 1,
    title: "Kohima Science College",
    summary: "A college profile.",
    description: null,
    slug: "kohima-science-college-jotsoma",
    initials: "KS",
    institutionType: "College",
    ownership: "Government",
    institutionContent: { admissions: "See the admission office.", fees: "₹1000" },
    aliasSourceSystem: "careerbridge",
    aliasExternalType: "institution",
    aliasExternalKey: "kohima-science-college-jotsoma",
    aliasExternalContextKey: "",
    ...evidence,
    ...overrides,
  };
}

function campusRow(overrides = {}) {
  return {
    catalogItemId: "campus-item-1",
    revisionId: "campus-revision-1",
    revisionNumber: 2,
    title: "Jotsoma Campus",
    summary: null,
    description: null,
    institutionItemId: "institution-item-1",
    stateId: "state-nagaland",
    campusContent: { city: "Jotsoma" },
    aliasSourceSystem: "careerbridge",
    aliasExternalType: "campus",
    aliasExternalKey: "kohima-science-college-jotsoma/main",
    aliasExternalContextKey: "",
    ...evidence,
    ...overrides,
  };
}

function offeringRow(overrides = {}) {
  return {
    catalogItemId: "offering-item-1",
    revisionId: "offering-revision-1",
    revisionNumber: 1,
    title: "BCA at Jotsoma",
    summary: null,
    description: null,
    slug: "kohima-bca-jotsoma",
    courseItemId: "course-item-1",
    courseRevisionId: "course-revision-older-published",
    campusItemId: "campus-item-1",
    campusRevisionId: "campus-revision-older-published",
    institutionItemId: "institution-item-1",
    offeringDetails: {
      duration: "3 years",
      eligibility: "Class 12 pass",
      fees: "₹40,000 per year",
      admissionCycles: [{ academicYear: "2026-27", admissionProcess: "Apply online" }],
    },
    aliasSourceSystem: "careerbridge",
    aliasExternalType: "institution-offering",
    aliasExternalKey: "kohima-science-college-jotsoma",
    aliasExternalContextKey: "bca",
    ...evidence,
    ...overrides,
  };
}

function assertPublishedPredicate(query, itemType) {
  assert.match(query.where.sql, /"catalog_items"\."item_type" =/);
  assert.match(query.where.sql, /"catalog_items"\."published_revision_id" is not null/);
  assert.match(query.where.sql, /"catalog_item_revisions"\."publication_status" =/);
  assert.match(query.where.sql, /"catalog_item_revisions"\."data_classification" =/);
  assert.deepEqual(query.where.params.slice(0, 3), [itemType, "published", "real"]);
  assert.match(
    query.innerJoins[0].sql,
    /"catalog_item_revisions"\."id".*"catalog_items"\."published_revision_id"/,
  );
  assert.match(
    query.innerJoins[0].sql,
    /"catalog_item_revisions"\."catalog_item_id".*"catalog_items"\."id"/,
  );
}

test("published real institution profiles and campuses are mapped separately", async () => {
  const institutionState = setup([[institutionRow()]]);
  const institutions = await institutionReader.listPublishedInstitutions();
  assert.equal(institutions.length, 1);
  assert.equal(institutions[0].id, "kohima-science-college-jotsoma");
  assert.equal(institutions[0].content.admissions, undefined);
  assert.equal(institutions[0].content.fees, undefined);
  assertPublishedPredicate(institutionState.queries[0], "institution");
  assert.equal(
    institutionState.queries[0].innerJoins.some((join) => join.table === "institution_revisions"),
    true,
  );

  const campusState = setup([[campusRow()]]);
  const campuses = await institutionReader.listPublishedCampuses();
  assert.equal(campuses.length, 1);
  assert.equal(campuses[0].institutionItemId, "institution-item-1");
  assert.deepEqual(campuses[0].content, { city: "Jotsoma" });
  assertPublishedPredicate(campusState.queries[0], "campus");
  assert.equal(
    campusState.queries[0].innerJoins.some((join) => join.table === "institution_parent_items"),
    true,
  );
});

test("public offering query enforces typed relationships and accepts older published references", async () => {
  const state = setup([[
    offeringRow({
      sourceId: "source-fees",
      sourceName: "Official fee schedule",
      canonicalUrl: "https://college.example/fees",
      claimKey: "offering.fees",
      checkedAt: new Date("2026-10-01T00:00:00.000Z"),
      verifiedAt: new Date("2026-10-02T00:00:00.000Z"),
      verificationStatus: "verified",
    }),
  ]]);

  const offerings = await institutionReader.listPublishedCourseOfferings();
  assert.equal(offerings.length, 1);
  assert.equal(offerings[0].courseRevisionId, "course-revision-older-published");
  assert.equal(offerings[0].campusRevisionId, "campus-revision-older-published");
  assert.equal(offerings[0].details.eligibility, undefined);
  assert.equal(offerings[0].details.fees, "₹40,000 per year");
  assert.equal(offerings[0].details.admissionCycles[0].admissionProcess, undefined);

  const query = state.queries[0];
  assertPublishedPredicate(query, "course_offering");
  assert.ok(query.where.params.includes("course"));
  assert.ok(query.where.params.includes("campus"));
  assert.ok(query.where.params.filter((value) => value === "published").length >= 4);
  assert.ok(query.where.params.filter((value) => value === "real").length >= 4);
  const courseRevisionJoin = query.innerJoins.find(
    (join) => join.table === "institution_course_item_revisions",
  );
  const campusRevisionJoin = query.innerJoins.find(
    (join) => join.table === "institution_campus_item_revisions",
  );
  assert.match(courseRevisionJoin.sql, /"institution_course_item_revisions"\."id".*"course_revision_id"/);
  assert.match(campusRevisionJoin.sql, /"institution_campus_item_revisions"\."id".*"campus_revision_id"/);
  assert.doesNotMatch(courseRevisionJoin.sql, /published_revision_id/);
  assert.doesNotMatch(campusRevisionJoin.sql, /published_revision_id/);
});

test("unverified financial and admission claims are withheld", async () => {
  setup([[
    offeringRow({
      sourceId: "source-pending",
      sourceName: "Unreviewed source",
      canonicalUrl: "https://college.example/admissions",
      claimKey: "offering.fees",
      checkedAt: new Date("2026-10-01T00:00:00.000Z"),
      verifiedAt: null,
      verificationStatus: "pending_review",
    }),
  ]]);
  const [offering] = await institutionReader.listPublishedCourseOfferings();
  assert.equal(offering.details.fees, undefined);
  assert.equal(offering.details.eligibility, undefined);
  assert.equal(offering.details.admissionCycles[0].admissionProcess, undefined);
  assert.equal(offering.details.duration, "3 years");
});

test("empty lists return empty arrays and missing individual records return null", async () => {
  const emptyList = setup([[]]);
  assert.deepEqual(await institutionReader.listPublishedInstitutions(), []);

  const missing = setup([[]]);
  assert.equal(await institutionReader.getPublishedInstitution("missing"), null);
  assert.equal(emptyList.queries.length, 1);
  assert.equal(missing.queries.length, 1);
});

test("individual lookups accept canonical IDs and existing aliases", async () => {
  const alias = setup([
    [{ catalogItemId: "institution-item-1" }],
    [institutionRow()],
  ]);
  const institution = await institutionReader.getPublishedInstitution("kohima-science-college-jotsoma");
  assert.equal(institution.catalogItemId, "institution-item-1");
  assert.equal(alias.queries.length, 2);
  assert.deepEqual(alias.queries[0].where.params, ["institution", "kohima-science-college-jotsoma"]);

  const uuid = "11111111-1111-4111-8111-111111111111";
  setup([[{ catalogItemId: uuid }], [offeringRow({ catalogItemId: uuid })]]);
  const offering = await institutionReader.getPublishedCourseOffering(uuid);
  assert.equal(offering.catalogItemId, uuid);
});

test("unpublished, draft, demo, test, and wrong-type records are excluded by fixed public predicates", async () => {
  const state = setup([[], [], []]);
  assert.deepEqual(await institutionReader.listPublishedInstitutions(), []);
  assert.deepEqual(await institutionReader.listPublishedCampuses(), []);
  assert.deepEqual(await institutionReader.listPublishedCourseOfferings(), []);
  for (const [index, itemType] of ["institution", "campus", "course_offering"].entries()) {
    assertPublishedPredicate(state.queries[index], itemType);
    assert.ok(state.queries[index].where.params.includes("published"));
    assert.ok(state.queries[index].where.params.includes("real"));
    assert.equal(state.queries[index].where.params.includes("demo"), false);
    assert.equal(state.queries[index].where.params.includes("test"), false);
    assert.equal(state.queries[index].where.params.includes("draft"), false);
  }
});

test("ambiguous aliases fail and database errors propagate", async () => {
  const ambiguous = setup([[{ catalogItemId: "one" }, { catalogItemId: "two" }]]);
  await assert.rejects(
    institutionReader.getPublishedCourseOffering("same-institution-key"),
    /resolves to multiple items/,
  );
  assert.equal(ambiguous.queries.length, 1);

  const databaseError = new Error("connection failed");
  setup([() => Promise.reject(databaseError)]);
  await assert.rejects(
    institutionReader.listPublishedInstitutions(),
    (error) => error === databaseError,
  );
});

test("development demo reader fails closed before database access", async () => {
  const originalEnvironment = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercel: process.env.VERCEL,
  };
  const state = setup([[]]);
  try {
    process.env.NODE_ENV = "production";
    await assert.rejects(
      institutionReader.listDemoInstitutionsForDevelopment(),
      /only in a development environment/,
    );
    assert.equal(state.queries.length, 0);

    process.env.NODE_ENV = "development";
    process.env.VERCEL = "1";
    delete process.env.VERCEL_ENV;
    await assert.rejects(
      institutionReader.listDemoInstitutionsForDevelopment(),
      /only in a development environment/,
    );
    assert.equal(state.queries.length, 0);
  } finally {
    if (originalEnvironment.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment.nodeEnv;
    if (originalEnvironment.vercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalEnvironment.vercelEnv;
    if (originalEnvironment.vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalEnvironment.vercel;
  }
});
