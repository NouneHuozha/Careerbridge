import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import InstitutionsExplorer from "./institutions-explorer";

export const metadata: Metadata = {
  title: "Institutions | CareerBridge",
  description: "Explore institutions and compare course offerings, locations and provider information.",
};

export default function InstitutionsPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="collection" showHeader={false} />}>
      <InstitutionsExplorer />
    </Suspense>
  );
}