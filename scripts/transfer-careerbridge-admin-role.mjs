import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import pg from "pg";
import {
  assertDevelopmentTarget,
  verifyNeonDevelopmentEndpoint,
} from "./import-real-pathway-draft.mjs";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

export const roleTransfer = Object.freeze({
  from: Object.freeze({
    neonId: 1,
    email: "gantzo835@gmail.com",
    clerkId: "user_3MB9X98KFQ8NpT7XVtzD9grdfWR",
    role: "admin",
  }),
  to: Object.freeze({
    neonId: 6,
    email: "careerbridge219@gmail.com",
    clerkId: "user_3Mg4nAkAPyeg5RJLcAEweVAufEF",
    role: "student",
  }),
});

export function assertTransferEnvironment(databaseConfig, clerkSecretKey, clerkPublishableKey) {
  const target = assertDevelopmentTarget(databaseConfig);
  if (!clerkSecretKey?.startsWith("sk_test_") ||
      !clerkPublishableKey?.startsWith("pk_test_")) {
    throw new Error("CareerBridge Admin role transfer requires Clerk development keys.");
  }
  return target;
}

export async function verifyClerkIdentity(identity, secretKey, fetchImpl = fetch) {
  if (!secretKey?.startsWith("sk_test_")) {
    throw new Error("CareerBridge Admin role transfer requires a Clerk development secret key.");
  }

  let response;
  try {
    response = await fetchImpl(
      `https://api.clerk.com/v1/users/${encodeURIComponent(identity.clerkId)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    throw new Error(`Could not verify the Clerk identity for ${identity.email}.`);
  }
  if (!response.ok) {
    throw new Error(`Clerk identity verification failed for ${identity.email} with HTTP ${response.status}.`);
  }

  let user;
  try {
    user = await response.json();
  } catch {
    throw new Error(`Clerk identity verification returned invalid data for ${identity.email}.`);
  }

  const primaryEmail = user?.email_addresses?.find(
    (address) => address.id === user.primary_email_address_id,
  );
  if (
    user?.id !== identity.clerkId ||
    primaryEmail?.email_address !== identity.email ||
    primaryEmail?.verification?.status !== "verified"
  ) {
    throw new Error(`Clerk identity, primary email, or verification state did not match for ${identity.email}.`);
  }

  return { clerkId: user.id, email: primaryEmail.email_address };
}

function assertExpectedUser(row, identity) {
  if (
    !row ||
    row.id !== identity.neonId ||
    row.email !== identity.email ||
    row.external_id !== identity.clerkId ||
    row.auth_provider !== "clerk" ||
    row.role !== identity.role
  ) {
    throw new Error(`Neon identity or role did not match the expected ${identity.role} account for ${identity.email}.`);
  }
}

export async function transferCareerBridgeAdminRole(client) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [20261126, 2]);
    const database = await client.query("SELECT current_database() AS database_name");
    if (database.rows[0]?.database_name !== "neondb") {
      throw new Error("Admin role transfer is restricted to the verified development database.");
    }

    const lockedUsers = await client.query(
      `SELECT id, email, external_id, auth_provider, role
         FROM public.users
        WHERE id IN ($1, $2)
           OR external_id IN ($3, $4)
           OR lower(email) IN (lower($5), lower($6))
        ORDER BY id
        FOR UPDATE`,
      [
        roleTransfer.from.neonId,
        roleTransfer.to.neonId,
        roleTransfer.from.clerkId,
        roleTransfer.to.clerkId,
        roleTransfer.from.email,
        roleTransfer.to.email,
      ],
    );
    const fromMappings = lockedUsers.rows.filter(
      (row) => row.external_id === roleTransfer.from.clerkId,
    );
    const toMappings = lockedUsers.rows.filter(
      (row) => row.external_id === roleTransfer.to.clerkId,
    );
    if (fromMappings.length !== 1 || toMappings.length !== 1) {
      throw new Error("Each Clerk identity must map to exactly one Neon user.");
    }
    if (lockedUsers.rowCount !== 2) {
      throw new Error("Unexpected Neon rows matched the role-transfer identities or emails.");
    }
    assertExpectedUser(fromMappings[0], roleTransfer.from);
    assertExpectedUser(toMappings[0], roleTransfer.to);

    const currentAdmins = await client.query(
      `SELECT id, email, external_id, auth_provider
         FROM public.users
        WHERE role='admin'
        ORDER BY id`,
    );
    if (
      currentAdmins.rowCount !== 1 ||
      currentAdmins.rows[0].id !== roleTransfer.from.neonId ||
      currentAdmins.rows[0].email !== roleTransfer.from.email ||
      currentAdmins.rows[0].external_id !== roleTransfer.from.clerkId ||
      currentAdmins.rows[0].auth_provider !== "clerk"
    ) {
      throw new Error("The old account must be the sole current administrator before transfer.");
    }

    const demoted = await client.query(
      `UPDATE public.users
          SET role=$1, updated_at=now()
        WHERE id=$2 AND email=$3 AND external_id=$4 AND auth_provider='clerk' AND role=$5
        RETURNING id, role`,
      [
        "student",
        roleTransfer.from.neonId,
        roleTransfer.from.email,
        roleTransfer.from.clerkId,
        "admin",
      ],
    );
    if (demoted.rowCount !== 1 || demoted.rows[0].role !== "student") {
      throw new Error("The old administrator role could not be changed exactly once.");
    }

    const promoted = await client.query(
      `UPDATE public.users
          SET role=$1, updated_at=now()
        WHERE id=$2 AND email=$3 AND external_id=$4 AND auth_provider='clerk' AND role=$5
        RETURNING id, role`,
      [
        "admin",
        roleTransfer.to.neonId,
        roleTransfer.to.email,
        roleTransfer.to.clerkId,
        "student",
      ],
    );
    if (promoted.rowCount !== 1 || promoted.rows[0].role !== "admin") {
      throw new Error("The dedicated administrator role could not be changed exactly once.");
    }

    const verifiedUsers = await client.query(
      `SELECT id, email, external_id, auth_provider, role
         FROM public.users
        WHERE id IN ($1, $2)
        ORDER BY id`,
      [roleTransfer.from.neonId, roleTransfer.to.neonId],
    );
    if (verifiedUsers.rowCount !== 2) {
      throw new Error("Both role-transfer user rows must remain present.");
    }
    assertExpectedUser(verifiedUsers.rows.find((row) => row.id === roleTransfer.from.neonId), {
      ...roleTransfer.from,
      role: "student",
    });
    assertExpectedUser(verifiedUsers.rows.find((row) => row.id === roleTransfer.to.neonId), {
      ...roleTransfer.to,
      role: "admin",
    });

    const remainingAdmins = await client.query(
      `SELECT id, email, external_id, auth_provider
         FROM public.users
        WHERE role='admin'
        ORDER BY id`,
    );
    if (
      remainingAdmins.rowCount !== 1 ||
      remainingAdmins.rows[0].id !== roleTransfer.to.neonId ||
      remainingAdmins.rows[0].email !== roleTransfer.to.email ||
      remainingAdmins.rows[0].external_id !== roleTransfer.to.clerkId ||
      remainingAdmins.rows[0].auth_provider !== "clerk"
    ) {
      throw new Error("The dedicated Clerk identity must be the only administrator after transfer.");
    }

    await client.query("COMMIT");
    return {
      previousAdmin: { id: roleTransfer.from.neonId, email: roleTransfer.from.email, role: "student" },
      newAdmin: { id: roleTransfer.to.neonId, email: roleTransfer.to.email, role: "admin" },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function runCli() {
  loadEnvConfig(repositoryRoot);
  const target = assertTransferEnvironment(
    {
      directUrl: process.env.DATABASE_URL_UNPOOLED,
      pooledUrl: process.env.DATABASE_URL,
      projectId: process.env.NEON_PROJECT_ID,
      branchId: process.env.NEON_BRANCH_ID,
      neonBranch: process.env.NEON_BRANCH,
      vercel: process.env.VERCEL,
    },
    process.env.CLERK_SECRET_KEY,
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  verifyNeonDevelopmentEndpoint();

  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  await Promise.all([
    verifyClerkIdentity(roleTransfer.from, clerkSecretKey),
    verifyClerkIdentity(roleTransfer.to, clerkSecretKey),
  ]);

  if (!process.argv.includes("--confirm")) {
    throw new Error("Pass --confirm to enable the interactive role-transfer confirmation.");
  }
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("Run the Admin role transfer from an interactive local terminal.");
  }

  const confirmation = createInterface({ input: stdin, output: stdout });
  let answer;
  try {
    answer = await confirmation.question(
      `Change ${roleTransfer.from.email} from admin to student and ${roleTransfer.to.email} from student to admin? Type TRANSFER ${roleTransfer.from.email} TO ${roleTransfer.to.email}: `,
    );
  } finally {
    confirmation.close();
  }
  if (answer !== `TRANSFER ${roleTransfer.from.email} TO ${roleTransfer.to.email}`) {
    throw new Error("Admin role transfer confirmation did not match.");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
    connectionTimeoutMillis: 10_000,
    max: 1,
  });
  const client = await pool.connect();
  try {
    const result = await transferCareerBridgeAdminRole(client);
    console.log(JSON.stringify({
      operation: "careerbridge_admin_role_transfer",
      completedAt: new Date().toISOString(),
      target: { ...target, database: "neondb" },
      ...result,
    }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    console.error(`CareerBridge Admin role transfer failed: ${error.message}`);
    process.exitCode = 1;
  });
}
