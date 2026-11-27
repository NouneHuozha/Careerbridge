"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  filterCatalogueListingRecords,
  getCatalogueListingPageCount,
  paginateCatalogueListingRecords,
  type CatalogueListingFilter,
  type CatalogueListingRecord,
} from "./listing-utils";
import type { CatalogueCategorySlug } from "./catalogue-preview-data";
import { useAdminWorkspacePreferences } from "../workspace-preferences-provider";
import { AdminDate } from "../admin-date";

type Props = {
  categorySlug: CatalogueCategorySlug;
  categoryLabel: string;
  categoryName: string;
  records: CatalogueListingRecord[];
  filters: CatalogueListingFilter[];
};

const publicationLabels: Record<string, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

const verificationLabels: Record<string, string> = {
  not_collected: "Not collected",
  unverified: "Not reviewed",
  pending_review: "Pending review",
  verified: "Verified",
  partially_verified: "Partially verified",
  disputed: "Disputed",
  unavailable: "Unavailable",
  stale: "Stale",
  expired: "Expired",
  superseded: "Superseded",
};

function ListingStatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "info" | "muted";
}) {
  const toneClasses = {
    success: "border-[#cfe3da] bg-[#edf6f1] text-[#286c60]",
    warning: "border-[#eadfbd] bg-[#fbf6e8] text-[#80652e]",
    danger: "border-[#ead4d0] bg-[#fbefed] text-[#8b5147]",
    info: "border-[#d4e0ea] bg-[#eef4f8] text-[#496b85]",
    muted: "border-[#dce5e0] bg-[#f5f8f6] text-[#637572]",
  }[tone];

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-semibold leading-none ${toneClasses}`}>
      {label}
    </span>
  );
}

function publicationTone(status: string): "success" | "warning" | "danger" | "info" | "muted" {
  if (status === "published") return "success";
  if (status === "in_review") return "warning";
  if (status === "approved") return "info";
  if (status === "rejected") return "danger";
  return "muted";
}

function verificationTone(status: string): "success" | "warning" | "danger" | "info" | "muted" {
  if (status === "verified") return "success";
  if (status === "pending_review" || status === "partially_verified") return "warning";
  if (status === "disputed" || status === "expired" || status === "stale") return "danger";
  if (status === "unavailable" || status === "not_collected") return "info";
  return "muted";
}

function RecordActions({
  categorySlug,
  record,
}: {
  categorySlug: CatalogueCategorySlug;
  record: CatalogueListingRecord;
}) {
  const recordHref = `/admin/catalogue/${categorySlug}/${record.id}`;
  const canCreateRevision = ["published", "archived", "rejected"].includes(
    record.publicationStatus,
  );
  const editLabel =
    record.publicationStatus === "draft"
      ? "Edit draft revision"
      : "Create new draft revision";

  return (
    <details className="relative">
      <summary
        aria-label={`More actions for ${record.title}`}
        className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-[#dce5e0] text-[#50696c] transition-colors hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
      >
        <MoreHorizontal aria-hidden="true" className="size-5" />
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-64 rounded-lg border border-[#dce5e0] bg-white p-2 shadow-lg">
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#71817d]">
          Preview actions · nothing is saved
        </p>
        <Link
          href={recordHref}
          className="block rounded-md px-2 py-2 text-sm font-medium text-[#405a5e] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
        >
          Open record
        </Link>
        {record.publicationStatus === "in_review" ? (
          <Link
            href={`/admin/review/${categorySlug}/${record.id}`}
            className="block rounded-md px-2 py-2 text-sm font-medium text-[#405a5e] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
          >
            Open review workspace
          </Link>
        ) : canCreateRevision || record.publicationStatus === "draft" ? (
          <Link
            href={`${recordHref}/edit`}
            className="block rounded-md px-2 py-2 text-sm font-medium text-[#405a5e] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
          >
            {editLabel}
          </Link>
        ) : (
          <span
            aria-disabled="true"
            title="The current lifecycle state does not offer a revision editor."
            className="block cursor-not-allowed rounded-md px-2 py-2 text-sm text-[#7b8985]"
          >
            Revision editing unavailable
          </span>
        )}
        <Link
          href={`${recordHref}?tab=revisions`}
          className="block rounded-md px-2 py-2 text-sm font-medium text-[#405a5e] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
        >
          View revision history
        </Link>
      </div>
    </details>
  );
}

function RecordDetails({
  record,
}: {
  record: CatalogueListingRecord;
}) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      {record.details.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="text-[#788884]">{label}</dt>
          <dd className="mt-0.5 truncate font-medium text-[#405a5e]" title={value}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function CategoryListingPreview({
  categorySlug,
  categoryLabel,
  categoryName,
  records,
  filters,
}: Props) {
  const { preferences } = useAdminWorkspacePreferences();
  const [query, setQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<"updated" | "name">("updated");
  const [manualPageSize, setManualPageSize] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = manualPageSize ?? preferences.recordsPerPage;

  const filteredRecords = useMemo(
    () => filterCatalogueListingRecords(records, query, selectedFilters, sortBy),
    [records, query, selectedFilters, sortBy],
  );
  const pageCount = getCatalogueListingPageCount(filteredRecords.length, pageSize);
  const currentPage = Math.min(page, pageCount);
  const visibleRecords = paginateCatalogueListingRecords(filteredRecords, currentPage, pageSize);
  const publishedCount = records.filter((record) => record.publicationStatus === "published").length;
  const inReviewCount = records.filter((record) => record.publicationStatus === "in_review").length;
  const activeFilterCount =
    Object.values(selectedFilters).filter(Boolean).length + (query.trim() ? 1 : 0);
  const firstRecord = filteredRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRecord = Math.min(currentPage * pageSize, filteredRecords.length);

  function updateFilter(key: string, value: string) {
    setSelectedFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setSelectedFilters({});
    setSortBy("updated");
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <section aria-label={`${categoryName} preview summary`} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Preview records", value: records.length, detail: "Sample rows only" },
          { label: "Published", value: publishedCount, detail: "In this preview" },
          { label: "In review", value: inReviewCount, detail: "In this preview" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-[#dce5e0] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)]">
            <p className="text-sm font-medium text-[#526b72]">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold leading-none tracking-[-0.04em] tabular-nums text-[#17364a]">
              {metric.value.toLocaleString("en-IN")}
            </p>
            <p className="mt-2 text-xs text-[#657976]">{metric.detail}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby={`${categorySlug}-records-heading`} className="overflow-hidden rounded-xl border border-[#dce5e0] bg-white shadow-[0_1px_2px_rgba(23,54,74,0.04)]">
        <div className="border-b border-[#e7ede9] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id={`${categorySlug}-records-heading`} className="text-base font-semibold text-[#17364a]">
                {categoryName}
              </h2>
              <p className="mt-1 text-sm text-[#657976]">
                Search by {categoryLabel.toLowerCase()} name, stable ID or external alias.
              </p>
            </div>
            <ListingStatusBadge label="Preview data" tone="info" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[minmax(15rem,1.3fr)_repeat(2,minmax(9rem,1fr))] xl:grid-cols-[minmax(18rem,1.5fr)_repeat(5,minmax(8rem,1fr))]">
            <label className="relative block min-w-0">
              <span className="sr-only">Search {categoryName.toLowerCase()} records</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71817d]" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, ID or alias"
                className="h-11 w-full rounded-lg border border-[#d7e1dc] bg-white pl-10 pr-3 text-sm text-[#17364a] outline-none transition focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
              />
            </label>
            {filters.map((filter) => (
              <label key={filter.key} className="min-w-0">
                <span className="sr-only">{filter.label} filter</span>
                <select
                  value={selectedFilters[filter.key] ?? ""}
                  onChange={(event) => updateFilter(filter.key, event.target.value)}
                  className="h-11 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm text-[#405a5e] outline-none transition focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
                >
                  <option value="">All {filter.label.toLowerCase()}</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-sm text-[#657976]">
              <SlidersHorizontal aria-hidden="true" className="size-4 shrink-0" />
              <span>
                {filteredRecords.length.toLocaleString("en-IN")} preview{" "}
                {filteredRecords.length === 1 ? "record" : "records"}
              </span>
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-[#edf3ef] px-2 py-0.5 text-xs font-semibold text-[#456963]">
                  {activeFilterCount} active
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-[#657976]">
                <span>Sort</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as "updated" | "name")}
                  className="h-10 rounded-lg border border-[#d7e1dc] bg-white px-2.5 text-sm font-medium text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
                >
                  <option value="updated">Recently updated</option>
                  <option value="name">Name A–Z</option>
                </select>
              </label>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="min-h-10 rounded-lg px-2 text-sm font-semibold text-[#377b78] transition-colors hover:bg-[#f1f6f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div role="status" className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-[#edf3ef] text-[#377b78]">
              <Search aria-hidden="true" className="size-5" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-[#17364a]">No matching {categoryName.toLowerCase()} records</h3>
            <p className="mt-1 max-w-md text-sm leading-5 text-[#657976]">
              Try a broader name, stable ID or alias, or remove one of the selected filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 min-h-10 rounded-lg border border-[#cbdcd4] px-3 text-sm font-semibold text-[#377b78] transition-colors hover:bg-[#f1f6f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
            >
              Clear search and filters
            </button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <caption className="sr-only">Preview {categoryName.toLowerCase()} catalogue records</caption>
                <thead className="border-b border-[#e7ede9] bg-[#f7f9f7] text-[11px] uppercase tracking-[0.1em] text-[#617572]">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 font-semibold">{categoryLabel}</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">{categoryLabel} information</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Publication</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Verification</th>
                    <th scope="col" className="px-5 py-3.5 font-semibold">Last updated</th>
                    <th scope="col" className="px-5 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1ee]">
                  {visibleRecords.map((record) => (
                    <tr key={record.id} className="align-top transition-colors hover:bg-[#fbfcfb]">
                      <td className="max-w-[18rem] px-5 py-4">
                        <p className="font-semibold leading-5 text-[#17364a]">{record.title}</p>
                        <p className="mt-1.5 font-mono text-[11px] text-[#71817d]">{record.id}</p>
                        {record.aliases.map((alias) => (
                          <span key={alias} className="mt-1 inline-block rounded bg-[#f1f5f2] px-1.5 py-0.5 font-mono text-[10px] text-[#526b72]">
                            {alias}
                          </span>
                        ))}
                      </td>
                      <td className="max-w-[16rem] px-5 py-4">
                        <dl className="space-y-1.5">
                          {record.details.map(({ label, value }) => (
                            <div key={label} className="flex gap-2 text-xs">
                              <dt className="shrink-0 text-[#788884]">{label}</dt>
                              <dd className="truncate font-medium text-[#405a5e]" title={value}>{value}</dd>
                            </div>
                          ))}
                        </dl>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <ListingStatusBadge
                          label={publicationLabels[record.publicationStatus] ?? record.publicationStatus}
                          tone={publicationTone(record.publicationStatus)}
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <ListingStatusBadge
                          label={verificationLabels[record.verificationStatus] ?? record.verificationStatus}
                          tone={verificationTone(record.verificationStatus)}
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#526b72]">
                        <AdminDate value={record.updatedAt} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/catalogue/${categorySlug}/${record.id}`}
                            className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-[#377b78] hover:bg-[#f1f6f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
                          >
                            Open
                          </Link>
                          <RecordActions categorySlug={categorySlug} record={record} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-[#edf1ee] lg:hidden">
              {visibleRecords.map((record) => (
                <li key={record.id} className="p-4 sm:p-5">
                  <article>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold leading-5 text-[#17364a]">{record.title}</h3>
                        <p className="mt-1.5 font-mono text-[11px] text-[#71817d]">{record.id}</p>
                        {record.aliases.map((alias) => (
                          <span key={alias} className="mt-1 inline-block rounded bg-[#f1f5f2] px-1.5 py-0.5 font-mono text-[10px] text-[#526b72]">
                            {alias}
                          </span>
                        ))}
                      </div>
                      <RecordActions categorySlug={categorySlug} record={record} />
                    </div>
                    <RecordDetails record={record} />
                    <Link
                      href={`/admin/catalogue/${categorySlug}/${record.id}`}
                      className="mt-3 inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-[#377b78] hover:bg-[#f1f6f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
                    >
                      Open record
                    </Link>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <ListingStatusBadge
                        label={publicationLabels[record.publicationStatus] ?? record.publicationStatus}
                        tone={publicationTone(record.publicationStatus)}
                      />
                      <ListingStatusBadge
                        label={verificationLabels[record.verificationStatus] ?? record.verificationStatus}
                        tone={verificationTone(record.verificationStatus)}
                      />
                    </div>
                    <p className="mt-3 text-xs text-[#657976]">
                      Updated <AdminDate value={record.updatedAt} />
                    </p>
                  </article>
                </li>
              ))}
            </ul>

            <footer className="flex flex-col gap-3 border-t border-[#e7ede9] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs text-[#657976]">
                Showing {firstRecord.toLocaleString("en-IN")}–{lastRecord.toLocaleString("en-IN")} of{" "}
                {filteredRecords.length.toLocaleString("en-IN")} preview records
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-[#657976]">
                  <span>Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setManualPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="h-9 rounded-lg border border-[#d7e1dc] bg-white px-2 text-sm text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </label>
                <nav aria-label={`${categoryName} record pages`} className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    className="grid size-9 place-items-center rounded-lg border border-[#d7e1dc] text-[#526b72] transition-colors hover:bg-[#f4f7f5] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ChevronLeft aria-hidden="true" className="size-4" />
                  </button>
                  <span aria-current="page" className="grid size-9 place-items-center rounded-lg bg-[#eaf2ed] text-sm font-semibold tabular-nums text-[#286c60]">
                    {currentPage}
                  </span>
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={currentPage >= pageCount}
                    onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                    className="grid size-9 place-items-center rounded-lg border border-[#d7e1dc] text-[#526b72] transition-colors hover:bg-[#f4f7f5] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <ChevronRight aria-hidden="true" className="size-4" />
                  </button>
                </nav>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
