import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CatalogueRecordDetail } from "../../record-detail";
import { getCataloguePreviewRecord } from "../../catalogue-preview-data";
import { CatalogueRouteFallback } from "../../route-fallback";

export default function CatalogueRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<CatalogueRouteFallback />}>
      <CatalogueRecordPageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CatalogueRecordPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const [{ category: categorySlug, id }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const preview = getCataloguePreviewRecord(categorySlug, id);
  if (!preview) notFound();

  const initialTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  return (
    <CatalogueRecordDetail
      category={preview.category}
      record={preview.record}
      detail={preview.detail}
      initialTab={initialTab}
    />
  );
}
