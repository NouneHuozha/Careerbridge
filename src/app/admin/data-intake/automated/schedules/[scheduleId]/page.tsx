import { ScheduleItemPage } from "../../automated-pages";

export default async function ScheduleItemRoute({
  params,
}: {
  params: Promise<{ scheduleId: string }>;
}) {
  const { scheduleId } = await params;
  return <ScheduleItemPage itemId={scheduleId} />;
}
