import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { assertDevelopmentTarget } from "../../../scripts/import-real-pathway-draft.mjs";
import { getPool } from "../../db/pool";
import {
  AdminAccessDeniedError,
  AdminAuthenticationRequiredError,
  requireAdmin,
} from "../admin-auth";
import AdminShell from "./admin-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    assertDevelopmentTarget({
      directUrl: process.env.DATABASE_URL_UNPOOLED,
      pooledUrl: process.env.DATABASE_URL,
      projectId: process.env.NEON_PROJECT_ID,
      branchId: process.env.NEON_BRANCH_ID,
      neonBranch: process.env.NEON_BRANCH,
      vercel: process.env.VERCEL,
    });
    const database = await getPool().query(
      "SELECT current_database() AS database_name",
    );
    if (database.rows[0]?.database_name !== "neondb") {
      throw new Error("Admin access refused outside the verified development database.");
    }
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthenticationRequiredError) {
      redirect(`/sign-in?next=${encodeURIComponent("/admin")}`);
    }
    if (error instanceof AdminAccessDeniedError) {
      return (
        <main className="mx-auto min-h-svh max-w-3xl px-6 py-16 text-[#263b32]">
          <h1 className="text-2xl font-semibold">Admin access denied</h1>
          <p className="mt-3 text-sm text-[#52645a]">
            This CareerBridge account does not have administrator access.
          </p>
          <Link className="mt-6 inline-block underline" href="/">
            Return to CareerBridge
          </Link>
        </main>
      );
    }

    console.error("[careerbridge-next] Admin page access check failed", error);
    return (
      <main className="mx-auto min-h-svh max-w-3xl px-6 py-16 text-[#263b32]">
        <h1 className="text-2xl font-semibold">Admin is temporarily unavailable</h1>
        <p className="mt-3 text-sm text-[#52645a]">
          We could not verify Admin access. Please try again.
        </p>
        <Link className="mt-6 inline-block underline" href="/admin">
          Try again
        </Link>
      </main>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
