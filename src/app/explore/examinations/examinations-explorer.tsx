"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Filter,
  GraduationCap,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { Breadcrumbs } from "../../breadcrumbs";
import { SavedItemButton } from "../saved-item-button";
import { useEducationStage } from "../../education-stage";
import { possibilityFields } from "../../discover/possibility-fields";
import {
  examinations,
  examinationLevels,
  northeastStates,
} from "./examination-data";

const pageSize = 6;
const levelValues = ["all", "national", "state", "institution"] as const;
type LevelFilter = (typeof levelValues)[number];
const stageValues = ["class-10", "class-12", "all"] as const;
type StageFilter = (typeof stageValues)[number];

function isLevel(value: string | null): value is LevelFilter {
  return value !== null && levelValues.some((level) => level === value);
}

function isStageFilter(value: string | null): value is StageFilter {
  return value !== null && stageValues.some((stage) => stage === value);
}

export default function ExaminationsExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const savedEducation = useEducationStage();
  const queryStage = searchParams.get("stage");
  const savedStage =
    savedEducation.status === "saved"
      ? savedEducation.stage
      : null;
  const stage: StageFilter = isStageFilter(queryStage)
    ? queryStage
    : savedStage ?? "all";
  const queryLevel = searchParams.get("level");
  const level: LevelFilter = isLevel(queryLevel) ? queryLevel : "all";
  const region = searchParams.get("region") ?? "all";
  const courseContext =
    searchParams.get("course") ?? searchParams.get("courseName") ?? "";
  const searchQuery = searchParams.get("q") ?? courseContext;
  const fieldId = searchParams.get("field");
  const field = possibilityFields.find((item) => item.id === fieldId);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const filterParams = new URLSearchParams(searchParams.toString());
  filterParams.delete("sort");

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(filterParams);
    for (const [key, value] of Object.entries(updates)) {
      if (key === "stage" && value === "all") {
        params.set(key, value);
        continue;
      }
      if (key === "q" && courseContext) {
        params.set(key, value);
        continue;
      }
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
    }
    router.replace(`/explore/examinations?${params.toString()}`, {
      scroll: false,
    });
    setVisibleCount(pageSize);
  }

  function clearFilters() {
    updateParams({
      q: courseContext,
      level: "all",
      region: "all",
    });
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredExaminations = examinations.filter((exam) => {
    const matchesStage = stage === "all" || exam.stages.includes(stage);
    const matchesLevel = level === "all" || exam.level === level;
    const matchesRegion =
      region === "all" ||
      exam.level === "national" ||
      exam.regions.includes(region);
    const matchesField =
      !field || exam.fields.length === 0 || exam.fields.includes(field.id);
    const searchableText = [
      exam.name,
      exam.purpose,
      exam.authority,
      ...exam.programmes,
      ...exam.fields,
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery =
      !normalizedQuery || searchableText.includes(normalizedQuery);
    return (
      matchesStage &&
      matchesLevel &&
      matchesRegion &&
      matchesField &&
      matchesQuery
    );
  });
  const visibleExaminations = filteredExaminations.slice(0, visibleCount);
  const hasFilters =
    level !== "all" ||
    region !== "all" ||
    searchQuery.trim() !== courseContext.trim();
  const levelCount = new Set(examinations.map((exam) => exam.level)).size;

  return (
    <main className="cb-page-enter min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <Breadcrumbs
        items={[
          { label: "Explore", href: "/explore" },
          { label: "Examinations" },
        ]}
        className="pt-6 sm:pt-8"
      />

      <section className="border-b border-[#e0e6e2] bg-[#fbfaf6]">
        <div className="cb-container pb-8 pt-6 sm:pb-10 sm:pt-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#c8dece] bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.14em] text-[#3d7a5c] shadow-[0_1px_3px_rgba(16,45,36,0.06)]">
                <ClipboardCheck aria-hidden="true" className="h-3 w-3" />
                Admissions
              </div>
              <h1 className="mt-3 font-serif text-4xl font-semibold leading-[1.05] tracking-[-.045em] sm:text-5xl">
                Understand entrance examinations.
              </h1>
              <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-[#4a5a50] sm:text-lg">
                See which examinations are used for different courses and what
                to check before you apply.
              </p>
            </div>
            <div className="flex shrink-0 gap-5">
              <div className="text-center">
                <p className="font-serif text-3xl font-semibold text-[#145543]">
                  {examinations.length}
                </p>
                <p className="mt-0.5 text-xs font-medium text-[#6b7b71]">
                  Exams listed
                </p>
              </div>
              <div className="w-px bg-[#d6ddd9]" />
              <div className="text-center">
                <p className="font-serif text-3xl font-semibold text-[#145543]">
                  {levelCount}
                </p>
                <p className="mt-0.5 text-xs font-medium text-[#6b7b71]">
                  Exam levels
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="group flex min-h-13 items-center gap-3 rounded-xl border border-[#c5cfc8] bg-white px-4 shadow-[0_2px_12px_rgba(16,45,36,0.05)] transition-all duration-200 focus-within:border-[#2d6e56] focus-within:shadow-[0_0_0_3px_rgba(45,110,86,0.12)]">
              <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-[#9eada5] transition-colors group-focus-within:text-[#2d6e56]" />
              <span className="sr-only">Search examinations, courses or fields</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => updateParams({ q: event.target.value })}
                placeholder="Search examinations, courses or fields…"
                className="min-w-0 flex-1 bg-transparent text-base text-[#18352d] outline-none placeholder:text-[#aab8b1]"
              />
              {searchQuery !== courseContext && searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => updateParams({ q: courseContext })}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#718078] transition-colors hover:bg-[#f0f3f0] hover:text-[#29483a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </label>

            <fieldset className="min-w-0 rounded-xl border border-[#dce7df] bg-white px-3 py-2.5">
              <legend className="sr-only">Study stage</legend>
              <p className="mb-1.5 text-xs font-semibold text-[#60766a]">Study stage</p>
              <div className="flex flex-wrap gap-1">
                {stageValues.map((option) => {
                  const label =
                    option === "all"
                      ? "All"
                      : option === "class-10"
                        ? "Class 10"
                        : "Class 12";
                  const active = stage === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={active}
                      onClick={() => updateParams({ stage: option })}
                      className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] ${
                        active
                          ? "bg-[#145543] text-white"
                          : "bg-[#f1f3f0] text-[#354b40] hover:bg-[#e6eee8]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#59665e]">
            {savedStage
              ? `Your saved education stage is ${savedStage === "class-10" ? "Class 10" : "Class 12"}. Changing this view won't update your profile.`
              : "No saved education stage was found, so all stages are shown. Changing this view won't update your profile."}
          </p>
          {(field || courseContext) && (
            <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-sm text-[#52645a]">
              Showing results with your {field ? `${field.name} field` : "course"} context
              {courseContext ? `: ${courseContext}` : ""}.
            </p>
          )}
        </div>
      </section>

      <section
        className="cb-container pb-10 sm:pb-14"
        aria-labelledby="browse-exams-title"
      >
        <div className="pt-6 sm:pt-8">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2
                id="browse-exams-title"
                className="font-serif text-2xl font-semibold tracking-[-.035em] sm:text-3xl"
              >
                Examinations after{" "}
                {stage === "all"
                  ? "all stages"
                  : stage === "class-10"
                    ? "Class 10"
                    : "Class 12"}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[#59665e]">
                Examinations relevant to your education journey.
              </p>
            </div>
            <span
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[#c8dece] bg-[#eef5f0] px-3.5 py-1 text-sm font-semibold text-[#235e47]"
              aria-live="polite"
            >
              <ClipboardCheck aria-hidden="true" className="h-3.5 w-3.5" />
              {filteredExaminations.length}{" "}
              {filteredExaminations.length === 1
                ? "result"
                : "results"}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-[#dce7df] bg-white px-4 py-3 shadow-[0_1px_4px_rgba(16,45,36,0.04)]">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[.1em] text-[#7a8f83]">
              <Filter aria-hidden="true" className="h-3 w-3" />
              Filter
            </span>
            <div aria-hidden="true" className="hidden h-5 w-px bg-[#e4ece7] sm:block" />
            <label className="flex min-h-10 items-center text-sm text-[#59665e]">
              <select
                id="examination-level-filter"
                aria-label="Examination level"
                value={level}
                onChange={(event) => updateParams({ level: event.target.value })}
                className="min-h-10 max-w-full rounded-xl border border-[#d4ddd7] bg-[#f8faf8] px-3 text-sm text-[#29483a] outline-none transition-all duration-200 focus:border-[#2d6e56] focus:bg-white focus:shadow-[0_0_0_3px_rgba(45,110,86,0.12)]"
              >
                <option value="all">All levels</option>
                <option value="national">National</option>
                <option value="state">State</option>
                <option value="institution">Institution-specific</option>
              </select>
            </label>
            <label className="flex min-h-10 items-center text-sm text-[#59665e]">
              <select
                id="examination-region-filter"
                aria-label="State or region"
                value={region}
                onChange={(event) => updateParams({ region: event.target.value })}
                className="min-h-10 max-w-full rounded-xl border border-[#d4ddd7] bg-[#f8faf8] px-3 text-sm text-[#29483a] outline-none transition-all duration-200 focus:border-[#2d6e56] focus:bg-white focus:shadow-[0_0_0_3px_rgba(45,110,86,0.12)]"
              >
                <option value="all">All Northeast</option>
                {northeastStates.map((stateName) => (
                  <option key={stateName} value={stateName}>
                    {stateName}
                  </option>
                ))}
              </select>
            </label>
            {hasFilters && (
              <>
                <div aria-hidden="true" className="hidden h-5 w-px bg-[#e4ece7] sm:block" />
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#e0cfc0] bg-[#fdf7f2] px-3 text-sm font-semibold text-[#8a5a28] transition-colors hover:bg-[#faf0e6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                  Clear
                </button>
              </>
            )}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-[#59665e]">
            Sample records are illustrative and may not reflect current requirements. Confirm details with the conducting authority and institution.
          </p>

          {visibleExaminations.length > 0 ? (
            <>
              <div className="mt-5 grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visibleExaminations.map((exam, index) => (
                <article
                  key={exam.id}
                  className="cb-reveal exam-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce7df] bg-white transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-[#9fc5ad] hover:shadow-[0_16px_40px_-8px_rgba(16,45,36,0.12)] motion-reduce:transform-none motion-reduce:transition-none"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-1 origin-bottom scale-y-0 rounded-r-sm bg-[#77b996] transition-transform duration-300 group-hover:scale-y-100 group-focus-within:scale-y-100 motion-reduce:transition-none"
                  />
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-[#eaf2ed] px-3 py-1 text-xs font-semibold text-[#145543]">
                        {examinationLevels[exam.level]}
                      </span>
                      <span className="rounded-full bg-[#f3eed9] px-3 py-1 text-xs font-semibold text-[#6d5a1e]">
                        {exam.stages
                          .map((examStage) =>
                            examStage === "class-10" ? "Class 10" : "Class 12",
                          )
                          .join(" · ")}
                      </span>
                    </div>
                    <h3 className="mt-4 font-serif text-[1.35rem] font-semibold leading-snug tracking-[-.025em] transition-colors duration-200 group-hover:text-[#145543]">
                      {exam.name}
                    </h3>
                    <p className="mt-2.5 min-h-[3.5rem] text-sm leading-relaxed text-[#59665e]">
                      {exam.purpose}
                    </p>

                    <dl className="mt-5 flex-1 divide-y divide-[#e4ece7] border-y border-[#e4ece7] text-sm">
                      <div className="flex items-start gap-3 py-3">
                        <GraduationCap
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#9eada5]"
                        />
                        <div className="min-w-0">
                          <dt className="font-semibold text-[#18352d]">Used for</dt>
                          <dd className="mt-0.5 leading-relaxed text-[#52645a]">
                            {exam.programmes.join(", ")}
                          </dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 py-3">
                        <Building2
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#9eada5]"
                        />
                        <div className="min-w-0">
                          <dt className="font-semibold text-[#18352d]">Conducted by</dt>
                          <dd className="mt-0.5 leading-relaxed text-[#52645a]">
                            {exam.authority}
                          </dd>
                        </div>
                      </div>
                      {exam.regions.length > 0 && (
                        <div className="flex items-start gap-3 py-3">
                          <MapPin
                            aria-hidden="true"
                            className="mt-0.5 h-4 w-4 shrink-0 text-[#9eada5]"
                          />
                          <div className="min-w-0">
                            <dt className="font-semibold text-[#18352d]">Region</dt>
                            <dd className="mt-0.5 leading-relaxed text-[#52645a]">
                              {exam.regions.join(", ")}
                            </dd>
                          </div>
                        </div>
                      )}
                    </dl>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      {exam.id === "jee-main" ? (
                        <Link
                          href={`/explore/examinations/${exam.id}?${filterParams.toString()}`}
                          className="cb-card-action"
                        >
                          Understand this examination
                          <ArrowRight aria-hidden="true" className="h-4 w-4" />
                        </Link>
                      ) : (
                        <span className="cb-card-action cb-card-action-disabled">
                          Details coming soon
                        </span>
                      )}
                      <SavedItemButton
                        type="examination"
                        id={exam.id}
                        className="ml-auto"
                        context={{
                          ...(stage !== "all" ? { stage } : {}),
                          ...(field ? { fieldId: field.id } : {}),
                        }}
                      />
                    </div>
                  </div>
                </article>
              ))}
              </div>
              {filteredExaminations.length > visibleCount && (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((count) => count + pageSize)
                  }
                  className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full border border-[#145543] px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  Load more examinations
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <div className="mt-5 rounded-2xl border border-[#dce7df] bg-white p-6 sm:p-8">
              <h3 className="font-serif text-2xl font-semibold tracking-[-.03em]">
                No matching sample examinations
              </h3>
              <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-[#59665e]">
                We don&apos;t have a verified sample for these filters yet.
                Not every course requires an entrance examination; some use
                merit-based admission or another selection process. Try
                changing the stage, filters or search.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#eaf2ed]">
        <div className="cb-container py-9 sm:py-12">
          <p className="text-sm font-semibold text-[#145543]">
            Explore your options at your own pace
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
            Not every course requires an entrance examination.
          </h2>
          <p className="mt-3 max-w-[68ch] text-base leading-relaxed text-[#354b40]">
            Some institutions use merit-based admission or other selection
            processes. Requirements depend on the particular course and
            institution.
          </p>
        </div>
      </section>

      <footer className="bg-[#18352d] px-5 py-9 text-center text-[#f7f8f5]">
        <p className="font-serif text-2xl tracking-[-.03em] sm:text-3xl">
          Take your time. Curiosity is a good place to start.
        </p>
      </footer>
    </main>
  );
}
