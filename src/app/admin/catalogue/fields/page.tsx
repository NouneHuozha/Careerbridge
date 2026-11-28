import { Suspense } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Files,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  getAdminFieldsDirectory,
  normalizeAdminFieldsFilters,
  type AdminFieldPublicationStatus,
  type AdminFieldsFilters,
} from "../../../../db/admin-fields";
import { FieldStatusBadge } from "./field-ui";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
} from "../../admin-ui";
import { AdminDate } from "../../admin-date";
import { CatalogueRetryButton } from "../retry-button";

type FieldsSearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(filters: AdminFieldsFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.publicationState !== "all") params.set("status", filters.publicationState);
  if (filters.reviewState !== "all") params.set("review", filters.reviewState);
  if (filters.sort !== "name_asc") params.set("sort", filters.sort);
  params.set("page", String(page));
  return `/admin/catalogue/fields?${params.toString()}`;
}

function mainStatus(record: {
  publicationStatus: AdminFieldPublicationStatus | null;
  publishedVersionAvailable: boolean;
}) {
  if (record.publishedVersionAvailable) return { label: "Published", tone: "published" as const };
  if (record.publicationStatus === "in_review" || record.publicationStatus === "approved") {
    return { label: "Needs review", tone: "review" as const };
  }
  if (record.publicationStatus === "archived") return { label: "Archived", tone: "archived" as const };
  return { label: "Draft", tone: "draft" as const };
}

function updateStatus(record: {
  latestRevisionId: string | null;
  publishedRevisionId: string | null;
  publicationStatus: AdminFieldPublicationStatus | null;
  publishedVersionAvailable: boolean;
}) {
  if (
    !record.publishedVersionAvailable ||
    !record.latestRevisionId ||
    record.latestRevisionId === record.publishedRevisionId
  ) return null;
  if (record.publicationStatus === "in_review" || record.publicationStatus === "approved") {
    return { label: "Update needs review", tone: "review" as const };
  }
  if (record.publicationStatus === "draft" || record.publicationStatus === "rejected") {
    return { label: "Draft update", tone: "draft" as const };
  }
  return null;
}

function FieldsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <AdminPageHeader
        eyebrow="Catalogue / Fields"
        title="Fields"
        description="Manage field information shown to students."
      />
      <Link
        href="/admin/catalogue/fields/new"
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#205a50] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#286c60] sm:mb-6"
      >
        <Plus aria-hidden="true" className="size-4" />
        Add New Field
      </Link>
    </div>
  );
}

export default function CatalogueFieldsPage({
  searchParams,
}: {
  searchParams: FieldsSearchParams;
}) {
  return (
    <Suspense fallback={<FieldsPageFallback />}>
      <FieldsDirectory searchParams={searchParams} />
    </Suspense>
  );
}

