import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentCareerBridgeRole } from "../auth-role";
import { resolvePostLoginPath, safeReturnPath } from "../auth-routing";
import AuthPageLayout from "./auth-page-layout";

export async function AuthPageRoute({
  initialMode,
  searchParams,
}: {
  initialMode: "sign-in" | "sign-up";
  searchParams: Promise<{ next?: string | string[]; setup?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedPath = Array.isArray(params.next) ? params.next[0] : params.next;
  const setup = Array.isArray(params.setup) ? params.setup[0] : params.setup;
  const role = await getCurrentCareerBridgeRole();
  const safePath = safeReturnPath(requestedPath) ?? "/explore";

  if (setup !== "1" && (role === "admin" || role === "student")) {
    redirect(resolvePostLoginPath(role, requestedPath));
  }
  if (setup !== "1" && role === "unprovisioned" && initialMode === "sign-in") {
    redirect(`/sign-up?next=${encodeURIComponent(safePath)}`);
  }

  return (
    <Suspense fallback={<div className="min-h-svh bg-[#f0f2ef]" />}>
      <AuthPageLayout initialMode={initialMode} />
    </Suspense>
  );
}
