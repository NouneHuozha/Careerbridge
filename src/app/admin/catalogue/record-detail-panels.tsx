"use client";

import Link from "next/link";
import { useState } from "react";
import { History, Link2 } from "lucide-react";
import { AdminEmptyState, AdminStatusBadge } from "../admin-ui";
import type {
  CataloguePreviewDetail,
  CataloguePreviewRevision,
} from "./catalogue-preview-data";

const verificationLabels: Record<string, string> = {
  verified: "Verified",
  pending_review: "Pending review",
  disputed: "Conflicting evidence",
  unavailable: "Unavailable",
};

function verificationClass(status: string) {
  if (status === "verified") return "border-[#cfe3da] bg-[#edf6f1] text-[#286c60]";
  if (status === "pending_review") return "border-[#eadfbd] bg-[#fbf6e8] text-[#80652e]";
  if (status === "disputed") return "border-[#ead4d0] bg-[#fbefed] text-[#8b5147]";
  return "border-[#d4e0ea] bg-[#eef4f8] text-[#496b85]";
}

function RevisionDetail({ revision }: { revision: CataloguePreviewRevision }) {
  return (
    <aside className="rounded-xl border border-[#dce5e0] bg-[#f8faf8] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#71817d]">
            Revision detail
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[#17364a]">
            Revision {revision.number}
          </h3>
        </div>
        <AdminStatusBadge tone={revision.current ? "accent" : "muted"}>
          {revision.current ? "Current" : "Historical"}
        </AdminStatusBadge>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs text-[#71817d]">Status</dt>
          <dd className="mt-1 font-medium capitalize text-[#405a5e]">{revision.status}</dd>
        </div>
        <div>
          <dt className="text-xs text-[#71817d]">Revision date</dt>
          <dd className="mt-1 font-medium text-[#405a5e]">{revision.date}</dd>
        </div>
      </dl>
      <p className="mt-4 border-t border-[#e1e9e4] pt-4 text-sm leading-6 text-[#526b72]">
        {revision.note}
      </p>
      <div className="mt-4 rounded-lg border border-[#dce5e0] bg-white p-3">
        <p className="text-xs font-semibold text-[#405a5e]">Audit events</p>
        <p className="mt-1 text-xs leading-5 text-[#657976]">
          Real audit history is not connected to this preview.
        </p>
      </div>
    </aside>
  );
}
export function RevisionsTab({
  detail,
  recordHref,
}: {
  detail: CataloguePreviewDetail;
  recordHref: string;
}) {
  const [selectedRevision, setSelectedRevision] = useState(
    detail.revisions.find((revision) => revision.current) ?? detail.revisions[0],
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-xl border border-[#dce5e0] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#17364a]">Revision history</h2>
            <p className="mt-1 text-sm text-[#657976]">
              Historical revisions remain read-only.
            </p>
          </div>
          <Link
            href={`${recordHref}/compare`}
            className="inline-flex min-h-10 items-center rounded-lg border border-[#cbdcd4] px-3 text-sm font-semibold text-[#377b78] hover:bg-[#f1f6f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
          >
            Compare revisions
          </Link>
        </div>
        <ol className="mt-5 space-y-3">
          {detail.revisions.map((revision, index) => (
            <li key={revision.number} className="relative pl-7">
              {index < detail.revisions.length - 1 && (
                <span aria-hidden="true" className="absolute left-[9px] top-5 h-[calc(100%+0.75rem)] w-px bg-[#dce5e0]" />
              )}
              <span
                aria-hidden="true"
                className={`absolute left-0 top-1 grid size-5 place-items-center rounded-full border ${
                  revision.current
                    ? "border-[#4c8980] bg-[#eaf2ed]"
                    : "border-[#ccd9d2] bg-white"
                }`}
              >
                {revision.current && <span className="size-2 rounded-full bg-[#377b78]" />}
              </span>
              <button
                type="button"
                aria-pressed={selectedRevision?.number === revision.number}
                onClick={() => setSelectedRevision(revision)}
                className="w-full rounded-lg border border-[#e3eae6] bg-white p-3 text-left transition-colors hover:border-[#9dbdb2] aria-pressed:border-[#8db4a7] aria-pressed:bg-[#f5f9f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[#17364a]">Revision {revision.number}</span>
                  <AdminStatusBadge tone={revision.current ? "accent" : "muted"}>
                    {revision.current ? "Current revision" : revision.status}
                  </AdminStatusBadge>
                </span>
                <span className="mt-1 block text-xs text-[#657976]">{revision.note}</span>
                <time dateTime={revision.date} className="mt-2 block text-xs text-[#71817d]">
                  {revision.date}
                </time>
              </button>
            </li>
          ))}
        </ol>
      </section>
      {selectedRevision ? (
        <RevisionDetail revision={selectedRevision} />
      ) : (
        <AdminEmptyState
          title="No revision selected"
          description="Choose a revision from the timeline to inspect its details."
          icon={History}
        />
      )}
    </div>
  );
}

export function SourcesEvidenceTab({ detail }: { detail: CataloguePreviewDetail }) {
  if (detail.sources.length === 0) {
    return (
      <div className="space-y-4">
        <AdminEmptyState
          title="No supporting sources yet"
          description="This record has no associated sources in the preview. Source registration belongs in the separate Sources section."
          icon={Link2}
        />
        <p className="text-center text-xs text-[#71817d]">
          The Sources registry is not implemented in this UI-only phase.
        </p>
      </div>
    );
  }

  const sources = detail.sources.map((source) => ({
    ...source,
    supportedClaims: detail.claims
      .filter((claim) => source.claimKeys.includes(claim.key))
      .map((claim) => claim.label),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#17364a]">Sources &amp; evidence</h2>
          <p className="mt-1 text-sm text-[#657976]">
            Source authority does not automatically verify every claim.
          </p>
        </div>
        <AdminStatusBadge tone="muted">Sample evidence</AdminStatusBadge>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.15fr)]">
        <ul className="space-y-3">
          {sources.map((source) => (
            <li key={source.name} className="rounded-xl border border-[#dce5e0] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#17364a]">{source.name}</h3>
                  <p className="mt-1 text-sm text-[#657976]">
                    {source.publisher} · Authority: {source.authority}
                  </p>
                </div>
                <AdminStatusBadge tone="accent">Associated</AdminStatusBadge>
              </div>
              <dl className="mt-4 space-y-3 border-t border-[#edf1ee] pt-3 text-xs">
                <div>
                  <dt className="text-[#71817d]">Source URL</dt>
                  <dd className="mt-1 break-all font-mono text-[#405a5e]">{source.url}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <dt className="text-[#71817d]">Source type</dt>
                    <dd className="mt-1 text-[#405a5e]">{source.sourceType}</dd>
                  </div>
                  <div>
                    <dt className="text-[#71817d]">Last checked</dt>
                    <dd className="mt-1 text-[#405a5e]">{source.checkedAt}</dd>
                  </div>
                </div>
                <div>
                  <dt className="text-[#71817d]">Claims supported</dt>
                  <dd className="mt-1 text-[#405a5e]">
                    {source.supportedClaims.length > 0
                      ? source.supportedClaims.join(", ")
                      : "No claims linked"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <section className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
          <h3 className="font-semibold text-[#17364a]">Claims supported</h3>
          <ul className="mt-3 divide-y divide-[#edf1ee]">
            {detail.claims.map((claim) => (
              <li key={claim.key} className="py-4 first:pt-1 last:pb-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[#405a5e]">{claim.label}</h4>
                    <p className="mt-1 text-sm text-[#526b72]">{claim.value}</p>
                  </div>
                  <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-semibold ${verificationClass(claim.status)}`}>
                    {verificationLabels[claim.status]}
                  </span>
                </div>
                {claim.sourceName ? (
                  <p className="mt-2 text-xs text-[#657976]">
                    Supported by {claim.sourceName}
                    {claim.checkedAt ? ` · checked ${claim.checkedAt}` : ""}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-[#657976]">No supporting source is recorded.</p>
                )}
                {claim.evidence && (
                  <blockquote className="mt-3 border-l-2 border-[#b8d0c5] pl-3 text-xs leading-5 text-[#526b72]">
                    {claim.evidence}
                  </blockquote>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export function RelationshipsTab({ detail }: { detail: CataloguePreviewDetail }) {
  if (detail.relationships.length === 0) {
    return (
      <AdminEmptyState
        title="No related records in this preview"
        description="Only relationships supported by the catalogue model are shown. No additional links are inferred."
        icon={Link2}
      />
    );
  }

  return (
    <section className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#17364a]">Related catalogue records</h2>
          <p className="mt-1 text-sm text-[#657976]">
            Preview relationships follow course offering and campus references.
          </p>
        </div>
        <AdminStatusBadge tone="muted">Sample relationships</AdminStatusBadge>
      </div>
      <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {detail.relationships.map((relationship) => (
          <li key={`${relationship.itemType}-${relationship.title}`}>
            <Link
              href={relationship.href}
              className="group flex h-full flex-col rounded-xl border border-[#dce5e0] bg-[#fbfcfb] p-4 transition-colors hover:border-[#9dbdb2] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#377b78]">
                {relationship.label}
              </span>
              <span className="mt-2 font-semibold text-[#17364a] group-hover:text-[#286c60]">
                {relationship.title}
              </span>
              <span className="mt-2 flex-1 text-sm leading-5 text-[#657976]">
                {relationship.context}
              </span>
              <span className="mt-4 text-xs font-semibold text-[#377b78]">Open preview record →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
