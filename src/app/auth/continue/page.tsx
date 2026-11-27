import { redirect } from "next/navigation";
import { getCurrentCareerBridgeRole } from "../../auth-role";
import { resolvePostLoginPath, safeReturnPath } from "../../auth-routing";

type SearchParams = Promise<{ next?: string | string[] }>;

export default async function AuthContinuePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const requestedPath = Array.isArray(params.next) ? params.next[0] : params.next;
  const role = await getCurrentCareerBridgeRole();
  const safePath = safeReturnPath(requestedPath) ?? "/explore";

  if (role === null) {
    redirect(`/sign-in?next=${encodeURIComponent(safePath)}`);
  }
  if (role === "unprovisioned") {
    redirect(`/sign-up?next=${encodeURIComponent(safePath)}`);
  }
  redirect(resolvePostLoginPath(role, requestedPath));
}
