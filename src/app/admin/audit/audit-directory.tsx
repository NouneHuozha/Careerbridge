"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  History,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "../admin-ui";
import type { AdminAuditAction, AdminAuditKind } from "../../../db/schema/catalog";
import {
  auditActionLabels,
  auditKindLabels,
  auditPreviewEvents,
} from "./audit-preview-data";
import {
  filterAuditEvents,
  getAuditPageCount,
  paginateAuditEvents,
} from "./audit-utils";
import { AdminDate } from "../admin-date";
import { useAdminWorkspacePreferences } from "../workspace-preferences-provider";

const actionFilters: Array<{ value: AdminAuditAction | "all"; label: string }> = [
  { value: "all", label: "All events" },
  { value: "submit", label: "Submit" },
  { value: "review", label: "Review" },
  { value: "approve", label: "Approve" },
  { value: "reject", label: "Reject" },
  { value: "publish", label: "Publish" },
  { value: "associate-source", label: "Source linked" },
];

const kindOptions = Object.entries(auditKindLabels) as Array<
  [AdminAuditKind, string]
>;

function PreviewMetric({
  label,
  detail,
  icon: Icon,
}: {
  label: string;
  detail: string;
  icon: typeof History;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <dt className="text-sm font-semibold text-[#526b72]">{label}</dt>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf6f1] text-[#377b78]">
          <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
        </span>
      </div>
      <dd className="mt-3 text-3xl font-semibold leading-none text-[#17364a]">—</dd>
      <p className="mt-2 text-xs leading-5 text-[#657976]">{detail}</p>
    </div>
  );
}

function actionTone(action: AdminAuditAction): "accent" | "muted" {
  return action === "publish" || action === "approve" ? "accent" : "muted";
}

