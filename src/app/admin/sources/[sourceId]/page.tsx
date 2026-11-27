import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SourceDetail } from "./source-detail";
import { getSourcePreviewById } from "../source-preview-data";
import { SourceRouteFallback } from "../source-route-fallback";

export default function SourceDetailPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  return (
    <Suspense fallback={<SourceRouteFallback />}>
      <SourceDetailPageContent params={params} />
    </Suspense>
  );
}

async function SourceDetailPageContent({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const source = getSourcePreviewById(sourceId);
  if (!source) notFound();

  return <SourceDetail source={source} />;
}
