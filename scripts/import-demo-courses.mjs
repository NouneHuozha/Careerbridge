import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const loadModule = createRequire(import.meta.url);
const ts = loadModule("typescript");

loadEnvConfig(repositoryRoot);

loadModule.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = loadModule("node:fs");
  const output = ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

const { courseCatalog } = loadModule(
  "../src/app/explore/courses/catalog/course-catalog-data.ts",
);
const { courseDetails } = loadModule(
  "../src/app/explore/courses/catalog/course-detail-data.ts",
);

export const expectedProjectId = "calm-brook-21165945";
export const expectedBranchId = "br-wandering-flower-a1f6ys66";
export const expectedHost = "ep-divine-fog-a1uxos5z.ap-southeast-1.aws.neon.tech";

assert.equal(courseCatalog.length, 38, "Unexpected number of course records.");
assert.equal(
  new Set(courseCatalog.map((course) => course.id)).size,
  courseCatalog.length,
  "Course IDs must be unique.",
);

export const demoCourseRecords = courseCatalog.map((course) => {
  const detail = courseDetails[course.id];
  assert.ok(detail, `Missing detail data for ${course.id}.`);
  assert.ok(Array.isArray(detail.learningAreas), `Missing learning areas for ${course.id}.`);
  assert.equal(typeof detail.overview, "string", `Missing overview for ${course.id}.`);
  return { course, detail };
});

export function assertDevelopmentTarget(directUrl, endpointMetadata) {
  if (!directUrl) throw new Error("DATABASE_URL_UNPOOLED is required.");

  let configuredUrl;
  try {
    configuredUrl = new URL(directUrl);
  } catch {
    throw new Error("DATABASE_URL_UNPOOLED is not a valid URL.");
  }

  if (
    !["postgres:", "postgresql:"].includes(configuredUrl.protocol) ||
    configuredUrl.hostname !== expectedHost
  ) {
    throw new Error("Refusing import: DATABASE_URL_UNPOOLED is not the verified development endpoint.");
  }

  const matchingEndpoints = Array.isArray(endpointMetadata?.endpoints)
    ? endpointMetadata.endpoints.filter((endpoint) => endpoint.host === expectedHost)
    : [];
  if (matchingEndpoints.length !== 1) {
    throw new Error("Refusing import: the development endpoint is not uniquely mapped in Neon.");
  }

  const endpoint = matchingEndpoints[0];
  if (
    endpoint.project_id !== expectedProjectId ||
    endpoint.branch_id !== expectedBranchId
  ) {
    throw new Error("Refusing import: Neon endpoint project or branch does not match development.");
  }

  return {
    projectId: expectedProjectId,
    branchId: expectedBranchId,
    endpointHost: configuredUrl.hostname,
  };
}

export function buildRevisionPayload(course, detail, fieldIdentity) {
  assert.ok(fieldIdentity?.itemId, `Missing field identity for ${course.fieldId}.`);
  assert.ok(fieldIdentity?.revisionId, `Missing published field revision for ${course.fieldId}.`);

  const courseContent = { learningAreas: detail.learningAreas };
  for (const key of [
    "simpleExplanation",
    "learningExperience",
    "admission",
    "providerDescription",
  ]) {
    if (detail[key] !== undefined) courseContent[key] = detail[key];
  }

  return {
    revisionNumber: 1,
    publicationStatus: "draft",
    title: course.name,
    summary: course.description,
    description: detail.overview,
    dataClassification: "demo",
    verificationStatus: "unverified",
    publishedAt: null,
    fieldItemId: fieldIdentity.itemId,
    fieldRevisionId: fieldIdentity.revisionId,
    qualification: course.qualification,
    stages: course.stages,
    entryAfterClass10: course.entryAfterClass10,
    entryAfterClass12: course.entryAfterClass12,
    isExplorationCategory: course.isExplorationCategory ?? false,
    courseContent,
  };
}

