import { Suspense } from "react";
import { notFound } from "next/navigation";
import { RecordActivityHistory } from "../../../record-activity-history";
import { getCataloguePreviewRecord } from "../../../catalogue-preview-data";
import { CatalogueRouteFallback } from "../../../route-fallback";

export default function CatalogueRecordActivityPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  return (
    <Suspense fallback={<CatalogueRouteFallback />}>
      <CatalogueRecordActivityPageContent params={params} />
    </Suspense>
  );
}

async function CatalogueRecordActivityPageContent({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { category, id } = await params;
  const preview = getCataloguePreviewRecord(category, id);
  if (!preview) notFound();

  return (
    <RecordActivityHistory
      category={preview.category}
      record={preview.record}
    />
  );
}
