import type { Metadata } from "next";
import { Suspense } from "react";
import CollegeListView from "./college-list-view";

type CollegeListPageProps = {
  searchParams: Promise<{ route?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "Browse Colleges — CareerBridge",
  description:
    "Explore source-checked college programme records, locations, official sources, and clearly marked details to verify.",
};

async function CollegeListContent({
  searchParams,
}: CollegeListPageProps) {
  const params = await searchParams;
  return <CollegeListView routeParam={params.route} />;
}

function CollegeListLoading() {
  return (
    <main className="min-h-screen bg-[#fbfaf6] text-[#18352d]">
      <div className="h-16 bg-[#123f34]" aria-hidden="true" />
      <div className="bg-[#123f34] pb-12 pt-8 text-white" aria-hidden="true">
        <div className="cb-container">
          <div className="h-4 w-36 animate-pulse rounded bg-white/20" />
          <div className="mt-8 h-12 w-3/4 animate-pulse rounded bg-white/20" />
          <div className="mt-4 h-5 w-full max-w-xl animate-pulse rounded bg-white/15" />
        </div>
      </div>
      <div className="cb-container py-10">
        <p role="status" className="text-sm text-[#59665e]">
          Preparing your college list…
        </p>
        <div className="mt-5 h-56 animate-pulse rounded-3xl bg-[#eeede6]" />
      </div>
    </main>
  );
}

export default function CollegeListPage(props: CollegeListPageProps) {
  return (
    <Suspense fallback={<CollegeListLoading />}>
      <CollegeListContent searchParams={props.searchParams} />
    </Suspense>
  );
}
