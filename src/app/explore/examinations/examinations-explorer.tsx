"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Breadcrumbs } from "../../breadcrumbs";
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
const sortValues = ["relevance", "az", "za"] as const;
type SortOrder = (typeof sortValues)[number];

function isLevel(value: string | null): value is LevelFilter {
  return value !== null && levelValues.some((level) => level === value);
}

function isStageFilter(value: string | null): value is StageFilter {
  return value !== null && stageValues.some((stage) => stage === value);
}

function isSortOrder(value: string | null): value is SortOrder {
  return value !== null && sortValues.some((sort) => sort === value);
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
  const querySort = searchParams.get("sort");
  const sort: SortOrder = isSortOrder(querySort) ? querySort : "relevance";
  const region = searchParams.get("region") ?? "all";
  const courseContext =
    searchParams.get("course") ?? searchParams.get("courseName") ?? "";
  const searchQuery = searchParams.get("q") ?? courseContext;
  const fieldId = searchParams.get("field");
  const field = possibilityFields.find((item) => item.id === fieldId);
  const [visibleCount, setVisibleCount] = useState(pageSize);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredExaminations = examinations
    .filter((exam) => {
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
    })
    .sort((a, b) => {
      if (sort === "relevance") return 0;
      const order = a.name.localeCompare(b.name);
      return sort === "az" ? order : -order;
    });
  const visibleExaminations = filteredExaminations.slice(0, visibleCount);

  return (
    <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <Breadcrumbs
        items={[
          { label: "Explore", href: "/explore" },
          { label: "Examinations" },
        ]}
        className="pt-6 sm:pt-8"
      />

      <section className="bg-[#f5f7f2]">
        <div className="cb-container py-8 sm:py-10">
          <div className="exam-hero-copy">
            <h1 className="max-w-4xl font-serif text-4xl font-semibold leading-[1.05] tracking-[-.045em] sm:text-5xl">
              Understand entrance examinations.
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#354b40] sm:text-lg">
              Discover which examinations are used for different courses and how they work.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,48rem)_auto] md:items-center md:justify-start">
            <label className="flex min-h-13 items-center gap-3 rounded-xl border border-[#cbd8d0] bg-white px-4 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#145543]">
              <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-[#59665e]" />
              <span className="sr-only">Search examinations, courses or fields</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => updateParams({ q: event.target.value })}
                placeholder="Search examinations, courses or fields..."
                className="min-w-0 flex-1 bg-transparent text-base text-[#18352d] outline-none placeholder:text-[#718078]"
              />
            </label>

            <fieldset className="rounded-xl border border-[#dce7df] bg-white px-3 py-2">
              <legend className="sr-only">Study stage</legend>
              <p className="mb-1 text-xs font-medium text-[#59665e]">Study stage</p>
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
                      className={`min-h-8 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] ${
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
        <div className="border-t border-[#dce7df] pt-6 sm:pt-8">
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
            <span className="text-sm font-medium text-[#52645a]">
              {filteredExaminations.length}{" "}
              {filteredExaminations.length === 1
                ? "result"
                : "results"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#e5ebe7] pb-4">
            <span className="text-sm font-medium text-[#59665e]">Filter:</span>
            <label className="sr-only" htmlFor="examination-level-filter">
              Examination level
            </label>
            <select
              id="examination-level-filter"
              value={level}
              onChange={(event) => updateParams({ level: event.target.value })}
              className="min-h-10 rounded-xl border border-[#cbd9cf] bg-white px-3 text-sm text-[#18352d] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              <option value="all">All levels</option>
              <option value="national">National</option>
              <option value="state">State</option>
              <option value="institution">Institution-specific</option>
            </select>
            <label className="sr-only" htmlFor="examination-region-filter">
              State or region
            </label>
            <select
              id="examination-region-filter"
              value={region}
              onChange={(event) => updateParams({ region: event.target.value })}
              className="min-h-10 rounded-xl border border-[#cbd9cf] bg-white px-3 text-sm text-[#18352d] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              <option value="all">All Northeast</option>
              {northeastStates.map((stateName) => (
                <option key={stateName} value={stateName}>
                  {stateName}
                </option>
              ))}
            </select>

            <label className="ml-0 flex min-h-10 items-center gap-2 text-sm font-medium text-[#59665e] sm:ml-auto">
              Sort
              <select
                value={sort}
                onChange={(event) => updateParams({ sort: event.target.value })}
                className="min-h-10 rounded-xl border border-[#cbd9cf] bg-white px-3 text-sm text-[#18352d] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                <option value="relevance">Relevance</option>
                <option value="az">Name A–Z</option>
                <option value="za">Name Z–A</option>
              </select>
            </label>
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
                      className="cb-reveal exam-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce7df] bg-white p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-[#9fc5ad] hover:shadow-[0_16px_34px_rgba(16,45,36,0.1)] motion-reduce:transform-none sm:p-6"
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 origin-bottom scale-y-0 bg-[#77b996] transition-transform duration-300 group-hover:scale-y-100" />
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-serif text-[1.4rem] font-semibold leading-tight tracking-[-.025em]">
                          {exam.name}
                        </h3>
                        <span className="shrink-0 rounded-full bg-[#eaf2ed] px-3 py-1 text-xs font-semibold text-[#145543]">
                          {examinationLevels[exam.level]}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-[#52645a]">
                        {exam.purpose}
                      </p>
                      <dl className="mt-4 flex-1 space-y-3 rounded-xl border border-[#dce7df] bg-[#f5f8f5] px-3.5 py-3 text-sm leading-relaxed text-[#52645a]">
                        <div>
                          <dt className="font-semibold text-[#18352d]">
                            Used for
                          </dt>
                          <dd className="mt-1">
                            {exam.programmes.join(", ")}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-[#18352d]">
                            Conducted by
                          </dt>
                          <dd className="mt-1">{exam.authority}</dd>
                        </div>
                      </dl>
                      <div className="mt-5">
                        {exam.id === "jee-main" ? (
                          <Link
                            href={`/explore/examinations/${exam.id}?${searchParams.toString()}`}
                            className="cb-card-action"
                          >
                            Understand this examination
                            <ArrowRight aria-hidden="true" className="h-4 w-4" />
                          </Link>
                        ) : (
                          <span className="cb-card-action cb-card-action-disabled">
                            Examination details coming soon
                          </span>
                        )}
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
