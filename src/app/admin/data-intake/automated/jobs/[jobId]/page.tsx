import { JobDetailPage } from "../../automated-pages";

export default async function JobDetailRoute({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <JobDetailPage jobId={jobId} />;
}
