"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useAccount } from "../account-provider";
import { setPendingSave } from "../account-data-sync";
import {
  addSavedItem,
  removeSavedItem,
  savedItemKey,
  useSavedItems,
  type SavedItemContext,
  type SavedItemType,
} from "./saved-items";

const itemLabels: Record<SavedItemType, string> = {
  field: "field",
  course: "course",
  institution: "institution",
  "institution-offering": "course-specific institution option",
  pathway: "pathway",
  examination: "examination",
  scholarship: "scholarship",
};

export function SavedItemButton({
  type,
  id,
  context,
  className = "",
  saveLabel = "Save",
}: {
  type: SavedItemType;
  id: string;
  context?: SavedItemContext;
  className?: string;
  saveLabel?: string;
}) {
  const account = useAccount();
  const router = useRouter();
  const saved = useSavedItems();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogId = useId();
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptError, setPromptError] = useState("");
  const item = { type, id, context };
  const isSaved =
    saved.status === "saved" &&
    saved.items.some((entry) => savedItemKey(entry) === savedItemKey(item));
  const unavailable =
    saved.status === "unavailable" ||
    saved.status === "invalid" ||
    account.status === "unavailable";
  const label = itemLabels[type];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (promptOpen && !dialog.open) dialog.showModal();
    else if (!promptOpen && dialog.open) dialog.close();
  }, [promptOpen]);

  function toggle() {
    if (isSaved) {
      removeSavedItem(item);
    } else if (account.status === "authenticated") {
      addSavedItem(item);
    } else {
      setPromptError("");
      setPromptOpen(true);
    }
  }

  function continueToAuth(mode: "sign-in" | "sign-up") {
    const returnPath = `${window.location.pathname}${window.location.search}`;
    try {
      setPendingSave(item, returnPath);
      router.push(`/${mode}?next=${encodeURIComponent(returnPath)}`);
    } catch {
      setPromptError("We couldn't save your pending request in this tab. Check browser storage and try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={isSaved ? `Remove ${label} from Saved` : `Save ${label}`}
        aria-pressed={isSaved}
        disabled={saved.status === "loading" || unavailable || account.status === "loading"}
        title={unavailable ? "Account or saved-item storage is unavailable" : undefined}
        onClick={toggle}
        className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#cbd9cf] bg-white px-3 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <Bookmark
          aria-hidden="true"
          className={`h-4 w-4 ${isSaved ? "text-[#f3cf72]" : "text-[#94752d]"}`}
          fill={isSaved ? "currentColor" : "none"}
        />
        {isSaved ? "Saved" : saveLabel}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${dialogId}-title`}
        aria-describedby={`${dialogId}-description`}
        onCancel={(event) => {
          event.preventDefault();
          setPromptOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setPromptOpen(false);
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-[#dce7df] bg-white p-0 text-[#18352d] shadow-[0_24px_80px_rgba(16,45,36,0.3)] backdrop:bg-[#102d26]/50 backdrop:backdrop-blur-sm"
      >
        <div className="p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#52715f]">Account required</p>
          <h2 id={`${dialogId}-title`} className="mt-2 font-serif text-2xl font-semibold">
            Save this {label}
          </h2>
          <p id={`${dialogId}-description`} className="mt-2 text-sm leading-6 text-[#59665e]">
            Create an account or sign in to save this {label} and find it again whenever you return.
          </p>
          <div className="mt-5 rounded-2xl bg-[#f3f7f3] p-4">
            <p className="text-sm font-semibold text-[#29483a]">With an account</p>
            <p className="mt-1 text-sm leading-5 text-[#59665e]">
              Your saved items stay with your account and are available whenever you sign in.
            </p>
          </div>
          {promptError && <p role="alert" className="mt-4 text-sm text-[#8b3529]">{promptError}</p>}
          <div className="mt-6 grid gap-2">
            <button
              type="button"
              onClick={() => continueToAuth("sign-up")}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#145543] px-5 text-sm font-semibold text-white hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Create free account
            </button>
            <button
              type="button"
              onClick={() => continueToAuth("sign-in")}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#cbd9cf] px-5 text-sm font-semibold text-[#315345] hover:bg-[#f3f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Sign in
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => setPromptOpen(false)}
              className="inline-flex min-h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-[#59665e] hover:bg-[#f5f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Maybe later · Continue browsing
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
