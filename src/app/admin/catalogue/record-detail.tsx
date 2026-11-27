"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FilePenLine,
  GitCompareArrows,
  History,
  Link2,
  ShieldAlert,
} from "lucide-react";
import { AdminPageHeader, AdminStatusBadge } from "../admin-ui";
import {
  RelationshipsTab,
  RevisionsTab,
  SourcesEvidenceTab,
} from "./record-detail-panels";
import type {
  CatalogueCategoryDefinition,
  CataloguePreviewDetail,
} from "./catalogue-preview-data";
import type { CatalogueListingRecord } from "./listing-utils";

type TabKey = "overview" | "revisions" | "sources" | "relationships";
const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "revisions", label: "Revisions" },
  { key: "sources", label: "Sources & Evidence" },
  { key: "relationships", label: "Relationships" },
];

const publicationLabels: Record<string, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

const verificationLabels: Record<string, string> = {
  not_collected: "Not collected",
  unverified: "Not reviewed",
  pending_review: "Pending review",
  verified: "Verified",
  partially_verified: "Partially verified",
  disputed: "Disputed",
  unavailable: "Unavailable",
  stale: "Stale",
  expired: "Expired",
  superseded: "Superseded",
};

function badgeTone(status: string): "accent" | "muted" {
  return status === "published" || status === "verified" ? "accent" : "muted";
}

function DetailValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[#e6ece8] bg-white p-3">
      <dt className="text-xs text-[#71817d]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-[#405a5e]">{value}</dd>
    </div>
  );
}

