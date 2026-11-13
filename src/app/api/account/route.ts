import { NextRequest, NextResponse } from "next/server";
import { authSessionCookie, deleteAccount, getCurrentUser } from "../../auth-server";

const noStore = { "Cache-Control": "no-store" };

export async function DELETE(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403, headers: noStore });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please confirm your account deletion." }, { status: 400, headers: noStore });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("password" in body) ||
    typeof body.password !== "string" ||
    body.password.length === 0 ||
    body.password.length > 128 ||
    !("confirmation" in body) ||
    body.confirmation !== "DELETE"
  ) {
    return NextResponse.json({ error: "Enter your password and type DELETE to confirm." }, { status: 422, headers: noStore });
  }

  try {
    const user = await getCurrentUser(request.cookies.get(authSessionCookie)?.value);
    if (!user) {
      return NextResponse.json({ error: "Sign in again before deleting your account." }, { status: 401, headers: noStore });
    }
    const deleted = await deleteAccount(user.id, body.password);
    if (!deleted) {
      return NextResponse.json({ error: "That password doesn't match this account." }, { status: 401, headers: noStore });
    }
    const response = NextResponse.json({ ok: true }, { headers: noStore });
    response.cookies.delete(authSessionCookie);
    return response;
  } catch (error) {
    console.error("[careerbridge-next] account deletion failed", error);
    return NextResponse.json(
      { error: "We couldn't delete your account just now. Please try again." },
      { status: 503, headers: noStore },
    );
  }
}
