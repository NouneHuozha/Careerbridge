"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  History,
  Link2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  AdminEmptyState,
  AdminSectionCard,
  AdminStatusBadge,
} from "../../admin-ui";
import type {
  SourceCheckAttempt,
  SourceLinkedClaim,
  SourcePreviewRecord,
} from "../source-preview-data";
import { getSourceMaintenanceIssues } from "../source-utils";
import { AdminDate } from "../../admin-date";

type SourceDetailTab = "overview" | "claims" | "records" | "history";

const tabLabels: Array<{ key: SourceDetailTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "claims", label: "Linked claims" },
  { key: "records", label: "Linked records" },
  { key: "history", label: "Fetch history" },
];

const outcomeLabels = {
  successful: "Successful",
  failed: "Failed",
  changes_detected: "Changes detected",
} as const;

const outcomeClasses = {
  successful: "border-[#cfe3da] bg-[#edf6f1] text-[#286c60]",
  failed: "border-[#ead4d0] bg-[#fbefed] text-[#8b5147]",
  changes_detected: "border-[#eadfbd] bg-[#fbf6e8] text-[#80652e]",
} as const;

function CheckOutcomeBadge({ attempt }: { attempt: SourceCheckAttempt }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-semibold ${outcomeClasses[attempt.outcome]}`}
    >
      {outcomeLabels[attempt.outcome]}
    </span>
  );
}

function ClaimAssessment({ claim }: { claim: SourceLinkedClaim }) {
  const classes = {
    verified: "border-[#cfe3da] bg-[#edf6f1] text-[#286c60]",
    needs_review: "border-[#eadfbd] bg-[#fbf6e8] text-[#80652e]",
    unavailable: "border-[#d4e0ea] bg-[#eef4f8] text-[#496b85]",
  }[claim.assessment];
  const label = {
    verified: "Verified in preview",
    needs_review: "Needs review",
    unavailable: "Unavailable",
  }[claim.assessment];

  return (
    <li className="rounded-lg border border-[#e3eae6] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">
            {claim.label}
          </p>
          <p className="mt-1 break-words font-medium text-[#17364a]">{claim.value}</p>
        </div>
        <span className={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-semibold ${classes}`}>
          {label}
        </span>
      </div>
      <Link
        href={claim.recordHref}
        className="mt-3 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-[#286c60] hover:text-[#20594f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
      >
        {claim.recordLabel}
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
      </Link>
    </li>
  );
}

function AttemptCard({
  source,
  attempt,
}: {
  source: SourcePreviewRecord;
  attempt: SourceCheckAttempt;
}) {
  return (
    <li className="rounded-lg border border-[#e3eae6] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#17364a]">{attempt.method}</p>
          <p className="mt-1 text-sm text-[#657976]">
            <AdminDate value={attempt.checkedAt} />
          </p>
        </div>
        <CheckOutcomeBadge attempt={attempt} />
      </div>
      <p className="mt-3 text-sm leading-6 text-[#526b72]">{attempt.summary}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7ede9] pt-3">
        <span className="break-all font-mono text-xs text-[#657976]">{attempt.url}</span>
        <Link
          href={`/admin/sources/${source.id}/history/${attempt.id}`}
          className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-[#286c60] hover:text-[#20594f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
        >
          View check details
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </li>
  );
}

