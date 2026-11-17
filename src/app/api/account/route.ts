import { NextRequest, NextResponse } from "next/server";
import {
  AccountDeletionBlockedError,
  AccountDeletionPartialError,
  AuthenticationRequiredError,
  deleteAccount,
} from "../../auth-server";

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
    !("confirmation" in body) ||
    body.confirmation !== "DELETE"
  ) {
    return NextResponse.json({ error: "Type DELETE to confirm account deletion." }, { status: 422, headers: noStore });
  }

  try {
    await deleteAccount();
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401, headers: noStore });
    }
    if (error instanceof AccountDeletionPartialError) {
      console.error("[careerbridge-next] account deletion partially completed", error);
      return NextResponse.json(
        { error: error.message, deletionPending: true },
        { status: 503, headers: noStore },
      );
    }
    if (error instanceof AccountDeletionBlockedError) {
      return NextResponse.json(
        { error: error.message, deletionBlocked: true },
        { status: 409, headers: noStore },
      );
    }
    console.error("[careerbridge-next] account deletion failed", error);
    return NextResponse.json(
      { error: "We couldn't delete your account just now. Please try again." },
      { status: 503, headers: noStore },
    );
  }
}
