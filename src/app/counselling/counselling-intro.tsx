"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "../site-header";
import { Breadcrumbs } from "../breadcrumbs";
import {
  removeSavedCounselling,
  startNewCounselling,
  startOrResumeCounselling,
  useCounsellingSession,
} from "./counselling-engine";

export function CounsellingIntroduction() {
  const router = useRouter();
  const stored = useCounsellingSession();
  const [storageError, setStorageError] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  const canResume =
    stored.status === "saved" &&
    (stored.session.status === "active" || stored.session.status === "paused");
  const hasCompleted =
    stored.status === "saved" && stored.session.status === "completed";
  const startLabel = canResume ? "Continue Guided Explorer" : "Start Guided Explorer";

  function start() {
    const result = startOrResumeCounselling(stored);
    if (!result.ok) {
      setStorageError(true);
      return;
    }
    router.push("/counselling/conversation");
  }

  function startNew() {
    setConfirmNew(true);
  }

  function confirmStartNew() {
    const result = startNewCounselling();
    if (!result.ok) {
      setStorageError(true);
      return;
    }
    setConfirmNew(false);
    router.push("/counselling/conversation");
  }

  function deleteSaved() {
    if (
      !window.confirm(
        "Delete this saved progress? Your answers and progress will be removed from this device.",
      )
    ) {
      return;
    }
    const result = removeSavedCounselling();
    if (!result.ok) {
      setStorageError(true);
    }
  }

  return (
    <>
      <SiteHeader />
      {confirmNew && (
        <dialog
          open
          aria-modal="true"
          aria-labelledby="new-exploration-title"
          className="fixed inset-0 z-[60] m-auto w-[min(30rem,calc(100vw-2rem))] rounded-3xl border border-[#dce4dc] bg-[#fbfaf6] p-0 text-[#18352d] shadow-[0_24px_80px_rgba(16,45,36,0.28)] backdrop:bg-[#102d24]/55 backdrop:backdrop-blur-sm"
          onCancel={(event) => {
            event.preventDefault();
            setConfirmNew(false);
          }}
        >
          <div className="p-6 sm:p-7">
            <h2 id="new-exploration-title" className="font-serif text-2xl font-semibold">
              Start a new exploration?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#354b40]">
              Your current {canResume ? "unfinished progress" : "summary"} will be replaced on
              this device.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={confirmStartNew}
                className="inline-flex min-h-11 items-center rounded-full bg-[#145543] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Start new exploration
              </button>
              <button
                type="button"
                onClick={() => setConfirmNew(false)}
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-[#145543] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Keep current progress
              </button>
            </div>
          </div>
        </dialog>
      )}
      <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
        <Breadcrumbs items={[{ label: "Guided Explorer" }]} className="pt-4" />
        <section className="mx-auto grid min-h-[calc(100svh-8rem)] max-w-7xl items-center gap-12 px-5 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,.9fr)] lg:gap-20 lg:px-12">
          <div className="max-w-3xl">
            <h1 className="max-w-[12ch] font-serif text-[clamp(3.5rem,8vw,7.5rem)] font-semibold leading-[.94] tracking-[-.055em] text-[#18352d]">
              You can be unsure.
            </h1>
            <p className="mt-7 max-w-[42ch] font-serif text-2xl leading-snug tracking-[-.025em] text-[#145543] sm:text-3xl">
              Let’s take a little time to understand what interests you.
            </p>
            <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-[#354b40] sm:text-lg">
              Guided Explorer offers self-guided questions about what you enjoy,
              what interests you and what matters to you. No person is involved,
              and there are no right or wrong answers. Skip any question or
              finish whenever you like; you can explore on your own at any time.
            </p>

            {canResume && (
              <div className="mt-8 max-w-xl rounded-2xl border border-[#cbd9ce] bg-[#eaf2ed] p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#59665e]">
                  Progress available
                </p>
                <h2 className="mt-2 font-serif text-2xl font-semibold text-[#18352d]">
                  Welcome back!
                </h2>
                <p className="mt-2 text-base leading-relaxed text-[#354b40]">
                  You have unfinished progress. Would you like to continue where you left off?
                </p>
              </div>
            )}

            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
              {hasCompleted ? (
                <>
                <Link
                  href="/explore"
                  className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#145543] px-7 text-base font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#145543] sm:w-auto"
                >
                  Start exploring <ArrowRight aria-hidden="true" className="h-5 w-5" />
                </Link>
                <Link
                  href="/counselling/summary"
                  className="inline-flex min-h-12 items-center justify-center rounded-full px-5 text-base font-semibold text-[#145543] underline decoration-[#97a69d] underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  Review my notes
                </Link>
                <button
                  type="button"
                  onClick={startNew}
                  className="inline-flex min-h-12 items-center justify-center rounded-full px-5 text-base font-semibold text-[#145543] underline decoration-[#97a69d] underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  Start a new exploration
                </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={start}
                  disabled={stored.status === "loading" || stored.status === "unavailable"}
                  className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#145543] px-7 text-base font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#145543] disabled:cursor-wait disabled:opacity-70 sm:w-auto"
                >
                  {stored.status === "loading" ? "Loading…" : startLabel}
                  <ArrowRight aria-hidden="true" className="h-5 w-5" />
                </button>
              )}
              {canResume && (
                <button
                  type="button"
                  onClick={startNew}
                  className="inline-flex min-h-12 items-center justify-center rounded-full px-5 text-base font-semibold text-[#145543] underline decoration-[#97a69d] underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  Start a new exploration
                </button>
              )}
              <Link
                href="/explore"
                className="inline-flex min-h-12 items-center justify-center rounded-full px-5 text-base font-semibold text-[#145543] underline decoration-[#97a69d] underline-offset-4 transition-colors hover:text-[#18352d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Maybe later
              </Link>
            </div>
            {canResume && (
              <p className="mt-4 text-sm leading-relaxed text-[#145543]" role="status">
                Your progress is saved on this device.
              </p>
            )}
            {canResume && (
              <button
                type="button"
                onClick={deleteSaved}
                className="mt-3 text-sm text-[#59665e] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Delete saved progress
              </button>
            )}
            {storageError && (
              <p className="mt-4 text-sm leading-relaxed text-[#8a2e24]" role="alert">
                This browser couldn’t save your progress. Check that local storage is available, then try again.
              </p>
            )}
            {stored.status === "unavailable" && (
              <p className="mt-4 text-sm leading-relaxed text-[#8a2e24]" role="alert">
                This browser doesn’t allow local storage, so your progress can’t be safely saved here.
              </p>
            )}
            {stored.status === "invalid" && (
              <p className="mt-4 text-sm leading-relaxed text-[#8a2e24]" role="alert">
                Saved progress could not be read. It hasn’t been erased; starting a new exploration will replace it.
              </p>
            )}
          </div>

          <aside
            aria-label="How Guided Explorer works"
            className="bg-[#eaf2ed] p-7 sm:p-9 lg:p-10"
          >
            <h2 className="max-w-[15ch] font-serif text-3xl font-semibold leading-tight tracking-[-.04em] text-[#18352d] sm:text-4xl">
              This is self-guided exploration, not a test.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#354b40]">
              You’re in control of what you share and when you’re ready to stop.
            </p>
            <ul className="mt-8 space-y-5 text-base leading-relaxed text-[#18352d]">
              <li>You can skip any question.</li>
              <li>You can change an answer.</li>
              <li>You can exit and come back later.</li>
            </ul>
          </aside>
        </section>
      </main>
    </>
  );
}
