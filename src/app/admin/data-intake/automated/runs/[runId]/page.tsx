import { RunDetailPage } from "../../automated-pages";

export default async function RunDetailRoute({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  return <RunDetailPage runId={runId} />;
}
