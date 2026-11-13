import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import CourseCatalog from "./catalog/course-catalog";

export const metadata: Metadata = {
  title: "Explore courses | CareerBridge",
  description:
    "Explore illustrative course options by study stage, field and qualification type.",
};

export default function CoursesPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="collection" showHeader={false} />}>
      <CourseCatalog />
    </Suspense>
  );
}
