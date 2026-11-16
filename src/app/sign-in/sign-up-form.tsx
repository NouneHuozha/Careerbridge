"use client";

import { useSignUp, useAuth } from "@clerk/nextjs";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAccount } from "../account-provider";

type AgeAttestation = "adult" | "minor-guardian" | "";
type SignUpStage = "credentials" | "verify-email";

function clerkErrorMessage(error: { longMessage?: string | null; message?: string } | null) {
  return error?.longMessage ?? error?.message ?? "We couldn't complete account creation. Please try again.";
}

function responseError(value: unknown, fallback: string) {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}

export default function SignUpForm({
  next,
  onSwitch,
}: {
  next: string;
  onSwitch: () => void;
}) {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { signUp } = useSignUp();
  const account = useAccount();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [ageAttestation, setAgeAttestation] = useState<AgeAttestation>("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [stage, setStage] = useState<SignUpStage>("credentials");
  const [setupRequired, setSetupRequired] = useState(false);
  const [deletionPending, setDeletionPending] = useState(false);
  const [deletionBlocked, setDeletionBlocked] = useState(false);
  const [deletionPassword, setDeletionPassword] = useState("");
  const [deletionConfirmation, setDeletionConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const checkedSession = useRef(false);
  const startedSignUp = useRef(false);

  useEffect(() => {
    if (!authLoaded || !isSignedIn || checkedSession.current || startedSignUp.current) return;
    checkedSession.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        let result: unknown = null;
        try {
          result = await response.json();
        } catch {
          result = null;
        }
        if (response.status === 409 && typeof result === "object" && result !== null) {
          if ("deletionPending" in result && result.deletionPending === true) {
            setDeletionPending(true);
            setError(responseError(result, "Account deletion is incomplete. Retry to finish removing your account."));
            return;
          }
          if ("provisioningRequired" in result && result.provisioningRequired === true) {
            setSetupRequired(true);
            return;
          }
        }
        if (response.ok) {
          await account.refresh();
          router.replace(next);
          return;
        }
        setError(responseError(result, "Your CareerBridge account could not be loaded."));
      } catch {
        setError("We couldn't check your account setup. Please try again.");
      }
    })();
  }, [account, authLoaded, isSignedIn, next, router]);

  async function provisionAccount() {
    if (!privacyAccepted || !ageAttestation) {
      setError("Please accept the Privacy Notice and confirm age information.");
      return;
    }

    const response = await fetch("/api/auth/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privacyAccepted, ageAttestation }),
    });
    let result: unknown = null;
    try {
      result = await response.json();
    } catch {
      result = null;
    }
    if (!response.ok) {
      if (typeof result === "object" && result !== null && "deletionPending" in result && result.deletionPending === true) {
        setDeletionPending(true);
      } else {
        setSetupRequired(true);
      }
      setError(responseError(result, "CareerBridge could not finish setting up your account. Retry setup."));
      return;
    }

    await account.refresh();
    router.push(next);
  }

  async function retryAccountDeletion() {
    if (!deletionPassword || deletionConfirmation !== "DELETE") {
      setError("Enter your password and type DELETE to retry account deletion.");
      return;
    }

    const response = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletionPassword, confirmation: deletionConfirmation }),
    });
    let result: unknown = null;
    try {
      result = await response.json();
    } catch {
      result = null;
    }
    if (!response.ok) {
      if (typeof result === "object" && result !== null && "deletionBlocked" in result && result.deletionBlocked === true) {
        setDeletionPending(false);
        setDeletionBlocked(true);
      }
      setError(responseError(result, "Account deletion is incomplete. Retry to finish removing your account."));
      return;
    }

    if (!(await account.finishAccountDeletion())) {
      setError("Your account was removed, but this tab could not clear its sign-in state. Close all CareerBridge tabs.");
      return;
    }
    router.replace("/explore");
  }

  async function resendVerificationCode() {
    setBusy(true);
    setError("");
    try {
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) setError(clerkErrorMessage(sent.error));
      else setError("A new verification code was sent.");
    } catch {
      setError("We couldn't resend the verification code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authLoaded || busy) return;
    setBusy(true);
    setError("");
    try {
      if (deletionPending) {
        await retryAccountDeletion();
        return;
      }
      if (setupRequired) {
        await provisionAccount();
        return;
      }

      if (stage === "credentials") {
        if (password !== confirm) {
          setError("Both passwords need to match.");
          return;
        }
        const created = await signUp.password({
          emailAddress: email.trim(),
          password,
          firstName: fullName.trim(),
        });
        if (created.error) {
          setError(clerkErrorMessage(created.error));
          return;
        }
        const sent = await signUp.verifications.sendEmailCode();
        if (sent.error) {
          setError(clerkErrorMessage(sent.error));
          return;
        }
        setStage("verify-email");
        return;
      }

      const verified = await signUp.verifications.verifyEmailCode({ code: verificationCode.trim() });
      if (verified.error) {
        setError(clerkErrorMessage(verified.error));
        return;
      }
      if (signUp.status !== "complete") {
        setError("Clerk requires additional account details. Check the sign-up settings and try again.");
        return;
      }

      startedSignUp.current = true;
      const finalized = await signUp.finalize();
      if (finalized.error) {
        startedSignUp.current = false;
        setError(clerkErrorMessage(finalized.error));
        return;
      }
      setSetupRequired(true);
      await provisionAccount();
    } catch {
      setError(deletionPending
        ? "Account deletion is incomplete. Check your connection and retry."
        : "We couldn't complete account creation. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 className="text-3xl font-semibold tracking-[-0.035em] text-[#073c32] sm:text-4xl">
        {deletionBlocked
          ? "Account deletion needs support."
          : deletionPending
            ? "Finish deleting your account."
            : setupRequired
              ? "Finish your account setup."
              : "Create your account."}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-[#64756d]">
        {deletionBlocked
          ? "Your account is still active. Contact support to resolve the retained CareerBridge records."
          : deletionPending
            ? "Account removal was interrupted. Re-enter your password and retry to finish removing your CareerBridge data and Clerk sign-in."
            : setupRequired
              ? "Your verified Clerk account still needs a CareerBridge profile."
              : "Save your answers, possibilities and next steps in one place."}
      </p>
      <form onSubmit={submit} className="mt-4 space-y-2.5">
        {!deletionPending && !deletionBlocked && !setupRequired && stage === "credentials" && (
          <>
            <div>
              <label htmlFor="sign-up-name" className="mb-1 block text-sm font-semibold text-[#273d34]">First name</label>
              <div className="relative">
                <UserRound aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#87958d]" />
                <input id="sign-up-name" name="fullName" type="text" required maxLength={120} autoComplete="given-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Enter your first name" className="h-11 w-full rounded-xl border border-[#d5dfd8] bg-white pl-12 pr-4 text-base outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
              </div>
            </div>
            <div>
              <label htmlFor="sign-up-email" className="mb-1 block text-sm font-semibold text-[#273d34]">Email</label>
              <div className="relative">
                <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#87958d]" />
                <input id="sign-up-email" name="email" type="email" required maxLength={191} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" className="h-11 w-full rounded-xl border border-[#d5dfd8] bg-white pl-12 pr-4 text-base outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
              </div>
            </div>
            <div>
              <label htmlFor="sign-up-password" className="mb-1 block text-sm font-semibold text-[#273d34]">Password</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#87958d]" />
                <input id="sign-up-password" name="password" type={showPassword ? "text" : "password"} required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a password" className="h-11 w-full rounded-xl border border-[#d5dfd8] bg-white pl-12 pr-14 text-base outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md text-[#59675f] transition-colors hover:bg-[#f3f6f3] hover:text-[#18352d]" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-[#64756d]">At least 8 characters.</p>
            </div>
            <div>
              <label htmlFor="sign-up-confirm" className="mb-1 block text-sm font-semibold text-[#273d34]">Confirm password</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#87958d]" />
                <input id="sign-up-confirm" name="confirm" type={showConfirm ? "text" : "password"} required minLength={8} maxLength={128} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Confirm your password" className="h-11 w-full rounded-xl border border-[#d5dfd8] bg-white pl-12 pr-14 text-base outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
                <button type="button" aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"} title={showConfirm ? "Hide confirmation password" : "Show confirmation password"} aria-pressed={showConfirm} className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md text-[#59675f] transition-colors hover:bg-[#f3f6f3] hover:text-[#18352d]" onClick={() => setShowConfirm((value) => !value)}>
                  {showConfirm ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </>
        )}
        {!deletionPending && !deletionBlocked && !setupRequired && stage === "verify-email" && (
          <>
            <p className="text-sm leading-6 text-[#52645a]">
              Enter the verification code sent to <span className="font-semibold">{email}</span>.
            </p>
            <label htmlFor="sign-up-code" className="block text-sm font-semibold text-[#273d34]">
              Email verification code
              <input id="sign-up-code" name="code" type="text" required autoComplete="one-time-code" inputMode="numeric" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#d5dfd8] bg-white px-4 text-base tracking-[0.2em] outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
            </label>
            <button type="button" disabled={busy} onClick={() => void resendVerificationCode()} className="text-sm font-medium text-[#17664e] underline underline-offset-2 hover:text-[#0f4537] disabled:opacity-60">
              Resend code
            </button>
          </>
        )}
        {deletionPending && (
          <>
            <label className="block text-sm font-semibold text-[#273d34]">
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                maxLength={128}
                value={deletionPassword}
                onChange={(event) => setDeletionPassword(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-[#d5dfd8] bg-white px-4 text-base outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]"
              />
            </label>
            <label className="block text-sm font-semibold text-[#273d34]">
              Type DELETE to confirm
              <input
                type="text"
                required
                autoComplete="off"
                value={deletionConfirmation}
                onChange={(event) => setDeletionConfirmation(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-[#d5dfd8] bg-white px-4 text-base outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]"
              />
            </label>
          </>
        )}
        {setupRequired && !deletionPending && !deletionBlocked && (
          <p className="rounded-xl bg-[#f3f7f3] px-4 py-3 text-sm leading-6 text-[#52645a]">
            Your Clerk sign-in is active, but account provisioning has not completed. Retry setup to securely create or finish your CareerBridge profile.
          </p>
        )}
        {!deletionPending && !deletionBlocked && <fieldset className="space-y-2 border-t border-[#e7ece8] pt-3">
          <legend className="text-sm font-semibold text-[#273d34]">Age and guardian review</legend>
          <label className="flex items-start gap-2.5 text-xs leading-5 text-[#52645a]">
            <input className="mt-1 accent-[#145543]" type="radio" name="ageAttestation" value="adult" required checked={ageAttestation === "adult"} onChange={() => setAgeAttestation("adult")} />
            <span>I am 18 or older.</span>
          </label>
          <label className="flex items-start gap-2.5 text-xs leading-5 text-[#52645a]">
            <input className="mt-1 accent-[#145543]" type="radio" name="ageAttestation" value="minor-guardian" required checked={ageAttestation === "minor-guardian"} onChange={() => setAgeAttestation("minor-guardian")} />
            <span>I am under 18 and my parent or guardian has reviewed the Privacy Notice and agrees to this account.</span>
          </label>
          <p className="text-xs leading-5 text-[#735b23]">
            Guardian approval is self-reported and is not independently verified by CareerBridge.
          </p>
        </fieldset>}
        {!deletionPending && !deletionBlocked && <label className="flex items-start gap-2.5 text-xs leading-5 text-[#52645a]">
          <input className="mt-1 accent-[#145543]" type="checkbox" name="privacyAccepted" value="yes" required checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} />
          <span>
            I have read and agree to the{" "}
            <Link href="/privacy" target="_blank" className="font-semibold text-[#145543] underline underline-offset-2">
              Privacy Notice
            </Link>
            .
          </span>
        </label>}
        {error && <p role="alert" className="rounded-xl border border-[#eadcb8] bg-[#fff9e9] px-4 py-3 text-sm leading-6 text-[#604c20]">{error}</p>}
        {(!deletionBlocked) && (
          <button type="submit" disabled={!authLoaded || busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#145543] px-5 text-base font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72] disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Please wait…" : deletionPending ? "Retry account deletion" : setupRequired ? "Complete account setup" : stage === "verify-email" ? "Verify and create account" : "Create my account"} <span aria-hidden="true" className="text-xl">→</span>
          </button>
        )}
        {deletionBlocked && (
          <Link href="/explore" className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#d5dfd8] px-5 text-base font-semibold text-[#145543]">
            Return to CareerBridge
          </Link>
        )}
      </form>
      {!deletionPending && !deletionBlocked && (
        <>
          <div className="my-3 flex items-center gap-3 text-sm text-[#87958d]"><span className="h-px flex-1 bg-[#d5dfd8]" />or<span className="h-px flex-1 bg-[#d5dfd8]" /></div>
          <p className="mt-3 text-center text-sm text-[#64756d]">
            Already have an account?{" "}
            <button type="button" onClick={onSwitch} className="font-medium text-[#17664e] underline underline-offset-2 hover:text-[#0f4537]">Sign in</button>
          </p>
        </>
      )}
    </>
  );
}
