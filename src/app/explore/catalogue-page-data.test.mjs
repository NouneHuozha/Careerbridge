import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");
const databases = {
  exams: { published: [], demos: [], calls: [] },
  scholarships: { published: [], demos: [], calls: [] },
};
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
  if (request === "next/server") return { connection: async () => {} };
  if (request === "../../../db/examinations" && /examination-page-data\.ts$/.test(parent?.filename ?? "")) {
    return {
      listPublishedExaminations: async () => { databases.exams.calls.push("published"); return databases.exams.published; },
      listDemoExaminationsForDevelopment: async () => { databases.exams.calls.push("demo"); return databases.exams.demos; },
      getPublishedExamination: async () => null,
      getDemoExaminationForDevelopment: async () => null,
    };
  }
  if (request === "../../../db/scholarships" && /scholarship-page-data\.ts$/.test(parent?.filename ?? "")) {
    return {
      listPublishedScholarships: async () => { databases.scholarships.calls.push("published"); return databases.scholarships.published; },
      listDemoScholarshipsForDevelopment: async () => { databases.scholarships.calls.push("demo"); return databases.scholarships.demos; },
      getPublishedScholarship: async () => null,
      getDemoScholarshipForDevelopment: async () => null,
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const examinationPageData = require("./examinations/examination-page-data.ts");
const scholarshipPageData = require("./scholarships/scholarship-page-data.ts");
Module._load = originalLoad;
const envBefore = { nodeEnv: process.env.NODE_ENV, databaseUrl: process.env.DATABASE_URL, vercel: process.env.VERCEL, vercelEnv: process.env.VERCEL_ENV };
function restoreEnv() {
  for (const [name, value] of Object.entries({ NODE_ENV: envBefore.nodeEnv, DATABASE_URL: envBefore.databaseUrl, VERCEL: envBefore.vercel, VERCEL_ENV: envBefore.vercelEnv })) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
}

test("development merges published data with labelled database and local demos, with published IDs taking precedence", async () => {
  try {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://local-only.invalid/catalogue";
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    databases.exams = {
      published: [{ id: "same", dataClassification: "real", name: "Published exam" }],
      demos: [{ id: "db-demo", dataClassification: "demo", verificationStatus: "unverified", publicationStatus: "draft", name: "DB demo" }, { id: "same", dataClassification: "demo", verificationStatus: "unverified", publicationStatus: "draft", name: "Demo duplicate" }],
      calls: [],
    };
    databases.scholarships = {
      published: [{ id: "same", dataClassification: "real", name: "Published scheme" }],
      demos: [{ id: "db-demo", dataClassification: "demo", verificationStatus: "unverified", publicationStatus: "draft", name: "DB demo" }],
      calls: [],
    };
    const exams = await examinationPageData.listExaminationsForUi();
    const scholarships = await scholarshipPageData.listScholarshipsForUi();
    assert.equal(exams[0].name, "Published exam");
    assert.equal(exams.find((item) => item.id === "db-demo").dataClassification, "demo");
    assert.ok(exams.filter((item) => item.dataClassification === "demo").every((item) => item.verificationStatus === "unverified" && item.publicationStatus === "draft"));
    assert.equal(scholarships[0].name, "Published scheme");
    assert.equal(scholarships.find((item) => item.id === "db-demo").dataClassification, "demo");
    assert.ok(scholarships.filter((item) => item.dataClassification === "demo").every((item) => item.verificationStatus === "unverified" && item.publicationStatus === "draft"));
    assert.deepEqual(databases.exams.calls, ["published", "demo"]);
    assert.deepEqual(databases.scholarships.calls, ["published", "demo"]);
  } finally {
    restoreEnv();
  }
});

test("production selectors return only published records and do not read demo drafts", async () => {
  try {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://local-only.invalid/catalogue";
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    databases.exams = { published: [{ id: "real-exam", dataClassification: "real" }], demos: [{ id: "demo-exam", dataClassification: "demo" }], calls: [] };
    databases.scholarships = { published: [{ id: "real-scheme", dataClassification: "real" }], demos: [{ id: "demo-scheme", dataClassification: "demo" }], calls: [] };
    assert.deepEqual((await examinationPageData.listExaminationsForUi()).map((item) => item.id), ["real-exam"]);
    assert.deepEqual((await scholarshipPageData.listScholarshipsForUi()).map((item) => item.id), ["real-scheme"]);
    assert.deepEqual(databases.exams.calls, ["published"]);
    assert.deepEqual(databases.scholarships.calls, ["published"]);
  } finally {
    restoreEnv();
  }
});
