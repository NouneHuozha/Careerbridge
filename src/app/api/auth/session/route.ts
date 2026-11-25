import { connection, NextResponse } from "next/server";
import {
  AccountDeletionPendingError,
  AccountEmailConflictError,
  AccountIdentityConflictError,
  AccountProvisioningRequiredError,
  getCurrentUser,
} from "../../../auth-server";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  await connection();
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user }, { headers: noStore });
  } catch (error) {
    if (error instanceof AccountDeletionPendingError) {
      return NextResponse.json(
        { error: error.message, deletionPending: true },
        { status: 409, headers: noStore },
      );
    }
    if (error instanceof AccountProvisioningRequiredError) {
      return NextResponse.json(
        { error: error.message, provisioningRequired: true },
        { status: 409, headers: noStore },
      );
    }
    if (error instanceof AccountIdentityConflictError) {
      return NextResponse.json(
        { error: error.message, provisioningRequired: false },
        { status: 409, headers: noStore },
      );
    }
    if (error instanceof AccountEmailConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409, headers: noStore });
    }
    console.error("[careerbridge-next] session lookup failed", error);
    return NextResponse.json(
      { error: "Account services are unavailable. Check the database configuration and try again." },
      { status: 503, headers: noStore },
    );
  }
}