export function matchesExpectedRevision(row, expected) {
  return (
    row.typed_revision_id === row.revision_id &&
    row.revision_number === expected.revisionNumber &&
    row.publication_status === expected.publicationStatus &&
    row.title === expected.title &&
    row.summary === expected.summary &&
    row.description === expected.description &&
    row.data_classification === expected.dataClassification &&
    row.verification_status === expected.verificationStatus &&
    row.published_at === expected.publishedAt &&
    row.field_item_id === expected.fieldItemId &&
    row.field_revision_id === expected.fieldRevisionId &&
    row.qualification === expected.qualification &&
    isDeepStrictEqual(row.stages, expected.stages) &&
    row.entry_after_class10 === expected.entryAfterClass10 &&
    row.entry_after_class12 === expected.entryAfterClass12 &&
    row.is_exploration_category === expected.isExplorationCategory &&
    isDeepStrictEqual(row.course_content, expected.courseContent)
  );
}

export function existingRevisionAction(rows, expected) {
  if (rows.length === 0) return "insert";
  if (rows.length === 1 && matchesExpectedRevision(rows[0], expected)) return "reuse";
  throw new Error(
    `Unexpected existing course revision for ${expected.title}; refusing to overwrite or append.`,
  );
}

function getEndpointMetadata() {
  const output = execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `neon api /projects/${expectedProjectId}/endpoints`,
    ],
    { encoding: "utf8", windowsHide: true },
  );
  return JSON.parse(output);
}

function assertCourseIdentitySnapshot(rows) {
  const expectedIds = courseCatalog.map((course) => course.id).sort();
  assert.equal(rows.length, expectedIds.length, "Course identity or alias count differs from the catalogue.");
  assert.deepEqual(
    rows.map((row) => row.course_id).sort(),
    expectedIds,
    "Course aliases do not match the existing catalogue IDs.",
  );

  const itemIds = new Set();
  for (const row of rows) {
    assert.ok(row.item_id, `Missing course identity for ${row.course_id}.`);
    assert.equal(row.item_type, "course", `Alias ${row.course_id} does not resolve to a course.`);
    assert.equal(row.published_revision_id, null, `Course ${row.course_id} already has a published pointer.`);
    itemIds.add(row.item_id);
  }
  assert.equal(itemIds.size, expectedIds.length, "Course aliases do not resolve to distinct identities.");
}

async function queryCourseIdentities(client) {
  const expectedIds = courseCatalog.map((course) => course.id);
  const counts = await client.query(
    `SELECT
       (SELECT count(*)::int FROM public.catalog_items WHERE item_type = 'course') AS item_count,
       (SELECT count(*)::int FROM public.catalog_item_aliases
        WHERE source_system = 'careerbridge' AND external_type = 'course'
          AND external_context_key = '') AS alias_count`,
  );
  assert.equal(counts.rows[0].item_count, expectedIds.length, "Unexpected course identity count.");
  assert.equal(counts.rows[0].alias_count, expectedIds.length, "Unexpected canonical course alias count.");

  const result = await client.query(
    `WITH expected(course_id) AS (SELECT unnest($1::text[]))
     SELECT e.course_id, i.id AS item_id, i.item_type, i.published_revision_id
     FROM expected e
     LEFT JOIN public.catalog_item_aliases a
       ON a.source_system = 'careerbridge'
      AND a.external_type = 'course'
      AND a.external_key = e.course_id
      AND a.external_context_key = ''
     LEFT JOIN public.catalog_items i ON i.id = a.catalog_item_id
     ORDER BY e.course_id`,
    [expectedIds],
  );
  assertCourseIdentitySnapshot(result.rows);
  return result.rows;
}

