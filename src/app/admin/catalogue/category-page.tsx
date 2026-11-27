import { notFound } from "next/navigation";
import { AdminPageHeader, AdminStatusBadge } from "../admin-ui";
import { CategoryListingPreview } from "./category-listing-preview";
import {
  getCatalogueCategory,
} from "./catalogue-preview-data";

export function CatalogueCategoryPage({ slug }: { slug: string }) {
  const category = getCatalogueCategory(slug);
  if (!category) notFound();

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow={`Catalogue / ${category.label}`}
          title={category.label}
          description={category.description}
        />
        <AdminStatusBadge tone="muted">Sample UI preview</AdminStatusBadge>
      </div>
      <p className="rounded-lg border border-[#dbe5e0] bg-[#f7f9f7] px-4 py-3 text-sm leading-5 text-[#526b72]">
        Illustrative rows only. Search and filters run locally; record changes are not saved.
      </p>
      <CategoryListingPreview
        categorySlug={category.slug}
        categoryLabel={category.singularLabel}
        categoryName={category.label}
        records={category.records}
        filters={category.filters}
      />
    </div>
  );
}
