import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageLoadingSkeleton } from "../../../page-loading-skeleton";
import { possibilityFields } from "../../../discover/possibility-fields";

export const metadata: Metadata = {
  title: "Explore courses | CareerBridge",
  description:
    "Explore illustrative course options by study stage, field and qualification type.",
};

type PageProps = {
  searchParams: Promise<{ stage?: string | string[]; field?: string | string[] }>;
};

export default function CourseCatalogPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="collection" showHeader={false} />}>
      <CourseCatalogRedirect searchParams={searchParams} />
    </Suspense>
  );
}

async function CourseCatalogRedirect({ searchParams }: PageProps) {
  const query = await searchParams;
  const params = new URLSearchParams();

  if (
    query.stage === "class-10" ||
    query.stage === "class-12" ||
    query.stage === "all"
  ) {
    params.set("stage", query.stage);
  }
  if (
    typeof query.field === "string" &&
    possibilityFields.some((field) => field.id === query.field)
  ) {
    params.set("field", query.field);
  }

  const queryString = params.toString();
  const suffix = queryString ? `?${queryString}` : "";
  return redirect(`/explore/courses${suffix}`);
}
