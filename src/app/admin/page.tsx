import type { AdminAuditAction, AdminAuditKind, CatalogItemType } from "../../db/schema/catalog";
import {
  AlertTriangle,
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FilePlus2,
  FileSpreadsheet,
  Files,
  History,
  LibraryBig,
  type LucideIcon,
} from "lucide-react";
import {
  getAdminDashboardData,
  type RecentAdminActivity,
} from "./dashboard-data";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "./admin-ui";
import { AdminDate } from "./admin-date";

const typeLabels: Record<CatalogItemType, string> = {
  field: "Fields",
  institution: "Institutions",
  campus: "Campuses",
  course: "Courses",
  course_offering: "Course offerings",
  pathway: "Pathways",
  examination: "Exams",
  scholarship: "Scholarships",
};

const auditKindLabels: Record<AdminAuditKind, string> = {
  exam: "Examination",
  scholarship: "Scholarship",
  institution: "Institution",
  campus: "Campus",
  course_offering: "Course offering",
  pathway: "Pathway",
};

const auditActionLabels: Record<AdminAuditAction, string> = {
  submit: "Submitted",
  "associate-source": "Associated source",
  review: "Reviewed",
  approve: "Approved",
  reject: "Rejected",
  publish: "Published",
};

const quickActions: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Add catalogue record", icon: FilePlus2 },
  { label: "Import spreadsheet", icon: FileSpreadsheet },
  { label: "Open review queue", icon: Activity },
];

export default async function AdminPage() {
  let dashboard: Awaited<ReturnType<typeof getAdminDashboardData>>;
  try {
    dashboard = await getAdminDashboardData();
  } catch (error) {
    console.error(
      "[careerbridge-next] Admin dashboard data query failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return (
      <section
        role="alert"
        aria-labelledby="admin-dashboard-error"
        className="flex min-h-48 items-start gap-4 rounded-xl border border-[#dce5e0] bg-white p-5 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-7"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#f6f1e5] text-[#8a6c2e]">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h1 id="admin-dashboard-error" className="text-xl font-semibold text-[#17364a]">
            Dashboard data is temporarily unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#526b72]">
            We could not load catalogue totals or recent Admin activity. Please try again.
          </p>
        </div>
      </section>
    );
  }

  const { catalogue, recentActivity } = dashboard;
  const metrics = [
    {
      label: "Total records",
      value: catalogue.totalItems,
      detail: "Across all catalogue types",
      icon: LibraryBig,
      accentClass: "bg-[#eaf2ed] text-[#286c60]",
    },
    {
      label: "Published",
      value: catalogue.publishedItems,
      detail: "Live student content",
      icon: CheckCircle2,
      accentClass: "bg-[#eaf2ed] text-[#286c60]",
    },
    {
      label: "Unpublished",
      value: catalogue.unpublishedItems,
      detail: "No valid published version",
      icon: Files,
      accentClass: "bg-[#eef2f6] text-[#496b85]",
    },
    {
      label: "In review",
      value: catalogue.inReviewItems,
      detail: "Latest revisions awaiting review",
      icon: Clock3,
      accentClass: "bg-[#f6f1e5] text-[#8a6c2e]",
    },
  ];
  const categories = [...catalogue.byType].sort((a, b) => b.count - a.count);
  const largestCategory = Math.max(1, ...categories.map(({ count }) => count));

  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageHeader
        eyebrow="Welcome back, Admin"
        title="Overview"
        description="Monitor your CareerBridge catalogue and current review workload."
      />

      <dl aria-label="Catalogue summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <AdminMetricCard key={metric.label} {...metric} />
        ))}
      </dl>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.9fr)]">
        <AdminSectionCard
          id="catalogue-distribution"
          title="Catalogue distribution"
          description="Breakdown by record type"
        >
          <ul className="space-y-4">
            {categories.map(({ type, count }) => (
              <li key={type} className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-[#405a5e]">
                    {typeLabels[type]}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-[#17364a]">
                    {count.toLocaleString("en-IN")}
                  </span>
                </div>
                <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-[#e9eeeb]">
                  <div
                    className="h-full rounded-full bg-[#4d9288] transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${(count / largestCategory) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-[#edf1ee] pt-4 text-xs leading-5 text-[#657976]">
            Counts represent catalogue identities, not revision history.
          </p>
        </AdminSectionCard>

        <AdminSectionCard
          id="review-workload"
          title="Review workload"
          description="Current editorial activity"
          className="h-full"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-[#f5f8f6] p-4">
            <div>
              <p className="text-4xl font-semibold leading-none tracking-[-0.04em] tabular-nums text-[#17364a]">
                {catalogue.inReviewItems.toLocaleString("en-IN")}
              </p>
              <p className="mt-2 text-sm text-[#586f70]">Latest revisions in review</p>
            </div>
            <AdminStatusBadge tone="muted">
              <span className="size-1.5 rounded-full bg-[#987a3c]" aria-hidden="true" />
              Awaiting review
            </AdminStatusBadge>
          </div>

          <div className="mt-5 border-t border-[#edf1ee] pt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#17364a]">Quick actions</h3>
              <AdminStatusBadge tone="muted">Next phase</AdminStatusBadge>
            </div>
            <ul className="divide-y divide-[#edf1ee]">
              {quickActions.map(({ label, icon: Icon }) => (
                <li key={label}>
                  <button
                    type="button"
                    disabled
                    title={`${label} will be available in a later phase`}
                    className="flex min-h-12 w-full items-center gap-3 py-2 text-left text-sm font-medium text-[#788884] disabled:cursor-not-allowed"
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-[18px] shrink-0 text-[#65827d]"
                      strokeWidth={1.8}
                    />
                    <span className="min-w-0 flex-1">{label}</span>
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        id="recent-activity"
        title="Recent Admin activity"
        description="The latest recorded lifecycle actions."
        action={<AdminStatusBadge tone="muted">Latest 10 events · UTC</AdminStatusBadge>}
      >
        {recentActivity.length === 0 ? (
          <AdminEmptyState
            title="No Admin activity recorded yet"
            description="Successfully committed catalogue actions will appear here."
            icon={History}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#e4ebe7]">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <caption className="sr-only">Latest ten Admin audit events</caption>
              <thead className="border-b border-[#e4ebe7] bg-[#f7f9f7] text-[11px] uppercase tracking-[0.1em] text-[#617572]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Timestamp</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Actor</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Action</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Catalogue item</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ee]">
                {recentActivity.map((event) => (
                  <ActivityRow key={event.id} event={event} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>
    </div>
  );
}

function ActivityRow({ event }: { event: RecentAdminActivity }) {
  const actor = event.actorName?.trim() || event.actorEmail?.trim() || `User #${event.actorId}`;
  const itemTitle = event.itemTitle?.trim();
  const itemLabel = itemTitle || event.itemId;

  return (
    <tr>
      <td className="whitespace-nowrap px-4 py-3.5 text-[#526b72]">
        <AdminDate value={event.createdAt} includeTime />
      </td>
      <td className="max-w-48 truncate px-4 py-3.5 font-medium text-[#17364a]" title={actor}>
        {actor}
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-[#526b72]">
        {auditKindLabels[event.kind]}
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-[#526b72]">
        {auditActionLabels[event.action]}
      </td>
      <td className="max-w-72 px-4 py-3.5">
        <span className="block truncate font-medium text-[#17364a]" title={itemLabel}>
          {itemLabel}
        </span>
        {itemTitle && (
          <span className="mt-1 block truncate font-mono text-[11px] text-[#687d80]" title={event.itemId}>
            {event.itemId}
          </span>
        )}
      </td>
    </tr>
  );
}
