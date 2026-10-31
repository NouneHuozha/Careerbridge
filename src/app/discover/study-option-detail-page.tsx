"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  Sparkles,
} from "lucide-react";
import { getCollegesForRoute } from "../colleges/college-data";
import ClearChoicesButton from "./clear-choices-button";
import {
  clearAnswers,
  saveAnswers,
  useStoredDiscoveryAnswers,
} from "./flow-data";
import type { StudyOptionDetail } from "./study-option-data";

export default function StudyOptionDetailPage({
  detail,
}: {
  detail: StudyOptionDetail;
}) {
  const router = useRouter();
  const [actionError, setActionError] = useState("");
  const stored = useStoredDiscoveryAnswers();
  const isStream = detail.kind === "stream";
  const canClearChoices =
    stored.status === "saved" || stored.status === "invalid";
  const linkedCollegeCount = detail.collegeListRouteSlug
    ? getCollegesForRoute(detail.collegeListRouteSlug).length
    : 0;
  const hasVerifiedCollegeRecords = linkedCollegeCount > 0;
  const courseFactRows: Array<[string, string]> = hasVerifiedCollegeRecords
    ? [
        ["Published college records", `${linkedCollegeCount} · 2026 pages`],
        ["Next-intake admissions", "Not verified"],
        ["Fees", "Not currently verified"],
      ]
    : [
        ["Entry requirements", "Not verified"],
        ["Course duration", "Not verified"],
        ["College listings", "No verified entries"],
      ];

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
    <main className="min-h-screen bg-[#fbfaf6] text-[#18352d]">
      <header className="border-b border-white/10 bg-[#123f34] text-white">
        <div className="cb-container flex min-h-16 items-center justify-between gap-4 py-2">
          <Link
            href="/"
            className="font-serif text-xl font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2cf78] sm:text-2xl"
          >
            CareerBridge
          </Link>
          <Link
            href="/discover"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/35 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2cf78]"
          >
            Change choices
          </Link>
        </div>
      </header>

      {isStream ? (
        <section className="relative overflow-hidden bg-[#123f34] pb-10 text-white sm:pb-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-28 -top-36 h-[32rem] w-[32rem] rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-24 h-[23rem] w-[23rem] rounded-full border border-[#f2cf78]/20"
          />
          <div className="cb-container relative pt-5 sm:pt-8">
            <Breadcrumb detail={detail} />
            <div className="mt-9 grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(17rem,.7fr)] md:items-end md:gap-14">
              <div className="max-w-4xl">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-[#f2cf78] sm:text-sm">
                  <Sparkles aria-hidden="true" className="h-4 w-4" />
                  {detail.contextLabel}
                </p>
                <h1 className="mt-4 max-w-[16ch] font-serif text-[clamp(2.8rem,7vw,5.8rem)] font-semibold leading-[.98] tracking-[-.055em] text-white">
                  {detail.category.name}
                </h1>
                <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-white/80 sm:text-lg">
                  {detail.category.summary}
                </p>
              </div>

              <aside className="relative rounded-[1.6rem] border border-white/15 bg-[#0c332b]/65 p-5 shadow-[0_25px_70px_-48px_rgba(0,0,0,.8)] backdrop-blur-sm sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#f2cf78]">
                  {detail.pageEyebrow}
                </p>
                <p className="mt-3 font-serif text-xl font-semibold leading-snug text-white sm:text-2xl">
                  A place to learn, not a choice you have to make today.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/75">
                  The name describes a broad study category. It does not confirm
                  that a local subject set is offered or that you qualify for a
                  future course.
                </p>
              </aside>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden border-b border-[#e4e0d4] bg-[#f1efe6]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[37%] bg-[radial-gradient(ellipse_at_75%_25%,rgba(202,164,87,.18),transparent_55%)] lg:block"
          />
          <div className="cb-container relative pb-10 pt-5 sm:pb-14 sm:pt-8">
            <Breadcrumb detail={detail} />
            <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-end lg:gap-12">
              <div className="max-w-4xl">
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#7b6335] sm:text-sm">
                  {detail.contextLabel}
                </p>
                <h1 className="mt-4 max-w-[18ch] font-serif text-[clamp(2.7rem,6vw,5.3rem)] font-semibold leading-[.98] tracking-[-.055em] text-[#102d26]">
                  {detail.category.name}
                </h1>
                <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-[#59665e] sm:text-lg">
                  {detail.category.summary}
                </p>
              </div>

              <aside className="rounded-[1.5rem] border border-[#d7d4c8] bg-white p-5 shadow-[0_20px_55px_-45px_rgba(24,53,45,.45)] sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[.14em] text-[#718078]">
                    Catalogue status
                  </span>
                  <span className="rounded-full border border-[#eadab3] bg-[#fff8e8] px-3 py-1 text-[11px] font-semibold text-[#725b2f]">
                    {hasVerifiedCollegeRecords
                      ? `${linkedCollegeCount} 2026 college records`
                      : "No verified courses"}
                  </span>
                </div>
                <p className="mt-4 font-serif text-xl font-semibold leading-snug text-[#18372e]">
                  {detail.pageEyebrow}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                  This guide is public and works without saved choices. It does
                  not recommend a course or make an admission decision.
                </p>
              </aside>
            </div>
          </div>
        </section>
      )}

      <div className="cb-container pb-16 pt-8 sm:pb-20 sm:pt-11">
        {(stored.status === "invalid" || stored.status === "unavailable") && (
          <p
            role="status"
            className="mb-6 rounded-xl border border-[#e7d5a8] bg-[#fff9eb] px-4 py-3 text-sm leading-relaxed text-[#4c3922]"
          >
            {stored.status === "invalid"
              ? "Earlier choices in this tab could not be read, so they haven’t been used on this public guide. You can clear them below or keep browsing."
              : "Choices saved in this tab could not be accessed. This public guide still works; you can keep browsing or change choices."}
          </p>
        )}

        <section
          aria-labelledby="overview-title"
          className={
            isStream
              ? "grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(17rem,.7fr)] md:gap-12"
              : "grid gap-7 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-12"
          }
        >
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
              {isStream ? "The broad idea" : "Inside this course area"}
            </p>
            <h2
              id="overview-title"
              className="mt-2 font-serif text-2xl font-semibold tracking-[-.035em] text-[#102d26] sm:text-3xl"
            >
              {detail.whatItMeansTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#52635a]">
              {detail.category.explanation}
            </p>
          </div>

          {isStream ? (
            <aside className="rounded-[1.4rem] border border-[#d9ddd5] bg-white p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#718078]">
                Keep the context in mind
              </p>
              <p className="mt-3 font-serif text-lg font-semibold text-[#18372e]">
                Your school and board determine the local subject list.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                This guide describes the category generally. It does not show a
                verified list of subjects or combinations for a particular
                school.
              </p>
            </aside>
          ) : (
            <aside className="rounded-[1.4rem] border border-[#d9ddd5] bg-white p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#718078]">
                {hasVerifiedCollegeRecords
                  ? "What the published records confirm"
                  : "Facts attached to a listing"}
              </p>
              <dl className="mt-4 divide-y divide-[#e6e8e2]">
                {courseFactRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <dt className="text-sm text-[#59665e]">{label}</dt>
                    <dd className="text-right text-xs font-semibold text-[#7b6335]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </aside>
          )}
        </section>

        <section aria-labelledby="examples-title" className="mt-9 sm:mt-12">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#eadab3] bg-[#fff8e8] px-3 py-1.5 text-xs font-semibold text-[#725b2f]">
              <BookOpen aria-hidden="true" className="h-4 w-4" />
              Illustrative examples · not verified listings
            </p>
            <h2
              id="examples-title"
              className="mt-3 font-serif text-2xl font-semibold tracking-[-.035em] text-[#102d26] sm:text-3xl"
            >
              {detail.examplesTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#59665e] sm:text-base">
              {detail.examplesNote}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {detail.examples.map((example, index) => (
              <article
                key={example.name}
                className={
                  isStream
                    ? "rounded-[1.25rem] border border-[#d9ddd5] bg-white p-5 shadow-[0_12px_35px_-30px_rgba(24,53,45,.6)] sm:p-6"
                    : "rounded-[1.25rem] border border-[#e2dfd5] bg-[#f8f6ef] p-5 sm:p-6"
                }
              >
                <span className="text-xs font-semibold uppercase tracking-[.14em] text-[#7b6335]">
                  Example {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-serif text-xl font-semibold leading-snug text-[#18372e]">
                  {example.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                  {example.summary}
                </p>
              </article>
            ))}
          </div>
        </section>

        {isStream ? (
          <section
            aria-labelledby="catalogue-status-title"
            className="mt-9 overflow-hidden rounded-[1.5rem] border border-[#d9ddd5] bg-white shadow-[0_18px_50px_-42px_rgba(24,53,45,.55)] sm:mt-12"
          >
            <div className="grid md:grid-cols-[minmax(13rem,.62fr)_minmax(0,1fr)]">
              <div className="bg-[#eaf2ed] p-5 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#557064]">
                  Published detail
                </p>
                <p className="mt-3 font-serif text-2xl font-semibold leading-tight text-[#18372e]">
                  Stream catalogue
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                  Verified local information only.
                </p>
              </div>
              <div className="p-5 sm:p-7">
                <p className="inline-flex items-center gap-2 rounded-full border border-[#eadab3] bg-[#fff8e8] px-3 py-1.5 text-xs font-semibold text-[#725b2f]">
                  <BookOpen aria-hidden="true" className="h-4 w-4" />
                  No verified listings
                </p>
                <h2
                  id="catalogue-status-title"
                  className="mt-4 font-serif text-xl font-semibold text-[#18372e] sm:text-2xl"
                >
                  {detail.catalogueTitle}
                </h2>
                <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-[#59665e] sm:text-base">
                  {detail.catalogueBody}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section
            aria-labelledby="catalogue-status-title"
            className="mt-9 rounded-[1.5rem] border border-[#d9ddd5] bg-white p-5 shadow-[0_18px_50px_-42px_rgba(24,53,45,.55)] sm:mt-12 sm:p-7"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
                  Course catalogue
                </p>
                <h2
                  id="catalogue-status-title"
                  className="mt-2 font-serif text-2xl font-semibold tracking-[-.03em] text-[#102d26] sm:text-3xl"
                >
                  {detail.catalogueTitle}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#59665e] sm:text-base">
                  {detail.catalogueBody}
                </p>
                {detail.collegeListHref && hasVerifiedCollegeRecords && (
                  <div className="mt-5 border-t border-[#e6e8e2] pt-5">
                    <p className="max-w-2xl text-sm leading-relaxed text-[#59665e]">
                      Open the shared directory to review colleges with
                      source-checked 2026 undergraduate programmes. Current
                      admissions, fees, and eligibility still need direct
                      confirmation.
                    </p>
                    <Link
                      href={detail.collegeListHref}
                      aria-label={`See ${linkedCollegeCount} college records for ${detail.category.name}`}
                      className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                    >
                      {hasVerifiedCollegeRecords
                        ? `See ${linkedCollegeCount} college ${linkedCollegeCount === 1 ? "record" : "records"}`
                        : "Check this area in the directory"}
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#eadab3] bg-[#fff8e8] px-3 py-2 text-xs font-semibold text-[#725b2f]">
                <BookOpen aria-hidden="true" className="h-4 w-4" />
                {hasVerifiedCollegeRecords
                  ? `${linkedCollegeCount} source-checked college records`
                  : "No verified courses"}
              </span>
            </div>
          </section>
        )}

        <section aria-labelledby="check-title" className="mt-10 sm:mt-14">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
              {isStream ? "Take the next question" : "Use an official source"}
            </p>
            <h2
              id="check-title"
              className="mt-2 font-serif text-2xl font-semibold tracking-[-.035em] text-[#102d26] sm:text-3xl"
            >
              {detail.checkTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#59665e] sm:text-base">
              {detail.checkIntro}
            </p>
          </div>

          {isStream ? (
            <ol className="mt-5 grid gap-3 md:grid-cols-3">
              {detail.checkPrompts.map((item, index) => (
                <li
                  key={item.label}
                  className="rounded-[1.25rem] border border-[#d9ddd5] bg-white p-5 sm:p-6"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#eaf2ed] font-serif text-sm font-semibold text-[#145543]">
                    0{index + 1}
                  </span>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[.14em] text-[#718078]">
                    {item.label}
                  </p>
                  <p className="mt-2 font-medium leading-relaxed text-[#18372e]">
                    {item.prompt}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <ol className="mt-5 divide-y divide-[#e5e7e0] rounded-[1.25rem] border border-[#d9ddd5] bg-white px-5 sm:px-7">
              {detail.checkPrompts.map((item, index) => (
                <li
                  key={item.label}
                  className="grid gap-2 py-4 sm:grid-cols-[2.25rem_10rem_minmax(0,1fr)] sm:items-center sm:gap-4 sm:py-5"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f1efe6] text-xs font-semibold text-[#725b2f]">
                    0{index + 1}
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#718078]">
                    {item.label}
                  </p>
                  <p className="text-sm leading-relaxed text-[#18372e] sm:text-base">
                    {item.prompt}
                  </p>
                </li>
              ))}
            </ol>
          )}

          <p className="mt-4 text-sm leading-relaxed text-[#59665e]">
            {hasVerifiedCollegeRecords
              ? "The published 2026 programme records do not confirm next-cycle admission, eligibility, or fee details. Check with the college before acting."
              : `Check with ${detail.officialContact}. CareerBridge has not verified these details for a specific option.`}
          </p>
        </section>

        <section
          aria-labelledby="continue-title"
          className="mt-12 border-t border-[#d9ddd5] pt-7 sm:mt-16 sm:pt-9"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
                No decision needed
              </p>
              <h2
                id="continue-title"
                className="mt-2 font-serif text-2xl font-semibold text-[#18372e] sm:text-3xl"
              >
                Keep exploring at your own pace.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                Return to this guide’s overview, browse broad areas, or change
                your choices. Opening this page did not select a path for you.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                href={detail.parentHref}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back to {detail.parentLabel}
              </Link>
              <Link
                href="/discover/results?mode=all"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#b8c8bd] bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                <Compass aria-hidden="true" className="h-4 w-4" />
                Browse every area
              </Link>
              <Link
                href="/discover"
                className="inline-flex min-h-12 items-center justify-center px-3 text-sm font-semibold text-[#59665e] underline underline-offset-4 transition-colors hover:text-[#145543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Change choices
              </Link>
              {canClearChoices && (
                <ClearChoicesButton
                  onConfirm={clearChoicesAndReturn}
                  className="inline-flex min-h-12 items-center justify-center px-3 text-sm font-semibold text-[#59665e] underline underline-offset-4 transition-colors hover:text-[#145543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                />
              )}
            </div>
          </div>

          {actionError && (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-[#c8954e] bg-[#fbf1df] px-4 py-3 text-sm leading-relaxed text-[#4c3922]"
            >
              {actionError}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#d9ddd5] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="max-w-2xl">
              <p className="font-semibold text-[#18372e]">
                Not sure this is your path?
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#59665e]">
                {stored.status === "saved"
                  ? "Browse without a class label. Only the browsing context changes; saved activity picks stay as they are."
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
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
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

function Breadcrumb({ detail }: { detail: StudyOptionDetail }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-[#718078]">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/discover/results" className="underline-offset-4 hover:underline">
            Areas to Explore
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link href={detail.parentHref} className="underline-offset-4 hover:underline">
            {detail.parentLabel}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="font-medium text-[#18372e]">
          {detail.category.name}
        </li>
      </ol>
    </nav>
  );
}
