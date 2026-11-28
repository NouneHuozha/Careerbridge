ALTER TABLE "field_revisions" ADD COLUMN "image_data" "bytea";--> statement-breakpoint
ALTER TABLE "field_revisions" ADD COLUMN "image_content_type" text;--> statement-breakpoint
ALTER TABLE "field_revisions" ADD COLUMN "image_removed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "field_revisions" ADD CONSTRAINT "field_revisions_image_pair_check" CHECK (("field_revisions"."image_data" IS NULL) = ("field_revisions"."image_content_type" IS NULL));--> statement-breakpoint
ALTER TABLE "field_revisions" ADD CONSTRAINT "field_revisions_image_content_type_check" CHECK ("field_revisions"."image_content_type" IS NULL OR "field_revisions"."image_content_type" IN ('image/jpeg', 'image/png', 'image/webp'));--> statement-breakpoint
ALTER TABLE "field_revisions" ADD CONSTRAINT "field_revisions_image_removed_check" CHECK (NOT "field_revisions"."image_removed" OR "field_revisions"."image_data" IS NULL);--> statement-breakpoint