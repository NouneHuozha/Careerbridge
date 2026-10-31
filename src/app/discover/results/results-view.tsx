"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Sparkles,
} from "lucide-react";
import {
  activityOptions,
  areas,
  clearAnswers,
  createEmptyAnswers,
  getMappedAreas,
  useStoredDiscoveryAnswers,
  type ClassContext,
} from "../flow-data";
import ClearChoicesButton from "../clear-choices-button";

function NextPathway({ context }: { context: ClassContext | null }) {
  if (context === "class-10" || context === "class-12") {
    const class10 = context === "class-10";
    const href = class10 ? "/discover/streams" : "/discover/courses";
    const contextName = class10 ? "Class 10" : "Class 12";

    return (
      <section
        aria-labelledby="next-path-title"
        className="mt-12 rounded-[1.6rem] border border-[#cbd8cf] bg-[#eef4ef] p-5 sm:mt-16 sm:p-8"
      >
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#557064]">
              Optional next step · {contextName}
            </p>
            <h2
              id="next-path-title"
              className="mt-2 font-serif text-2xl font-semibold tracking-[-.035em] text-[#102d26] sm:text-3xl"
            >
              {class10
                ? "Explore broad study streams after Class 10"
                : "Explore types of study after Class 12"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#52635a] sm:text-base">
              {class10
                ? "Read about four broad study categories. You do not have to choose one now, and this guide will not decide what you qualify for."
                : "Browse four broad course areas at your own pace. You can look around without committing to a course or path."}
            </p>
          </div>
          <Link
            href={href}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#145543] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            {class10 ? "Explore Class 10 streams" : "Explore Class 12 course areas"}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="next-path-title"
      className="mt-12 rounded-[1.6rem] border border-[#d9ddd5] bg-white p-5 sm:mt-16 sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
        No class assumed
      </p>
      <h2
        id="next-path-title"
        className="mt-2 font-serif text-2xl font-semibold tracking-[-.035em] text-[#102d26] sm:text-3xl"
      >
        Browse broadly—or open either class-specific guide.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#59665e] sm:text-base">
        You can stay with broad areas or open either public guide. Opening one
        does not label you, save a class, or tell you what you qualify for.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/discover/streams"
          className="group flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-[#d9ddd5] bg-[#fbfaf6] p-4 transition-colors hover:border-[#9bb5a5] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] sm:p-5"
        >
          <span>
            <span className="block text-xs font-semibold uppercase tracking-[.14em] text-[#718078]">
              Class 10 guide
            </span>
            <span className="mt-1 block font-serif text-lg font-semibold text-[#18372e]">
              Explore study streams
            </span>
          </span>
          <ArrowRight
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-[#145543] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
        <Link
          href="/discover/courses"
          className="group flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-[#d9ddd5] bg-[#fbfaf6] p-4 transition-colors hover:border-[#9bb5a5] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] sm:p-5"
        >
          <span>
            <span className="block text-xs font-semibold uppercase tracking-[.14em] text-[#718078]">
              Class 12 guide
            </span>
            <span className="mt-1 block font-serif text-lg font-semibold text-[#18372e]">
              Explore course areas
            </span>
          </span>
          <ArrowRight
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-[#145543] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      </div>
    </section>
  );
}

function getContextLabel(context: ClassContext | null) {
  if (context === "class-10") return "Exploring after Class 10";
  if (context === "class-12") return "Exploring after Class 12";
  return "Browsing broadly — no class assumed";
}

function AreaCard({
  area,
  activityLabels,
  index,
}: {
  area: (typeof areas)[number];
  activityLabels: string[];
  index: number;
}) {
  return (
    <article className="relative flex min-h-[210px] flex-col overflow-hidden rounded-[1.35rem] border border-[#d9ddd5] bg-white p-5 shadow-[0_12px_32px_-30px_rgba(24,53,45,.5)] sm:p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eaf2ed] font-serif text-lg font-semibold text-[#145543]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <h3 className="font-serif text-xl font-semibold leading-tight tracking-[-.025em] text-[#18372e]">
            {area.name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
            {area.description}
          </p>
        </div>
      </div>

      {activityLabels.length > 0 && (
        <p className="mt-5 rounded-xl border border-[#e6eddf] bg-[#f4f7f0] px-4 py-3 text-sm leading-relaxed text-[#354b40]">
          {activityLabels.map((label, labelIndex) => (
            <span key={label}>
              {labelIndex > 0 ? " " : ""}
              You picked <strong>“{label}”</strong>; this area may connect. It’s
              one possible place to explore, not a prediction.
              {labelIndex < activityLabels.length - 1 ? " " : ""}
            </span>
          ))}
        </p>
      )}

      <p className="mt-auto pt-5 text-xs leading-relaxed text-[#718078]">
        A broad area to browse—not a course listing or eligibility result.
      </p>
    </article>
  );
}

export default function ResultsView({
  forceAll,
  returnToGuided = false,
}: {
  forceAll: boolean;
  returnToGuided?: boolean;
}) {
  const router = useRouter();
  const [clearNotice, setClearNotice] = useState("");
  const stored = useStoredDiscoveryAnswers();
  const ready = stored.status !== "loading";
  const savedAnswers =
    stored.status === "saved" || stored.status === "empty"
      ? stored.answers
      : createEmptyAnswers();
  const answers = savedAnswers;
  const pickedAreaIds = new Set(
    getMappedAreas(answers.activityIds).map((area) => area.id),
  );
  const hasMappedPicks = answers.activityIds.length > 0 && pickedAreaIds.size > 0;
  const showingAll = forceAll || !hasMappedPicks;
  const visibleAreas = showingAll
    ? areas
    : areas.filter((area) => pickedAreaIds.has(area.id));
  const pickedLabels = answers.activityIds
    .flatMap((id) => {
      const option = activityOptions.find((activity) => activity.id === id);
      return option ? [option.label] : [];
    });
  const needsStorageNotice =
    stored.status === "invalid" || stored.status === "unavailable";
  const contextLabel = getContextLabel(answers.classContext);
  const changeChoicesHref = returnToGuided ? "/counselling" : "/discover";
  const changeChoicesLabel = returnToGuided
    ? "Change answers"
    : "Change my choices";

  function clearStoredChoices() {
    const cleared = clearAnswers();
    if (cleared) {
      router.replace("/discover");
      return true;
    }

    setClearNotice("We couldn’t clear the saved choices in this tab. Please try again.");
    return cleared;
  }

  return (
    <main
      aria-busy={!ready}
      className="cb-page-enter min-h-screen overflow-hidden bg-[#fbfaf6] text-[#18352d]"
    >
      <header className="bg-[#123f34] text-white">
        <div className="cb-container flex min-h-16 items-center justify-between gap-3 py-2">
          <Link
            href="/"
            className="font-serif text-xl font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2cf78] sm:text-2xl"
          >
            CareerBridge
          </Link>
          <Link
            href={changeChoicesHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 px-4 text-sm font-semibold transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2cf78]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {changeChoicesLabel}
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#123f34] pb-8 text-white sm:pb-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-36 -top-44 h-[31rem] w-[31rem] rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-28 h-[22rem] w-[22rem] rounded-full border border-[#f2cf78]/20"
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
                  href="/discover"
                  className="underline-offset-4 hover:underline"
                >
                  Discovery
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-medium text-white">
                Areas to Explore
              </li>
            </ol>
          </nav>

          <div className="mt-7 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(250px,340px)] md:items-end md:gap-10">
            <div className="max-w-4xl">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-[#f2cf78] sm:text-sm">
                <Sparkles aria-hidden="true" className="h-4 w-4" />
                Explore at your own pace
              </p>
              <h1 className="mt-3 font-serif text-[clamp(2.4rem,5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-.05em] text-white">
                Here are areas you can explore.
              </h1>
              <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-white/80 sm:text-base">
                These are starting points for browsing—not a test, a
                recommendation, or a decision about what you qualify for.
              </p>
            </div>
            <aside className="rounded-2xl border border-white/15 bg-white/[.07] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#f2cf78]">
                Your browsing context
              </p>
              <p className="mt-2 font-serif text-xl font-semibold text-white">
                {contextLabel}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Your class only organizes browsing. It does not determine
                eligibility.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <div className="cb-container pb-16 pt-7 sm:pb-20 sm:pt-10">
        {needsStorageNotice && (
          <div
            role="status"
            className="mb-7 rounded-xl border border-[#e7d5a8] bg-[#fff9eb] px-4 py-3 text-sm leading-relaxed text-[#4c3922]"
          >
            {stored.status === "invalid"
              ? "We couldn’t read earlier choices, so they haven’t been used. You’re seeing a broad list of areas."
              : "We couldn’t access choices saved in this tab. You’re seeing a broad list of areas."}
          </div>
        )}

        {clearNotice && (
          <p
            role="alert"
            className="mb-7 rounded-xl border border-[#c8954e] bg-[#fbf1df] px-4 py-3 text-sm leading-relaxed text-[#4c3922]"
          >
            {clearNotice}
          </p>
        )}

        {forceAll && pickedLabels.length > 0 && (
          <div className="mb-7 flex flex-wrap items-center gap-2 rounded-xl border border-[#d9ddd5] bg-white px-4 py-3 text-sm leading-relaxed text-[#59665e]">
            <Compass aria-hidden="true" className="h-4 w-4 shrink-0 text-[#145543]" />
            You’re browsing every area in neutral order. Your saved choices are
            unchanged.
          </div>
        )}

        <section aria-labelledby="areas-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
                {showingAll ? "Start anywhere" : "Possible starting points"}
              </p>
              <h2
                id="areas-title"
                className="mt-2 font-serif text-2xl font-semibold tracking-[-.035em] text-[#102d26] sm:text-3xl"
              >
                {showingAll
                  ? "Browse broad areas"
                  : "These areas may connect to what you picked"}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#59665e] sm:text-base">
                {showingAll
                  ? "No problem—let’s browse broadly. Every area stays open to you."
                  : "Your picks are only one way to start looking. They do not rank areas or hide other options."}
              </p>
            </div>
            {!forceAll && hasMappedPicks && (
              <Link
                href="/discover/results?mode=all"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#b8c8bd] bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Browse every area
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
          </div>

          {pickedLabels.length > 0 && !forceAll && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-[#59665e]">
                You picked:
              </span>
              {pickedLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-[#d9ddd5] bg-white px-3 py-1.5 text-sm text-[#354b40]"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleAreas.map((area, index) => {
              const relatedLabels = answers.activityIds
                .map((id) =>
                  activityOptions.find((activity) => activity.id === id),
                )
                .filter(
                  (activity): activity is (typeof activityOptions)[number] =>
                    activity !== undefined && activity.areaId === area.id,
                )
                .map((activity) => activity.label);

              return (
                <AreaCard
                  key={area.id}
                  area={area}
                  activityLabels={forceAll ? [] : relatedLabels}
                  index={index}
                />
              );
            })}
          </div>

          <p className="mt-5 max-w-4xl rounded-xl border border-[#e7d5a8] bg-[#fff9eb] px-4 py-3 text-sm leading-relaxed text-[#4c3922]">
            These ideas help you browse; they do not tell you which courses you
            qualify for. Course availability and entry requirements must be
            checked against current official information.
          </p>
        </section>

        {ready && <NextPathway context={answers.classContext} />}

        {!returnToGuided && (
          <section
            aria-labelledby="guided-explorer-title"
            className="mt-8 rounded-[1.5rem] border border-[#d9ddd5] bg-white p-5 sm:mt-10 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-7"
          >
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
                Optional · self-guided
              </p>
              <h2
                id="guided-explorer-title"
                className="mt-2 font-serif text-2xl font-semibold tracking-[-.035em] text-[#102d26]"
              >
                Want a step-by-step way to look around?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#59665e] sm:text-base">
                Guided Explorer is self-guided; no person is involved. You can
                skip questions and browse every area.
              </p>
            </div>
            <Link
              href="/counselling"
              className="mt-5 inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-[#b8c8bd] bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] sm:mt-0"
            >
              Try Guided Explorer
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </section>
        )}

        <section
          aria-label="Next steps"
          className="mt-12 flex flex-col gap-4 border-t border-[#d9ddd5] pt-6 sm:mt-16 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#18372e]">
              No need to decide today.
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#59665e]">
              Change your choices or keep browsing every area whenever you like.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {(stored.status === "saved" || stored.status === "invalid") && (
              <ClearChoicesButton
                onConfirm={clearStoredChoices}
                className="inline-flex min-h-12 items-center justify-center px-3 text-sm font-semibold text-[#59665e] underline underline-offset-4 transition-colors hover:text-[#145543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              />
            )}
            <Link
              href={changeChoicesHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#b8c8bd] bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {changeChoicesLabel}
            </Link>
            <Link
              href="/discover/results?mode=all"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Browse every area
              <Compass aria-hidden="true" className="h-4 w-4" />
            </Link>
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

export function ResultsLoading() {
  return (
    <main
      aria-busy="true"
      className="min-h-screen bg-[#fbfaf6] text-[#18352d]"
    >
      <header className="bg-[#123f34] text-white">
        <div className="cb-container py-4">
          <span className="font-serif text-xl font-semibold tracking-tight">
            CareerBridge
          </span>
        </div>
      </header>
      <section className="bg-[#123f34] pb-8 pt-5 text-white sm:pb-10 sm:pt-8">
        <div className="cb-container">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#f2cf78]">
            Explore at your own pace
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-.05em] sm:text-6xl">
            Here are areas you can explore.
          </h1>
          <p role="status" className="mt-4 text-sm text-white/80">
            Loading your saved browsing context. All broad areas remain open.
          </p>
        </div>
      </section>
      <div className="cb-container grid gap-4 py-8 sm:grid-cols-2 xl:grid-cols-3">
        {areas.map((area, index) => (
          <AreaCard
            key={area.id}
            area={area}
            activityLabels={[]}
            index={index}
          />
        ))}
      </div>
    </main>
  );
}
