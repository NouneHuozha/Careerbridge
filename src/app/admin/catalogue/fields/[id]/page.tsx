import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getAdminFieldDetail } from "../../../../../db/admin-fields";
import { AdminPageHeader } from "../../../admin-ui";
import { CatalogueRetryButton } from "../../retry-button";
import { FieldDetail } from "../field-detail";

type FieldSearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AdminFieldPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: FieldSearchParams;
}) {
  return (
    <Suspense fallback={<FieldDetailFallback />}>
      <FieldDetailPage params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function FieldDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: FieldSearchParams;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  let field: Awaited<ReturnType<typeof getAdminFieldDetail>>;
  try {
    field = await getAdminFieldDetail(id);
  } catch (error) {
    console.error(
      "[careerbridge-next] Admin field detail query failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Catalogue / Fields"
          title="Field details are temporarily unavailable"
          description="We could not load this catalogue record. Your data has not been changed."
        />
        <section
          role="alert"
          aria-labelledby="admin-field-detail-error-heading"
          className="rounded-xl border border-[#dce5e0] bg-white p-5 sm:p-7"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#8a6c2e]" />
            <div>
              <h2 id="admin-field-detail-error-heading" className="text-lg font-semibold text-[#17364a]">
                Record could not be loaded
              </h2>
              <CatalogueRetryButton />
            </div>
          </div>
        </section>
      </div>
    );
  }
  if (!field) notFound();

  return (
    <FieldDetail
      field={field}
      compareFrom={firstValue(query.compareFrom)}
      compareTo={firstValue(query.compareTo)}
    />
  );
}

function FieldDetailFallback() {
  return (
    <div aria-busy="true" aria-label="Loading Field details" className="space-y-5">
      <div className="h-10 w-40 animate-pulse rounded-lg bg-white" />
      <div className="h-28 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
      <div className="h-64 animate-pulse rounded-xl border border-[#dce5e0] bg-white" />
    </div>
  );
}
