import { FetchedItemPage } from "../../automated-pages";

export default async function FetchedItemRoute({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;
  return <FetchedItemPage itemId={contentId} />;
}
