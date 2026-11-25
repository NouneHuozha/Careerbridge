import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { importOneRealPathwayDraft } from "../../scripts/import-real-pathway-draft.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const payloadPath = join(root, "docs/review/pathways-pilot/nios-senior-secondary.json");
const itemId = "61000000-0000-4000-8000-000000000001";
const demoRevisionId = "62000000-0000-4000-8000-000000000001";
const newRevisionId = "63000000-0000-4000-8000-000000000001";

function createFakeClient({ existingItem = false, demoRevision = false } = {}) {
  const canonicalAlias = {
    sourceSystem: "careerbridge",
    externalType: "pathway",
    externalKey: "open-schooling",
    externalContextKey: "",
  };
  const legacyAlias = {
    sourceSystem: "legacy-content",
    externalType: "pathway",
    externalKey: "nios-open-school",
    externalContextKey: "",
  };
  const state = {
    item: existingItem ? { id: itemId, item_type: "pathway", published_revision_id: null } : null,
    aliases: existingItem ? [canonicalAlias, legacyAlias] : [],
    revisions: demoRevision ? [{
      id: demoRevisionId,
      revision_number: 1,
      publication_status: "draft",
      data_classification: "demo",
      title: "Old illustrative NIOS route",
      summary: "Existing demo copy remains in history.",
      description: "This old revision is retained unchanged.",
      verification_status: "unverified",
      published_at: null,
      typed_revision_id: demoRevisionId,
      stage: "class-10",
      course_stage: "class-12",
      catalogue_group: "Continue secondary education",
      category: "Alternative study mode",
      route_content: { steps: ["Old demo step", "Old demo follow-up"] },
    }] : [],
    sources: [],
    provenance: [],
    writes: [],
  };
  let sourceCounter = 0;
  const client = {
    async query(sql, params = []) {
      const statement = String(sql).replace(/\s+/g, " ").trim();
      if (["BEGIN", "BEGIN READ ONLY", "COMMIT", "ROLLBACK"].includes(statement) ||
          statement.startsWith("SAVEPOINT ") || statement.startsWith("RELEASE SAVEPOINT ") ||
          statement.startsWith("ROLLBACK TO SAVEPOINT ")) {
        state.writes.push(statement);
        return { rowCount: 0, rows: [] };
      }
      if (statement.includes("pg_advisory_xact_lock")) return { rowCount: 1, rows: [] };
      if (statement.includes("FROM public.catalog_item_aliases a") && statement.includes("JOIN public.catalog_items i")) {
        if (!state.item) return { rowCount: 0, rows: [] };
        const aliasFound = state.aliases.some((alias) =>
          alias.sourceSystem === params[0] && alias.externalType === params[1] &&
          alias.externalKey === params[2] && alias.externalContextKey === params[3],
        );
        return aliasFound ? { rowCount: 1, rows: [{ ...state.item }] } : { rowCount: 0, rows: [] };
      }
      if (statement.startsWith("SELECT source_system AS \"sourceSystem\"")) {
        return { rowCount: state.aliases.length, rows: state.aliases.map((alias) => ({ ...alias })) };
      }
      if (statement.startsWith("SELECT r.id, r.revision_number")) {
        return { rowCount: state.revisions.length, rows: state.revisions.map((row) => ({ ...row })) };
      }
      if (statement.includes("SELECT public.normalize_source_url($1)")) {
        return { rowCount: 1, rows: [{ normalized_url: new URL(params[0]).href }] };
      }
      if (statement.startsWith("SELECT id, source_name, authority, canonical_url, category")) {
        const matches = state.sources.filter((source) => source.normalized_url === params[0]);
        return { rowCount: matches.length, rows: matches.slice(0, 2).map((source) => ({ ...source })) };
      }
      if (statement.startsWith("INSERT INTO public.source_registry")) {
        const source = {
          id: `64000000-0000-4000-8000-${String(++sourceCounter).padStart(12, "0")}`,
          source_name: params[0],
          authority: params[1],
          canonical_url: params[2],
          category: params[3],
          source_type: params[4],
          data_types: params[5],
          terms_notes: params[6],
          expected_update_behavior: params[7],
          status: params[8],
          normalized_url: new URL(params[2]).href,
        };
        state.sources.push(source);
        state.writes.push("INSERT public.source_registry");
        return { rowCount: 1, rows: [source] };
      }
      if (statement.startsWith("INSERT INTO public.catalog_items")) {
        state.item = { id: itemId, item_type: "pathway", published_revision_id: null };
        state.writes.push("INSERT public.catalog_items");
        return { rowCount: 1, rows: [{ id: itemId, published_revision_id: null }] };
      }
      if (statement.startsWith("INSERT INTO public.catalog_item_aliases")) {
        state.aliases.push({ sourceSystem: params[0], externalType: params[1], externalKey: params[2], externalContextKey: params[3] });
        state.writes.push("INSERT public.catalog_item_aliases");
        return { rowCount: 1, rows: [] };
      }
      if (statement.startsWith("INSERT INTO public.catalog_item_revisions")) {
        const revision = {
          id: newRevisionId,
          revision_number: params[1],
          publication_status: "draft",
          data_classification: "real",
          title: params[2],
          summary: params[3],
          description: params[4],
          verification_status: params[5],
          published_at: null,
          typed_revision_id: newRevisionId,
        };
        state.revisions.push(revision);
        state.writes.push("INSERT public.catalog_item_revisions");
        return { rowCount: 1, rows: [{ id: newRevisionId }] };
      }
      if (statement.startsWith("INSERT INTO public.pathway_revisions")) {
        state.writes.push("INSERT public.pathway_revisions");
        return { rowCount: 1, rows: [] };
      }
      if (statement.startsWith("INSERT INTO public.catalog_revision_sources")) {
        state.provenance.push({ revision_id: params[0], source_id: params[1], claim_key: params[2], verification_status: params[5] });
        state.writes.push("INSERT public.catalog_revision_sources");
        return { rowCount: 1, rows: [] };
      }
      if (statement.startsWith("SELECT published_revision_id FROM public.catalog_items")) {
        return { rowCount: 1, rows: [{ published_revision_id: state.item?.published_revision_id ?? null }] };
      }
      throw new Error(`Unexpected SQL in fake Pathways importer: ${statement.slice(0, 160)}`);
    },
  };
  return { client, state };
}

