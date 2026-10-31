import type { Metadata } from "next";
import { Suspense } from "react";
import ResultsView, { ResultsLoading } from "./results-view";

export const metadata: Metadata = {
  title: "Areas to Explore — CareerBridge",
  description:
    "Browse broad education and study areas at your own pace. Your choices do not decide eligibility.",
};

type ResultsPageProps = {
  searchParams: Promise<{
    mode?: string | string[];
    via?: string | string[];
  }>;
};

async function ResultsPageContent({
  searchParams,
}: ResultsPageProps) {
  const params = await searchParams;
  const forceAll = params.mode === "all";
  const returnToGuided = params.via === "guided";

  return (
    <ResultsView forceAll={forceAll} returnToGuided={returnToGuided} />
  );
}

export default function ResultsPage(props: ResultsPageProps) {
  return (
    <Suspense fallback={<ResultsLoading />}>
      <ResultsPageContent searchParams={props.searchParams} />
    </Suspense>
  );
}
