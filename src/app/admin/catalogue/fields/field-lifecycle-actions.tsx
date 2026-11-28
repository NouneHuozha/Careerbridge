"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminFieldDetail } from "../../../../db/admin-fields";

type LifecycleAction = "publish" | "archive" | "delete-draft";

export function FieldLifecycleActions({ field }: { field: AdminFieldDetail }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [confirmationAction, setConfirmationAction] = useState<LifecycleAction | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasUnpublishedUpdate =
    field.publishedVersionAvailable &&
    field.latestRevisionId !== null &&
    field.latestRevisionId !== field.publishedRevisionId;
  const canPublish =
    Boolean(field.latestRevisionId) &&
    (field.publicationStatus === "in_review" || field.publicationStatus === "approved");
  const canDeleteDraft =
    Boolean(field.latestRevisionId) && field.publicationStatus === "draft";
  const sourceWarning = field.sources.length === 0
    ? "No sources are linked to this version. Publishing it will not add source evidence."
    : field.sources.some((source) =>
        source.verificationStatus !== "verified" || source.verifiedAt === null,
      )
      ? "Some linked sources are unverified. Publishing this Field will not mark their claims as verified."
      : null;
  const changeComparison =
    hasUnpublishedUpdate && field.publishedRevisionId && field.latestRevisionId
      ? `?compareFrom=${encodeURIComponent(field.publishedRevisionId)}&compareTo=${encodeURIComponent(field.latestRevisionId)}#revision-comparison`
      : null;

  useEffect(() => {
    if (!confirmationAction) return;
    confirmButtonRef.current?.focus();
    return () => triggerRef.current?.focus();
  }, [confirmationAction]);

  async function runAction(action: LifecycleAction) {
    setWorking(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/catalogue/fields/${encodeURIComponent(field.id)}/lifecycle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            expectedRevisionId: field.latestRevisionId,
            expectedPublishedRevisionId: field.publishedRevisionId,
          }),
        },
      );
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "The Field action could not be completed.";
        throw new Error(message);
      }

      setConfirmationAction(null);
      if (action === "delete-draft" && !field.publishedRevisionId) {
        router.replace("/admin/catalogue/fields");
      } else {
        router.refresh();
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The Field action could not be completed. Please try again.",
      );
    } finally {
      setWorking(false);
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && !working) {
      setConfirmationAction(null);
      return;
    }
    if (event.key !== "Tab") return;
    const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
    if (!buttons?.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const confirmation = confirmationAction === "publish"
    ? {
        title: field.publishedVersionAvailable ? "Publish this update?" : "Publish this Field?",
        description: field.publishedVersionAvailable
          ? "Students will see this saved version instead of the current published version. The previous version will remain in revision history."
          : "This Field will become visible to students immediately. Its revision history will remain available to administrators.",
        confirmLabel: field.publishedVersionAvailable ? "Publish update" : "Publish Field",
        confirmClass: "bg-[#15803d] hover:bg-[#166534] focus-visible:outline-[#15803d]",
      }
    : confirmationAction === "archive"
      ? {
          title: "Unpublish this Field?",
          description: "This Field will be removed from student-facing pages immediately. Its published version will be preserved as archived in the admin revision history.",
          confirmLabel: "Unpublish Field",
          confirmClass: "bg-[#b42318] hover:bg-[#912018] focus-visible:outline-[#b42318]",
        }
      : {
          title: "Delete this draft?",
          description: "This unpublished draft will be permanently deleted. Published versions and their history will not be affected.",
          confirmLabel: "Delete draft",
          confirmClass: "bg-[#b42318] hover:bg-[#912018] focus-visible:outline-[#b42318]",
        };

  if (!canPublish && !canDeleteDraft && !field.publishedVersionAvailable && !hasUnpublishedUpdate) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-wrap gap-2">
          {canPublish && (
            <button
              type="button"
              disabled={working}
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setError("");
                setConfirmationAction("publish");
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#15803d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d]"
            >
              {field.publishedVersionAvailable ? "Publish update" : "Publish Field"}
            </button>
          )}
          {field.publishedVersionAvailable && (
            <button
              type="button"
              disabled={working}
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setError("");
                setConfirmationAction("archive");
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#fca5a5] bg-white px-4 text-sm font-semibold text-[#991b1b] transition-colors hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b91c1c]"
            >
              Unpublish Field
            </button>
          )}
          {canDeleteDraft && (
            <button
              type="button"
              disabled={working}
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setError("");
                setConfirmationAction("delete-draft");
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d7e1dc] bg-white px-4 text-sm font-semibold text-[#526b72] transition-colors hover:bg-[#f4f7f5] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
            >
              Delete draft
            </button>
          )}
          {changeComparison && (
            <Link
              href={changeComparison}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d7e1dc] bg-white px-4 text-sm font-semibold text-[#1d4ed8] transition-colors hover:bg-[#eff6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4ed8]"
            >
              View changes
            </Link>
          )}
        </div>
        {error && !confirmationAction && (
          <p role="alert" className="max-w-md rounded-lg border border-[#e9c9c4] bg-[#fff7f5] px-3 py-2 text-sm text-[#8a3f35]">
            {error}
          </p>
        )}
      </div>

      {confirmationAction && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#102c37]/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !working) setConfirmationAction(null);
          }}
        >
          <section
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="field-action-confirmation-title"
            aria-describedby="field-action-confirmation-description"
            onKeyDown={handleDialogKeyDown}
            className="w-full max-w-lg rounded-2xl border border-[#dce5e0] bg-white p-5 shadow-2xl sm:p-6"
          >
            <h2 id="field-action-confirmation-title" className="text-lg font-semibold text-[#17364a]">
              {confirmation.title}
            </h2>
            <p id="field-action-confirmation-description" className="mt-2 text-sm leading-6 text-[#526b72]">
              {confirmation.description}
            </p>
            {confirmationAction === "publish" && sourceWarning && (
              <p className="mt-4 rounded-lg border border-[#fcd34d] bg-[#fffbeb] px-3 py-2.5 text-sm leading-5 text-[#78350f]">
                {sourceWarning}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 rounded-lg border border-[#e9c9c4] bg-[#fff7f5] px-3 py-2.5 text-sm text-[#8a3f35]">
                {error}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={working}
                onClick={() => setConfirmationAction(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d7e1dc] px-4 text-sm font-semibold text-[#405a5e] hover:bg-[#f7f9f7] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
              >
                Cancel
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                disabled={working}
                onClick={() => void runAction(confirmationAction)}
                className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${confirmation.confirmClass}`}
              >
                {working ? "Working..." : confirmation.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
