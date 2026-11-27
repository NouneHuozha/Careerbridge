import Link from "next/link";
import { Suspense } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Files,
  GraduationCap,
  History,
  Landmark,
  LibraryBig,
  MapPin,
  Route,
  type LucideIcon,
} from "lucide-react";
import type {
  AdminAuditAction,
  AdminAuditKind,
  CatalogItemType,
} from "../../../db/schema/catalog";
import {
  getAdminDashboardData,
  type RecentAdminActivity,
} from "../dashboard-data";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "../admin-ui";
import { AdminDate } from "../admin-date";
import { CatalogueRetryButton } from "./retry-button";

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

type BrowseCategory = {
  type: Exclude<CatalogItemType, "field">;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
};

const browseCategories: BrowseCategory[] = [
  {
    type: "course",
    label: "Courses",
    description: "Programmes, qualifications and entry stages",
    icon: GraduationCap,
    href: "/admin/catalogue/courses",
  },
  {
    type: "course_offering",
    label: "Course offerings",
    description: "Courses delivered by an institution or campus",
    icon: BookOpen,
    href: "/admin/catalogue/course-offerings",
  },
  {
    type: "institution",
    label: "Institutions",
    description: "Universities, colleges and other providers",
    icon: Building2,
    href: "/admin/catalogue/institutions",
  },
  {
    type: "campus",
    label: "Campuses",
    description: "Institution locations and campus records",
    icon: MapPin,
    href: "/admin/catalogue/campuses",
  },
  {
    type: "pathway",
    label: "Pathways",
    description: "Education and progression routes",
    icon: Route,
    href: "/admin/catalogue/pathways",
  },
  {
    type: "examination",
    label: "Examinations",
    description: "Exams, conducting bodies and eligibility",
    icon: ClipboardCheck,
    href: "/admin/catalogue/examinations",
  },
  {
    type: "scholarship",
    label: "Scholarships",
    description: "Funding opportunities and eligibility",
    icon: Landmark,
    href: "/admin/catalogue/scholarships",
  },
];

export default function CataloguePage() {
  return (
    <Suspense fallback={<CatalogueOverviewFallback />}>
      <CatalogueOverview />
    </Suspense>
  );
}

async function CatalogueOverview() {
  let dashboard: Awaited<ReturnType<typeof getAdminDashboardData>>;
  try {
    dashboard = await getAdminDashboardData();
  } catch (error) {
    console.error(
      "[careerbridge-next] Catalogue overview data query failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return (
      <section
        role="alert"
        aria-labelledby="catalogue-error-heading"
        className="flex min-h-48 items-start gap-4 rounded-xl border border-[#dce5e0] bg-white p-5 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-7"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#f6f1e5] text-[#8a6c2e]">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h1 id="catalogue-error-heading" className="text-xl font-semibold text-[#17364a]">
            Catalogue overview is temporarily unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#526b72]">
            We could not load catalogue totals or recent activity.
          </p>
          <CatalogueRetryButton />
        </div>
      </section>
    );
  }

  const { catalogue, recentActivity } = dashboard;
  const counts = new Map(catalogue.byType.map(({ type, count }) => [type, count]));
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageHeader
        eyebrow="Admin workspace"
        title="Catalogue"
        description="Browse and monitor the records that power CareerBridge."
      />

      <dl aria-label="Catalogue summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <AdminMetricCard key={metric.label} {...metric} />
        ))}
      </dl>

      <AdminSectionCard
        id="browse-categories"
        title="Browse categories"
        description="Open a record type to search and review its catalogue entries."
        action={<AdminStatusBadge tone="muted">7 record categories</AdminStatusBadge>}
      >
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {browseCategories.map((category) => (
            <CategoryCard
              key={category.type}
              category={category}
              count={counts.get(category.type) ?? 0}
            />
          ))}
        </ul>
        <p className="mt-4 border-t border-[#edf1ee] pt-3 text-xs leading-5 text-[#657976]">
          The total also includes {(counts.get("field") ?? 0).toLocaleString("en-IN")} supporting Field taxonomy records; Fields are not a browse category.
        </p>
      </AdminSectionCard>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.4fr)]">
        <AdminSectionCard
          id="catalogue-attention"
          title="Needs attention"
          description="Only supported catalogue review states are shown."
        >
          <div className="flex items-start gap-3 rounded-lg border border-[#eee4cb] bg-[#fbf8ef] p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#8a6c2e]">
              <Clock3 aria-hidden="true" className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#17364a]">Records awaiting review</p>
              <p className="mt-1 text-xs leading-5 text-[#657976]">
                Latest revisions currently in review
              </p>
            </div>
            <span className="shrink-0 text-2xl font-semibold tabular-nums text-[#17364a]">
              {catalogue.inReviewItems.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#edf1ee] pt-4">
            <span className="text-xs text-[#657976]">Review screens are a non-persistent UI preview.</span>
            <AdminStatusBadge tone="muted">Preview only</AdminStatusBadge>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          id="catalogue-recent-activity"
          title="Recently updated"
          description="Latest committed catalogue lifecycle activity."
          action={<AdminStatusBadge tone="muted">Audit-backed</AdminStatusBadge>}
        >
          {recentActivity.length === 0 ? (
            <AdminEmptyState
              title="No recent catalogue changes"
              description="Committed catalogue lifecycle actions will appear here."
              icon={History}
            />
          ) : (
            <ul className="divide-y divide-[#edf1ee]">
              {recentActivity.slice(0, 5).map((event) => (
                <ActivityItem key={event.id} event={event} />
              ))}
            </ul>
          )}
        </AdminSectionCard>
      </div>
    </div>
  );
}

function CatalogueOverviewFallback() {
  return (
    <div aria-busy="true" aria-label="Loading catalogue overview" className="space-y-6 sm:space-y-8">
      <div className="h-28 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-xl border border-[#dce5e0] bg-white"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
    </div>
  );
}

function CategoryCard({
  category,
  count,
}: {
  category: BrowseCategory;
  count: number;
}) {
  const { icon: Icon } = category;
  const content = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#edf4ef] text-[#377b78]">
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold text-[#17364a]">{category.label}</span>
          <span className="shrink-0 text-lg font-semibold tabular-nums text-[#17364a]">
            {count.toLocaleString("en-IN")}
          </span>
        </span>
        <span className="mt-1 block text-xs leading-5 text-[#657976]">{category.description}</span>
      </span>
      <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-[#377b78]" />
    </>
  );

  return (
    <li>
      <Link
        href={category.href}
        className="flex min-h-[6.25rem] items-center gap-3 rounded-lg border border-[#dce5e0] bg-white p-4 transition-colors hover:border-[#9dbdb2] hover:bg-[#fbfcfb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
      >
          {content}
      </Link>
    </li>
  );
}

function ActivityItem({ event }: { event: RecentAdminActivity }) {
  const itemLabel = event.itemTitle?.trim() || event.itemId;
  const actor = event.actorName?.trim() || `Admin #${event.actorId}`;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4 first:pt-0 last:pb-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f1f5f2] text-[#526b72]">
        <History aria-hidden="true" className="size-[17px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#17364a]" title={itemLabel}>{itemLabel}</p>
        <p className="mt-1 text-xs text-[#657976]">
          {auditActionLabels[event.action]} · {auditKindLabels[event.kind]} · {actor}
        </p>
      </div>
      <span className="shrink-0 text-xs tabular-nums text-[#71817d]">
        <AdminDate value={event.createdAt} />
      </span>
    </li>
  );
}
