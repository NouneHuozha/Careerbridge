"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, BookOpenCheck, ExternalLink, FlaskConical, Info, ShieldAlert } from "lucide-react";
import { AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "../admin-ui";
import { sourcePreviewRecords } from "../sources/source-preview-data";
import { manualEntryTypes } from "./intake-preview-data";

const inputClass =
  "min-h-11 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15";

export function ResearchIntakePage() {
  const activeSources = sourcePreviewRecords.filter((source) => source.status === "active");
  const [sourceId, setSourceId] = useState(activeSources[0]?.id ?? "");
  const [targetType, setTargetType] = useState("institution");
  const [recordName, setRecordName] = useState("");
  const [pageUrl, setPageUrl] = useState(activeSources[0]?.url ?? "");
  const [instructions, setInstructions] = useState("");
  const [previewPrepared, setPreviewPrepared] = useState(false);
  const selectedSource = activeSources.find((source) => source.id === sourceId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviewPrepared(true);
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6">
      <AdminPageHeader
        eyebrow="Data intake / Research & Fetch"
        title="Prepare a research request"
        description="Choose a source and target record, then review candidate information claim by claim before any draft is prepared."
      />
      <div className="flex items-start gap-3 rounded-xl border border-[#eadfbd] bg-[#fbf6e8] p-4">
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#856d25]" />
        <p className="text-sm leading-6 text-[#6e6742]">
          <strong className="font-semibold text-[#6f5b1d]">No fetch is performed.</strong>{" "}
          Source registration does not grant permission to scrape or access content. Respect terms, restrictions and rate limits when a real workflow is connected.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AdminSectionCard
          id="research-request"
          title="Research request"
          description="Scope one target record and the information that needs evidence."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Target record type</span>
              <select value={targetType} onChange={(event) => setTargetType(event.target.value)} className={inputClass}>
                {manualEntryTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Record name or identifier</span>
              <input
                value={recordName}
                onChange={(event) => setRecordName(event.target.value)}
                placeholder="e.g. Assam Down Town University"
                className={inputClass}
              />
            </label>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Registered source</span>
              <select
                required
                value={sourceId}
                onChange={(event) => {
                  const nextSource = activeSources.find((source) => source.id === event.target.value);
                  setSourceId(event.target.value);
                  if (nextSource) setPageUrl(nextSource.url);
                }}
                className={inputClass}
              >
                {activeSources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Specific page URL (optional)</span>
              <input
                type="url"
                value={pageUrl}
                onChange={(event) => setPageUrl(event.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Research instructions</span>
              <textarea
                rows={4}
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="Name the specific claims to investigate, such as eligibility, duration or application dates."
                className={`${inputClass} min-h-28 py-3`}
              />
            </label>
          </div>
          {selectedSource && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e1e9e4] bg-[#f8faf8] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#17364a]">{selectedSource.name}</p>
                <p className="mt-1 break-all font-mono text-xs text-[#657976]">{selectedSource.url}</p>
              </div>
              <Link href={`/admin/sources/${selectedSource.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#286c60] hover:underline">
                View source details <ExternalLink aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          )}
        </AdminSectionCard>

        <AdminSectionCard
          id="research-review-rules"
          title="Review rules"
          description="Research output is a set of candidate claims, not verified catalogue data."
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              "Review each factual claim against its own source passage.",
              "Keep source, page reference and extraction context attached.",
              "Treat conflicting or missing values as unresolved; do not invent facts.",
              "Accepted candidates still require the existing review and approval process.",
            ].map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-sm leading-6 text-[#526b72]">
                <BookOpenCheck aria-hidden="true" className="mt-1 size-4 shrink-0 text-[#377b78]" />
                {rule}
              </li>
            ))}
          </ul>
        </AdminSectionCard>

        {previewPrepared && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#cfe3da] bg-[#edf6f1] p-4">
            <p className="text-sm leading-5 text-[#286c60]">
              Request preview prepared locally. No source was fetched and no research job was created.
            </p>
            <Link href="/admin/data-intake/research/review" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#286c60] px-3 text-sm font-semibold text-white hover:bg-[#205b51]">
              Review sample extraction <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/data-intake" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d6e1dc] bg-white px-4 text-sm font-semibold text-[#405a5e] hover:bg-[#f4f7f5]">
            Back to Data Intake
          </Link>
          <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white hover:bg-[#205b51]">
            Prepare request preview <FlaskConical aria-hidden="true" className="size-4" />
          </button>
        </div>
      </form>

      <p className="flex items-start gap-2 text-xs leading-5 text-[#71817d]">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        This interface does not send the selected source URL to a server, third-party service or browser fetch API.
      </p>
    </div>
  );
}

export function ResearchReviewPage() {
  const source = sourcePreviewRecords.find((entry) => entry.id === "assam-down-town-university");
  const [candidateText, setCandidateText] = useState("Assam Down Town University");
  const [editing, setEditing] = useState(false);
  const [decision, setDecision] = useState<"accepted" | "discarded" | null>(null);

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6">
      <AdminPageHeader
        eyebrow="Data intake / Research & Fetch / Extracted data review"
        title="Review candidate information"
        description="Inspect the claim, source and supporting passage independently. This example was not produced by a live fetch."
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d6e4dd] bg-[#edf6f1] px-4 py-3">
        <p className="text-sm text-[#526c67]">Example extraction · candidate claim · not verified</p>
        <AdminStatusBadge tone="muted">{decision ? `Preview ${decision}` : "Needs human review"}</AdminStatusBadge>
      </div>
      <AdminSectionCard
        id="candidate-claim"
        title="Candidate claim"
        description="The extraction is one proposed fact; accepting it does not mark the claim as verified."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="rounded-lg border border-[#e1e9e4] bg-[#f8faf8] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">Claim field</p>
            <p className="mt-2 text-sm font-semibold text-[#17364a]">Institution name</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#71817d]">Candidate value</p>
            {editing ? (
              <input value={candidateText} onChange={(event) => setCandidateText(event.target.value)} className={`${inputClass} mt-2`} />
            ) : (
              <p className="mt-2 text-lg font-semibold text-[#17364a]">{candidateText}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {editing ? (
                <button type="button" onClick={() => setEditing(false)} className="inline-flex min-h-9 items-center rounded-lg bg-[#286c60] px-3 text-sm font-semibold text-white">Save preview edit</button>
              ) : (
                <button type="button" disabled={Boolean(decision)} onClick={() => setEditing(true)} className="inline-flex min-h-9 items-center rounded-lg border border-[#d6e1dc] bg-white px-3 text-sm font-semibold text-[#405a5e] disabled:opacity-50">Edit candidate</button>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-[#e1e9e4] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">Supporting evidence</p>
                <h3 className="mt-2 text-base font-semibold text-[#17364a]">{source?.name ?? "Example source"}</h3>
                <p className="mt-1 break-all font-mono text-xs text-[#657976]">{source?.url}</p>
              </div>
              <AdminStatusBadge tone="muted">Source not fetched</AdminStatusBadge>
            </div>
            <blockquote className="mt-4 border-l-2 border-[#87aaa0] bg-[#f8faf8] px-4 py-3 text-sm leading-6 text-[#526b72]">
              “Assam Down Town University” — illustrative source excerpt shown for layout only; not fetched during this preview.
            </blockquote>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-[#71817d]">Page reference</dt><dd className="mt-1 text-[#17364a]">Institution overview · example</dd></div>
              <div><dt className="text-xs text-[#71817d]">Extraction time</dt><dd className="mt-1 text-[#17364a]">Not recorded · preview</dd></div>
            </dl>
          </div>
        </div>
      </AdminSectionCard>

      <div className="flex items-start gap-3 rounded-xl border border-[#eadfbd] bg-[#fbf6e8] p-4 text-sm leading-6 text-[#6e6742]">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p>
          <strong className="font-semibold text-[#6f5b1d]">Acceptance is not verification.</strong>{" "}
          Candidate data may be prepared as a draft for review; publication still requires the separate approval and publishing lifecycle.
        </p>
      </div>

      {decision && (
        <p role="status" className="rounded-lg border border-[#cfe3da] bg-[#edf6f1] px-4 py-3 text-sm text-[#286c60]">
          Candidate marked {decision} in this page preview only. Nothing was saved.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/data-intake/research" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d6e1dc] bg-white px-4 text-sm font-semibold text-[#405a5e] hover:bg-[#f4f7f5]">
          Back to research request
        </Link>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={Boolean(decision)} onClick={() => setDecision("discarded")} className="inline-flex min-h-11 items-center rounded-lg border border-[#d6e1dc] bg-white px-4 text-sm font-semibold text-[#405a5e] hover:bg-[#f4f7f5] disabled:opacity-50">
            Discard candidate
          </button>
          <button type="button" disabled={Boolean(decision)} onClick={() => setDecision("accepted")} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white hover:bg-[#205b51] disabled:opacity-50">
            Accept into draft preview <BookOpenCheck aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
