"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { AdminEmptyState } from "../admin-ui";
import { AdminDate } from "../admin-date";
import type { ReviewQueueEntry, ReviewQueueStatus } from "./review-queue-utils";

const statusLabels: Record<ReviewQueueStatus, string> = {
  awaiting_review: "Awaiting review",
  in_progress: "In progress",
  needs_changes: "Needs changes",
};

const statusClasses: Record<ReviewQueueStatus, string> = {
  awaiting_review: "border-[#eadfbd] bg-[#fbf6e8] text-[#80652e]",
  in_progress: "border-[#d4e0ea] bg-[#eef4f8] text-[#496b85]",
  needs_changes: "border-[#ead4d0] bg-[#fbefed] text-[#8b5147]",
};

function QueueStatus({ status }: { status: ReviewQueueStatus }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center whitespace-nowrap rounded-full border px-2.5 text-[11px] font-semibold ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function ReviewLink({ entry }: { entry: ReviewQueueEntry }) {
  return (
    <Link
      href={`/admin/review/${entry.categorySlug}/${entry.recordId}`}
      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#cbdcd4] px-3 text-sm font-semibold text-[#286c60] transition-colors hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
    >
      Review <ChevronRight aria-hidden="true" className="size-4" />
    </Link>
  );
}

function DesktopQueueTable({ entries }: { entries: ReviewQueueEntry[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-[#e3eae6] xl:block">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead className="bg-[#f7f9f7]">
          <tr className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">
            <th scope="col" className="px-4 py-3">Record</th>
            <th scope="col" className="px-4 py-3">Type</th>
            <th scope="col" className="px-4 py-3">Evidence</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">Submitted</th>
            <th scope="col" className="px-4 py-3">Reviewer</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e7ede9]">
          {entries.map((entry) => (
            <tr key={`${entry.categorySlug}/${entry.recordId}`} className="align-middle">
              <th scope="row" className="px-4 py-3.5 font-normal">
                <span className="block font-semibold text-[#17364a]">{entry.recordTitle}</span>
                <span className="mt-1 block text-xs text-[#71817d]">
                  Revision {entry.revisionNumber} · {entry.recordId}
                </span>
              </th>
              <td className="px-4 py-3.5 text-sm text-[#526b72]">{entry.categoryLabel}</td>
              <td className="max-w-56 px-4 py-3.5 text-sm text-[#526b72]">
                {entry.evidenceSummary}
              </td>
              <td className="px-4 py-3.5"><QueueStatus status={entry.status} /></td>
              <td className="whitespace-nowrap px-4 py-3.5 text-sm text-[#526b72]">
                <AdminDate value={entry.submittedAt} />
              </td>
              <td className="px-4 py-3.5 text-sm text-[#526b72]">
                {entry.reviewer ?? "Unassigned"}
              </td>
              <td className="px-4 py-3.5 text-right"><ReviewLink entry={entry} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileQueueCards({ entries }: { entries: ReviewQueueEntry[] }) {
  return (
    <ul className="space-y-3 xl:hidden">
      {entries.map((entry) => (
        <li
          key={`${entry.categorySlug}/${entry.recordId}`}
          className="rounded-lg border border-[#e3eae6] bg-white p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words font-semibold text-[#17364a]">{entry.recordTitle}</h3>
              <p className="mt-1 text-xs text-[#71817d]">
                Revision {entry.revisionNumber} · {entry.recordId}
              </p>
            </div>
            <QueueStatus status={entry.status} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-[#71817d]">Type</dt>
              <dd className="mt-1 text-[#405a5e]">{entry.categoryLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#71817d]">Evidence</dt>
              <dd className="mt-1 break-words text-[#405a5e]">{entry.evidenceSummary}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#71817d]">Submitted</dt>
              <dd className="mt-1 text-[#405a5e]"><AdminDate value={entry.submittedAt} /></dd>
            </div>
            <div>
              <dt className="text-xs text-[#71817d]">Reviewer</dt>
              <dd className="mt-1 text-[#405a5e]">{entry.reviewer ?? "Unassigned"}</dd>
            </div>
          </dl>
          <div className="mt-4 border-t border-[#e7ede9] pt-3">
            <ReviewLink entry={entry} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ReviewQueueResults({
  entries,
  totalCount,
  firstEntry,
  lastEntry,
  currentPage,
  pageCount,
  onPageChange,
}: {
  entries: ReviewQueueEntry[];
  totalCount: number;
  firstEntry: number;
  lastEntry: number;
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (totalCount === 0) {
    return (
      <AdminEmptyState
        title="No revisions match these filters"
        description="Try a different search, status, record type, date range or reviewer."
        icon={Search}
      />
    );
  }

  return (
    <div className="space-y-4">
      <DesktopQueueTable entries={entries} />
      <MobileQueueCards entries={entries} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7ede9] pt-4">
        <p className="text-sm text-[#657976]" aria-live="polite">
          Showing {firstEntry}–{lastEntry} of {totalCount}{" "}
          {totalCount === 1 ? "revision" : "revisions"}
        </p>
        <nav aria-label="Review queue pagination" className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#dce5e0] px-3 text-sm font-medium text-[#526b72] hover:bg-[#f4f7f5] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Previous
          </button>
          <span className="px-2 text-sm tabular-nums text-[#657976]">
            {currentPage} / {pageCount}
          </span>
          <button
            type="button"
            disabled={currentPage === pageCount}
            onClick={() => onPageChange(currentPage + 1)}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#dce5e0] px-3 text-sm font-medium text-[#526b72] hover:bg-[#f4f7f5] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
          >
            Next
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}
