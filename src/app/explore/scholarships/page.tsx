import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import ScholarshipExplorer from "./scholarship-explorer";

export const metadata: Metadata = {
  title: "Scholarships | CareerBridge",
  description:
    "Explore scholarships and financial assistance by study level, provider and eligibility region.",
};

export default function ScholarshipsPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="collection" showHeader={false} />}>
      <ScholarshipExplorer />
    </Suspense>
  );
}
