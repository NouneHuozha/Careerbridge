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

const fieldId = "00000000-0000-4000-8000-000000000001";
const revisionId = "00000000-0000-4000-8000-000000000002";
const publishedRevisionId = "00000000-0000-4000-8000-000000000003";
const state = {
  authorized: true,
  databaseName: "neondb",
  field: {
    id: fieldId,
    publishedRevisionId,
    latestRevisionId: revisionId,
    publicationStatus: "in_review",
    revisionNumber: 2,
  },
  content: {
    introduction: "Introduction",
    broadlyInvolves: "Topics",
    activitiesAndWorkAreas: "Activities",
    learningAndSubjectConnections: "Learning",
    courseFamiliesToExplore: "Courses",
    furtherExploration: "Further exploration",
  },
  publishedHistory: false,
  cacheInvalidations: 0,
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
    if (statement.includes("role='admin'")) {
      return state.authorized
        ? { rowCount: 1, rows: [{ id: params[0] }] }
        : { rowCount: 0, rows: [] };
    }
    if (statement.startsWith("SELECT item.id,")) return { rowCount: 1, rows: [state.field] };
    if (statement.startsWith("SELECT revision.title, field.field_content")) {
      return { rowCount: 1, rows: [{ title: "Test Field", field_content: state.content }] };
    }
    if (statement.startsWith("SELECT 1 FROM public.catalog_item_revisions")) {
      return {
        rowCount: state.publishedHistory ? 1 : 0,
        rows: state.publishedHistory ? [{ "?column?": 1 }] : [],
      };
    }
    if (statement.startsWith("INSERT INTO public.catalog_item_revisions")) {
      return { rowCount: 1, rows: [{ id: "00000000-0000-4000-8000-000000000004" }] };
    }
    if (statement.startsWith("DELETE FROM public.catalog_items")) return { rowCount: 1, rows: [] };
    if (statement.startsWith("DELETE FROM public.catalog_item_revisions")) return { rowCount: 1, rows: [] };
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
    parent?.filename.endsWith("fields\\[id]\\lifecycle\\route.ts")
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
    parent?.filename.endsWith("fields\\[id]\\lifecycle\\route.ts")
  ) {
    return { getIdentityLockPool: () => ({ connect: async () => client }) };
  }
  if (
    request === "../../../../../../../db/field-images" &&
    parent?.filename.endsWith("fields\\[id]\\lifecycle\\route.ts")
  ) {
    return {
      invalidatePublishedFieldImageCache() {
        state.cacheInvalidations += 1;
      },
    };
  }
  if (
    request === "../../../../../../../../scripts/import-real-pathway-draft.mjs" &&
    parent?.filename.endsWith("fields\\[id]\\lifecycle\\route.ts")
  ) {
    return {
      assertDevelopmentTarget() {},
      verifyNeonDevelopmentEndpoint() {
        throw new Error("Neon management API is unavailable.");
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const route = require("./api/admin/catalogue/fields/[id]/lifecycle/route.ts");
Module._load = originalLoad;

function request(body, origin = "http://localhost") {
  return new Request("http://localhost/api/admin/catalogue/fields/test-field/lifecycle", {
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
  state.field = {
    id: fieldId,
    publishedRevisionId,
    latestRevisionId: revisionId,
    publicationStatus: "in_review",
    revisionNumber: 2,
  };
  state.content = {
    introduction: "Introduction",
    broadlyInvolves: "Topics",
    activitiesAndWorkAreas: "Activities",
    learningAndSubjectConnections: "Learning",
    courseFamiliesToExplore: "Courses",
    furtherExploration: "Further exploration",
  };
  state.publishedHistory = false;
  state.cacheInvalidations = 0;
  state.queries = [];
}

async function post(body) {
  return route.POST(request(body), { params: Promise.resolve({ id: "test-field" }) });
}

test("publishing ready Field revision updates the published pointer transactionally", async () => {
  reset();
  const response = await post(lifecycleBody("publish"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: "test-field", action: "publish" });
  assert.ok(state.queries.some(({ statement }) =>
    statement.includes("SET publication_status = 'published'"),
  ));
  assert.ok(state.queries.some(({ statement }) =>
    statement.includes("SET published_revision_id = $1"),
  ));
  assert.ok(state.queries.some(({ statement }) => statement === "COMMIT"));
  assert.equal(state.cacheInvalidations, 1);
});

test("publish rejects incomplete content and leaves the published pointer unchanged", async () => {
  reset();
  delete state.content.furtherExploration;
  const response = await post(lifecycleBody("publish"));
  assert.equal(response.status, 422);
  assert.match((await response.json()).error, /Further exploration/);
  assert.ok(state.queries.some(({ statement }) => statement === "ROLLBACK"));
  assert.ok(!state.queries.some(({ statement }) =>
    statement.includes("SET published_revision_id = $1"),
  ));
});

test("publish rejects a stale latest revision before changing publication", async () => {
  reset();
  const response = await post(lifecycleBody(
    "publish",
    "00000000-0000-4000-8000-000000000009",
  ));
  assert.equal(response.status, 409);
  assert.ok(!state.queries.some(({ statement }) =>
    statement.includes("SET publication_status = 'published'"),
  ));
});

test("archive preserves the published revision and clears the public pointer", async () => {
  reset();
  const response = await post(lifecycleBody("archive"));
  assert.equal(response.status, 200);
  assert.ok(state.queries.some(({ statement }) =>
    statement.includes("'archived', source.title"),
  ));
  assert.ok(state.queries.some(({ statement }) =>
    statement.includes("INSERT INTO public.field_revisions"),
  ));
  assert.ok(state.queries.some(({ statement }) =>
    statement.includes("SET published_revision_id = NULL"),
  ));
  assert.equal(state.cacheInvalidations, 1);
});

test("deleting an unpublished draft deletes its identity, while a published update keeps its identity", async () => {
  reset();
  state.field = {
    ...state.field,
    publishedRevisionId: null,
    publicationStatus: "draft",
  };
  const newDraft = await post(lifecycleBody("delete-draft", revisionId, null));
  assert.equal(newDraft.status, 200);
  assert.ok(state.queries.some(({ statement }) =>
    statement.startsWith("DELETE FROM public.catalog_items"),
  ));

  reset();
  state.field.publicationStatus = "draft";
  const updateDraft = await post(lifecycleBody("delete-draft"));
  assert.equal(updateDraft.status, 200);
  assert.ok(state.queries.some(({ statement }) =>
    statement.startsWith("DELETE FROM public.catalog_item_revisions"),
  ));
  assert.ok(!state.queries.some(({ statement }) =>
    statement.startsWith("DELETE FROM public.catalog_items"),
  ));

  reset();
  state.field = {
    ...state.field,
    publishedRevisionId: null,
    publicationStatus: "draft",
  };
  state.publishedHistory = true;
  const archivedDraft = await post(lifecycleBody("delete-draft", revisionId, null));
  assert.equal(archivedDraft.status, 200);
  assert.ok(state.queries.some(({ statement }) =>
    statement.startsWith("DELETE FROM public.catalog_item_revisions"),
  ));
  assert.ok(!state.queries.some(({ statement }) =>
    statement.startsWith("DELETE FROM public.catalog_items"),
  ));
});

test("lifecycle actions reject cross-origin requests and non-development databases", async () => {
  reset();
  const crossOrigin = await route.POST(
    request(lifecycleBody("publish"), "https://other.example"),
    { params: Promise.resolve({ id: "test-field" }) },
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
