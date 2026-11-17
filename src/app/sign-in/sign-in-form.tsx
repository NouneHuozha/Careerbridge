"use client";

import { useAuth, useSignIn } from "@clerk/nextjs";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAccount } from "../account-provider";
import { authUserFromValue } from "../auth-types";

type VerificationMode = "email" | "totp" | "backup" | "phone" | "passkey" | null;

function clerkErrorMessage(error: { longMessage?: string | null; message?: string } | null) {
  return error?.longMessage ?? error?.message ?? "We couldn't complete sign in. Please try again.";
}

function responseError(value: unknown, fallback: string) {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}

export default function SignInForm({
  next,
  onSwitch,
  onForgotPassword,
}: {
  next: string;
  onSwitch: () => void;
  onForgotPassword: () => void;
}) {
  const { isLoaded } = useAuth();
  const { signIn } = useSignIn();
  const account = useAccount();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMode, setVerificationMode] = useState<VerificationMode>(null);
  const [secondFactor, setSecondFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function completeSignIn() {
    const finalized = await signIn.finalize();
    if (finalized.error) {
      setError(clerkErrorMessage(finalized.error));
      return;
    }

    const response = await fetch("/api/auth/session", { cache: "no-store" });
    let result: unknown = null;
    try {
      result = await response.json();
    } catch {
      result = null;
    }
    if (response.status === 409) {
      if (
        typeof result === "object" &&
        result !== null &&
        (("provisioningRequired" in result && result.provisioningRequired === true) ||
          ("deletionPending" in result && result.deletionPending === true))
      ) {
        router.push(`/sign-up?next=${encodeURIComponent(next)}`);
        return;
      }
      setError(responseError(
        result,
        "This Clerk identity is not set up for CareerBridge. Create an account to finish setup.",
      ));
      return;
    }
    if (!response.ok || typeof result !== "object" || result === null || !("user" in result) || !authUserFromValue(result.user)) {
      setError(responseError(result, "Your CareerBridge account could not be loaded. Please try again."));
      return;
    }
    await account.refresh();
    router.push(next);
  }

  async function startRequiredVerification() {
    if (signIn.status === "needs_first_factor") {
      if (!signIn.supportedFirstFactors.some((factor) => factor.strategy === "email_code")) {
        setError("This sign-in requires a verification method that is not available in this form.");
        return;
      }
      const sent = await signIn.emailCode.sendCode();
      if (sent.error) {
        setError(clerkErrorMessage(sent.error));
        return;
      }
      setSecondFactor(false);
      setVerificationMode("email");
      setError("");
      return;
    }

    if (signIn.status !== "needs_second_factor" && signIn.status !== "needs_client_trust") {
      setError("Your sign-in needs another step. Please try again or contact support.");
      return;
    }

    const factors = signIn.supportedSecondFactors;
    const strategy = ["email_code", "totp", "backup_code", "phone_code", "passkey"].find((item) =>
      factors.some((factor) => factor.strategy === item),
    );
    if (!strategy) {
      setError("No supported verification method is available for this sign-in.");
      return;
    }

    if (strategy === "email_code") {
      const sent = await signIn.mfa.sendEmailCode();
      if (sent.error) {
        setError(clerkErrorMessage(sent.error));
        return;
      }
    } else if (strategy === "phone_code") {
      const sent = await signIn.mfa.sendPhoneCode();
      if (sent.error) {
        setError(clerkErrorMessage(sent.error));
        return;
      }
    }

    setSecondFactor(true);
    setVerificationMode(
      strategy === "email_code" ? "email" :
        strategy === "totp" ? "totp" :
          strategy === "backup_code" ? "backup" :
            strategy === "phone_code" ? "phone" : "passkey",
    );
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || busy) return;
    setBusy(true);
    setError("");
    try {
      if (!verificationMode) {
        const result = await signIn.password({
          emailAddress: email.trim(),
          password,
        });
        if (result.error) {
          setError(clerkErrorMessage(result.error));
        } else if (signIn.status === "complete") {
          await completeSignIn();
        } else {
          await startRequiredVerification();
        }
        return;
      }

      if (verificationMode === "passkey") {
        const result = await signIn.mfa.passkey();
        if (result.error) setError(clerkErrorMessage(result.error));
        else if (signIn.status === "complete") await completeSignIn();
        return;
      }

      const result =
        verificationMode === "email"
          ? secondFactor
            ? await signIn.mfa.verifyEmailCode({ code: verificationCode.trim() })
            : await signIn.emailCode.verifyCode({ code: verificationCode.trim() })
          : verificationMode === "totp"
            ? await signIn.mfa.verifyTOTP({ code: verificationCode.trim() })
            : verificationMode === "backup"
              ? await signIn.mfa.verifyBackupCode({ code: verificationCode.trim() })
              : await signIn.mfa.verifyPhoneCode({ code: verificationCode.trim() });
      if (result.error) {
        setError(clerkErrorMessage(result.error));
      } else if (signIn.status === "complete") {
        await completeSignIn();
      } else {
        await startRequiredVerification();
      }
    } catch {
      setError("We couldn't complete sign in. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 className="text-3xl font-semibold tracking-[-0.035em] text-[#073c32] sm:text-4xl">Welcome back.</h2>
      <p className="mt-1.5 text-base text-[#64756d]">Pick up where you left off.</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        {!verificationMode ? (
          <>
            <div>
              <label htmlFor="sign-in-email" className="mb-1.5 block text-sm font-semibold text-[#273d34]">Email</label>
              <div className="relative">
                <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#87958d]" />
                <input id="sign-in-email" name="email" type="email" required maxLength={191} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-xl border border-[#d5dfd8] bg-white pl-12 pr-4 text-base outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="sign-in-password" className="block text-sm font-semibold text-[#273d34]">Password</label>
                <button type="button" onClick={onForgotPassword} className="text-sm font-medium text-[#17664e] underline underline-offset-2 hover:text-[#0f4537]">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#87958d]" />
                <input id="sign-in-password" name="password" type={showPassword ? "text" : "password"} required maxLength={128} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-12 w-full rounded-xl border border-[#d5dfd8] bg-white pl-12 pr-14 text-base outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md text-[#59675f] transition-colors hover:bg-[#f3f6f3] hover:text-[#18352d]" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div>
            <p className="text-sm leading-6 text-[#52645a]">
              {verificationMode === "email" ? "Enter the one-time code sent to your email." :
                verificationMode === "totp" ? "Enter the code from your authenticator app." :
                  verificationMode === "backup" ? "Enter one of your backup codes." :
                    verificationMode === "phone" ? "Enter the code sent to your phone." :
                      "Continue with your registered passkey."}
            </p>
            {verificationMode === "passkey" ? (
              <button type="submit" disabled={busy} className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl border border-[#145543] text-base font-semibold text-[#145543] disabled:opacity-60">
                Continue with passkey
              </button>
            ) : (
              <label htmlFor="sign-in-code" className="mt-3 block text-sm font-semibold text-[#273d34]">
                Verification code
                <input id="sign-in-code" name="code" type="text" required autoComplete="one-time-code" inputMode="numeric" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-[#d5dfd8] bg-white px-4 text-base tracking-[0.2em] outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
              </label>
            )}
            <button type="button" onClick={() => { setVerificationMode(null); setVerificationCode(""); }} className="mt-3 text-sm font-medium text-[#17664e] underline underline-offset-2 hover:text-[#0f4537]">
              Back to email and password
            </button>
          </div>
        )}
        {error && <p role="alert" className="rounded-xl border border-[#eadcb8] bg-[#fff9e9] px-4 py-3 text-sm leading-6 text-[#604c20]">{error}</p>}
        {verificationMode !== "passkey" && (
          <button type="submit" disabled={!isLoaded || busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#145543] px-5 text-base font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72] disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Please wait…" : verificationMode ? "Verify and continue" : "Sign in"} <span aria-hidden="true" className="text-xl">→</span>
          </button>
        )}
      </form>
      <div className="my-4 flex items-center gap-4 text-sm text-[#87958d]"><span className="h-px flex-1 bg-[#d5dfd8]" />or<span className="h-px flex-1 bg-[#d5dfd8]" /></div>
      <p className="mt-4 text-center text-sm text-[#64756d]">
        New to CareerBridge?{" "}
        <button type="button" onClick={onSwitch} className="font-medium text-[#17664e] underline underline-offset-2 hover:text-[#0f4537]">Create an account.</button>
      </p>
    </>
  );
}
