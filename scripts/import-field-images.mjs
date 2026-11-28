import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  assertDevelopmentTarget,
  verifyNeonDevelopmentEndpoint,
} from "./import-real-pathway-draft.mjs";

const { Pool } = pg;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const imageDirectory = resolve(root, "public", "images", "fields");
const expectedImageMigration = 1795861255927;
const images = [
  ["agriculture-environment", "agriculture-environment.jpg"],
  ["arts-design", "arts-design.jpg"],
  ["business", "business-management.jpg"],
  ["education", "education.jpg"],
  ["engineering", "engineering.jpg"],
  ["government", "government-public-service.jpg"],
  ["healthcare", "healthcare.jpg"],
  ["hospitality-tourism", "hospitality-tourism.jpg"],
  ["law", "law.jpg"],
  ["media", "media.jpg"],
  ["science", "science-research.jpg"],
  ["social-sciences", "social-sciences.jpg"],
  ["technology", "technology.jpg"],
];

const target = assertDevelopmentTarget({
  directUrl: process.env.DATABASE_URL_UNPOOLED,
  pooledUrl: process.env.DATABASE_URL,
  projectId: process.env.NEON_PROJECT_ID,
  branchId: process.env.NEON_BRANCH_ID,
  neonBranch: process.env.NEON_BRANCH,
  vercel: process.env.VERCEL,
});
verifyNeonDevelopmentEndpoint();

const require = createRequire(import.meta.url);
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
const { validateFieldImage } = require("../src/app/api/admin/catalogue/fields/image-upload.ts");

const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED, max: 1 });
try {
  const client = await pool.connect();
  try {
    const database = await client.query("SELECT current_database() AS database_name");
    if (database.rows[0]?.database_name !== "neondb") {
      throw new Error("Field image import refused outside the verified development database.");
    }

    const migration = await client.query(
      "SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = $1 LIMIT 1",
      [expectedImageMigration],
    );
    if (migration.rowCount !== 1) {
      throw new Error("Apply the verified Field image migration before importing existing images.");
    }

    const preparedImages = [];
    for (const [fieldId, filename] of images) {
      const imageData = await readFile(resolve(imageDirectory, filename));
      const file = new File([imageData], filename, { type: "image/jpeg" });
      preparedImages.push({
        fieldId,
        ...await validateFieldImage(file),
      });
    }
    if (preparedImages.length !== 13) {
      throw new Error("The existing Field image set is incomplete.");
    }

    await client.query("BEGIN");
    try {
      const imported = [];
      const skipped = [];
      for (const image of preparedImages) {
        const field = await client.query(
          `SELECT item.published_revision_id AS revision_id,
                  revision.publication_status,
                  revision.data_classification,
                  stored.image_data,
                  stored.image_removed
             FROM public.catalog_items AS item
             JOIN public.catalog_item_aliases AS alias
               ON alias.catalog_item_id = item.id
              AND alias.source_system = 'careerbridge'
              AND alias.external_type = 'field'
              AND alias.external_context_key = ''
             JOIN public.catalog_item_revisions AS revision
               ON revision.id = item.published_revision_id
              AND revision.catalog_item_id = item.id
             JOIN public.field_revisions AS field
               ON field.revision_id = revision.id
             LEFT JOIN public.field_revision_images AS stored
               ON stored.revision_id = revision.id
            WHERE item.item_type = 'field'
              AND alias.external_key = $1
            FOR UPDATE OF item`,
          [image.fieldId],
        );
        if (field.rowCount !== 1) {
          throw new Error(`Expected one published Field record for ${image.fieldId}.`);
        }
        const record = field.rows[0];
        if (record.publication_status !== "published" || record.data_classification !== "real") {
          throw new Error(`Refusing to import an image for a non-real or unpublished Field: ${image.fieldId}.`);
        }
        if (record.image_data || record.image_removed) {
          skipped.push(image.fieldId);
          continue;
        }

        const inserted = await client.query(
          `INSERT INTO public.field_revision_images
            (revision_id, image_data, image_content_type)
           VALUES ($1, $2, $3)
           ON CONFLICT (revision_id) DO NOTHING
            RETURNING revision_id`,
          [record.revision_id, image.imageData, image.imageContentType],
        );
        if (inserted.rowCount === 1) imported.push(image.fieldId);
        else skipped.push(image.fieldId);
      }
      await client.query("COMMIT");
      console.log(
        `Imported ${imported.length} Field images into ${target.branchId}; skipped ${skipped.length} existing or intentionally removed images.`,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