async function FieldsDirectory({ searchParams }: { searchParams: FieldsSearchParams }) {
  const params = await searchParams;
  const filters = normalizeAdminFieldsFilters({
    search: firstValue(params.q),
    publicationState: firstValue(params.status),
    reviewState: firstValue(params.review),
    sort: firstValue(params.sort),
    page: Number(firstValue(params.page)),
  });

  let directory: Awaited<ReturnType<typeof getAdminFieldsDirectory>>;
  try {
    directory = await getAdminFieldsDirectory(filters);
  } catch (error) {
    console.error(
      "[careerbridge-next] Admin fields query failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return (
      <div className="space-y-6">
        <FieldsHeader />
        <section
          role="alert"
          aria-labelledby="admin-fields-error-heading"
          className="rounded-xl border border-[#dce5e0] bg-white p-5 sm:p-7"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#8a6c2e]" />
            <div>
              <h2 id="admin-fields-error-heading" className="text-xl font-semibold text-[#17364a]">
                Fields are temporarily unavailable
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#526b72]">
                We could not load catalogue records. Your data has not been changed.
              </p>
              <CatalogueRetryButton />
            </div>
          </div>
        </section>
      </div>
    );
  }

  const { metrics, records, totalFiltered, page, pageCount, pageSize } = directory;
  const firstRecord = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(page * pageSize, totalFiltered);

  return (
    <div className="space-y-6 sm:space-y-8">
      <FieldsHeader />

      <section aria-labelledby="fields-overview-heading" className="space-y-3">
        <h2 id="fields-overview-heading" className="text-base font-semibold text-[#17364a]">
          Overview
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AdminMetricCard
            label="Total Fields"
            value={metrics.totalRecords}
            detail="Field identities in the catalogue"
            icon={Files}
            accentClass="bg-[#eaf2ed] text-[#286c60]"
          />
          <AdminMetricCard
            label="Published"
            value={metrics.publishedRecords}
            detail="Records with a published version"
            icon={CircleCheck}
            accentClass="bg-[#eaf2ed] text-[#286c60]"
          />
          <AdminMetricCard
            label="Need review"
            value={metrics.needsReviewRecords}
            detail="Saved versions ready for admin review"
            icon={ShieldCheck}
            accentClass="bg-[#fff0c2] text-[#8b4b08]"
          />
          </dl>
      </section>

      <AdminSectionCard
        id="all-fields"
        title="All Fields"
        description="Find Fields by name and see which saved versions are ready to review."
        action={
          <span className="inline-flex min-h-7 items-center rounded-full border border-[#dce5e0] bg-[#f5f8f6] px-2.5 text-[11px] font-semibold text-[#637572]">
            {metrics.totalRecords.toLocaleString("en-IN")} records
          </span>
        }
      >
        <form
          action="/admin/catalogue/fields"
          method="get"
          className="space-y-3 border-b border-[#e7ede9] pb-5"
        >
          <label htmlFor="field-search" className="block text-xs font-medium text-[#526b72]">
          Search by Field name
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71817d]" />
              <input
                id="field-search"
                name="q"
                type="search"
                maxLength={120}
                defaultValue={filters.search}
                placeholder="Search Fields..."
                className="min-h-11 w-full rounded-lg border border-[#d7e1dc] bg-white py-2 pl-10 pr-3 text-sm text-[#17364a] outline-none placeholder:text-[#879590] focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
              />
            </div>
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#205a50] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#286c60]"
            >
              Apply filters
            </button>
            {(filters.search || filters.publicationState !== "all" ||
              filters.reviewState !== "all" || filters.sort !== "name_asc") && (
              <Link
                href="/admin/catalogue/fields"
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
                <option value="unpublished">Not published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-[#526b72]">
              Review state
              <select
                name="review"
                defaultValue={filters.reviewState}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm font-normal text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
              >
                <option value="all">All review states</option>
                <option value="needs_review">Needs review</option>
                <option value="draft">Draft</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-[#526b72]">
              Sort
              <select
                name="sort"
                defaultValue={filters.sort}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm font-normal text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
              >
                <option value="name_asc">Name A–Z</option>
                <option value="name_desc">Name Z–A</option>
                <option value="created_desc">Newest</option>
                <option value="created_asc">Oldest</option>
                <option value="updated_desc">Recently updated</option>
              </select>
            </label>
          </div>
        </form>

        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#17364a]">Field records</h3>
            <p className="text-xs text-[#657976]" aria-live="polite">
              {totalFiltered.toLocaleString("en-IN")} {totalFiltered === 1 ? "result" : "results"}
            </p>
          </div>

          {records.length === 0 ? (
            <AdminEmptyState
              title="No fields match these filters"
              description="Try a different search or clear the filters to see all Field records."
              icon={Search}
            />
          ) : (
            <ul className="divide-y divide-[#edf1ee]">
              {records.map((record) => {
                const status = mainStatus(record);
                const update = updateStatus(record);
                return (
                <li key={record.catalogItemId}>
                  <Link
                    href={`/admin/catalogue/fields/${encodeURIComponent(record.id)}`}
                    className="group -mx-2 flex min-h-24 flex-col justify-center gap-2 rounded-lg px-2 py-4 transition-colors hover:bg-[#f8faf8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#377b78] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-[#17364a] group-hover:text-[#286c60]">
                        {record.title ?? "Untitled field"}
                      </span>
                      {record.summary && (
                        <span className="mt-1 block line-clamp-2 text-sm leading-5 text-[#657976]">
                          {record.summary}
                        </span>
                      )}
                      <span className="mt-2 flex flex-wrap items-center gap-2">
                        <FieldStatusBadge tone={status.tone}>{status.label}</FieldStatusBadge>
                        {update && <FieldStatusBadge tone={update.tone}>{update.label}</FieldStatusBadge>}
                        <span className="text-xs font-medium text-[#526b72]">
                          {record.revisionNumber === null
                            ? "No revision"
                            : `Revision ${record.revisionNumber}`}
                        </span>
                        {record.dataClassification && record.dataClassification !== "real" && (
                          <FieldStatusBadge tone="muted">
                            {record.dataClassification === "demo" ? "Demo data" : "Test data"}
                          </FieldStatusBadge>
                        )}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                      <span className="text-xs text-[#657976]">
                        Updated <AdminDate value={record.updatedAt} />
                        {record.provenanceCount > 0 && (
                          <span className="ml-2">
                            · {record.provenanceCount} source {record.provenanceCount === 1 ? "claim" : "claims"}
                          </span>
                        )}
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 shrink-0 text-[#71817d] transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
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
              <nav aria-label="Field record pages" className="flex items-center gap-2">
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

function FieldsPageFallback() {
  return (
    <div aria-busy="true" aria-label="Loading fields" className="space-y-5">
      <div className="h-28 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
      <div className="h-32 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
      <div className="h-96 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
    </div>
  );
}
