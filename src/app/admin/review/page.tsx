import { ReviewQueue } from "./review-queue";
import {
  REVIEWED_PREVIEW_COUNT,
  reviewQueuePreviewEntries,
} from "./review-queue-preview-data";

export default function ReviewQueuePage() {
  return (
    <ReviewQueue
      entries={reviewQueuePreviewEntries}
      reviewedCount={REVIEWED_PREVIEW_COUNT}
    />
  );
}
