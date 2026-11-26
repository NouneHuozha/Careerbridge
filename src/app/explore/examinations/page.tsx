import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import ExaminationsExplorer from "./examinations-explorer";
import { listExaminationsForUi } from "./examination-page-data";

export const metadata: Metadata = {
  title: "Examinations | CareerBridge",
  description:
    "Explore published examinations by education stage, authority, region and field.",
};

async function ExaminationsContent() {
  const examinations = await listExaminationsForUi();
  return <ExaminationsExplorer examinations={examinations} />;
}

export default function ExaminationsPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="collection" showHeader={false} />}>
      <ExaminationsContent />
    </Suspense>
  );
}
