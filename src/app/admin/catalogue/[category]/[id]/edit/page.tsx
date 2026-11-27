import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCataloguePreviewRecord } from "../../../catalogue-preview-data";
import { RevisionEditor } from "../../../revision-editor";
import { CatalogueRouteFallback } from "../../../route-fallback";

export default function CatalogueRevisionEditorPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  return (
    <Suspense fallback={<CatalogueRouteFallback />}>
      <CatalogueRevisionEditorPageContent params={params} />
    </Suspense>
  );
}

async function CatalogueRevisionEditorPageContent({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { category, id } = await params;
  const preview = getCataloguePreviewRecord(category, id);
  if (!preview) notFound();

  return (
    <RevisionEditor
      category={preview.category}
      record={preview.record}
      detail={preview.detail}
    />
  );
}
