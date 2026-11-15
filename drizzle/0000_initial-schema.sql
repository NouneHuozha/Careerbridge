-- Refuse to run unless the legacy authentication schema is already provisioned.
DO $careerbridge_auth_preflight$
DECLARE
	users_id_type regtype;
BEGIN
	IF to_regclass('public.users') IS NULL
		OR to_regclass('public.auth_sessions') IS NULL
		OR to_regclass('public.account_data') IS NULL THEN
		RAISE EXCEPTION
			'Existing public.users, public.auth_sessions, and public.account_data must be provisioned separately before the CareerBridge catalogue migration.';
	END IF;

	SELECT attribute.atttypid::regtype
	INTO users_id_type
	FROM pg_attribute AS attribute
	WHERE attribute.attrelid = 'public.users'::regclass
		AND attribute.attname = 'id'
		AND attribute.attnum > 0
		AND NOT attribute.attisdropped;

	IF users_id_type IS DISTINCT FROM 'integer'::regtype THEN
		RAISE EXCEPTION 'public.users.id must remain PostgreSQL integer for student foreign keys.';
	END IF;
END
$careerbridge_auth_preflight$;
--> statement-breakpoint
CREATE TABLE "campus_revisions" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"institution_item_id" uuid NOT NULL,
	"state_id" uuid,
	"campus_content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "campus_revisions_content_object_check" CHECK (jsonb_typeof("campus_revisions"."campus_content") = 'object')
);
--> statement-breakpoint
CREATE TABLE "catalog_item_aliases" (
	"source_system" text NOT NULL,
	"external_type" text NOT NULL,
	"external_key" text NOT NULL,
	"external_context_key" text DEFAULT '' NOT NULL,
	"catalog_item_id" uuid NOT NULL,
	CONSTRAINT "catalog_item_aliases_pk" PRIMARY KEY("source_system","external_type","external_key","external_context_key"),
	CONSTRAINT "catalog_item_aliases_external_values_check" CHECK ("catalog_item_aliases"."source_system" <> '' AND "catalog_item_aliases"."external_type" <> '' AND "catalog_item_aliases"."external_key" <> ''),
	CONSTRAINT "catalog_item_aliases_context_check" CHECK ("catalog_item_aliases"."external_type" = 'institution-offering' OR "catalog_item_aliases"."external_context_key" = '')
);
--> statement-breakpoint
CREATE TABLE "catalog_item_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_item_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"publication_status" text DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"description" text,
	"data_classification" text NOT NULL,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" integer,
	"updated_by" integer,
	"published_by" integer,
	CONSTRAINT "catalog_item_revisions_item_revision_unique" UNIQUE("catalog_item_id","revision_number"),
	CONSTRAINT "catalog_item_revisions_item_id_unique" UNIQUE("catalog_item_id","id"),
	CONSTRAINT "catalog_item_revisions_number_check" CHECK ("catalog_item_revisions"."revision_number" >= 1),
	CONSTRAINT "catalog_item_revisions_publication_status_check" CHECK ("catalog_item_revisions"."publication_status" IN ('draft', 'in_review', 'approved', 'published', 'archived', 'rejected')),
	CONSTRAINT "catalog_item_revisions_classification_check" CHECK ("catalog_item_revisions"."data_classification" IN ('real', 'demo', 'test')),
	CONSTRAINT "catalog_item_revisions_verification_check" CHECK ("catalog_item_revisions"."verification_status" IN ('not_collected', 'unverified', 'pending_review', 'verified', 'partially_verified', 'disputed', 'unavailable', 'stale', 'expired', 'superseded')),
	CONSTRAINT "catalog_item_revisions_published_at_check" CHECK (("catalog_item_revisions"."publication_status" = 'published') = ("catalog_item_revisions"."published_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_type" text NOT NULL,
	"published_revision_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_items_id_type_unique" UNIQUE("id","item_type"),
	CONSTRAINT "catalog_items_type_check" CHECK ("catalog_items"."item_type" IN ('field', 'institution', 'campus', 'course', 'course_offering', 'pathway', 'examination', 'scholarship'))
);
--> statement-breakpoint
CREATE TABLE "catalog_revision_sources" (
	"revision_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"checked_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"verification_status" text,
	CONSTRAINT "catalog_revision_sources_pk" PRIMARY KEY("revision_id","source_id"),
	CONSTRAINT "catalog_revision_sources_verification_check" CHECK ("catalog_revision_sources"."verification_status" IS NULL OR "catalog_revision_sources"."verification_status" IN ('not_collected', 'unverified', 'pending_review', 'verified', 'partially_verified', 'disputed', 'unavailable', 'stale', 'expired', 'superseded'))
);
--> statement-breakpoint
CREATE TABLE "course_offering_revisions" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"course_item_id" uuid NOT NULL,
	"course_revision_id" uuid NOT NULL,
	"campus_item_id" uuid NOT NULL,
	"campus_revision_id" uuid NOT NULL,
	"offering_content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "course_offering_revisions_content_object_check" CHECK (jsonb_typeof("course_offering_revisions"."offering_content") = 'object')
);
--> statement-breakpoint
CREATE TABLE "course_revisions" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"field_item_id" uuid NOT NULL,
	"field_revision_id" uuid NOT NULL,
	"qualification" text NOT NULL,
	"study_stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"course_content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "course_revisions_qualification_check" CHECK ("course_revisions"."qualification" IN ('Higher secondary', 'Degree', 'Diploma', 'Certificate', 'Vocational', 'Professional', 'Skill training')),
	CONSTRAINT "course_revisions_stages_array_check" CHECK (jsonb_typeof("course_revisions"."study_stages") = 'array'),
	CONSTRAINT "course_revisions_content_object_check" CHECK (jsonb_typeof("course_revisions"."course_content") = 'object')
);
--> statement-breakpoint
CREATE TABLE "examination_revisions" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"examination_content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "examination_revisions_level_check" CHECK ("examination_revisions"."level" IN ('national', 'state', 'institution')),
	CONSTRAINT "examination_revisions_stages_array_check" CHECK (jsonb_typeof("examination_revisions"."stages") = 'array'),
	CONSTRAINT "examination_revisions_content_object_check" CHECK (jsonb_typeof("examination_revisions"."examination_content") = 'object')
);
--> statement-breakpoint
CREATE TABLE "field_revisions" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"field_content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "field_revisions_content_object_check" CHECK (jsonb_typeof("field_revisions"."field_content") = 'object')
);
--> statement-breakpoint
CREATE TABLE "institution_revisions" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"institution_type" text NOT NULL,
	"ownership" text,
	"institution_content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "institution_revisions_type_check" CHECK ("institution_revisions"."institution_type" IN ('College', 'University', 'Institute', 'School', 'Training centre')),
	CONSTRAINT "institution_revisions_ownership_check" CHECK ("institution_revisions"."ownership" IS NULL OR "institution_revisions"."ownership" IN ('Government', 'Private', 'Public')),
	CONSTRAINT "institution_revisions_content_object_check" CHECK (jsonb_typeof("institution_revisions"."institution_content") = 'object')
);
--> statement-breakpoint
CREATE TABLE "pathway_revisions" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"stage" text NOT NULL,
	"course_stage" text NOT NULL,
	"pathway_content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "pathway_revisions_stage_check" CHECK ("pathway_revisions"."stage" IN ('class-10', 'class-12')),
	CONSTRAINT "pathway_revisions_course_stage_check" CHECK ("pathway_revisions"."course_stage" IN ('class-10', 'class-12')),
	CONSTRAINT "pathway_revisions_content_object_check" CHECK (jsonb_typeof("pathway_revisions"."pathway_content") = 'object')
);
--> statement-breakpoint
CREATE TABLE "scholarship_revisions" (
	"revision_id" uuid PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"eligibility_regions" jsonb NOT NULL,
	"scholarship_content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "scholarship_revisions_status_check" CHECK ("scholarship_revisions"."status" IN ('open', 'upcoming', 'closed', 'unknown')),
	CONSTRAINT "scholarship_revisions_eligibility_regions_check" CHECK (("scholarship_revisions"."eligibility_regions" = '"all"'::jsonb) OR jsonb_typeof("scholarship_revisions"."eligibility_regions") = 'array'),
	CONSTRAINT "scholarship_revisions_content_object_check" CHECK (jsonb_typeof("scholarship_revisions"."scholarship_content") = 'object')
);
--> statement-breakpoint
CREATE TABLE "source_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"source_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"canonical_url" text,
	"normalized_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_registry_normalized_url_unique" UNIQUE("normalized_url"),
	CONSTRAINT "source_registry_type_check" CHECK ("source_registry"."source_type" IN ('official_api', 'structured_government_dataset', 'official_download', 'official_public_web_page', 'admin_manual_entry')),
	CONSTRAINT "source_registry_status_check" CHECK ("source_registry"."status" IN ('active', 'paused', 'retired')),
	CONSTRAINT "source_registry_url_pair_check" CHECK (("source_registry"."canonical_url" IS NULL) = ("source_registry"."normalized_url" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "states_country_name_unique" UNIQUE("country_code","name"),
	CONSTRAINT "states_country_code_check" CHECK ("states"."country_code" = 'IN')
);
--> statement-breakpoint
CREATE TABLE "discover_answers" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"answers" jsonb NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discover_answers_schema_version_check" CHECK ("discover_answers"."schema_version" = 1),
	CONSTRAINT "discover_answers_shape_check" CHECK (CASE
          WHEN jsonb_typeof("discover_answers"."answers") = 'object'
            AND "discover_answers"."answers" ? 'activityIds'
            AND jsonb_typeof("discover_answers"."answers"->'activityIds') = 'array'
          THEN "discover_answers"."answers" - 'activityIds' = '{}'::jsonb
            AND jsonb_array_length("discover_answers"."answers"->'activityIds') <= 3
          ELSE false
        END)
);
--> statement-breakpoint
CREATE TABLE "exploration_history" (
	"user_id" integer NOT NULL,
	"catalog_item_id" uuid NOT NULL,
	"context_key" text,
	"context" jsonb,
	"last_visited_at" timestamp with time zone NOT NULL,
	"visit_count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "exploration_history_identity_unique" UNIQUE NULLS NOT DISTINCT("user_id","catalog_item_id","context_key"),
	CONSTRAINT "exploration_history_visit_count_check" CHECK ("exploration_history"."visit_count" >= 1),
	CONSTRAINT "exploration_history_context_object_check" CHECK ("exploration_history"."context" IS NULL OR jsonb_typeof("exploration_history"."context") = 'object')
);
--> statement-breakpoint
CREATE TABLE "guided_explorer_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"question_id" text NOT NULL,
	"option_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"original_text" text DEFAULT '' NOT NULL,
	"interpretation_status" text NOT NULL,
	"response_state" text NOT NULL,
	"context_option_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"edited_at" timestamp with time zone,
	CONSTRAINT "guided_explorer_answers_id_check" CHECK ("guided_explorer_answers"."id" <> ''),
	CONSTRAINT "guided_explorer_answers_option_ids_check" CHECK (CASE
          WHEN jsonb_typeof("guided_explorer_answers"."option_ids") = 'array'
          THEN jsonb_array_length("guided_explorer_answers"."option_ids") <= 20
          ELSE false
        END),
	CONSTRAINT "guided_explorer_answers_interpretation_check" CHECK ("guided_explorer_answers"."interpretation_status" IN ('clear', 'probable', 'ambiguous', 'unrecognised')),
	CONSTRAINT "guided_explorer_answers_response_state_check" CHECK ("guided_explorer_answers"."response_state" IN ('answered', 'unsure', 'none', 'skip'))
);
--> statement-breakpoint
CREATE TABLE "guided_explorer_session_questions" (
	"session_id" text NOT NULL,
	"question_id" text NOT NULL,
	"path_position" integer NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	CONSTRAINT "guided_explorer_session_questions_pk" PRIMARY KEY("session_id","question_id"),
	CONSTRAINT "guided_explorer_session_questions_position_unique" UNIQUE("session_id","path_position"),
	CONSTRAINT "guided_explorer_session_questions_position_question_unique" UNIQUE("session_id","path_position","question_id"),
	CONSTRAINT "guided_explorer_session_questions_question_check" CHECK ("guided_explorer_session_questions"."question_id" <> ''),
	CONSTRAINT "guided_explorer_session_questions_path_position_check" CHECK ("guided_explorer_session_questions"."path_position" >= 0),
	CONSTRAINT "guided_explorer_session_questions_state_check" CHECK ("guided_explorer_session_questions"."state" IN ('pending', 'asked', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "guided_explorer_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"question_bank_version" integer NOT NULL,
	"status" text NOT NULL,
	"completion_reason" text,
	"current_question_id" text,
	"resume_question_id" text,
	"path_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guided_explorer_sessions_id_check" CHECK ("guided_explorer_sessions"."id" <> ''),
	CONSTRAINT "guided_explorer_sessions_version_check" CHECK ("guided_explorer_sessions"."version" = 1),
	CONSTRAINT "guided_explorer_sessions_question_bank_version_check" CHECK ("guided_explorer_sessions"."question_bank_version" >= 1),
	CONSTRAINT "guided_explorer_sessions_status_check" CHECK ("guided_explorer_sessions"."status" IN ('active', 'paused', 'completed')),
	CONSTRAINT "guided_explorer_sessions_completion_reason_check" CHECK ("guided_explorer_sessions"."completion_reason" IS NULL OR ("guided_explorer_sessions"."status" = 'completed' AND "guided_explorer_sessions"."completion_reason" = 'finished_early')),
	CONSTRAINT "guided_explorer_sessions_path_index_check" CHECK ("guided_explorer_sessions"."path_index" >= 0),
	CONSTRAINT "guided_explorer_sessions_question_pointer_check" CHECK ((
            "guided_explorer_sessions"."status" IN ('active', 'paused')
            AND "guided_explorer_sessions"."current_question_id" IS NOT NULL
            AND "guided_explorer_sessions"."resume_question_id" IS NULL
          ) OR (
            "guided_explorer_sessions"."status" = 'completed'
            AND "guided_explorer_sessions"."current_question_id" IS NULL
            AND (
              ("guided_explorer_sessions"."completion_reason" = 'finished_early' AND "guided_explorer_sessions"."resume_question_id" IS NOT NULL)
              OR ("guided_explorer_sessions"."completion_reason" IS NULL AND "guided_explorer_sessions"."resume_question_id" IS NULL)
            )
          ))
);
--> statement-breakpoint
CREATE TABLE "saved_items" (
	"user_id" integer NOT NULL,
	"catalog_item_id" uuid NOT NULL,
	"context_key" text,
	"context" jsonb,
	"saved_at" timestamp with time zone NOT NULL,
	CONSTRAINT "saved_items_identity_unique" UNIQUE NULLS NOT DISTINCT("user_id","catalog_item_id","context_key"),
	CONSTRAINT "saved_items_context_object_check" CHECK ("saved_items"."context" IS NULL OR jsonb_typeof("saved_items"."context") = 'object')
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"education_stage" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_profiles_education_stage_check" CHECK ("student_profiles"."education_stage" IS NULL OR "student_profiles"."education_stage" IN ('class-10', 'class-12'))
);
--> statement-breakpoint
ALTER TABLE "campus_revisions" ADD CONSTRAINT "campus_revisions_revision_id_catalog_item_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."catalog_item_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campus_revisions" ADD CONSTRAINT "campus_revisions_institution_item_id_catalog_items_id_fk" FOREIGN KEY ("institution_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campus_revisions" ADD CONSTRAINT "campus_revisions_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_item_aliases" ADD CONSTRAINT "catalog_item_aliases_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_item_revisions" ADD CONSTRAINT "catalog_item_revisions_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_revision_sources" ADD CONSTRAINT "catalog_revision_sources_revision_id_catalog_item_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."catalog_item_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_revision_sources" ADD CONSTRAINT "catalog_revision_sources_source_id_source_registry_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source_registry"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offering_revisions" ADD CONSTRAINT "course_offering_revisions_revision_id_catalog_item_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."catalog_item_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offering_revisions" ADD CONSTRAINT "course_offering_revisions_course_revision_fk" FOREIGN KEY ("course_item_id","course_revision_id") REFERENCES "public"."catalog_item_revisions"("catalog_item_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offering_revisions" ADD CONSTRAINT "course_offering_revisions_campus_revision_fk" FOREIGN KEY ("campus_item_id","campus_revision_id") REFERENCES "public"."catalog_item_revisions"("catalog_item_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_revisions" ADD CONSTRAINT "course_revisions_revision_id_catalog_item_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."catalog_item_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_revisions" ADD CONSTRAINT "course_revisions_field_revision_fk" FOREIGN KEY ("field_item_id","field_revision_id") REFERENCES "public"."catalog_item_revisions"("catalog_item_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "examination_revisions" ADD CONSTRAINT "examination_revisions_revision_id_catalog_item_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."catalog_item_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_revisions" ADD CONSTRAINT "field_revisions_revision_id_catalog_item_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."catalog_item_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_revisions" ADD CONSTRAINT "institution_revisions_revision_id_catalog_item_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."catalog_item_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pathway_revisions" ADD CONSTRAINT "pathway_revisions_revision_id_catalog_item_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."catalog_item_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarship_revisions" ADD CONSTRAINT "scholarship_revisions_revision_id_catalog_item_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."catalog_item_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exploration_history" ADD CONSTRAINT "exploration_history_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guided_explorer_session_questions" ADD CONSTRAINT "guided_explorer_session_questions_session_id_guided_explorer_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."guided_explorer_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campus_revisions_institution_idx" ON "campus_revisions" USING btree ("institution_item_id");--> statement-breakpoint
CREATE INDEX "campus_revisions_state_idx" ON "campus_revisions" USING btree ("state_id");--> statement-breakpoint
CREATE INDEX "catalog_item_aliases_item_idx" ON "catalog_item_aliases" USING btree ("catalog_item_id");--> statement-breakpoint
CREATE INDEX "catalog_item_revisions_status_idx" ON "catalog_item_revisions" USING btree ("publication_status");--> statement-breakpoint
CREATE INDEX "catalog_item_revisions_classification_idx" ON "catalog_item_revisions" USING btree ("data_classification");--> statement-breakpoint
CREATE INDEX "catalog_item_revisions_verification_idx" ON "catalog_item_revisions" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "catalog_item_revisions_item_status_idx" ON "catalog_item_revisions" USING btree ("catalog_item_id","publication_status");--> statement-breakpoint
CREATE INDEX "catalog_items_type_idx" ON "catalog_items" USING btree ("item_type");--> statement-breakpoint
CREATE INDEX "catalog_items_published_revision_idx" ON "catalog_items" USING btree ("published_revision_id");--> statement-breakpoint
CREATE INDEX "catalog_revision_sources_source_idx" ON "catalog_revision_sources" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "course_offering_revisions_course_idx" ON "course_offering_revisions" USING btree ("course_item_id","course_revision_id");--> statement-breakpoint
CREATE INDEX "course_offering_revisions_campus_idx" ON "course_offering_revisions" USING btree ("campus_item_id","campus_revision_id");--> statement-breakpoint
CREATE INDEX "course_revisions_field_item_idx" ON "course_revisions" USING btree ("field_item_id");--> statement-breakpoint
CREATE INDEX "course_revisions_field_revision_idx" ON "course_revisions" USING btree ("field_revision_id");--> statement-breakpoint
CREATE INDEX "source_registry_type_status_idx" ON "source_registry" USING btree ("source_type","status");--> statement-breakpoint
CREATE INDEX "exploration_history_catalog_item_idx" ON "exploration_history" USING btree ("catalog_item_id");--> statement-breakpoint
CREATE INDEX "exploration_history_last_visited_idx" ON "exploration_history" USING btree ("user_id","last_visited_at");--> statement-breakpoint
CREATE INDEX "guided_explorer_answers_session_question_idx" ON "guided_explorer_answers" USING btree ("session_id","question_id");--> statement-breakpoint
CREATE INDEX "guided_explorer_session_questions_position_idx" ON "guided_explorer_session_questions" USING btree ("session_id","path_position");--> statement-breakpoint
CREATE INDEX "guided_explorer_sessions_user_idx" ON "guided_explorer_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guided_explorer_sessions_status_idx" ON "guided_explorer_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "guided_explorer_sessions_one_current_per_user" ON "guided_explorer_sessions" USING btree ("user_id") WHERE "guided_explorer_sessions"."status" IN ('active', 'paused');--> statement-breakpoint
CREATE INDEX "saved_items_catalog_item_idx" ON "saved_items" USING btree ("catalog_item_id");--> statement-breakpoint
-- Seed the required Northeast state identities with deterministic UUIDs.
INSERT INTO "states" ("id", "country_code", "name") VALUES
	('3c1a56d8-f31b-5768-b99e-79b2688a8962', 'IN', 'Arunachal Pradesh'),
	('f9311950-b8c5-59dd-a644-9f33eb7c0249', 'IN', 'Assam'),
	('3f2a2dc5-b111-54ab-b009-338c8bb6d047', 'IN', 'Manipur'),
	('da0c2d15-40f1-5822-a522-4e487882766b', 'IN', 'Meghalaya'),
	('294f5c15-2797-5a0b-804a-80967bdcfb56', 'IN', 'Mizoram'),
	('fb7633bf-c826-53bc-88c0-961680911c80', 'IN', 'Nagaland'),
	('c4d828f1-2d85-50e1-ba40-ff793325373b', 'IN', 'Sikkim'),
	('d57f709b-2817-5f9c-b3e4-3086e7c9e596', 'IN', 'Tripura')
ON CONFLICT ("country_code", "name") DO NOTHING;
--> statement-breakpoint
-- New account-owned tables reference the existing SERIAL/INTEGER users.id.
ALTER TABLE "student_profiles"
	ADD CONSTRAINT "student_profiles_user_id_users_fk"
	FOREIGN KEY ("user_id") REFERENCES public.users("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "discover_answers"
	ADD CONSTRAINT "discover_answers_user_id_users_fk"
	FOREIGN KEY ("user_id") REFERENCES public.users("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "guided_explorer_sessions"
	ADD CONSTRAINT "guided_explorer_sessions_user_id_users_fk"
	FOREIGN KEY ("user_id") REFERENCES public.users("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "saved_items"
	ADD CONSTRAINT "saved_items_user_id_users_fk"
	FOREIGN KEY ("user_id") REFERENCES public.users("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "exploration_history"
	ADD CONSTRAINT "exploration_history_user_id_users_fk"
	FOREIGN KEY ("user_id") REFERENCES public.users("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "catalog_item_revisions"
	ADD CONSTRAINT "catalog_item_revisions_created_by_users_fk"
	FOREIGN KEY ("created_by") REFERENCES public.users("id") ON DELETE RESTRICT,
	ADD CONSTRAINT "catalog_item_revisions_updated_by_users_fk"
	FOREIGN KEY ("updated_by") REFERENCES public.users("id") ON DELETE RESTRICT,
	ADD CONSTRAINT "catalog_item_revisions_published_by_users_fk"
	FOREIGN KEY ("published_by") REFERENCES public.users("id") ON DELETE RESTRICT;
--> statement-breakpoint
-- Deferred pointers permit an item and its typed revision to be created atomically.
ALTER TABLE "catalog_items"
	ADD CONSTRAINT "catalog_items_published_revision_fk"
	FOREIGN KEY ("id", "published_revision_id")
	REFERENCES "catalog_item_revisions" ("catalog_item_id", "id")
	DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "guided_explorer_sessions"
	ADD CONSTRAINT "guided_explorer_current_question_path_fk"
	FOREIGN KEY ("id", "path_index", "current_question_id")
	REFERENCES "guided_explorer_session_questions" ("session_id", "path_position", "question_id")
	DEFERRABLE INITIALLY DEFERRED,
	ADD CONSTRAINT "guided_explorer_resume_question_path_fk"
	FOREIGN KEY ("id", "path_index", "resume_question_id")
	REFERENCES "guided_explorer_session_questions" ("session_id", "path_position", "question_id")
	DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint
ALTER TABLE "guided_explorer_answers"
	ADD CONSTRAINT "guided_explorer_answers_session_question_fk"
	FOREIGN KEY ("session_id", "question_id")
	REFERENCES "guided_explorer_session_questions" ("session_id", "question_id")
	ON DELETE CASCADE;
--> statement-breakpoint
-- Defer catalogue identity/revision type validation until the full revision is present.
CREATE FUNCTION public.assert_catalog_revision_type(p_revision_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
	revision_item_type text;
	typed_row_count bigint;
	expected_row_count bigint;
BEGIN
	SELECT item.item_type
	INTO revision_item_type
	FROM public.catalog_item_revisions AS revision
	JOIN public.catalog_items AS item ON item.id = revision.catalog_item_id
	WHERE revision.id = p_revision_id;

	IF NOT FOUND THEN
		RETURN;
	END IF;

	SELECT
		(SELECT count(*) FROM public.field_revisions WHERE revision_id = p_revision_id)
		+ (SELECT count(*) FROM public.institution_revisions WHERE revision_id = p_revision_id)
		+ (SELECT count(*) FROM public.campus_revisions WHERE revision_id = p_revision_id)
		+ (SELECT count(*) FROM public.course_revisions WHERE revision_id = p_revision_id)
		+ (SELECT count(*) FROM public.course_offering_revisions WHERE revision_id = p_revision_id)
		+ (SELECT count(*) FROM public.pathway_revisions WHERE revision_id = p_revision_id)
		+ (SELECT count(*) FROM public.examination_revisions WHERE revision_id = p_revision_id)
		+ (SELECT count(*) FROM public.scholarship_revisions WHERE revision_id = p_revision_id)
	INTO typed_row_count;

	CASE revision_item_type
		WHEN 'field' THEN
			SELECT count(*) INTO expected_row_count FROM public.field_revisions WHERE revision_id = p_revision_id;
		WHEN 'institution' THEN
			SELECT count(*) INTO expected_row_count FROM public.institution_revisions WHERE revision_id = p_revision_id;
		WHEN 'campus' THEN
			SELECT count(*) INTO expected_row_count FROM public.campus_revisions WHERE revision_id = p_revision_id;
		WHEN 'course' THEN
			SELECT count(*) INTO expected_row_count FROM public.course_revisions WHERE revision_id = p_revision_id;
		WHEN 'course_offering' THEN
			SELECT count(*) INTO expected_row_count FROM public.course_offering_revisions WHERE revision_id = p_revision_id;
		WHEN 'pathway' THEN
			SELECT count(*) INTO expected_row_count FROM public.pathway_revisions WHERE revision_id = p_revision_id;
		WHEN 'examination' THEN
			SELECT count(*) INTO expected_row_count FROM public.examination_revisions WHERE revision_id = p_revision_id;
		WHEN 'scholarship' THEN
			SELECT count(*) INTO expected_row_count FROM public.scholarship_revisions WHERE revision_id = p_revision_id;
		ELSE
			RAISE EXCEPTION 'Unsupported catalogue item type % for revision %', revision_item_type, p_revision_id;
	END CASE;

	IF typed_row_count <> 1 OR expected_row_count <> 1 THEN
		RAISE EXCEPTION
			'Revision % for catalogue item type % must have exactly one matching typed revision row (found %, expected %)',
			p_revision_id, revision_item_type, typed_row_count, expected_row_count;
	END IF;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION public.check_catalog_revision_type_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF TG_TABLE_NAME = 'catalog_item_revisions' THEN
		IF TG_OP <> 'INSERT' THEN
			PERFORM public.assert_catalog_revision_type(OLD.id);
		END IF;
		IF TG_OP <> 'DELETE' THEN
			PERFORM public.assert_catalog_revision_type(NEW.id);
		END IF;
	ELSE
		IF TG_OP <> 'INSERT' THEN
			PERFORM public.assert_catalog_revision_type(OLD.revision_id);
		END IF;
		IF TG_OP <> 'DELETE' THEN
			PERFORM public.assert_catalog_revision_type(NEW.revision_id);
		END IF;
	END IF;
	RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER catalog_item_revisions_typed_row_check
AFTER INSERT OR UPDATE OR DELETE ON public.catalog_item_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_catalog_revision_type_trigger();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER field_revisions_typed_row_check
AFTER INSERT OR UPDATE OR DELETE ON public.field_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_catalog_revision_type_trigger();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER institution_revisions_typed_row_check
AFTER INSERT OR UPDATE OR DELETE ON public.institution_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_catalog_revision_type_trigger();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER campus_revisions_typed_row_check
AFTER INSERT OR UPDATE OR DELETE ON public.campus_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_catalog_revision_type_trigger();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER course_revisions_typed_row_check
AFTER INSERT OR UPDATE OR DELETE ON public.course_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_catalog_revision_type_trigger();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER course_offering_revisions_typed_row_check
AFTER INSERT OR UPDATE OR DELETE ON public.course_offering_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_catalog_revision_type_trigger();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER pathway_revisions_typed_row_check
AFTER INSERT OR UPDATE OR DELETE ON public.pathway_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_catalog_revision_type_trigger();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER examination_revisions_typed_row_check
AFTER INSERT OR UPDATE OR DELETE ON public.examination_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_catalog_revision_type_trigger();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER scholarship_revisions_typed_row_check
AFTER INSERT OR UPDATE OR DELETE ON public.scholarship_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_catalog_revision_type_trigger();
--> statement-breakpoint
CREATE FUNCTION public.assert_published_revision_pointer(p_item_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
	revision_id uuid;
	revision_status text;
BEGIN
	SELECT published_revision_id
	INTO revision_id
	FROM public.catalog_items
	WHERE id = p_item_id;

	IF NOT FOUND OR revision_id IS NULL THEN
		RETURN;
	END IF;

	SELECT publication_status
	INTO revision_status
	FROM public.catalog_item_revisions
	WHERE catalog_item_id = p_item_id AND id = revision_id;

	IF revision_status IS DISTINCT FROM 'published' THEN
		RAISE EXCEPTION
			'Published revision pointer for catalogue item % must reference one of its published revisions',
			p_item_id;
	END IF;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION public.check_published_revision_pointer_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF TG_TABLE_NAME = 'catalog_items' THEN
		PERFORM public.assert_published_revision_pointer(NEW.id);
	ELSE
		PERFORM public.assert_published_revision_pointer(NEW.catalog_item_id);
	END IF;
	RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER catalog_items_published_revision_status_check
AFTER INSERT OR UPDATE ON public.catalog_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_published_revision_pointer_trigger();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER catalog_item_revisions_published_pointer_status_check
AFTER INSERT OR UPDATE ON public.catalog_item_revisions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_published_revision_pointer_trigger();
--> statement-breakpoint
CREATE FUNCTION public.prevent_published_revision_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF OLD.publication_status = 'published' THEN
		RAISE EXCEPTION 'Published catalogue revisions are immutable; create a new revision instead';
	END IF;
	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER catalog_item_revisions_immutable
BEFORE UPDATE OR DELETE ON public.catalog_item_revisions
FOR EACH ROW EXECUTE FUNCTION public.prevent_published_revision_update();
--> statement-breakpoint
CREATE FUNCTION public.prevent_published_typed_revision_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	revision_id uuid;
	revision_status text;
BEGIN
	IF TG_OP = 'DELETE' THEN
		revision_id := OLD.revision_id;
	ELSE
		revision_id := NEW.revision_id;
	END IF;

	SELECT publication_status
	INTO revision_status
	FROM public.catalog_item_revisions
	WHERE id = revision_id;

	IF revision_status = 'published' THEN
		RAISE EXCEPTION 'Published catalogue revision content is immutable; create a new revision instead';
	END IF;

	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER field_revisions_immutable
BEFORE INSERT OR UPDATE OR DELETE ON public.field_revisions
FOR EACH ROW EXECUTE FUNCTION public.prevent_published_typed_revision_update();
--> statement-breakpoint
CREATE TRIGGER institution_revisions_immutable
BEFORE INSERT OR UPDATE OR DELETE ON public.institution_revisions
FOR EACH ROW EXECUTE FUNCTION public.prevent_published_typed_revision_update();
--> statement-breakpoint
CREATE TRIGGER campus_revisions_immutable
BEFORE INSERT OR UPDATE OR DELETE ON public.campus_revisions
FOR EACH ROW EXECUTE FUNCTION public.prevent_published_typed_revision_update();
--> statement-breakpoint
CREATE TRIGGER course_revisions_immutable
BEFORE INSERT OR UPDATE OR DELETE ON public.course_revisions
FOR EACH ROW EXECUTE FUNCTION public.prevent_published_typed_revision_update();
--> statement-breakpoint
CREATE TRIGGER course_offering_revisions_immutable
BEFORE INSERT OR UPDATE OR DELETE ON public.course_offering_revisions
FOR EACH ROW EXECUTE FUNCTION public.prevent_published_typed_revision_update();
--> statement-breakpoint
CREATE TRIGGER pathway_revisions_immutable
BEFORE INSERT OR UPDATE OR DELETE ON public.pathway_revisions
FOR EACH ROW EXECUTE FUNCTION public.prevent_published_typed_revision_update();
--> statement-breakpoint
CREATE TRIGGER examination_revisions_immutable
BEFORE INSERT OR UPDATE OR DELETE ON public.examination_revisions
FOR EACH ROW EXECUTE FUNCTION public.prevent_published_typed_revision_update();
--> statement-breakpoint
CREATE TRIGGER scholarship_revisions_immutable
BEFORE INSERT OR UPDATE OR DELETE ON public.scholarship_revisions
FOR EACH ROW EXECUTE FUNCTION public.prevent_published_typed_revision_update();
--> statement-breakpoint
CREATE FUNCTION public.prevent_published_provenance_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	revision_id uuid;
	revision_status text;
BEGIN
	IF TG_OP = 'DELETE' THEN
		revision_id := OLD.revision_id;
	ELSE
		revision_id := NEW.revision_id;
	END IF;

	SELECT publication_status
	INTO revision_status
	FROM public.catalog_item_revisions
	WHERE id = revision_id;

	IF revision_status = 'published' THEN
		RAISE EXCEPTION 'Published catalogue provenance is immutable';
	END IF;

	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER catalog_revision_sources_immutable
BEFORE INSERT OR UPDATE OR DELETE ON public.catalog_revision_sources
FOR EACH ROW EXECUTE FUNCTION public.prevent_published_provenance_update();
--> statement-breakpoint
CREATE FUNCTION public.prevent_published_source_identity_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM public.catalog_revision_sources AS provenance
		JOIN public.catalog_item_revisions AS revision ON revision.id = provenance.revision_id
		WHERE provenance.source_id = OLD.id
			AND revision.publication_status = 'published'
	) AND (
		OLD.name IS DISTINCT FROM NEW.name
		OR OLD.source_type IS DISTINCT FROM NEW.source_type
		OR OLD.canonical_url IS DISTINCT FROM NEW.canonical_url
	) THEN
		RAISE EXCEPTION 'Source identity used by published provenance is immutable';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER source_registry_published_identity_immutable
BEFORE UPDATE ON public.source_registry
FOR EACH ROW EXECUTE FUNCTION public.prevent_published_source_identity_update();
--> statement-breakpoint
CREATE FUNCTION public.prevent_catalog_item_type_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW.id IS DISTINCT FROM OLD.id OR NEW.item_type IS DISTINCT FROM OLD.item_type THEN
		RAISE EXCEPTION 'Catalogue item identity and type are immutable';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER catalog_items_type_immutable
BEFORE UPDATE OF id, item_type ON public.catalog_items
FOR EACH ROW EXECUTE FUNCTION public.prevent_catalog_item_type_change();
--> statement-breakpoint
CREATE FUNCTION public.prevent_catalog_revision_identity_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW.id IS DISTINCT FROM OLD.id
		OR NEW.catalog_item_id IS DISTINCT FROM OLD.catalog_item_id
		OR NEW.revision_number IS DISTINCT FROM OLD.revision_number THEN
		RAISE EXCEPTION 'Catalogue revision identity is immutable';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER catalog_item_revision_identity_immutable
BEFORE UPDATE OF id, catalog_item_id, revision_number ON public.catalog_item_revisions
FOR EACH ROW EXECUTE FUNCTION public.prevent_catalog_revision_identity_change();
--> statement-breakpoint
CREATE FUNCTION public.check_catalog_relationship_types()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	referenced_type text;
	course_type text;
	campus_type text;
BEGIN
	IF TG_TABLE_NAME = 'campus_revisions' THEN
		SELECT item_type INTO referenced_type
		FROM public.catalog_items
		WHERE id = NEW.institution_item_id;
		IF referenced_type IS DISTINCT FROM 'institution' THEN
			RAISE EXCEPTION 'A campus revision must reference an institution catalogue item';
		END IF;
	ELSIF TG_TABLE_NAME = 'course_revisions' THEN
		SELECT item_type INTO referenced_type
		FROM public.catalog_items
		WHERE id = NEW.field_item_id;
		IF referenced_type IS DISTINCT FROM 'field' THEN
			RAISE EXCEPTION 'A course revision must reference a field catalogue item';
		END IF;
	ELSIF TG_TABLE_NAME = 'course_offering_revisions' THEN
		SELECT item_type INTO course_type
		FROM public.catalog_items
		WHERE id = NEW.course_item_id;
		SELECT item_type INTO campus_type
		FROM public.catalog_items
		WHERE id = NEW.campus_item_id;
		IF course_type IS DISTINCT FROM 'course' OR campus_type IS DISTINCT FROM 'campus' THEN
			RAISE EXCEPTION 'A course offering must reference a course and a campus catalogue item';
		END IF;
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER campus_revisions_institution_type_check
BEFORE INSERT OR UPDATE OF institution_item_id ON public.campus_revisions
FOR EACH ROW EXECUTE FUNCTION public.check_catalog_relationship_types();
--> statement-breakpoint
CREATE TRIGGER course_revisions_field_type_check
BEFORE INSERT OR UPDATE OF field_item_id, field_revision_id ON public.course_revisions
FOR EACH ROW EXECUTE FUNCTION public.check_catalog_relationship_types();
--> statement-breakpoint
CREATE TRIGGER course_offering_revisions_item_type_check
BEFORE INSERT OR UPDATE OF course_item_id, course_revision_id, campus_item_id, campus_revision_id
ON public.course_offering_revisions
FOR EACH ROW EXECUTE FUNCTION public.check_catalog_relationship_types();
--> statement-breakpoint
CREATE FUNCTION public.normalize_source_url(raw_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
	url_parts text[];
	url_scheme text;
	url_authority text;
	url_tail text;
	query_position integer;
BEGIN
	IF raw_url IS NULL THEN
		RETURN NULL;
	END IF;
	IF raw_url <> btrim(raw_url) OR raw_url ~ '[[:space:]]' THEN
		RAISE EXCEPTION 'Source URLs must not contain surrounding or embedded whitespace';
	END IF;

	url_parts := regexp_match(raw_url, '^(https?)://([^/?#]+)(.*)$', 'i');
	IF url_parts IS NULL OR url_parts[2] = '' OR url_parts[2] ~ '@' THEN
		RAISE EXCEPTION 'Source URLs must be absolute HTTP or HTTPS URLs without user information';
	END IF;

	url_scheme := lower(url_parts[1]);
	url_authority := lower(url_parts[2]);
	url_tail := regexp_replace(url_parts[3], '#.*$', '');
	IF url_scheme = 'http' THEN
		url_authority := regexp_replace(url_authority, ':80$', '');
	ELSE
		url_authority := regexp_replace(url_authority, ':443$', '');
	END IF;
	query_position := strpos(url_tail, '?');
	IF query_position > 0 THEN
		url_tail := regexp_replace(left(url_tail, query_position - 1), '/+$', '')
			|| substring(url_tail FROM query_position);
	ELSE
		url_tail := regexp_replace(url_tail, '/+$', '');
	END IF;

	RETURN url_scheme || '://' || url_authority || url_tail;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION public.set_source_registry_normalized_url()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	NEW.normalized_url := public.normalize_source_url(NEW.canonical_url);
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER source_registry_normalize_url
BEFORE INSERT OR UPDATE ON public.source_registry
FOR EACH ROW EXECUTE FUNCTION public.set_source_registry_normalized_url();
--> statement-breakpoint
CREATE FUNCTION public.is_valid_student_context(value jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
	context_entry record;
BEGIN
	IF value IS NULL THEN
		RETURN true;
	END IF;
	IF jsonb_typeof(value) IS DISTINCT FROM 'object' THEN
		RETURN false;
	END IF;
	IF value - ARRAY['courseId', 'courseName', 'fieldId', 'stage']::text[] <> '{}'::jsonb THEN
		RETURN false;
	END IF;

	FOR context_entry IN SELECT key, val FROM jsonb_each(value) AS entry(key, val) LOOP
		IF jsonb_typeof(context_entry.val) <> 'string'
			OR length(context_entry.val #>> '{}') > 200 THEN
			RETURN false;
		END IF;
	END LOOP;
	RETURN true;
END;
$$;
--> statement-breakpoint
ALTER TABLE public.saved_items
	ADD CONSTRAINT saved_items_context_shape_check
	CHECK (public.is_valid_student_context(context));
--> statement-breakpoint
ALTER TABLE public.exploration_history
	ADD CONSTRAINT exploration_history_context_shape_check
	CHECK (public.is_valid_student_context(context));
--> statement-breakpoint
CREATE FUNCTION public.check_student_catalog_context_key()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	item_type text;
	expected_context_key text;
BEGIN
	SELECT item.item_type
	INTO item_type
	FROM public.catalog_items AS item
	WHERE item.id = NEW.catalog_item_id;

	IF item_type IS NULL THEN
		RAISE EXCEPTION 'Saved/history row references an unknown catalogue item %', NEW.catalog_item_id;
	END IF;
	IF item_type = 'course_offering' THEN
		expected_context_key := COALESCE(NEW.context->>'courseId', '');
		IF NEW.context_key IS DISTINCT FROM expected_context_key THEN
			RAISE EXCEPTION 'Course-offering context_key must equal context.courseId or the empty string';
		END IF;
	ELSIF NEW.context_key IS NOT NULL THEN
		RAISE EXCEPTION 'Non-offering catalogue items must use a NULL context_key';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER saved_items_context_key_check
BEFORE INSERT OR UPDATE OF catalog_item_id, context_key, context ON public.saved_items
FOR EACH ROW EXECUTE FUNCTION public.check_student_catalog_context_key();
--> statement-breakpoint
CREATE TRIGGER exploration_history_context_key_check
BEFORE INSERT OR UPDATE OF catalog_item_id, context_key, context ON public.exploration_history
FOR EACH ROW EXECUTE FUNCTION public.check_student_catalog_context_key();
--> statement-breakpoint
CREATE FUNCTION public.check_catalog_alias_item_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	expected_type text;
	actual_type text;
BEGIN
	IF NEW.source_system <> 'careerbridge' THEN
		RETURN NEW;
	END IF;

	CASE NEW.external_type
		WHEN 'field' THEN expected_type := 'field';
		WHEN 'institution' THEN expected_type := 'institution';
		WHEN 'campus' THEN expected_type := 'campus';
		WHEN 'course' THEN expected_type := 'course';
		WHEN 'institution-offering' THEN expected_type := 'course_offering';
		WHEN 'pathway' THEN expected_type := 'pathway';
		WHEN 'examination' THEN expected_type := 'examination';
		WHEN 'scholarship' THEN expected_type := 'scholarship';
		ELSE
			RAISE EXCEPTION 'Unsupported CareerBridge external catalogue type %', NEW.external_type;
	END CASE;

	SELECT item_type INTO actual_type
	FROM public.catalog_items
	WHERE id = NEW.catalog_item_id;

	IF actual_type IS DISTINCT FROM expected_type THEN
		RAISE EXCEPTION
			'CareerBridge alias type % must resolve to catalogue item type % (found %)',
			NEW.external_type, expected_type, actual_type;
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER catalog_item_aliases_item_type_check
BEFORE INSERT OR UPDATE ON public.catalog_item_aliases
FOR EACH ROW EXECUTE FUNCTION public.check_catalog_alias_item_type();
--> statement-breakpoint
-- Preserve every static legacy catalogue key before Saved/History cutover.
WITH legacy_aliases AS (
	SELECT 'field'::text AS item_type, 'field'::text AS external_type, legacy_id AS external_key, ''::text AS external_context_key
	FROM unnest(ARRAY[
		'technology', 'engineering', 'healthcare', 'business', 'law', 'government',
		'education', 'science', 'arts-design', 'media', 'agriculture-environment',
		'hospitality-tourism', 'social-sciences'
	]::text[]) AS ids(legacy_id)
	UNION ALL
	SELECT 'course', 'course', legacy_id, ''
	FROM unnest(ARRAY[
		'bca', 'bcom', 'engineering-diploma', 'bsc', 'ba', 'btech',
		'btech-computer-science', 'technology-diploma', 'computing-certificate',
		'mbbs', 'bdes', 'ba-llb', 'bba', 'bpharm', 'bsc-agriculture',
		'hotel-management', 'bsc-nursing', 'bsw', 'journalism',
		'environmental-science', 'bfa', 'computer-science', 'barch',
		'psychology', 'public-administration', 'vocational-multimedia',
		'mathematics', 'higher-secondary', 'higher-secondary-science',
		'computer-engineering-diploma', 'electronics-trade', 'digital-skills',
		'iti-electrician', 'iti-copa', 'civil-diploma', 'agriculture-certificate',
		'hospitality-vocational', 'healthcare-support'
	]::text[]) AS ids(legacy_id)
	UNION ALL
	SELECT 'institution', 'institution', legacy_id, ''
	FROM unnest(ARRAY[
		'kohima-science-college-jotsoma', 'st-edmunds-college-shillong',
		'eastern-hills-college', 'sample-north-valley-university',
		'sample-institute-of-computing', 'sample-hillside-college',
		'sample-riverbend-university', 'sample-eastern-skills-institute',
		'sample-mountainview-college', 'sample-greenfield-university',
		'sample-lakeside-college', 'sample-plateau-institute',
		'sample-cedar-grove-college', 'sample-sunrise-university',
		'sample-blue-ridge-institute', 'sample-pinecrest-college',
		'sample-cloudpeak-university', 'sample-maple-leaf-institute',
		'sample-silver-stream-college', 'sample-orchid-valley-university',
		'sample-fernwood-institute'
	]::text[]) AS ids(legacy_id)
	UNION ALL
	SELECT 'pathway', 'pathway', legacy_id, ''
	FROM unnest(ARRAY[
		'higher-secondary', 'open-schooling', 'polytechnic-diploma',
		'trade-training', 'vocational-skills-class-10', 'apprenticeship-class-10',
		'undergraduate', 'professional-degree', 'diploma', 'vocational-skills',
		'apprenticeship-class-12'
	]::text[]) AS ids(legacy_id)
	UNION ALL
	SELECT 'examination', 'examination', legacy_id, ''
	FROM unnest(ARRAY[
		'jee-main', 'neet-ug', 'cuet-ug', 'clat-ug', 'jee-advanced', 'nata', 'nid-dat'
	]::text[]) AS ids(legacy_id)
	UNION ALL
	SELECT 'scholarship', 'scholarship', legacy_id, ''
	FROM unnest(ARRAY[
		'nmmss', 'post-matric-st', 'post-matric-sc', 'aicte-pragati',
		'ishan-uday', 'national-fellowship-st'
	]::text[]) AS ids(legacy_id)
	UNION ALL
	SELECT 'course_offering', 'institution-offering', legacy_id, ''
	FROM unnest(ARRAY[
		'kohima-science-college-jotsoma', 'st-edmunds-college-shillong',
		'eastern-hills-college', 'sample-north-valley-university',
		'sample-institute-of-computing', 'sample-hillside-college',
		'sample-riverbend-university', 'sample-eastern-skills-institute',
		'sample-mountainview-college', 'sample-greenfield-university',
		'sample-lakeside-college', 'sample-plateau-institute',
		'sample-cedar-grove-college', 'sample-sunrise-university',
		'sample-blue-ridge-institute', 'sample-pinecrest-college',
		'sample-cloudpeak-university', 'sample-maple-leaf-institute',
		'sample-silver-stream-college', 'sample-orchid-valley-university',
		'sample-fernwood-institute'
	]::text[]) AS ids(legacy_id)
	UNION ALL
	SELECT 'course_offering', 'institution-offering', offering.institution_slug, offering.course_id
	FROM (VALUES
		('eastern-hills-college', 'bca'),
		('sample-north-valley-university', 'bca'),
		('sample-institute-of-computing', 'bca'),
		('sample-hillside-college', 'bca'),
		('sample-riverbend-university', 'bca'),
		('sample-eastern-skills-institute', 'bca'),
		('sample-mountainview-college', 'bca'),
		('sample-greenfield-university', 'bca'),
		('sample-lakeside-college', 'bca'),
		('sample-plateau-institute', 'bca'),
		('sample-cedar-grove-college', 'bca'),
		('sample-sunrise-university', 'bca'),
		('sample-blue-ridge-institute', 'bca'),
		('sample-pinecrest-college', 'bca'),
		('sample-cloudpeak-university', 'bca'),
		('sample-maple-leaf-institute', 'bca'),
		('sample-silver-stream-college', 'bca'),
		('sample-orchid-valley-university', 'bca'),
		('sample-fernwood-institute', 'bca'),
		('kohima-science-college-jotsoma', 'bsc'),
		('kohima-science-college-jotsoma', 'ba'),
		('st-edmunds-college-shillong', 'ba'),
		('st-edmunds-college-shillong', 'bsc')
	) AS offering(institution_slug, course_id)
),
resolved_aliases AS (
	SELECT
		'careerbridge'::text AS source_system,
		legacy_aliases.*,
		md5(concat_ws(
			chr(31), 'careerbridge.catalog.v1', 'careerbridge',
			legacy_aliases.item_type, legacy_aliases.external_type,
			legacy_aliases.external_key, legacy_aliases.external_context_key
		))::uuid AS catalog_item_id
	FROM legacy_aliases
)
INSERT INTO public.catalog_items (id, item_type)
SELECT DISTINCT catalog_item_id, item_type
FROM resolved_aliases
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
WITH legacy_aliases AS (
	SELECT 'field'::text AS item_type, 'field'::text AS external_type, legacy_id AS external_key, ''::text AS external_context_key
	FROM unnest(ARRAY[
		'technology', 'engineering', 'healthcare', 'business', 'law', 'government',
		'education', 'science', 'arts-design', 'media', 'agriculture-environment',
		'hospitality-tourism', 'social-sciences'
	]::text[]) AS ids(legacy_id)
	UNION ALL
	SELECT 'course', 'course', legacy_id, ''
	FROM unnest(ARRAY[
		'bca', 'bcom', 'engineering-diploma', 'bsc', 'ba', 'btech',
		'btech-computer-science', 'technology-diploma', 'computing-certificate',
		'mbbs', 'bdes', 'ba-llb', 'bba', 'bpharm', 'bsc-agriculture',
		'hotel-management', 'bsc-nursing', 'bsw', 'journalism',
		'environmental-science', 'bfa', 'computer-science', 'barch',
		'psychology', 'public-administration', 'vocational-multimedia',
		'mathematics', 'higher-secondary', 'higher-secondary-science',
		'computer-engineering-diploma', 'electronics-trade', 'digital-skills',
		'iti-electrician', 'iti-copa', 'civil-diploma', 'agriculture-certificate',
		'hospitality-vocational', 'healthcare-support'
	]::text[]) AS ids(legacy_id)
	UNION ALL
	SELECT 'institution', 'institution', legacy_id, ''
	FROM unnest(ARRAY[
		'kohima-science-college-jotsoma', 'st-edmunds-college-shillong',
		'eastern-hills-college', 'sample-north-valley-university',
		'sample-institute-of-computing', 'sample-hillside-college',
		'sample-riverbend-university', 'sample-eastern-skills-institute',
		'sample-mountainview-college', 'sample-greenfield-university',
		'sample-lakeside-college', 'sample-plateau-institute',
		'sample-cedar-grove-college', 'sample-sunrise-university',
		'sample-blue-ridge-institute', 'sample-pinecrest-college',
		'sample-cloudpeak-university', 'sample-maple-leaf-institute',
		'sample-silver-stream-college', 'sample-orchid-valley-university',
		'sample-fernwood-institute'
	]::text[]) AS ids(legacy_id)
	UNION ALL
	SELECT 'pathway', 'pathway', legacy_id, ''
	FROM unnest(ARRAY[
		'higher-secondary', 'open-schooling', 'polytechnic-diploma',
		'trade-training', 'vocational-skills-class-10', 'apprenticeship-class-10',
		'undergraduate', 'professional-degree', 'diploma', 'vocational-skills',
		'apprenticeship-class-12'
	]::text[]) AS ids(legacy_id)
	UNION ALL
	SELECT 'examination', 'examination', legacy_id, ''
	FROM unnest(ARRAY[
		'jee-main', 'neet-ug', 'cuet-ug', 'clat-ug', 'jee-advanced', 'nata', 'nid-dat'
	]::text[]) AS ids(legacy_id)
	UNION ALL
	SELECT 'scholarship', 'scholarship', legacy_id, ''
	FROM unnest(ARRAY[
		'nmmss', 'post-matric-st', 'post-matric-sc', 'aicte-pragati',
		'ishan-uday', 'national-fellowship-st'
	]::text[]) AS ids(legacy_id)
	UNION ALL
	SELECT 'course_offering', 'institution-offering', legacy_id, ''
	FROM unnest(ARRAY[
		'kohima-science-college-jotsoma', 'st-edmunds-college-shillong',
		'eastern-hills-college', 'sample-north-valley-university',
		'sample-institute-of-computing', 'sample-hillside-college',
		'sample-riverbend-university', 'sample-eastern-skills-institute',
		'sample-mountainview-college', 'sample-greenfield-university',
		'sample-lakeside-college', 'sample-plateau-institute',
		'sample-cedar-grove-college', 'sample-sunrise-university',
		'sample-blue-ridge-institute', 'sample-pinecrest-college',
		'sample-cloudpeak-university', 'sample-maple-leaf-institute',
		'sample-silver-stream-college', 'sample-orchid-valley-university',
		'sample-fernwood-institute'
	]::text[]) AS ids(legacy_id)
	UNION ALL
	SELECT 'course_offering', 'institution-offering', offering.institution_slug, offering.course_id
	FROM (VALUES
		('eastern-hills-college', 'bca'),
		('sample-north-valley-university', 'bca'),
		('sample-institute-of-computing', 'bca'),
		('sample-hillside-college', 'bca'),
		('sample-riverbend-university', 'bca'),
		('sample-eastern-skills-institute', 'bca'),
		('sample-mountainview-college', 'bca'),
		('sample-greenfield-university', 'bca'),
		('sample-lakeside-college', 'bca'),
		('sample-plateau-institute', 'bca'),
		('sample-cedar-grove-college', 'bca'),
		('sample-sunrise-university', 'bca'),
		('sample-blue-ridge-institute', 'bca'),
		('sample-pinecrest-college', 'bca'),
		('sample-cloudpeak-university', 'bca'),
		('sample-maple-leaf-institute', 'bca'),
		('sample-silver-stream-college', 'bca'),
		('sample-orchid-valley-university', 'bca'),
		('sample-fernwood-institute', 'bca'),
		('kohima-science-college-jotsoma', 'bsc'),
		('kohima-science-college-jotsoma', 'ba'),
		('st-edmunds-college-shillong', 'ba'),
		('st-edmunds-college-shillong', 'bsc')
	) AS offering(institution_slug, course_id)
)
INSERT INTO public.catalog_item_aliases (
	source_system, external_type, external_key, external_context_key, catalog_item_id
)
SELECT
	'careerbridge',
	external_type,
	external_key,
	external_context_key,
	md5(concat_ws(
		chr(31), 'careerbridge.catalog.v1', 'careerbridge',
		item_type, external_type, external_key, external_context_key
	))::uuid
FROM legacy_aliases;
--> statement-breakpoint