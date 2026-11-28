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

const state = {
  authorized: true,
  duplicate: false,
  databaseName: "neondb",
  existingItem: null,
  latestRevision: null,
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
    if (statement.includes("pg_advisory_xact_lock")) return { rowCount: 1, rows: [] };
    if (statement.startsWith("SELECT item.id,")) {
      return state.existingItem
        ? { rowCount: 1, rows: [state.existingItem] }
        : { rowCount: 0, rows: [] };
    }
    if (statement.startsWith("SELECT id, revision_number")) {
      return state.latestRevision
        ? { rowCount: 1, rows: [state.latestRevision] }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("FROM public.catalog_items AS item")) {
      return { rowCount: state.duplicate ? 1 : 0, rows: state.duplicate ? [{ "?column?": 1 }] : [] };
    }
    if (statement.includes("FROM public.catalog_item_aliases")) return { rowCount: 0, rows: [] };
    if (statement.startsWith("INSERT INTO public.catalog_items")) {
      return { rowCount: 1, rows: [{ id: "00000000-0000-4000-8000-000000000001" }] };
    }
    if (statement.startsWith("INSERT INTO public.catalog_item_revisions")) {
      return { rowCount: 1, rows: [{ id: "00000000-0000-4000-8000-000000000002" }] };
    }
    if (statement.startsWith("SELECT public.normalize_source_url")) {
      return { rowCount: 1, rows: [{ normalized_url: params[0] }] };
    }
    if (statement.startsWith("SELECT id FROM public.source_registry")) {
      return { rowCount: 0, rows: [] };
    }
    if (statement.startsWith("INSERT INTO public.source_registry")) {
      return { rowCount: 1, rows: [{ id: "00000000-0000-4000-8000-000000000003" }] };
    }
    if (statement.startsWith("INSERT INTO public.catalog_revision_sources")) {
      return { rowCount: 1, rows: [] };
    }
    return { rowCount: 1, rows: [] };
  },
  release() {},
};

