import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  FileText,
  History,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "../admin-ui";
import {
  auditActionVerbs,
  auditEventTitles,
  auditKindLabels,
  type AuditPreviewEventWithLinks,
} from "./audit-preview-data";
import { AdminDate } from "../admin-date";

function EventValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-b border-[#edf1ee] py-3 last:border-b-0">
      <dt className="text-xs font-medium text-[#71817d]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-[#17364a]">{children}</dd>
    </div>
  );
}

export function AuditEventDetail({
  event,
}: {
  event: AuditPreviewEventWithLinks;
}) {
  const actionLabel = auditActionVerbs[event.action];
  const revisionLabel = `Revision ${event.revisionNumber}`;

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        eyebrow="Audit History / Event details"
        title={auditEventTitles[event.action]}
        description="Inspect the actor, action, affected catalogue record and revision reference."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/audit"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cbdcd4] bg-white px-3 text-sm font-semibold text-[#286c60] hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to audit history
        </Link>
        <AdminStatusBadge tone={event.action === "publish" || event.action === "approve" ? "accent" : "muted"}>
          {actionLabel}
        </AdminStatusBadge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <AdminSectionCard
          id="audit-event-information"
          title="Event information"
          description="Only fields recorded by the lifecycle audit event are shown."
        >
          <dl className="divide-y divide-[#edf1ee]">
            <EventValue label="Action">{actionLabel}</EventValue>
            <EventValue label="Record type">{auditKindLabels[event.kind]}</EventValue>
            <EventValue label="Record">
              <Link
                href={event.recordHref}
                className="text-[#286c60] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
              >
                {event.itemTitle}
              </Link>
            </EventValue>
            <EventValue label="Revision">{revisionLabel}</EventValue>
            <EventValue label="Performed by">{event.actorName}</EventValue>
            <EventValue label="Date and time">
              <AdminDate value={event.createdAt} includeTime />
            </EventValue>
            <EventValue label="Event reference">
              <span className="font-mono text-xs font-medium">{event.id}</span>
            </EventValue>
          </dl>
        </AdminSectionCard>

        <aside className="space-y-5">
          <AdminSectionCard
            id="audit-affected-record"
            title="Affected record"
            description="Catalogue record associated with this committed action."
          >
            <div className="rounded-lg border border-[#e1e9e4] bg-[#f8faf8] p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#377b78]">
                  <FileText aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="break-words font-semibold text-[#17364a]">{event.itemTitle}</p>
                  <p className="mt-1 text-sm text-[#657976]">{event.recordSubtitle}</p>
                  <p className="mt-2 break-all font-mono text-xs text-[#71817d]">{event.itemId}</p>
                </div>
              </div>
              <Link
                href={event.recordHref}
                className="mt-4 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-[#286c60] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
              >
                Open catalogue record
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            id="audit-related-revision"
            title="Related revision"
            description="Revision identifiers and lifecycle state are available in the record's revision history."
          >
            <div className="rounded-lg border border-[#e1e9e4] bg-[#f8faf8] p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#377b78]">
                  <History aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[#17364a]">{revisionLabel}</p>
                  <p className="mt-1 break-all font-mono text-xs text-[#71817d]">{event.revisionId}</p>
                </div>
              </div>
              <Link
                href={event.revisionHref}
                className="mt-4 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-[#286c60] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
              >
                View revision history
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </AdminSectionCard>
        </aside>
      </div>

      <div className="flex flex-wrap items-start gap-3 rounded-xl border border-[#d4e0ea] bg-[#eef4f8] p-4 text-sm">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#496b85]">
          <CalendarClock aria-hidden="true" className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-[#234c66]">Audit event scope</p>
          <p className="mt-1 leading-5 text-[#496b85]">
            The audit log records successful lifecycle mutations. It does not contain field-level
            before-and-after snapshots or failed attempts. This event is illustrative and not a
            saved audit record.
          </p>
        </div>
      </div>
    </div>
  );
}
