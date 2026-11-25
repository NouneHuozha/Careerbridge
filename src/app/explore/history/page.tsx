import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import { listPathwaysForUi } from "../pathways/pathway-page-data";
import ExplorationHistoryPage from "./history-page";

export const metadata: Metadata = {
  title: "Exploration History | CareerBridge",
  description: "Return to fields, courses and opportunities you have explored.",
};

async function HistoryContent() {
  const pathways = await listPathwaysForUi();
  return <ExplorationHistoryPage pathways={pathways} />;
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="collection" showHeader={false} />}>
      <HistoryContent />
    </Suspense>
  );
}
