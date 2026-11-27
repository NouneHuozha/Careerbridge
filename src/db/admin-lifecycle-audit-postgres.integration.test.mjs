import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import * as publisher from "../../scripts/publish-real-pathway.mjs";

const databaseUrl = process.env.ADMIN_LIFECYCLE_AUDIT_TEST_DATABASE_URL;
const expectedDatabaseName = "careerbridge_admin_audit_test";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);

function validateDatabaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("ADMIN_LIFECYCLE_AUDIT_TEST_DATABASE_URL must be a PostgreSQL URL for the dedicated local test database.");
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
      `Admin lifecycle audit integration tests require loopback and the dedicated ${expectedDatabaseName} database.`,
    );
  }
}

function isolatedFixture(value) {
  const fixture = JSON.parse(JSON.stringify(value));
  const sourceUrl = `${new URL(fixture.sources[0].canonicalUrl).origin}/admin-audit-test/${randomUUID()}`;
  fixture.sources[0].canonicalUrl = sourceUrl;
  for (const evidence of fixture.revision.provenance) evidence.sourceUrl = sourceUrl;
  if (fixture.kind === "exam") fixture.revision.examination.officialUrl = sourceUrl;
  return fixture;
}

if (databaseUrl) validateDatabaseUrl(databaseUrl);

