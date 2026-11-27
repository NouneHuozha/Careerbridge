import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AuditEventDetail } from "../event-detail";
import { getAuditPreviewEventById } from "../audit-preview-data";
import { AuditHistoryLoading } from "../loading";

export default function AuditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return (
    <Suspense fallback={<AuditHistoryLoading />}>
      <AuditEventPageContent params={params} />
    </Suspense>
  );
}

async function AuditEventPageContent({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = getAuditPreviewEventById(eventId);
  if (!event) notFound();

  return <AuditEventDetail event={event} />;
}
