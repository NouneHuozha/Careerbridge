import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getIntakeJobPreview } from "../../intake-preview-data";
import { IntakeJobDetail } from "../../job-detail";

export default function IntakeJobDetailRoute({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-64 animate-pulse rounded-xl bg-white" />}>
      <IntakeJobDetailContent params={params} />
    </Suspense>
  );
}

async function IntakeJobDetailContent({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = getIntakeJobPreview(jobId);
  if (!job) notFound();
  return <IntakeJobDetail job={job} />;
}
