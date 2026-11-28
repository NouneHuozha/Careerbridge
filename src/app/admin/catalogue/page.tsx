import Link from "next/link";
import { Suspense } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  Landmark,
  LibraryBig,
  Route,
  type LucideIcon,
} from "lucide-react";
import type { CatalogItemType } from "../../../db/schema/catalog";
import {
  getCatalogueOverviewData,
  type CatalogueOverviewCategory,
  type RecentCatalogueRecord,
} from "./catalogue-overview-data";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "../admin-ui";
import { AdminDate } from "../admin-date";
import { CatalogueRetryButton } from "./retry-button";

const categoryIcons: Record<string, LucideIcon> = {
  fields: LibraryBig,
  courses: GraduationCap,
  institutions: Building2,
  pathways: Route,
  examinations: ClipboardCheck,
  scholarships: Landmark,
};

const categoryLabels: Record<CatalogItemType, string> = {
  field: "Fields",
  course: "Courses",
  course_offering: "Courses",
  institution: "Institutions",
  campus: "Institutions",
  pathway: "Pathways",
  examination: "Examinations",
  scholarship: "Scholarships",
};

const publicationLabels: Record<string, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

export default function CataloguePage() {
  return (
    <Suspense fallback={<CatalogueOverviewFallback />}>
      <CatalogueOverview />
    </Suspense>
  );
}

async function CatalogueOverview() {
  let overview: Awaited<ReturnType<typeof getCatalogueOverviewData>>;
  try {
    overview = await getCatalogueOverviewData();
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
            We could not load catalogue totals or recently updated records.
          </p>
          <CatalogueRetryButton />
        </div>
      </section>
    );
  }

  const { metrics: catalogue, categories, recentRecords } = overview;
  const metrics = [
    {
      label: "Total records",
      value: catalogue.totalItems,
      detail: "Across all catalogue record types",
      icon: LibraryBig,
      accentClass: "bg-[#eaf2ed] text-[#286c60]",
    },
    {
      label: "Published",
      value: catalogue.publishedItems,
      detail: "Records with a valid published revision",
      icon: CheckCircle2,
      accentClass: "bg-[#eaf2ed] text-[#286c60]",
    },
    {
      label: "In Review",
      value: catalogue.inReviewItems,
      detail: "Latest revisions awaiting review",
      icon: Clock3,
      accentClass: "bg-[#f6f1e5] text-[#8a6c2e]",
    },
    {
      label: "Without Published Version",
      value: catalogue.withoutPublishedVersion,
      detail: "No valid published revision",
      icon: LibraryBig,
      accentClass: "bg-[#eef2f6] text-[#496b85]",
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
        id="catalogue-categories"
        title="Catalogue categories"
        description="Campuses are grouped with Institutions; Course Offerings are grouped with Courses."
        action={<AdminStatusBadge tone="muted">6 categories</AdminStatusBadge>}
      >
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.slug}
              category={category}
            />
          ))}
        </ul>
      </AdminSectionCard>

      <AdminSectionCard
        id="recent-catalogue-records"
        title="Recently updated records"
        description="The five most recently updated records with a current real catalogue revision."
        action={
          <Link
            href="#catalogue-categories"
            className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-[#286c60] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
          >
            View All <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        }
      >
        {recentRecords.length === 0 ? (
          <AdminEmptyState
            title="No recently updated records"
            description="Records with a real catalogue revision will appear here after they are added."
            icon={LibraryBig}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#e5ece8] text-xs font-semibold uppercase tracking-wide text-[#71817d]">
                  <th scope="col" className="px-3 py-3">Record</th>
                  <th scope="col" className="px-3 py-3">Category</th>
                  <th scope="col" className="px-3 py-3">Latest revision</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-3 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ee]">
                {recentRecords.map((record) => (
                  <RecentRecordRow key={record.id} record={record} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>
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
      <div className="h-56 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
      <div className="h-72 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
    </div>
  );
}

function CategoryCard({
  category,
}: {
  category: CatalogueOverviewCategory;
}) {
  const Icon = categoryIcons[category.slug];
  const content = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#edf4ef] text-[#377b78]">
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold text-[#17364a]">{category.label}</span>
          <span className="shrink-0 text-lg font-semibold tabular-nums text-[#17364a]">
            {category.count.toLocaleString("en-IN")}
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

function RecentRecordRow({ record }: { record: RecentCatalogueRecord }) {
  return (
    <tr>
      <th scope="row" className="max-w-[22rem] px-3 py-4 text-sm font-semibold text-[#17364a]">
        <span className="block truncate" title={record.title}>{record.title}</span>
      </th>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-[#526b72]">
        {categoryLabels[record.itemType]}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-[#526b72]">
        Revision {record.revisionNumber}
      </td>
      <td className="whitespace-nowrap px-3 py-4">
        <AdminStatusBadge tone={record.publicationStatus === "published" ? "accent" : "muted"}>
          {publicationLabels[record.publicationStatus] ?? record.publicationStatus}
        </AdminStatusBadge>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm tabular-nums text-[#71817d]">
        <AdminDate value={record.updatedAt} />
      </td>
    </tr>
  );
}
