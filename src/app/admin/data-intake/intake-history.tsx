"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Clock3, FileSpreadsheet, Search, SearchX } from "lucide-react";
import { AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "../admin-ui";
import { AdminDate } from "../admin-date";
import { filterIntakeJobs } from "./data-intake-utils";
import { intakeJobPreviews, type IntakeJobKind } from "./intake-preview-data";

const filters: Array<{ value: IntakeJobKind | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "import", label: "Imports" },
  { value: "manual", label: "Manual" },
];

const kindIcon = {
  import: FileSpreadsheet,
  manual: Clock3,
};

export function IntakeHistoryPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<IntakeJobKind | "all">("all");
  const jobs = useMemo(() => filterIntakeJobs(intakeJobPreviews, query, kind), [query, kind]);

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6">
      <AdminPageHeader
        eyebrow="Data intake / Intake history"
        title="Intake history"
        description="Inspect illustrative spreadsheet and manual-entry activity. Connected history is not available in this preview."
      />
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#d6e4dd] bg-[#edf6f1] p-4">
        <p className="max-w-3xl text-sm leading-6 text-[#526c67]">
          The entries below are illustrative UI examples, not persisted jobs or activity. Manual form previews are not added to history.
        </p>
        <AdminStatusBadge tone="accent">Example entries only</AdminStatusBadge>
      </div>

      <AdminSectionCard
        id="intake-history-records"
        title="Activity"
        description="Search by file, record type or preview job ID."
        action={
          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Search intake history</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-[#71817d]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search activity..."
              className="min-h-10 w-full rounded-lg border border-[#d7e1dc] bg-white pl-9 pr-3 text-sm text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
            />
          </label>
        }
      >
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter intake history by method">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={kind === filter.value}
              onClick={() => setKind(filter.value)}
              className={`min-h-9 rounded-full border px-3 text-sm font-semibold transition-colors ${
                kind === filter.value
                  ? "border-[#377b78] bg-[#edf6f1] text-[#286c60]"
                  : "border-[#dce5e0] bg-white text-[#657976] hover:bg-[#f5f8f6]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {jobs.length === 0 ? (
          <div role="status" className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-[#d6e1dc] bg-[#f8faf8] px-5 py-7 text-center">
            <SearchX aria-hidden="true" className="size-8 text-[#71817d]" />
            <p className="mt-3 text-sm font-semibold text-[#17364a]">No matching preview activity</p>
            <p className="mt-1 text-sm text-[#657976]">Try another search or activity type.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[790px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e3eae6] text-xs uppercase tracking-wide text-[#71817d]">
                  <th scope="col" className="pb-3 pr-4 font-semibold">Activity</th>
                  <th scope="col" className="pb-3 pr-4 font-semibold">Method / type</th>
                  <th scope="col" className="pb-3 pr-4 font-semibold">Rows / records</th>
                  <th scope="col" className="pb-3 pr-4 font-semibold">Preview status</th>
                  <th scope="col" className="pb-3 pr-4 font-semibold">Created</th>
                  <th scope="col" className="pb-3 text-right font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ee]">
                {jobs.map((job) => {
                  const Icon = kindIcon[job.kind];
                  return (
                    <tr key={job.id}>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf6f1] text-[#377b78]">
                            <Icon aria-hidden="true" className="size-4" />
                          </span>
                          <div>
                            <p className="font-semibold text-[#17364a]">{job.title}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-[#71817d]">{job.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-[#526b72]">
                        {filters.find((filter) => filter.value === job.kind)?.label ?? "Activity"} · {job.recordTypeLabel}
                      </td>
                      <td className="py-4 pr-4 text-[#526b72]">{job.recordsLabel}</td>
                      <td className="py-4 pr-4">
                        <AdminStatusBadge tone="muted">
                          {job.status === "preview_completed" ? "Example preview" : "Not started"}
                        </AdminStatusBadge>
                      </td>
                      <td className="py-4 pr-4 whitespace-nowrap text-[#657976]">
                        <AdminDate value={job.createdAt} includeTime />
                      </td>
                      <td className="py-4 text-right">
                        <Link href={`/admin/data-intake/history/${job.id}`} className="inline-flex items-center gap-1 font-semibold text-[#286c60] hover:underline">
                          Open <ArrowRight aria-hidden="true" className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-[#71817d]">
          Showing {jobs.length} illustrative {jobs.length === 1 ? "entry" : "entries"} · live history is not connected.
        </p>
      </AdminSectionCard>
    </div>
  );
}
