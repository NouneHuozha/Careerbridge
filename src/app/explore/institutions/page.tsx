import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import InstitutionsExplorer from "./institutions-explorer";
import { listPublicCourseInstitutionOfferings } from "../institution-page-data";

export const metadata: Metadata = {
  title: "Institutions | CareerBridge",
  description: "Explore institutions and compare course offerings, locations and provider information.",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function InstitutionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const courseParam = query.course;
  const courseId = Array.isArray(courseParam) ? courseParam[0] ?? "" : courseParam ?? "";
  const categoryParam = query.category;
  const isCategory = Array.isArray(categoryParam)
    ? categoryParam[0] === "true"
    : categoryParam === "true";
  const courseOfferings =
    courseId && !isCategory
      ? await listPublicCourseInstitutionOfferings(courseId)
      : [];

  return (
    <Suspense fallback={<PageLoadingSkeleton variant="collection" showHeader={false} />}>
      <InstitutionsExplorer courseOfferings={courseOfferings} />
    </Suspense>
  );
}