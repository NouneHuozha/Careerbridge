"use client";

import { useMemo, useState } from "react";
import { CheckCheck, Clock3, FileCheck2, Inbox } from "lucide-react";
import {
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatusBadge,
} from "../admin-ui";
import {
  filterReviewQueueEntries,
  getReviewQueueCounts,
  REVIEW_QUEUE_PREVIEW_AS_OF,
  type ReviewQueueEntry,
  type ReviewQueueFilters as ReviewQueueFilterState,
} from "./review-queue-utils";
import { ReviewQueueFilters } from "./review-queue-filters";
import { ReviewQueueResults } from "./review-queue-results";
import { useAdminWorkspacePreferences } from "../workspace-preferences-provider";

const initialFilters: ReviewQueueFilterState = {
  query: "",
  status: "all",
  category: "all",
  dateRange: "all",
  reviewer: "all",
};

export function ReviewQueue({
  entries,
  reviewedCount,
}: {
  entries: ReviewQueueEntry[];
  reviewedCount: number;
}) {
  const { preferences } = useAdminWorkspacePreferences();
  const pageSize = preferences.recordsPerPage;
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const counts = useMemo(() => getReviewQueueCounts(entries), [entries]);
  const filteredEntries = useMemo(
    () => filterReviewQueueEntries(entries, filters, REVIEW_QUEUE_PREVIEW_AS_OF),
    [entries, filters],
  );
  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleEntries = filteredEntries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const firstEntry = filteredEntries.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastEntry = Math.min(currentPage * pageSize, filteredEntries.length);
  const hasFilters =
    Boolean(filters.query.trim()) ||
    filters.status !== "all" ||
    filters.category !== "all" ||
    filters.dateRange !== "all" ||
    filters.reviewer !== "all";

  function updateFilters(nextFilters: ReviewQueueFilterState) {
    setFilters(nextFilters);
    setPage(1);
  }

  function clearFilters() {
    updateFilters(initialFilters);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow="Admin / Review queue"
          title="Review Queue"
          description="Review submitted records and assess each claim against its supporting evidence."
        />
        <AdminStatusBadge tone="muted">
          <FileCheck2 aria-hidden="true" className="size-3.5" />
          Preview data only
        </AdminStatusBadge>
      </div>

      <section aria-label="Review workflow counts" className="grid gap-3 md:grid-cols-3">
        <AdminMetricCard
          label="Awaiting review"
          value={counts.awaiting_review}
          detail="Submitted revisions not yet started"
          icon={Inbox}
          accentClass="bg-[#fbf6e8] text-[#80652e]"
        />
        <AdminMetricCard
          label="In progress"
          value={counts.in_progress}
          detail="Claim review has started"
          icon={Clock3}
          accentClass="bg-[#eef4f8] text-[#496b85]"
        />
        <AdminMetricCard
          label="Reviewed"
          value={reviewedCount}
          detail="Illustrative preview history"
          icon={CheckCheck}
          accentClass="bg-[#edf6f1] text-[#286c60]"
        />
      </section>

      <AdminSectionCard
        id="submitted-revisions"
        title="Submitted revisions"
        description="Open a revision to review the claims and evidence together."
        action={
          <span className="hidden text-xs text-[#71817d] sm:inline">
            Sample data · not connected to lifecycle records
          </span>
        }
      >
        <div className="space-y-4">
          <ReviewQueueFilters
            entries={entries}
            filters={filters}
            counts={counts}
            onChange={updateFilters}
          />

          {hasFilters && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[#657976]">
                {filteredEntries.length} matching{" "}
                {filteredEntries.length === 1 ? "revision" : "revisions"}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-9 rounded-md px-2 text-sm font-semibold text-[#286c60] hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
              >
                Clear filters
              </button>
            </div>
          )}

          <ReviewQueueResults
            entries={visibleEntries}
            totalCount={filteredEntries.length}
            firstEntry={firstEntry}
            lastEntry={lastEntry}
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        </div>
      </AdminSectionCard>

      <p className="text-xs leading-5 text-[#71817d]">
        This preview uses illustrative rows and workflow counts. It does not read lifecycle data or create review events.
      </p>
    </div>
  );
}
