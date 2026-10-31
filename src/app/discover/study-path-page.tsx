"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Compass,
  Sparkles,
} from "lucide-react";
import ClearChoicesButton from "./clear-choices-button";
import {
  clearAnswers,
  saveAnswers,
  useStoredDiscoveryAnswers,
} from "./flow-data";
import type { StudyPathConfig } from "./study-path-data";

export default function StudyPathPage({
  config,
}: {
  config: StudyPathConfig;
}) {
  const router = useRouter();
  const [actionError, setActionError] = useState("");
  const stored = useStoredDiscoveryAnswers();
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
    <main className="min-h-screen overflow-hidden bg-[#fbfaf6] text-[#18352d]">
      <header className="bg-[#123f34] text-white">
        <div className="cb-container flex min-h-16 items-center justify-between gap-4 py-2">
          <Link
            href="/"
            className="font-serif text-xl font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2cf78] sm:text-2xl"
          >
            CareerBridge
          </Link>
          <Link
            href="/discover"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2cf78]"
          >
            Change choices
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#123f34] pb-9 text-white sm:pb-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-48 h-[34rem] w-[34rem] rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-32 h-[23rem] w-[23rem] rounded-full border border-[#f2cf78]/20"
        />
        <div className="cb-container relative pt-5 sm:pt-8">
          <nav aria-label="Breadcrumb" className="text-sm text-white/75">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="underline-offset-4 hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href="/discover/results"
                  className="underline-offset-4 hover:underline"
                >
                  Areas to Explore
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-medium text-white">
                {config.breadcrumb}
              </li>
            </ol>
          </nav>

          <div className="mt-7 grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(250px,330px)] md:items-end md:gap-12">
            <div className="max-w-4xl">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-[#f2cf78] sm:text-sm">
                <Sparkles aria-hidden="true" className="h-4 w-4" />
                {config.eyebrow}
              </p>
              <h1 className="mt-3 max-w-[24ch] font-serif text-[clamp(2.4rem,5vw,4.4rem)] font-semibold leading-[1.02] tracking-[-.05em] text-white">
                {config.title}
              </h1>
              <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-white/80 sm:text-base">
                {config.description}
              </p>
            </div>

            <aside className="rounded-2xl border border-white/15 bg-white/[.07] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#f2cf78]">
                A no-pressure guide
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/85">
                {config.reminder}
              </p>
            </aside>
          </div>
        </div>
      </section>

      <div className="cb-container pb-16 pt-8 sm:pb-20 sm:pt-11">
        {(stored.status === "invalid" || stored.status === "unavailable") && (
          <p
            role="status"
            className="mb-6 rounded-xl border border-[#e7d5a8] bg-[#fff9eb] px-4 py-3 text-sm leading-relaxed text-[#4c3922]"
          >
            {stored.status === "invalid"
              ? "We couldn’t read earlier choices in this tab, so they haven’t been used for this guide. You can clear them below or keep browsing."
              : "We couldn’t access choices saved in this tab. This public guide still works; you can keep browsing or change choices."}
          </p>
        )}

        <section aria-labelledby="categories-title">
          <div className="flex flex-col gap-4 border-b border-[#d9ddd5] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
                Four broad starting points
              </p>
              <h2
                id="categories-title"
                className="mt-2 font-serif text-2xl font-semibold tracking-[-.035em] text-[#102d26] sm:text-3xl"
              >
                Explore these categories
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#59665e] sm:text-base">
                Each summary stays visible for easy comparison. Open an
                explanation only when it would help.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d9ddd5] bg-white px-4 py-2 text-sm font-medium text-[#486056]">
              <BookOpen aria-hidden="true" className="h-4 w-4 text-[#145543]" />
              Read or skip any category
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {config.categories.map((category, index) => (
              <article
                key={category.name}
                className="group flex min-h-full flex-col rounded-[1.4rem] border border-[#d9ddd5] bg-white p-5 shadow-[0_14px_40px_-34px_rgba(24,53,45,.55)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#9bb5a5] hover:shadow-[0_22px_48px_-35px_rgba(20,85,67,.6)] motion-reduce:transform-none motion-reduce:transition-none sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#eaf2ed] font-serif text-lg font-semibold text-[#145543]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="rounded-full bg-[#f5f3ea] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-[#718078]">
                    Broad category
                  </span>
                </div>
                <h3 className="mt-5 font-serif text-2xl font-semibold leading-tight tracking-[-.035em] text-[#18372e]">
                  {category.name}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[#59665e] sm:text-base">
                  {category.summary}
                </p>

                <details className="group/details mt-5 border-t border-[#e3e6df] pt-3">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-semibold text-[#145543] marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] [&::-webkit-details-marker]:hidden">
                    <span>What this means</span>
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 transition-transform group-open/details:rotate-180 motion-reduce:transition-none"
                    />
                  </summary>
                  <p className="pt-2 text-sm leading-relaxed text-[#59665e]">
                    {category.explanation}
                  </p>
                </details>
                <Link
                  href={`${config.detailBasePath}/${category.slug}`}
                  aria-label={`${config.detailActionLabel}: ${category.name}`}
                  className="mt-4 inline-flex min-h-12 items-center justify-between gap-3 rounded-xl bg-[#145543] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] motion-reduce:transition-none"
                >
                  <span>{config.detailActionLabel}</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <aside
          aria-labelledby="catalogue-note-title"
          className="mt-7 rounded-2xl border border-[#e7d5a8] bg-[#fff9eb] p-5 sm:p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#7b6335]">
            Catalogue note
          </p>
          <h2
            id="catalogue-note-title"
            className="mt-2 font-serif text-xl font-semibold text-[#4c3922]"
          >
            Broad guidance—not verified local listings
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-[#5b4a31]">
            {config.catalogueNote}
          </p>
        </aside>

        {actionError && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-[#c8954e] bg-[#fbf1df] px-4 py-3 text-sm leading-relaxed text-[#4c3922]"
          >
            {actionError}
          </p>
        )}

        <section
          aria-labelledby="keep-browsing-title"
          className="mt-10 flex flex-col gap-5 border-t border-[#d9ddd5] pt-6 sm:mt-14 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
              No decision needed
            </p>
            <h2
              id="keep-browsing-title"
              className="mt-2 font-serif text-xl font-semibold text-[#18372e] sm:text-2xl"
            >
              Keep exploring at your own pace.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
              You can return to broad areas, browse without a class context, or
              change your choices whenever you like.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <Link
              href="/discover/results?mode=all"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              <Compass aria-hidden="true" className="h-4 w-4" />
              Browse every area
            </Link>
            <Link
              href="/discover"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#b8c8bd] bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Change choices
            </Link>
            {canClearChoices && (
              <ClearChoicesButton
                onConfirm={clearChoicesAndReturn}
                className="inline-flex min-h-12 items-center justify-center px-3 text-sm font-semibold text-[#59665e] underline underline-offset-4 transition-colors hover:text-[#145543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              />
            )}
          </div>
        </section>

        <aside className="mt-5 flex flex-col gap-4 rounded-2xl border border-[#d9ddd5] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="max-w-2xl">
            <p className="font-semibold text-[#18372e]">
              Not sure this is the right guide?
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#59665e]">
              {stored.status === "saved"
                ? "Browse all areas without a class label. Only the class context changes; your activity picks stay saved."
                : "Browse all areas without choosing a class. No class answer is needed to continue."}
            </p>
          </div>
          {stored.status !== "loading" && (
            <button
              type="button"
              onClick={browseWithoutClassContext}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-[#b8c8bd] bg-[#fbfaf6] px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Browse without a class context
              <Compass aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </aside>
      </div>

      <footer className="bg-[#123f34] text-white">
        <div className="cb-container flex flex-col gap-3 py-7 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="font-serif text-lg font-semibold">
            CareerBridge
          </Link>
          <p className="text-sm text-white/75">
            Explore options. Your interests don’t decide your future.
          </p>
        </div>
      </footer>
    </main>
  );
}
