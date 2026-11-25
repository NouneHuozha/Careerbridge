import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;
loadEnvConfig(process.cwd());

const expectedHost = "ep-divine-fog-a1uxos5z.ap-southeast-1.aws.neon.tech";
const expectedBranchId = "br-wandering-flower-a1f6ys66";
const expectedProjectId = "calm-brook-21165945";
const fieldIds = [
  "technology",
  "engineering",
  "healthcare",
  "business",
  "law",
  "government",
  "education",
  "science",
  "arts-design",
  "media",
  "agriculture-environment",
  "hospitality-tourism",
  "social-sciences",
];

const directUrl = process.env.DATABASE_URL_UNPOOLED;
if (!directUrl) throw new Error("DATABASE_URL_UNPOOLED is required.");
const configuredUrl = new URL(directUrl);
if (configuredUrl.hostname !== expectedHost) {
  throw new Error("Refusing publication: DATABASE_URL_UNPOOLED is not the verified development endpoint.");
}

const metadata = JSON.parse(
  execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", `neon api /projects/${expectedProjectId}/endpoints`],
    { encoding: "utf8", windowsHide: true },
  ),
);
const endpoints = metadata.endpoints.filter((endpoint) => endpoint.host === expectedHost);
assert.equal(endpoints.length, 1);
assert.equal(endpoints[0].branch_id, expectedBranchId);
assert.equal(endpoints[0].project_id, expectedProjectId);

const pool = new Pool({ connectionString: directUrl, connectionTimeoutMillis: 10000, max: 1 });

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(20261120, 21)");

    const identities = await client.query(
      `SELECT i.id AS item_id,i.item_type,i.published_revision_id,
              a.external_key
       FROM catalog_items i
       JOIN catalog_item_aliases a
         ON a.catalog_item_id=i.id
        AND a.source_system='careerbridge'
        AND a.external_type='field'
        AND a.external_context_key=''
       WHERE i.item_type='field'
       ORDER BY a.external_key`,
    );
    assert.equal(identities.rowCount, 13);
    for (const row of identities.rows) {
      assert.ok(fieldIds.includes(row.external_key));
      assert.equal(row.published_revision_id, null);
    }
    assert.deepEqual(
      identities.rows.map((row) => row.external_key).sort(),
      [...fieldIds].sort(),
    );

    const revisions = await client.query(
      `SELECT i.id AS item_id,a.external_key,r.id,r.revision_number,r.publication_status,
              r.data_classification,r.verification_status,r.published_at,fr.field_content
       FROM catalog_items i
       JOIN catalog_item_aliases a
         ON a.catalog_item_id=i.id
        AND a.source_system='careerbridge'
        AND a.external_type='field'
        AND a.external_context_key=''
       JOIN catalog_item_revisions r
         ON r.catalog_item_id=i.id
        AND r.revision_number=2
       JOIN field_revisions fr ON fr.revision_id=r.id
       WHERE i.item_type='field'
       ORDER BY a.external_key`,
      [],
    );
    assert.equal(revisions.rowCount, 13);
    const keys = [
      "introduction",
      "broadlyInvolves",
      "activitiesAndWorkAreas",
      "learningAndSubjectConnections",
      "courseFamiliesToExplore",
      "furtherExploration",
    ];
    for (const revision of revisions.rows) {
      assert.equal(revision.publication_status, "draft");
      assert.equal(revision.data_classification, "real");
      assert.equal(revision.verification_status, "pending_review");
      assert.equal(revision.published_at, null);
      assert.deepEqual(Object.keys(revision.field_content).sort(), [...keys].sort());
      for (const key of keys) {
        assert.equal(typeof revision.field_content[key], "string");
      }
    }

    const publishedAt = new Date();
    let published = 0;
    for (const revision of revisions.rows) {
      await client.query(
        `UPDATE catalog_item_revisions
         SET publication_status='published', published_at=$2, updated_at=$2
         WHERE id=$1
           AND catalog_item_id=$3
           AND revision_number=2
           AND publication_status='draft'
           AND published_at IS NULL
         RETURNING id`,
        [revision.id, publishedAt, revision.item_id],
      );
      await client.query(
        `UPDATE catalog_items
         SET published_revision_id=$2, updated_at=$3
         WHERE id=$1
           AND item_type='field'
           AND published_revision_id IS NULL
         RETURNING id`,
        [revision.item_id, revision.id, publishedAt],
      );
      published += 1;
    }

    const verification = await client.query(
      `SELECT i.id AS item_id,i.published_revision_id,a.external_key,r.id AS revision_id,
              r.revision_number,r.publication_status,r.verification_status,r.published_at
       FROM catalog_items i
       JOIN catalog_item_aliases a
         ON a.catalog_item_id=i.id
        AND a.source_system='careerbridge'
        AND a.external_type='field'
        AND a.external_context_key=''
       JOIN catalog_item_revisions r
         ON r.id=i.published_revision_id
        AND r.catalog_item_id=i.id
       WHERE i.item_type='field'
       ORDER BY a.external_key`,
    );
    assert.equal(verification.rowCount, 13);
    for (const row of verification.rows) {
      assert.equal(row.revision_number, 2);
      assert.equal(row.publication_status, "published");
      assert.equal(row.verification_status, "pending_review");
      assert.ok(row.published_at instanceof Date);
    }

    const remainingDraft = await client.query(
      `SELECT count(*)::int AS count
       FROM catalog_item_revisions r
       JOIN catalog_items i ON i.id=r.catalog_item_id
       WHERE i.item_type='field'
         AND r.publication_status='draft'`,
    );
    assert.equal(remainingDraft.rows[0].count, 13);

    await client.query("COMMIT");
    console.log(JSON.stringify({
      target: {
        projectId: expectedProjectId,
        branchId: expectedBranchId,
        endpointHost: configuredUrl.hostname,
      },
      published,
      remainingDraft: remainingDraft.rows[0].count,
      publishedRevision: 2,
      verificationStatus: "pending_review",
      publishedPointers: verification.rowCount,
    }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
