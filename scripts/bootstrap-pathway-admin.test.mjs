import assert from "node:assert/strict";
import test from "node:test";
import { bootstrapOwnerAdmin, verifyClerkOwnerIdentity } from "./bootstrap-pathway-admin.mjs";

test("owner identity requires Clerk's private owner marker", async () => {
  const fetchImpl = async (url, options) => {
    assert.equal(url, "https://api.clerk.com/v1/users/user_project_owner");
    assert.equal(options.headers.Authorization, "Bearer test-secret");
    return {
      ok: true,
      async json() {
        return {
          id: "user_project_owner",
          private_metadata: { careerbridgeOwner: true },
        };
      },
    };
  };
  assert.equal(
    await verifyClerkOwnerIdentity("user_project_owner", "test-secret", fetchImpl),
    "user_project_owner",
  );
  await assert.rejects(
    verifyClerkOwnerIdentity("user_project_owner", "test-secret", async () => ({
      ok: true,
      async json() {
        return { id: "user_project_owner", private_metadata: {} };
      },
    })),
    /not marked as the CareerBridge project owner/,
  );
});

test("owner bootstrap promotes only an existing Clerk student and commits atomically", async () => {
  const statements = [];
  const client = {
    async query(sql, params = []) {
      const statement = String(sql).replace(/\s+/g, " ").trim();
      statements.push({ statement, params });
      if (statement === "SELECT current_database() AS database_name") {
        return { rowCount: 1, rows: [{ database_name: "neondb" }] };
      }
      if (statement.startsWith("SELECT count(*)")) return { rowCount: 1, rows: [{ count: 0 }] };
      if (statement.startsWith("SELECT id, role FROM public.users")) {
        return { rowCount: 1, rows: [{ id: 17, role: "student" }] };
      }
      if (statement.startsWith("UPDATE public.users")) return { rowCount: 1, rows: [{ id: 17 }] };
      return { rowCount: 0, rows: [] };
    },
  };

  assert.deepEqual(await bootstrapOwnerAdmin(client, "user_project_owner"), { careerBridgeUserId: 17 });
  assert.equal(statements[0].statement, "BEGIN");
  assert.equal(statements.at(-1).statement, "COMMIT");
  assert.ok(statements.some(({ statement, params }) =>
    statement.startsWith("UPDATE public.users") && params[1] === "user_project_owner"));
});

test("owner bootstrap rolls back if an administrator already exists", async () => {
  const statements = [];
  const client = {
    async query(sql) {
      const statement = String(sql).replace(/\s+/g, " ").trim();
      statements.push(statement);
      if (statement.startsWith("SELECT count(*)")) return { rowCount: 1, rows: [{ count: 1 }] };
      return { rowCount: 1, rows: [{ database_name: "neondb" }] };
    },
  };
  await assert.rejects(bootstrapOwnerAdmin(client, "user_project_owner"), /administrator already exists/);
  assert.equal(statements.at(-1), "ROLLBACK");
  assert.ok(!statements.some((statement) => statement.startsWith("UPDATE public.users")));
});