function OverviewTab({ source }: { source: SourcePreviewRecord }) {
  const latestAttempt = source.attempts[0];
  const accessLabel = latestAttempt
    ? outcomeLabels[latestAttempt.outcome]
    : "Not checked";

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)]">
      <div className="space-y-5">
        <AdminSectionCard
          id="source-overview"
          title="Overview"
          description="Source information and current access context."
        >
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">
                Description
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#405a5e]">
                {source.description || "No description has been added."}
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-[#f7f9f7] p-3.5">
                <dt className="text-xs text-[#71817d]">Domain</dt>
                <dd className="mt-1 break-all font-mono text-sm font-semibold text-[#17364a]">
                  {new URL(source.url).hostname}
                </dd>
              </div>
              <div className="rounded-lg bg-[#f7f9f7] p-3.5">
                <dt className="text-xs text-[#71817d]">Access status</dt>
                <dd className="mt-1 text-sm font-semibold text-[#17364a]">{accessLabel}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 max-w-full items-center gap-2 break-all rounded-lg border border-[#dce5e0] bg-white px-3 text-sm font-medium text-[#286c60] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
              >
                <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">{source.url}</span>
              </a>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          id="source-activity"
          title="Recent activity"
          description="Illustrative check history associated with this source."
          action={
            <Link
              href={`/admin/sources/${source.id}/history`}
              className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm font-semibold text-[#286c60] hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
            >
              View history <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          }
        >
          {source.attempts.length === 0 ? (
            <AdminEmptyState
              title="No check history available yet"
              description="Recorded source checks will appear here when the history workflow is connected."
              icon={History}
            />
          ) : (
            <ul className="space-y-3">
              {source.attempts.slice(0, 2).map((attempt) => (
                <AttemptCard key={attempt.id} source={source} attempt={attempt} />
              ))}
            </ul>
          )}
        </AdminSectionCard>
      </div>

      <aside className="space-y-5">
        <AdminSectionCard
          id="source-configuration"
          title="Source information"
          description="Classification and access settings."
        >
          <dl className="divide-y divide-[#e7ede9]">
            {[
              ["Authority", source.authorityCategory],
              ["Source type", source.sourceType],
              ["Issuing organisation", source.issuingOrganisation],
              ["Access method", source.accessMethod],
              ["Checking frequency", source.checkingFrequency],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <dt className="text-sm text-[#71817d]">{label}</dt>
                <dd className="max-w-[65%] break-words text-right text-sm font-medium capitalize text-[#405a5e]">
                  {value.replace(/_/g, " ")}
                </dd>
              </div>
            ))}
          </dl>
        </AdminSectionCard>

        <AdminSectionCard
          id="source-notes"
          title="Internal notes"
          description="Administrative context for reviewers."
        >
          <p className="text-sm leading-6 text-[#526b72]">
            {source.internalNotes || "No internal notes have been added."}
          </p>
        </AdminSectionCard>
      </aside>
    </div>
  );
}

