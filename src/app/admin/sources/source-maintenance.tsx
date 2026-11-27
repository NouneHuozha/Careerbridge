"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Clock3,
  FileWarning,
  RefreshCw,
} from "lucide-react";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "../admin-ui";
import {
  sourcePreviewRecords,
} from "./source-preview-data";
import {
  getSourceMaintenanceCounts,
  getSourceMaintenanceIssues,
  type SourceMaintenanceIssue,
} from "./source-utils";
import { AdminDate } from "../admin-date";

const issueLabels: Record<SourceMaintenanceIssue, string> = {
  due: "Overdue",
  failed: "Fetch failed",
  changed: "Changes detected",
  inactive: "Inactive",
};

const issueClasses: Record<SourceMaintenanceIssue, string> = {
  due: "border-[#eadfbd] bg-[#fbf6e8] text-[#80652e]",
  failed: "border-[#ead4d0] bg-[#fbefed] text-[#8b5147]",
  changed: "border-[#d4e0ea] bg-[#eef4f8] text-[#496b85]",
  inactive: "border-[#dce5e0] bg-[#f5f8f6] text-[#637572]",
};

const issuePriority: SourceMaintenanceIssue[] = [
  "failed",
  "changed",
  "due",
  "inactive",
];

function getMaintenanceRows() {
  return sourcePreviewRecords
    .map((source) => ({
      source,
      issues: getSourceMaintenanceIssues(source),
    }))
    .filter(({ issues }) => issues.length > 0)
    .sort((left, right) => {
      const leftPriority = Math.min(...left.issues.map((issue) => issuePriority.indexOf(issue)));
      const rightPriority = Math.min(...right.issues.map((issue) => issuePriority.indexOf(issue)));
      return leftPriority - rightPriority;
    });
}

function SourceIssueBadges({ issues }: { issues: SourceMaintenanceIssue[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {issues.map((issue) => (
        <span
          key={issue}
          className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-semibold ${issueClasses[issue]}`}
        >
          {issueLabels[issue]}
        </span>
      ))}
    </div>
  );
}

export function SourceMaintenance() {
  const counts = getSourceMaintenanceCounts(sourcePreviewRecords);
  const rows = getMaintenanceRows();

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow="Sources / Maintenance"
          title="Source maintenance"
          description="Find sources that may need attention before relying on their information again."
        />
        <AdminStatusBadge tone="muted">
          <RefreshCw aria-hidden="true" className="size-3.5" />
          Illustrative preview
        </AdminStatusBadge>
      </div>

      <section aria-label="Source maintenance counts" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Due for checking"
          value={counts.due}
          detail="Active sources last checked over 30 days ago"
          icon={Clock3}
          accentClass="bg-[#fbf6e8] text-[#80652e]"
        />
        <AdminMetricCard
          label="Failed checks"
          value={counts.failed}
          detail="Latest preview attempt did not confirm access"
          icon={AlertTriangle}
          accentClass="bg-[#fbefed] text-[#8b5147]"
        />
        <AdminMetricCard
          label="Changed pages"
          value={counts.changed}
          detail="Changes flagged for human review"
          icon={FileWarning}
          accentClass="bg-[#eef4f8] text-[#496b85]"
        />
        <AdminMetricCard
          label="Inactive sources"
          value={counts.inactive}
          detail="Not considered current evidence"
          icon={Ban}
          accentClass="bg-[#f5f8f6] text-[#637572]"
        />
      </section>

      <AdminSectionCard
        id="sources-needing-attention"
        title="Sources needing attention"
        description="Review the issue and inspect the source before deciding whether any catalogue claim needs follow-up."
      >
        {rows.length === 0 ? (
          <AdminEmptyState
            title="No sources need attention"
            description="Sources with an overdue, failed, changed or inactive state will appear here."
            icon={RefreshCw}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-lg border border-[#e3eae6] lg:block">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="bg-[#f7f9f7]">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">
                    <th scope="col" className="px-4 py-3">Source</th>
                    <th scope="col" className="px-4 py-3">Issue</th>
                    <th scope="col" className="px-4 py-3">Last checked</th>
                    <th scope="col" className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7ede9]">
                  {rows.map(({ source, issues }) => (
                    <tr key={source.id}>
                      <th scope="row" className="px-4 py-3.5 font-normal">
                        <Link
                          href={`/admin/sources/${source.id}`}
                          className="font-semibold text-[#17364a] hover:text-[#286c60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
                        >
                          {source.name}
                        </Link>
                        <span className="mt-1 block text-xs text-[#71817d]">
                          {new URL(source.url).hostname}
                        </span>
                      </th>
                      <td className="px-4 py-3.5"><SourceIssueBadges issues={issues} /></td>
                      <td className="px-4 py-3.5 text-sm text-[#526b72]">
                        <AdminDate value={source.lastCheckedAt} fallback="Never checked" />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/admin/sources/${source.id}`}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#cbdcd4] px-3 text-sm font-semibold text-[#286c60] hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
                        >
                          Open <ArrowUpRight aria-hidden="true" className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 lg:hidden">
              {rows.map(({ source, issues }) => (
                <li key={source.id} className="rounded-lg border border-[#e3eae6] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/sources/${source.id}`}
                        className="break-words font-semibold text-[#17364a] hover:text-[#286c60]"
                      >
                        {source.name}
                      </Link>
                      <p className="mt-1 break-all font-mono text-xs text-[#71817d]">
                        {new URL(source.url).hostname}
                      </p>
                    </div>
                    <SourceIssueBadges issues={issues} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7ede9] pt-3">
                    <p className="text-xs text-[#657976]">
                      Last checked: <AdminDate value={source.lastCheckedAt} fallback="Never checked" />
                    </p>
                    <Link
                      href={`/admin/sources/${source.id}`}
                      className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-[#286c60]"
                    >
                      Open <ArrowUpRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </AdminSectionCard>

      <p className="rounded-xl border border-[#d4e0ea] bg-[#eef4f8] p-4 text-sm leading-6 text-[#496b85]">
        Change detection flags information for human review. It does not automatically invalidate
        claims or publish replacement information. All counts and entries on this screen are
        illustrative preview data.
      </p>
    </div>
  );
}
