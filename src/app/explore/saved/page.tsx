import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import { listPathwaysForUi } from "../pathways/pathway-page-data";
import { listExaminationsForUi } from "../examinations/examination-page-data";
import { listScholarshipsForUi } from "../scholarships/scholarship-page-data";
import SavedItemsPage from "./saved-items-page";

export const metadata: Metadata = {
  title: "Saved | CareerBridge",
  description: "Return to the fields, courses and opportunities you saved.",
};

async function SavedContent() {
  const [pathways, examinations, scholarships] = await Promise.all([
    listPathwaysForUi(),
    listExaminationsForUi(),
    listScholarshipsForUi(),
  ]);
  return <SavedItemsPage pathways={pathways} examinations={examinations} scholarships={scholarships} />;
}

export default function SavedPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="collection" showHeader={false} />}>
      <SavedContent />
    </Suspense>
  );
}
