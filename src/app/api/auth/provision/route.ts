import { NextRequest, NextResponse } from "next/server";
import {
  AccountIdentityConflictError,
  AccountSetupValidationError,
  AuthenticationRequiredError,
  provisionCurrentUser,
} from "../../../auth-server";

const noStore = { "Cache-Control": "no-store" };
const maxBodyBytes = 4096;

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

function isProvisioningInput(
  value: unknown,
): value is { privacyAccepted: true; ageAttestation: "adult" | "minor-guardian" } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  return (
    Object.keys(input).every((key) => key === "privacyAccepted" || key === "ageAttestation") &&
    input.privacyAccepted === true &&
    (input.ageAttestation === "adult" || input.ageAttestation === "minor-guardian")
  );
}

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: "Please send valid account setup details." }, { status: 400, headers: noStore });
  }

  if (!isProvisioningInput(input)) {
    return NextResponse.json({ error: "Please accept the Privacy Notice and confirm age information." }, { status: 422, headers: noStore });
  }

  try {
    const user = await provisionCurrentUser(input);
    return NextResponse.json({ user }, { headers: noStore });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: error.message }, { status: 401, headers: noStore });
    }
    if (error instanceof AccountSetupValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422, headers: noStore });
    }
    if (error instanceof AccountIdentityConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409, headers: noStore });
    }
    console.error("[careerbridge-next] account provisioning failed", error);
    return NextResponse.json(
      { error: "CareerBridge could not finish setting up your account. Retry setup before continuing." },
      { status: 503, headers: noStore },
    );
  }
}
