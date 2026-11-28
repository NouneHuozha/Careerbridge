import { Suspense } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Files,
  Plus,
  Search,
} from "lucide-react";
import {
  getAdminCoursesDirectory,
  normalizeAdminCoursesFilters,
  type AdminCourseRecord,
  type AdminCoursesFilters,
} from "../../../../db/admin-courses";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
} from "../../admin-ui";
import { AdminDate } from "../../admin-date";
import { CatalogueRetryButton } from "../retry-button";

type CoursesSearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(filters: AdminCoursesFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.publicationState !== "all") params.set("status", filters.publicationState);
  if (filters.fieldId) params.set("field", filters.fieldId);
  if (filters.qualification) params.set("qualification", filters.qualification);
  if (filters.entryStage !== "all") params.set("stage", filters.entryStage);
  if (filters.sort !== "updated_desc") params.set("sort", filters.sort);
  if (filters.pageSize !== 10) params.set("pageSize", String(filters.pageSize));
  params.set("page", String(page));
  return `/admin/catalogue/courses?${params.toString()}`;
}

function CourseStatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "published" | "review" | "draft" | "archived";
}) {
  const toneClass = {
    published: "border-[#9ed9b7] bg-[#d8f6e3] text-[#17643a]",
    review: "border-[#f2c56b] bg-[#fff0c2] text-[#8b4b08]",
    draft: "border-[#9dc9f4] bg-[#e1f1ff] text-[#175b91]",
    archived: "border-[#d7dfdc] bg-[#eef2f0] text-[#586b65]",
  }[tone];

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-semibold leading-none ${toneClass}`}>
      {children}
    </span>
  );
}

function courseStatuses(record: AdminCourseRecord) {
  if (record.publishedVersionAvailable) {
    const hasUnpublishedUpdate =
      record.latestRevisionId !== record.publishedRevisionId;
    const update =
      hasUnpublishedUpdate && (record.publicationStatus === "in_review" || record.publicationStatus === "approved")
        ? { label: "Update needs review", tone: "review" as const }
        : hasUnpublishedUpdate && record.publicationStatus === "rejected"
          ? { label: "Update rejected", tone: "review" as const }
          : hasUnpublishedUpdate && record.publicationStatus === "draft"
            ? { label: "Draft update", tone: "draft" as const }
            : null;
    return {
      primary: { label: "Published", tone: "published" as const },
      secondary: update,
    };
  }
  if (record.publicationStatus === "in_review" || record.publicationStatus === "approved") {
    return {
      primary: { label: "Needs Review", tone: "review" as const },
      secondary: null,
    };
  }
  if (record.publicationStatus === "archived") {
    return {
      primary: { label: "Archived", tone: "archived" as const },
      secondary: null,
    };
  }
  return {
    primary: { label: "Draft", tone: "draft" as const },
    secondary: record.publicationStatus === "rejected"
      ? { label: "Rejected", tone: "review" as const }
      : null,
  };
}

function stageLabel(stage: string) {
  if (stage === "class-10") return "After Class 10";
  if (stage === "class-12") return "After Class 12";
  return stage;
}

function CoursesHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <AdminPageHeader
        eyebrow="Catalogue / Courses"
        title="Courses"
        description="Manage educational programmes and qualifications."
      />
      <div className="mb-6 flex shrink-0 flex-col items-start gap-1">
        <button
          type="button"
          disabled
          aria-describedby="course-create-unavailable"
          className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white opacity-60"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add New Course
        </button>
        <span id="course-create-unavailable" className="text-xs text-[#657976]">
          Course creation is outside this listing scope.
        </span>
      </div>
    </div>
  );
}

export default function CoursesCataloguePage({
  searchParams,
}: {
  searchParams: CoursesSearchParams;
}) {
  return (
    <Suspense fallback={<CoursesPageFallback />}>
      <CoursesDirectory searchParams={searchParams} />
    </Suspense>
  );
}

async function CoursesDirectory({ searchParams }: { searchParams: CoursesSearchParams }) {
  const params = await searchParams;
  const filters = normalizeAdminCoursesFilters({
    search: firstValue(params.q),
    publicationState: firstValue(params.status),
    fieldId: firstValue(params.field),
    qualification: firstValue(params.qualification),
    entryStage: firstValue(params.stage),
    sort: firstValue(params.sort),
    page: Number(firstValue(params.page)),
    pageSize: Number(firstValue(params.pageSize)),
  });

  let directory: Awaited<ReturnType<typeof getAdminCoursesDirectory>>;
  try {
    directory = await getAdminCoursesDirectory(filters);
  } catch (error) {
    console.error(
      "[careerbridge-next] Admin Courses query failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return (
      <div className="space-y-6">
        <CoursesHeader />
        <section
          role="alert"
          aria-labelledby="admin-courses-error-heading"
          className="rounded-xl border border-[#dce5e0] bg-white p-5 sm:p-7"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#8a6c2e]" />
            <div>
              <h2 id="admin-courses-error-heading" className="text-xl font-semibold text-[#17364a]">
                Courses are temporarily unavailable
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#526b72]">
                We could not load Course records. No catalogue data has been changed.
              </p>
              <CatalogueRetryButton />
            </div>
          </div>
        </section>
      </div>
    );
  }

  const { metrics, fields, qualifications, records, totalFiltered, page, pageCount, pageSize } = directory;
  const firstRecord = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(page * pageSize, totalFiltered);

  return (
    <div className="space-y-6 sm:space-y-8">
      <CoursesHeader />

      <section aria-labelledby="courses-overview-heading" className="space-y-3">
        <h2 id="courses-overview-heading" className="text-base font-semibold text-[#17364a]">
          Overview
        </h2>
        <dl className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="Total Courses"
            value={metrics.totalCourses}
            detail="Real Course records in the catalogue"
            icon={Files}
            accentClass="bg-[#eaf2ed] text-[#286c60]"
          />
          <AdminMetricCard
            label="Published"
            value={metrics.publishedCourses}
            detail="Currently visible to students"
            icon={CircleCheck}
            accentClass="bg-[#d8f6e3] text-[#17643a]"
          />
          <AdminMetricCard
            label="Needs Review"
            value={metrics.needsReviewCourses}
            detail="New or updated versions awaiting publication"
            icon={Clock3}
            accentClass="bg-[#fff0c2] text-[#8b4b08]"
          />
          <AdminMetricCard
            label="Drafts"
            value={metrics.draftCourses}
            detail="Versions still being prepared"
            icon={BookOpenText}
            accentClass="bg-[#e1f1ff] text-[#175b91]"
          />
        </dl>
      </section>

      <AdminSectionCard
        id="all-courses"
        title="All Courses"
        description="Search real Course records and see their publication state."
        action={
          <span className="inline-flex min-h-7 items-center rounded-full border border-[#dce5e0] bg-[#f5f8f6] px-2.5 text-[11px] font-semibold text-[#637572]">
            {metrics.totalCourses.toLocaleString("en-IN")} records
          </span>
        }
      >
        <form
          action="/admin/catalogue/courses"
          method="get"
          className="space-y-3 border-b border-[#e7ede9] pb-5"
        >
          <label htmlFor="course-search" className="block text-xs font-medium text-[#526b72]">
            Search by Course name, qualification or record ID
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71817d]" />
              <input
                id="course-search"
                name="q"
                type="search"
                maxLength={120}
                defaultValue={filters.search}
                placeholder="Search Courses..."
                className="min-h-11 w-full rounded-lg border border-[#d7e1dc] bg-white py-2 pl-10 pr-3 text-sm text-[#17364a] outline-none placeholder:text-[#879590] focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
              />
            </div>
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#205a50] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#286c60]"
            >
              Apply filters
            </button>
            {(filters.search || filters.publicationState !== "all" || filters.fieldId ||
              filters.qualification || filters.entryStage !== "all" || filters.sort !== "updated_desc" ||
              filters.pageSize !== 10) && (
              <Link
                href="/admin/catalogue/courses"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d7e1dc] px-4 text-sm font-semibold text-[#526b72] transition-colors hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
              >
                Clear
              </Link>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className="block text-xs font-medium text-[#526b72]">
              Publication status
              <select
                name="status"
                defaultValue={filters.publicationState}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm font-normal text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
              >
                <option value="all">All publication states</option>
                <option value="published">Published</option>
                <option value="needs_review">Needs Review</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-[#526b72]">
              Field
              <select
                name="field"
                defaultValue={filters.fieldId}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm font-normal text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
              >
                <option value="">All Fields</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>{field.title}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-[#526b72]">
              Qualification
              <select
                name="qualification"
                defaultValue={filters.qualification}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm font-normal text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
              >
                <option value="">All qualifications</option>
                {qualifications.map((qualification) => (
                  <option key={qualification} value={qualification}>{qualification}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-[#526b72]">
              Entry stage
              <select
                name="stage"
                defaultValue={filters.entryStage}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm font-normal text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
              >
                <option value="all">All entry stages</option>
                <option value="class-10">After Class 10</option>
                <option value="class-12">After Class 12</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-[#526b72]">
              Sort
              <select
                name="sort"
                defaultValue={filters.sort}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm font-normal text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
              >
                <option value="updated_desc">Recently updated</option>
                <option value="updated_asc">Oldest updated</option>
                <option value="name_asc">Name A–Z</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-[#526b72]">
              Records per page
              <select
                name="pageSize"
                defaultValue={filters.pageSize}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm font-normal text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
        </form>

        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#17364a]">Course records</h3>
            <p className="text-xs text-[#657976]" aria-live="polite">
              {totalFiltered.toLocaleString("en-IN")} {totalFiltered === 1 ? "result" : "results"}
            </p>
          </div>

          {records.length === 0 ? (
            <AdminEmptyState
              title={metrics.totalCourses === 0 ? "No real Courses available" : "No Courses match these filters"}
              description={
                metrics.totalCourses === 0
                  ? "There are no real Course records to list yet. Demo and test records are intentionally excluded."
                  : "Try a different search or clear the filters to see all real Course records."
              }
              icon={metrics.totalCourses === 0 ? BookOpenText : Search}
            />
          ) : (
            <ul className="divide-y divide-[#edf1ee] border-y border-[#edf1ee]">
              <li
                aria-hidden="true"
                className="hidden grid-cols-[minmax(210px,1.8fr)_minmax(150px,1.25fr)_minmax(120px,0.9fr)_minmax(110px,0.9fr)_minmax(90px,0.7fr)_auto] gap-x-5 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#657976] xl:grid"
              >
                <span>Course</span>
                <span>Course information</span>
                <span>Publication</span>
                <span>Last updated</span>
                <span>Institutions</span>
                <span>Action</span>
              </li>
              {records.map((record) => {
                const statuses = courseStatuses(record);
                const abbreviation = record.title.match(/\(([^()]*)\)\s*$/)?.[1];
                return (
                  <li key={record.catalogItemId}>
                    <Link
                      href={`/admin/catalogue/courses/${encodeURIComponent(record.id)}`}
                      className="grid gap-x-5 gap-y-3 px-3 py-4 transition-colors hover:bg-[#f8faf8] focus-visible:bg-[#f8faf8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#377b78] sm:grid-cols-2 xl:grid-cols-[minmax(210px,1.8fr)_minmax(150px,1.25fr)_minmax(120px,0.9fr)_minmax(110px,0.9fr)_minmax(90px,0.7fr)_auto]"
                    >
                    <div className="min-w-0 sm:col-span-2 xl:col-span-1">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#657976] xl:hidden">
                        Course
                      </span>
                      <span className="block font-semibold text-[#17364a]">{record.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#657976]">
                        {abbreviation && (
                          <span className="font-semibold text-[#286c60]">{abbreviation}</span>
                        )}
                        <span>ID: {record.id}</span>
                        <span>Revision {record.revisionNumber}</span>
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#657976] xl:hidden">
                        Course information
                      </span>
                      <span className="block text-sm font-medium text-[#405a5e]">{record.qualification}</span>
                      <span className="mt-1 block text-xs text-[#657976]">{record.fieldTitle}</span>
                      <span className="mt-1 block text-xs text-[#657976]">
                        {record.stages.length > 0
                          ? record.stages.map(stageLabel).join(" · ")
                          : "Entry stage not specified"}
                      </span>
                    </div>
                    <div>
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#657976] xl:hidden">
                        Publication
                      </span>
                      <div className="flex flex-wrap items-start gap-1.5">
                        <CourseStatusBadge tone={statuses.primary.tone}>
                          {statuses.primary.label}
                        </CourseStatusBadge>
                        {statuses.secondary && (
                          <CourseStatusBadge tone={statuses.secondary.tone}>
                            {statuses.secondary.label}
                          </CourseStatusBadge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-[#526b72]">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#657976] xl:hidden">
                        Last updated
                      </span>
                      <AdminDate value={record.updatedAt} />
                    </div>
                    <div className="text-sm text-[#405a5e]">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#657976] xl:hidden">
                        Institutions
                      </span>
                      {record.institutionCount.toLocaleString("en-IN")}{" "}
                      {record.institutionCount === 1 ? "institution" : "institutions"}
                    </div>
                    <div className="flex items-end justify-start xl:items-center xl:justify-end">
                      <span className="mb-1 mr-2 text-[10px] font-semibold uppercase tracking-wide text-[#657976] xl:hidden">
                        Action
                      </span>
                      <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d7e1dc] px-3 text-xs font-semibold text-[#286c60]">
                        Open Course
                        <ArrowUpRight aria-hidden="true" className="size-3.5" />
                      </span>
                    </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {records.length > 0 && (
            <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7ede9] pt-4">
              <p className="text-xs text-[#657976]">
                Showing {firstRecord.toLocaleString("en-IN")}–{lastRecord.toLocaleString("en-IN")} of{" "}
                {totalFiltered.toLocaleString("en-IN")}
              </p>
              <nav aria-label="Course record pages" className="flex items-center gap-2">
                <Link
                  aria-disabled={page <= 1}
                  tabIndex={page <= 1 ? -1 : undefined}
                  href={pageHref(filters, Math.max(1, page - 1))}
                  scroll={false}
                  className={`inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78] ${
                    page <= 1
                      ? "pointer-events-none border-[#e4e9e6] text-[#a2ada9]"
                      : "border-[#d7e1dc] text-[#526b72] hover:bg-[#f4f7f5]"
                  }`}
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  Previous
                </Link>
                <span className="px-1 text-xs tabular-nums text-[#657976]">
                  {page} / {pageCount}
                </span>
                <Link
                  aria-disabled={page >= pageCount}
                  tabIndex={page >= pageCount ? -1 : undefined}
                  href={pageHref(filters, Math.min(pageCount, page + 1))}
                  scroll={false}
                  className={`inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78] ${
                    page >= pageCount
                      ? "pointer-events-none border-[#e4e9e6] text-[#a2ada9]"
                      : "border-[#d7e1dc] text-[#526b72] hover:bg-[#f4f7f5]"
                  }`}
                >
                  Next
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Link>
              </nav>
            </footer>
          )}
        </div>
      </AdminSectionCard>
    </div>
  );
}

function CoursesPageFallback() {
  return (
    <div aria-busy="true" aria-label="Loading Courses" className="space-y-5">
      <div className="h-28 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
      <div className="h-36 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
      <div className="h-96 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
    </div>
  );
}
