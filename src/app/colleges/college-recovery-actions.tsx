"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Compass } from "lucide-react";
import ClearChoicesButton from "../discover/clear-choices-button";
import {
  clearAnswers,
  saveAnswers,
  useStoredDiscoveryAnswers,
} from "../discover/flow-data";

export default function CollegeRecoveryActions() {
  const router = useRouter();
  const stored = useStoredDiscoveryAnswers();
  const [actionError, setActionError] = useState("");
  const canClearChoices =
    stored.status === "saved" || stored.status === "invalid";

  function browseWithoutClassContext() {
    if (stored.status === "loading") return;

    if (stored.status === "saved") {
      const updated = saveAnswers({
        ...stored.answers,
        classContext: "general",
      });
      if (!updated) {
        setActionError(
          "We couldn’t update the browsing context. Your saved choices are unchanged; use Change choices to continue.",
        );
        return;
      }
    }

    router.push("/discover/results?mode=all");
  }

  function clearChoicesAndReturn() {
    const cleared = clearAnswers();
    if (cleared) {
      router.replace("/discover");
      return true;
    }

    setActionError(
      "We couldn’t clear the saved choices in this tab. Please try again.",
    );
    return false;
  }

  return (
    <section
      aria-labelledby="college-recovery-title"
      className="mt-10 rounded-[1.5rem] border border-[#d9ddd5] bg-white p-5 sm:p-7"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
            You can change direction
          </p>
          <h2
            id="college-recovery-title"
            className="mt-2 font-serif text-2xl font-semibold tracking-[-.035em] text-[#102d26] sm:text-3xl"
          >
            Keep exploring at your own pace.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
            This directory doesn’t select a college for you. Go back to your
            choices, browse every area, or clear saved choices separately.
          </p>
          {stored.status === "saved" && (
            <p className="mt-2 text-xs leading-relaxed text-[#718078]">
              Browsing without a class context keeps your saved activity picks;
              it only changes the browsing context to general.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <Link
            href="/discover"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#b8c8bd] bg-[#fbfaf6] px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            Change choices
          </Link>
          <Link
            href="/discover/results?mode=all"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            <Compass aria-hidden="true" className="h-4 w-4" />
            Browse every area
          </Link>
          {stored.status !== "loading" && (
            <button
              type="button"
              onClick={browseWithoutClassContext}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#b8c8bd] bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Browse without a class context
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
          {canClearChoices && (
            <ClearChoicesButton
              onConfirm={clearChoicesAndReturn}
              className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold text-[#59665e] underline underline-offset-4 transition-colors hover:text-[#145543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            />
          )}
        </div>
      </div>

      {actionError && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-[#c8954e] bg-[#fbf1df] px-4 py-3 text-sm leading-relaxed text-[#4c3922]"
        >
          {actionError}
        </p>
      )}
    </section>
  );
}
