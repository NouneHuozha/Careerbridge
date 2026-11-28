CREATE TABLE "field_revision_images" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"image_data" "bytea",
	"image_content_type" text,
	"image_removed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "field_revision_images_image_pair_check" CHECK (("field_revision_images"."image_data" IS NULL) = ("field_revision_images"."image_content_type" IS NULL)),
	CONSTRAINT "field_revision_images_content_type_check" CHECK ("field_revision_images"."image_content_type" IS NULL OR "field_revision_images"."image_content_type" IN ('image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "field_revision_images_removed_check" CHECK (NOT "field_revision_images"."image_removed" OR "field_revision_images"."image_data" IS NULL)
);
--> statement-breakpoint
ALTER TABLE "field_revisions" DROP CONSTRAINT "field_revisions_image_pair_check";--> statement-breakpoint
ALTER TABLE "field_revisions" DROP CONSTRAINT "field_revisions_image_content_type_check";--> statement-breakpoint
ALTER TABLE "field_revisions" DROP CONSTRAINT "field_revisions_image_removed_check";--> statement-breakpoint
ALTER TABLE "field_revision_images" ADD CONSTRAINT "field_revision_images_revision_id_catalog_item_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."catalog_item_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_revisions" DROP COLUMN "image_data";--> statement-breakpoint
ALTER TABLE "field_revisions" DROP COLUMN "image_content_type";--> statement-breakpoint
ALTER TABLE "field_revisions" DROP COLUMN "image_removed";--> statement-breakpoint
CREATE FUNCTION public.prevent_published_field_revision_image_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.catalog_item_revisions AS revision
     WHERE revision.id = OLD.revision_id
       AND revision.publication_status = 'published'
  ) THEN
    RAISE EXCEPTION 'Published Field images are immutable; create a new revision instead';
  END IF;
  RETURN OLD;
END;
$$;--> statement-breakpoint
CREATE TRIGGER field_revision_images_immutable_published
BEFORE UPDATE OR DELETE ON public.field_revision_images
FOR EACH ROW
EXECUTE FUNCTION public.prevent_published_field_revision_image_update();