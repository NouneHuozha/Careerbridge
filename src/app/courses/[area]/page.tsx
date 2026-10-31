import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StudyOptionDetailPage from "../../discover/study-option-detail-page";
import { getStudyOptionDetail } from "../../discover/study-option-data";
import { class12StudyPath } from "../../discover/study-path-data";

type CourseAreaPageProps = {
  params: Promise<{ area: string }>;
};

export function generateStaticParams() {
  return class12StudyPath.categories.map(({ slug }) => ({ area: slug }));
}

export async function generateMetadata({
  params,
}: CourseAreaPageProps): Promise<Metadata> {
  const { area } = await params;
  const detail = getStudyOptionDetail("course-area", area);

  if (!detail) {
    return { title: "Course-area page not found | CareerBridge" };
  }

  return {
    title: `${detail.category.name} courses | CareerBridge`,
    description: `${detail.category.summary} Check current course and entry details with the official provider; this guide does not determine eligibility.`,
  };
}

export default async function CourseAreaDetailPage({
  params,
}: CourseAreaPageProps) {
  const { area } = await params;
  const detail = getStudyOptionDetail("course-area", area);

  if (!detail) notFound();

  return <StudyOptionDetailPage detail={detail} />;
}