function OverviewTab({
  category,
  record,
  detail,
  recordHref,
  onSelectTab,
}: {
  category: CatalogueCategoryDefinition;
  record: CatalogueListingRecord;
  detail: CataloguePreviewDetail;
  recordHref: string;
  onSelectTab: (tab: TabKey) => void;
}) {
  const canEdit = ["published", "archived", "rejected", "draft"].includes(
    record.publicationStatus,
  );
  const unresolvedClaims = detail.claims.filter(
    (claim) => claim.status !== "verified",
  ).length;

  return (
    <div className="space-y-5">
      {(unresolvedClaims > 0 ||
        detail.sources.length === 0 ||
        record.verificationStatus !== "verified") && (
        <section className="flex items-start gap-3 rounded-xl border border-[#eadfbd] bg-[#fbf8ef] p-4 sm:p-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#80652e]">
            <AlertTriangle aria-hidden="true" className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#17364a]">Information completeness needs attention</h2>
            <p className="mt-1 text-sm leading-5 text-[#657976]">
              {unresolvedClaims > 0
                ? `${unresolvedClaims} sample claims are not verified or have no supporting evidence.`
                : detail.sources.length === 0
                  ? "No supporting sources are associated with this preview record."
                  : "This preview record has fields that have not yet been reviewed."}
            </p>
            <button
              type="button"
              onClick={() => onSelectTab("sources")}
              className="mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-[#80652e] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#80652e]"
            >
              Inspect evidence <ArrowUpRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(17rem,0.7fr)]">
        <section className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#17364a]">Record information</h2>
              <p className="mt-1 text-sm text-[#657976]">{detail.description}</p>
            </div>
            <AdminStatusBadge tone="muted">{category.singularLabel}</AdminStatusBadge>
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {record.details.map((item) => (
              <DetailValue key={item.label} label={item.label} value={item.value} />
            ))}
          </dl>
          {record.summary && (
            <div className="mt-5 border-t border-[#edf1ee] pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#71817d]">
                Summary
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#526b72]">{record.summary}</p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-[#17364a]">Management shortcuts</h2>
          <div className="mt-4 space-y-2">
            {canEdit ? (
              <Link
                href={`${recordHref}/edit`}
                className="flex min-h-11 items-center gap-3 rounded-lg border border-[#cbdcd4] px-3 text-sm font-semibold text-[#286c60] transition-colors hover:bg-[#f1f6f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
              >
                <FilePenLine aria-hidden="true" className="size-4" />
                {record.publicationStatus === "draft"
                  ? "Edit draft revision"
                  : "Create new revision"}
              </Link>
            ) : record.publicationStatus === "in_review" ? (
              <Link
                href={`/admin/review/${category.slug}/${record.id}`}
                className="flex min-h-11 items-center gap-3 rounded-lg border border-[#cbdcd4] px-3 text-sm font-semibold text-[#286c60] transition-colors hover:bg-[#f1f6f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
              >
                <CheckCircle2 aria-hidden="true" className="size-4" />
                Open review workspace
              </Link>
            ) : (
              <div className="rounded-lg border border-[#e5e9e6] bg-[#f7f9f7] p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#526b72]">
                  <ShieldAlert aria-hidden="true" className="size-4" />
                  This action is not available
                </p>
                <p className="mt-1 text-xs leading-5 text-[#71817d]">
                  The current revision state does not offer a revision editor.
                </p>
              </div>
            )}
            {record.publicationStatus === "in_review" && (
              <p className="rounded-lg border border-[#e5e9e6] bg-[#f7f9f7] p-3 text-xs leading-5 text-[#657976]">
                Editing is restricted while this revision is in review.
              </p>
            )}
            <button
              type="button"
              onClick={() => onSelectTab("sources")}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-[#e3eae6] px-3 text-left text-sm font-medium text-[#405a5e] transition-colors hover:bg-[#f7f9f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
            >
              <Clock3 aria-hidden="true" className="size-4" />
              Review evidence
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("relationships")}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-[#e3eae6] px-3 text-left text-sm font-medium text-[#405a5e] transition-colors hover:bg-[#f7f9f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
            >
              <Link2 aria-hidden="true" className="size-4" />
              View relationships
            </button>
            <Link
              href={`${recordHref}/activity`}
              className="flex min-h-11 items-center gap-3 rounded-lg border border-[#e3eae6] px-3 text-sm font-medium text-[#405a5e] transition-colors hover:bg-[#f7f9f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
            >
              <History aria-hidden="true" className="size-4" />
              Record activity
            </Link>
            <Link
              href={`${recordHref}/compare`}
              className="flex min-h-11 items-center gap-3 rounded-lg border border-[#e3eae6] px-3 text-sm font-medium text-[#405a5e] transition-colors hover:bg-[#f7f9f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
            >
              <GitCompareArrows aria-hidden="true" className="size-4" />
              Compare revisions
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export function CatalogueRecordDetail({
  category,
  record,
  detail,
  initialTab,
}: {
  category: CatalogueCategoryDefinition;
  record: CatalogueListingRecord;
  detail: CataloguePreviewDetail;
  initialTab?: string;
}) {
  const validTabs = tabs.map((tab) => tab.key);
  const [activeTab, setActiveTab] = useState<TabKey>(
    validTabs.includes(initialTab as TabKey) ? (initialTab as TabKey) : "overview",
  );
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const recordHref = `/admin/catalogue/${category.slug}/${record.id}`;

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    setActiveTab(tabs[nextIndex].key);
    tabRefs.current[nextIndex]?.focus();
  }

  const pageAction =
    record.publicationStatus === "in_review" ? (
      <Link
        href={`/admin/review/${category.slug}/${record.id}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#205a50] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#286c60]"
      >
        Open review <ArrowUpRight aria-hidden="true" className="size-4" />
      </Link>
    ) : ["published", "archived", "rejected", "draft"].includes(record.publicationStatus) ? (
      <Link
        href={`${recordHref}/edit`}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#205a50] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#286c60]"
      >
        {record.publicationStatus === "draft" ? "Edit draft" : "Create new revision"}
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </Link>
    ) : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow={`Catalogue / ${category.label} / ${record.aliases[0] ?? record.id}`}
          title={record.title}
          description={`${category.singularLabel} · ${record.aliases[0] ?? record.id}`}
        />
        {pageAction}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AdminStatusBadge tone={badgeTone(record.publicationStatus)}>
          {publicationLabels[record.publicationStatus] ?? record.publicationStatus}
        </AdminStatusBadge>
        <AdminStatusBadge tone={badgeTone(record.verificationStatus)}>
          Verification: {verificationLabels[record.verificationStatus] ?? record.verificationStatus}
        </AdminStatusBadge>
        <AdminStatusBadge tone="muted">Preview record · not live data</AdminStatusBadge>
      </div>

      <nav
        aria-label="Record sections"
        role="tablist"
        className="flex gap-1 overflow-x-auto border-b border-[#dbe4df]"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`record-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls="record-tab-panel"
            tabIndex={activeTab === tab.key ? 0 : -1}
            onClick={() => setActiveTab(tab.key)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
            className={`min-h-12 shrink-0 border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#377b78] sm:px-4 ${
              activeTab === tab.key
                ? "border-[#377b78] text-[#286c60]"
                : "border-transparent text-[#657976] hover:text-[#17364a]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section
        id="record-tab-panel"
        role="tabpanel"
        aria-labelledby={`record-tab-${activeTab}`}
        tabIndex={0}
        className="min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-[#377b78]/40"
      >
        {activeTab === "overview" && (
          <OverviewTab
            category={category}
            record={record}
            detail={detail}
            recordHref={recordHref}
            onSelectTab={setActiveTab}
          />
        )}
        {activeTab === "revisions" && (
          <RevisionsTab detail={detail} recordHref={recordHref} />
        )}
        {activeTab === "sources" && <SourcesEvidenceTab detail={detail} />}
        {activeTab === "relationships" && <RelationshipsTab detail={detail} />}
      </section>

      <section className="flex flex-wrap items-start gap-3 rounded-xl border border-[#dce5e0] bg-[#f7f9f7] p-4 text-sm">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white text-[#377b78]">
          <GitCompareArrows aria-hidden="true" className="size-4" />
        </span>
        <div>
          <h2 className="font-semibold text-[#17364a]">Read-only UI preview</h2>
          <p className="mt-1 leading-5 text-[#657976]">
            Screens and sample content are for layout review. No catalogue records, revisions, sources or lifecycle actions are changed.
          </p>
        </div>
      </section>
    </div>
  );
}
