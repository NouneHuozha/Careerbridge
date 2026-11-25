import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { after, before } from "node:test";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Set TEST_DATABASE_URL to a local disposable PostgreSQL test database.");
}

const parsedDatabaseUrl = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.slice(1));
const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(parsedDatabaseUrl.hostname);
if (!isLocalHost || !/^careerbridge_fields_test(?:[_-][a-z0-9]+)*$/i.test(databaseName)) {
  throw new Error("Fields PostgreSQL tests require a local database named careerbridge_fields_test.");
}

const originalDatabaseUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = databaseUrl;

const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");
const { Pool } = require("pg");
const testPool = new Pool({ connectionString: databaseUrl, max: 2 });
const tableNames = [
  "catalog_items",
  "catalog_item_aliases",
  "catalog_item_revisions",
  "field_revisions",
  "source_registry",
  "catalog_revision_sources",
];
let appPool;
let schemaCreated = false;
let fieldReader;

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
  return originalLoad.call(this, request, parent, isMain);
};
fieldReader = require("./fields.ts");
Module._load = originalLoad;

const ids = {
  publishedItem: "10000000-0000-4000-8000-000000000001",
  draftItem: "10000000-0000-4000-8000-000000000002",
  noPointerItem: "10000000-0000-4000-8000-000000000003",
  demoItem: "10000000-0000-4000-8000-000000000004",
  testItem: "10000000-0000-4000-8000-000000000005",
  publishedRevision: "20000000-0000-4000-8000-000000000001",
  draftRevision: "20000000-0000-4000-8000-000000000002",
  noPointerRevision: "20000000-0000-4000-8000-000000000003",
  demoRevision: "20000000-0000-4000-8000-000000000004",
  testRevision: "20000000-0000-4000-8000-000000000005",
  source: "30000000-0000-4000-8000-000000000001",
};

const publishedContent = {
  introduction: "PostgreSQL field introduction.",
  broadlyInvolves: "PostgreSQL broad involvement.",
  activitiesAndWorkAreas: "PostgreSQL activities.",
  learningAndSubjectConnections: "PostgreSQL learning connections.",
  courseFamiliesToExplore: "PostgreSQL course families.",
  furtherExploration: "PostgreSQL further exploration.",
};

async function prepareDatabase() {
  const client = await testPool.connect();
  try {
    const database = await client.query("SELECT current_database() AS name");
    assert.equal(database.rows[0].name, databaseName);

    const existing = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])",
      [tableNames],
    );
    assert.deepEqual(existing.rows, [], "Refusing to overwrite existing catalogue test tables.");

    await client.query("BEGIN");
    try {
      await client.query(`
        CREATE TABLE public.catalog_items (
          id uuid PRIMARY KEY,
          item_type text NOT NULL,
          published_revision_id uuid
        )
      `);
      await client.query(`
        CREATE TABLE public.catalog_item_revisions (
          id uuid PRIMARY KEY,
          catalog_item_id uuid NOT NULL REFERENCES public.catalog_items(id),
          revision_number integer NOT NULL,
          publication_status text NOT NULL,
          title text NOT NULL,
          summary text,
          description text,
          data_classification text NOT NULL,
          verification_status text NOT NULL,
          published_at timestamptz,
          UNIQUE (catalog_item_id, id),
          CHECK ((publication_status = 'published') = (published_at IS NOT NULL))
        )
      `);
      await client.query(`
        ALTER TABLE public.catalog_items
        ADD CONSTRAINT catalog_items_published_revision_fk
        FOREIGN KEY (id, published_revision_id)
        REFERENCES public.catalog_item_revisions(catalog_item_id, id)
        DEFERRABLE INITIALLY DEFERRED
      `);
      await client.query(`
        CREATE TABLE public.catalog_item_aliases (
          source_system text NOT NULL,
          external_type text NOT NULL,
          external_key text NOT NULL,
          external_context_key text NOT NULL DEFAULT '',
          catalog_item_id uuid NOT NULL REFERENCES public.catalog_items(id),
          PRIMARY KEY (source_system, external_type, external_key, external_context_key)
        )
      `);
      await client.query(`
        CREATE TABLE public.field_revisions (
          revision_id uuid PRIMARY KEY REFERENCES public.catalog_item_revisions(id),
          field_content jsonb NOT NULL,
          CHECK (jsonb_typeof(field_content) = 'object')
        )
      `);
      await client.query(`
        CREATE TABLE public.source_registry (
          id uuid PRIMARY KEY,
          source_name text NOT NULL,
          authority text,
          canonical_url text,
          category text NOT NULL,
          source_type text NOT NULL
        )
      `);
      await client.query(`
        CREATE TABLE public.catalog_revision_sources (
          revision_id uuid NOT NULL REFERENCES public.catalog_item_revisions(id),
          source_id uuid NOT NULL REFERENCES public.source_registry(id),
          claim_key text NOT NULL DEFAULT '',
          checked_at timestamptz,
          verified_at timestamptz,
          verification_status text,
          PRIMARY KEY (revision_id, source_id, claim_key)
        )
      `);

      const items = [
        [ids.publishedItem, "field", ids.publishedRevision],
        [ids.draftItem, "field", null],
        [ids.noPointerItem, "field", null],
        [ids.demoItem, "field", ids.demoRevision],
        [ids.testItem, "field", ids.testRevision],
      ];
      for (const [id, itemType, publishedRevisionId] of items) {
        await client.query(
          "INSERT INTO public.catalog_items (id, item_type, published_revision_id) VALUES ($1, $2, $3)",
          [id, itemType, publishedRevisionId],
        );
      }

      const revisions = [
        [ids.publishedRevision, ids.publishedItem, "published", "real", "Published field"],
        [ids.draftRevision, ids.draftItem, "draft", "real", "Draft field"],
        [ids.noPointerRevision, ids.noPointerItem, "published", "real", "Field without pointer"],
        [ids.demoRevision, ids.demoItem, "published", "demo", "Demo field"],
        [ids.testRevision, ids.testItem, "published", "test", "Test field"],
      ];
      for (const [id, catalogItemId, publicationStatus, classification, title] of revisions) {
        await client.query(
          `INSERT INTO public.catalog_item_revisions
            (id, catalog_item_id, revision_number, publication_status, title, summary,
             data_classification, verification_status, published_at)
           VALUES ($1, $2, 1, $3, $4, $5, $6, 'pending_review',
                   CASE WHEN $3 = 'published' THEN '2026-11-19 12:00:00+00'::timestamptz ELSE NULL END)`,
          [id, catalogItemId, publicationStatus, title, `${title} summary`, classification],
        );
        await client.query(
          "INSERT INTO public.field_revisions (revision_id, field_content) VALUES ($1, $2::jsonb)",
          [id, JSON.stringify(publishedContent)],
        );
      }

      await client.query(
        `INSERT INTO public.catalog_item_aliases
          (source_system, external_type, external_key, external_context_key, catalog_item_id)
         VALUES
          ('careerbridge', 'field', 'technology', '', $1),
          ('legacy-import', 'field', 'old-technology', '', $1),
          ('careerbridge', 'field', 'draft-field', '', $2),
          ('careerbridge', 'field', 'unpublished-field', '', $3),
          ('careerbridge', 'field', 'demo-field', '', $4),
          ('careerbridge', 'field', 'test-field', '', $5)`,
        [ids.publishedItem, ids.draftItem, ids.noPointerItem, ids.demoItem, ids.testItem],
      );
      await client.query(
        `INSERT INTO public.source_registry
          (id, source_name, authority, canonical_url, category, source_type)
         VALUES ($1, 'Test Source', 'Test Authority', 'https://example.test/source',
                 'test_source', 'official_public_web_page')`,
        [ids.source],
      );
      await client.query(
        `INSERT INTO public.catalog_revision_sources
          (revision_id, source_id, claim_key, checked_at, verified_at, verification_status)
         VALUES ($1, $2, 'field.technology.example-claim', '2026-11-19 00:00:00+00',
                 NULL, 'pending_review')`,
        [ids.publishedRevision, ids.source],
      );
      await client.query("COMMIT");
      schemaCreated = true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    appPool = require("./pool.ts").getPool();
  } finally {
    client.release();
  }
}

