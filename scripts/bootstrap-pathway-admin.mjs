import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import pg from "pg";
import {
  assertDevelopmentTarget,
  expectedBranchId,
  expectedHost,
  expectedProjectId,
  verifyNeonDevelopmentEndpoint,
} from "./import-real-pathway-draft.mjs";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
loadEnvConfig(repositoryRoot);

export async function verifyClerkOwnerIdentity(clerkUserId, secretKey, fetchImpl = fetch) {
  if (typeof clerkUserId !== "string" || !/^user_[A-Za-z0-9_-]{1,180}$/.test(clerkUserId)) {
    throw new Error("CAREERBRIDGE_OWNER_CLERK_ID must be a Clerk user ID.");
  }
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is required for owner identity verification.");

  let response;
  try {
    response = await fetchImpl(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`, {
      headers: { Authorization: `Bearer ${secretKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("The Clerk owner identity could not be verified.");
  }
  if (!response.ok) throw new Error(`Clerk owner identity verification failed with HTTP ${response.status}.`);

  let user;
  try {
    user = await response.json();
  } catch {
    throw new Error("The Clerk owner identity response was invalid.");
  }
  if (
    !user ||
    typeof user !== "object" ||
    user.id !== clerkUserId ||
    user.private_metadata?.careerbridgeOwner !== true
  ) {
    throw new Error("The Clerk account is not marked as the CareerBridge project owner.");
  }
  return user.id;
}

export async function bootstrapOwnerAdmin(client, clerkUserId) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [20261126, 2]);
    const database = await client.query("SELECT current_database() AS database_name");
    if (database.rows[0]?.database_name !== "neondb") {
      throw new Error("Owner bootstrap is restricted to the verified development database.");
    }

    const admins = await client.query(
      "SELECT count(*)::int AS count FROM public.users WHERE role='admin'",
    );
    if (admins.rows[0]?.count !== 0) throw new Error("An administrator already exists; bootstrap is one-time.");

    const mapping = await client.query(
      `SELECT id, role FROM public.users
        WHERE external_id=$1 AND auth_provider='clerk'
        FOR UPDATE`,
      [clerkUserId],
    );
    if (mapping.rowCount !== 1) {
      throw new Error("The Clerk owner account must have exactly one existing CareerBridge user mapping.");
    }
    if (mapping.rows[0].role !== "student") {
      throw new Error("Owner bootstrap only promotes the mapped default student role.");
    }

    const promoted = await client.query(
      `UPDATE public.users
          SET role='admin', updated_at=now()
        WHERE id=$1 AND external_id=$2 AND auth_provider='clerk' AND role='student'
        RETURNING id`,
      [mapping.rows[0].id, clerkUserId],
    );
    if (promoted.rowCount !== 1) throw new Error("The owner mapping changed during bootstrap.");
    await client.query("COMMIT");
    return { careerBridgeUserId: promoted.rows[0].id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function runCli() {
  assertDevelopmentTarget({
    directUrl: process.env.DATABASE_URL_UNPOOLED,
    pooledUrl: process.env.DATABASE_URL,
    projectId: process.env.NEON_PROJECT_ID,
    branchId: process.env.NEON_BRANCH_ID,
    neonBranch: process.env.NEON_BRANCH,
    vercel: process.env.VERCEL,
  });
  verifyNeonDevelopmentEndpoint();

  const clerkUserId = process.env.CAREERBRIDGE_OWNER_CLERK_ID;
  const verifiedClerkUserId = await verifyClerkOwnerIdentity(clerkUserId, process.env.CLERK_SECRET_KEY);
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("Run owner bootstrap from an interactive local terminal.");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
    connectionTimeoutMillis: 10_000,
    max: 1,
  });
  const client = await pool.connect();
  try {
    const mapping = await client.query(
      `SELECT id, role FROM public.users
        WHERE external_id=$1 AND auth_provider='clerk'`,
      [verifiedClerkUserId],
    );
    if (mapping.rowCount !== 1 || mapping.rows[0].role !== "student") {
      throw new Error("The marked owner account must map to exactly one default CareerBridge student.");
    }
    const confirmation = createInterface({ input: stdin, output: stdout });
    let answer;
    try {
      answer = await confirmation.question(
        `Promote the mapped CareerBridge user ${mapping.rows[0].id} for Clerk owner ${verifiedClerkUserId} to admin? Type the Clerk ID to confirm: `,
      );
    } finally {
      confirmation.close();
    }
    if (answer !== verifiedClerkUserId) throw new Error("Owner bootstrap confirmation did not match.");

    const result = await bootstrapOwnerAdmin(client, verifiedClerkUserId);
    console.log(JSON.stringify({
      operation: "careerbridge_owner_admin_bootstrap",
      completedAt: new Date().toISOString(),
      target: {
        projectId: expectedProjectId,
        branchId: expectedBranchId,
        endpointHost: expectedHost,
        database: "neondb",
      },
      clerkUserId: verifiedClerkUserId,
      careerBridgeUserId: result.careerBridgeUserId,
      role: "admin",
    }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    console.error(`Pathways owner bootstrap failed: ${error.message}`);
    process.exitCode = 1;
  });
}
