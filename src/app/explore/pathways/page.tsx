import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import PathwaysExplorer from "./pathways-explorer";
import { listPathwaysForUi } from "./pathway-page-data";

export const metadata: Metadata = {
  title: "Pathways | CareerBridge",
  description: "Explore broad education routes after Class 10 or Class 12.",
};

async function PathwaysContent() {
  const pathways = await listPathwaysForUi();
  return <PathwaysExplorer pathways={pathways} />;
}

export default function PathwaysPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="collection" showHeader={false} />}>
      <PathwaysContent />
    </Suspense>
  );
}