async function queryFieldIdentities(client) {
  const fieldIds = [...new Set(courseCatalog.map((course) => course.fieldId))].sort();
  const result = await client.query(
    `WITH expected(field_id) AS (SELECT unnest($1::text[]))
     SELECT e.field_id, i.id AS field_item_id, i.item_type,
            i.published_revision_id, r.id AS field_revision_id,
            r.revision_number, r.publication_status, r.data_classification,
            EXISTS (
              SELECT 1 FROM public.field_revisions fr
              WHERE fr.revision_id = r.id
            ) AS has_typed_field_row
     FROM expected e
     LEFT JOIN public.catalog_item_aliases a
       ON a.source_system = 'careerbridge'
      AND a.external_type = 'field'
      AND a.external_key = e.field_id
      AND a.external_context_key = ''
     LEFT JOIN public.catalog_items i ON i.id = a.catalog_item_id
     LEFT JOIN public.catalog_item_revisions r
       ON r.catalog_item_id = i.id
      AND r.id = i.published_revision_id
     ORDER BY e.field_id`,
    [fieldIds],
  );
  assert.equal(result.rowCount, fieldIds.length, "Unexpected field association count.");

  const fields = new Map();
  for (const row of result.rows) {
    assert.ok(row.field_item_id, `Missing field identity for ${row.field_id}.`);
    assert.equal(row.item_type, "field", `${row.field_id} resolves to a non-field identity.`);
    assert.ok(row.published_revision_id, `Field ${row.field_id} has no published revision pointer.`);
    assert.equal(row.field_revision_id, row.published_revision_id);
    assert.equal(row.publication_status, "published", `Field ${row.field_id} revision is not published.`);
    assert.equal(row.data_classification, "real", `Field ${row.field_id} revision is not real.`);
    assert.equal(row.has_typed_field_row, true, `Field ${row.field_id} has no typed field revision.`);
    fields.set(row.field_id, {
      itemId: row.field_item_id,
      revisionId: row.field_revision_id,
      revisionNumber: row.revision_number,
    });
  }
  assert.equal(fields.size, fieldIds.length, "Field associations did not resolve uniquely.");
  return fields;
}

async function snapshotAliases(client, itemIds) {
  const result = await client.query(
    `SELECT source_system, external_type, external_key, external_context_key, catalog_item_id
     FROM public.catalog_item_aliases
     WHERE catalog_item_id = ANY($1::uuid[])
     ORDER BY source_system, external_type, external_key, external_context_key`,
    [itemIds],
  );
  return result.rows;
}

async function queryExistingRevisions(client, itemIds) {
  const result = await client.query(
    `SELECT i.id AS item_id, i.published_revision_id, r.id AS revision_id,
            r.revision_number, r.publication_status, r.title, r.summary,
            r.description, r.data_classification, r.verification_status,
            r.published_at, c.revision_id AS typed_revision_id,
            c.field_item_id, c.field_revision_id, c.qualification, c.stages,
            c.entry_after_class10, c.entry_after_class12,
            c.is_exploration_category, c.course_content
     FROM public.catalog_items i
     JOIN public.catalog_item_revisions r ON r.catalog_item_id = i.id
     LEFT JOIN public.course_revisions c ON c.revision_id = r.id
     WHERE i.item_type = 'course' AND i.id = ANY($1::uuid[])
     ORDER BY i.id, r.revision_number`,
    [itemIds],
  );
  return result.rows;
}

async function countCourseProvenance(client, revisionIds) {
  if (revisionIds.length === 0) return 0;
  const result = await client.query(
    `SELECT count(*)::int AS count
     FROM public.catalog_revision_sources
     WHERE revision_id = ANY($1::uuid[])`,
    [revisionIds],
  );
  return result.rows[0].count;
}

async function countSourceRecords(client) {
  const result = await client.query("SELECT count(*)::int AS count FROM public.source_registry");
  return result.rows[0].count;
}

async function insertCourseRevision(client, itemId, payload) {
  const revision = await client.query(
    `INSERT INTO public.catalog_item_revisions
       (catalog_item_id, revision_number, publication_status, title, summary,
        description, data_classification, verification_status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)
     RETURNING id`,
    [
      itemId,
      payload.revisionNumber,
      payload.publicationStatus,
      payload.title,
      payload.summary,
      payload.description,
      payload.dataClassification,
      payload.verificationStatus,
    ],
  );
  const revisionId = revision.rows[0].id;
  await client.query(
    `INSERT INTO public.course_revisions
       (revision_id, field_item_id, field_revision_id, qualification, stages,
        entry_after_class10, entry_after_class12, is_exploration_category, course_content)
     VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, $9::jsonb)`,
    [
      revisionId,
      payload.fieldItemId,
      payload.fieldRevisionId,
      payload.qualification,
      payload.stages,
      payload.entryAfterClass10,
      payload.entryAfterClass12,
      payload.isExplorationCategory,
      JSON.stringify(payload.courseContent),
    ],
  );
  return revisionId;
}

