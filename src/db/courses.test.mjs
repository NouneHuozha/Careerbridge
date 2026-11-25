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
  if (request === "./client" && /src[\\/]db[\\/]courses\.ts$/.test(parent?.filename ?? "")) {
    return { getDb: () => activeDatabase };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const courseReader = loadModule("./courses.ts");
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

const courseContent = {
  learningAreas: [
    { title: "Programming", description: "Write and test programs." },
  ],
  learningExperience: [
    { title: "Projects", description: "Apply concepts in projects." },
  ],
  admission: "Check programme-specific rules.",
  additionalNote: { retained: true },
};

function courseRow(overrides = {}) {
  return {
    catalogItemId: "course-item-1",
    revisionId: "course-revision-1",
    revisionNumber: 1,
    title: "Bachelor of Computer Applications",
    summary: "Explore computing and applications.",
    overview: "A detailed course overview.",
    qualification: "Degree",
    stages: ["class-12"],
    entryAfterClass10: "",
    entryAfterClass12: "Entry after Class 12",
    isExplorationCategory: false,
    courseContent: structuredClone(courseContent),
    aliasSourceSystem: "careerbridge",
    aliasExternalType: "course",
    aliasExternalKey: "bca",
    aliasExternalContextKey: "",
    fieldAliasExternalKey: "technology",
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
  assert.deepEqual(query.where.params, ["course", "published", "real", ...extraParams]);
  assert.equal(query.innerJoins[0].table, "catalog_item_revisions");
  assert.match(
    query.innerJoins[0].sql,
    /"catalog_item_revisions"\."id".*"catalog_items"\."published_revision_id"/,
  );
  assert.match(
    query.innerJoins[0].sql,
    /"catalog_item_revisions"\."catalog_item_id".*"catalog_items"\."id"/,
  );
  assert.equal(query.innerJoins[1].table, "course_revisions");
}

const priorEnvironment = {
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL_ENV,
  vercel: process.env.VERCEL,
};

function setDevelopmentEnvironment(vercelEnv) {
  process.env.NODE_ENV = "development";
  if (vercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = vercelEnv;
  delete process.env.VERCEL;
}

function restoreEnvironment() {
  if (priorEnvironment.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = priorEnvironment.nodeEnv;
  if (priorEnvironment.vercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = priorEnvironment.vercelEnv;
  if (priorEnvironment.vercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = priorEnvironment.vercel;
}

test("published real course maps to the existing course model and preserves JSONB", async () => {
  const state = setup([[courseRow()]]);

  const courses = await courseReader.listPublishedCourses();

  assert.equal(courses.length, 1);
  assert.deepEqual(courses[0], {
    id: "bca",
    catalogItemId: "course-item-1",
    name: "Bachelor of Computer Applications",
    description: "Explore computing and applications.",
    fieldId: "technology",
    qualification: "Degree",
    stages: ["class-12"],
    entryAfterClass10: "",
    entryAfterClass12: "Entry after Class 12",
    isExplorationCategory: false,
    overview: "A detailed course overview.",
    learningAreas: courseContent.learningAreas,
    learningExperience: courseContent.learningExperience,
    admission: courseContent.admission,
    courseContent,
    aliases: [
      {
        sourceSystem: "careerbridge",
        externalType: "course",
        externalKey: "bca",
        externalContextKey: "",
      },
    ],
  });
  assert.equal("simpleExplanation" in courses[0], false);
  assertPublishedQuery(state.queries[0]);
});

test("published reader excludes drafts, demos, and test records through fixed SQL predicates", async () => {
  const state = setup([[]]);

  assert.deepEqual(await courseReader.listPublishedCourses(), []);

  const params = state.queries[0].where.params;
  assert.deepEqual(params, ["course", "published", "real"]);
  assert.equal(params.includes("draft"), false);
  assert.equal(params.includes("demo"), false);
  assert.equal(params.includes("test"), false);
});

test("missing published pointers are excluded and the revision must belong to its item", async () => {
  const state = setup([[]]);

  assert.deepEqual(await courseReader.listPublishedCourses(), []);

  assertPublishedQuery(state.queries[0]);
});

test("course aliases resolve and are retained with the canonical ID", async () => {
  const state = setup([
    [{ catalogItemId: "course-item-1" }],
    [
      courseRow({ aliasSourceSystem: "legacy-import", aliasExternalKey: "old-bca" }),
      courseRow(),
    ],
  ]);

  const course = await courseReader.getPublishedCourse("old-bca");

  assert.equal(course.id, "bca");
  assert.deepEqual(
    course.aliases.map((alias) => alias.externalKey).sort(),
    ["bca", "old-bca"],
  );
  assert.equal(state.queries.length, 2);
  assert.deepEqual(state.queries[0].where.params, ["course", "old-bca"]);
  assertPublishedQuery(state.queries[1], ["course-item-1"]);
});

test("missing and unpublished courses return null", async () => {
  const missing = setup([[]]);
  assert.equal(await courseReader.getPublishedCourse("not-a-course"), null);
  assert.equal(missing.queries.length, 1);

  const unpublished = setup([[{ catalogItemId: "course-item-1" }], []]);
  assert.equal(await courseReader.getPublishedCourse("bca"), null);
  assert.equal(unpublished.queries.length, 2);
  assertPublishedQuery(unpublished.queries[1], ["course-item-1"]);
});

test("invalid required and optional JSONB shapes fail explicitly", async () => {
  setup([[courseRow({ courseContent: [] })]]);
  await assert.rejects(
    courseReader.listPublishedCourses(),
    /Course content must be a JSON object/,
  );

  setup([[courseRow({ courseContent: { learningAreas: null } })]]);
  await assert.rejects(
    courseReader.listPublishedCourses(),
    /"learningAreas" must be an array/,
  );

  setup([[courseRow({ courseContent: { ...courseContent, admission: null } })]]);
  await assert.rejects(
    courseReader.listPublishedCourses(),
    /"admission" must be a string/,
  );
});

test("field and stage context filters are applied to catalogue queries", async () => {
  const state = setup([[]]);

  assert.deepEqual(
    await courseReader.listPublishedCourses({
      fieldId: "technology",
      stage: "class-10",
    }),
    [],
  );

  const query = state.queries[0];
  assertPublishedQuery(query, ["technology", '{"class-10"}']);
  assert.match(query.where.sql, /"course_field_alias"\."external_key" =/);
  assert.match(query.where.sql, /"course_revisions"\."stages" @>/);
});

test("demo preview requires an unambiguous development environment", async () => {
  const state = setup([[]]);
  try {
    delete process.env.NODE_ENV;
    await assert.rejects(
      courseReader.listDemoCoursesForDevelopment(),
      /only in a development environment/,
    );
    assert.equal(state.queries.length, 0);

    process.env.NODE_ENV = "production";
    await assert.rejects(
      courseReader.listDemoCoursesForDevelopment(),
      /only in a development environment/,
    );
    assert.equal(state.queries.length, 0);

    process.env.NODE_ENV = "development";
    process.env.VERCEL = "1";
    delete process.env.VERCEL_ENV;
    await assert.rejects(
      courseReader.listDemoCoursesForDevelopment(),
      /only in a development environment/,
    );
    assert.equal(state.queries.length, 0);

    delete process.env.VERCEL;
    process.env.VERCEL_ENV = "preview";
    await assert.rejects(
      courseReader.listDemoCoursesForDevelopment(),
      /only in a development environment/,
    );
    assert.equal(state.queries.length, 0);
  } finally {
    restoreEnvironment();
  }
});

test("development demo reader selects only draft demo rows", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  try {
    setDevelopmentEnvironment();
    const state = setup([[courseRow()]]);
    const courses = await courseReader.listDemoCoursesForDevelopment();

    assert.equal(courses.length, 1);
    assert.equal(courses[0].id, "bca");
    assert.deepEqual(state.queries[0].where.params, ["course", "draft", "demo"]);
    assert.match(state.queries[0].where.sql, /"catalog_item_revisions"\."publication_status" =/);
    assert.match(state.queries[0].where.sql, /"catalog_item_revisions"\."data_classification" =/);
    assert.equal(state.queries[0].innerJoins[1].table, "course_revisions");
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    restoreEnvironment();
  }
});

test("development demo preview returns only the latest demo draft for each course", async () => {
  try {
    setDevelopmentEnvironment();
    setup([
      [
        courseRow({ revisionId: "course-revision-2", revisionNumber: 2, title: "Latest BCA" }),
        courseRow({ revisionId: "course-revision-1", revisionNumber: 1, title: "Older BCA" }),
      ],
    ]);

    const courses = await courseReader.listDemoCoursesForDevelopment();

    assert.equal(courses.length, 1);
    assert.equal(courses[0].name, "Latest BCA");
  } finally {
    restoreEnvironment();
  }
});

test("database errors propagate instead of becoming empty catalogue results", async () => {
  const databaseError = new Error("connection failed");
  setup([() => Promise.reject(databaseError)]);
  await assert.rejects(courseReader.listPublishedCourses(), (error) => error === databaseError);
});
