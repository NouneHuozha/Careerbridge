import "server-only";
import { auth } from "@clerk/nextjs/server";
import { getPool } from "../db/pool";

export type CareerBridgeRole = "admin" | "student";
export type CareerBridgeRoleLookup = CareerBridgeRole | "unprovisioned" | null;

export async function getCurrentCareerBridgeRole(): Promise<CareerBridgeRoleLookup> {
  const { userId } = await auth();
  if (!userId) return null;

  const result = await getPool().query<{ role: string }>(
    `SELECT role
       FROM public.users
      WHERE external_id = $1 AND auth_provider = 'clerk'`,
    [userId],
  );
  if (result.rowCount === 0) return "unprovisioned";
  if (result.rowCount !== 1) {
    throw new Error("The authenticated Clerk identity has an ambiguous CareerBridge mapping.");
  }

  const role = result.rows[0]?.role;
  if (role !== "admin" && role !== "student") {
    throw new Error("The authenticated CareerBridge account has an unsupported role.");
  }
  return role;
}
