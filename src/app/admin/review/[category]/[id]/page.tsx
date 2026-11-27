import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCataloguePreviewRecord } from "../../../catalogue/catalogue-preview-data";
import { ReviewWorkspace } from "../../../catalogue/review-workspace";
import { CatalogueRouteFallback } from "../../../catalogue/route-fallback";
import { getReviewQueuePreviewEntry } from "../../review-queue-preview-data";

export default function ClaimReviewPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  return (
    <Suspense fallback={<CatalogueRouteFallback />}>
      <ClaimReviewPageContent params={params} />
    </Suspense>
  );
}

async function ClaimReviewPageContent({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { category, id } = await params;
  const queueEntry = getReviewQueuePreviewEntry(category, id);
  const preview = getCataloguePreviewRecord(category, id);
  if (!queueEntry || !preview) notFound();

  return (
    <ReviewWorkspace
      category={preview.category}
      record={preview.record}
      detail={preview.detail}
      queueEntry={queueEntry}
    />
  );
}
