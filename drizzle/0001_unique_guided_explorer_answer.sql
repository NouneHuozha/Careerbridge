DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.guided_explorer_answers
    GROUP BY session_id, question_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate Guided Explorer answers must be reconciled before applying this migration.';
  END IF;
END
$$;--> statement-breakpoint
DROP INDEX "guided_explorer_answers_session_question_idx";--> statement-breakpoint
ALTER TABLE "guided_explorer_answers" ADD CONSTRAINT "guided_explorer_answers_session_question_unique" UNIQUE("session_id","question_id");