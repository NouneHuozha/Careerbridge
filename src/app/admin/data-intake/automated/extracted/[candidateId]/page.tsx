import { ExtractedItemPage } from "../../automated-pages";

export default async function ExtractedItemRoute({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  return <ExtractedItemPage itemId={candidateId} />;
}
