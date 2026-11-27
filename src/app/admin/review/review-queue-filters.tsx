"use client";

import { Search } from "lucide-react";
import {
  type ReviewQueueEntry,
  type ReviewQueueFilters,
  type ReviewQueueStatus,
  type ReviewQueueStatusCounts,
} from "./review-queue-utils";

const statusLabels: Record<ReviewQueueStatus, string> = {
  awaiting_review: "Awaiting review",
  in_progress: "In progress",
  needs_changes: "Needs changes",
};

const dateRangeOptions = [
  { value: "all", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "older", label: "Over 30 days" },
] as const;

function QueueFilters({
  entries,
  filters,
  counts,
  onChange,
}: {
  entries: ReviewQueueEntry[];
  filters: ReviewQueueFilters;
  counts: ReviewQueueStatusCounts;
  onChange: (filters: ReviewQueueFilters) => void;
}) {
  const categories = Array.from(
    new Map(
      entries.map((entry) => [entry.categorySlug, entry.categoryLabel] as const),
    ),
  );
  const reviewers = [
    ...new Set(
      entries
        .map((entry) => entry.reviewer)
        .filter((reviewer): reviewer is string => reviewer !== null),
    ),
  ];
  const controlClassName =
    "h-11 w-full min-w-0 rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm text-[#405a5e] outline-none transition focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15";

  function update<K extends keyof ReviewQueueFilters>(
    key: K,
    value: ReviewQueueFilters[K],
  ) {
    onChange({ ...filters, [key]: value });
  }

  const statusTabs: Array<{
    key: "all" | ReviewQueueStatus;
    label: string;
    count: number;
  }> = [
    { key: "all", label: "All", count: entries.length },
    {
      key: "awaiting_review",
      label: statusLabels.awaiting_review,
      count: counts.awaiting_review,
    },
    { key: "in_progress", label: statusLabels.in_progress, count: counts.in_progress },
    { key: "needs_changes", label: statusLabels.needs_changes, count: counts.needs_changes },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by review status">
        {statusTabs.map((tab) => {
          const selected = filters.status === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={selected}
              onClick={() => update("status", tab.key)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78] ${
                selected
                  ? "border-[#286c60] bg-[#286c60] text-white"
                  : "border-[#dce5e0] bg-white text-[#526b72] hover:bg-[#f4f7f5]"
              }`}
            >
              {tab.label}
              <span
                className={`min-w-5 rounded-full px-1 text-center text-xs tabular-nums ${
                  selected ? "bg-white/15 text-white" : "bg-[#f1f5f2] text-[#526b72]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1.6fr)_repeat(3,minmax(9rem,1fr))]">
        <label className="relative block min-w-0 md:col-span-2 xl:col-span-1">
          <span className="sr-only">Search records to review</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71817d]"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => update("query", event.target.value)}
            placeholder="Search records to review..."
            className={`${controlClassName} pl-10`}
          />
        </label>

        <label className="min-w-0">
          <span className="sr-only">Filter by record type</span>
          <select
            value={filters.category}
            onChange={(event) => {
              const category =
                categories.find(([slug]) => slug === event.target.value)?.[0] ?? "all";
              update("category", category);
            }}
            className={controlClassName}
          >
            <option value="all">All record types</option>
            {categories.map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-0">
          <span className="sr-only">Filter by submitted date</span>
          <select
            value={filters.dateRange}
            onChange={(event) => {
              const dateRange =
                dateRangeOptions.find((option) => option.value === event.target.value)?.value ??
                "all";
              update("dateRange", dateRange);
            }}
            className={controlClassName}
          >
            {dateRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-0">
          <span className="sr-only">Filter by reviewer</span>
          <select
            value={filters.reviewer}
            onChange={(event) => update("reviewer", event.target.value)}
            className={controlClassName}
          >
            <option value="all">All reviewers</option>
            <option value="unassigned">Unassigned</option>
            {reviewers.map((reviewer) => (
              <option key={reviewer} value={reviewer}>
                {reviewer}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

export function ReviewQueueFilters({
  entries,
  filters,
  counts,
  onChange,
}: {
  entries: ReviewQueueEntry[];
  filters: ReviewQueueFilters;
  counts: ReviewQueueStatusCounts;
  onChange: (filters: ReviewQueueFilters) => void;
}) {
  return (
    <QueueFilters
      entries={entries}
      filters={filters}
      counts={counts}
      onChange={onChange}
    />
  );
}