function LinkedClaimsTab({ source }: { source: SourcePreviewRecord }) {
  if (source.claims.length === 0) {
    return (
      <AdminEmptyState
        title="No linked claims in this preview"
        description="Claim-level source associations are illustrative and are not connected to stored catalogue data."
        icon={ShieldCheck}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-[#657976]">
        Each association applies to a specific claim. A source does not automatically verify every
        claim in a linked record.
      </p>
      <ul className="grid gap-3 xl:grid-cols-2">
        {source.claims.map((claim) => (
          <ClaimAssessment key={claim.id} claim={claim} />
        ))}
      </ul>
    </div>
  );
}

function LinkedRecordsTab({ source }: { source: SourcePreviewRecord }) {
  if (source.records.length === 0) {
    return (
      <AdminEmptyState
        title="No linked catalogue records"
        description="This sample source has no record associations in the preview."
        icon={Link2}
      />
    );
  }

  return (
    <ul className="grid gap-3 xl:grid-cols-2">
      {source.records.map((record) => (
        <li key={record.id} className="rounded-lg border border-[#e3eae6] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">
                {record.category} · {record.id}
              </p>
              <Link
                href={record.href}
                className="mt-1 inline-block break-words font-semibold text-[#17364a] hover:text-[#286c60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
              >
                {record.title}
              </Link>
            </div>
            <span className="rounded-full bg-[#f1f5f2] px-2.5 py-1 text-xs font-medium text-[#526b72]">
              {record.claimCount} {record.claimCount === 1 ? "claim" : "claims"}
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-[#657976]">
            Illustrative source-to-record association; not connected to saved catalogue data.
          </p>
        </li>
      ))}
    </ul>
  );
}

function FetchHistoryTab({ source }: { source: SourcePreviewRecord }) {
  if (source.attempts.length === 0) {
    return (
      <AdminEmptyState
        title="No check history available yet"
        description="No fetch or check attempts are recorded in this preview source."
        icon={History}
      />
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {source.attempts.slice(0, 3).map((attempt) => (
          <AttemptCard key={attempt.id} source={source} attempt={attempt} />
        ))}
      </ul>
      <Link
        href={`/admin/sources/${source.id}/history`}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cbdcd4] px-3 text-sm font-semibold text-[#286c60] hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
      >
        Open full check history
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}

export function SourceDetail({ source }: { source: SourcePreviewRecord }) {
  const [activeTab, setActiveTab] = useState<SourceDetailTab>("overview");
  const [checkMessage, setCheckMessage] = useState("");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const maintenanceIssues = getSourceMaintenanceIssues(source);
  const statusClass =
    source.status === "inactive"
      ? "border-[#dce5e0] bg-[#f5f8f6] text-[#637572]"
      : "border-[#cfe3da] bg-[#edf6f1] text-[#286c60]";

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabLabels.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabLabels.length) % tabLabels.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabLabels.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    const nextTab = tabLabels[nextIndex];
    if (!nextTab) return;
    setActiveTab(nextTab.key);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#377b78]">
            Sources / {source.name}
          </p>
          <h1 className="mt-2 break-words text-3xl font-semibold tracking-[-0.035em] text-[#17364a] sm:text-[2.1rem]">
            {source.name}
          </h1>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex max-w-full items-center gap-1.5 break-all text-sm font-medium text-[#286c60] hover:text-[#20594f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
          >
            <span className="truncate">{source.url}</span>
            <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold ${statusClass}`}>
            {source.status === "active" ? "Active" : "Inactive"}
          </span>
          {maintenanceIssues.some((issue) => issue !== "inactive") && (
            <AdminStatusBadge tone="muted">
              <AlertCircle aria-hidden="true" className="size-3.5 text-[#80652e]" />
              Needs attention
            </AdminStatusBadge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/admin/sources/${source.id}/edit`}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cbdcd4] bg-white px-3 text-sm font-semibold text-[#286c60] transition-colors hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
        >
          <Pencil aria-hidden="true" className="size-4" />
          Edit source
        </Link>
        <button
          type="button"
          onClick={() =>
            setCheckMessage(
              "Preview only — no URL request was made and no check history was created.",
            )
          }
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#286c60] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#20594f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Check source
        </button>
        <details className="relative">
          <summary
            aria-label="More source actions"
            className="grid size-10 cursor-pointer list-none place-items-center rounded-lg border border-[#dce5e0] bg-white text-[#526b72] transition-colors hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
          >
            <MoreHorizontal aria-hidden="true" className="size-5" />
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-[#dce5e0] bg-white p-2 shadow-lg">
            <Link
              href={`/admin/sources/${source.id}/history`}
              className="block rounded-md px-2 py-2 text-sm font-medium text-[#405a5e] hover:bg-[#f4f7f5]"
            >
              Open check history
            </Link>
            <Link
              href="/admin/sources/maintenance"
              className="block rounded-md px-2 py-2 text-sm font-medium text-[#405a5e] hover:bg-[#f4f7f5]"
            >
              Source maintenance
            </Link>
          </div>
        </details>
      </div>

      {checkMessage && (
        <p role="status" className="rounded-lg border border-[#d4e0ea] bg-[#eef4f8] p-3 text-sm text-[#496b85]">
          <CheckCircle2 aria-hidden="true" className="mr-2 inline size-4" />
          {checkMessage}
        </p>
      )}

      <section aria-label="Source details" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          { label: "Authority", value: source.authorityCategory, icon: ShieldCheck, type: "text" },
          { label: "Source type", value: source.sourceType, icon: FileText, type: "text" },
          { label: "Registered", value: source.registeredAt, icon: Clock3, type: "date" },
          { label: "Last checked", value: source.lastCheckedAt, icon: History, type: "date" },
        ] as const).map(({ label, value, icon: Icon, type }) => (
          <div key={label} className="rounded-xl border border-[#dce5e0] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">{label}</p>
              <Icon aria-hidden="true" className="size-4 text-[#71817d]" />
            </div>
            <p className="mt-2 break-words text-base font-semibold capitalize text-[#17364a]">
              {type === "date"
                ? <AdminDate value={value} fallback="Not checked" />
                : value.replace(/_/g, " ")}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-[#dce5e0] bg-white shadow-[0_1px_2px_rgba(23,54,74,0.04)]">
        <div
          role="tablist"
          aria-label="Source detail sections"
          className="flex gap-1 overflow-x-auto border-b border-[#e3eae6] px-3 pt-3 sm:px-5"
        >
          {tabLabels.map(({ key, label }, index) => (
            <button
              key={key}
              id={`source-tab-${key}`}
              type="button"
              role="tab"
              tabIndex={activeTab === key ? 0 : -1}
              aria-selected={activeTab === key}
              aria-controls="source-tab-panel"
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              onClick={() => setActiveTab(key)}
              className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#377b78] ${
                activeTab === key
                  ? "border-[#286c60] text-[#286c60]"
                  : "border-transparent text-[#657976] hover:text-[#17364a]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          id="source-tab-panel"
          role="tabpanel"
          aria-labelledby={`source-tab-${activeTab}`}
          className="p-4 sm:p-5"
        >
          {activeTab === "overview" && <OverviewTab source={source} />}
          {activeTab === "claims" && <LinkedClaimsTab source={source} />}
          {activeTab === "records" && <LinkedRecordsTab source={source} />}
          {activeTab === "history" && <FetchHistoryTab source={source} />}
        </div>
      </section>

      <p className="text-xs leading-5 text-[#71817d]">
        Source metadata, linked records, claims and check history shown here are illustrative. No
        source fetch, record mutation or claim status change occurs.
      </p>
    </div>
  );
}