async function insertSource(client, source, canonicalUrl = source.canonicalUrl) {
  const result = await client.query(
    `INSERT INTO public.source_registry
       (source_name, authority, canonical_url, category, source_type, data_types,
        terms_notes, expected_update_behavior, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      source.sourceName,
      source.authority,
      canonicalUrl,
      source.category,
      source.sourceType,
      source.dataTypes ?? [],
      source.termsNotes ?? null,
      source.expectedUpdateBehavior ?? null,
      source.status,
    ],
  );
  return result.rows[0].id;
}

async function insertAdmin(client, suffix) {
  const result = await client.query(
    `INSERT INTO public.users (external_id, email, auth_provider, role)
     VALUES ($1, $2, 'clerk', 'admin')
     RETURNING id`,
    [`admin-audit-${suffix}`, `admin-audit-${suffix}@example.test`],
  );
  return result.rows[0].id;
}

async function insertFixture(client, fixture, {
  itemType,
  externalKey = `admin-audit-${randomUUID()}`,
  publicationStatus = fixture.revision.publicationStatus,
  sourceIds,
}) {
  const itemId = randomUUID();
  const revisionId = randomUUID();
  const alias = fixture.aliases[0];
  const revision = fixture.revision;
  await client.query("BEGIN");
  try {
    await client.query(
      "INSERT INTO public.catalog_items (id, item_type) VALUES ($1, $2)",
      [itemId, itemType],
    );
    await client.query(
      `INSERT INTO public.catalog_item_aliases
         (source_system, external_type, external_key, external_context_key, catalog_item_id)
       VALUES ('careerbridge', $1, $2, '', $3)`,
      [alias.externalType, externalKey, itemId],
    );
    await client.query(
      `INSERT INTO public.catalog_item_revisions
         (id, catalog_item_id, revision_number, publication_status, data_classification,
          verification_status, title, summary, description)
       VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8)`,
      [
        revisionId,
        itemId,
        publicationStatus,
        revision.dataClassification,
        revision.verificationStatus,
        revision.title,
        revision.summary,
        revision.description,
      ],
    );

    if (fixture.kind === "pathway") {
      await client.query(
        `INSERT INTO public.pathway_revisions
           (revision_id, stage, course_stage, catalogue_group, category, route_content)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          revisionId,
          fixture.route.stage,
          fixture.route.courseStage,
          fixture.route.catalogueGroup,
          fixture.route.category,
          JSON.stringify(revision.routeContent),
        ],
      );
    } else {
      const examination = revision.examination;
      await client.query(
        `INSERT INTO public.examination_revisions
           (revision_id, level, stages, purpose, programmes, authority, regions, fields, official_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          revisionId,
          examination.level,
          examination.stages,
          examination.purpose,
          examination.programmes,
          examination.authority,
          examination.regions,
          examination.fields,
          examination.officialUrl,
        ],
      );
    }

    for (const evidence of revision.provenance) {
      const sourceId = sourceIds.get(evidence.sourceKey);
      assert.ok(sourceId, `No source ID for fixture key ${evidence.sourceKey}`);
      await client.query(
        `INSERT INTO public.catalog_revision_sources
           (revision_id, source_id, claim_key, checked_at, verified_at, verification_status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          revisionId,
          sourceId,
          evidence.claimKey,
          evidence.checkedAt,
          evidence.verificationStatus === "verified" ? evidence.checkedAt : null,
          evidence.verificationStatus,
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  return { itemId, revisionId, externalKey };
}

async function auditRowsForItem(client, itemId) {
  return (await client.query(
    `SELECT actor_id, kind, action, item_id, revision_id
       FROM public.admin_audit_events WHERE item_id=$1
      ORDER BY created_at, id`,
    [itemId],
  )).rows;
}

function auditKeys(rows) {
  return rows.map(({ actor_id, kind, action, item_id, revision_id }) =>
    `${actor_id}|${kind}|${action}|${item_id}|${revision_id}`,
  ).sort();
}

test("Admin lifecycle audit events are atomic with generic and pathway mutations", {
  skip: databaseUrl ? false : "ADMIN_LIFECYCLE_AUDIT_TEST_DATABASE_URL is unset; no database connection was attempted.",
}, async () => {
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 2500, max: 1 });
  const client = await pool.connect();

  try {
    const database = await client.query("SELECT current_database() AS database_name");
    assert.equal(database.rows[0].database_name, expectedDatabaseName);
    const table = await client.query("SELECT to_regclass('public.admin_audit_events') AS table_name");
    assert.equal(table.rows[0].table_name, "admin_audit_events");

    const pathwayFixture = isolatedFixture(JSON.parse(await readFile(
      resolve(root, "docs/review/pathways-pilot/nios-senior-secondary.json"),
      "utf8",
    )));
    const examFixture = isolatedFixture(JSON.parse(await readFile(
      resolve(root, "docs/review/exams-scholarships-pilot/neet-ug.json"),
      "utf8",
    )));
    const actorIds = [
      await insertAdmin(client, randomUUID()),
      await insertAdmin(client, randomUUID()),
      await insertAdmin(client, randomUUID()),
    ];
    const pathwaySourceId = await insertSource(client, pathwayFixture.sources[0]);
    const examSourceId = await insertSource(client, examFixture.sources[0]);
    const pathwaySourceIds = new Map([[pathwayFixture.sources[0].sourceKey, pathwaySourceId]]);
    const examSourceIds = new Map([[examFixture.sources[0].sourceKey, examSourceId]]);

    const pathway = await insertFixture(client, pathwayFixture, {
      itemType: "pathway",
      sourceIds: pathwaySourceIds,
    });

    await client.query(`
      CREATE OR REPLACE FUNCTION public.fail_admin_audit_test_insert()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'forced audit insert failure';
      END;
      $$`);
    await client.query(
      "CREATE TRIGGER fail_admin_audit_test_insert BEFORE INSERT ON public.admin_audit_events FOR EACH ROW EXECUTE FUNCTION public.fail_admin_audit_test_insert()",
    );
    try {
      await assert.rejects(
        publisher.submitRealPathwayDraftForReview(client, {
          pathwayId: pathway.externalKey,
          revisionId: pathway.revisionId,
          reviewerUserId: actorIds[0],
        }),
        (error) => {
          assert.equal(error.message, "Admin audit event could not be recorded.");
          assert.match(error.cause.message, /forced audit insert failure/);
          return true;
        },
      );
    } finally {
      await client.query("DROP TRIGGER IF EXISTS fail_admin_audit_test_insert ON public.admin_audit_events");
      await client.query("DROP FUNCTION IF EXISTS public.fail_admin_audit_test_insert()");
    }

    const rolledBackStatus = await client.query(
      "SELECT publication_status FROM public.catalog_item_revisions WHERE id=$1",
      [pathway.revisionId],
    );
    assert.equal(rolledBackStatus.rows[0].publication_status, "draft");
    assert.equal((await auditRowsForItem(client, pathway.itemId)).length, 0);

    await publisher.submitRealPathwayDraftForReview(client, {
      pathwayId: pathway.externalKey,
      revisionId: pathway.revisionId,
      reviewerUserId: actorIds[0],
    });
    const pathwayReview = {
      reviewerUserId: actorIds[1],
      claims: pathwayFixture.revision.provenance.map((claim) => ({
        claimKey: claim.claimKey,
        decision: "verified",
        sourceUrls: [claim.sourceUrl],
      })),
    };
    await assert.rejects(
      publisher.submitRealPathwayDraftForReview(client, {
        pathwayId: pathway.externalKey,
        revisionId: pathway.revisionId,
        reviewerUserId: actorIds[0],
      }),
      /Every required claim must have verified source evidence/,
    );
    await publisher.recordRealPathwayEvidenceReview(client, {
      pathwayId: pathway.externalKey,
      revisionId: pathway.revisionId,
      review: pathwayReview,
    });
    await publisher.approveRealPathwayDraft(client, {
      pathwayId: pathway.externalKey,
      revisionId: pathway.revisionId,
      reviewerUserId: actorIds[2],
    });
    const pathwayPublish = {
      pathwayId: pathway.externalKey,
      revisionId: pathway.revisionId,
      expectedPublishedRevisionId: null,
      publisherUserId: actorIds[1],
    };
    await publisher.publishApprovedRealPathway(client, pathwayPublish);
    assert.equal((await publisher.publishApprovedRealPathway(client, pathwayPublish)).action, "unchanged");

    const exam = await insertFixture(client, examFixture, {
      itemType: "examination",
      sourceIds: examSourceIds,
    });
    const rejectedExam = await insertFixture(client, examFixture, {
      itemType: "examination",
      externalKey: `admin-audit-reject-${randomUUID()}`,
      publicationStatus: "in_review",
      sourceIds: examSourceIds,
    });

    assert.equal((await auditRowsForItem(client, pathway.itemId)).length, 4);

    await publisher.submitRealExamScholarshipDraftForReview(client, {
      kind: "exam",
      externalKey: exam.externalKey,
      revisionId: exam.revisionId,
      reviewerUserId: actorIds[0],
    });
    const addedSourceUrl = `https://audit-test.example/source/${randomUUID()}`;
    const association = {
      kind: "exam",
      externalKey: exam.externalKey,
      revisionId: exam.revisionId,
      reviewerUserId: actorIds[1],
      source: {
        sourceName: "Admin audit integration source",
        authority: "Integration test authority",
        canonicalUrl: addedSourceUrl,
        category: "examination",
        sourceType: "official_public_web_page",
        status: "active",
      },
      claimKeys: [examFixture.revision.provenance[0].claimKey],
    };
    const firstAssociation = await publisher.associateRealExamScholarshipReviewSource(client, association);
    assert.equal(firstAssociation.associationsAdded, 1);
    const repeatedAssociation = await publisher.associateRealExamScholarshipReviewSource(client, association);
    assert.equal(repeatedAssociation.associationsAdded, 0);

    const examClaims = examFixture.revision.provenance.map((claim) => ({
      claimKey: claim.claimKey,
      decision: "verified",
      sourceUrls: claim.claimKey === association.claimKeys[0]
        ? [claim.sourceUrl, addedSourceUrl]
        : [claim.sourceUrl],
      reviewedDirectly: true,
    }));
    await publisher.recordRealExamScholarshipEvidenceReview(client, {
      kind: "exam",
      externalKey: exam.externalKey,
      revisionId: exam.revisionId,
      reviewerUserId: actorIds[2],
      claims: examClaims,
    });
    await publisher.approveRealExamScholarshipDraft(client, {
      kind: "exam",
      externalKey: exam.externalKey,
      revisionId: exam.revisionId,
      reviewerUserId: actorIds[1],
    });
    const examPublish = {
      kind: "exam",
      externalKey: exam.externalKey,
      revisionId: exam.revisionId,
      expectedPublishedRevisionId: null,
      publisherUserId: actorIds[2],
    };
    await publisher.publishApprovedRealExamScholarship(client, examPublish);
    assert.equal((await publisher.publishApprovedRealExamScholarship(client, examPublish)).action, "unchanged");
    await publisher.rejectRealExamScholarshipDraft(client, {
      kind: "exam",
      externalKey: rejectedExam.externalKey,
      revisionId: rejectedExam.revisionId,
      reviewerUserId: actorIds[0],
    });

    const auditedItems = [pathway, exam, rejectedExam];
    const allEvents = [];
    for (const item of auditedItems) allEvents.push(...await auditRowsForItem(client, item.itemId));
    const expectedEvents = [
      [actorIds[0], "pathway", "submit", pathway.itemId, pathway.revisionId],
      [actorIds[1], "pathway", "review", pathway.itemId, pathway.revisionId],
      [actorIds[2], "pathway", "approve", pathway.itemId, pathway.revisionId],
      [actorIds[1], "pathway", "publish", pathway.itemId, pathway.revisionId],
      [actorIds[0], "exam", "submit", exam.itemId, exam.revisionId],
      [actorIds[1], "exam", "associate-source", exam.itemId, exam.revisionId],
      [actorIds[2], "exam", "review", exam.itemId, exam.revisionId],
      [actorIds[1], "exam", "approve", exam.itemId, exam.revisionId],
      [actorIds[2], "exam", "publish", exam.itemId, exam.revisionId],
      [actorIds[0], "exam", "reject", rejectedExam.itemId, rejectedExam.revisionId],
    ];
    assert.deepEqual(
      auditKeys(allEvents),
      expectedEvents.map(([actorId, kind, action, itemId, revisionId]) =>
        `${actorId}|${kind}|${action}|${itemId}|${revisionId}`,
      ).sort(),
    );
  } finally {
    client.release();
    await pool.end();
  }
});
