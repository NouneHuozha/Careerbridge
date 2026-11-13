"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Breadcrumbs } from "../../../breadcrumbs";
import { useEducationStage } from "../../../education-stage";
import { SavedItemButton } from "../../saved-item-button";
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

const qualificationColors: Record<
  CourseQualification,
  { bg: string; text: string; dot: string }
> = {
  Degree: { bg: "bg-[#e8f4ed]", text: "text-[#145543]", dot: "bg-[#2d8a62]" },
  Diploma: {
    bg: "bg-[#e9effa]",
    text: "text-[#2b4c8c]",
    dot: "bg-[#4672c4]",
  },
  Certificate: {
    bg: "bg-[#fef3e2]",
    text: "text-[#7a4a10]",
    dot: "bg-[#d4890c]",
  },
  "Higher secondary": {
    bg: "bg-[#f3edf9]",
    text: "text-[#5b3a8a]",
    dot: "bg-[#8b63c4]",
  },
  Vocational: {
    bg: "bg-[#e6f4f1]",
    text: "text-[#185c52]",
    dot: "bg-[#2a9484]",
  },
  Professional: {
    bg: "bg-[#fde8ee]",
    text: "text-[#8a2846]",
    dot: "bg-[#c43f68]",
  },
  "Skill training": {
    bg: "bg-[#fef9e6]",
    text: "text-[#6d5a0f]",
    dot: "bg-[#b89a18]",
  },
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
  const [visibleCount, setVisibleCount] = useState(9);

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
    setVisibleCount(9);
  }
  function updateSearch(value: string) {
    setSearch(value);
    setVisibleCount(9);
  }
  function updateStage(value: StudyStage) {
    setStageSelection({ context: queryContext, value });
    setVisibleCount(9);
  }
  function updateField(value: string) {
    setFieldSelection({ context: queryContext, value });
    setVisibleCount(9);
  }
  function updateQualification(value: CourseQualification | "all") {
    setQualification(value);
    setVisibleCount(9);
  }

  const activeFilterCount =
    (search.trim().length > 0 ? 1 : 0) +
    (field !== "all" ? 1 : 0) +
    (qualification !== "all" ? 1 : 0) +
    (stageSelection?.context === queryContext && stage !== "all" ? 1 : 0);

  return (
    <main className="cb-page-enter min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <div className="cb-container pb-14 pt-5 sm:pb-20 sm:pt-7">
        <Breadcrumbs
          items={[
            { label: "Explore", href: "/explore" },
            { label: "Courses" },
          ]}
          className="!px-0"
        />

        {/* ── Hero ── */}
        <section className="mt-7" aria-labelledby="course-catalog-title">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#c8dece] bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.14em] text-[#3d7a5c] shadow-[0_1px_3px_rgba(16,45,36,0.06)]">
                <BookOpen aria-hidden="true" className="h-3 w-3" />
                Study options
              </div>
              <h1
                id="course-catalog-title"
                className="mt-3 font-serif text-4xl font-semibold tracking-[-.045em] sm:text-5xl"
              >
                Explore courses
              </h1>
              <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-[#59665e] sm:text-lg">
                Discover what you can study and understand the different
                programmes available after Class&nbsp;10 or Class&nbsp;12.
              </p>
            </div>
            <Link
              href="/explore/fields"
              className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-[#c8dece] bg-white/80 px-5 py-2.5 text-sm font-semibold text-[#145543] shadow-[0_1px_3px_rgba(16,45,36,0.06)] transition-all duration-200 hover:border-[#9fc5ad] hover:bg-white hover:shadow-[0_4px_12px_rgba(16,45,36,0.1)]"
            >
              Not sure? Explore fields
              <ArrowRight
                aria-hidden="true"
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          {/* ── Filter panel (full width) ── */}
          <div className="cc-filter-enter mt-7 overflow-hidden rounded-2xl border border-[#d6e0d9] bg-white shadow-[0_4px_24px_rgba(16,45,36,0.06)]">
            {/* Row 1 — search + stage pills */}
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
              <label className="group relative min-w-0 flex-1">
                <span className="sr-only">
                  Search by course, subject or field
                </span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#a5b5ac] transition-colors duration-200 group-focus-within:text-[#2d6e56]"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => updateSearch(e.target.value)}
                  placeholder="Search courses, subjects, fields…"
                  className="h-11 w-full rounded-xl border border-[#d4ddd7] bg-[#f8faf8] pl-11 pr-4 text-sm text-[#18352d] outline-none placeholder:text-[#aab8b1] transition-all duration-200 focus:border-[#2d6e56] focus:bg-white focus:shadow-[0_0_0_3px_rgba(45,110,86,0.12)]"
                />
              </label>

              <fieldset className="shrink-0">
                <legend className="sr-only">Study stage</legend>
                <div className="inline-flex items-center rounded-xl border border-[#d4ddd7] bg-[#f4f6f4] p-1">
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
                            className={`inline-flex h-9 select-none items-center rounded-[10px] px-4 text-sm font-semibold transition-all duration-200 ${
                              active
                                ? "bg-[#145543] text-white shadow-[0_2px_8px_rgba(20,85,67,0.25)]"
                                : "text-[#52715f] hover:bg-white/70 hover:text-[#145543]"
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

            {/* Divider */}
            <div className="relative mx-4 border-t border-[#e8ece9] sm:mx-5">
              <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1.5 bg-white px-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#8fa899]">
                <SlidersHorizontal aria-hidden="true" className="h-3 w-3" />
                Refine
              </span>
            </div>

            {/* Row 2 — dropdowns + clear */}
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:gap-5 sm:p-5">
              <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#7a8f83]">
                  Field of study
                </span>
                <select
                  value={field}
                  onChange={(e) => updateField(e.target.value)}
                  className="h-11 rounded-xl border border-[#d4ddd7] bg-[#f8faf8] px-3.5 text-sm text-[#29483a] outline-none transition-all duration-200 focus:border-[#2d6e56] focus:bg-white focus:shadow-[0_0_0_3px_rgba(45,110,86,0.12)]"
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
                  className="h-11 rounded-xl border border-[#d4ddd7] bg-[#f8faf8] px-3.5 text-sm text-[#29483a] outline-none transition-all duration-200 focus:border-[#2d6e56] focus:bg-white focus:shadow-[0_0_0_3px_rgba(45,110,86,0.12)]"
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
                  className="inline-flex h-11 shrink-0 items-center gap-2 self-end rounded-xl border border-[#e0cfc0] bg-[#fdf7f2] px-4 text-sm font-semibold text-[#8a5a28] transition-all duration-200 hover:border-[#d4b696] hover:bg-[#faf0e6] hover:shadow-[0_2px_8px_rgba(138,90,40,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                  Clear{activeFilterCount > 1 ? ` (${activeFilterCount})` : ""}
                </button>
              )}
            </div>

            {/* Guidance footer */}
            <div
              id="qualification-guidance"
              className="flex items-center gap-2 border-t border-[#eef1ef] bg-[#fafbfa] px-4 py-2.5 sm:px-5"
            >
              <span
                aria-hidden="true"
                className="inline-block h-1 w-1 shrink-0 rounded-full bg-[#b4c8bc]"
              />
              <p className="text-xs leading-5 text-[#8fa899]">
                {qualification === "all"
                  ? "Qualification labels are broad guides; check a provider for exact awards and entry rules."
                  : qualificationGuidance[qualification]}
              </p>
            </div>
          </div>
        </section>

        {/* ── Results ── */}
        <section className="mt-8" aria-labelledby="course-results-title">
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
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[#c8dece] bg-[#eef5f0] px-3.5 py-1 text-sm font-semibold text-[#235e47]"
              aria-live="polite"
            >
              <GraduationCap aria-hidden="true" className="h-3.5 w-3.5" />
              {filteredCourses.length}{" "}
              {filteredCourses.length === 1 ? "course" : "courses"}
            </span>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#c5d5cc] bg-white p-6 text-center sm:p-10">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0f6f2]">
                <Search aria-hidden="true" className="h-5 w-5 text-[#77b996]" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-semibold">
                No courses match those filters
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#59665e]">
                Try adjusting your search term, field, or qualification type to
                discover more options.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#b8d5c2] bg-[#f7fbf8] px-5 text-sm font-semibold text-[#145543] transition-all duration-200 hover:bg-[#eaf2ed]"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
                Clear all filters
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

              {/* Pagination */}
              <div className="mt-7 flex flex-col items-center gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-1 w-20 overflow-hidden rounded-full bg-[#e4ece7]">
                    <div
                      className="h-full rounded-full bg-[#77b996] transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.min(100, (visibleCourses.length / filteredCourses.length) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-[#6b7b71]" aria-live="polite">
                    {visibleCourses.length} of {filteredCourses.length}
                  </p>
                </div>
                {visibleCount < filteredCourses.length && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 9)}
                    className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-[#b8d5c2] bg-white px-6 text-sm font-semibold text-[#145543] transition-all duration-200 hover:bg-[#eaf2ed] hover:shadow-[0_2px_8px_rgba(16,45,36,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                  >
                    Show more courses
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </button>
                )}
              </div>
            </>
          )}

          <p className="mt-6 text-xs leading-relaxed text-[#9eada5]">
            Illustrative course options, not a verified live catalogue. Entry
            requirements and qualifications vary by programme and provider.
          </p>
        </section>
      </div>
    </main>
  );
}

/* ── Helpers ── */

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
  const colors = qualificationColors[course.qualification];
  const fieldName =
    possibilityFields.find((f) => f.id === course.fieldId)?.name ?? "";

  return (
    <article
      className="cb-reveal group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce7df] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#aad0b8] hover:shadow-[0_16px_40px_-8px_rgba(16,45,36,0.13)] motion-reduce:transform-none"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* Left accent bar */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 origin-bottom scale-y-0 rounded-r-sm bg-[#77b996] transition-transform duration-300 group-hover:scale-y-100"
      />

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* Badges */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${colors.bg} ${colors.text}`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${colors.dot}`}
            />
            {course.qualification}
          </span>
          {fieldName && (
            <span className="truncate rounded-full bg-[#f5f6f4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.06em] text-[#7d9285]">
              {fieldName}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-4 font-serif text-[1.3rem] font-semibold leading-snug tracking-[-.02em] transition-colors duration-200 group-hover:text-[#145543]">
          {course.name}
        </h3>

        {/* Description */}
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#59665e]">
          {course.description}
        </p>

        {/* Entry route */}
        <div className="mt-4 rounded-xl border border-[#e8ede9] bg-[#fafbfa] px-4 py-3">
          <div className="flex items-start gap-2 text-sm leading-relaxed">
            <ArrowRight
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#77b996]"
            />
            <span className="text-[#52645a]">
              <span className="font-semibold text-[#18352d]">Entry route</span>
              <span className="mx-1.5 text-[#c5d0ca]">·</span>
              {getEntryLabel(course, stage)}
            </span>
          </div>
        </div>

        {/* Illustrative note */}
        <p className="mt-2.5 text-[11px] italic text-[#b0bdb5]">
          {course.isExplorationCategory
            ? "Exploration category"
            : "Illustrative example — not a verified listing"}
        </p>

        {/* CTA */}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
          <Link href={detailsHref} className="cb-card-action">
            Explore course
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <SavedItemButton
            type="course"
            id={course.id}
            context={{ fieldId: course.fieldId, stage }}
            className="ml-auto"
          />
        </div>
      </div>
    </article>
  );
}
