import { getCataloguePreviewRecord } from "../catalogue/catalogue-preview-data";
import {
  formatReviewEvidenceSummary,
  REVIEW_QUEUE_PREVIEW_AS_OF,
  type ReviewQueueEntry,
  type ReviewQueueStatus,
} from "./review-queue-utils";

type ReviewQueueSeed = {
  categorySlug: ReviewQueueEntry["categorySlug"];
  recordId: string;
  status: ReviewQueueStatus;
  submittedAt: string;
  reviewer: string | null;
};

const reviewQueueSeeds: ReviewQueueSeed[] = [
  {
    categorySlug: "examinations",
    recordId: "CB-EXAM-003",
    status: "awaiting_review",
    submittedAt: "2026-11-27",
    reviewer: null,
  },
  {
    categorySlug: "course-offerings",
    recordId: "CB-OFFER-003",
    status: "awaiting_review",
    submittedAt: "2026-11-26",
    reviewer: null,
  },
  {
    categorySlug: "courses",
    recordId: "CB-COURSE-002",
    status: "in_progress",
    submittedAt: "2026-11-25",
    reviewer: "A. Sharma",
  },
  {
    categorySlug: "course-offerings",
    recordId: "CB-OFFER-002",
    status: "awaiting_review",
    submittedAt: "2026-11-24",
    reviewer: null,
  },
  {
    categorySlug: "pathways",
    recordId: "CB-PATH-001",
    status: "awaiting_review",
    submittedAt: "2026-11-22",
    reviewer: "R. Das",
  },
  {
    categorySlug: "scholarships",
    recordId: "CB-SCHOLARSHIP-002",
    status: "needs_changes",
    submittedAt: "2026-11-20",
    reviewer: "A. Sharma",
  },
];

export const REVIEWED_PREVIEW_COUNT = 12;

export const reviewQueuePreviewEntries: ReviewQueueEntry[] = reviewQueueSeeds.map(
  (seed) => {
    const preview = getCataloguePreviewRecord(seed.categorySlug, seed.recordId);
    if (!preview) {
      throw new Error(
        `Review queue preview references missing record ${seed.categorySlug}/${seed.recordId}.`,
      );
    }

    return {
      ...seed,
      categoryLabel: preview.category.singularLabel,
      recordTitle: preview.record.title,
      aliases: preview.record.aliases,
      revisionNumber: preview.record.currentRevision ?? 1,
      evidenceSummary: formatReviewEvidenceSummary(preview.detail),
    };
  },
);

export function getReviewQueuePreviewEntry(categorySlug: string, recordId: string) {
  return reviewQueuePreviewEntries.find(
    (entry) => entry.categorySlug === categorySlug && entry.recordId === recordId,
  );
}