async function verifyImport(client, identityRows, fieldIdentities, aliasSnapshot, sourceCountBefore, provenanceCountBefore) {
  const result = await client.query(
    `SELECT i.id AS item_id, i.published_revision_id,
            a.external_key AS course_id, r.id AS revision_id, r.revision_number,
            r.publication_status, r.title, r.summary, r.description,
            r.data_classification, r.verification_status, r.published_at,
            c.revision_id AS typed_revision_id, c.field_item_id, c.field_revision_id,
            c.qualification, c.stages, c.entry_after_class10,
            c.entry_after_class12, c.is_exploration_category, c.course_content,
            fa.external_key AS field_id
     FROM public.catalog_items i
     JOIN public.catalog_item_aliases a
       ON a.catalog_item_id = i.id
      AND a.source_system = 'careerbridge'
      AND a.external_type = 'course'
      AND a.external_context_key = ''
     JOIN public.catalog_item_revisions r ON r.catalog_item_id = i.id
     LEFT JOIN public.course_revisions c ON c.revision_id = r.id
     LEFT JOIN public.catalog_item_aliases fa
       ON fa.catalog_item_id = c.field_item_id
      AND fa.source_system = 'careerbridge'
      AND fa.external_type = 'field'
      AND fa.external_context_key = ''
     WHERE i.item_type = 'course'
       AND i.id = ANY($1::uuid[])
     ORDER BY a.external_key`,
    [identityRows.map((row) => row.item_id)],
  );
  assert.equal(result.rowCount, demoCourseRecords.length, "Expected exactly one revision per course.");

  for (const row of result.rows) {
    const record = demoCourseRecords.find(({ course }) => course.id === row.course_id);
    assert.ok(record, `Unexpected imported course ${row.course_id}.`);
    const expected = buildRevisionPayload(
      record.course,
      record.detail,
      fieldIdentities.get(record.course.fieldId),
    );
    assert.equal(row.published_revision_id, null, `Course ${row.course_id} has a published pointer.`);
    assert.ok(
      matchesExpectedRevision(row, expected),
      `Imported revision for ${row.course_id} differs from the expected demo draft.`,
    );
    assert.equal(row.field_id, record.course.fieldId, `Wrong field alias for ${row.course_id}.`);
  }

  const counts = await client.query(
    `SELECT
       (SELECT count(*)::int FROM public.catalog_items WHERE item_type = 'course') AS course_items,
       (SELECT count(*)::int FROM public.catalog_item_aliases
        WHERE source_system = 'careerbridge' AND external_type = 'course'
          AND external_context_key = '') AS course_aliases,
       (SELECT count(*)::int FROM public.catalog_item_revisions r
        JOIN public.catalog_items i ON i.id = r.catalog_item_id
        WHERE i.item_type = 'course') AS course_revisions,
       (SELECT count(*)::int FROM public.course_revisions c
        JOIN public.catalog_item_revisions r ON r.id = c.revision_id
        JOIN public.catalog_items i ON i.id = r.catalog_item_id
        WHERE i.item_type = 'course') AS typed_course_revisions,
       (SELECT count(*)::int FROM public.catalog_items
        WHERE item_type = 'course' AND published_revision_id IS NOT NULL) AS published_pointers`,
  );
  assert.deepEqual(counts.rows[0], {
    course_items: 38,
    course_aliases: 38,
    course_revisions: 38,
    typed_course_revisions: 38,
    published_pointers: 0,
  });

  const aliasesAfter = await snapshotAliases(
    client,
    identityRows.map((row) => row.item_id),
  );
  assert.deepEqual(aliasesAfter, aliasSnapshot, "Course identities or aliases changed during import.");

  const revisionIds = result.rows.map((row) => row.revision_id);
  const provenanceCountAfter = await countCourseProvenance(client, revisionIds);
  const sourceCountAfter = await countSourceRecords(client);
  assert.equal(provenanceCountAfter, provenanceCountBefore, "Import changed course provenance links.");
  assert.equal(sourceCountAfter, sourceCountBefore, "Import changed the source registry.");

  return {
    databaseCounts: counts.rows[0],
    provenanceLinksCreated: 0,
    sourceRecordsCreated: 0,
    fieldAssociations: [...fieldIdentities.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([fieldId, identity]) => ({
        fieldId,
        fieldItemId: identity.itemId,
        fieldRevisionId: identity.revisionId,
        courseIds: demoCourseRecords
          .filter(({ course }) => course.fieldId === fieldId)
          .map(({ course }) => course.id)
          .sort(),
      })),
  };
}

