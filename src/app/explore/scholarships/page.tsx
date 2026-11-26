import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import ScholarshipExplorer from "./scholarship-explorer";
import { listScholarshipsForUi } from "./scholarship-page-data";

export const metadata: Metadata = {
  title: "Scholarships | CareerBridge",
  description:
    "Explore published scholarships and financial assistance by study level, provider and region.",
};

async function ScholarshipsContent() {
  const scholarships = await listScholarshipsForUi();
  return <ScholarshipExplorer scholarships={scholarships} />;
}

export default function ScholarshipsPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="collection" showHeader={false} />}>
      <ScholarshipsContent />
    </Suspense>
  );
}
