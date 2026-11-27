"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileClock,
  ShieldCheck,
} from "lucide-react";
import { AdminEmptyState, AdminPageHeader } from "../admin-ui";
import { AdminDate } from "../admin-date";
import type { ReviewQueueEntry, ReviewQueueStatus } from "../review/review-queue-utils";
import type {
  CatalogueCategoryDefinition,
  CataloguePreviewClaim,
  CataloguePreviewDetail,
} from "./catalogue-preview-data";
import type { CatalogueListingRecord } from "./listing-utils";

type ClaimAssessment = "supported" | "conflicting" | "unsupported" | "unavailable";

const reviewStatusLabels: Record<ReviewQueueStatus, string> = {
  awaiting_review: "In review",
  in_progress: "In progress",
  needs_changes: "Needs changes",
};

const claimStatusLabels: Record<CataloguePreviewClaim["status"], string> = {
  verified: "Verified",
  pending_review: "Needs review",
  disputed: "Conflicting",
  unavailable: "Unavailable",
};

const claimStatusClasses: Record<CataloguePreviewClaim["status"], string> = {
  verified: "border-[#cfe3da] bg-[#edf6f1] text-[#286c60]",
  pending_review: "border-[#eadfbd] bg-[#fbf6e8] text-[#80652e]",
  disputed: "border-[#ead4d0] bg-[#fbefed] text-[#8b5147]",
  unavailable: "border-[#d4e0ea] bg-[#eef4f8] text-[#496b85]",
};

const assessmentOptions: Array<{
  value: ClaimAssessment;
  label: string;
  className: string;
}> = [
  {
    value: "supported",
    label: "Supported",
    className: "border-[#cfe3da] text-[#286c60] hover:bg-[#edf6f1]",
  },
  {
    value: "conflicting",
    label: "Conflicting",
    className: "border-[#ead4d0] text-[#8b5147] hover:bg-[#fbefed]",
  },
  {
    value: "unsupported",
    label: "Unsupported",
    className: "border-[#eadfbd] text-[#80652e] hover:bg-[#fbf6e8]",
  },
  {
    value: "unavailable",
    label: "Unavailable",
    className: "border-[#d4e0ea] text-[#496b85] hover:bg-[#eef4f8]",
  },
];

function statusBadgeClass(status: ReviewQueueStatus) {
  if (status === "needs_changes") return "border-[#ead4d0] bg-[#fbefed] text-[#8b5147]";
  if (status === "in_progress") return "border-[#d4e0ea] bg-[#eef4f8] text-[#496b85]";
  return "border-[#eadfbd] bg-[#fbf6e8] text-[#80652e]";
}

