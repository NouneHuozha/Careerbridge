CREATE TABLE "admin_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" integer NOT NULL,
	"kind" text NOT NULL,
	"action" text NOT NULL,
	"item_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	CONSTRAINT "admin_audit_events_kind_check" CHECK ("kind" IN ('exam', 'scholarship', 'institution', 'campus', 'course_offering', 'pathway')),
	CONSTRAINT "admin_audit_events_action_check" CHECK ("action" IN ('submit', 'associate-source', 'review', 'approve', 'reject', 'publish')),
	CONSTRAINT "admin_audit_events_actor_id_users_fk" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT,
	CONSTRAINT "admin_audit_events_item_id_catalog_items_fk" FOREIGN KEY ("item_id") REFERENCES "catalog_items"("id") ON DELETE RESTRICT,
	CONSTRAINT "admin_audit_events_item_revision_fk" FOREIGN KEY ("item_id","revision_id") REFERENCES "catalog_item_revisions"("catalog_item_id","id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX "admin_audit_events_item_created_idx" ON "admin_audit_events" USING btree ("item_id","created_at" DESC);
--> statement-breakpoint
CREATE INDEX "admin_audit_events_revision_created_idx" ON "admin_audit_events" USING btree ("revision_id","created_at" DESC);
--> statement-breakpoint
CREATE INDEX "admin_audit_events_actor_created_idx" ON "admin_audit_events" USING btree ("actor_id","created_at" DESC);
--> statement-breakpoint
CREATE INDEX "admin_audit_events_kind_action_created_idx" ON "admin_audit_events" USING btree ("kind","action","created_at" DESC);
--> statement-breakpoint
CREATE FUNCTION "prevent_admin_audit_event_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'Admin audit events are append-only and cannot be updated or deleted';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "admin_audit_events_append_only"
BEFORE UPDATE OR DELETE ON "admin_audit_events"
FOR EACH ROW EXECUTE FUNCTION "prevent_admin_audit_event_mutation"();
