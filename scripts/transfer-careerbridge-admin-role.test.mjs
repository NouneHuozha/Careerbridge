import assert from "node:assert/strict";
import test from "node:test";
import {
  assertTransferEnvironment,
  roleTransfer,
  transferCareerBridgeAdminRole,
  verifyClerkIdentity,
} from "./transfer-careerbridge-admin-role.mjs";

const databaseConfig = {
  directUrl: "postgresql://dev@ep-divine-fog-a1uxos5z.ap-southeast-1.aws.neon.tech/neondb",
  pooledUrl: "postgresql://dev@ep-divine-fog-a1uxos5z-pooler.ap-southeast-1.aws.neon.tech/neondb",
  projectId: "calm-brook-21165945",
  branchId: "br-wandering-flower-a1f6ys66",
  neonBranch: "development",
};

function users() {
  return [
    {
      id: 1,
      email: roleTransfer.from.email,
      external_id: roleTransfer.from.clerkId,
      auth_provider: "clerk",
      role: "admin",
    },
    {
      id: 6,
      email: roleTransfer.to.email,
      external_id: roleTransfer.to.clerkId,
      auth_provider: "clerk",
      role: "student",
    },
  ];
}

function makeClient({
  initialUsers = users(),
  databaseName = "neondb",
  failUpdateNumber = 0,
  addUnexpectedAdminAfterUpdates = false,
} = {}) {
  const state = { users: structuredClone(initialUsers) };
  const calls = [];
  let snapshot;
  let updateCount = 0;
  let adminQueryCount = 0;
  const client = {
    async query(sql, params = []) {
      const statement = String(sql).replace(/\s+/g, " ").trim();
      calls.push({ statement, params });
      if (statement === "BEGIN") {
        snapshot = structuredClone(state.users);
        return { rowCount: 0, rows: [] };
      }
      if (statement.startsWith("SELECT pg_advisory_xact_lock")) {
        return { rowCount: 1, rows: [] };
      }
      if (statement === "SELECT current_database() AS database_name") {
        return { rowCount: 1, rows: [{ database_name: databaseName }] };
      }
      if (statement.includes("FROM public.users") && statement.endsWith("FOR UPDATE")) {
        const [fromId, toId, fromClerkId, toClerkId, fromEmail, toEmail] = params;
        const wantedEmails = [fromEmail.toLowerCase(), toEmail.toLowerCase()];
        return {
          rowCount: state.users.filter((row) =>
            row.id === fromId ||
            row.id === toId ||
            row.external_id === fromClerkId ||
            row.external_id === toClerkId ||
            wantedEmails.includes(row.email.toLowerCase()),
          ).length,
          rows: state.users.filter((row) =>
            row.id === fromId ||
            row.id === toId ||
            row.external_id === fromClerkId ||
            row.external_id === toClerkId ||
            wantedEmails.includes(row.email.toLowerCase()),
          ),
        };
      }
      if (statement.startsWith("SELECT id, email, external_id, auth_provider FROM public.users WHERE role='admin'")) {
        adminQueryCount += 1;
        const rows = state.users
          .filter((row) => row.role === "admin")
          .map(({ id, email, external_id, auth_provider }) => ({ id, email, external_id, auth_provider }));
        if (addUnexpectedAdminAfterUpdates && adminQueryCount === 2) {
          rows.push({
            id: 99,
            email: "other-admin@example.test",
            external_id: "user_other_admin",
            auth_provider: "clerk",
          });
        }
        return { rowCount: rows.length, rows };
      }
      if (statement.startsWith("UPDATE public.users")) {
        updateCount += 1;
        if (updateCount === failUpdateNumber) return { rowCount: 0, rows: [] };
        const [role, id, email, externalId, currentRole] = params;
        const row = state.users.find((candidate) =>
          candidate.id === id &&
          candidate.email === email &&
          candidate.external_id === externalId &&
          candidate.auth_provider === "clerk" &&
          candidate.role === currentRole,
        );
        if (!row) return { rowCount: 0, rows: [] };
        row.role = role;
        return { rowCount: 1, rows: [{ id: row.id, role: row.role }] };
      }
      if (statement.startsWith("SELECT id, email, external_id, auth_provider, role FROM public.users WHERE id IN")) {
        const rows = state.users
          .filter((row) => params.includes(row.id))
          .sort((left, right) => left.id - right.id);
        return { rowCount: rows.length, rows };
      }
      if (statement === "COMMIT") return { rowCount: 0, rows: [] };
      if (statement === "ROLLBACK") {
        if (snapshot) state.users = snapshot;
        return { rowCount: 0, rows: [] };
      }
      throw new Error(`Unexpected SQL in role-transfer test: ${statement}`);
    },
  };
  return { client, calls, state };
}

test("transfer environment rejects non-development database or Clerk keys", () => {
  assert.doesNotThrow(() =>
    assertTransferEnvironment(databaseConfig, "sk_test_dev", "pk_test_dev"),
  );
  assert.throws(
    () => assertTransferEnvironment({ ...databaseConfig, branchId: "br-production" }, "sk_test_dev", "pk_test_dev"),
    /must identify development/,
  );
  assert.throws(
    () => assertTransferEnvironment(databaseConfig, "sk_live_secret", "pk_test_dev"),
    /Clerk development keys/,
  );
});

