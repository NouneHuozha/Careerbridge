import { FailureItemPage } from "../../automated-pages";

export default async function FailureItemRoute({
  params,
}: {
  params: Promise<{ failureId: string }>;
}) {
  const { failureId } = await params;
  return <FailureItemPage itemId={failureId} />;
}
