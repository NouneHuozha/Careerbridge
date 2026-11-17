"use client";

import { useAuth, useSignIn } from "@clerk/nextjs";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  requestPasswordRecoveryCode,
  passwordRecoveryErrorMessage,
  resendPasswordRecoveryCode,
  restartPasswordRecoveryCode,
  submitRecoveredPassword,
  verifyPasswordRecoveryCode,
} from "../password-recovery";

type RecoveryStep = "email" | "code" | "password" | "success";

export default function PasswordRecoveryForm({ onReturn }: { onReturn: () => void }) {
  const { isLoaded } = useAuth();
  const { signIn } = useSignIn();
  const [step, setStep] = useState<RecoveryStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await requestPasswordRecoveryCode(signIn, email.trim());
      if (result === "failed") {
        setError("We couldn't send a reset code. Please wait a moment and try again.");
        return;
      }
      setStep("code");
      setNotice("If an account exists for this email, a verification code has been sent.");
    } catch {
      setError("We couldn't send a reset code. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    if (!isLoaded || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await resendPasswordRecoveryCode(signIn);
      if (result === "failed") {
        setError("We couldn't resend the code. Please wait a moment and try again.");
        return;
      }
      setCode("");
      setNotice("If an account exists for this email, a new verification code has been sent.");
    } catch {
      setError("We couldn't resend the code. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await verifyPasswordRecoveryCode(signIn, code.trim());
      if (!result.ok) {
        setError(passwordRecoveryErrorMessage(
          result.error,
          "code",
          "That code couldn't be verified. Check it or request another code.",
          result.status,
        ));
        return;
      }
      setStep("password");
    } catch (error) {
      setError(passwordRecoveryErrorMessage(
        error,
        "code",
        "We couldn't verify that code. Check your connection and try again.",
        signIn.status,
      ));
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || busy) return;
    if (password !== confirmation) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await submitRecoveredPassword(signIn, password);
      if (!result.ok) {
        setError(passwordRecoveryErrorMessage(
          result.error,
          "password",
          "Clerk couldn't complete the password reset. Try again or request a new code.",
          result.status,
        ));
        return;
      }
      setPassword("");
      setConfirmation("");
      setShowPassword(false);
      setShowConfirmation(false);
      setStep("success");
      setNotice("");
    } catch (error) {
      setError(passwordRecoveryErrorMessage(
        error,
        "password",
        "We couldn't update your password. Check your connection and try again.",
        signIn.status,
      ));
    } finally {
      setBusy(false);
    }
  }

  async function restartWithNewCode() {
    if (!isLoaded || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await restartPasswordRecoveryCode(signIn, email.trim(), () => {
        setCode("");
        setPassword("");
        setConfirmation("");
        setShowPassword(false);
        setShowConfirmation(false);
        setStep("email");
      });
      if (result === "failed") {
        setError("We couldn't send a new reset code. Please wait a moment and try again.");
        return;
      }
      setStep("code");
      setNotice("If an account exists for this email, a new verification code has been sent.");
    } catch {
      setError("We couldn't send a new reset code. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function returnToSignIn() {
    if (busy) return;
    setError("");
    try {
      const result = await signIn.reset();
      if (result.error) {
        setError(step === "success"
          ? "Your password was changed, but we couldn't reset the sign-in form. Please try again."
          : "We couldn't safely leave password recovery. Please try again.");
        return;
      }
      onReturn();
    } catch {
      setError(step === "success"
        ? "Your password was changed, but we couldn't reset the sign-in form. Please try again."
        : "We couldn't safely leave password recovery. Please try again.");
    }
  }

  async function changeEmail() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await signIn.reset();
      if (result.error) {
        setError("We couldn't restart password recovery. Please try again.");
        return;
      }
      setCode("");
      setPassword("");
      setConfirmation("");
      setNotice("");
      setStep("email");
    } catch {
      setError("We couldn't restart password recovery. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="password-recovery-title">
      {step === "success" ? (
        <>
          <h2 id="password-recovery-title" className="text-3xl font-semibold tracking-[-0.035em] text-[#073c32] sm:text-4xl">
            Password updated.
          </h2>
          <p className="mt-2 text-base leading-6 text-[#64756d]">
            Your password has been reset. You can now sign in with your new password.
          </p>
          {error && <p role="alert" className="mt-4 rounded-xl border border-[#eadcb8] bg-[#fff9e9] px-4 py-3 text-sm leading-6 text-[#604c20]">{error}</p>}
          <button type="button" disabled={!isLoaded || busy} onClick={() => void returnToSignIn()} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#145543] px-5 text-base font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72] disabled:cursor-not-allowed disabled:opacity-60">
            Return to sign in
          </button>
        </>
      ) : (
        <>
          <h2 id="password-recovery-title" className="text-3xl font-semibold tracking-[-0.035em] text-[#073c32] sm:text-4xl">
            Reset your password.
          </h2>
          <p className="mt-2 text-base leading-6 text-[#64756d]">
            {step === "email" && "Enter the email address associated with your account."}
            {step === "code" && "Enter the verification code sent to your email."}
            {step === "password" && "Choose a new password for your account."}
          </p>

          {step === "email" && (
            <form onSubmit={submitEmail} className="mt-6 space-y-4">
              <label htmlFor="recovery-email" className="block text-sm font-semibold text-[#273d34]">
                Email
                <input id="recovery-email" name="email" type="email" required maxLength={191} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-1.5 h-12 w-full rounded-xl border border-[#d5dfd8] bg-white px-4 text-base outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
              </label>
              <button type="submit" disabled={!isLoaded || busy} className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#145543] px-5 text-base font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72] disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? "Sending code…" : "Send verification code"}
              </button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={submitCode} className="mt-6 space-y-4">
              <label htmlFor="recovery-code" className="block text-sm font-semibold text-[#273d34]">
                Verification code
                <input id="recovery-code" name="code" type="text" required autoComplete="one-time-code" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-[#d5dfd8] bg-white px-4 text-base tracking-[0.2em] outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
              </label>
              <button type="submit" disabled={!isLoaded || busy} className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#145543] px-5 text-base font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72] disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? "Verifying…" : "Verify code"}
              </button>
              <div className="flex flex-wrap justify-between gap-3 text-sm">
                <button type="button" disabled={busy} onClick={() => void resendCode()} className="font-medium text-[#17664e] underline underline-offset-2 hover:text-[#0f4537] disabled:opacity-60">
                  Resend code
                </button>
                <button type="button" disabled={busy} onClick={() => void changeEmail()} className="font-medium text-[#52645a] underline underline-offset-2 hover:text-[#18352d] disabled:opacity-60">
                  Use a different email
                </button>
              </div>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={submitPassword} className="mt-6 space-y-4">
              <label htmlFor="recovery-password" className="block text-sm font-semibold text-[#273d34]">
                New password
                <div className="relative mt-1.5">
                  <input id="recovery-password" name="password" type={showPassword ? "text" : "password"} required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-[#d5dfd8] bg-white px-4 pr-14 text-base outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
                  <button type="button" aria-label={showPassword ? "Hide new password" : "Show new password"} title={showPassword ? "Hide new password" : "Show new password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-[#59675f] hover:bg-[#f3f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
                    {showPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                  </button>
                </div>
              </label>
              <label htmlFor="recovery-confirm-password" className="block text-sm font-semibold text-[#273d34]">
                Confirm new password
                <div className="relative mt-1.5">
                  <input id="recovery-confirm-password" name="confirm-password" type={showConfirmation ? "text" : "password"} required minLength={8} maxLength={128} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-12 w-full rounded-xl border border-[#d5dfd8] bg-white px-4 pr-14 text-base outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
                  <button type="button" aria-label={showConfirmation ? "Hide password confirmation" : "Show password confirmation"} title={showConfirmation ? "Hide password confirmation" : "Show password confirmation"} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((visible) => !visible)} className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-[#59675f] hover:bg-[#f3f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
                    {showConfirmation ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                  </button>
                </div>
              </label>
              <button type="submit" disabled={!isLoaded || busy} className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#145543] px-5 text-base font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72] disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? "Updating password…" : "Update password"}
              </button>
              <button type="button" disabled={!isLoaded || busy} onClick={() => void restartWithNewCode()} className="w-full text-center text-sm font-medium text-[#17664e] underline underline-offset-2 hover:text-[#0f4537] disabled:opacity-60">
                Code expired? Request a new one
              </button>
            </form>
          )}

          {notice && <p role="status" className="mt-4 rounded-xl bg-[#edf7f3] px-4 py-3 text-sm leading-6 text-[#315345]">{notice}</p>}
          {error && <p role="alert" className="mt-4 rounded-xl border border-[#eadcb8] bg-[#fff9e9] px-4 py-3 text-sm leading-6 text-[#604c20]">{error}</p>}
        </>
      )}

      {step !== "success" && (
        <button type="button" disabled={busy} onClick={() => void returnToSignIn()} className="mt-5 w-full text-center text-sm font-medium text-[#17664e] underline underline-offset-2 hover:text-[#0f4537] disabled:opacity-60">
          Back to sign in
        </button>
      )}
    </section>
  );
}