before(prepareDatabase);

after(async () => {
  if (appPool) await appPool.end();
  if (schemaCreated) {
    await testPool.query(`
      DROP TABLE public.catalog_revision_sources, public.field_revisions,
        public.source_registry, public.catalog_item_aliases,
        public.catalog_items, public.catalog_item_revisions
    `);
  }
  await testPool.end();
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

test("PostgreSQL returns only published real fields with a valid published pointer", async () => {
  const fields = await fieldReader.listPublishedFields();

  assert.deepEqual(fields.map((field) => field.id), ["technology"]);
  assert.equal(fields[0].catalogItemId, ids.publishedItem);
});

test("PostgreSQL maps all six content fields and source provenance", async () => {
  const field = await fieldReader.getPublishedField("technology");

  assert.deepEqual(field.content, publishedContent);
  assert.deepEqual(field.provenance, [{
    sourceId: ids.source,
    sourceName: "Test Source",
    authority: "Test Authority",
    canonicalUrl: "https://example.test/source",
    category: "test_source",
    sourceType: "official_public_web_page",
    claimKey: "field.technology.example-claim",
    checkedAt: new Date("2026-11-19T00:00:00.000Z"),
    verifiedAt: null,
    verificationStatus: "pending_review",
  }]);
});

test("PostgreSQL resolves canonical field IDs and aliases", async () => {
  const canonical = await fieldReader.getPublishedField("technology");
  const alias = await fieldReader.getPublishedField("old-technology");

  assert.equal(canonical.id, "technology");
  assert.equal(alias.catalogItemId, ids.publishedItem);
  assert.deepEqual(alias.aliases.map((entry) => entry.externalKey).sort(), [
    "old-technology",
    "technology",
  ]);
});

test("PostgreSQL excludes drafts, records without a pointer, and demo/test records", async () => {
  for (const id of ["draft-field", "unpublished-field", "demo-field", "test-field"]) {
    assert.equal(await fieldReader.getPublishedField(id), null, `${id} must not be visible.`);
  }
});

test("PostgreSQL returns null for a missing field and an empty array when none are published", async () => {
  assert.equal(await fieldReader.getPublishedField("missing-field"), null);

  try {
    await testPool.query("UPDATE public.catalog_items SET published_revision_id = NULL");
    assert.deepEqual(await fieldReader.listPublishedFields(), []);
  } finally {
    await testPool.query(
      "UPDATE public.catalog_items SET published_revision_id = $1 WHERE id = $2",
      [ids.publishedRevision, ids.publishedItem],
    );
  }
});
