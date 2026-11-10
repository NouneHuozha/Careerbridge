"use client";

import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Breadcrumbs } from "../../../breadcrumbs";
import { useEducationStage } from "../../../education-stage";
import { possibilityFields } from "../../../discover/possibility-fields";
import {
  courseCatalog,
  type CourseCatalogItem,
  type CourseCatalogStage,
  type CourseQualification,
} from "./course-catalog-data";

type StudyStage = CourseCatalogStage | "all";

const qualifications: CourseQualification[] = [
  "Degree",
  "Diploma",
  "Certificate",
  "Higher secondary",
  "Vocational",
  "Professional",
  "Skill training",
];

const qualificationGuidance: Record<CourseQualification, string> = {
  "Higher secondary":
    "School study after Class 10; subject combinations vary by board and school.",
  Degree:
    "A higher-education award; subjects, length and entry rules vary by programme.",
  Diploma:
    "A focused qualification that may combine technical or practical learning.",
  Certificate: "A provider-defined award; duration and recognition vary.",
  Vocational:
    "Practical preparation for a trade or work area; check the awarding authority.",
  Professional:
    "A programme for a particular profession, often with regulated entry rules.",
  "Skill training":
    "Focused practical learning; the provider determines syllabus and certification.",
};

export default function CourseCatalog() {
  const searchParams = useSearchParams();
  const queryContext = searchParams.toString();
  const requestedStage = searchParams.get("stage");
  const initialStage =
    requestedStage === "class-10" ||
    requestedStage === "class-12" ||
    requestedStage === "all"
      ? requestedStage
      : null;
  const requestedField = searchParams.get("field");
  const initialField =
    possibilityFields.find((item) => item.id === requestedField)?.id ?? "all";
  const savedEducation = useEducationStage();
  const savedStage: StudyStage =
    savedEducation.status === "saved" ? savedEducation.stage : "all";
  const [stageSelection, setStageSelection] = useState<{
    context: string;
    value: StudyStage;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [fieldSelection, setFieldSelection] = useState<{
    context: string;
    value: string;
  } | null>(null);
  const [qualification, setQualification] = useState<
    CourseQualification | "all"
  >("all");
  const [visibleCount, setVisibleCount] = useState(6);

  const stage =
    stageSelection?.context === queryContext
      ? stageSelection.value
      : initialStage ?? savedStage;
  const field =
    fieldSelection?.context === queryContext
      ? fieldSelection.value
      : initialField;

  const filteredCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return courseCatalog.filter((course) => {
      const matchesStage = stage === "all" || course.stages.includes(stage);
      const courseField = possibilityFields.find(
        (item) => item.id === course.fieldId,
      );
      const matchesSearch =
        !normalizedSearch ||
        `${course.name} ${course.description} ${courseField?.name ?? ""} ${course.qualification}`
          .toLocaleLowerCase()
          .includes(normalizedSearch);
      return (
        matchesStage &&
        matchesSearch &&
        (field === "all" || course.fieldId === field) &&
        (qualification === "all" || course.qualification === qualification)
      );
    });
  }, [field, qualification, search, stage]);

  const visibleCourses = filteredCourses.slice(0, visibleCount);
  const hasFilters =
    search.trim().length > 0 ||
    field !== "all" ||
    qualification !== "all" ||
    stageSelection?.context === queryContext;
  const stageLabel =
    stage === "all"
      ? "All stages"
      : stage === "class-10"
        ? "Class 10"
        : "Class 12";
  const sectionTitle =
    stage === "all"
      ? "Courses across study stages"
      : `Courses after ${stageLabel}`;

  function clearFilters() {
    setSearch("");
    setFieldSelection({ context: queryContext, value: "all" });
    setQualification("all");
    setStageSelection(null);
    setVisibleCount(6);
  }
  function updateSearch(value: string) {
    setSearch(value);
    setVisibleCount(6);
  }
  function updateStage(value: StudyStage) {
    setStageSelection({ context: queryContext, value });
    setVisibleCount(6);
  }
  function updateField(value: string) {
    setFieldSelection({ context: queryContext, value });
    setVisibleCount(6);
  }
  function updateQualification(value: CourseQualification | "all") {
    setQualification(value);
    setVisibleCount(6);
  }

  return (
    <main className="cb-page-enter min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <div className="cb-container pb-16 pt-5 sm:pb-24 sm:pt-8">
        <Breadcrumbs
          items={[
            { label: "Explore", href: "/explore" },
            { label: "Courses" },
          ]}
          className="!px-0"
        />

        {/* ── Hero ── */}
        <section className="mt-8" aria-labelledby="course-catalog-title">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#52715f]">
                Study options
              </p>
              <h1
                id="course-catalog-title"
                className="mt-2 font-serif text-4xl font-semibold tracking-[-.045em] sm:text-5xl"
              >
                Explore courses.
              </h1>
              <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-[#59665e] sm:text-lg">
                Discover what you can study and understand the different
                programmes available after Class&nbsp;10 or Class&nbsp;12.
              </p>
            </div>
            <Link
              href="/explore/fields"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#145543] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#145543]"
            >
              Not sure where to start? Explore fields
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          {/* ── Unified filter panel ── */}
          <div className="mt-8 max-w-6xl overflow-hidden rounded-2xl border border-[#dce7df] bg-white shadow-[0_2px_16px_rgba(16,45,36,0.07)]">
            {/* Row 1 — search + stage pills */}
            <div className="flex flex-col gap-4 px-5 pt-5 sm:flex-row sm:items-center sm:gap-5 sm:px-6 sm:pt-6">
              {/* Search */}
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">
                  Search by course, subject or field
                </span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9eada5]"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => updateSearch(e.target.value)}
                  placeholder="Search by course, subject or field…"
                  className="h-11 w-full rounded-xl border border-[#d4ddd7] bg-[#f9faf9] pl-10 pr-4 text-sm text-[#18352d] outline-none placeholder:text-[#aab8b1] transition-[border-color,box-shadow] duration-200 focus:border-[#2d6e56] focus:bg-white focus:shadow-[0_0_0_3px_rgba(119,185,150,0.18)]"
                />
              </label>

              {/* Stage pill group */}
              <fieldset className="shrink-0">
                <legend className="sr-only">Study stage</legend>
                <div className="flex items-center gap-1 rounded-xl border border-[#d4ddd7] bg-[#f9faf9] p-1">
                  {(["class-10", "class-12", "all"] as StudyStage[]).map(
                    (s) => {
                      const label =
                        s === "all"
                          ? "All"
                          : s === "class-10"
                            ? "Class 10"
                            : "Class 12";
                      const active = stage === s;
                      return (
                        <label key={s} className="cursor-pointer">
                          <input
                            type="radio"
                            name="study-stage"
                            value={s}
                            checked={active}
                            onChange={() => updateStage(s)}
                            className="sr-only"
                          />
                          <span
                            className={`inline-flex h-9 select-none items-center rounded-lg px-4 text-sm font-semibold transition-[background-color,color,box-shadow] duration-200 ${
                              active
                                ? "bg-[#145543] text-white shadow-sm"
                                : "text-[#4a6358] hover:bg-[#edf3ef] hover:text-[#145543]"
                            }`}
                          >
                            {label}
                          </span>
                        </label>
                      );
                    },
                  )}
                </div>
              </fieldset>
            </div>

            {/* Thin divider */}
            <div className="mx-5 my-4 border-t border-[#edf1ee] sm:mx-6" />

            {/* Row 2 — dropdowns + clear */}
            <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-6 sm:pb-5">
              <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#7a8f83]">
                  Field of study
                </span>
                <select
                  value={field}
                  onChange={(e) => updateField(e.target.value)}
                  className="h-11 rounded-xl border border-[#d4ddd7] bg-[#f9faf9] px-3.5 text-sm text-[#29483a] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[#2d6e56] focus:bg-white focus:shadow-[0_0_0_3px_rgba(119,185,150,0.18)]"
                >
                  <option value="all">All fields</option>
                  {possibilityFields.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#7a8f83]">
                  Qualification type
                </span>
                <select
                  id="course-qualification"
                  aria-describedby="qualification-guidance"
                  value={qualification}
                  onChange={(e) =>
                    updateQualification(
                      e.target.value as CourseQualification | "all",
                    )
                  }
                  className="h-11 rounded-xl border border-[#d4ddd7] bg-[#f9faf9] px-3.5 text-sm text-[#29483a] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[#2d6e56] focus:bg-white focus:shadow-[0_0_0_3px_rgba(119,185,150,0.18)]"
                >
                  <option value="all">All qualification types</option>
                  {qualifications.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-11 shrink-0 items-center gap-2 self-end rounded-xl border border-[#e9d8c8] bg-[#fdf8f4] px-4 text-sm font-semibold text-[#7a4218] transition-colors duration-150 hover:bg-[#faece0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                  Clear filters
                </button>
              )}
            </div>

            {/* Guidance note pinned to bottom of panel */}
            <p
              id="qualification-guidance"
              className="border-t border-[#f0f3f1] bg-[#f9faf9] px-5 py-3 text-xs leading-5 text-[#8fa899] sm:px-6"
            >
              {qualification === "all"
                ? "Qualification labels are broad guides; check a provider for exact awards and entry rules."
                : qualificationGuidance[qualification]}
            </p>
          </div>
        </section>

        {/* ── Results ── */}
        <section className="mt-10" aria-labelledby="course-results-title">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
            <div>
              <h2
                id="course-results-title"
                className="font-serif text-2xl font-semibold tracking-[-.035em] sm:text-3xl"
              >
                {sectionTitle}
              </h2>
              <p className="mt-1 text-sm text-[#6b7b71]">
                {stage === "all"
                  ? "Explore programmes with different entry routes."
                  : `Programmes with entry routes after ${stageLabel}.`}
              </p>
            </div>
            <span
              className="shrink-0 self-start rounded-full bg-[#eaf2ed] px-3.5 py-1 text-sm font-semibold text-[#145543]"
              aria-live="polite"
            >
              {filteredCourses.length}{" "}
              {filteredCourses.length === 1 ? "course" : "courses"}
            </span>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-[#dce7df] bg-white p-6">
              <h3 className="font-serif text-xl font-semibold">
                No courses match those filters.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                Try a different course or field, or clear the filters to see
                more options.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex min-h-11 items-center rounded-full border border-[#b8d5c2] bg-[#f7fbf8] px-4 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleCourses.map((course, index) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    stage={stage}
                    index={index}
                  />
                ))}
              </div>
              <div className="mt-8 flex flex-col items-center gap-2.5">
                <p className="text-sm text-[#6b7b71]" aria-live="polite">
                  Showing {visibleCourses.length} of {filteredCourses.length}{" "}
                  {filteredCourses.length === 1 ? "course" : "courses"}
                </p>
                {visibleCount < filteredCourses.length && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 6)}
                    className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-[#b8d5c2] bg-white px-6 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                  >
                    Load more
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    />
                  </button>
                )}
              </div>
            </>
          )}

          <p className="mt-7 text-xs leading-relaxed text-[#718078]">
            Illustrative course options, not a verified live catalogue. Entry
            requirements and qualifications vary by programme and provider.
          </p>
        </section>
      </div>
    </main>
  );
}

