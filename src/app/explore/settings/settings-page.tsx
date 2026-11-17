"use client";

import { useReverification, useUser } from "@clerk/nextjs";
import { isReverificationCancelledError } from "@clerk/nextjs/errors";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, LoaderCircle, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  accountSettingsErrorMessage,
  updateAccountPassword,
  verifyAndPromoteEmail,
} from "../../account-email-change";
import { useAccount } from "../../account-provider";
import { deleteCareerBridgeAccount } from "../../account-deletion";
import { saveEducationStage, useEducationStage } from "../../education-stage";
import type { EducationStage } from "../../education-stage";

type ClerkUser = NonNullable<ReturnType<typeof useUser>["user"]>;
type ClerkEmailAddress = Awaited<ReturnType<ClerkUser["createEmailAddress"]>>;

export default function SettingsPage() {
  const account = useAccount();
  const router = useRouter();
  const { isLoaded: clerkLoaded, user } = useUser();
  const education = useEducationStage();
  const createEmailAddress = useReverification((email: string) => {
    if (!user) throw new Error("No authenticated user is available.");
    return user.createEmailAddress({ email });
  });
  const prepareEmailAddressVerification = useReverification((address: ClerkEmailAddress) =>
    address.prepareVerification({ strategy: "email_code" }),
  );
  const attemptEmailAddressVerification = useReverification((
    address: ClerkEmailAddress,
    code: string,
  ) => address.attemptVerification({ code }));
  const promotePrimaryEmailAddress = useReverification((emailAddressId: string) => {
    if (!user) throw new Error("No authenticated user is available.");
    return user.update({ primaryEmailAddressId: emailAddressId });
  });
  const updatePasswordWithReverification = useReverification((
    newPassword: string,
    currentPassword: string,
  ) => {
    if (!user) throw new Error("No authenticated user is available.");
    return updateAccountPassword(user, newPassword, currentPassword);
  });
  const [pendingStage, setPendingStage] = useState<EducationStage | null>(null);
  const [stageMessage, setStageMessage] = useState("");
  const [stageError, setStageError] = useState("");
  const [stageBusy, setStageBusy] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<ClerkEmailAddress | null>(null);
  const [emailEditorOpen, setEmailEditorOpen] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordEditorOpen, setPasswordEditorOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const savedStage = education.status === "saved" ? education.stage : "";
  const selectedStage = pendingStage ?? savedStage;

  async function saveStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStage || stageBusy) return;
    setStageBusy(true);
    setStageError("");
    setStageMessage("");
    try {
      if (!saveEducationStage(selectedStage)) {
        setStageError("Your study stage couldn't be saved in this tab. Please try again.");
        return;
      }
      setPendingStage(null);
      if (await account.flushChanges()) {
        setStageMessage("Your study stage has been updated.");
      } else {
        setStageMessage("Your study stage is saved in this tab and will retry syncing when your connection is available.");
      }
    } catch {
      setStageMessage("Your study stage is saved in this tab, but account sync couldn't be confirmed. It will retry when your connection is available.");
    } finally {
      setStageBusy(false);
    }
  }

  async function sendEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || emailBusy) return;
    const email = newEmail.trim();
    if (email.toLowerCase() === user.primaryEmailAddress?.emailAddress.toLowerCase()) {
      setEmailError("That is already your primary email address.");
      return;
    }
    setEmailBusy(true);
    setEmailError("");
    setEmailMessage("");
    try {
      const address = await createEmailAddress(email);
      setPendingEmail(address);
      await prepareEmailAddressVerification(address);
      setEmailMessage("A verification code has been sent to the new email address.");
    } catch (error) {
      setEmailError(clerkError(error, "We couldn't send a verification code. Please try again."));
    } finally {
      setEmailBusy(false);
    }
  }

  async function resendEmailCode() {
    if (!pendingEmail || emailBusy) return;
    setEmailBusy(true);
    setEmailError("");
    setEmailMessage("");
    try {
      await prepareEmailAddressVerification(pendingEmail);
      setEmailMessage("A new verification code has been sent.");
    } catch (error) {
      setEmailError(clerkError(error, "We couldn't resend the verification code. Please try again."));
    } finally {
      setEmailBusy(false);
    }
  }

  async function cancelEmailChange() {
    if (emailBusy) return;
    if (!pendingEmail) {
      setEmailEditorOpen(false);
      setNewEmail("");
      setEmailCode("");
      setEmailMessage("");
      setEmailError("");
      return;
    }
    setEmailBusy(true);
    setEmailError("");
    setEmailMessage("");
    try {
      await pendingEmail.destroy();
      setPendingEmail(null);
      setEmailCode("");
      setNewEmail("");
      setEmailEditorOpen(false);
    } catch (error) {
      setEmailError(clerkError(error, "We couldn't cancel the pending email change. Please try again."));
    } finally {
      setEmailBusy(false);
    }
  }

  async function verifyEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !pendingEmail || emailBusy) return;
    setEmailBusy(true);
    setEmailError("");
    setEmailMessage("");
    try {
      if (!(await verifyAndPromoteEmail(
        pendingEmail,
        emailCode.trim(),
        attemptEmailAddressVerification,
        promotePrimaryEmailAddress,
        (verifiedAddress) => {
          setPendingEmail(verifiedAddress);
          setEmailCode("");
        },
      ))) {
        setEmailError("That code wasn't accepted. Check it or request another code.");
        return;
      }
      setPendingEmail(null);
      setEmailCode("");
      setNewEmail("");
      setEmailEditorOpen(false);
      setEmailMessage("Your primary email address has been updated.");
    } catch (error) {
      setEmailError(clerkError(error, "We couldn't verify that email address. Please try again."));
    } finally {
      setEmailBusy(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || passwordBusy) return;
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords don't match.");
      return;
    }
    setPasswordBusy(true);
    setPasswordError("");
    setPasswordMessage("");
    try {
      await updatePasswordWithReverification(newPassword, currentPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPasswordEditorOpen(false);
      setPasswordMessage("Your password has been updated.");
    } catch (error) {
      setPasswordError(clerkError(error, "We couldn't update your password. Check your current password and try again."));
    } finally {
      setPasswordBusy(false);
    }
  }

  function clerkError(error: unknown, fallback: string) {
    if (isReverificationCancelledError(error)) {
      return "Identity verification was cancelled. No changes were made.";
    }
    return accountSettingsErrorMessage(error, fallback);
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteBusy || deleteConfirmation !== "DELETE") return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      const result = await deleteCareerBridgeAccount(account, deleteConfirmation);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      router.replace("/explore");
    } finally {
      setDeleteBusy(false);
    }
  }

  if (account.status === "loading" || !clerkLoaded) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <p role="status" className="rounded-2xl border border-[#e3e9e4] bg-white p-6 text-sm text-[#52645a]">
          Loading your account settings…
        </p>
      </main>
    );
  }

  if (account.status !== "authenticated" || !user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-[#e3e9e4] bg-white p-6 sm:p-8">
          <h1 className="font-serif text-3xl font-semibold text-[#173f32]">Settings</h1>
          <p className="mt-3 text-sm leading-6 text-[#52645a]">
            {account.status === "guest"
              ? "Sign in to manage your account settings."
              : "Account settings are unavailable right now."}
          </p>
          {account.status === "guest" ? (
            <Link href="/sign-in" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#145543] px-5 text-sm font-semibold text-white hover:bg-[#0f4537]">
              Sign in
            </Link>
          ) : (
            <button type="button" onClick={() => void account.refresh()} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#145543] px-5 text-sm font-semibold text-white hover:bg-[#0f4537]">
              Retry
            </button>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-7">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#173f32]">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-[#59675f]">Manage your CareerBridge account and study stage.</p>
      </header>

      <div className="space-y-5">
        <section aria-labelledby="settings-account-title" className="rounded-2xl border border-[#e3e9e4] bg-white p-5 sm:p-7">
          <h2 id="settings-account-title" className="text-lg font-semibold text-[#18352d]">Account</h2>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#e7ece8] pb-5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#52645a]">Registered email</p>
              <p className="mt-1 break-all text-sm font-semibold text-[#18352d]">
                {user.primaryEmailAddress?.emailAddress ?? "No primary email is set"}
              </p>
            </div>
            {!emailEditorOpen && (
              <button
                type="button"
                onClick={() => {
                  setEmailError("");
                  setEmailMessage("");
                  setEmailEditorOpen(true);
                }}
                className="inline-flex min-h-10 items-center rounded-full border border-[#d5dfd8] px-4 text-sm font-semibold text-[#145543] hover:bg-[#f3f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Change email
              </button>
            )}
          </div>
          {emailEditorOpen && (
            <div className="pt-5">
              <h3 className="text-sm font-semibold text-[#18352d]">Change email</h3>
            {pendingEmail ? (
              <form onSubmit={verifyEmailCode} className="mt-3 max-w-lg space-y-3">
                <p className="text-sm leading-6 text-[#59675f]">
                  {pendingEmail.verification?.status === "verified"
                    ? <>This address is verified. Make <strong className="break-all">{pendingEmail.emailAddress}</strong> your primary email to finish.</>
                    : <>Enter the code sent to <strong className="break-all">{pendingEmail.emailAddress}</strong>.</>}
                </p>
                <label htmlFor="settings-email-code" className="block text-sm font-medium text-[#273d34]">
                  Verification code
                  <input id="settings-email-code" type="text" required={pendingEmail.verification?.status !== "verified"} disabled={pendingEmail.verification?.status === "verified"} autoComplete="one-time-code" inputMode="numeric" value={emailCode} onChange={(event) => setEmailCode(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d5dfd8] px-3 text-base tracking-[0.2em] outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7] disabled:bg-[#f4f6f4]" />
                </label>
                <div className="flex flex-wrap gap-3">
                  <button type="submit" disabled={emailBusy} className="inline-flex min-h-11 items-center rounded-full bg-[#145543] px-5 text-sm font-semibold text-white hover:bg-[#0f4537] disabled:opacity-60">
                    {emailBusy
                      ? <><LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />{pendingEmail.verification?.status === "verified" ? "Updating email…" : "Verifying…"}</>
                      : pendingEmail.verification?.status === "verified" ? "Make primary email" : "Verify email"}
                  </button>
                  {pendingEmail.verification?.status !== "verified" && (
                    <button type="button" disabled={emailBusy} onClick={() => void resendEmailCode()} className="inline-flex min-h-11 items-center rounded-full border border-[#d5dfd8] px-5 text-sm font-semibold text-[#145543] hover:bg-[#f3f7f3] disabled:opacity-60">
                      Resend code
                    </button>
                  )}
                  <button type="button" disabled={emailBusy} onClick={() => void cancelEmailChange()} className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-[#52645a] underline underline-offset-2 disabled:opacity-60">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={sendEmailCode} className="mt-3 flex max-w-lg flex-col gap-3 sm:flex-row">
                <label htmlFor="settings-new-email" className="sr-only">New email address</label>
                <input id="settings-new-email" type="email" required maxLength={191} autoComplete="email" placeholder="New email address" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#d5dfd8] px-3 text-base outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
                <button type="submit" disabled={emailBusy} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#145543] px-5 text-sm font-semibold text-white hover:bg-[#0f4537] disabled:opacity-60">
                  {emailBusy ? <><LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />Sending code…</> : "Verify new email"}
                </button>
                <button type="button" disabled={emailBusy} onClick={() => void cancelEmailChange()} className="inline-flex min-h-11 items-center justify-center rounded-full px-3 text-sm font-medium text-[#52645a] underline underline-offset-2 disabled:opacity-60">
                  Cancel
                </button>
              </form>
            )}
            </div>
          )}
          {emailMessage && (
            <p role="status" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#edf7f3] px-3 py-2 text-sm text-[#315345]">
              {emailMessage === "Your primary email address has been updated." && (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
              )}
              {emailMessage}
            </p>
          )}
          {emailError && <p role="alert" className="mt-3 text-sm text-[#8b3529]">{emailError}</p>}
          <div className="mt-6 border-t border-[#e7ece8] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#18352d]">Change password</h3>
              {!passwordEditorOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setPasswordError("");
                    setPasswordMessage("");
                    setPasswordEditorOpen(true);
                  }}
                  className="inline-flex min-h-10 items-center rounded-full border border-[#d5dfd8] px-4 text-sm font-semibold text-[#145543] hover:bg-[#f3f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  Change password
                </button>
              )}
            </div>
            {passwordEditorOpen && <form onSubmit={updatePassword} className="mt-3 grid max-w-lg gap-3">
              <label className="block text-sm font-medium text-[#273d34]">
                Current password <span className="font-normal text-[#718078]">(if already set)</span>
                <div className="relative mt-1.5">
                  <input type={showCurrentPassword ? "text" : "password"} maxLength={128} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#d5dfd8] px-3 pr-12 text-base outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
                  <button type="button" aria-label={showCurrentPassword ? "Hide current password" : "Show current password"} aria-pressed={showCurrentPassword} onClick={() => setShowCurrentPassword((visible) => !visible)} className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-[#59675f] hover:bg-[#f3f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
                    {showCurrentPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                  </button>
                </div>
              </label>
              <label className="block text-sm font-medium text-[#273d34]">
                New password
                <div className="relative mt-1.5">
                  <input type={showNewPassword ? "text" : "password"} required minLength={8} maxLength={128} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#d5dfd8] px-3 pr-12 text-base outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
                  <button type="button" aria-label={showNewPassword ? "Hide new password" : "Show new password"} aria-pressed={showNewPassword} onClick={() => setShowNewPassword((visible) => !visible)} className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-[#59675f] hover:bg-[#f3f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
                    {showNewPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                  </button>
                </div>
              </label>
              <label className="block text-sm font-medium text-[#273d34]">
                Confirm new password
                <div className="relative mt-1.5">
                  <input type={showConfirmPassword ? "text" : "password"} required minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#d5dfd8] px-3 pr-12 text-base outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
                  <button type="button" aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((visible) => !visible)} className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-[#59675f] hover:bg-[#f3f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
                    {showConfirmPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                  </button>
                </div>
              </label>
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={passwordBusy} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#145543] px-5 text-sm font-semibold text-white hover:bg-[#0f4537] disabled:opacity-60">
                  {passwordBusy ? <><LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />Updating password…</> : "Update password"}
                </button>
                <button type="button" disabled={passwordBusy} onClick={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError("");
                  setPasswordMessage("");
                  setShowCurrentPassword(false);
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                  setPasswordEditorOpen(false);
                }} className="inline-flex min-h-11 items-center justify-center rounded-full px-3 text-sm font-medium text-[#52645a] underline underline-offset-2 disabled:opacity-60">
                  Cancel
                </button>
              </div>
            </form>}
            {passwordMessage && <p role="status" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#edf7f3] px-3 py-2 text-sm text-[#315345]"><CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />{passwordMessage}</p>}
            {passwordError && <p role="alert" className="mt-3 text-sm text-[#8b3529]">{passwordError}</p>}
          </div>
        </section>

        <section aria-labelledby="settings-education-title" className="rounded-2xl border border-[#e3e9e4] bg-white p-5 sm:p-7">
          <h2 id="settings-education-title" className="text-lg font-semibold text-[#18352d]">Education</h2>
          {education.status === "loading" ? (
            <p role="status" className="mt-3 text-sm text-[#59675f]">Loading your saved study stage…</p>
          ) : education.status === "unavailable" || education.status === "invalid" ? (
            <div className="mt-3">
              <p role="alert" className="text-sm text-[#8b3529]">Your study stage couldn&apos;t be loaded.</p>
              <button type="button" onClick={() => void account.refresh()} className="mt-3 text-sm font-semibold text-[#145543] underline underline-offset-2">Reload account data</button>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm leading-6 text-[#59675f]">
                Your stage is used across Discover and Explore. You can update it here at any time.
              </p>
              <form onSubmit={saveStage} className="mt-4 flex max-w-lg flex-col gap-3 sm:flex-row sm:items-end">
                <label htmlFor="settings-education-stage" className="block flex-1 text-sm font-medium text-[#273d34]">
                  Current study stage
                  <select
                    id="settings-education-stage"
                    required
                    value={selectedStage}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "class-10" || value === "class-12") setPendingStage(value);
                    }}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d5dfd8] bg-white px-3 text-base outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]"
                  >
                    <option value="" disabled>Select your stage</option>
                    <option value="class-10">Class 10</option>
                    <option value="class-12">Class 12</option>
                  </select>
                </label>
                <button type="submit" disabled={!selectedStage || selectedStage === savedStage || stageBusy} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#145543] px-5 text-sm font-semibold text-white hover:bg-[#0f4537] disabled:cursor-not-allowed disabled:opacity-50">
                  {stageBusy ? "Saving…" : "Save stage"}
                </button>
              </form>
              {stageMessage && <p role="status" className="mt-3 text-sm text-[#315345]">{stageMessage}</p>}
              {stageError && <p role="alert" className="mt-3 text-sm text-[#8b3529]">{stageError}</p>}
              {account.syncError && (
                <p role="status" className="mt-3 text-sm text-[#8b5a1f]">
                  {account.syncError}{" "}
                  <button type="button" onClick={account.retrySync} className="font-semibold underline underline-offset-2">
                    Retry sync
                  </button>
                </p>
              )}
            </>
          )}
        </section>

        <section aria-labelledby="settings-delete-title" className="rounded-2xl border border-[#eadbd8] bg-white p-5 sm:p-7">
          <h2 id="settings-delete-title" className="text-lg font-semibold text-[#8b3529]">Delete account</h2>
          <p className="mt-2 text-sm leading-6 text-[#59675f]">
            Permanently delete your account, saved items, exploration history and account progress. This cannot be undone.
          </p>
          <form onSubmit={deleteAccount} className="mt-4 max-w-lg space-y-3">
            <label htmlFor="settings-delete-confirmation" className="block text-sm font-medium text-[#273d34]">
              Type DELETE to confirm
              <input
                id="settings-delete-confirmation"
                type="text"
                required
                maxLength={6}
                autoComplete="off"
                spellCheck={false}
                value={deleteConfirmation}
                onChange={(event) => {
                  setDeleteConfirmation(event.target.value);
                  setDeleteError("");
                }}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d5dfd8] px-3 text-base outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]"
              />
            </label>
            {deleteError && <p role="alert" className="text-sm text-[#8b3529]">{deleteError}</p>}
            <button type="submit" disabled={deleteBusy || deleteConfirmation !== "DELETE"} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#9b5148] px-5 text-sm font-semibold text-white hover:bg-[#843d35] disabled:cursor-not-allowed disabled:opacity-50">
              {deleteBusy ? <><LoaderCircle aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />Deleting account…</> : <><Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />Delete account</>}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
