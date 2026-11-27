import type {
  CatalogueCategorySlug,
  CataloguePreviewDetail,
} from "../catalogue/catalogue-preview-data";

export type ReviewQueueStatus = "awaiting_review" | "in_progress" | "needs_changes";
export type ReviewQueueDateRange = "all" | "today" | "7d" | "30d" | "older";
export const REVIEW_QUEUE_PREVIEW_AS_OF = "2026-11-27";

export type ReviewQueueEntry = {
  categorySlug: CatalogueCategorySlug;
  categoryLabel: string;
  recordId: string;
  recordTitle: string;
  aliases: string[];
  revisionNumber: number;
  status: ReviewQueueStatus;
  submittedAt: string;
  reviewer: string | null;
  evidenceSummary: string;
};

export type ReviewQueueFilters = {
  query: string;
  status: "all" | ReviewQueueStatus;
  category: "all" | CatalogueCategorySlug;
  dateRange: ReviewQueueDateRange;
  reviewer: "all" | "unassigned" | string;
};

export type ReviewQueueStatusCounts = {
  awaiting_review: number;
  in_progress: number;
  needs_changes: number;
};

export function getReviewQueueCounts(
  entries: readonly ReviewQueueEntry[],
): ReviewQueueStatusCounts {
  return entries.reduce(
    (counts, entry) => {
      counts[entry.status] += 1;
      return counts;
    },
    { awaiting_review: 0, in_progress: 0, needs_changes: 0 },
  );
}

export function formatReviewEvidenceSummary(detail: CataloguePreviewDetail): string {
  const counts = detail.claims.reduce(
    (result, claim) => {
      result[claim.status] += 1;
      return result;
    },
    { verified: 0, pending_review: 0, disputed: 0, unavailable: 0 },
  );
  const summary = [
    counts.verified > 0 ? `${counts.verified} verified` : "",
    counts.pending_review > 0 ? `${counts.pending_review} pending` : "",
    counts.disputed > 0 ? `${counts.disputed} conflicting` : "",
    counts.unavailable > 0 ? `${counts.unavailable} unavailable` : "",
  ].filter(Boolean);

  return summary.length > 0 ? summary.join(" · ") : "No claims linked";
}

function matchesDateRange(
  submittedAt: string,
  dateRange: ReviewQueueDateRange,
  asOfDate: string,
) {
  if (dateRange === "all") return true;

  const ageInDays = Math.floor(
    (Date.parse(`${asOfDate}T00:00:00Z`) - Date.parse(`${submittedAt}T00:00:00Z`)) /
      86_400_000,
  );

  if (dateRange === "today") return ageInDays === 0;
  if (dateRange === "7d") return ageInDays >= 0 && ageInDays <= 7;
  if (dateRange === "30d") return ageInDays >= 0 && ageInDays <= 30;
  return ageInDays > 30;
}

export function filterReviewQueueEntries(
  entries: readonly ReviewQueueEntry[],
  filters: ReviewQueueFilters,
  asOfDate: string,
): ReviewQueueEntry[] {
  const query = filters.query.trim().toLocaleLowerCase();

  return entries
    .filter((entry) => {
      const matchesQuery =
        query.length === 0 ||
        [
          entry.recordTitle,
          entry.recordId,
          ...entry.aliases,
          entry.categoryLabel,
          entry.reviewer ?? "unassigned",
        ].some((value) => value.toLocaleLowerCase().includes(query));

      return (
        matchesQuery &&
        (filters.status === "all" || entry.status === filters.status) &&
        (filters.category === "all" || entry.categorySlug === filters.category) &&
        (filters.reviewer === "all" ||
          (filters.reviewer === "unassigned"
            ? entry.reviewer === null
            : entry.reviewer === filters.reviewer)) &&
        matchesDateRange(entry.submittedAt, filters.dateRange, asOfDate)
      );
    })
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}
