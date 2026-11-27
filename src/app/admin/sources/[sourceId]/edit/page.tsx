import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "../../../admin-ui";
import { getSourcePreviewById } from "../../source-preview-data";
import { SourceForm } from "../../source-form";
import { SourceRouteFallback } from "../../source-route-fallback";

export default function EditSourcePage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  return (
    <Suspense fallback={<SourceRouteFallback />}>
      <EditSourcePageContent params={params} />
    </Suspense>
  );
}

async function EditSourcePageContent({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const source = getSourcePreviewById(sourceId);
  if (!source) notFound();

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        eyebrow={`Sources / ${source.name} / Edit source`}
        title="Edit source"
        description="Review metadata changes before saving. Existing claim references and verification states are not changed by metadata edits."
      />
      <SourceForm source={source} cancelHref={`/admin/sources/${source.id}`} />
    </div>
  );
}
