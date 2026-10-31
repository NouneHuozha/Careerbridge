import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StudyOptionDetailPage from "../../discover/study-option-detail-page";
import { getStudyOptionDetail } from "../../discover/study-option-data";
import { class10StudyPath } from "../../discover/study-path-data";

type StreamPageProps = {
  params: Promise<{ stream: string }>;
};

export function generateStaticParams() {
  return class10StudyPath.categories.map(({ slug }) => ({ stream: slug }));
}

export async function generateMetadata({
  params,
}: StreamPageProps): Promise<Metadata> {
  const { stream } = await params;
  const detail = getStudyOptionDetail("stream", stream);

  if (!detail) {
    return { title: "Stream page not found | CareerBridge" };
  }

  return {
    title: `${detail.category.name} after Class 10 | CareerBridge`,
    description: `${detail.category.summary} Check current local options with your school or board; this guide does not determine eligibility.`,
  };
}

export default async function StreamDetailPage({
  params,
}: StreamPageProps) {
  const { stream } = await params;
  const detail = getStudyOptionDetail("stream", stream);

  if (!detail) notFound();

  return <StudyOptionDetailPage detail={detail} />;
}
