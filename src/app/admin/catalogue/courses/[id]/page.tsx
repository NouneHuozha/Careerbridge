import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { getAdminCourseDetail } from "../../../../../db/admin-courses";
import { AdminPageHeader } from "../../../admin-ui";
import { CatalogueRetryButton } from "../../retry-button";
import { CourseDetail } from "../course-detail";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isCourseTab(value: string | undefined): value is "overview" | "offerings" | "sources" | "history" {
  return value === "overview" || value === "offerings" || value === "sources" || value === "history";
}

export default async function AdminCourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  let course;
  try {
    course = await getAdminCourseDetail(id);
  } catch (error) {
    console.error(
      "[careerbridge-next] Admin Course detail query failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return (
      <div className="space-y-6">
        <Link
          href="/admin/catalogue/courses"
          className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-[#526b72] hover:bg-white hover:text-[#17364a]"
        >
          Back to Courses
        </Link>
        <AdminPageHeader
          eyebrow={`Catalogue / Courses / ${id}`}
          title="Course temporarily unavailable"
          description="The Course record could not be loaded from the catalogue database."
        />
        <section
          role="alert"
          aria-labelledby="admin-course-error-heading"
          className="rounded-xl border border-[#dce5e0] bg-white p-5 sm:p-7"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#8a6c2e]" />
            <div>
              <h2 id="admin-course-error-heading" className="text-xl font-semibold text-[#17364a]">
                Course details are temporarily unavailable
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#526b72]">
                No Course data has been changed. Retry when the catalogue database is available.
              </p>
              <CatalogueRetryButton />
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!course) notFound();

  const requestedTab = firstValue(query.tab);
  const tab = isCourseTab(requestedTab) ? requestedTab : "overview";
  return (
    <CourseDetail
      course={course}
      tab={tab}
      compareFrom={firstValue(query.compareFrom)}
      compareTo={firstValue(query.compareTo)}
    />
  );
}
