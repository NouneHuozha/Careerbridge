import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileClock,
  History,
  Link2,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "../../../../admin-ui";
import { AdminDate } from "../../../../admin-date";
import {
  getSourceCheckAttempt,
  getSourcePreviewById,
} from "../../../source-preview-data";
import { SourceRouteFallback } from "../../../source-route-fallback";

const outcomeText = {
  successful: "Successful",
  failed: "Failed",
  changes_detected: "Changes detected",
} as const;

const outcomeTone = {
  successful: "accent",
  failed: "muted",
  changes_detected: "muted",
} as const;

export default function SourceAttemptDetailPage({
  params,
}: {
  params: Promise<{ sourceId: string; attemptId: string }>;
}) {
  return (
    <Suspense fallback={<SourceRouteFallback />}>
      <SourceAttemptDetailPageContent params={params} />
    </Suspense>
  );
}

async function SourceAttemptDetailPageContent({
  params,
}: {
  params: Promise<{ sourceId: string; attemptId: string }>;
}) {
  const { sourceId, attemptId } = await params;
  const source = getSourcePreviewById(sourceId);
  const attempt = getSourceCheckAttempt(sourceId, attemptId);
  if (!source || !attempt) notFound();

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        eyebrow={`Sources / ${source.name} / Fetch history / Attempt`}
        title="Check attempt details"
        description="Inspect the recorded URL, method, timestamp and outcome for this illustrative check."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/sources/${source.id}/history`}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cbdcd4] bg-white px-3 text-sm font-semibold text-[#286c60] hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to check history
        </Link>
        <AdminStatusBadge tone={outcomeTone[attempt.outcome]}>
          {attempt.outcome === "successful" ? (
            <CheckCircle2 aria-hidden="true" className="size-3.5" />
          ) : (
            <AlertCircle aria-hidden="true" className="size-3.5" />
          )}
          {outcomeText[attempt.outcome]}
        </AdminStatusBadge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <AdminSectionCard
          id="check-attempt-summary"
          title={attempt.method}
          description={attempt.summary}
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-[#f7f9f7] p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">Timestamp</dt>
              <dd className="mt-2 flex items-start gap-2 text-sm font-medium text-[#17364a]">
                <FileClock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#71817d]" />
                <AdminDate value={attempt.checkedAt} includeTime />
              </dd>
            </div>
            <div className="rounded-lg bg-[#f7f9f7] p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">Check method</dt>
              <dd className="mt-2 flex items-start gap-2 text-sm font-medium text-[#17364a]">
                <History aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#71817d]" />
                {attempt.method}
              </dd>
            </div>
            <div className="rounded-lg bg-[#f7f9f7] p-4 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">Checked URL</dt>
              <dd className="mt-2 flex items-start gap-2 break-all font-mono text-sm text-[#405a5e]">
                <Link2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#71817d]" />
                {attempt.url}
              </dd>
            </div>
          </dl>

          {attempt.detectedChanges && (
            <div className="mt-5 rounded-lg border border-[#eadfbd] bg-[#fbf6e8] p-4">
              <h3 className="text-sm font-semibold text-[#6f5c35]">Detected changes · review required</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-5 text-[#6f5c35]">
                {attempt.detectedChanges.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-5 text-[#80652e]">
                Change detection does not automatically invalidate claims or replace catalogue information.
              </p>
            </div>
          )}

          {attempt.errorDetails && (
            <div className="mt-5 rounded-lg border border-[#ead4d0] bg-[#fbefed] p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#8b5147]">
                <AlertCircle aria-hidden="true" className="size-4" />
                Error detail
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#8b5147]">{attempt.errorDetails}</p>
            </div>
          )}
        </AdminSectionCard>

        <aside className="space-y-5">
          <AdminSectionCard
            id="attempt-source"
            title="Source"
            description="Source record associated with this check."
          >
            <p className="font-semibold text-[#17364a]">{source.name}</p>
            <p className="mt-1 break-all font-mono text-xs text-[#657976]">{source.url}</p>
            <Link
              href={`/admin/sources/${source.id}`}
              className="mt-4 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-[#286c60] hover:text-[#20594f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
            >
              Open source details
              <ArrowLeft aria-hidden="true" className="size-3.5 rotate-180" />
            </Link>
          </AdminSectionCard>
          <p className="rounded-xl border border-[#d4e0ea] bg-[#eef4f8] p-4 text-sm leading-6 text-[#496b85]">
            Preview detail only. No live request or fetch was made to create this check attempt.
          </p>
        </aside>
      </div>
    </div>
  );
}