const adminAuthorization = {
  AdminAuthenticationRequiredError,
  AdminAccessDeniedError,
  async requireAdmin() {
    if (!state.authorized) throw new AdminAccessDeniedError();
    return { id: 7 };
  },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "next/server") {
    return {
      connection: async () => {},
      NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) },
    };
  }
  if (request === "../../../../admin-auth" &&
    parent?.filename.endsWith("catalogue\\fields\\field-draft.ts")) {
    return adminAuthorization;
  }
  if (request === "../../../../../db/pool" &&
    parent?.filename.endsWith("catalogue\\fields\\field-draft.ts")) {
    return { getIdentityLockPool: () => ({ connect: async () => client }) };
  }
  if (request === "../../../../../../scripts/import-real-pathway-draft.mjs" &&
    parent?.filename.endsWith("catalogue\\fields\\field-draft.ts")) {
    return {
      assertDevelopmentTarget() {},
      verifyNeonDevelopmentEndpoint() {
        throw new Error("Neon management API is unavailable.");
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const route = require("./api/admin/catalogue/fields/route.ts");
const updateRoute = require("./api/admin/catalogue/fields/[id]/route.ts");
Module._load = originalLoad;

function request(body, origin = "http://localhost") {
  return new Request("http://localhost/api/admin/catalogue/fields", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function updateRequest(identifier, body) {
  return new Request(`http://localhost/api/admin/catalogue/fields/${identifier}`, {
    method: "PUT",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function multipartRequest(identifier, body, imageAction, image) {
  const form = new FormData();
  form.set("draft", JSON.stringify(body));
  form.set("imageAction", imageAction);
  if (image) form.set("image", image);
  return new Request(
    `http://localhost/api/admin/catalogue/fields/${identifier}`,
    {
      method: "PUT",
      headers: { origin: "http://localhost" },
      body: form,
    },
  );
}

function reset() {
  state.authorized = true;
  state.duplicate = false;
  state.databaseName = "neondb";
  state.existingItem = null;
  state.latestRevision = null;
  state.queries = [];
}

test("Field creation rejects invalid input before opening a database transaction", async () => {
  reset();
  const response = await route.POST(request({
    name: " ",
    summary: "",
    content: {},
    sources: [],
  }));
  assert.equal(response.status, 422);
  assert.equal(state.queries.length, 0);
});

test("Field creation atomically saves a private draft and optional unverified source evidence", async () => {
  reset();
  const response = await route.POST(request({
    name: "New Field",
    summary: "A short summary.",
    description: "",
    content: { introduction: "An introduction." },
    sources: [{
      sourceName: "Official source",
      authority: "Public authority",
      canonicalUrl: "https://example.org/field",
      claimField: "introduction",
    }],
  }));

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    id: "new-field",
    catalogItemId: "00000000-0000-4000-8000-000000000001",
    revisionId: "00000000-0000-4000-8000-000000000002",
    revisionNumber: 1,
    publicationStatus: "draft",
  });
  const sql = state.queries.map(({ statement }) => statement);
  assert.ok(sql.includes("BEGIN"));
  assert.ok(sql.includes("COMMIT"));
  assert.ok(!sql.includes("ROLLBACK"));
  assert.ok(sql.some((statement) =>
    statement.includes("INSERT INTO public.catalog_items (item_type) VALUES ('field')"),
  ));
  const revision = state.queries.find(({ statement }) =>
    statement.startsWith("INSERT INTO public.catalog_item_revisions"),
  );
  assert.match(revision.statement, /'real'.*'unverified'/s);
  assert.equal(revision.params[2], "draft");
  assert.equal(revision.params[3], "New Field");
  assert.equal(revision.params[4], "A short summary.");
  assert.equal(revision.params[5], null);
  assert.equal(revision.params[6], 7);
  assert.deepEqual(JSON.parse(
    state.queries.find(({ statement }) =>
      statement.startsWith("INSERT INTO public.field_revisions"),
    ).params[1],
  ), { introduction: "An introduction." });
  const provenance = state.queries.find(({ statement }) =>
    statement.startsWith("INSERT INTO public.catalog_revision_sources"),
  );
  assert.equal(provenance.params[2], "field.new-field.introduction");
  assert.match(provenance.statement, /'unverified'/);
});

test("Field creation rejects duplicate names and rolls back without inserting records", async () => {
  reset();
  state.duplicate = true;
  const response = await route.POST(request({
    name: "Existing Field",
    summary: "",
    description: "",
    content: {},
    sources: [],
  }));

  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /already exists/i);
  assert.ok(state.queries.some(({ statement }) => statement === "ROLLBACK"));
  assert.ok(!state.queries.some(({ statement }) =>
    statement.startsWith("INSERT INTO public.catalog_items"),
  ));
});

test("Field creation refuses to start a transaction outside the development database", async () => {
  reset();
  state.databaseName = "production";
  const originalError = console.error;
  console.error = () => {};
  let response;
  try {
    response = await route.POST(request({
      name: "Blocked Field",
      summary: "",
      description: "",
      content: {},
      sources: [],
    }));
  } finally {
    console.error = originalError;
  }

  assert.equal(response.status, 503);
  assert.ok(!state.queries.some(({ statement }) => statement === "BEGIN"));
  assert.ok(!state.queries.some(({ statement }) =>
    statement.startsWith("INSERT INTO public.catalog_items"),
  ));
});

test("Field creation rejects non-HTTPS evidence URLs", async () => {
  reset();
  const response = await route.POST(request({
    name: "Another Field",
    summary: "",
    description: "",
    content: {},
    sources: [{
      sourceName: "Unsafe source",
      authority: "",
      canonicalUrl: "http://example.org",
      claimField: "introduction",
    }],
  }));
  assert.equal(response.status, 422);
  assert.equal(state.queries.length, 0);
});

test("Field creation requires same-origin requests and admin authorization", async () => {
  reset();
  const crossOrigin = await route.POST(request({
    name: "Cross origin",
    summary: "",
    description: "",
    content: {},
    sources: [],
  }, "https://other.example"));
  assert.equal(crossOrigin.status, 403);
  assert.equal(state.queries.length, 0);

  reset();
  state.authorized = false;
  const unauthorized = await route.POST(request({
    name: "Unauthorized",
    summary: "",
    description: "",
    content: {},
    sources: [],
  }));
  assert.equal(unauthorized.status, 403);
  assert.equal(state.queries.length, 0);
});

test("editing a Field creates a new draft revision and carries sources forward as unverified", async () => {
  reset();
  state.existingItem = {
    id: "00000000-0000-4000-8000-000000000001",
    external_key: "existing-field",
  };
  state.latestRevision = {
    id: "00000000-0000-4000-8000-000000000009",
    revision_number: 4,
  };
  const response = await updateRoute.PUT(
    updateRequest("existing-field", {
      name: "Existing Field Updated",
      summary: "Updated summary.",
      description: "",
      content: { introduction: "Updated introduction." },
      expectedRevisionId: state.latestRevision.id,
      sources: [],
    }),
    { params: Promise.resolve({ id: "existing-field" }) },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    id: "existing-field",
    catalogItemId: state.existingItem.id,
    revisionId: "00000000-0000-4000-8000-000000000002",
    revisionNumber: 5,
    publicationStatus: "draft",
  });

  const revision = state.queries.find(({ statement }) =>
    statement.startsWith("INSERT INTO public.catalog_item_revisions"),
  );
  assert.equal(revision.params[1], 5);
  assert.match(revision.statement, /'real'.*'unverified'/s);
  assert.equal(revision.params[2], "draft");
  assert.ok(state.queries.some(({ statement }) =>
    statement.includes("SELECT $1, source_id, claim_key, 'unverified'"),
  ));
  const duplicateQuery = state.queries.find(({ statement }) =>
    statement.includes("LOWER(regexp_replace(BTRIM(revision.title)"),
  );
  assert.equal(duplicateQuery.params[1], state.existingItem.id);
  assert.ok(state.queries.some(({ statement }) =>
    statement.startsWith("UPDATE public.catalog_items SET updated_at"),
  ));
  assert.ok(!state.queries.some(({ statement }) =>
    statement.includes("SET published_revision_id"),
  ));
});

test("Field image replacement is stored on the new draft revision", async () => {
  reset();
  state.existingItem = {
    id: "00000000-0000-4000-8000-000000000010",
    external_key: "technology",
  };
  state.latestRevision = {
    id: "00000000-0000-4000-8000-000000000011",
    revision_number: 2,
  };
  const image = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0x11])], "field.jpg", {
    type: "image/jpeg",
  });
  const response = await updateRoute.PUT(
    multipartRequest(
      "technology",
      {
        name: "Technology",
        summary: "",
        description: "",
        content: {},
        sources: [],
        expectedRevisionId: state.latestRevision.id,
      },
      "replace",
      image,
    ),
    { params: Promise.resolve({ id: "technology" }) },
  );

  assert.equal(response.status, 200);
  const imageInsert = state.queries.find(({ statement }) =>
    statement.startsWith("INSERT INTO public.field_revision_images"),
  );
  assert.ok(imageInsert);
  assert.deepEqual([...imageInsert.params[1]], [0xff, 0xd8, 0xff, 0x11]);
  assert.equal(imageInsert.params[2], "image/jpeg");
  assert.equal(imageInsert.params[3], false);
});

