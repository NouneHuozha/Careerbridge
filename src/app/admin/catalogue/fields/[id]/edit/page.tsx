import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getAdminFieldDetail } from "../../../../../../db/admin-fields";
import { AdminPageHeader } from "../../../../admin-ui";
import { CatalogueRetryButton } from "../../../retry-button";
import { CreateFieldForm } from "../../create-field-form";

export default function EditFieldPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div aria-busy="true" className="h-96 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />}>
      <EditFieldContent params={params} />
    </Suspense>
  );
}

async function EditFieldContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let field: Awaited<ReturnType<typeof getAdminFieldDetail>>;
  try {
    field = await getAdminFieldDetail(id);
  } catch (error) {
    console.error(
      "[careerbridge-next] Admin Field edit query failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return (
      <section
        role="alert"
        aria-labelledby="field-edit-error-heading"
        className="rounded-xl border border-[#dce5e0] bg-white p-5 sm:p-7"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#8a6c2e]" />
          <div>
            <h1 id="field-edit-error-heading" className="text-xl font-semibold text-[#17364a]">
              Field details are temporarily unavailable
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#526b72]">
              We could not load this Field for editing. Your data has not been changed.
            </p>
            <CatalogueRetryButton />
          </div>
        </div>
      </section>
    );
  }
  if (!field) notFound();
  if (!field.latestRevisionId || field.revisionNumber === null || !field.title) notFound();

  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageHeader
        eyebrow={`Fields / ${field.id} / Edit`}
        title="Edit Field"
        description="Save a draft or mark the new revision ready for review. The current published version stays unchanged until you publish."
      />
      <CreateFieldForm
        existingField={{
          id: field.id,
          latestRevisionId: field.latestRevisionId,
          hasImage: field.hasImage,
          title: field.title,
          summary: field.summary,
          description: field.description,
          content: field.content,
          sources: field.sources,
        }}
      />
    </div>
  );
}
