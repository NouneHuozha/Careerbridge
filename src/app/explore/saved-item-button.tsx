"use client";

import { Bookmark } from "lucide-react";
import {
  addSavedItem,
  removeSavedItem,
  savedItemKey,
  useSavedItems,
  type SavedItemContext,
  type SavedItemType,
} from "./saved-items";

const itemLabels: Record<SavedItemType, string> = {
  field: "field",
  course: "course",
  institution: "institution",
  "institution-offering": "course-specific institution option",
  pathway: "pathway",
  examination: "examination",
  scholarship: "scholarship",
};

export function SavedItemButton({
  type,
  id,
  context,
  className = "",
  saveLabel = "Save",
}: {
  type: SavedItemType;
  id: string;
  context?: SavedItemContext;
  className?: string;
  saveLabel?: string;
}) {
  const saved = useSavedItems();
  const item = { type, id, context };
  const isSaved =
    saved.status === "saved" &&
    saved.items.some((entry) => savedItemKey(entry) === savedItemKey(item));
  const unavailable = saved.status === "unavailable" || saved.status === "invalid";
  const label = itemLabels[type];

  function toggle() {
    if (isSaved) removeSavedItem(item);
    else addSavedItem(item);
  }

  return (
    <button
      type="button"
      aria-label={isSaved ? `Remove ${label} from Saved` : `Save ${label}`}
      aria-pressed={isSaved}
      disabled={saved.status === "loading" || unavailable}
      title={unavailable ? "Saved items are unavailable in this browser" : undefined}
      onClick={toggle}
      className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#cbd9cf] bg-white px-3 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <Bookmark
        aria-hidden="true"
        className={`h-4 w-4 ${isSaved ? "text-[#f3cf72]" : "text-[#94752d]"}`}
        fill={isSaved ? "currentColor" : "none"}
      />
      {isSaved ? "Saved" : saveLabel}
    </button>
  );
}
