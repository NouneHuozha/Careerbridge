import Link from "next/link";
import { ArrowLeft, ArrowUpRight, History } from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatusBadge,
} from "../admin-ui";
import type { CatalogueCategoryDefinition } from "./catalogue-preview-data";
import type { CatalogueListingRecord } from "./listing-utils";
import {
  auditActionVerbs,
  auditActivityTitles,
  auditKindLabels,
  getAuditPreviewEventsForRecord,
} from "../audit/audit-preview-data";
import { AdminDate } from "../admin-date";

export function RecordActivityHistory({
  category,
  record,
}: {
  category: CatalogueCategoryDefinition;
  record: CatalogueListingRecord;
}) {
  const events = getAuditPreviewEventsForRecord(category.slug, record.id);
  const recordHref = `/admin/catalogue/${category.slug}/${record.id}`;

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        eyebrow={`Catalogue / ${record.aliases[0] ?? record.id} / Activity history`}
        title="Record activity"
        description="Administrative events associated with this catalogue record."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={recordHref}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cbdcd4] bg-white px-3 text-sm font-semibold text-[#286c60] hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to record
        </Link>
        <AdminStatusBadge tone="muted">Preview record · not live data</AdminStatusBadge>
      </div>

      <section className="rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e7ede9] pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">
              {category.singularLabel} · {record.id}
            </p>
            <h2 className="mt-1 break-words text-lg font-semibold text-[#17364a]">
              {record.title}
            </h2>
          </div>
          <Link
            href="/admin/audit"
            className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-[#286c60] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
          >
            All audit history
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>

        {events.length > 0 ? (
          <ol className="mt-5 space-y-3">
            {events.map((event, index) => (
              <li key={event.id} className="relative pl-8">
                {index < events.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-[-0.9rem] left-[0.6rem] top-5 w-px bg-[#dce5e0]"
                  />
                )}
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1 grid size-5 place-items-center rounded-full border border-[#b8d0c5] bg-[#edf6f1] text-[10px] font-semibold text-[#286c60]"
                >
                  {index + 1}
                </span>
                <article className="rounded-lg border border-[#e3eae6] bg-[#fbfcfb] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/audit/${event.id}`}
                        className="font-semibold text-[#17364a] hover:text-[#286c60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
                      >
                        {auditActivityTitles[event.action]}
                      </Link>
                      <p className="mt-1 text-xs text-[#657976]">
                        <AdminDate value={event.createdAt} includeTime />
                        {" · "}
                        {event.actorName}
                        {" · "}
                        Revision {event.revisionNumber}
                      </p>
                    </div>
                    <AdminStatusBadge
                      tone={event.action === "publish" || event.action === "approve" ? "accent" : "muted"}
                    >
                      {auditKindLabels[event.kind]} · {auditActionVerbs[event.action]}
                    </AdminStatusBadge>
                  </div>
                  <Link
                    href={`/admin/audit/${event.id}`}
                    className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[#286c60] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
                  >
                    View event details
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <div className="pt-5">
            <AdminEmptyState
              title="No activity in this preview"
              description="When audit events are connected, lifecycle actions for this record will appear here."
              icon={History}
            />
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-[#71817d]">
        This timeline contains illustrative events only. The audit system records committed
        lifecycle actions; it does not include failed attempts or before-and-after field snapshots.
      </p>
    </div>
  );
}
