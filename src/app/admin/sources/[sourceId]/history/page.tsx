import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getSourcePreviewById } from "../../source-preview-data";
import { SourceHistory } from "./source-history";
import { SourceRouteFallback } from "../../source-route-fallback";

export default function SourceHistoryPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  return (
    <Suspense fallback={<SourceRouteFallback />}>
      <SourceHistoryPageContent params={params} />
    </Suspense>
  );
}

async function SourceHistoryPageContent({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const source = getSourcePreviewById(sourceId);
  if (!source) notFound();

  return <SourceHistory source={source} />;
}
