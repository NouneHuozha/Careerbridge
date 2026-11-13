import { NextResponse } from "next/server";
import {
  authSessionCookie,
  createSession,
  signIn,
  signUp,
} from "../../../auth-server";

function safeReturnPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/explore";
  }
  const path = value.split(/[?#]/, 1)[0];
  if (path === "/sign-in" || path === "/sign-up") return "/explore";
  return value;
}

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

function setSessionCookie(response: NextResponse, token: string, expires: Date) {
  response.cookies.set(authSessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const isSignUp = action === "sign-up";
  const formPath = isSignUp ? "/sign-up" : "/sign-in";
  if (!isSignUp && action !== "sign-in") {
    return NextResponse.json({ error: "Unknown authentication action." }, { status: 404 });
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin) {
    try {
      if (!host || new URL(origin).host !== host) {
        return redirectTo(request, `${formPath}?error=${encodeURIComponent("This request could not be verified. Please try again.")}`);
      }
    } catch {
      return redirectTo(request, `${formPath}?error=${encodeURIComponent("This request could not be verified. Please try again.")}`);
    }
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirectTo(request, `${formPath}?error=${encodeURIComponent("Please complete the form and try again.")}`);
  }

  const next = safeReturnPath(form.get("next"));
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const ageAttestation = String(form.get("ageAttestation") ?? "");
  const privacyAccepted = form.get("privacyAccepted") === "yes";
  if (isSignUp && password !== confirm) {
    return redirectTo(
      request,
      `${formPath}?error=${encodeURIComponent("Both passwords need to match.")}&next=${encodeURIComponent(next)}`,
    );
  }

  try {
    const result = isSignUp
      ? await signUp({
          email,
          password,
          fullName: String(form.get("fullName") ?? ""),
          privacyAccepted,
          ageAttestation,
        })
      : await signIn({ email, password });

    if (!result.ok) {
      return redirectTo(
        request,
        `${formPath}?error=${encodeURIComponent(result.error)}&next=${encodeURIComponent(next)}`,
      );
    }

    const session = await createSession(result.user.id);
    const response = redirectTo(request, next);
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    console.error("[careerbridge-next] authentication failed", error);
    return redirectTo(
      request,
      `${formPath}?error=${encodeURIComponent("We couldn't complete that just now. Check your connection and try again.")}&next=${encodeURIComponent(next)}`,
    );
  }
}
