import { Suspense } from "react";
import { CatalogueCategoryPage } from "../category-page";
import { CatalogueRouteFallback } from "../route-fallback";

export default function CatalogueCategoryRoute({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  return (
    <Suspense fallback={<CatalogueRouteFallback />}>
      <CatalogueCategoryRouteContent params={params} />
    </Suspense>
  );
}

async function CatalogueCategoryRouteContent({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  return <CatalogueCategoryPage slug={category} />;
}
