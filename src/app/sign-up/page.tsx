import type { Metadata } from "next";
import { AuthPageRoute } from "../sign-in/auth-page-route";

export const metadata: Metadata = { title: "Create your account | CareerBridge" };

export default function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; setup?: string | string[] }>;
}) {
  return <AuthPageRoute initialMode="sign-up" searchParams={searchParams} />;
}
