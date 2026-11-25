import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageLoadingSkeleton } from "../../../page-loading-skeleton";
import { HistoryVisit } from "../../history-visit";
import InstitutionProfile from "./institution-profile";
import { getPublicInstitutionProfile } from "../../institution-page-data";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "Institution details | CareerBridge",
  description:
    "Explore institution information, programmes and official sources.",
};

export default async function InstitutionProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const institution = await getPublicInstitutionProfile(slug);
  if (!institution) notFound();

  return (
    <Suspense fallback={<PageLoadingSkeleton variant="detail" showHeader={false} />}>
      <>
        <HistoryVisit type="institution" id={institution.slug} />
        <InstitutionProfile institution={institution} />
      </>
    </Suspense>
  );
}
