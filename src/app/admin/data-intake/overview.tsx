import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileSpreadsheet,
  FlaskConical,
  History,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import { AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "../admin-ui";
import { intakeJobPreviews } from "./intake-preview-data";

const methods = [
  {
    href: "/admin/data-intake/import",
    title: "Excel / CSV import",
    description: "Map columns, validate rows and reconcile possible duplicates before preparing a preview.",
    action: "Start spreadsheet import",
    icon: FileSpreadsheet,
    tone: "bg-[#eaf2ff] text-[#42628b]",
  },
  {
    href: "/admin/data-intake/manual",
    title: "Manual record entry",
    description: "Create a structured record preview with type-specific fields and source evidence.",
    action: "Choose a record type",
    icon: PenLine,
    tone: "bg-[#edf6f1] text-[#377b68]",
  },
  {
    href: "/admin/data-intake/research",
    title: "Research & Fetch",
    description: "Prepare a research request and inspect candidate information without fetching any source.",
    action: "Prepare research preview",
    icon: FlaskConical,
    tone: "bg-[#f5efff] text-[#725592]",
  },
];

const workflowSteps = [
  {
    title: "Prepare",
    description: "Spreadsheet, manual entry or research candidate",
    icon: FileSpreadsheet,
  },
  {
    title: "Validate & reconcile",
    description: "Check required fields, duplicates and provenance",
    icon: ShieldCheck,
  },
  {
    title: "Draft candidates",
    description: "Prepare new records or revisions with evidence",
    icon: ClipboardList,
  },
  {
    title: "Review before publication",
    description: "Existing review, approval and publication lifecycle",
    icon: History,
  },
];

export function DataIntakeOverview() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7">
      <AdminPageHeader
        eyebrow="Workspace / Data intake"
        title="Data Intake"
        description="Prepare catalogue information through structured import, manual entry or research-assisted workflows."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d6e4dd] bg-[#edf6f1] px-4 py-3.5">
        <div>
          <p className="text-sm font-semibold text-[#286c60]">Frontend preview only</p>
          <p className="mt-1 text-sm leading-5 text-[#526c67]">
            No files are uploaded, no sources are fetched, and no records or intake jobs are saved.
          </p>
        </div>
        <AdminStatusBadge tone="accent">Not connected to backend</AdminStatusBadge>
      </div>

      <section aria-label="Intake activity overview" className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total intake jobs", "—", "Live job counts are not connected"],
          ["Needs attention", "—", "No live validation queue"],
          ["Running jobs", "—", "No background jobs are started"],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-xl border border-[#dce5e0] bg-white p-5">
            <p className="text-sm font-semibold text-[#526b72]">{label}</p>
            <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[#17364a]">{value}</p>
            <p className="mt-2 text-sm text-[#657976]">{detail}</p>
          </div>
        ))}
      </section>

      <section aria-label="Choose an intake method" className="grid gap-4 xl:grid-cols-3">
        {methods.map(({ href, title, description, action, icon: Icon, tone }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-56 flex-col rounded-xl border border-[#dce5e0] bg-white p-5 shadow-[0_1px_2px_rgba(23,54,74,0.04)] transition hover:-translate-y-0.5 hover:border-[#9abbb0] hover:shadow-[0_10px_28px_rgba(23,54,74,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
          >
            <span className={`grid size-11 place-items-center rounded-xl ${tone}`}>
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-[#17364a]">{title}</h2>
            <p className="mt-2 max-w-lg flex-1 text-sm leading-6 text-[#657976]">{description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#286c60]">
              {action}
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </section>

      <AdminSectionCard
        id="shared-intake-lifecycle"
        title="One controlled path into the catalogue"
        description="All intake methods prepare candidate data. None of them bypasses review, approval or publication."
      >
        <div className="grid gap-3 lg:grid-cols-4">
          {workflowSteps.map(({ title, description, icon: Icon }, index) => (
            <div key={title} className="relative min-w-0 rounded-lg border border-[#e1e9e4] bg-[#f8faf8] p-4">
              <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71817d]">
                <span className="grid size-6 place-items-center rounded-full bg-[#e6efeb] text-[#377b78]">
                  {index + 1}
                </span>
                Step {index + 1}
              </span>
              <Icon aria-hidden="true" className="mt-4 size-5 text-[#377b78]" />
              <h3 className="mt-2 text-sm font-semibold text-[#17364a]">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-[#657976]">{description}</p>
              {index < workflowSteps.length - 1 && (
                <ArrowRight aria-hidden="true" className="absolute -right-3 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-white text-[#91a49c] lg:block" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-[#dce5e0] bg-white px-4 py-3 text-sm leading-6 text-[#526b72]">
          <strong className="font-semibold text-[#17364a]">Trust boundary:</strong>{" "}
          every claim needs its own supporting evidence and remains subject to the existing Review Queue.
          An imported row or research result is not automatically verified or published.
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        id="recent-intake-activity"
        title="Recent intake activity"
        description="Illustrative preview entries only; these are not saved or live jobs."
        action={
          <Link href="/admin/data-intake/history" className="text-sm font-semibold text-[#286c60] hover:underline">
            View intake history
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e3eae6] text-xs uppercase tracking-wide text-[#71817d]">
                <th scope="col" className="pb-3 pr-4 font-semibold">Activity</th>
                <th scope="col" className="pb-3 pr-4 font-semibold">Record type</th>
                <th scope="col" className="pb-3 pr-4 font-semibold">Rows / records</th>
                <th scope="col" className="pb-3 pr-4 font-semibold">Preview status</th>
                <th scope="col" className="pb-3 text-right font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ee]">
              {intakeJobPreviews.map((job) => (
                <tr key={job.id}>
                  <td className="py-3.5 pr-4 font-medium text-[#17364a]">{job.title}</td>
                  <td className="py-3.5 pr-4 text-[#526b72]">{job.recordTypeLabel}</td>
                  <td className="py-3.5 pr-4 text-[#526b72]">{job.recordsLabel}</td>
                  <td className="py-3.5 pr-4">
                    <AdminStatusBadge tone="muted">
                      {job.status === "preview_completed" ? "Example preview" : "Not started"}
                    </AdminStatusBadge>
                  </td>
                  <td className="py-3.5 text-right">
                    <Link href={`/admin/data-intake/history/${job.id}`} className="font-semibold text-[#286c60] hover:underline">
                      Open <span aria-hidden="true">→</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSectionCard>
    </div>
  );
}
