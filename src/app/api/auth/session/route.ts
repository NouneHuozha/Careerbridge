import { NextRequest, NextResponse } from "next/server";
import { authSessionCookie, getCurrentUser } from "../../../auth-server";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(authSessionCookie)?.value;
  try {
    const user = await getCurrentUser(token);
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[careerbridge-next] session lookup failed", error);
    return NextResponse.json(
      { error: "Account services are unavailable. Check the database configuration and try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