test("Field image removal is recorded as draft state without updating the published image", async () => {
  reset();
  state.existingItem = {
    id: "00000000-0000-4000-8000-000000000010",
    external_key: "technology",
  };
  state.latestRevision = {
    id: "00000000-0000-4000-8000-000000000011",
    revision_number: 2,
  };
  const response = await updateRoute.PUT(
    multipartRequest(
      "technology",
      {
        name: "Technology",
        summary: "",
        description: "",
        content: {},
        sources: [],
        expectedRevisionId: state.latestRevision.id,
      },
      "remove",
    ),
    { params: Promise.resolve({ id: "technology" }) },
  );

  assert.equal(response.status, 200);
  const imageInsert = state.queries.find(({ statement }) =>
    statement.startsWith("INSERT INTO public.field_revision_images"),
  );
  assert.ok(imageInsert);
  assert.deepEqual(imageInsert.params, [
    "00000000-0000-4000-8000-000000000002",
    null,
    null,
    true,
  ]);
  assert.ok(!state.queries.some(({ statement }) =>
    statement.startsWith("UPDATE public.field_revision_images"),
  ));
});

test("Field can be marked ready for review only after all content sections are present", async () => {
  reset();
  const incomplete = await route.POST(request({
    name: "Incomplete Field",
    summary: "",
    description: "",
    content: { introduction: "Only one section." },
    sources: [],
    publicationStatus: "in_review",
  }));
  assert.equal(incomplete.status, 422);
  assert.equal(state.queries.length, 0);

  const content = {
    introduction: "Introduction",
    broadlyInvolves: "Topics",
    activitiesAndWorkAreas: "Activities",
    learningAndSubjectConnections: "Learning",
    courseFamiliesToExplore: "Courses",
    furtherExploration: "Further exploration",
  };
  const ready = await route.POST(request({
    name: "Complete Field",
    summary: "",
    description: "",
    content,
    sources: [],
    publicationStatus: "in_review",
  }));
  assert.equal(ready.status, 201);
  assert.equal((await ready.json()).publicationStatus, "in_review");
  const revision = state.queries.find(({ statement }) =>
    statement.startsWith("INSERT INTO public.catalog_item_revisions"),
  );
  assert.equal(revision.params[2], "in_review");
});

test("editing rejects stale revisions without inserting a new revision", async () => {
  reset();
  state.existingItem = {
    id: "00000000-0000-4000-8000-000000000001",
    external_key: "existing-field",
  };
  state.latestRevision = {
    id: "00000000-0000-4000-8000-000000000009",
    revision_number: 4,
  };
  const response = await updateRoute.PUT(
    updateRequest("existing-field", {
      name: "Existing Field Updated",
      summary: "",
      description: "",
      content: {},
      expectedRevisionId: "00000000-0000-4000-8000-000000000008",
      sources: [],
    }),
    { params: Promise.resolve({ id: "existing-field" }) },
  );

  assert.equal(response.status, 409);
  assert.ok(state.queries.some(({ statement }) => statement === "ROLLBACK"));
  assert.ok(!state.queries.some(({ statement }) =>
    statement.startsWith("INSERT INTO public.catalog_item_revisions"),
  ));
});
