import type { Metadata } from "next";
import { AuthPageRoute } from "./auth-page-route";

export const metadata: Metadata = { title: "Sign in | CareerBridge" };

export default function SignInPage() {
  return <AuthPageRoute initialMode="sign-in" />;
}
