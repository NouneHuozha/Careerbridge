import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");
let databasePaths = {
  published: [],
  databaseDemos: [],
  calls: [],
};
const staticRoutes = [
  { id: "open-schooling", title: "Static open schooling", stage: "class-10" },
  { id: "higher-secondary", title: "Static higher secondary", stage: "class-10" },
];
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
  if (request === "../../../db/pathways" && /pathway-page-data\.ts$/.test(parent?.filename ?? "")) {
    return {
      listPublishedPathways: async () => { databasePaths.calls.push("published-list"); return databasePaths.published; },
      getPublishedPathway: async (id) => { databasePaths.calls.push("published-detail"); return databasePaths.published.find((route) => route.id === id) ?? null; },
      listDemoPathwaysForDevelopment: async () => { databasePaths.calls.push("demo-list"); return databasePaths.databaseDemos; },
      getDemoPathwayForDevelopment: async (id) => { databasePaths.calls.push("demo-detail"); return databasePaths.databaseDemos.find((route) => route.id === id) ?? null; },
    };
  }
  if (request === "./route-data" && /pathway-page-data\.ts$/.test(parent?.filename ?? "")) {
    return { studyRoutes: staticRoutes };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const pathwayPageData = require("./pathway-page-data.ts");
Module._load = originalLoad;

const envBefore = {
  nodeEnv: process.env.NODE_ENV,
  databaseUrl: process.env.DATABASE_URL,
  vercel: process.env.VERCEL,
  vercelEnv: process.env.VERCEL_ENV,
};
function restoreEnv() {
  for (const [key, value] of [["NODE_ENV", envBefore.nodeEnv], ["DATABASE_URL", envBefore.databaseUrl], ["VERCEL", envBefore.vercel], ["VERCEL_ENV", envBefore.vercelEnv]]) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test("development keeps static demos while preferring database revisions for duplicate IDs", async () => {
  try {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://local-only.invalid/neondb";
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    databasePaths = {
      published: [{ id: "open-schooling", title: "Published NIOS route", dataClassification: "real" }],
      databaseDemos: [{ id: "database-demo", title: "Database demo", dataClassification: "demo" }],
      calls: [],
    };
    const routes = await pathwayPageData.listPathwaysForUi();
    assert.deepEqual(routes.map((route) => route.id), ["open-schooling", "database-demo", "higher-secondary"]);
    assert.equal(routes[0].title, "Published NIOS route");
    assert.equal(routes[2].dataClassification, "demo");
    assert.ok(databasePaths.calls.includes("demo-list"));
    const savedLegacyRoute = await pathwayPageData.getPathwayForUi("higher-secondary");
    assert.equal(savedLegacyRoute.title, "Static higher secondary");
    assert.equal(savedLegacyRoute.dataClassification, "demo");
  } finally {
    restoreEnv();
  }
});

test("production does not merge static or database demo Pathways into published results", async () => {
  try {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://local-only.invalid/neondb";
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    databasePaths = {
      published: [{ id: "open-schooling", title: "Published NIOS route", dataClassification: "real" }],
      databaseDemos: [{ id: "database-demo", title: "Database demo", dataClassification: "demo" }],
      calls: [],
    };
    const routes = await pathwayPageData.listPathwaysForUi();
    assert.deepEqual(routes.map((route) => route.id), ["open-schooling"]);
    assert.deepEqual(databasePaths.calls, ["published-list"]);
    assert.equal(await pathwayPageData.getPathwayForUi("higher-secondary"), null);
  } finally {
    restoreEnv();
  }
});
