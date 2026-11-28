"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { AdminCourseDetail } from "../../../../db/admin-courses";

type LifecycleAction = "publish" | "archive" | "delete-draft";

export function CourseLifecycleActions({ course }: { course: AdminCourseDetail }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [confirmationAction, setConfirmationAction] = useState<LifecycleAction | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasUnpublishedUpdate =
    course.publishedVersionAvailable &&
    course.latestRevisionId !== course.publishedRevisionId;
  const canPublish =
    course.publicationStatus === "draft" || course.publicationStatus === "approved";
  const canUnpublish =
    course.publishedVersionAvailable &&
    course.latestRevisionId === course.publishedRevisionId;
  const canDeleteDraft = course.publicationStatus === "draft";
  const sourceWarning = course.sources.length === 0
    ? "No sources are linked to this Course revision. Publication will be blocked unless its required provenance is present."
    : course.verificationStatus !== "verified" ||
        course.sources.some((source) =>
          source.status !== "active" ||
          source.claims.some((claim) =>
            claim.verificationStatus !== "verified" || claim.verifiedAt === null,
          ),
        )
      ? "Some Course evidence is not fully verified. Review the required claims; publication checks will refuse incomplete or unverified provenance."
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
        `/api/admin/catalogue/courses/${encodeURIComponent(course.id)}/lifecycle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            expectedRevisionId: course.latestRevisionId,
            expectedPublishedRevisionId: course.publishedRevisionId,
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
            : "The Course action could not be completed.";
        throw new Error(message);
      }

      setConfirmationAction(null);
      if (action === "delete-draft" && !course.publishedRevisionId) {
        router.replace("/admin/catalogue/courses");
      } else {
        router.refresh();
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The Course action could not be completed. Please try again.",
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
        title: hasUnpublishedUpdate ? "Publish this Course update?" : "Publish this Course?",
        description: hasUnpublishedUpdate
          ? "Students will see this saved version instead of the current published version. The previous version will remain in revision history."
          : "This Course will become visible to students. Its revision history will remain available to administrators.",
        confirmLabel: hasUnpublishedUpdate ? "Publish update" : "Publish Course",
        confirmClass: "bg-[#15803d] hover:bg-[#166534] focus-visible:outline-[#15803d]",
      }
    : confirmationAction === "archive"
      ? {
          title: "Unpublish this Course?",
          description: "Students will no longer see this Course. Its published version will be preserved in revision history; institution-specific Course Offerings will not be deleted.",
          confirmLabel: "Unpublish Course",
          confirmClass: "bg-[#b42318] hover:bg-[#912018] focus-visible:outline-[#b42318]",
        }
      : {
          title: "Delete this draft?",
          description: "The unpublished draft revision will be deleted. Existing published versions and revision history will be preserved. If this is the only revision, the Course identity will also be removed.",
          confirmLabel: "Delete draft",
          confirmClass: "bg-[#b42318] hover:bg-[#912018] focus-visible:outline-[#b91c1c]",
        };

  if (!canPublish && !canUnpublish && !canDeleteDraft) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canPublish && (
          <button
            type="button"
            disabled={working}
            onClick={(event) => {
              triggerRef.current = event.currentTarget;
              setError("");
              setConfirmationAction("publish");
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#15803d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d]"
          >
            {hasUnpublishedUpdate ? "Publish update" : "Publish"}
          </button>
        )}
        {(canUnpublish || canDeleteDraft) && (
          <details className="relative">
            <summary className="inline-flex min-h-10 cursor-pointer list-none items-center rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm font-semibold text-[#405a5e] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]">
              More actions
            </summary>
            <div className="absolute right-0 z-10 mt-2 min-w-48 rounded-lg border border-[#dce5e0] bg-white p-2 shadow-lg">
              {canUnpublish && (
                <button
                  type="button"
                  disabled={working}
                  onClick={(event) => {
                    triggerRef.current = event.currentTarget;
                    setError("");
                    setConfirmationAction("archive");
                  }}
                  className="flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm font-semibold text-[#9b2c25] hover:bg-[#fff1ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318]"
                >
                  Unpublish Course
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
                  className="flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm font-semibold text-[#9b2c25] hover:bg-[#fff1ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318]"
                >
                  Delete draft
                </button>
              )}
            </div>
          </details>
        )}
        {hasUnpublishedUpdate && course.publishedVersionAvailable && !canUnpublish && (
          <p className="basis-full text-xs text-[#657976]">
            Publish or delete the current update before unpublishing this Course.
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
            aria-labelledby="course-action-confirmation-title"
            aria-describedby="course-action-confirmation-description"
            onKeyDown={handleDialogKeyDown}
            className="w-full max-w-lg rounded-2xl border border-[#dce5e0] bg-white p-5 shadow-2xl sm:p-6"
          >
            <h2 id="course-action-confirmation-title" className="text-lg font-semibold text-[#17364a]">
              {confirmation.title}
            </h2>
            <p id="course-action-confirmation-description" className="mt-2 text-sm leading-6 text-[#526b72]">
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
