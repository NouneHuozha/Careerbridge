import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCataloguePreviewRecord } from "../../../catalogue-preview-data";
import { RevisionComparison } from "../../../revision-comparison";
import { CatalogueRouteFallback } from "../../../route-fallback";

export default function CatalogueRevisionComparisonPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  return (
    <Suspense fallback={<CatalogueRouteFallback />}>
      <CatalogueRevisionComparisonPageContent params={params} />
    </Suspense>
  );
}

async function CatalogueRevisionComparisonPageContent({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { category, id } = await params;
  const preview = getCataloguePreviewRecord(category, id);
  if (!preview) notFound();

  return (
    <RevisionComparison
      category={preview.category}
      record={preview.record}
      detail={preview.detail}
    />
  );
}
