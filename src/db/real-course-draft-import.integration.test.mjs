import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { after, before } from "node:test";

const databaseUrl = process.env.REAL_COURSE_TEST_DATABASE_URL;
const expectedDatabaseName = "careerbridge_real_course_test";

function validateDatabaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("REAL_COURSE_TEST_DATABASE_URL must be a PostgreSQL URL.");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "::1"].includes(hostname) ||
    databaseName !== expectedDatabaseName
  ) {
    throw new Error(
      "Real-course tests require loopback and careerbridge_real_course_test; no connection was opened.",
    );
  }
  return databaseName;
}

if (!databaseUrl) {
  test("real-course disposable PostgreSQL suite", {
    skip: "REAL_COURSE_TEST_DATABASE_URL is unset; no database connection was attempted.",
  }, () => {});
} else {
  const databaseName = validateDatabaseUrl(databaseUrl);
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const { Pool } = require("pg");
  const testPool = new Pool({ connectionString: databaseUrl, max: 2 });
  let importer;
  let publisher;

  require.extensions[".ts"] = (module, filename) => {
    const { readFileSync } = require("node:fs");
    const output = ts.transpile(readFileSync(filename, "utf8"), {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    });
    module._compile(output, filename);
  };

  const ids = {
    fieldItem: "41000000-0000-4000-8000-000000000001",
    fieldRevision: "42000000-0000-4000-8000-000000000001",
    courseItem: "41000000-0000-4000-8000-000000000002",
    source: "43000000-0000-4000-8000-000000000001",
  };

  function sampleRecord(overrides = {}) {
    const record = {
      kind: "course",
      id: "test-course",
      aliases: [
        {
          sourceSystem: "careerbridge",
          externalType: "course",
          externalKey: "test-course",
          externalContextKey: "",
        },
      ],
      field: {
        id: "technology",
        catalogItemId: ids.fieldItem,
        revisionId: ids.fieldRevision,
        itemType: "field",
        publicationStatus: "published",
        dataClassification: "real",
      },
      revision: {
        title: "Test Course",
        summary: "A disposable test course.",
        description: "A safe course draft for importer verification.",
        publicationStatus: "draft",
        dataClassification: "real",
        verificationStatus: "pending_review",
        qualification: "Degree",
        stages: ["class-12"],
        entryAfterClass10: "",
        entryAfterClass12: "Entry after Class 12",
        isExplorationCategory: false,
        courseContent: {
          learningAreas: [
            { title: "Testing", description: "A disposable learning area." },
          ],
        },
        provenance: [
          {
            claimKey: "course.qualification",
            sourceKey: "test-source",
            sourceUrl: "https://example.test/course",
            checkedAt: "2026-11-24",
            verificationStatus: "pending_review",
          },
          {
            claimKey: "course.entry_after_class12",
            sourceKey: "test-source",
            sourceUrl: "https://example.test/course",
            checkedAt: "2026-11-24",
            verificationStatus: "pending_review",
          },
        ],
      },
      sources: [
        {
          sourceKey: "test-source",
          sourceName: "Disposable Test Source",
          canonicalUrl: "https://example.test/course",
          normalizedUrl: "https://example.test/course",
          category: "test",
          sourceType: "official_public_web_page",
          status: "active",
        },
      ],
    };
    if (overrides.revision) record.revision = overrides.revision;
    if (overrides.field) record.field = overrides.field;
    if (overrides.aliases) record.aliases = overrides.aliases;
    return record;
  }

  function mccPilotRecord() {
    const sources = [
      {
        sourceKey: "mcc-bca-offering",
        sourceName: "Madhab Choudhury College — Bachelor of Computer Application",
        authority: "Madhab Choudhury College",
        canonicalUrl: "https://www.mccollege.edu.in/it.php",
        normalizedUrl: "https://www.mccollege.edu.in/it.php",
        category: "course_offering",
        sourceType: "official_public_web_page",
        dataTypes: ["course-offering", "eligibility", "duration", "fee", "admission"],
        status: "active",
      },
      {
        sourceKey: "mcc-bca-admission-2026",
        sourceName: "Madhab Choudhury College — FYUGP Admission Notice 2026-27",
        authority: "Madhab Choudhury College",
        canonicalUrl: "https://www.mccollege.edu.in/upload/notice/1778644317.pdf",
        normalizedUrl: "https://www.mccollege.edu.in/upload/notice/1778644317.pdf",
        category: "admission_notice",
        sourceType: "official_download",
        dataTypes: ["admission", "BCA", "fee", "self-financed"],
        status: "active",
      },
      {
        sourceKey: "mcc-bca-syllabus",
        sourceName: "Madhab Choudhury College — Syllabus for FYUGP BCA course",
        authority: "Madhab Choudhury College",
        canonicalUrl: "https://mccollege.edu.in/upload/dept_syllabus/1753895593.pdf",
        normalizedUrl: "https://mccollege.edu.in/upload/dept_syllabus/1753895593.pdf",
        category: "course_syllabus",
        sourceType: "official_download",
        dataTypes: ["curriculum", "course-syllabus"],
        status: "active",
      },
      {
        sourceKey: "mcc-bca-notice-listing",
        sourceName: "Madhab Choudhury College — All News and Notice",
        authority: "Madhab Choudhury College",
        canonicalUrl: "https://www.mccollege.edu.in/notice.php",
        normalizedUrl: "https://www.mccollege.edu.in/notice.php",
        category: "notice_listing",
        sourceType: "official_public_web_page",
        dataTypes: ["notice-date", "notice-location"],
        status: "active",
      },
    ];
    const record = sampleRecord();
    record.sources = sources;
    record.revision.provenance = record.revision.provenance.map((entry) => ({
      ...entry,
      sourceKey: sources[0].sourceKey,
      sourceUrl: sources[0].canonicalUrl,
    }));
    return { record, sources };
  }

  async function prepareSchema(client) {
    const database = await client.query("SELECT current_database() AS name");
    assert.equal(database.rows[0].name, databaseName);
    const existing = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'catalog_items',
          'catalog_item_aliases',
          'catalog_item_revisions',
          'field_revisions',
          'course_revisions',
          'source_registry',
          'catalog_revision_sources'
        )
    `);
    assert.deepEqual(existing.rows, []);

    await client.query("BEGIN");
    try {
      await client.query(`
        CREATE TABLE public.catalog_items (
          id uuid PRIMARY KEY,
          item_type text NOT NULL,
          published_revision_id uuid,
          updated_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE (id, item_type)
        )
      `);
      await client.query(`
        CREATE TABLE public.catalog_item_revisions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          catalog_item_id uuid NOT NULL REFERENCES public.catalog_items(id),
          revision_number integer NOT NULL,
          publication_status text NOT NULL,
          title text NOT NULL,
          summary text,
          description text,
          data_classification text NOT NULL,
          verification_status text NOT NULL,
          published_at timestamptz,
          updated_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE (catalog_item_id, revision_number),
          UNIQUE (catalog_item_id, id),
          CHECK ((publication_status = 'published') = (published_at IS NOT NULL))
        )
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
        CREATE TABLE public.course_revisions (
          revision_id uuid PRIMARY KEY REFERENCES public.catalog_item_revisions(id),
          field_item_id uuid NOT NULL,
          field_revision_id uuid NOT NULL,
          qualification text NOT NULL,
          stages text[] NOT NULL,
          entry_after_class10 text NOT NULL,
          entry_after_class12 text NOT NULL,
          is_exploration_category boolean NOT NULL,
          course_content jsonb NOT NULL,
          CHECK (jsonb_typeof(course_content) = 'object')
        )
      `);
      await client.query(`
        CREATE TABLE public.source_registry (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          source_name text NOT NULL,
          authority text,
          canonical_url text,
          normalized_url text,
          category text NOT NULL,
          source_type text NOT NULL,
            data_types text[] NOT NULL DEFAULT ARRAY[]::text[],
            terms_notes text,
            expected_update_behavior text,
            status text NOT NULL,
            UNIQUE (normalized_url)
        )
      `);
      await client.query(`
        CREATE TABLE public.catalog_revision_sources (
          revision_id uuid NOT NULL REFERENCES public.catalog_item_revisions(id),
          source_id uuid NOT NULL REFERENCES public.source_registry(id),
          claim_key text NOT NULL,
          checked_at timestamptz,
          verified_at timestamptz,
          verification_status text,
          PRIMARY KEY (revision_id, source_id, claim_key)
        )
      `);
      await client.query(`
        CREATE FUNCTION public.normalize_source_url(raw_url text)
        RETURNS text LANGUAGE sql IMMUTABLE
        AS $$ SELECT raw_url $$
      `);
      await client.query(`
        CREATE FUNCTION public.set_source_registry_normalized_url()
        RETURNS trigger LANGUAGE plpgsql
        AS $$
        BEGIN
          NEW.normalized_url := public.normalize_source_url(NEW.canonical_url);
          RETURN NEW;
        END;
        $$
      `);
      await client.query(`
        CREATE TRIGGER source_registry_normalize_url
        BEFORE INSERT OR UPDATE ON public.source_registry
        FOR EACH ROW EXECUTE FUNCTION public.set_source_registry_normalized_url()
      `);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  before(async () => {
    importer = await import("../../scripts/import-real-course-draft.mjs");
    publisher = await import("../../scripts/publish-real-course.mjs");
    const client = await testPool.connect();
    try {
      await prepareSchema(client);
      await client.query(
        `INSERT INTO public.catalog_items (id, item_type, published_revision_id)
         VALUES ($1, 'field', $2), ($3, 'course', NULL)`,
        [ids.fieldItem, ids.fieldRevision, ids.courseItem],
      );
      await client.query(
        `INSERT INTO public.catalog_item_revisions
           (id, catalog_item_id, revision_number, publication_status, title, summary,
            description, data_classification, verification_status, published_at)
         VALUES ($1, $2, 1, 'published', 'Technology', 'Technology field.',
                 'Published field test record.', 'real', 'pending_review', now())`,
        [ids.fieldRevision, ids.fieldItem],
      );
      await client.query(
        `INSERT INTO public.field_revisions (revision_id, field_content)
         VALUES ($1, '{}'::jsonb)`,
        [ids.fieldRevision],
      );
      await client.query(
        `INSERT INTO public.catalog_item_aliases
           (source_system, external_type, external_key, external_context_key, catalog_item_id)
         VALUES ('careerbridge', 'field', 'technology', '', $1),
                ('careerbridge', 'course', 'test-course', '', $2)`,
        [ids.fieldItem, ids.courseItem],
      );
      await client.query(
        `INSERT INTO public.source_registry
           (id, source_name, canonical_url, normalized_url, category, source_type, status)
         VALUES ($1, 'Disposable Test Source', 'https://example.test/course',
                 'https://example.test/course', 'test',
                 'official_public_web_page', 'active')`,
        [ids.source],
      );
    } finally {
      client.release();
    }
  });

  after(async () => {
    const client = await testPool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DROP TABLE public.catalog_revision_sources");
      await client.query("DROP TABLE public.course_revisions");
      await client.query("DROP TABLE public.field_revisions");
      await client.query("DROP TABLE public.source_registry");
      await client.query("DROP TABLE public.catalog_item_aliases");
      await client.query("DROP TABLE public.catalog_item_revisions");
      await client.query("DROP TABLE public.catalog_items");
      await client.query("DROP FUNCTION public.set_source_registry_normalized_url()");
      await client.query("DROP FUNCTION public.normalize_source_url(text)");
      await client.query("COMMIT");
    } finally {
      client.release();
      await testPool.end();
    }
  });

  test("safety guard rejects missing and non-development targets", () => {
    assert.throws(
      () => importer.assertDevelopmentTarget({
        directUrl: undefined,
        pooledUrl: "postgresql://user:password@localhost/neondb",
        projectId: "calm-brook-21165945",
        branchId: "br-wandering-flower-a1f6ys66",
        neonBranch: "development",
        vercel: undefined,
      }),
      /DATABASE_URL_UNPOOLED/,
    );
    assert.throws(
      () => importer.assertDevelopmentTarget({
        directUrl: "postgresql://user:password@ep-wrong.ap-southeast-1.aws.neon.tech/neondb",
        pooledUrl: "postgresql://user:password@ep-wrong-pooler.ap-southeast-1.aws.neon.tech/neondb",
        projectId: "calm-brook-21165945",
        branchId: "br-wandering-flower-a1f6ys66",
        neonBranch: "development",
        vercel: undefined,
      }),
      /verified development endpoint/,
    );
  });

  test("exactly one course record is required", async () => {
    assert.throws(
      () => importer.requireExactlyOneRecord([]),
      /Exactly one course record/,
    );
    assert.throws(
      () => importer.requireExactlyOneRecord(null),
      /Exactly one course record/,
    );
  });

  test("identical draft import is unchanged and changed draft follows idempotency", async () => {
    const client = await testPool.connect();
    try {
      const record = sampleRecord();
      const first = await importer.importOneRealCourseDraft(client, record);
      assert.equal(first.action, "inserted");
      assert.equal(first.published, false);
      assert.equal(first.revisionNumber, 1);

      const rerun = await importer.importOneRealCourseDraft(client, record);
      assert.equal(rerun.action, "unchanged");
      assert.equal(rerun.revisionId, first.revisionId);

      const count = await client.query(
        "SELECT count(*)::int AS count FROM public.catalog_item_revisions WHERE catalog_item_id = $1",
        [ids.courseItem],
      );
      assert.equal(count.rows[0].count, 1);

      const changed = sampleRecord({
        revision: {
          ...record.revision,
          title: "Changed Test Course",
        },
      });
      await assert.rejects(
        importer.importOneRealCourseDraft(client, changed),
        /Revision conflict/,
      );

      const pointer = await client.query(
        "SELECT published_revision_id FROM public.catalog_items WHERE id = $1",
        [ids.courseItem],
      );
      assert.equal(pointer.rows[0].published_revision_id, null);
    } finally {
      client.release();
    }
  });

  test("failure rolls back common, typed, and provenance writes", async () => {
    const client = await testPool.connect();
    try {
      await client.query("DELETE FROM public.catalog_revision_sources");
      await client.query("DELETE FROM public.course_revisions");
      await client.query("DELETE FROM public.catalog_item_revisions WHERE catalog_item_id = $1", [ids.courseItem]);

      const record = sampleRecord();
      await assert.rejects(
        importer.importOneRealCourseDraft(client, {
          ...record,
          revision: {
            ...record.revision,
            courseContent: {
              learningAreas: [{ title: "", description: "Invalid area" }],
            },
          },
        }),
        /learningAreas/,
      );
      const counts = await client.query(`
        SELECT
          (SELECT count(*) FROM public.catalog_item_revisions WHERE catalog_item_id = $1) AS revisions,
          (SELECT count(*) FROM public.course_revisions c
           JOIN public.catalog_item_revisions r ON r.id = c.revision_id
           WHERE r.catalog_item_id = $1) AS typed,
          (SELECT count(*) FROM public.catalog_revision_sources) AS provenance
      `, [ids.courseItem]);
      assert.deepEqual(counts.rows[0], {
        revisions: "0",
        typed: "0",
        provenance: "0",
      });
    } finally {
      client.release();
    }
  });

  async function resetCourse(client) {
    await client.query("DELETE FROM public.catalog_revision_sources WHERE revision_id IN (SELECT id FROM public.catalog_item_revisions WHERE catalog_item_id=$1)", [ids.courseItem]);
    await client.query("DELETE FROM public.course_revisions WHERE revision_id IN (SELECT id FROM public.catalog_item_revisions WHERE catalog_item_id=$1)", [ids.courseItem]);
    await client.query("DELETE FROM public.catalog_item_revisions WHERE catalog_item_id=$1", [ids.courseItem]);
    await client.query("UPDATE public.catalog_items SET published_revision_id=NULL WHERE id=$1", [ids.courseItem]);
  }

  async function seedDemoCourseRevision(client, { classification = "demo", status = "draft" } = {}) {
    const revision = await client.query(
      `INSERT INTO public.catalog_item_revisions
         (catalog_item_id, revision_number, publication_status, title, summary, description,
          data_classification, verification_status, published_at)
       VALUES ($1, 1, $2, 'BCA demo', 'Existing demo revision', 'Must remain unchanged.',
               $3, 'unverified', NULL)
       RETURNING id`,
      [ids.courseItem, status, classification],
    );
    await client.query(
      `INSERT INTO public.course_revisions
         (revision_id, field_item_id, field_revision_id, qualification, stages,
          entry_after_class10, entry_after_class12, is_exploration_category, course_content)
       VALUES ($1, $2, $3, 'Degree', ARRAY['class-12']::text[], '', '',
               false, '{"learningAreas":[{"title":"Demo","description":"Demo only."}]}'::jsonb)`,
      [revision.rows[0].id, ids.fieldItem, ids.fieldRevision],
    );
    return revision.rows[0].id;
  }

  test("preserves one unpublished demo revision and creates a separate real draft revision", async () => {
    const client = await testPool.connect();
    try {
      await resetCourse(client);
      const demoRevisionId = await seedDemoCourseRevision(client);
      const demoBefore = await client.query(
        `SELECT r.id, r.revision_number, r.publication_status, r.data_classification,
                r.title, r.summary, r.description, r.verification_status, r.published_at,
                c.course_content
         FROM public.catalog_item_revisions r
         JOIN public.course_revisions c ON c.revision_id = r.id
         WHERE r.id = $1`,
        [demoRevisionId],
      );

      const record = sampleRecord();
      const imported = await importer.importOneRealCourseDraft(client, record);
      assert.equal(imported.action, "inserted");
      assert.equal(imported.revisionNumber, 2);
      assert.equal(imported.published, false);

      const rerun = await importer.importOneRealCourseDraft(client, record);
      assert.equal(rerun.action, "unchanged");
      assert.equal(rerun.revisionId, imported.revisionId);

      const revisions = await client.query(
        `SELECT r.id, r.revision_number, r.publication_status, r.data_classification,
                r.published_at, c.revision_id AS typed_revision_id
         FROM public.catalog_item_revisions r
         LEFT JOIN public.course_revisions c ON c.revision_id = r.id
         WHERE r.catalog_item_id = $1
         ORDER BY r.revision_number`,
        [ids.courseItem],
      );
      assert.equal(revisions.rowCount, 2);
      assert.deepEqual(revisions.rows[0], {
        id: demoRevisionId,
        revision_number: 1,
        publication_status: "draft",
        data_classification: "demo",
        published_at: null,
        typed_revision_id: demoRevisionId,
      });
      assert.equal(revisions.rows[1].id, imported.revisionId);
      assert.equal(revisions.rows[1].revision_number, 2);
      assert.equal(revisions.rows[1].publication_status, "draft");
      assert.equal(revisions.rows[1].data_classification, "real");
      assert.equal(revisions.rows[1].published_at, null);
      const demoAfter = await client.query(
        `SELECT r.id, r.revision_number, r.publication_status, r.data_classification,
                r.title, r.summary, r.description, r.verification_status, r.published_at,
                c.course_content
         FROM public.catalog_item_revisions r
         JOIN public.course_revisions c ON c.revision_id = r.id
         WHERE r.id = $1`,
        [demoRevisionId],
      );
      assert.deepEqual(demoAfter.rows, demoBefore.rows);
      const pointer = await client.query(
        "SELECT published_revision_id FROM public.catalog_items WHERE id = $1",
        [ids.courseItem],
      );
      assert.equal(pointer.rows[0].published_revision_id, null);
      await resetCourse(client);
    } finally {
      client.release();
    }
  });

  test("preview plans four MCC sources and the next real revision without writing", async () => {
    const client = await testPool.connect();
    try {
      await resetCourse(client);
      const demoRevisionId = await seedDemoCourseRevision(client);
      const { record, sources } = mccPilotRecord();
      const preview = await importer.importOneRealCourseDraft(client, record, { preview: true });

      assert.equal(preview.action, "would_insert");
      assert.equal(preview.courseItemId, ids.courseItem);
      assert.equal(preview.revisionNumber, 2);
      assert.equal(preview.revisionId, null);
      assert.equal(preview.currentPublishedRevisionId, null);
      assert.deepEqual(preview.existingRevisions.map((revision) => ({
        id: revision.id,
        revisionNumber: revision.revisionNumber,
        publicationStatus: revision.publicationStatus,
        dataClassification: revision.dataClassification,
        publishedAt: revision.publishedAt,
      })), [{
        id: demoRevisionId,
        revisionNumber: 1,
        publicationStatus: "draft",
        dataClassification: "demo",
        publishedAt: null,
      }]);
      assert.deepEqual(
        preview.sources.map((source) => source.canonicalUrl),
        sources.map((source) => source.canonicalUrl),
      );
      assert.ok(preview.sources.every((source) => source.action === "would_insert" && source.id === null));
      assert.deepEqual(preview.aliasesToCreate, []);
      assert.equal(preview.field.catalogItemId, ids.fieldItem);
      assert.equal(preview.field.revisionId, ids.fieldRevision);
      assert.ok(preview.provenance.every((entry) => entry.verificationStatus === "pending_review" ||
        entry.verificationStatus === "verified"));

      const counts = await client.query(`
        SELECT
          (SELECT count(*) FROM public.source_registry) AS sources,
          (SELECT count(*) FROM public.catalog_item_revisions WHERE catalog_item_id = $1) AS revisions,
          (SELECT count(*) FROM public.catalog_revision_sources) AS provenance
      `, [ids.courseItem]);
      assert.deepEqual(counts.rows[0], {
        sources: "1",
        revisions: "1",
        provenance: "0",
      });
      await resetCourse(client);
    } finally {
      client.release();
    }
  });

  test("registers the four MCC sources with the draft transaction", async () => {
    const client = await testPool.connect();
    try {
      await resetCourse(client);
      await client.query("DELETE FROM public.source_registry WHERE id = $1", [ids.source]);
      const { record, sources } = mccPilotRecord();
      const imported = await importer.importOneRealCourseDraft(client, record);
      const sourceRows = await client.query(
        `SELECT id, source_name, canonical_url, normalized_url, category, source_type,
                status, data_types
         FROM public.source_registry ORDER BY canonical_url`,
      );
      assert.equal(sourceRows.rowCount, 4);
      for (const [index, source] of [...sources]
        .sort((left, right) => left.canonicalUrl.localeCompare(right.canonicalUrl))
        .entries()) {
        assert.equal(sourceRows.rows[index].source_name, source.sourceName);
        assert.equal(sourceRows.rows[index].canonical_url, source.canonicalUrl);
        assert.equal(sourceRows.rows[index].normalized_url, source.canonicalUrl);
        assert.equal(sourceRows.rows[index].category, source.category);
        assert.equal(sourceRows.rows[index].source_type, source.sourceType);
        assert.equal(sourceRows.rows[index].status, "active");
        assert.deepEqual(sourceRows.rows[index].data_types, source.dataTypes);
      }
      const provenance = await client.query(
        "SELECT source_id, claim_key FROM public.catalog_revision_sources WHERE revision_id = $1",
        [imported.revisionId],
      );
      assert.equal(provenance.rowCount, 2);
      const offeringSource = sourceRows.rows.find(
        (row) => row.canonical_url === sources[0].canonicalUrl,
      );
      assert.ok(provenance.rows.every((row) => row.source_id === offeringSource.id));
      await resetCourse(client);
      await client.query(
        "DELETE FROM public.source_registry WHERE id = ANY($1::uuid[])",
        [sourceRows.rows.map((row) => row.id)],
      );
      await client.query(
        `INSERT INTO public.source_registry
           (id, source_name, canonical_url, category, source_type, status)
         VALUES ($1, 'Disposable Test Source', 'https://example.test/course',
                 'test', 'official_public_web_page', 'active')`,
        [ids.source],
      );
    } finally {
      client.release();
    }
  });

  test("re-import matches repeated claim provenance to the correct sources", async () => {
    const client = await testPool.connect();
    const { record, sources } = mccPilotRecord();
    const sourceUrls = sources.map((source) => source.canonicalUrl);
    try {
      await resetCourse(client);
      await client.query(
        "DELETE FROM public.source_registry WHERE canonical_url = ANY($1::text[])",
        [sourceUrls],
      );
      record.revision.provenance.push(
        {
          claimKey: "course.fees",
          sourceKey: sources[0].sourceKey,
          sourceUrl: sources[0].canonicalUrl,
          checkedAt: "2026-11-24",
          verifiedAt: "2026-11-24",
          verificationStatus: "verified",
        },
        {
          claimKey: "course.fees",
          sourceKey: sources[1].sourceKey,
          sourceUrl: sources[1].canonicalUrl,
          checkedAt: "2026-11-24",
          verificationStatus: "pending_review",
        },
      );

      const inserted = await importer.importOneRealCourseDraft(client, record);
      const repeated = await importer.importOneRealCourseDraft(client, record);

      assert.equal(inserted.action, "inserted");
      assert.equal(repeated.action, "unchanged");
      assert.equal(repeated.revisionId, inserted.revisionId);
      const provenance = await client.query(
        `SELECT sr.canonical_url, crs.verification_status
         FROM public.catalog_revision_sources crs
         JOIN public.source_registry sr ON sr.id = crs.source_id
         WHERE crs.revision_id = $1 AND crs.claim_key = 'course.fees'
         ORDER BY sr.canonical_url`,
        [inserted.revisionId],
      );
      assert.deepEqual(provenance.rows, [
        {
          canonical_url: sources[0].canonicalUrl,
          verification_status: "verified",
        },
        {
          canonical_url: sources[1].canonicalUrl,
          verification_status: "pending_review",
        },
      ]);
    } finally {
      await resetCourse(client);
      await client.query(
        "DELETE FROM public.source_registry WHERE canonical_url = ANY($1::text[])",
        [sourceUrls],
      );
      await client.query(
        `INSERT INTO public.source_registry
           (id, source_name, canonical_url, category, source_type, status)
         VALUES ($1, 'Disposable Test Source', 'https://example.test/course',
                 'test', 'official_public_web_page', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [ids.source],
      );
      client.release();
    }
  });

  test("rolls back newly registered MCC sources when the draft write fails", async () => {
    const client = await testPool.connect();
    try {
      await resetCourse(client);
      await client.query("DELETE FROM public.source_registry WHERE id = $1", [ids.source]);
      await client.query(`
        CREATE FUNCTION public.reject_real_course_test_insert()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'injected course typed-row failure';
        END;
        $$
      `);
      await client.query(`
        CREATE TRIGGER reject_real_course_test_insert
        BEFORE INSERT ON public.course_revisions
        FOR EACH ROW EXECUTE FUNCTION public.reject_real_course_test_insert()
      `);
      const { record } = mccPilotRecord();
      await assert.rejects(
        importer.importOneRealCourseDraft(client, record),
        /injected course typed-row failure/,
      );
      const counts = await client.query(`
        SELECT
          (SELECT count(*) FROM public.source_registry) AS sources,
          (SELECT count(*) FROM public.catalog_item_revisions WHERE catalog_item_id = $1) AS revisions,
          (SELECT count(*) FROM public.course_revisions) AS typed,
          (SELECT count(*) FROM public.catalog_revision_sources) AS provenance
      `, [ids.courseItem]);
      assert.deepEqual(counts.rows[0], {
        sources: "0",
        revisions: "0",
        typed: "0",
        provenance: "0",
      });
    } finally {
      await client.query("DROP TRIGGER IF EXISTS reject_real_course_test_insert ON public.course_revisions");
      await client.query("DROP FUNCTION IF EXISTS public.reject_real_course_test_insert()");
      await client.query(
        `INSERT INTO public.source_registry
           (id, source_name, canonical_url, category, source_type, status)
         VALUES ($1, 'Disposable Test Source', 'https://example.test/course',
                 'test', 'official_public_web_page', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [ids.source],
      );
      client.release();
    }
  });

  test("refuses unsafe non-real revision histories", async () => {
    const client = await testPool.connect();
    try {
      await resetCourse(client);
      await seedDemoCourseRevision(client, { classification: "test" });
      await assert.rejects(
        importer.importOneRealCourseDraft(client, sampleRecord()),
        /existing demo or test content cannot be converted or bypassed/,
      );
      const revisions = await client.query(
        "SELECT count(*)::int AS count FROM public.catalog_item_revisions WHERE catalog_item_id = $1",
        [ids.courseItem],
      );
      assert.equal(revisions.rows[0].count, 1);
      await resetCourse(client);
    } finally {
      client.release();
    }
  });

  function verifiedRecord() {
    const record = sampleRecord();
    record.revision = {
      ...record.revision,
      verificationStatus: "verified",
      provenance: record.revision.provenance.map((entry) => ({
        ...entry,
        verificationStatus: "verified",
        verifiedAt: "2026-11-24T10:00:00Z",
      })),
    };
    return record;
  }

  test("approved verified real draft publishes, is idempotent, and never overwrites an existing pointer", async () => {
    const client = await testPool.connect();
    try {
      await resetCourse(client);
      const imported = await importer.importOneRealCourseDraft(client, verifiedRecord());
      const before = await publisher.preflightRealCourseDraft(client, { courseId: "test-course", revisionId: imported.revisionId });
      assert.equal(before.outcome, "ready_for_review");
      const approved = await publisher.approveRealCourseDraft(client, { courseId: "test-course", revisionId: imported.revisionId });
      assert.equal(approved.action, "approved");
      const published = await publisher.publishApprovedRealCourse(client, { courseId: "test-course", revisionId: imported.revisionId, expectedPublishedRevisionId: null });
      assert.equal(published.action, "published");
      const repeated = await publisher.publishApprovedRealCourse(client, { courseId: "test-course", revisionId: imported.revisionId, expectedPublishedRevisionId: null });
      assert.equal(repeated.action, "unchanged");
      const pointer = await client.query("SELECT published_revision_id FROM public.catalog_items WHERE id=$1", [ids.courseItem]);
      assert.equal(pointer.rows[0].published_revision_id, imported.revisionId);
      process.env.DATABASE_URL = databaseUrl;
      require.cache[require.resolve("server-only")] = { exports: {} };
      const publicReader = require("./courses.ts");
      const visible = await publicReader.getPublishedCourse("test-course");
      assert.equal(visible?.id, "test-course");
      await client.query("UPDATE public.catalog_item_revisions SET data_classification='demo' WHERE id=$1", [imported.revisionId]);
      assert.equal(await publicReader.getPublishedCourse("test-course"), null);
      await client.query("UPDATE public.catalog_item_revisions SET data_classification='real' WHERE id=$1", [imported.revisionId]);
    } finally { client.release(); }
  });

  test("preflight blocks incomplete or unverified evidence, invalid field dependencies, demo data, and wrong lifecycle", async () => {
    const client = await testPool.connect();
    try {
      await resetCourse(client);
      const imported = await importer.importOneRealCourseDraft(client, verifiedRecord());
      await client.query("UPDATE public.catalog_items SET published_revision_id=NULL WHERE id=$1", [ids.fieldItem]);
      let result = await publisher.preflightRealCourseDraft(client, { courseId: "test-course", revisionId: imported.revisionId });
      assert.equal(result.outcome, "blocked_evidence");
      await client.query("UPDATE public.catalog_items SET published_revision_id=$2 WHERE id=$1", [ids.fieldItem, ids.fieldRevision]);
      await client.query("UPDATE public.catalog_revision_sources SET verification_status='pending_review', verified_at=NULL WHERE revision_id=$1", [imported.revisionId]);
      result = await publisher.preflightRealCourseDraft(client, { courseId: "test-course", revisionId: imported.revisionId });
      assert.equal(result.outcome, "blocked_evidence");
      await client.query("UPDATE public.catalog_item_revisions SET data_classification='demo' WHERE id=$1", [imported.revisionId]);
      result = await publisher.preflightRealCourseDraft(client, { courseId: "test-course", revisionId: imported.revisionId });
      assert.equal(result.outcome, "invalid_state");
      await client.query("UPDATE public.catalog_item_revisions SET data_classification='real', publication_status='rejected' WHERE id=$1", [imported.revisionId]);
      result = await publisher.preflightRealCourseDraft(client, { courseId: "test-course", revisionId: imported.revisionId });
      assert.equal(result.outcome, "invalid_lifecycle");
    } finally { client.release(); }
  });

  test("a different existing published pointer blocks publication without changing it", async () => {
    const client = await testPool.connect();
    try {
      await resetCourse(client);
      const imported = await importer.importOneRealCourseDraft(client, verifiedRecord());
      await publisher.approveRealCourseDraft(client, { courseId: "test-course", revisionId: imported.revisionId });
      await client.query("UPDATE public.catalog_items SET published_revision_id=$2 WHERE id=$1", [ids.courseItem, ids.fieldRevision]);
      await assert.rejects(
        publisher.publishApprovedRealCourse(client, { courseId: "test-course", revisionId: imported.revisionId, expectedPublishedRevisionId: null }),
        /does not match the expected revision/,
      );
      const pointer = await client.query("SELECT published_revision_id FROM public.catalog_items WHERE id=$1", [ids.courseItem]);
      assert.equal(pointer.rows[0].published_revision_id, ids.fieldRevision);
    } finally { client.release(); }
  });

  test("revision 2 rotates the expected pointer atomically and preserves revision 1", async () => {
    const client = await testPool.connect();
    try {
      await resetCourse(client);
      const first = await importer.importOneRealCourseDraft(client, verifiedRecord());
      await publisher.approveRealCourseDraft(client, { courseId: "test-course", revisionId: first.revisionId });
      await publisher.publishApprovedRealCourse(client, {
        courseId: "test-course", revisionId: first.revisionId, expectedPublishedRevisionId: null,
      });
      const firstBeforeRotation = await client.query(
        "SELECT title, publication_status, published_at FROM public.catalog_item_revisions WHERE id=$1", [first.revisionId],
      );
      const secondRecord = verifiedRecord();
      secondRecord.revision = { ...secondRecord.revision, title: "Test Course Revision 2" };
      const second = await importer.importOneRealCourseDraft(client, secondRecord);
      assert.equal(second.revisionNumber, 2);
      await publisher.approveRealCourseDraft(client, { courseId: "test-course", revisionId: second.revisionId });
      await assert.rejects(
        publisher.publishApprovedRealCourse(client, {
          courseId: "test-course", revisionId: second.revisionId,
          expectedPublishedRevisionId: "00000000-0000-4000-8000-000000000099",
        }),
        /does not match the expected revision/,
      );
      await assert.rejects(
        publisher.publishApprovedRealCourse(client, {
          courseId: "test-course", revisionId: second.revisionId,
          expectedPublishedRevisionId: first.revisionId, failAfterRevisionUpdate: true,
        }),
        /Injected post-revision/,
      );
      let secondState = await client.query(
        "SELECT publication_status, published_at FROM public.catalog_item_revisions WHERE id=$1", [second.revisionId],
      );
      assert.deepEqual(secondState.rows[0], { publication_status: "approved", published_at: null });
      const published = await publisher.publishApprovedRealCourse(client, {
        courseId: "test-course", revisionId: second.revisionId, expectedPublishedRevisionId: first.revisionId,
      });
      assert.equal(published.action, "published");
      const pointer = await client.query("SELECT published_revision_id FROM public.catalog_items WHERE id=$1", [ids.courseItem]);
      assert.equal(pointer.rows[0].published_revision_id, second.revisionId);
      const firstAfterRotation = await client.query(
        "SELECT title, publication_status, published_at FROM public.catalog_item_revisions WHERE id=$1", [first.revisionId],
      );
      assert.deepEqual(firstAfterRotation.rows, firstBeforeRotation.rows);
      await assert.rejects(
        publisher.publishApprovedRealCourse(client, {
          courseId: "test-course", revisionId: first.revisionId, expectedPublishedRevisionId: first.revisionId,
        }),
        /not its course's published pointer/,
      );
      const repeated = await publisher.publishApprovedRealCourse(client, {
        courseId: "test-course", revisionId: second.revisionId, expectedPublishedRevisionId: first.revisionId,
      });
      assert.equal(repeated.action, "unchanged");
      process.env.DATABASE_URL = databaseUrl;
      require.cache[require.resolve("server-only")] = { exports: {} };
      const publicReader = require("./courses.ts");
      assert.equal((await publicReader.getPublishedCourse("test-course"))?.name, "Test Course Revision 2");
    } finally { client.release(); }
  });

  test("publication rollback and concurrent requests cannot leave inconsistent pointers", async () => {
    const first = await testPool.connect();
    const second = await testPool.connect();
    try {
      await resetCourse(first);
      const imported = await importer.importOneRealCourseDraft(first, verifiedRecord());
      await publisher.approveRealCourseDraft(first, { courseId: "test-course", revisionId: imported.revisionId });
      await assert.rejects(
        publisher.publishApprovedRealCourse(first, { courseId: "test-course", revisionId: imported.revisionId, expectedPublishedRevisionId: null, failAfterRevisionUpdate: true }),
        /Injected post-revision/,
      );
      let state = await first.query("SELECT publication_status, published_at FROM public.catalog_item_revisions WHERE id=$1", [imported.revisionId]);
      assert.deepEqual(state.rows[0], { publication_status: "approved", published_at: null });
      const results = await Promise.all([
        publisher.publishApprovedRealCourse(first, { courseId: "test-course", revisionId: imported.revisionId, expectedPublishedRevisionId: null }),
        publisher.publishApprovedRealCourse(second, { courseId: "test-course", revisionId: imported.revisionId, expectedPublishedRevisionId: null }),
      ]);
      assert.deepEqual(results.map((result) => result.action).sort(), ["published", "unchanged"]);
      state = await first.query("SELECT published_revision_id FROM public.catalog_items WHERE id=$1", [ids.courseItem]);
      assert.equal(state.rows[0].published_revision_id, imported.revisionId);
    } finally { first.release(); second.release(); }
  });

  test("concurrent competing revisions serialize and reject the stale expected pointer", async () => {
    const first = await testPool.connect();
    const second = await testPool.connect();
    try {
      await resetCourse(first);
      const revision1 = await importer.importOneRealCourseDraft(first, verifiedRecord());
      await publisher.approveRealCourseDraft(first, { courseId: "test-course", revisionId: revision1.revisionId });
      await publisher.publishApprovedRealCourse(first, { courseId: "test-course", revisionId: revision1.revisionId, expectedPublishedRevisionId: null });
      const revision2Record = verifiedRecord();
      revision2Record.revision = { ...revision2Record.revision, title: "Concurrent Revision 2" };
      const revision2 = await importer.importOneRealCourseDraft(first, revision2Record);
      await publisher.approveRealCourseDraft(first, { courseId: "test-course", revisionId: revision2.revisionId });
      const revision3 = await first.query(
        `INSERT INTO public.catalog_item_revisions
           (catalog_item_id, revision_number, publication_status, title, summary, description,
            data_classification, verification_status, published_at)
         SELECT catalog_item_id, 3, 'approved', 'Concurrent Revision 3', summary, description,
                data_classification, verification_status, NULL
           FROM public.catalog_item_revisions WHERE id=$1 RETURNING id`, [revision2.revisionId],
      );
      const revision3Id = revision3.rows[0].id;
      await first.query(
        `INSERT INTO public.course_revisions
           (revision_id, field_item_id, field_revision_id, qualification, stages,
            entry_after_class10, entry_after_class12, is_exploration_category, course_content)
         SELECT $2, field_item_id, field_revision_id, qualification, stages,
                entry_after_class10, entry_after_class12, is_exploration_category, course_content
           FROM public.course_revisions WHERE revision_id=$1`, [revision2.revisionId, revision3Id],
      );
      await first.query(
        `INSERT INTO public.catalog_revision_sources
           (revision_id, source_id, claim_key, checked_at, verified_at, verification_status)
         SELECT $2, source_id, claim_key, checked_at, verified_at, verification_status
           FROM public.catalog_revision_sources WHERE revision_id=$1`, [revision2.revisionId, revision3Id],
      );
      const attempts = await Promise.allSettled([
        publisher.publishApprovedRealCourse(first, { courseId: "test-course", revisionId: revision2.revisionId, expectedPublishedRevisionId: revision1.revisionId }),
        publisher.publishApprovedRealCourse(second, { courseId: "test-course", revisionId: revision3Id, expectedPublishedRevisionId: revision1.revisionId }),
      ]);
      assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
      assert.equal(attempts.filter((attempt) => attempt.status === "rejected").length, 1);
      const pointer = await first.query("SELECT published_revision_id FROM public.catalog_items WHERE id=$1", [ids.courseItem]);
      assert.ok([revision2.revisionId, revision3Id].includes(pointer.rows[0].published_revision_id));
    } finally { first.release(); second.release(); }
  });
}
