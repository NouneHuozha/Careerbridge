import { NextRequest, NextResponse } from "next/server";
import {
  authSessionCookie,
  getAccountData,
  getCurrentUser,
  updateAccountData,
} from "../../../auth-server";
import { isPersonalDataMutation } from "../../../personal-data-validation";

const noStore = { "Cache-Control": "no-store" };
const maxBodyBytes = 512 * 1024;

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request.cookies.get(authSessionCookie)?.value);
    if (!user) {
      return NextResponse.json({ error: "Sign in to access account data." }, { status: 401, headers: noStore });
    }
    const data = await getAccountData(user.id);
    return NextResponse.json({ data }, { headers: noStore });
  } catch (error) {
    console.error("[careerbridge-next] account data lookup failed", error);
    return NextResponse.json(
      { error: "Account data is unavailable. Please try again." },
      { status: 503, headers: noStore },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403, headers: noStore });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBodyBytes) {
    return NextResponse.json({ error: "This update is too large." }, { status: 413, headers: noStore });
  }

  let input: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > maxBodyBytes) {
      return NextResponse.json({ error: "This update is too large." }, { status: 413, headers: noStore });
    }
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Please send a valid account update." }, { status: 400, headers: noStore });
  }

  if (!isPersonalDataMutation(input)) {
    return NextResponse.json({ error: "This account update is invalid." }, { status: 422, headers: noStore });
  }

  try {
    const user = await getCurrentUser(request.cookies.get(authSessionCookie)?.value);
    if (!user) {
      return NextResponse.json({ error: "Sign in to update account data." }, { status: 401, headers: noStore });
    }
    const data = await updateAccountData(user.id, input);
    return NextResponse.json({ data }, { headers: noStore });
  } catch (error) {
    console.error("[careerbridge-next] account data update failed", error);
    return NextResponse.json(
      { error: "We couldn't save that account update. Please try again." },
      { status: 503, headers: noStore },
    );
  }
}
