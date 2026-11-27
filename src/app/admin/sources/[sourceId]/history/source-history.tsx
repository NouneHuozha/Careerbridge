"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  History,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "../../../admin-ui";
import { AdminDate } from "../../../admin-date";
import type {
  SourceCheckAttempt,
  SourceCheckOutcome,
  SourcePreviewRecord,
} from "../../source-preview-data";

type HistoryFilter = "all" | SourceCheckOutcome;

const filters: Array<{ key: HistoryFilter; label: string }> = [
  { key: "all", label: "All attempts" },
  { key: "successful", label: "Successful" },
  { key: "failed", label: "Failed" },
  { key: "changes_detected", label: "Changes detected" },
];

const outcomeLabels: Record<SourceCheckOutcome, string> = {
  successful: "Successful",
  failed: "Failed",
  changes_detected: "Changes detected",
};

const outcomeClasses: Record<SourceCheckOutcome, string> = {
  successful: "border-[#cfe3da] bg-[#edf6f1] text-[#286c60]",
  failed: "border-[#ead4d0] bg-[#fbefed] text-[#8b5147]",
  changes_detected: "border-[#eadfbd] bg-[#fbf6e8] text-[#80652e]",
};

function HistoryEntry({
  source,
  attempt,
  index,
}: {
  source: SourcePreviewRecord;
  attempt: SourceCheckAttempt;
  index: number;
}) {
  return (
    <li className="relative pl-9">
      <span className="absolute left-0 top-1 grid size-6 place-items-center rounded-full border border-[#dce5e0] bg-white text-xs font-semibold text-[#526b72]">
        {index}
      </span>
      <div className="rounded-xl border border-[#e3eae6] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-[#17364a]">{attempt.method}</h3>
            <p className="mt-1 text-sm text-[#657976]">
              <AdminDate value={attempt.checkedAt} includeTime />
            </p>
          </div>
          <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-semibold ${outcomeClasses[attempt.outcome]}`}>
            {outcomeLabels[attempt.outcome]}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#526b72]">{attempt.summary}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7ede9] pt-3">
          <span className="break-all font-mono text-xs text-[#657976]">{attempt.url}</span>
          <Link
            href={`/admin/sources/${source.id}/history/${attempt.id}`}
            className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-[#286c60] hover:text-[#20594f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
          >
            View attempt details
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
      </div>
    </li>
  );
}

export function SourceHistory({ source }: { source: SourcePreviewRecord }) {
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>("all");
  const [checkMessage, setCheckMessage] = useState("");
  const visibleAttempts = useMemo(
    () =>
      source.attempts.filter(
        (attempt) => activeFilter === "all" || attempt.outcome === activeFilter,
      ),
    [source.attempts, activeFilter],
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow={`Sources / ${source.name} / Fetch history`}
          title="Source check history"
          description="Review previous checks, outcomes and any changes flagged for human review."
        />
        <AdminStatusBadge tone="muted">
          <History aria-hidden="true" className="size-3.5" />
          Preview history
        </AdminStatusBadge>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)]">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">Source</p>
          <Link
            href={`/admin/sources/${source.id}`}
            className="mt-1 inline-flex max-w-full items-center gap-1.5 break-words font-semibold text-[#17364a] hover:text-[#286c60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
          >
            {source.name}
            <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/sources/${source.id}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cbdcd4] px-3 text-sm font-semibold text-[#286c60] hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Source details
          </Link>
          <button
            type="button"
            onClick={() =>
              setCheckMessage(
                "Preview only — no source request was made and no attempt was added to this history.",
              )
            }
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#286c60] px-3 text-sm font-semibold text-white hover:bg-[#20594f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Check source
          </button>
        </div>
      </div>

      {checkMessage && (
        <p role="status" className="rounded-lg border border-[#d4e0ea] bg-[#eef4f8] p-3 text-sm text-[#496b85]">
          <CheckCircle2 aria-hidden="true" className="mr-2 inline size-4" />
          {checkMessage}
        </p>
      )}

      <AdminSectionCard
        id="source-check-activity"
        title="Check activity"
        description="Each attempt is a preview record; no automated fetch or change detection is connected."
        action={
          <span className="hidden text-xs text-[#71817d] sm:inline">
            {source.attempts.length} {source.attempts.length === 1 ? "attempt" : "attempts"}
          </span>
        }
      >
        {source.attempts.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter check attempts">
            {filters.map(({ key, label }) => {
              const selected = activeFilter === key;
              const count =
                key === "all"
                  ? source.attempts.length
                  : source.attempts.filter((attempt) => attempt.outcome === key).length;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveFilter(key)}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78] ${
                    selected
                      ? "border-[#286c60] bg-[#286c60] text-white"
                      : "border-[#dce5e0] bg-white text-[#526b72] hover:bg-[#f4f7f5]"
                  }`}
                >
                  {label}
                  <span className={selected ? "text-white/75" : "text-[#71817d]"}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {visibleAttempts.length === 0 ? (
          <AdminEmptyState
            title={source.attempts.length === 0 ? "No check history available" : "No attempts match this filter"}
            description={
              source.attempts.length === 0
                ? "No fetch or check attempts are recorded for this preview source."
                : "Choose another outcome filter to see recorded attempts."
            }
            icon={Search}
          />
        ) : (
          <ol className="relative space-y-4 before:absolute before:bottom-4 before:left-3 before:top-4 before:w-px before:bg-[#dce5e0]">
            {visibleAttempts.map((attempt, index) => (
              <HistoryEntry
                key={attempt.id}
                source={source}
                attempt={attempt}
                index={index + 1}
              />
            ))}
          </ol>
        )}
      </AdminSectionCard>

      <p className="text-xs leading-5 text-[#71817d]">
        An attempt detail may include its URL, method, timestamp, outcome, detected changes or
        available error details. Preview entries do not represent live checks.
      </p>
    </div>
  );
}
