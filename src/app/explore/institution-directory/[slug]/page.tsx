import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageLoadingSkeleton } from "../../../page-loading-skeleton";
import { HistoryVisit } from "../../history-visit";
import InstitutionProfile from "./institution-profile";
import { institutionProfilePages } from "../institution-profile-data";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "Institution details | CareerBridge",
  description:
    "Explore institution information, programmes and official sources.",
};

export default function InstitutionProfilePage({ params }: PageProps) {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="detail" showHeader={false} />}>
      <InstitutionProfileRoute params={params} />
    </Suspense>
  );
}

async function InstitutionProfileRoute({ params }: PageProps) {
  const { slug } = await params;
  const institution = institutionProfilePages.find((item) => item.slug === slug);

  if (!institution) notFound();

  return (
    <>
      <HistoryVisit type="institution" id={institution.slug} />
      <InstitutionProfile institution={institution} />
    </>
  );
}
