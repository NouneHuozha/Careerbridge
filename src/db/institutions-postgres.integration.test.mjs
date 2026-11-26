import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { isIPv4 } from "node:net";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";
import { importOneInstitutionCatalogueDraft } from "../../scripts/import-institution-catalogue-draft.mjs";
import * as catalogueLifecycle from "../../scripts/publish-real-pathway.mjs";

const databaseUrl = process.env.INSTITUTIONS_TEST_DATABASE_URL;
const expectedDatabaseName = "careerbridge_institutions_test";

function validateDatabaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("INSTITUTIONS_TEST_DATABASE_URL must be a PostgreSQL URL for the dedicated local test database.");
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
      "Institutions PostgreSQL tests require loopback and the dedicated careerbridge_institutions_test database; no connection was opened.",
    );
  }
  return { databaseName };
}

if (!databaseUrl) {
  test("Institutions PostgreSQL integration suite", {
    skip: "INSTITUTIONS_TEST_DATABASE_URL is unset; no database connection was attempted.",
  }, () => {});
} else {
  const { databaseName } = validateDatabaseUrl(databaseUrl);
  const expectedServerAddress = process.env.INSTITUTIONS_TEST_EXPECTED_SERVER_ADDRESS;
  if (expectedServerAddress !== undefined && !isIPv4(expectedServerAddress)) {
    throw new Error(
      "INSTITUTIONS_TEST_EXPECTED_SERVER_ADDRESS must be an IPv4 address; no connection was opened.",
    );
  }
  const require = createRequire(import.meta.url);
  const Module = require("node:module");
  const ts = require("typescript");
  const { Pool } = require("pg");
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const testPool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 2500,
    max: 2,
  });
  const fixture = {
    institution: "a3000000-0000-4000-8000-000000000001",
    draftInstitution: "a3000000-0000-4000-8000-000000000002",
    demoInstitution: "a3000000-0000-4000-8000-000000000003",
    noPointerInstitution: "a3000000-0000-4000-8000-000000000004",
    campus: "a3000000-0000-4000-8000-000000000011",
    draftCampus: "a3000000-0000-4000-8000-000000000012",
    demoParentCampus: "a3000000-0000-4000-8000-000000000013",
    field: "a3000000-0000-4000-8000-000000000021",
    course: "a3000000-0000-4000-8000-000000000022",
    demoCourse: "a3000000-0000-4000-8000-000000000023",
    draftCourse: "a3000000-0000-4000-8000-000000000024",
    offering: "a3000000-0000-4000-8000-000000000031",
    demoCourseOffering: "a3000000-0000-4000-8000-000000000032",
    draftCourseOffering: "a3000000-0000-4000-8000-000000000033",
    lifecycleOfferingRevision: "a3100000-0000-4000-8000-000000000034",
    source: "a3000000-0000-4000-8000-000000000041",
    institutionRevision: "a3100000-0000-4000-8000-000000000001",
    draftInstitutionRevision: "a3100000-0000-4000-8000-000000000002",
    demoInstitutionRevision: "a3100000-0000-4000-8000-000000000003",
    noPointerInstitutionRevision: "a3100000-0000-4000-8000-000000000004",
    campusOldRevision: "a3100000-0000-4000-8000-000000000011",
    campusNewRevision: "a3100000-0000-4000-8000-000000000012",
    draftCampusRevision: "a3100000-0000-4000-8000-000000000013",
    demoParentCampusRevision: "a3100000-0000-4000-8000-000000000014",
    fieldRevision: "a3100000-0000-4000-8000-000000000021",
    courseOldRevision: "a3100000-0000-4000-8000-000000000022",
    courseNewRevision: "a3100000-0000-4000-8000-000000000023",
    demoCourseRevision: "a3100000-0000-4000-8000-000000000024",
    draftCourseRevision: "a3100000-0000-4000-8000-000000000025",
    offeringRevision: "a3100000-0000-4000-8000-000000000031",
    demoCourseOfferingRevision: "a3100000-0000-4000-8000-000000000032",
    draftCourseOfferingRevision: "a3100000-0000-4000-8000-000000000033",
    untypedItem: "a3000000-0000-4000-8000-000000000051",
    untypedRevision: "a3100000-0000-4000-8000-000000000051",
    invalidCampusItem: "a3000000-0000-4000-8000-000000000052",
    invalidCampusRevision: "a3100000-0000-4000-8000-000000000052",
    invalidOfferingItem: "a3000000-0000-4000-8000-000000000053",
    invalidOfferingRevision: "a3100000-0000-4000-8000-000000000053",
  };
  let schemaCreated = false;
  let fixturesSeeded = false;
  let poolModule;
  let appPool;
  let institutionReader;
  let importValidation;

  // The reader requires DATABASE_URL; provide only the validated integration-test URL.
  process.env.DATABASE_URL = databaseUrl;
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
  institutionReader = require("./institutions.ts");
  importValidation = require("./institution-import-validation.ts");
  poolModule = require("./pool.ts");
  Module._load = originalLoad;

  async function applySqlFile(client, relativePath) {
    const sql = await readFile(resolve(projectRoot, relativePath), "utf8");
    for (const statement of sql.split(/-->\s*statement-breakpoint/g)) {
      if (statement.trim()) await client.query(statement);
    }
  }

  async function ensureSchema(client) {
    const identity = await client.query(
      "SELECT current_database() AS name, inet_server_addr()::text AS server_address",
    );
    assert.equal(identity.rows[0].name, databaseName);
    const actualServerAddress = identity.rows[0].server_address;
    const normalizedServerAddress =
      typeof actualServerAddress === "string"
        ? actualServerAddress.replace(/\/\d+$/, "")
        : actualServerAddress;
    if (expectedServerAddress !== undefined) {
      assert.ok(
        isIPv4(normalizedServerAddress),
        "PostgreSQL server address must be an IPv4 address.",
      );
      assert.equal(
        normalizedServerAddress,
        expectedServerAddress,
        "PostgreSQL server address must match INSTITUTIONS_TEST_EXPECTED_SERVER_ADDRESS.",
      );
    } else {
      assert.ok(
        ["127.0.0.1", "::1"].includes(normalizedServerAddress),
        "A non-loopback PostgreSQL server requires INSTITUTIONS_TEST_EXPECTED_SERVER_ADDRESS.",
      );
    }

    const objects = await client.query(`
      SELECT (
        (SELECT count(*) FROM pg_class AS relation
         JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
         WHERE namespace.nspname = 'public' AND relation.relkind IN ('r', 'p', 'v', 'm', 'S', 'f'))
        + (SELECT count(*) FROM pg_proc AS routine
           JOIN pg_namespace AS namespace ON namespace.oid = routine.pronamespace
           WHERE namespace.nspname = 'public')
        + (SELECT count(*) FROM pg_type AS type
           JOIN pg_namespace AS namespace ON namespace.oid = type.typnamespace
           WHERE namespace.nspname = 'public' AND type.typtype IN ('b', 'c', 'd', 'e', 'r'))
      )::int AS count
    `);
    if (objects.rows[0].count !== 0) {
      throw new Error(
        "The dedicated test database public schema must be empty; refusing to use or alter pre-existing data.",
      );
    }

    await client.query("BEGIN");
    try {
      await applySqlFile(client, "src/app/auth-schema.sql");
      await applySqlFile(client, "drizzle/0000_initial-schema.sql");
      await client.query("COMMIT");
      schemaCreated = true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  async function dropTestSchema() {
    if (!schemaCreated) return;
    const client = await testPool.connect();
    try {
      await client.query("BEGIN");
      if (fixturesSeeded) {
        const fixtureRevisionIds = Object.entries(fixture)
          .filter(([key, value]) =>
            key.endsWith("Revision") &&
            !key.startsWith("untyped") &&
            !key.startsWith("invalid") &&
            value.startsWith("a31"),
          )
          .map(([, value]) => value);
        const revisions = await client.query(
          "SELECT id::text FROM public.catalog_item_revisions ORDER BY id",
        );
        assert.deepEqual(
          revisions.rows.map((row) => row.id).sort(),
          fixtureRevisionIds.sort(),
          "Refusing to remove the test schema because it contains non-fixture catalogue revisions.",
        );
        for (const table of [
          "users",
          "auth_sessions",
          "account_data",
          "student_profiles",
          "discover_answers",
          "exploration_history",
          "guided_explorer_sessions",
          "guided_explorer_session_questions",
          "guided_explorer_answers",
          "saved_items",
        ]) {
          const result = await client.query(`SELECT count(*)::int AS count FROM public."${table}"`);
          assert.equal(result.rows[0].count, 0, `Refusing to remove the test schema containing rows in ${table}.`);
        }
      }
      await client.query("DROP SCHEMA public CASCADE");
      await client.query("CREATE SCHEMA public");
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function addItem(client, { id, type, revisions, publishedRevisionId = null }) {
    await client.query(
      "INSERT INTO public.catalog_items (id, item_type, published_revision_id) VALUES ($1, $2, NULL)",
      [id, type],
    );
    for (const revision of revisions) {
      await client.query(
        `INSERT INTO public.catalog_item_revisions
          (id, catalog_item_id, revision_number, publication_status, title, summary,
           description, data_classification, verification_status, published_at)
         VALUES ($1, $2, $3, 'draft', $4, NULL, NULL, $5, $6, NULL)`,
        [
          revision.id,
          id,
          revision.number,
          revision.title,
          revision.classification,
          revision.verificationStatus ?? "pending_review",
        ],
      );
      if (revision.typed) await revision.typed(client, revision.id);
      if (revision.provenance) await revision.provenance(client, revision.id);
      await client.query(
        `UPDATE public.catalog_item_revisions
         SET publication_status = $1,
             published_at = CASE WHEN $1 = 'published'
               THEN '2026-11-20 12:00:00+00'::timestamptz
               ELSE NULL
             END
         WHERE id = $2`,
        [revision.status, revision.id],
      );
    }
    if (publishedRevisionId) {
      await client.query(
        "UPDATE public.catalog_items SET published_revision_id = $1 WHERE id = $2",
        [publishedRevisionId, id],
      );
    }
  }

  async function addAlias(client, itemId, externalType, externalKey, externalContextKey = "") {
    await client.query(
      `INSERT INTO public.catalog_item_aliases
        (source_system, external_type, external_key, external_context_key, catalog_item_id)
       VALUES ('careerbridge', $1, $2, $3, $4)`,
      [externalType, externalKey, externalContextKey, itemId],
    );
  }

  async function seedFixtures() {
    const client = await testPool.connect();
    try {
      await client.query("BEGIN");
      await addItem(client, {
        id: fixture.institution,
        type: "institution",
        publishedRevisionId: fixture.institutionRevision,
        revisions: [{
          id: fixture.institutionRevision,
          number: 1,
          status: "published",
          classification: "real",
          title: "A3 Test Institution",
          typed: (connection, revisionId) =>
            connection.query(
              `INSERT INTO public.institution_revisions
                (revision_id, slug, initials, institution_type, ownership, institution_content)
               VALUES ($1, 'a3-institution', 'A3', 'College', 'Public',
                       '{"fees":"unverified institutional fee","eligibility":"unverified admission"}'::jsonb)`,
              [revisionId],
            ),
        }],
      });
      await addAlias(client, fixture.institution, "institution", "a3-institution");

      await addItem(client, {
        id: fixture.draftInstitution,
        type: "institution",
        revisions: [{
          id: fixture.draftInstitutionRevision,
          number: 1,
          status: "draft",
          classification: "real",
          title: "A3 Draft Institution",
          typed: (connection, revisionId) =>
            connection.query(
              `INSERT INTO public.institution_revisions
                (revision_id, slug, initials, institution_type, institution_content)
               VALUES ($1, 'a3-draft-institution', 'AD', 'College', '{}'::jsonb)`,
              [revisionId],
            ),
        }],
      });
      await addAlias(client, fixture.draftInstitution, "institution", "a3-draft-institution");
      await addItem(client, {
        id: fixture.demoInstitution,
        type: "institution",
        publishedRevisionId: fixture.demoInstitutionRevision,
        revisions: [{
          id: fixture.demoInstitutionRevision,
          number: 1,
          status: "published",
          classification: "demo",
          title: "A3 Demo Institution",
          typed: (connection, revisionId) =>
            connection.query(
              `INSERT INTO public.institution_revisions
                (revision_id, slug, initials, institution_type, institution_content)
               VALUES ($1, 'a3-demo-institution', 'DE', 'College', '{}'::jsonb)`,
              [revisionId],
            ),
        }],
      });
      await addAlias(client, fixture.demoInstitution, "institution", "a3-demo-institution");
      await addItem(client, {
        id: fixture.noPointerInstitution,
        type: "institution",
        revisions: [{
          id: fixture.noPointerInstitutionRevision,
          number: 1,
          status: "published",
          classification: "real",
          title: "A3 Institution Without Pointer",
          typed: (connection, revisionId) =>
            connection.query(
              `INSERT INTO public.institution_revisions
                (revision_id, slug, initials, institution_type, institution_content)
               VALUES ($1, 'a3-no-pointer-institution', 'NP', 'College', '{}'::jsonb)`,
              [revisionId],
            ),
        }],
      });

      await addItem(client, {
        id: fixture.campus,
        type: "campus",
        publishedRevisionId: fixture.campusNewRevision,
        revisions: [
          {
            id: fixture.campusOldRevision,
            number: 1,
            status: "published",
            classification: "real",
            title: "A3 Historical Campus",
            typed: (connection, revisionId) =>
              connection.query(
                `INSERT INTO public.campus_revisions
                  (revision_id, institution_item_id, campus_content)
                 VALUES ($1, $2, '{"city":"Test City","fees":"unverified campus fees"}'::jsonb)`,
                [revisionId, fixture.institution],
              ),
          },
          {
            id: fixture.campusNewRevision,
            number: 2,
            status: "published",
            classification: "real",
            title: "A3 Current Campus",
            typed: (connection, revisionId) =>
              connection.query(
                `INSERT INTO public.campus_revisions
                  (revision_id, institution_item_id, campus_content)
                 VALUES ($1, $2, '{"city":"Test City"}'::jsonb)`,
                [revisionId, fixture.institution],
              ),
          },
        ],
      });
      await addAlias(client, fixture.campus, "campus", "a3-campus");
      await addItem(client, {
        id: fixture.draftCampus,
        type: "campus",
        revisions: [{
          id: fixture.draftCampusRevision,
          number: 1,
          status: "draft",
          classification: "real",
          title: "A3 Draft Campus",
          typed: (connection, revisionId) =>
            connection.query(
              `INSERT INTO public.campus_revisions (revision_id, institution_item_id)
               VALUES ($1, $2)`,
              [revisionId, fixture.institution],
            ),
        }],
      });
      await addAlias(client, fixture.draftCampus, "campus", "a3-draft-campus");
      await addItem(client, {
        id: fixture.demoParentCampus,
        type: "campus",
        publishedRevisionId: fixture.demoParentCampusRevision,
        revisions: [{
          id: fixture.demoParentCampusRevision,
          number: 1,
          status: "published",
          classification: "real",
          title: "A3 Campus Under Demo Parent",
          typed: (connection, revisionId) =>
            connection.query(
              `INSERT INTO public.campus_revisions (revision_id, institution_item_id)
               VALUES ($1, $2)`,
              [revisionId, fixture.demoInstitution],
            ),
        }],
      });

      await addItem(client, {
        id: fixture.field,
        type: "field",
        publishedRevisionId: fixture.fieldRevision,
        revisions: [{
          id: fixture.fieldRevision,
          number: 1,
          status: "published",
          classification: "real",
          title: "A3 Test Field",
          typed: (connection, revisionId) =>
            connection.query(
              "INSERT INTO public.field_revisions (revision_id, field_content) VALUES ($1, '{}'::jsonb)",
              [revisionId],
            ),
        }],
      });
      await addItem(client, {
        id: fixture.course,
        type: "course",
        publishedRevisionId: fixture.courseNewRevision,
        revisions: [
          {
            id: fixture.courseOldRevision,
            number: 1,
            status: "published",
            classification: "real",
            title: "A3 Historical Course",
            typed: (connection, revisionId) =>
              connection.query(
                `INSERT INTO public.course_revisions
                  (revision_id, field_item_id, field_revision_id, qualification)
                 VALUES ($1, $2, $3, 'Degree')`,
                [revisionId, fixture.field, fixture.fieldRevision],
              ),
          },
          {
            id: fixture.courseNewRevision,
            number: 2,
            status: "published",
            classification: "real",
            title: "A3 Current Course",
            typed: (connection, revisionId) =>
              connection.query(
                `INSERT INTO public.course_revisions
                  (revision_id, field_item_id, field_revision_id, qualification)
                 VALUES ($1, $2, $3, 'Degree')`,
                [revisionId, fixture.field, fixture.fieldRevision],
              ),
          },
        ],
      });
      await addAlias(client, fixture.course, "course", "a3-course");
      await addItem(client, {
        id: fixture.demoCourse,
        type: "course",
        publishedRevisionId: fixture.demoCourseRevision,
        revisions: [{
          id: fixture.demoCourseRevision,
          number: 1,
          status: "published",
          classification: "demo",
          title: "A3 Demo Course",
          typed: (connection, revisionId) =>
            connection.query(
              `INSERT INTO public.course_revisions
                (revision_id, field_item_id, field_revision_id, qualification)
               VALUES ($1, $2, $3, 'Degree')`,
              [revisionId, fixture.field, fixture.fieldRevision],
            ),
        }],
      });
      await addItem(client, {
        id: fixture.draftCourse,
        type: "course",
        revisions: [{
          id: fixture.draftCourseRevision,
          number: 1,
          status: "draft",
          classification: "real",
          title: "A3 Draft Course",
          typed: (connection, revisionId) =>
            connection.query(
              `INSERT INTO public.course_revisions
                (revision_id, field_item_id, field_revision_id, qualification)
               VALUES ($1, $2, $3, 'Degree')`,
              [revisionId, fixture.field, fixture.fieldRevision],
            ),
        }],
      });

      await client.query(
        `INSERT INTO public.source_registry
          (id, source_name, authority, canonical_url, category, source_type, normalized_url)
         VALUES ($1, 'A3 Test Source', 'A3 Authority', 'https://example.test/a3-source',
                 'test_source', 'official_public_web_page', 'https://example.test/a3-source')`,
        [fixture.source],
      );

      const offeringDetails = {
        duration: "3 years",
        eligibility: "Unverified eligibility claim",
        fees: "Verified fee claim",
        admissionCycles: [{ academicYear: "2026-27", admissionProcess: "Unverified process" }],
      };
      await addItem(client, {
        id: fixture.offering,
        type: "course_offering",
        publishedRevisionId: fixture.offeringRevision,
        revisions: [{
          id: fixture.offeringRevision,
          number: 1,
          status: "published",
          classification: "real",
          title: "A3 BCA Offering",
          typed: (connection, revisionId) =>
            connection.query(
              `INSERT INTO public.course_offering_revisions
                (revision_id, course_item_id, course_revision_id, campus_item_id, campus_revision_id,
                 slug, offering_details)
               VALUES ($1, $2, $3, $4, $5, 'a3-bca-offering', $6::jsonb)`,
              [
                revisionId,
                fixture.course,
                fixture.courseOldRevision,
                fixture.campus,
                fixture.campusOldRevision,
                JSON.stringify(offeringDetails),
              ],
            ),
          provenance: (connection, revisionId) =>
            connection.query(
              `INSERT INTO public.catalog_revision_sources
                (revision_id, source_id, claim_key, checked_at, verified_at, verification_status)
               VALUES
                ($1, $2, 'offering.fees', '2026-11-19 00:00:00+00', '2026-11-20 00:00:00+00', 'verified'),
                ($1, $2, 'offering.eligibility', '2026-11-19 00:00:00+00', NULL, 'pending_review'),
                ($1, $2, 'offering.admission_cycles[0].admission_process',
                 '2026-11-19 00:00:00+00', NULL, 'pending_review')`,
              [revisionId, fixture.source],
            ),
        }],
      });
      await addAlias(client, fixture.offering, "institution-offering", "a3-institution");
      await addAlias(client, fixture.offering, "institution-offering", "a3-institution", "a3-course");

      await addItem(client, {
        id: fixture.demoCourseOffering,
        type: "course_offering",
        publishedRevisionId: fixture.demoCourseOfferingRevision,
        revisions: [{
          id: fixture.demoCourseOfferingRevision,
          number: 1,
          status: "published",
          classification: "real",
          title: "A3 Offering With Demo Course",
          typed: (connection, revisionId) =>
            connection.query(
              `INSERT INTO public.course_offering_revisions
                (revision_id, course_item_id, course_revision_id, campus_item_id, campus_revision_id, slug)
               VALUES ($1, $2, $3, $4, $5, 'a3-demo-course-offering')`,
              [
                revisionId,
                fixture.demoCourse,
                fixture.demoCourseRevision,
                fixture.campus,
                fixture.campusOldRevision,
              ],
            ),
        }],
      });
      await addItem(client, {
        id: fixture.draftCourseOffering,
        type: "course_offering",
        publishedRevisionId: fixture.draftCourseOfferingRevision,
        revisions: [{
          id: fixture.draftCourseOfferingRevision,
          number: 1,
          status: "published",
          classification: "real",
          title: "A3 Offering With Draft Course",
          typed: (connection, revisionId) =>
            connection.query(
              `INSERT INTO public.course_offering_revisions
                (revision_id, course_item_id, course_revision_id, campus_item_id, campus_revision_id, slug)
               VALUES ($1, $2, $3, $4, $5, 'a3-draft-course-offering')`,
              [
                revisionId,
                fixture.draftCourse,
                fixture.draftCourseRevision,
                fixture.campus,
                fixture.campusOldRevision,
              ],
            ),
        }, {
          id: fixture.lifecycleOfferingRevision,
          number: 2,
          status: "draft",
          classification: "real",
          title: "A3 Lifecycle Draft Offering",
          typed: (connection, revisionId) =>
            connection.query(
              `INSERT INTO public.course_offering_revisions
                (revision_id, course_item_id, course_revision_id, campus_item_id, campus_revision_id, slug)
               VALUES ($1, $2, $3, $4, $5, 'a3-lifecycle-draft-offering')`,
              [
                revisionId,
                fixture.course,
                fixture.courseNewRevision,
                fixture.campus,
                fixture.campusNewRevision,
              ],
            ),
        }],
      });
      await addAlias(client, fixture.draftCourseOffering, "institution-offering", "a3-lifecycle-offering", "a3-course");
      await addAlias(client, fixture.draftCourseOffering, "institution-offering", "a3-lifecycle-offering", "a3-not-course");
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function expectDatabaseRejects(operation, pattern) {
    const client = await testPool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SAVEPOINT invalid_fixture");
      let failure;
      try {
        await operation(client);
        await client.query("SET CONSTRAINTS ALL IMMEDIATE");
      } catch (error) {
        failure = error;
      }
      await client.query("ROLLBACK TO SAVEPOINT invalid_fixture");
      assert.ok(failure, "Expected the actual PostgreSQL schema to reject the invalid relationship.");
      assert.match(failure.message, pattern);
      await client.query("ROLLBACK");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  function offeringImportRecord() {
    const provenance = (claimKey) => ({
      claimKey,
      sourceId: fixture.source,
      sourceUrl: "https://example.test/a3-source",
      checkedAt: "2026-11-19",
      verifiedAt: null,
      verificationStatus: "pending_review",
    });
    return {
      kind: "course_offering",
      id: "a3-bca-offering",
      institutionId: "a3-institution",
      aliases: [
        {
          sourceSystem: "careerbridge",
          externalType: "institution-offering",
          externalKey: "a3-bca-offering",
          externalContextKey: "a3-course",
        },
        {
          sourceSystem: "careerbridge",
          externalType: "institution-offering",
          externalKey: "a3-institution",
          externalContextKey: "",
        },
        {
          sourceSystem: "careerbridge",
          externalType: "institution-offering",
          externalKey: "a3-institution",
          externalContextKey: "a3-course",
        },
      ],
      campus: {
        id: "a3-campus",
        catalogItemId: fixture.campus,
        revisionId: fixture.campusOldRevision,
        itemType: "campus",
        institution: {
          id: "a3-institution",
          catalogItemId: fixture.institution,
          itemType: "institution",
          publicationStatus: "published",
          dataClassification: "real",
        },
        publicationStatus: "published",
        dataClassification: "real",
      },
      course: {
        id: "a3-course",
        catalogItemId: fixture.course,
        revisionId: fixture.courseOldRevision,
        itemType: "course",
        publicationStatus: "published",
        dataClassification: "real",
      },
      revision: {
        title: "A3 BCA Offering",
        slug: "a3-bca-offering",
        publicationStatus: "draft",
        dataClassification: "real",
        verificationStatus: "pending_review",
        details: {
          duration: "3 years",
          eligibility: "Unverified eligibility claim",
          fees: "Verified fee claim",
        },
        provenance: [
          provenance("offering.eligibility"),
          provenance("offering.fees"),
        ],
      },
    };
  }

  function institutionImportRecord() {
    return {
      kind: "institution",
      id: "a3-institution",
      aliases: [{
        sourceSystem: "careerbridge",
        externalType: "institution",
        externalKey: "a3-institution",
        externalContextKey: "",
      }],
      revision: {
        title: "A3 Test Institution",
        publicationStatus: "draft",
        dataClassification: "real",
        verificationStatus: "pending_review",
        slug: "a3-institution",
        initials: "A3",
        institutionType: "College",
        ownership: "Public",
        content: { website: "https://example.test/a3-institution" },
        provenance: [],
      },
    };
  }

  function campusImportRecord() {
    return {
      kind: "campus",
      id: "a3-campus",
      aliases: [{
        sourceSystem: "careerbridge",
        externalType: "campus",
        externalKey: "a3-institution--a3-campus",
        externalContextKey: "",
      }],
      institution: {
        id: "a3-institution",
        catalogItemId: fixture.institution,
        itemType: "institution",
        publicationStatus: "published",
        dataClassification: "real",
      },
      revision: {
        title: "A3 Current Campus",
        publicationStatus: "draft",
        dataClassification: "real",
        verificationStatus: "pending_review",
        content: { city: "Test City" },
        provenance: [],
      },
    };
  }

  function importableInstitution(id, canonicalUrl = `https://example.test/${id}`) {
    return {
      kind: "institution",
      id,
      aliases: [{
        sourceSystem: "careerbridge",
        externalType: "institution",
        externalKey: id,
        externalContextKey: "",
      }],
      sources: [{
        sourceKey: "institution-site",
        sourceName: "A3 Imported Institution Source",
        authority: "A3 Test Authority",
        canonicalUrl,
        category: "institution",
        sourceType: "official_public_web_page",
      }],
      revision: {
        title: "A3 Imported Institution",
        slug: id,
        initials: "A3",
        institutionType: "College",
        publicationStatus: "draft",
        dataClassification: "real",
        verificationStatus: "pending_review",
        content: { website: canonicalUrl },
        provenance: [{
          claimKey: "institution.website",
          sourceKey: "institution-site",
          sourceUrl: canonicalUrl,
          checkedAt: "2026-11-20",
          verificationStatus: "pending_review",
        }],
      },
    };
  }

  async function prepareDatabase(context) {
    let client;
    try {
      client = await testPool.connect();
    } catch (error) {
      if (["ECONNREFUSED", "EHOSTUNREACH", "ENETUNREACH", "ETIMEDOUT"].includes(error.code)) {
        context.skip("The verified loopback PostgreSQL test database is unavailable; no schema was changed.");
        return;
      }
      throw error;
    }
    try {
      await ensureSchema(client);
    } finally {
      client.release();
    }
    await seedFixtures();
    fixturesSeeded = true;
    appPool = poolModule.getPool();
  }

  before(prepareDatabase);

  after(async () => {
    try {
      try {
        if (appPool) await appPool.end();
      } finally {
        await dropTestSchema();
      }
    } finally {
      await testPool.end();
    }
  });

  test("PostgreSQL returns only published real, correctly typed institution profiles", async () => {
    const institutions = await institutionReader.listPublishedInstitutions();
    assert.deepEqual(institutions.map((item) => item.catalogItemId), [fixture.institution]);
    assert.equal(institutions[0].id, "a3-institution");
    assert.equal(institutions[0].content.fees, undefined);
    assert.equal(institutions[0].content.eligibility, undefined);
    assert.equal(await institutionReader.getPublishedInstitution("a3-institution").then((item) => item?.catalogItemId), fixture.institution);

    await expectDatabaseRejects(async (client) => {
      await client.query(
        "INSERT INTO public.catalog_items (id, item_type) VALUES ($1, 'course')",
        [fixture.untypedItem],
      );
      await client.query(
        `INSERT INTO public.catalog_item_revisions
          (id, catalog_item_id, revision_number, publication_status, title, data_classification, published_at)
         VALUES ($1, $2, 1, 'draft', 'Wrongly Typed Institution', 'real', NULL)`,
        [fixture.untypedRevision, fixture.untypedItem],
      );
      await client.query(
        `INSERT INTO public.institution_revisions
          (revision_id, slug, initials, institution_type)
         VALUES ($1, 'a3-wrong-type', 'WT', 'College')`,
        [fixture.untypedRevision],
      );
    }, /must have exactly one matching typed revision row/);
  });

  test("PostgreSQL returns only campuses with published real institution parents", async () => {
    const campuses = await institutionReader.listPublishedCampuses();
    assert.deepEqual(campuses.map((item) => item.catalogItemId), [fixture.campus]);
    assert.equal(campuses[0].institutionItemId, fixture.institution);
    assert.equal(campuses[0].revisionId, fixture.campusNewRevision);
    assert.equal(campuses[0].content.fees, undefined);
    assert.equal(
      (await institutionReader.getPublishedCampus("a3-campus"))?.catalogItemId,
      fixture.campus,
    );

    await expectDatabaseRejects(async (client) => {
      await client.query(
        "INSERT INTO public.catalog_items (id, item_type) VALUES ($1, 'campus')",
        [fixture.invalidCampusItem],
      );
      await client.query(
        `INSERT INTO public.catalog_item_revisions
          (id, catalog_item_id, revision_number, publication_status, title, data_classification)
         VALUES ($1, $2, 1, 'draft', 'Invalid Parent Campus', 'real')`,
        [fixture.invalidCampusRevision, fixture.invalidCampusItem],
      );
      await client.query(
        `INSERT INTO public.campus_revisions (revision_id, institution_item_id)
         VALUES ($1, $2)`,
        [fixture.invalidCampusRevision, fixture.course],
      );
    }, /must reference an institution catalogue item/);
  });

  test("PostgreSQL enforces offering dependencies and preserves older published references", async () => {
    const offerings = await institutionReader.listPublishedCourseOfferings();
    assert.deepEqual(offerings.map((item) => item.catalogItemId), [fixture.offering]);
    assert.equal(offerings[0].institutionItemId, fixture.institution);
    assert.equal(offerings[0].courseRevisionId, fixture.courseOldRevision);
    assert.equal(offerings[0].campusRevisionId, fixture.campusOldRevision);
    assert.equal(
      await institutionReader.getPublishedCourseOffering(fixture.demoCourseOffering),
      null,
    );
    assert.equal(
      await institutionReader.getPublishedCourseOffering(fixture.draftCourseOffering),
      null,
    );

    await expectDatabaseRejects(async (client) => {
      await client.query(
        "INSERT INTO public.catalog_items (id, item_type) VALUES ($1, 'course_offering')",
        [fixture.invalidOfferingItem],
      );
      await client.query(
        `INSERT INTO public.catalog_item_revisions
          (id, catalog_item_id, revision_number, publication_status, title, data_classification)
         VALUES ($1, $2, 1, 'draft', 'Invalid Offering', 'real')`,
        [fixture.invalidOfferingRevision, fixture.invalidOfferingItem],
      );
      await client.query(
        `INSERT INTO public.course_offering_revisions
          (revision_id, course_item_id, course_revision_id, campus_item_id, campus_revision_id, slug)
         VALUES ($1, $2, $3, $4, $5, 'a3-invalid-offering')`,
        [
          fixture.invalidOfferingRevision,
          fixture.campus,
          fixture.campusOldRevision,
          fixture.course,
          fixture.courseOldRevision,
        ],
      );
    }, /must reference a course and a campus catalogue item/);
  });

  test("lifecycle lookups require empty ordinary context and an exact linked course context", async () => {
    const client = await testPool.connect();
    try {
      const institution = await catalogueLifecycle.getRealExamScholarshipReviewRecord(client, {
        kind: "institution",
        externalKey: "a3-draft-institution",
        revisionId: fixture.draftInstitutionRevision,
      });
      assert.equal(institution.itemId, fixture.draftInstitution);
      assert.equal(institution.externalContextKey, "");

      const campus = await catalogueLifecycle.getRealExamScholarshipReviewRecord(client, {
        kind: "campus",
        externalKey: "a3-draft-campus",
        revisionId: fixture.draftCampusRevision,
      });
      assert.equal(campus.itemId, fixture.draftCampus);
      assert.equal(campus.externalContextKey, "");

      const offeringInput = {
        kind: "course_offering",
        externalKey: "a3-lifecycle-offering",
        externalContextKey: "a3-course",
        revisionId: fixture.lifecycleOfferingRevision,
      };
      const offering = await catalogueLifecycle.getRealExamScholarshipReviewRecord(client, offeringInput);
      assert.equal(offering.itemId, fixture.draftCourseOffering);
      assert.equal(offering.externalContextKey, "a3-course");
      assert.equal(offering.revision.id, fixture.lifecycleOfferingRevision);

      assert.equal(await catalogueLifecycle.getRealExamScholarshipReviewRecord(client, {
        ...offeringInput,
        externalContextKey: "a3-not-course",
      }), null);
      assert.equal(await catalogueLifecycle.getRealExamScholarshipReviewRecord(client, {
        ...offeringInput,
        externalContextKey: "",
      }), null);
      assert.equal(await catalogueLifecycle.getRealExamScholarshipReviewRecord(client, {
        kind: "campus",
        externalKey: "a3-draft-campus",
        externalContextKey: "a3-course",
        revisionId: fixture.draftCampusRevision,
      }), null);
    } finally {
      client.release();
    }
  });

  test("PostgreSQL withholds unverified claims and serves verified evidence only", async () => {
    const offering = await institutionReader.getPublishedCourseOffering(
      "a3-institution",
      "a3-course",
    );
    assert.equal(offering.details.duration, "3 years");
    assert.equal(offering.details.fees, "Verified fee claim");
    assert.equal(offering.details.eligibility, undefined);
    assert.equal(offering.details.admissionCycles[0].admissionProcess, undefined);
    assert.equal(offering.details.admissionCycles[0].academicYear, "2026-27");
    assert.equal(
      offering.provenance.find((entry) => entry.claimKey === "offering.fees")?.verificationStatus,
      "verified",
    );
    assert.equal(
      offering.provenance.find((entry) => entry.claimKey === "offering.eligibility")?.verificationStatus,
      "pending_review",
    );
  });

  test("A2 validation and hashing preserve alias identity and revision immutability", async () => {
    const record = offeringImportRecord();
    assert.doesNotThrow(() => importValidation.validateInstitutionImportRecord(institutionImportRecord()));
    assert.doesNotThrow(() => importValidation.validateCampusImportRecord(campusImportRecord()));
    assert.doesNotThrow(() => importValidation.validateCourseOfferingImportRecord(record));
    const beforeAliases = await testPool.query(
      `SELECT external_key, external_context_key
       FROM public.catalog_item_aliases
       WHERE catalog_item_id = $1 AND external_type = 'institution-offering'
       ORDER BY external_context_key`,
      [fixture.offering],
    );

    const reordered = {
      ...record,
      revision: {
        ...record.revision,
        details: {
          fees: "Verified fee claim",
          eligibility: "Unverified eligibility claim",
          duration: "3 years",
        },
      },
    };
    assert.equal(
      importValidation.hashInstitutionImportRecord(record),
      importValidation.hashInstitutionImportRecord(reordered),
    );
    const changed = {
      ...record,
      revision: {
        ...record.revision,
        details: { ...record.revision.details, duration: "4 years" },
      },
    };
    const hash = importValidation.hashInstitutionImportRecord(record);
    const changedHash = importValidation.hashInstitutionImportRecord(changed);
    assert.notEqual(hash, changedHash);
    assert.deepEqual(
      importValidation.decideImportRevision(hash, "real", {
        contentHash: hash,
        revisionNumber: 1,
        publicationStatus: "published",
        dataClassification: "real",
      }),
      { action: "unchanged" },
    );
    assert.deepEqual(
      importValidation.decideImportRevision(changedHash, "real", {
        contentHash: hash,
        revisionNumber: 1,
        publicationStatus: "published",
        dataClassification: "real",
      }),
      { action: "create_revision", revisionNumber: 2 },
    );
    assert.throws(
      () => importValidation.validateCourseOfferingImportRecord({
        ...record,
        revision: { ...record.revision, provenance: [] },
      }),
      /requires claim-level provenance/,
    );

    const afterAliases = await testPool.query(
      `SELECT external_key, external_context_key
       FROM public.catalog_item_aliases
       WHERE catalog_item_id = $1 AND external_type = 'institution-offering'
       ORDER BY external_context_key`,
      [fixture.offering],
    );
    assert.deepEqual(afterAliases.rows, beforeAliases.rows);
    assert.equal(
      (await institutionReader.getPublishedCourseOffering("a3-institution"))?.catalogItemId,
      fixture.offering,
      "The legacy empty context alias remains resolvable.",
    );

    await assert.rejects(
      testPool.query(
        "UPDATE public.catalog_item_revisions SET title = 'overwritten' WHERE id = $1",
        [fixture.offeringRevision],
      ),
      /Published catalogue revisions are immutable/,
    );
  });

  test("draft importer previews without writes, creates idempotent drafts, and rolls back failures", async () => {
    const client = await testPool.connect();
    const record = importableInstitution("a3-imported-institution");
    let importedItemId = null;
    try {
      const preview = await importOneInstitutionCatalogueDraft(client, record, { preview: true });
      assert.equal(preview.action, "would_insert");
      assert.equal(preview.identity, "would_create");
      assert.equal(preview.published, false);
      assert.equal((await client.query(
        "SELECT count(*)::int AS count FROM public.catalog_item_aliases WHERE external_key=$1",
        [record.id],
      )).rows[0].count, 0);

      const first = await importOneInstitutionCatalogueDraft(client, record);
      importedItemId = first.catalogItemId;
      assert.equal(first.action, "inserted");
      assert.equal(first.identity, "created");
      assert.equal(first.provenanceCount, 1);
      assert.equal(first.published, false);

      const withAdditionalAlias = {
        ...record,
        aliases: [...record.aliases, {
          sourceSystem: "pilot-legacy",
          externalType: "institution",
          externalKey: "a3-legacy-institution",
          externalContextKey: "",
        }],
      };
      const second = await importOneInstitutionCatalogueDraft(client, withAdditionalAlias);
      assert.equal(second.action, "unchanged");
      assert.equal(second.revisionId, first.revisionId);
      assert.equal(second.identity, "reused");
      assert.equal(second.aliasesToCreate.length, 1);
      assert.equal((await client.query(
        "SELECT count(*)::int AS count FROM public.catalog_item_aliases WHERE catalog_item_id=$1",
        [importedItemId],
      )).rows[0].count, 2);
      const third = await importOneInstitutionCatalogueDraft(client, withAdditionalAlias);
      assert.equal(third.action, "unchanged");
      assert.equal(third.aliasesToCreate.length, 0);
      const persisted = await client.query(
        `SELECT i.published_revision_id, r.publication_status, r.data_classification,
                r.verification_status, count(crs.source_id)::int AS provenance_count
           FROM public.catalog_items i
           JOIN public.catalog_item_revisions r ON r.catalog_item_id=i.id
           LEFT JOIN public.catalog_revision_sources crs ON crs.revision_id=r.id
          WHERE i.id=$1 GROUP BY i.id, r.id`,
        [importedItemId],
      );
      assert.equal(persisted.rowCount, 1);
      assert.equal(persisted.rows[0].published_revision_id, null);
      assert.equal(persisted.rows[0].publication_status, "draft");
      assert.equal(persisted.rows[0].data_classification, "real");
      assert.equal(persisted.rows[0].verification_status, "pending_review");
      assert.equal(persisted.rows[0].provenance_count, 1);

      const rollback = importableInstitution(
        "a3-import-rollback",
        "https://example.test/a3-source",
      );
      rollback.sources[0].sourceName = "Conflicting Source Name";
      await assert.rejects(
        importOneInstitutionCatalogueDraft(client, rollback),
        /conflicts with existing metadata/,
      );
      assert.equal((await client.query(
        "SELECT count(*)::int AS count FROM public.catalog_item_aliases WHERE external_key=$1",
        [rollback.id],
      )).rows[0].count, 0);

      const ambiguous = importableInstitution("a3-ambiguous-institution");
      ambiguous.aliases.push({
        sourceSystem: "careerbridge",
        externalType: "institution",
        externalKey: "a3-institution",
        externalContextKey: "",
      }, {
        sourceSystem: "careerbridge",
        externalType: "institution",
        externalKey: "a3-demo-institution",
        externalContextKey: "",
      });
      await assert.rejects(
        importOneInstitutionCatalogueDraft(client, ambiguous),
        /Incoming aliases resolve to different catalogue identities/,
      );
      assert.equal((await client.query(
        "SELECT count(*)::int AS count FROM public.catalog_item_aliases WHERE external_key=$1",
        [ambiguous.id],
      )).rows[0].count, 0);
    } finally {
      if (importedItemId) {
        await client.query("DELETE FROM public.catalog_items WHERE id=$1", [importedItemId]);
        await client.query(
          "DELETE FROM public.source_registry WHERE normalized_url=public.normalize_source_url($1)",
          [record.sources[0].canonicalUrl],
        );
      }
      client.release();
    }
  });

  test("draft importer rejects a mismatched exact campus revision before creating an offering identity", async () => {
    const client = await testPool.connect();
    const record = offeringImportRecord();
    record.id = "a3-invalid-import-offering";
    record.aliases = [{
      sourceSystem: "careerbridge",
      externalType: "institution-offering",
      externalKey: record.id,
      externalContextKey: record.course.id,
    }];
    record.campus.revisionId = fixture.courseOldRevision;
    try {
      await assert.rejects(
        importOneInstitutionCatalogueDraft(client, record),
        /Dependency campus item\/revision relationship does not exist/,
      );
      assert.equal((await client.query(
        "SELECT count(*)::int AS count FROM public.catalog_item_aliases WHERE external_key=$1",
        [record.id],
      )).rows[0].count, 0);

      const incorrectCourseRevision = offeringImportRecord();
      incorrectCourseRevision.id = "a3-invalid-import-course-offering";
      incorrectCourseRevision.aliases = [{
        sourceSystem: "careerbridge",
        externalType: "institution-offering",
        externalKey: incorrectCourseRevision.id,
        externalContextKey: incorrectCourseRevision.course.id,
      }];
      incorrectCourseRevision.course.revisionId = fixture.campusOldRevision;
      incorrectCourseRevision.campus.revisionId = fixture.campusNewRevision;
      await assert.rejects(
        importOneInstitutionCatalogueDraft(client, incorrectCourseRevision),
        /Dependency course item\/revision relationship does not exist/,
      );
      assert.equal((await client.query(
        "SELECT count(*)::int AS count FROM public.catalog_item_aliases WHERE external_key=$1",
        [incorrectCourseRevision.id],
      )).rows[0].count, 0);

      const contextless = offeringImportRecord();
      contextless.id = "a3-ambiguous-contextless-offering";
      contextless.aliases = [{
        sourceSystem: "careerbridge",
        externalType: "institution-offering",
        externalKey: contextless.id,
        externalContextKey: contextless.course.id,
      }, {
        sourceSystem: "careerbridge",
        externalType: "institution-offering",
        externalKey: contextless.institutionId,
        externalContextKey: "",
      }];
      contextless.campus.revisionId = fixture.campusNewRevision;
      contextless.course.revisionId = fixture.courseNewRevision;
      await assert.rejects(
        importOneInstitutionCatalogueDraft(client, contextless),
        /contextless legacy offering alias is ambiguous/,
      );
      assert.equal((await client.query(
        "SELECT count(*)::int AS count FROM public.catalog_item_aliases WHERE external_key=$1",
        [contextless.id],
      )).rows[0].count, 0);
    } finally {
      client.release();
    }
  });

  test("draft importer creates idempotent campus and offering revisions with exact dependencies", async () => {
    const client = await testPool.connect();
    const campusRecord = campusImportRecord();
    campusRecord.id = "a3-imported-campus";
    campusRecord.aliases[0].externalKey = `${campusRecord.institution.id}--${campusRecord.id}`;
    const offeringRecord = offeringImportRecord();
    offeringRecord.id = "a3-imported-offering";
    offeringRecord.aliases = [{
      sourceSystem: "careerbridge",
      externalType: "institution-offering",
      externalKey: offeringRecord.id,
      externalContextKey: offeringRecord.course.id,
    }];
    offeringRecord.campus.revisionId = fixture.campusNewRevision;
    offeringRecord.course.revisionId = fixture.courseNewRevision;
    offeringRecord.revision.details = { duration: "3 years" };
    offeringRecord.revision.provenance = [];
    let campusItemId = null;
    let offeringItemId = null;
    try {
      const campusFirst = await importOneInstitutionCatalogueDraft(client, campusRecord);
      campusItemId = campusFirst.catalogItemId;
      assert.equal(campusFirst.action, "inserted");
      assert.equal((await importOneInstitutionCatalogueDraft(client, campusRecord)).action, "unchanged");
      const campusRow = await client.query(
        `SELECT i.published_revision_id, r.publication_status, c.institution_item_id
           FROM public.catalog_items i
           JOIN public.catalog_item_revisions r ON r.catalog_item_id=i.id
           JOIN public.campus_revisions c ON c.revision_id=r.id
          WHERE i.id=$1`,
        [campusItemId],
      );
      assert.equal(campusRow.rowCount, 1);
      assert.equal(campusRow.rows[0].published_revision_id, null);
      assert.equal(campusRow.rows[0].publication_status, "draft");
      assert.equal(campusRow.rows[0].institution_item_id, fixture.institution);

      const offeringFirst = await importOneInstitutionCatalogueDraft(client, offeringRecord);
      offeringItemId = offeringFirst.catalogItemId;
      assert.equal(offeringFirst.action, "inserted");
      assert.equal((await importOneInstitutionCatalogueDraft(client, offeringRecord)).action, "unchanged");
      const offeringRow = await client.query(
        `SELECT i.published_revision_id, r.publication_status,
                o.course_item_id, o.course_revision_id, o.campus_item_id, o.campus_revision_id
           FROM public.catalog_items i
           JOIN public.catalog_item_revisions r ON r.catalog_item_id=i.id
           JOIN public.course_offering_revisions o ON o.revision_id=r.id
          WHERE i.id=$1`,
        [offeringItemId],
      );
      assert.equal(offeringRow.rowCount, 1);
      assert.equal(offeringRow.rows[0].published_revision_id, null);
      assert.equal(offeringRow.rows[0].publication_status, "draft");
      assert.equal(offeringRow.rows[0].course_item_id, fixture.course);
      assert.equal(offeringRow.rows[0].course_revision_id, fixture.courseNewRevision);
      assert.equal(offeringRow.rows[0].campus_item_id, fixture.campus);
      assert.equal(offeringRow.rows[0].campus_revision_id, fixture.campusNewRevision);
    } finally {
      if (offeringItemId) await client.query("DELETE FROM public.catalog_items WHERE id=$1", [offeringItemId]);
      if (campusItemId) await client.query("DELETE FROM public.catalog_items WHERE id=$1", [campusItemId]);
      client.release();
    }
  });
}