function getEntryLabel(course: CourseCatalogItem, stage: StudyStage) {
  if (stage === "all") return "Entry requirements vary by programme";
  return stage === "class-10"
    ? course.entryAfterClass10
    : course.entryAfterClass12;
}

function CourseCard({
  course,
  stage,
  index,
}: {
  course: (typeof courseCatalog)[number];
  stage: StudyStage;
  index: number;
}) {
  const detailsHref = `/explore/courses/catalog/${course.id}?stage=${stage}`;

  return (
    <article
      className="cb-reveal group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce7df] bg-white transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-[#9fc5ad] hover:shadow-[0_16px_40px_rgba(16,45,36,0.11)] motion-reduce:transform-none"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 origin-bottom scale-y-0 bg-[#77b996] transition-transform duration-300 group-hover:scale-y-100"
      />

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* Badges row */}
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-[#eaf2ed] px-3 py-1 text-xs font-semibold text-[#145543]">
            {course.qualification}
          </span>
          <span className="shrink-0 rounded-full bg-[#f4f6f4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.07em] text-[#7d9285]">
            {course.isExplorationCategory ? "Category" : "Illustrative"}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-4 font-serif text-[1.3rem] font-semibold leading-snug tracking-[-.02em]">
          {course.name}
        </h3>

        {/* Description */}
        <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
          {course.description}
        </p>

        {/* Entry route pill */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#f5f8f5] px-4 py-3 text-sm leading-relaxed">
          <span
            aria-hidden="true"
            className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#77b996]"
          />
          <span className="text-[#52645a]">
            <span className="font-semibold text-[#1b3f31]">Entry route</span>
            {" · "}
            {getEntryLabel(course, stage)}
          </span>
        </div>

        {/* CTA */}
        <div className="mt-auto pt-5">
          <Link href={detailsHref} className="cb-card-action">
            Explore course
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