function ClaimCard({
  claim,
  selected,
  assessment,
  onSelect,
  onAssess,
}: {
  claim: CataloguePreviewClaim;
  selected: boolean;
  assessment?: ClaimAssessment;
  onSelect: () => void;
  onAssess: (assessment: ClaimAssessment) => void;
}) {
  const statusLabel = assessment
    ? `${assessment[0].toUpperCase()}${assessment.slice(1)} · local`
    : claimStatusLabels[claim.status];

  return (
    <article
      className={`rounded-xl border p-4 transition-colors ${
        selected ? "border-[#8db4a7] bg-[#f7faf8]" : "border-[#e3eae6] bg-white"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
      >
        <span className="flex flex-wrap items-start justify-between gap-2">
          <span className="font-semibold text-[#17364a]">{claim.label}</span>
          <span
            className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-semibold ${
              assessment
                ? "border-[#dce5e0] bg-white text-[#526b72]"
                : claimStatusClasses[claim.status]
            }`}
          >
            {statusLabel}
          </span>
        </span>
        <span className="mt-2 block text-sm leading-5 text-[#526b72]">{claim.value}</span>
        {claim.sourceName ? (
          <span className="mt-2 block text-xs text-[#657976]">
            Evidence attached: {claim.sourceName}
          </span>
        ) : (
          <span className="mt-2 block text-xs text-[#657976]">
            No sufficient evidence linked yet.
          </span>
        )}
      </button>

      {claim.sourceName && claim.evidence && (
        <div className="mt-3 rounded-lg border border-[#e7ede9] bg-[#f8faf8] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#71817d]">
            Supporting evidence · sample excerpt
          </p>
          <blockquote className="mt-1 text-sm leading-5 text-[#526b72]">
            {claim.evidence}
          </blockquote>
          <p className="mt-2 text-xs text-[#71817d]">
            Checked <AdminDate value={claim.checkedAt} fallback="No review date recorded" />
          </p>
        </div>
      )}

      <div className="mt-4 border-t border-[#e7ede9] pt-3">
        <p className="mb-2 text-xs font-semibold text-[#657976]">Record assessment · preview only</p>
        <div className="flex flex-wrap gap-2">
          {assessmentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={assessment === option.value}
              onClick={() => onAssess(option.value)}
              className={`inline-flex min-h-9 items-center rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78] ${
                option.className
              } ${assessment === option.value ? "ring-2 ring-inset ring-current" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

function EvidencePanel({
  claim,
  detail,
  note,
  onNoteChange,
}: {
  claim?: CataloguePreviewClaim;
  detail: CataloguePreviewDetail;
  note: string;
  onNoteChange: (value: string) => void;
}) {
  const source = claim?.sourceName
    ? detail.sources.find((item) => item.name === claim.sourceName)
    : undefined;

  return (
    <aside className="space-y-4 xl:sticky xl:top-24">
      <section className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#377b78]">
            Supporting evidence
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#17364a]">
            {claim?.label ?? "Select a claim"}
          </h2>
          <p className="mt-1 text-sm leading-5 text-[#657976]">
            Evidence must support this specific claim, not only the general topic.
          </p>
        </div>

        {source ? (
          <div className="mt-4 rounded-lg border border-[#e3eae6] bg-[#f8faf8] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-[#405a5e]">{source.name}</h3>
                <p className="mt-1 text-xs leading-5 text-[#657976]">
                  {source.publisher} · {source.authority}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full border border-[#dce5e0] bg-white px-2 py-1 text-[10px] font-semibold text-[#637572]">
                Sample source
              </span>
            </div>
            {claim?.evidence && (
              <blockquote className="mt-4 border-l-2 border-[#b8d0c5] pl-3 text-sm leading-6 text-[#526b72]">
                {claim.evidence}
              </blockquote>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e1e9e4] pt-3 text-xs text-[#71817d]">
              <span>
                Checked <AdminDate value={claim?.checkedAt ?? source.checkedAt} fallback="No review date recorded" />
              </span>
              <span className="inline-flex items-center gap-1">
                <ExternalLink aria-hidden="true" className="size-3.5" />
                Source URL not connected
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-[#d6e1dc] bg-[#f8faf8] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#80652e]">
              <AlertTriangle aria-hidden="true" className="size-4" />
              No sufficient evidence linked yet
            </p>
            <p className="mt-1 text-sm leading-5 text-[#657976]">
              Keep missing information distinct from a claim that is incorrect. Do not infer a value from unrelated sources.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
        <label htmlFor="reviewer-notes" className="text-sm font-semibold text-[#17364a]">
          Reviewer notes
        </label>
        <textarea
          id="reviewer-notes"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Record what is supported or what evidence is still needed..."
          rows={4}
          className="mt-2 w-full resize-y rounded-lg border border-[#d7e1dc] bg-white px-3 py-2.5 text-sm leading-5 text-[#17364a] outline-none transition placeholder:text-[#97a39f] focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
        />
        <p className="mt-2 text-xs text-[#71817d]">
          Notes are attached to the selected claim in this page only and are not saved.
        </p>
      </section>
    </aside>
  );
}

export function ReviewWorkspace({
  category,
  record,
  detail,
  queueEntry,
}: {
  category: CatalogueCategoryDefinition;
  record: CatalogueListingRecord;
  detail: CataloguePreviewDetail;
  queueEntry: ReviewQueueEntry;
}) {
  const [selectedClaimKey, setSelectedClaimKey] = useState(detail.claims[0]?.key);
  const [assessments, setAssessments] = useState<Record<string, ClaimAssessment>>({});
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
  const selectedClaim = detail.claims.find((claim) => claim.key === selectedClaimKey);
  const verifiedCount = detail.claims.filter((claim) => claim.status === "verified").length;
  const unavailableCount = detail.claims.filter(
    (claim) => claim.status === "unavailable",
  ).length;
  const reviewedCount = detail.claims.filter(
    (claim) => claim.status === "verified" || assessments[claim.key] !== undefined,
  ).length;
  const recordHref = `/admin/catalogue/${category.slug}/${record.id}`;
  const isNeedsChanges = queueEntry.status === "needs_changes";

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#71817d]">
            <Link href="/admin/review" className="font-medium text-[#377b78] hover:underline">
              Review queue
            </Link>
            <span aria-hidden="true">/</span>
            <span className="max-w-64 truncate">{record.title}</span>
            <span aria-hidden="true">/</span>
            <span>Revision {queueEntry.revisionNumber}</span>
          </nav>
          <AdminPageHeader
            eyebrow={`${category.singularLabel} · ${
              isNeedsChanges ? "Returned for changes" : "Submitted for review"
            }`}
            title={record.title}
            description={
              <>
                Revision {queueEntry.revisionNumber} · Submitted{" "}
                <AdminDate value={queueEntry.submittedAt} fallback="No submission date recorded" />
              </>
            }
          />
        </div>
        <span
          className={`inline-flex min-h-8 shrink-0 items-center rounded-full border px-3 text-xs font-semibold ${statusBadgeClass(queueEntry.status)}`}
        >
          {reviewStatusLabels[queueEntry.status]}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/review"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cbdcd4] bg-white px-3 text-sm font-semibold text-[#286c60] hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to queue
        </Link>
        <Link
          href={`${recordHref}?tab=revisions`}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dce5e0] bg-white px-3 text-sm font-semibold text-[#526b72] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
        >
          <FileClock aria-hidden="true" className="size-4" />
          Revision history
        </Link>
      </div>

      <section aria-label="Claim verification counts" className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)]">
          <p className="text-sm font-semibold text-[#526b72]">Verified claims</p>
          <p className="mt-2 text-3xl font-semibold leading-none tabular-nums text-[#286c60]">
            {verifiedCount}
          </p>
          <p className="mt-2 text-xs text-[#657976]">Marked verified in this sample revision</p>
        </div>
        <div className="rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)]">
          <p className="text-sm font-semibold text-[#526b72]">Unavailable claims</p>
          <p className="mt-2 text-3xl font-semibold leading-none tabular-nums text-[#496b85]">
            {unavailableCount}
          </p>
          <p className="mt-2 text-xs text-[#657976]">No reliable value recorded</p>
        </div>
      </section>

      {detail.claims.length === 0 ? (
        <AdminEmptyState
          title="No claims to review"
          description="This preview revision has no claim-level evidence attached."
          icon={ShieldCheck}
        />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]">
          <section className="min-w-0 rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#17364a]">Claims to review</h2>
                <p className="mt-1 text-sm leading-5 text-[#657976]">
                  Assess every claim against only the evidence attached to it.
                </p>
              </div>
              <span className="text-xs tabular-nums text-[#71817d]">
                {reviewedCount} of {detail.claims.length} verified or assessed
              </span>
            </div>

            <ul className="mt-4 space-y-3">
              {detail.claims.map((claim) => (
                <li key={claim.key}>
                  <ClaimCard
                    claim={claim}
                    selected={selectedClaimKey === claim.key}
                    assessment={assessments[claim.key]}
                    onSelect={() => setSelectedClaimKey(claim.key)}
                    onAssess={(assessment) => {
                      setAssessments((current) => ({ ...current, [claim.key]: assessment }));
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>

          <EvidencePanel
            claim={selectedClaim}
            detail={detail}
            note={selectedClaim ? reviewerNotes[selectedClaim.key] ?? "" : ""}
            onNoteChange={(value) => {
              if (!selectedClaim) return;
              setReviewerNotes((current) => ({ ...current, [selectedClaim.key]: value }));
            }}
          />
        </div>
      )}

      <section className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-base font-semibold text-[#17364a]">Reviewer decision</h2>
            <p className="mt-1 text-sm leading-5 text-[#657976]">
              Approval is separate from publication. Lifecycle actions will only be enabled when the connected workflow is available.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Approve revision", icon: CheckCircle2 },
              { label: "Request changes", icon: AlertTriangle },
              { label: "Reject revision", icon: ShieldCheck },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                disabled
                title="Lifecycle actions are not connected in this preview."
                className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-lg border border-[#dce5e0] px-3 text-sm font-semibold text-[#87938f] disabled:opacity-70"
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <p className="flex items-start gap-2 text-xs leading-5 text-[#71817d]">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        Local assessments and notes reset when you leave. No catalogue revision, audit event, approval, or publication is changed.
      </p>
    </div>
  );
}