export function AuditDirectory() {
  const { preferences } = useAdminWorkspacePreferences();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<AdminAuditAction | "all">("all");
  const [actor, setActor] = useState("all");
  const [kind, setKind] = useState<AdminAuditKind | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [manualPageSize, setManualPageSize] = useState<number | null>(null);
  const pageSize = manualPageSize ?? preferences.recordsPerPage;

  const filteredEvents = useMemo(
    () =>
      filterAuditEvents(auditPreviewEvents, {
        query,
        action,
        actor,
        kind,
        fromDate,
        toDate,
      }),
    [query, action, actor, kind, fromDate, toDate],
  );
  const pageCount = getAuditPageCount(filteredEvents.length, pageSize);
  const visibleEvents = paginateAuditEvents(filteredEvents, page, pageSize);
  const pageStart = filteredEvents.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, filteredEvents.length);
  const actors = [...new Set(auditPreviewEvents.map((event) => event.actorName))].sort();
  const hasFilters =
    query !== "" ||
    action !== "all" ||
    actor !== "all" ||
    kind !== "all" ||
    fromDate !== "" ||
    toDate !== "";

  function resetPage() {
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setAction("all");
    setActor("all");
    setKind("all");
    setFromDate("");
    setToDate("");
    resetPage();
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        eyebrow="Admin / Audit History"
        title="Audit History"
        description="A chronological record of administrative changes to CareerBridge catalogue data."
      />

      <div className="flex flex-wrap items-start gap-3 rounded-xl border border-[#d4e0ea] bg-[#eef4f8] p-4 text-sm">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#496b85]">
          <ShieldCheck aria-hidden="true" className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-[#234c66]">Preview only · illustrative events</p>
          <p className="mt-1 leading-5 text-[#496b85]">
            These example rows are not connected to saved audit events. Live totals and event
            history will appear when the read-only audit query is connected.
          </p>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <PreviewMetric
          label="Total events"
          detail="Live count unavailable in this preview"
          icon={History}
        />
        <PreviewMetric
          label="Today's events"
          detail="Live count unavailable in this preview"
          icon={CalendarDays}
        />
        <PreviewMetric
          label="Active admins"
          detail="Distinct actors require connected audit data"
          icon={Users}
        />
      </dl>

      <AdminSectionCard
        id="audit-events"
        title="Activity events"
        description="Review committed lifecycle actions and open an event for its recorded context."
      >
        <div className="space-y-4">
          <div className="relative">
            <label htmlFor="audit-search" className="sr-only">
              Search record name, ID or administrator
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71817d]"
            />
            <input
              id="audit-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.currentTarget.value);
                resetPage();
              }}
              placeholder="Search record name, ID or administrator..."
              className="min-h-11 w-full rounded-lg border border-[#d4dfd9] bg-white py-2 pl-10 pr-3 text-sm text-[#17364a] placeholder:text-[#879690] focus:border-[#377b78] focus:outline-none focus:ring-2 focus:ring-[#377b78]/20"
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#657976]">
              Action
            </legend>
            <div className="flex flex-wrap gap-2">
              {actionFilters.map((filter) => {
                const selected = action === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setAction(filter.value);
                      resetPage();
                    }}
                    className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78] ${
                      selected
                        ? "border-[#286c60] bg-[#286c60] text-white"
                        : "border-[#dce5e0] bg-white text-[#526b72] hover:border-[#9dbdb2] hover:text-[#17364a]"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_auto] xl:items-end">
            <label className="block text-xs font-semibold text-[#526b72]">
              Administrator
              <select
                value={actor}
                onChange={(event) => {
                  setActor(event.currentTarget.value);
                  resetPage();
                }}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d4dfd9] bg-white px-3 text-sm font-normal text-[#17364a] focus:border-[#377b78] focus:outline-none focus:ring-2 focus:ring-[#377b78]/20"
              >
                <option value="all">All administrators</option>
                {actors.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-[#526b72]">
              Record type
              <select
                value={kind}
                onChange={(event) => {
                  setKind(event.currentTarget.value as AdminAuditKind | "all");
                  resetPage();
                }}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-[#d4dfd9] bg-white px-3 text-sm font-normal text-[#17364a] focus:border-[#377b78] focus:outline-none focus:ring-2 focus:ring-[#377b78]/20"
              >
                <option value="all">All record types</option>
                {kindOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <fieldset className="grid grid-cols-2 gap-2">
              <legend className="mb-1.5 col-span-2 text-xs font-semibold text-[#526b72]">
                Date range
              </legend>
              <label className="block text-[11px] font-medium text-[#71817d]">
                From
                <input
                  type="date"
                  aria-label="From date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(event) => {
                    setFromDate(event.currentTarget.value);
                    resetPage();
                  }}
                  className="mt-1 block min-h-10 w-full rounded-lg border border-[#d4dfd9] bg-white px-2 text-sm text-[#17364a] focus:border-[#377b78] focus:outline-none focus:ring-2 focus:ring-[#377b78]/20"
                />
              </label>
              <label className="block text-[11px] font-medium text-[#71817d]">
                To
                <input
                  type="date"
                  aria-label="To date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(event) => {
                    setToDate(event.currentTarget.value);
                    resetPage();
                  }}
                  className="mt-1 block min-h-10 w-full rounded-lg border border-[#d4dfd9] bg-white px-2 text-sm text-[#17364a] focus:border-[#377b78] focus:outline-none focus:ring-2 focus:ring-[#377b78]/20"
                />
              </label>
            </fieldset>
            <button
              type="button"
              disabled={!hasFilters}
              onClick={clearFilters}
              className="min-h-10 rounded-lg px-3 text-sm font-semibold text-[#286c60] hover:bg-[#edf6f1] disabled:cursor-not-allowed disabled:text-[#a0aca7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
            >
              Clear filters
            </button>
          </div>

          {filteredEvents.length > 0 ? (
            <>
              <div
                role="region"
                aria-label="Activity events table"
                tabIndex={0}
                className="overflow-x-auto rounded-lg border border-[#e1e9e4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
              >
                <table className="w-full min-w-[48rem] border-collapse text-left">
                  <caption className="sr-only">Illustrative administrative activity events</caption>
                  <thead className="bg-[#f7f9f7]">
                    <tr className="border-b border-[#e1e9e4] text-xs font-semibold uppercase tracking-wide text-[#657976]">
                      <th scope="col" className="px-4 py-3">Action / record</th>
                      <th scope="col" className="px-4 py-3">Administrator</th>
                      <th scope="col" className="px-4 py-3">Date</th>
                      <th scope="col" className="px-4 py-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf1ee] bg-white">
                    {visibleEvents.map((event) => (
                      <tr key={event.id} className="align-top hover:bg-[#fbfcfb]">
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <AdminStatusBadge tone={actionTone(event.action)}>
                              {auditActionLabels[event.action]}
                            </AdminStatusBadge>
                            <span className="text-xs text-[#71817d]">
                              {auditKindLabels[event.kind]}
                            </span>
                          </div>
                          <Link
                            href={`/admin/audit/${event.id}`}
                            className="mt-2 inline-flex max-w-full items-center gap-1 break-words text-sm font-semibold text-[#17364a] hover:text-[#286c60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
                          >
                            {event.itemTitle}
                          </Link>
                          <p className="mt-0.5 font-mono text-[11px] text-[#71817d]">{event.itemId}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-[#405a5e]">{event.actorName}</td>
                        <td className="px-4 py-4 text-sm text-[#526b72]">
                          <AdminDate value={event.createdAt} includeTime />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link
                            href={`/admin/audit/${event.id}`}
                            className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm font-semibold text-[#286c60] hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
                          >
                            View <ArrowUpRight aria-hidden="true" className="size-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1ee] pt-4">
                <p aria-live="polite" className="text-xs text-[#657976]">
                  Showing {pageStart}–{pageEnd} of {filteredEvents.length} preview events
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="mr-1 text-xs text-[#657976]">
                    Rows
                    <select
                      aria-label="Rows per page"
                      value={pageSize}
                      onChange={(event) => {
                        setManualPageSize(Number(event.currentTarget.value));
                        resetPage();
                      }}
                      className="ml-2 min-h-9 rounded-md border border-[#d4dfd9] bg-white px-2 text-xs text-[#405a5e] focus:border-[#377b78] focus:outline-none focus:ring-2 focus:ring-[#377b78]/20"
                    >
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="min-h-9 rounded-md border border-[#dce5e0] bg-white px-3 text-xs font-semibold text-[#405a5e] hover:bg-[#f7f9f7] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
                  >
                    Previous
                  </button>
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      aria-current={pageNumber === page ? "page" : undefined}
                      onClick={() => setPage(pageNumber)}
                      className={`grid size-9 place-items-center rounded-md text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78] ${
                        pageNumber === page
                          ? "bg-[#286c60] text-white"
                          : "border border-[#dce5e0] bg-white text-[#405a5e] hover:bg-[#f7f9f7]"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={page >= pageCount}
                    onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                    className="min-h-9 rounded-md border border-[#dce5e0] bg-white px-3 text-xs font-semibold text-[#405a5e] hover:bg-[#f7f9f7] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <AdminEmptyState
              title="No audit events match these filters"
              description="Try a different search or clear one or more filters. The preview only contains a small set of illustrative events."
              icon={History}
            />
          )}
        </div>
      </AdminSectionCard>

      <p className="text-xs leading-5 text-[#71817d]">
        Audit history records successfully committed lifecycle actions. It does not show failed
        attempts, field-by-field before-and-after values, or general login activity.
      </p>
    </div>
  );
}
