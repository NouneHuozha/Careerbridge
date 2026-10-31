import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import CollegeDetailView from "../../colleges/college-detail-view";
import {
  collegeRecords,
  getCollegeByCode,
  getCollegeRouteOption,
  type CollegeRecord,
} from "../../colleges/college-data";

type CollegeDetailPageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ route?: string | string[] }>;
};

export function generateStaticParams() {
  return collegeRecords.map((college) => ({ code: college.code }));
}

export async function generateMetadata({
  params,
}: CollegeDetailPageProps): Promise<Metadata> {
  const { code } = await params;
  const college = getCollegeByCode(code);

  return college
    ? {
        title: `${college.name} — College Details — CareerBridge`,
        description: `View published programme information, official sources, contact details, and facts to confirm for ${college.name}.`,
      }
    : {
        title: "College not found — CareerBridge",
        description: "Browse the public CareerBridge college directory.",
      };
}

async function CollegeDetailContent({
  college,
  searchParams,
}: {
  college: CollegeRecord;
  searchParams: Promise<{ route?: string | string[] }>;
}) {
  const query = await searchParams;
  const routeSlug = typeof query.route === "string" ? query.route : undefined;
  const route = routeSlug ? getCollegeRouteOption(routeSlug) : null;
  const backHref =
    route && college.routeSlugs.includes(route.slug)
      ? `/colleges?route=${encodeURIComponent(route.slug)}`
      : "/colleges";

  return <CollegeDetailView college={college} backHref={backHref} />;
}

function CollegeDetailLoading() {
  return (
    <main className="min-h-screen bg-[#fbfaf6] text-[#18352d]">
      <div className="h-48 animate-pulse bg-[#123f34] sm:h-72" aria-hidden="true" />
      <div className="cb-container py-10">
        <p role="status" className="text-sm text-[#59665e]">
          Preparing this college page…
        </p>
        <div className="mt-5 h-48 animate-pulse rounded-3xl bg-[#eeede6]" />
      </div>
    </main>
  );
}

export default async function CollegeDetailPage(props: CollegeDetailPageProps) {
  const { code } = await props.params;
  const college = getCollegeByCode(code);
  if (!college) notFound();

  return (
    <Suspense fallback={<CollegeDetailLoading />}>
      <CollegeDetailContent
        college={college}
        searchParams={props.searchParams}
      />
    </Suspense>
  );
}
