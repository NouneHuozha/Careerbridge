import { Suspense } from "react";
import AuthPageLayout from "./auth-page-layout";

export function AuthPageRoute({
  initialMode,
}: {
  initialMode: "sign-in" | "sign-up";
}) {
  return (
    <Suspense fallback={<div className="min-h-svh bg-[#f0f2ef]" />}>
      <AuthPageLayout initialMode={initialMode} />
    </Suspense>
  );
}
