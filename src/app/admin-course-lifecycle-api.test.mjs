import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Module = require("node:module");
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

class AdminAuthenticationRequiredError extends Error {}
class AdminAccessDeniedError extends Error {}

const revisionId = "00000000-0000-4000-8000-000000000002";
const publishedRevisionId = "00000000-0000-4000-8000-000000000003";
const archivedRevisionId = "00000000-0000-4000-8000-000000000004";
const state = {
  authorized: true,
  databaseName: "neondb",
  course: {
    id: "00000000-0000-4000-8000-000000000001",
    courseId: "test-course",
    publishedRevisionId,
    latestRevisionId: revisionId,
    publicationStatus: "approved",
    revisionNumber: 2,
  },
  preflightOutcome: "ready_for_review",
  historyExists: true,
  publisherCalls: [],
  queries: [],
};

const client = {
  async query(sql, params = []) {
    const statement = String(sql).trim();
    state.queries.push({ statement, params });
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(statement)) return { rowCount: 0, rows: [] };
    if (statement.includes("SELECT current_database()")) {
      return { rowCount: 1, rows: [{ database_name: state.databaseName }] };
    }
    if (statement.startsWith("SELECT id FROM public.users")) {
      return state.authorized
        ? { rowCount: 1, rows: [{ id: params[0] }] }
        : { rowCount: 0, rows: [] };
    }
    if (statement.startsWith("SELECT item.id,")) return { rowCount: 1, rows: [state.course] };
    if (statement.startsWith("INSERT INTO public.catalog_item_revisions")) {
      return { rowCount: 1, rows: [{ id: archivedRevisionId }] };
    }
    if (statement.startsWith("SELECT 1 FROM public.catalog_item_revisions")) {
      return {
        rowCount: state.historyExists ? 1 : 0,
        rows: state.historyExists ? [{ "?column?": 1 }] : [],
      };
    }
    if (statement.startsWith("DELETE FROM public.catalog_items") ||
        statement.startsWith("DELETE FROM public.catalog_item_revisions")) {
      return { rowCount: 1, rows: [] };
    }
    return { rowCount: 1, rows: [] };
  },
  release() {},
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "next/server") {
    return {
      connection: async () => {},
      NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) },
    };
  }
  if (
    request === "../../../../../../admin-auth" &&
    parent?.filename.endsWith("courses\\[id]\\lifecycle\\route.ts")
  ) {
    return {
      AdminAuthenticationRequiredError,
      AdminAccessDeniedError,
      async requireAdmin() {
        if (!state.authorized) throw new AdminAccessDeniedError();
        return { id: 7 };
      },
    };
  }
  if (
    request === "../../../../../../../db/pool" &&
    parent?.filename.endsWith("courses\\[id]\\lifecycle\\route.ts")
  ) {
    return { getIdentityLockPool: () => ({ connect: async () => client }) };
  }
  if (
    request === "../../../../../../../../scripts/import-real-pathway-draft.mjs" &&
    parent?.filename.endsWith("courses\\[id]\\lifecycle\\route.ts")
  ) {
    return { assertDevelopmentTarget() {} };
  }
  if (
    request === "../../../../../../../../scripts/publish-real-course.mjs" &&
    parent?.filename.endsWith("courses\\[id]\\lifecycle\\route.ts")
  ) {
    return {
      async preflightRealCourseDraft() {
        return { outcome: state.preflightOutcome, issues: [] };
      },
      async approveRealCourseDraft(_client, input) {
        state.publisherCalls.push({ action: "approve", input });
      },
      async publishApprovedRealCourse(_client, input) {
        state.publisherCalls.push({ action: "publish", input });
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const route = require("./api/admin/catalogue/courses/[id]/lifecycle/route.ts");
Module._load = originalLoad;

function request(body, origin = "http://localhost") {
  return new Request("http://localhost/api/admin/catalogue/courses/test-course/lifecycle", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function lifecycleBody(action, expectedRevision = revisionId, expectedPublished = publishedRevisionId) {
  return {
    action,
    expectedRevisionId: expectedRevision,
    expectedPublishedRevisionId: expectedPublished,
  };
}

function reset() {
  state.authorized = true;
  state.databaseName = "neondb";
  state.course = {
    id: "00000000-0000-4000-8000-000000000001",
    courseId: "test-course",
    publishedRevisionId,
    latestRevisionId: revisionId,
    publicationStatus: "approved",
    revisionNumber: 2,
  };
  state.preflightOutcome = "ready_for_review";
  state.historyExists = true;
  state.publisherCalls = [];
  state.queries = [];
}

async function post(body) {
  return route.POST(request(body), { params: Promise.resolve({ id: "test-course" }) });
}

test("publishing explicitly reviews and publishes the latest Course revision", async () => {
  reset();
  const response = await post(lifecycleBody("publish"));
  assert.equal(response.status, 200);
  assert.deepEqual(state.publisherCalls.map(({ action }) => action), ["approve", "publish"]);
  assert.equal(state.publisherCalls[1].input.courseId, "test-course");
  assert.equal(state.publisherCalls[1].input.revisionId, revisionId);
  assert.equal(state.publisherCalls[1].input.expectedPublishedRevisionId, publishedRevisionId);
  assert.ok(state.queries.some(({ statement }) => statement === "COMMIT"));
});

test("stale Course revisions are rejected before publication", async () => {
  reset();
  state.course.latestRevisionId = "00000000-0000-4000-8000-000000000009";
  const response = await post(lifecycleBody("publish"));
  assert.equal(response.status, 409);
  assert.deepEqual(state.publisherCalls, []);
  assert.ok(state.queries.some(({ statement }) => statement === "ROLLBACK"));
});

test("unpublishing archives Course content, typed data, evidence, and clears the pointer", async () => {
  reset();
  state.course.publicationStatus = "published";
  state.course.latestRevisionId = publishedRevisionId;
  const response = await post(lifecycleBody("archive", publishedRevisionId, publishedRevisionId));
  assert.equal(response.status, 200);
  assert.ok(state.queries.some(({ statement }) => statement.includes("'archived', source.title")));
  assert.ok(state.queries.some(({ statement }) => statement.startsWith("INSERT INTO public.course_revisions")));
  assert.ok(state.queries.some(({ statement }) => statement.startsWith("INSERT INTO public.catalog_revision_sources")));
  assert.ok(state.queries.some(({ statement }) => statement.includes("SET published_revision_id = NULL")));
  assert.ok(state.queries.some(({ statement }) => statement === "COMMIT"));
});

test("deleting a draft preserves the Course identity when revision history exists", async () => {
  reset();
  state.course.publishedRevisionId = null;
  state.course.publicationStatus = "draft";
  const response = await post(lifecycleBody("delete-draft", revisionId, null));
  assert.equal(response.status, 200);
  assert.ok(state.queries.some(({ statement }) => statement.startsWith("DELETE FROM public.catalog_item_revisions")));
  assert.ok(!state.queries.some(({ statement }) => statement.startsWith("DELETE FROM public.catalog_items")));
});

test("lifecycle actions reject cross-origin requests and a non-development database", async () => {
  reset();
  const crossOrigin = await route.POST(
    request(lifecycleBody("publish"), "https://other.example"),
    { params: Promise.resolve({ id: "test-course" }) },
  );
  assert.equal(crossOrigin.status, 403);
  assert.equal(state.queries.length, 0);

  reset();
  state.databaseName = "production";
  const originalError = console.error;
  console.error = () => {};
  let production;
  try {
    production = await post(lifecycleBody("publish"));
  } finally {
    console.error = originalError;
  }
  assert.equal(production.status, 503);
  assert.ok(!state.queries.some(({ statement }) => statement === "BEGIN"));
});
