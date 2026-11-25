import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";
import pg from "pg";
import { reconcileSourceRegistry } from "./source-reconciliation.mjs";

const databaseUrl = process.env.SOURCE_RECONCILIATION_TEST_DATABASE_URL;
const expectedDatabaseName = "careerbridge_source_reconciliation_test";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function validateDatabaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "SOURCE_RECONCILIATION_TEST_DATABASE_URL must be a PostgreSQL URL for the dedicated local test database.",
    );
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "::1"].includes(hostname) ||
    databaseName !== expectedDatabaseName ||
    [...url.searchParams.keys()].some((key) =>
      ["host", "hostaddr", "service"].includes(key.toLowerCase()),
    )
  ) {
    throw new Error(
      "Source reconciliation tests require loopback and the dedicated careerbridge_source_reconciliation_test database; no connection was opened.",
    );
  }
  return databaseName;
}

if (!databaseUrl) {
  test("Source reconciliation PostgreSQL integration suite", {
    skip: "SOURCE_RECONCILIATION_TEST_DATABASE_URL is unset; no database connection was attempted.",
  }, () => {});
} else {
  const databaseName = validateDatabaseUrl(databaseUrl);
  const { Pool } = pg;
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 2500, max: 1 });
  let schemaCreated = false;

  before(async () => {
    const client = await pool.connect();
    try {
      const identity = await client.query("SELECT current_database() AS name");
      assert.equal(identity.rows[0].name, databaseName);
      const existing = await client.query(
        `SELECT to_regclass('public.source_registry') AS source_table,
                to_regprocedure('public.normalize_source_url(text)') AS normalizer,
                to_regprocedure('public.set_source_registry_normalized_url()') AS trigger_function`,
      );
      assert.deepEqual(existing.rows[0], {
        source_table: null,
        normalizer: null,
        trigger_function: null,
      }, "Refusing to overwrite existing source registry test objects.");

      const migration = await readFile(
        resolve(projectRoot, "drizzle/0000_initial-schema.sql"),
        "utf8",
      );
      const statements = migration
        .split(/-->\s*statement-breakpoint/)
        .map((statement) => statement.trim())
        .filter((statement) =>
          statement.startsWith("CREATE FUNCTION public.normalize_source_url(raw_url text)") ||
          statement.startsWith("CREATE FUNCTION public.set_source_registry_normalized_url()") ||
          statement.startsWith("CREATE TRIGGER source_registry_normalize_url"),
        );
      assert.equal(statements.length, 3, "Could not load the database's source URL normalization DDL.");

      await client.query("BEGIN");
      try {
        await client.query(`
          CREATE TABLE public.source_registry (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            source_name text NOT NULL,
            authority text,
            canonical_url text,
            category text NOT NULL,
            source_type text NOT NULL,
            data_types text[] NOT NULL DEFAULT ARRAY[]::text[],
            terms_notes text,
            expected_update_behavior text,
            status text NOT NULL DEFAULT 'active',
            normalized_url text,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT source_registry_normalized_url_unique UNIQUE (normalized_url)
          )
        `);
        for (const statement of statements) await client.query(statement);
        await client.query("COMMIT");
        schemaCreated = true;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    } finally {
      client.release();
    }
  });

  after(async () => {
    if (schemaCreated) {
      await pool.query(`
        DROP TABLE IF EXISTS public.source_registry CASCADE;
        DROP FUNCTION IF EXISTS public.set_source_registry_normalized_url();
        DROP FUNCTION IF EXISTS public.normalize_source_url(text);
      `);
    }
    await pool.end();
  });

  function source(sourceKey, overrides = {}) {
    return {
      sourceKey,
      sourceName: `Source ${sourceKey}`,
      authority: "Test Authority",
      canonicalUrl: `https://${sourceKey}.example.test/source`,
      category: "test_source",
      sourceType: "official_public_web_page",
      status: "active",
      ...overrides,
    };
  }

  async function apply(client, sources) {
    await client.query("BEGIN");
    try {
      const result = await reconcileSourceRegistry(client, sources, { mode: "apply" });
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  test("reconciles source records against disposable PostgreSQL", async (t) => {
    const client = await pool.connect();
    try {
      await t.test("inserts missing sources and preserves exact hostnames", async () => {
        const result = await apply(client, [
          source("www", { canonicalUrl: "https://www.example.test/source" }),
          source("bare", { canonicalUrl: "https://example.test/source" }),
        ]);
        assert.deepEqual(result.map((entry) => entry.action), ["inserted", "inserted"]);
        assert.match(result[0].id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        assert.notEqual(result[0].id, result[1].id);
        assert.deepEqual(
          result.map((entry) => entry.normalizedUrl),
          ["https://www.example.test/source", "https://example.test/source"],
        );
        const rows = await client.query(
          "SELECT id, canonical_url FROM public.source_registry ORDER BY canonical_url",
        );
        assert.deepEqual(rows.rows.map((row) => row.canonical_url), [
          "https://example.test/source",
          "https://www.example.test/source",
        ]);
        await client.query("TRUNCATE public.source_registry");
      });

      await t.test("reuses exact matches idempotently", async () => {
        const record = source("repeat");
        const first = await apply(client, [record]);
        const second = await apply(client, [record]);
        const third = await apply(client, [record]);
        assert.equal(first[0].action, "inserted");
        assert.equal(second[0].action, "reused");
        assert.equal(third[0].action, "reused");
        assert.equal(first[0].id, second[0].id);
        assert.equal(second[0].id, third[0].id);
        await client.query("TRUNCATE public.source_registry");
      });

      await t.test("does not compare or overwrite optional metadata that was not supplied", async () => {
        const record = source("optional");
        await client.query(
          `INSERT INTO public.source_registry
            (source_name, authority, canonical_url, category, source_type, data_types,
             terms_notes, expected_update_behavior)
           VALUES ($1, $2, $3, $4, $5, $6, 'existing notes', 'annual')`,
          [
            record.sourceName,
            record.authority,
            record.canonicalUrl,
            record.category,
            record.sourceType,
            ["existing-type"],
          ],
        );
        const [reused] = await apply(client, [record]);
        assert.equal(reused.action, "reused");
        const row = await client.query(
          "SELECT data_types, terms_notes, expected_update_behavior FROM public.source_registry WHERE id = $1",
          [reused.id],
        );
        assert.deepEqual(row.rows[0], {
          data_types: ["existing-type"],
          terms_notes: "existing notes",
          expected_update_behavior: "annual",
        });
        await client.query("TRUNCATE public.source_registry");
      });

      await t.test("rejects conflicting metadata without modifying the existing row", async () => {
        const record = source("conflict");
        const [created] = await apply(client, [record]);
        await assert.rejects(
          apply(client, [source("conflict", { sourceName: "Different source name" })]),
          /conflicts with existing metadata: sourceName/,
        );
        const row = await client.query(
          "SELECT id, source_name FROM public.source_registry WHERE id = $1",
          [created.id],
        );
        assert.deepEqual(row.rows, [{ id: created.id, source_name: record.sourceName }]);
        await client.query("TRUNCATE public.source_registry");
      });

      await t.test("coalesces identical batch URLs and rejects conflicting duplicates", async () => {
        const duplicate = source("duplicate");
        const inserted = await apply(client, [
          duplicate,
          { ...duplicate, sourceKey: "duplicate-alias" },
        ]);
        assert.equal(inserted.filter((entry) => entry.action === "inserted").length, 1);
        assert.equal(inserted[0].id, inserted[1].id);
        assert.equal((await client.query("SELECT count(*)::int AS count FROM public.source_registry")).rows[0].count, 1);

        await assert.rejects(
          apply(client, [
            duplicate,
            { ...duplicate, sourceKey: "fragment-variant", canonicalUrl: `${duplicate.canonicalUrl}#section` },
          ]),
          /same normalized URL with conflicting metadata: canonicalUrl/,
        );
        assert.equal((await client.query("SELECT count(*)::int AS count FROM public.source_registry")).rows[0].count, 1);
        await client.query("TRUNCATE public.source_registry");
      });

      await t.test("fails closed when the database contains ambiguous normalized matches", async () => {
        await client.query("ALTER TABLE public.source_registry DROP CONSTRAINT source_registry_normalized_url_unique");
        try {
          const record = source("ambiguous");
          await client.query(
            `INSERT INTO public.source_registry
              (source_name, authority, canonical_url, category, source_type)
             VALUES ($1, $2, $3, $4, $5), ($1, $2, $3, $4, $5)`,
            [record.sourceName, record.authority, record.canonicalUrl, record.category, record.sourceType],
          );
          await assert.rejects(
            reconcileSourceRegistry(client, [record], { mode: "preview" }),
            /Ambiguous source registry match/,
          );
        } finally {
          await client.query("TRUNCATE public.source_registry");
          await client.query(
            "ALTER TABLE public.source_registry ADD CONSTRAINT source_registry_normalized_url_unique UNIQUE (normalized_url)",
          );
        }
      });

      await t.test("preview reports planned inserts without writing", async () => {
        const result = await reconcileSourceRegistry(
          client,
          [source("preview")],
          { mode: "preview" },
        );
        assert.equal(result[0].action, "would_insert");
        assert.equal(result[0].id, null);
        assert.equal(
          (await client.query("SELECT count(*)::int AS count FROM public.source_registry")).rows[0].count,
          0,
        );
      });

      await t.test("rolls back earlier inserts when a later insert fails", async () => {
        await client.query(`
          CREATE FUNCTION public.reject_source_reconciliation_test_insert()
          RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN
            IF NEW.canonical_url = 'https://reject.example.test/source' THEN
              RAISE EXCEPTION 'injected source insert failure';
            END IF;
            RETURN NEW;
          END;
          $$
        `);
        await client.query(`
          CREATE TRIGGER reject_source_reconciliation_test_insert
          BEFORE INSERT ON public.source_registry
          FOR EACH ROW EXECUTE FUNCTION public.reject_source_reconciliation_test_insert()
        `);
        await client.query("BEGIN");
        try {
          await assert.rejects(
            reconcileSourceRegistry(
              client,
              [
                source("first"),
                source("reject", { canonicalUrl: "https://reject.example.test/source" }),
              ],
              { mode: "apply" },
            ),
            /injected source insert failure/,
          );
          assert.equal(
            (await client.query("SELECT count(*)::int AS count FROM public.source_registry")).rows[0].count,
            0,
          );
        } finally {
          await client.query("ROLLBACK");
          await client.query("DROP TRIGGER reject_source_reconciliation_test_insert ON public.source_registry");
          await client.query("DROP FUNCTION public.reject_source_reconciliation_test_insert()");
        }
      });
    } finally {
      client.release();
    }
  });
}