export async function runDemoCourseImport() {
  const directUrl = process.env.DATABASE_URL_UNPOOLED;
  const endpointMetadata = getEndpointMetadata();
  const target = assertDevelopmentTarget(directUrl, endpointMetadata);
  const pool = new Pool({
    connectionString: directUrl,
    connectionTimeoutMillis: 10000,
    max: 1,
  });

  try {
    const client = await pool.connect();
    let transactionOpen = false;
    try {
      await client.query("BEGIN");
      transactionOpen = true;
      await client.query("SELECT pg_advisory_xact_lock(20261120, 22)");

      const identityRows = await queryCourseIdentities(client);
      const identityByCourse = new Map(
        identityRows.map((row) => [row.course_id, row.item_id]),
      );
      const itemIds = identityRows.map((row) => row.item_id);
      const fieldIdentities = await queryFieldIdentities(client);
      const revisionRows = await queryExistingRevisions(client, itemIds);
      const revisionsByItem = new Map();
      for (const row of revisionRows) {
        const rows = revisionsByItem.get(row.item_id) ?? [];
        rows.push(row);
        revisionsByItem.set(row.item_id, rows);
      }

      const plans = demoCourseRecords.map(({ course, detail }) => {
        const itemId = identityByCourse.get(course.id);
        const fieldIdentity = fieldIdentities.get(course.fieldId);
        assert.ok(itemId, `Missing course identity for ${course.id}.`);
        assert.ok(fieldIdentity, `Missing published field identity for ${course.fieldId}.`);
        const payload = buildRevisionPayload(course, detail, fieldIdentity);
        const existingRows = revisionsByItem.get(itemId) ?? [];
        return {
          courseId: course.id,
          itemId,
          payload,
          action: existingRevisionAction(existingRows, payload),
        };
      });

      const aliasesBefore = await snapshotAliases(client, itemIds);
      const existingRevisionIds = revisionRows.map((row) => row.revision_id);
      const provenanceCountBefore = await countCourseProvenance(client, existingRevisionIds);
      const sourceCountBefore = await countSourceRecords(client);
      const counts = {
        revisionsInserted: 0,
        revisionsReused: 0,
        typedRowsInserted: 0,
        typedRowsReused: 0,
      };

      for (const plan of plans) {
        if (plan.action === "reuse") {
          counts.revisionsReused += 1;
          counts.typedRowsReused += 1;
          continue;
        }
        await insertCourseRevision(client, plan.itemId, plan.payload);
        counts.revisionsInserted += 1;
        counts.typedRowsInserted += 1;
      }

      const verification = await verifyImport(
        client,
        identityRows,
        fieldIdentities,
        aliasesBefore,
        sourceCountBefore,
        provenanceCountBefore,
      );

      await client.query("COMMIT");
      transactionOpen = false;
      return { target, counts, ...verification };
    } catch (error) {
      if (transactionOpen) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            "Demo course import failed and its transaction could not be rolled back.",
          );
        }
      }
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runDemoCourseImport()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(`Demo course import failed: ${error.message}`);
      process.exitCode = 1;
    });
}
