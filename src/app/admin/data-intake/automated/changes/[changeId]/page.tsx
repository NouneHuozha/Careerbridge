import { ChangeItemPage } from "../../automated-pages";

export default async function ChangeItemRoute({
  params,
}: {
  params: Promise<{ changeId: string }>;
}) {
  const { changeId } = await params;
  return <ChangeItemPage itemId={changeId} />;
}
