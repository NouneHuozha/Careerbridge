import { redirect } from "next/navigation";

export default async function CatalogueReviewPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { category, id } = await params;
  redirect(`/admin/review/${category}/${id}`);
}