test("preview accepts sources that would be newly registered without making any writes", async () => {
  const payload = JSON.parse(await readFile(payloadPath, "utf8"));
  const mock = createFakeClient();
  const result = await importOneRealPathwayDraft(mock.client, payload, { preview: true });
  assert.equal(result.action, "would_insert");
  assert.equal(result.identityWouldBeCreated, true);
  assert.equal(result.currentPublishedRevisionId, null);
  assert.equal(result.published, false);
  assert.equal(mock.state.item, null);
  assert.equal(mock.state.sources.length, 0);
  assert.equal(mock.state.revisions.length, 0);
  assert.equal(mock.state.writes.filter((entry) => entry.startsWith("INSERT")).length, 0);
});

test("draft import appends a real revision without overwriting demo content, aliases, or published pointer", async () => {
  const payload = JSON.parse(await readFile(payloadPath, "utf8"));
  const mock = createFakeClient({ existingItem: true, demoRevision: true });
  const result = await importOneRealPathwayDraft(mock.client, payload);
  assert.equal(result.action, "inserted");
  assert.equal(result.revisionNumber, 2);
  assert.equal(result.currentPublishedRevisionId, null);
  assert.equal(result.published, false);
  assert.equal(mock.state.revisions.length, 2);
  assert.equal(mock.state.revisions[0].id, demoRevisionId);
  assert.equal(mock.state.revisions[0].data_classification, "demo");
  assert.equal(mock.state.revisions[1].id, newRevisionId);
  assert.equal(mock.state.revisions[1].data_classification, "real");
  assert.deepEqual(mock.state.aliases.map((alias) => alias.externalKey), ["open-schooling", "nios-open-school"]);
  assert.equal(mock.state.item.published_revision_id, null);
  assert.equal(mock.state.sources.length, 2);
  assert.equal(mock.state.provenance.length, payload.revision.provenance.length);
  assert.ok(mock.state.writes.includes("INSERT public.catalog_item_revisions"));
  assert.ok(!mock.state.writes.some((entry) => entry.startsWith("UPDATE public.catalog_items")));
  assert.ok(!mock.state.writes.some((entry) => entry.includes("DELETE")));
});
