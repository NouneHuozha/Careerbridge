"use client";

import { UserButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount } from "../../../account-provider";

export function AdminAccountActions() {
  const account = useAccount();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!(await account.signOut())) {
        setError("We couldn't complete sign out. Please try again.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("We couldn't complete sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[#17364a]">Manage account details</p>
        <p className="mt-1 text-xs text-[#71817d]">Through the Clerk account provider</p>
      </div>
      <UserButton showName userProfileMode="modal" />
      <button
        type="button"
        disabled={busy}
        onClick={signOut}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dce5e0] bg-white px-3 text-sm font-semibold text-[#405a5e] transition-colors hover:bg-[#f7f9f7] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
      >
        <LogOut aria-hidden="true" className="size-4" />
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && (
        <p role="alert" className="basis-full text-sm font-medium text-[#8b5147]">
          {error}
        </p>
      )}
    </div>
  );
}
