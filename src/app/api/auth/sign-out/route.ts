import { NextResponse } from "next/server";
import { authSessionCookie, deleteSession } from "../../../auth-server";

export async function POST(request: Request) {
  const token = request.headers.get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${authSessionCookie}=`))
    ?.slice(authSessionCookie.length + 1);

  try {
    await deleteSession(token);
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(authSessionCookie);
    return response;
  } catch (error) {
    console.error("[careerbridge-next] sign out failed", error);
    return NextResponse.json(
      { error: "We couldn't sign you out just now. Please try again." },
      { status: 503 },
    );
  }
}
