import type { CareerBridgeRole } from "./auth-role";

const returnPathOrigin = "https://careerbridge.invalid";

export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }

  try {
    const url = new URL(value, returnPathOrigin);
    if (
      url.origin !== returnPathOrigin ||
      ["/sign-in", "/sign-up", "/auth/continue"].some(
        (path) => url.pathname === path || url.pathname.startsWith(`${path}/`),
      )
    ) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function resolvePostLoginPath(
  role: CareerBridgeRole,
  requestedPath: string | null | undefined,
): string {
  const safePath = safeReturnPath(requestedPath);
  if (role === "admin") return "/admin";
  return safePath && !isUnderPath(safePath, "/admin") ? safePath : "/explore";
}

export function postLoginUrl(requestedPath: string): string {
  const safePath = safeReturnPath(requestedPath) ?? "/explore";
  return `/auth/continue?next=${encodeURIComponent(safePath)}`;
}

function isUnderPath(path: string, prefix: string) {
  let pathname = path.split(/[?#]/, 1)[0];
  for (let depth = 0; depth < 5; depth += 1) {
    try {
      const decoded = decodeURIComponent(pathname);
      if (decoded === pathname) break;
      pathname = decoded;
    } catch {
      return true;
    }
  }
  if (/%[0-9a-f]{2}/i.test(pathname)) return true;
  pathname = pathname.replace(/\\/g, "/").replace(/^\/+/, "/");
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
