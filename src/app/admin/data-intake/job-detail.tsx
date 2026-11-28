"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Download, FileSpreadsheet, Info, PenLine } from "lucide-react";
import { AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "../admin-ui";
import { AdminDate } from "../admin-date";
import type { ReactNode } from "react";
import { getImportPreviewSummary } from "./data-intake-utils";
import type { IntakeJobPreview } from "./intake-preview-data";

export function IntakeJobDetail({ job }: { job: IntakeJobPreview }) {
  const [reportMessage, setReportMessage] = useState("");
  const isImport = job.kind === "import";
  const summary = getImportPreviewSummary("use-existing");
  const Icon = isImport ? FileSpreadsheet : PenLine;

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6">
      <AdminPageHeader
        eyebrow={`Data intake / Intake history / ${job.id}`}
        title="Intake job details"
        description={job.detail}
      />
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[#d6e4dd] bg-[#edf6f1] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#377b78]">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#377b68]">Example activity detail</p>
            <h2 className="mt-1 text-lg font-semibold text-[#17364a]">{job.title}</h2>
            <p className="mt-1 font-mono text-xs text-[#657976]">{job.id}</p>
          </div>
        </div>
        <AdminStatusBadge tone="muted">
          {job.status === "preview_completed" ? "Example preview only" : "Not started · preview"}
        </AdminStatusBadge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <AdminSectionCard
          id="job-summary"
          title={isImport ? "Import preview results" : "Manual-entry preview"}
          description={isImport ? "Illustrative counts from the sample spreadsheet scenario." : "Illustrative details for a locally prepared record."}
        >
          {isImport ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Example rows processed", "25"],
                ["New draft candidates", String(summary.newDraftCandidates)],
                ["Revision candidates", String(summary.revisionCandidates)],
                ["Skipped rows", String(summary.skippedRows)],
                ["Failed rows", String(summary.failedRows)],
                ["Review status", "Not submitted"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#e1e9e4] p-4">
                  <p className="text-sm text-[#657976]">{label}</p>
                  <p className="mt-2 text-xl font-semibold text-[#17364a]">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#d6e1dc] bg-[#f8faf8] p-4">
              <p className="text-sm font-semibold text-[#17364a]">No saved manual-entry activity</p>
              <p className="mt-1 text-sm leading-6 text-[#657976]">
                Manual record previews are not saved to intake history or submitted to the catalogue.
              </p>
            </div>
          )}
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#f8faf8] p-3 text-xs leading-5 text-[#657976]">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#377b78]" />
            These example values are not persisted intake history and do not represent real catalogue updates.
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          id="job-metadata"
          title="Activity information"
          description="Preview metadata for the selected example."
        >
          <dl className="divide-y divide-[#edf1ee]">
            {([
              ["Method", isImport ? "Spreadsheet import" : "Manual entry"],
              ["Record type", job.recordTypeLabel],
              ["Started by", "Example Admin"],
              ["Created", <AdminDate key="created" value={job.createdAt} includeTime />],
              ["Source / file", isImport ? job.title : "Entered in Admin preview"],
              ["Lifecycle", isImport ? "Draft preparation preview only" : "Preview only; not submitted"],
            ] as Array<[string, ReactNode]>).map(([label, value]) => (
              <div key={label} className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] gap-3 py-3">
                <dt className="text-sm text-[#71817d]">{label}</dt>
                <dd className="break-words text-sm font-medium text-[#17364a]">{value}</dd>
              </div>
            ))}
          </dl>
        </AdminSectionCard>
      </div>

      {reportMessage && (
        <p role="status" className="rounded-lg border border-[#dce5e0] bg-white px-4 py-3 text-sm text-[#526b72]">{reportMessage}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/data-intake/history" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d6e1dc] bg-white px-4 text-sm font-semibold text-[#405a5e] hover:bg-[#f4f7f5]">
          <ArrowLeft aria-hidden="true" className="size-4" /> Back to history
        </Link>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setReportMessage("No downloadable report exists; this is illustrative preview data only.")}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d6e1dc] bg-white px-4 text-sm font-semibold text-[#405a5e] hover:bg-[#f4f7f5]"
          >
            <Download aria-hidden="true" className="size-4" /> Download report
          </button>
          {isImport && job.categorySlug ? (
            <Link href={`/admin/catalogue/${job.categorySlug}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white hover:bg-[#205b51]">
              View Catalogue preview <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
