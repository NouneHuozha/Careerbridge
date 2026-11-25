ALTER TABLE "guided_explorer_sessions"
  ADD COLUMN IF NOT EXISTS "revision" integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "guided_explorer_sessions"
  DROP CONSTRAINT IF EXISTS "guided_explorer_sessions_revision_check";
--> statement-breakpoint
ALTER TABLE "guided_explorer_sessions"
  ADD CONSTRAINT "guided_explorer_sessions_revision_check" CHECK ("revision" >= 1);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guided_explorer_operation_receipts" (
  "user_id" integer NOT NULL,
  "operation_id" text NOT NULL,
  "session_id" text NOT NULL,
  "revision" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "guided_explorer_operation_receipts_pk" PRIMARY KEY("user_id", "operation_id"),
  CONSTRAINT "guided_explorer_operation_receipts_operation_id_check" CHECK ("operation_id" <> ''),
  CONSTRAINT "guided_explorer_operation_receipts_revision_check" CHECK ("revision" >= 1)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guided_explorer_operation_receipts_session_idx"
  ON "guided_explorer_operation_receipts" ("user_id", "session_id");
