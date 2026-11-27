"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { AdminEmptyState } from "../admin-ui";
import { AdminDate } from "../admin-date";
import type { SourcePreviewRecord } from "./source-preview-data";
import {
  getSourceMaintenanceIssues,
  type SourceSortKey,
} from "./source-utils";

const authorityLabels = {
  official: "Official",
  government: "Government",
  institutional: "Institutional",
  other: "Other",
} as const;

function SourceStatusBadge({ source }: { source: SourcePreviewRecord }) {
  const needsChecking =
    source.status === "active" && getSourceMaintenanceIssues(source).length > 0;
  const label = source.status === "inactive" ? "Inactive" : needsChecking ? "Needs checking" : "Active";
  const toneClass =
    source.status === "inactive"
      ? "border-[#dce5e0] bg-[#f5f8f6] text-[#637572]"
      : needsChecking
        ? "border-[#eadfbd] bg-[#fbf6e8] text-[#80652e]"
        : "border-[#cfe3da] bg-[#edf6f1] text-[#286c60]";

  return (
    <span
      className={`inline-flex min-h-7 items-center whitespace-nowrap rounded-full border px-2.5 text-[11px] font-semibold ${toneClass}`}
    >
      {label}
    </span>
  );
}

function SourceActions({ source }: { source: SourcePreviewRecord }) {
  const sourceHref = `/admin/sources/${source.id}`;

  return (
    <details className="relative">
      <summary
        aria-label={`Actions for ${source.name}`}
        className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-[#dce5e0] text-[#50696c] transition-colors hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
      >
        <MoreHorizontal aria-hidden="true" className="size-5" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-[#dce5e0] bg-white p-2 shadow-lg">
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#71817d]">
          Preview only
        </p>
        <Link
          href={sourceHref}
          className="block rounded-md px-2 py-2 text-sm font-medium text-[#405a5e] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
        >
          View source
        </Link>
        <Link
          href={`${sourceHref}/edit`}
          className="block rounded-md px-2 py-2 text-sm font-medium text-[#405a5e] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
        >
          Edit source
        </Link>
        <Link
          href={`${sourceHref}/history`}
          className="block rounded-md px-2 py-2 text-sm font-medium text-[#405a5e] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
        >
          Check history
        </Link>
      </div>
    </details>
  );
}

function DesktopSourceTable({ sources }: { sources: SourcePreviewRecord[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-[#e3eae6] lg:block">
      <table className="w-full min-w-[820px] border-collapse text-left">
        <thead className="bg-[#f7f9f7]">
          <tr className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">
            <th scope="col" className="px-4 py-3">Source</th>
            <th scope="col" className="px-4 py-3">Classification</th>
            <th scope="col" className="px-4 py-3">Source type</th>
            <th scope="col" className="px-4 py-3">Last checked</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e7ede9]">
          {sources.map((source) => (
            <tr key={source.id} className="align-middle">
              <th scope="row" className="px-4 py-3.5 font-normal">
                <Link
                  href={`/admin/sources/${source.id}`}
                  className="font-semibold text-[#17364a] hover:text-[#286c60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
                >
                  {source.name}
                </Link>
                <span className="mt-1 block max-w-xs truncate text-xs text-[#71817d]">
                  {new URL(source.url).hostname}
                </span>
              </th>
              <td className="px-4 py-3.5 text-sm text-[#526b72]">
                {authorityLabels[source.authorityCategory]}
              </td>
              <td className="px-4 py-3.5 text-sm text-[#526b72]">{source.sourceType}</td>
              <td className="whitespace-nowrap px-4 py-3.5 text-sm text-[#526b72]">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 aria-hidden="true" className="size-3.5 text-[#82918d]" />
                  <AdminDate value={source.lastCheckedAt} fallback="Not checked" />
                </span>
              </td>
              <td className="px-4 py-3.5"><SourceStatusBadge source={source} /></td>
              <td className="px-4 py-3.5 text-right"><SourceActions source={source} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileSourceCards({ sources }: { sources: SourcePreviewRecord[] }) {
  return (
    <ul className="space-y-3 lg:hidden">
      {sources.map((source) => (
        <li key={source.id} className="rounded-lg border border-[#e3eae6] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/admin/sources/${source.id}`}
                className="break-words font-semibold text-[#17364a] hover:text-[#286c60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
              >
                {source.name}
              </Link>
              <p className="mt-1 break-all text-xs text-[#71817d]">{new URL(source.url).hostname}</p>
            </div>
            <SourceStatusBadge source={source} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-[#71817d]">Classification</dt>
              <dd className="mt-1 text-[#405a5e]">{authorityLabels[source.authorityCategory]}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#71817d]">Source type</dt>
              <dd className="mt-1 text-[#405a5e]">{source.sourceType}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#71817d]">Last checked</dt>
              <dd className="mt-1 text-[#405a5e]">
                <AdminDate value={source.lastCheckedAt} fallback="Not checked" />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#71817d]">Issuing organisation</dt>
              <dd className="mt-1 break-words text-[#405a5e]">{source.issuingOrganisation}</dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-end border-t border-[#e7ede9] pt-3">
            <SourceActions source={source} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SourceDirectoryResults({
  sources,
  totalCount,
  firstRow,
  lastRow,
  page,
  pageCount,
  rowsPerPage,
  sortBy,
  onPageChange,
  onRowsPerPageChange,
  onSortChange,
}: {
  sources: SourcePreviewRecord[];
  totalCount: number;
  firstRow: number;
  lastRow: number;
  page: number;
  pageCount: number;
  rowsPerPage: number;
  sortBy: SourceSortKey;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (value: number) => void;
  onSortChange: (value: SourceSortKey) => void;
}) {
  if (totalCount === 0) {
    return (
      <AdminEmptyState
        title="No sources match these filters"
        description="Try another search or broaden the classification, authority, status or last-checked filters."
        icon={Search}
      />
    );
  }

  return (
    <div className="space-y-4">
      <DesktopSourceTable sources={sources} />
      <MobileSourceCards sources={sources} />
      <div className="flex flex-col gap-4 border-t border-[#e7ede9] pt-4 xl:flex-row xl:items-center xl:justify-between">
        <p className="text-sm text-[#657976]" aria-live="polite">
          Showing {firstRow}–{lastRow} of {totalCount}{" "}
          {totalCount === 1 ? "source" : "sources"}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <label className="flex min-h-10 items-center gap-2 text-xs text-[#657976]">
            <span>Rows</span>
            <select
              aria-label="Rows per page"
              value={rowsPerPage}
              onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
              className="h-10 rounded-lg border border-[#d7e1dc] bg-white px-2 text-sm text-[#405a5e] focus:border-[#4c8980] focus:outline-none focus:ring-2 focus:ring-[#4c8980]/15"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
          <label className="flex min-h-10 items-center gap-2 text-xs text-[#657976]">
            <span>Sort</span>
            <select
              aria-label="Sort sources"
              value={sortBy}
              onChange={(event) => {
                const sortOptions: SourceSortKey[] = [
                  "last_checked_desc",
                  "last_checked_asc",
                  "name_asc",
                ];
                const value = sortOptions.find((option) => option === event.target.value);
                if (value) onSortChange(value);
              }}
              className="h-10 min-w-0 rounded-lg border border-[#d7e1dc] bg-white px-2 text-sm text-[#405a5e] focus:border-[#4c8980] focus:outline-none focus:ring-2 focus:ring-[#4c8980]/15"
            >
              <option value="last_checked_desc">Last checked: newest</option>
              <option value="last_checked_asc">Last checked: oldest</option>
              <option value="name_asc">Name: A–Z</option>
            </select>
          </label>
          <nav aria-label="Sources pagination" className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#dce5e0] px-3 text-sm font-medium text-[#526b72] hover:bg-[#f4f7f5] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              Previous
            </button>
            <span className="px-1 text-sm tabular-nums text-[#657976]">
              {page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page === pageCount}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#dce5e0] px-3 text-sm font-medium text-[#526b72] hover:bg-[#f4f7f5] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
            >
              Next
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
