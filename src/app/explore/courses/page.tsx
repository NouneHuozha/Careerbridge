import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import { listPublishedCourses } from "../../../db/courses";
import CourseCatalog from "./catalog/course-catalog";

export const metadata: Metadata = {
  title: "Explore courses | CareerBridge",
  description:
    "Explore published courses by study stage, field and qualification type.",
};

export default async function CoursesPage() {
  await connection();
  const courses = await listPublishedCourses();

  return (
    <Suspense fallback={<PageLoadingSkeleton variant="collection" showHeader={false} />}>
      <CourseCatalog courses={courses} />
    </Suspense>
  );
}
