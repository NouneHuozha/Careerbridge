import { connection, NextRequest, NextResponse } from "next/server";
import {
  AccountDeletionPendingError,
  AccountEmailConflictError,
  AccountIdentityConflictError,
  AccountProvisioningRequiredError,
  AccountSessionChangedError,
  AccountSetupValidationError,
  AuthenticationRequiredError,
  syncCurrentUserPrimaryEmail,
} from "../../../../auth-server";

const noStore = { "Cache-Control": "no-store" };
const maxBodyBytes = 4096;

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

function isExpectedUserInput(value: unknown): value is { expectedUserId: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  return (
    Object.keys(input).every((key) => key === "expectedUserId") &&
    typeof input.expectedUserId === "string" &&
    input.expectedUserId.length > 0 &&
    input.expectedUserId.length <= 191 &&
    input.expectedUserId.trim() === input.expectedUserId
  );
}

export async function POST(request: NextRequest) {
  await connection();
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403, headers: noStore });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBodyBytes) {
    return NextResponse.json({ error: "This request is too large." }, { status: 413, headers: noStore });
  }

  let input: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > maxBodyBytes) {
      return NextResponse.json({ error: "This request is too large." }, { status: 413, headers: noStore });
    }
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Please send a valid email synchronization request." }, { status: 400, headers: noStore });
  }

  if (!isExpectedUserInput(input)) {
    return NextResponse.json({ error: "The account identity for this request is invalid." }, { status: 422, headers: noStore });
  }

  try {
    const user = await syncCurrentUserPrimaryEmail(input.expectedUserId);
    return NextResponse.json({ user }, { headers: noStore });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401, headers: noStore });
    }
    if (
      error instanceof AccountDeletionPendingError ||
      error instanceof AccountEmailConflictError ||
      error instanceof AccountIdentityConflictError ||
      error instanceof AccountProvisioningRequiredError ||
      error instanceof AccountSessionChangedError
    ) {
      return NextResponse.json({ error: error.message }, { status: 409, headers: noStore });
    }
    if (error instanceof AccountSetupValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422, headers: noStore });
    }
    console.error("[careerbridge-next] primary email synchronization failed", error);
    return NextResponse.json(
      { error: "CareerBridge could not synchronize your email address. Retry synchronization before continuing." },
      { status: 503, headers: noStore },
    );
  }
}
