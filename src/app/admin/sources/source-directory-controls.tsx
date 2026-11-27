"use client";

import { Search } from "lucide-react";
import type { SourcePreviewRecord } from "./source-preview-data";
import type {
  SourceAuthorityFilter,
  SourceDirectoryFilters,
} from "./source-utils";

const authorityOptions: Array<{
  value: SourceAuthorityFilter;
  label: string;
}> = [
  { value: "all", label: "All sources" },
  { value: "official", label: "Official" },
  { value: "government", label: "Government" },
  { value: "institutional", label: "Institutional" },
  { value: "other", label: "Other" },
];

const fieldClassName =
  "h-11 w-full min-w-0 rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm text-[#405a5e] outline-none transition focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15";
const statusOptions = ["all", "active", "needs_check", "inactive"] as const;
const lastCheckedOptions = ["all", "7d", "30d", "overdue", "not_checked"] as const;

export function SourceDirectoryControls({
  sources,
  filters,
  onChange,
}: {
  sources: SourcePreviewRecord[];
  filters: SourceDirectoryFilters;
  onChange: (filters: SourceDirectoryFilters) => void;
}) {
  const issuers = [...new Set(sources.map((source) => source.issuingOrganisation))].sort();

  function update<K extends keyof SourceDirectoryFilters>(
    key: K,
    value: SourceDirectoryFilters[K],
  ) {
    onChange({ ...filters, [key]: value });
  }

  function countForAuthority(authority: SourceAuthorityFilter) {
    if (authority === "all") return sources.length;
    return sources.filter((source) =>
      authority === "official"
        ? source.isOfficial
        : source.authorityCategory === authority,
    ).length;
  }

  return (
    <div className="space-y-4">
      <label className="relative block min-w-0">
        <span className="sr-only">Search name, domain or URL</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71817d]"
        />
        <input
          type="search"
          value={filters.query}
          onChange={(event) => update("query", event.target.value)}
          placeholder="Search name, domain or URL..."
          className={`${fieldClassName} pl-10`}
        />
      </label>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by source classification">
        {authorityOptions.map((option) => {
          const selected = filters.authority === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => update("authority", option.value)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78] ${
                selected
                  ? "border-[#286c60] bg-[#286c60] text-white"
                  : "border-[#dce5e0] bg-white text-[#526b72] hover:bg-[#f4f7f5]"
              }`}
            >
              {option.label}
              <span
                className={`min-w-5 rounded-full px-1 text-center text-xs tabular-nums ${
                  selected ? "bg-white/15 text-white" : "bg-[#f1f5f2] text-[#526b72]"
                }`}
              >
                {countForAuthority(option.value)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="min-w-0">
          <span className="sr-only">Filter by authority</span>
          <select
            value={filters.issuingOrganisation}
            onChange={(event) => update("issuingOrganisation", event.target.value)}
            className={fieldClassName}
          >
            <option value="all">Any issuing organisation</option>
            {issuers.map((issuer) => (
              <option key={issuer} value={issuer}>
                {issuer}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-0">
          <span className="sr-only">Filter by source status</span>
          <select
            value={filters.status}
            onChange={(event) => {
              const status =
                statusOptions.find((option) => option === event.target.value) ?? "all";
              update("status", status);
            }}
            className={fieldClassName}
          >
            <option value="all">Any status</option>
            <option value="active">Active</option>
            <option value="needs_check">Needs checking</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <label className="min-w-0">
          <span className="sr-only">Filter by last checked</span>
          <select
            value={filters.lastChecked}
            onChange={(event) => {
              const lastChecked =
                lastCheckedOptions.find((option) => option === event.target.value) ?? "all";
              update("lastChecked", lastChecked);
            }}
            className={fieldClassName}
          >
            <option value="all">Any last check</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="overdue">Over 30 days / overdue</option>
            <option value="not_checked">Not checked</option>
          </select>
        </label>
      </div>
    </div>
  );
}
