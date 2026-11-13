import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import PathwaysExplorer from "./pathways-explorer";

export const metadata: Metadata = {
  title: "Pathways | CareerBridge",
  description: "Explore broad education routes after Class 10 or Class 12.",
};

export default function PathwaysPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="collection" showHeader={false} />}>
      <PathwaysExplorer />
    </Suspense>
  );
}