test("Clerk verification rejects a mismatched user identity or primary email", async () => {
  await assert.rejects(
    verifyClerkIdentity(roleTransfer.to, "sk_test_dev", async () => ({
      ok: true,
      async json() {
        return {
          id: "user_not_the_expected_identity",
          primary_email_address_id: "email_1",
          email_addresses: [{
            id: "email_1",
            email_address: roleTransfer.to.email,
            verification: { status: "verified" },
          }],
        };
      },
    })),
    /identity, primary email, or verification state did not match/,
  );
});

test("transfer rejects mismatched or duplicate Neon identity mappings before updates", async () => {
  const mismatched = users();
  mismatched[0].external_id = "user_unexpected";
  const mismatchClient = makeClient({ initialUsers: mismatched });
  await assert.rejects(transferCareerBridgeAdminRole(mismatchClient.client), /exactly one Neon user/);
  assert.equal(mismatchClient.calls.filter(({ statement }) => statement.startsWith("UPDATE public.users")).length, 0);
  assert.equal(mismatchClient.calls.at(-1).statement, "ROLLBACK");

  const duplicated = users();
  duplicated.push({
    id: 7,
    email: "other@example.test",
    external_id: roleTransfer.from.clerkId,
    auth_provider: "clerk",
    role: "student",
  });
  const duplicateClient = makeClient({ initialUsers: duplicated });
  await assert.rejects(transferCareerBridgeAdminRole(duplicateClient.client), /exactly one Neon user/);
  assert.equal(duplicateClient.calls.filter(({ statement }) => statement.startsWith("UPDATE public.users")).length, 0);
});

test("transfer rejects unexpected current roles and non-development databases", async () => {
  const wrongRole = users();
  wrongRole[0].role = "student";
  const roleClient = makeClient({ initialUsers: wrongRole });
  await assert.rejects(transferCareerBridgeAdminRole(roleClient.client), /expected admin account/);
  assert.equal(roleClient.calls.filter(({ statement }) => statement.startsWith("UPDATE public.users")).length, 0);

  const wrongNewRole = users();
  wrongNewRole[1].role = "admin";
  const newRoleClient = makeClient({ initialUsers: wrongNewRole });
  await assert.rejects(transferCareerBridgeAdminRole(newRoleClient.client), /expected student account/);
  assert.equal(newRoleClient.calls.filter(({ statement }) => statement.startsWith("UPDATE public.users")).length, 0);

  const wrongDatabase = makeClient({ databaseName: "production" });
  await assert.rejects(transferCareerBridgeAdminRole(wrongDatabase.client), /restricted to the verified development database/);
  assert.equal(wrongDatabase.calls.at(-1).statement, "ROLLBACK");
});

test("transfer changes only the two expected roles and verifies the sole remaining admin", async () => {
  const unrelated = {
    id: 9,
    email: "student@example.test",
    external_id: "user_unrelated",
    auth_provider: "clerk",
    role: "student",
  };
  const mock = makeClient({ initialUsers: [...users(), unrelated] });
  const result = await transferCareerBridgeAdminRole(mock.client);
  assert.deepEqual(result, {
    previousAdmin: { id: 1, email: roleTransfer.from.email, role: "student" },
    newAdmin: { id: 6, email: roleTransfer.to.email, role: "admin" },
  });
  assert.deepEqual(mock.state.users, [
    { ...users()[0], role: "student" },
    { ...users()[1], role: "admin" },
    unrelated,
  ]);
  assert.equal(mock.calls.filter(({ statement }) => statement.startsWith("UPDATE public.users")).length, 2);
  assert.ok(mock.calls.some(({ statement }) => statement.endsWith("FOR UPDATE")));
  assert.equal(mock.calls.at(-1).statement, "COMMIT");
});

test("transfer rolls both roles back if the second update fails", async () => {
  const mock = makeClient({ failUpdateNumber: 2 });
  await assert.rejects(transferCareerBridgeAdminRole(mock.client), /dedicated administrator role could not be changed/);
  assert.deepEqual(mock.state.users.map(({ id, role }) => [id, role]), [
    [1, "admin"],
    [6, "student"],
  ]);
  assert.ok(mock.calls.some(({ statement }) => statement === "ROLLBACK"));
  assert.ok(!mock.calls.some(({ statement }) => statement === "COMMIT"));
});

test("transfer rolls both roles back if the post-transfer admin invariant fails", async () => {
  const mock = makeClient({ addUnexpectedAdminAfterUpdates: true });
  await assert.rejects(transferCareerBridgeAdminRole(mock.client), /only administrator after transfer/);
  assert.deepEqual(mock.state.users.map(({ id, role }) => [id, role]), [
    [1, "admin"],
    [6, "student"],
  ]);
  assert.ok(mock.calls.some(({ statement }) => statement === "ROLLBACK"));
  assert.ok(!mock.calls.some(({ statement }) => statement === "COMMIT"));
});
