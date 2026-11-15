\set ON_ERROR_STOP on

-- Run only after the legacy auth schema and drizzle/0000_initial-schema.sql
-- have been applied to a disposable PostgreSQL database.
-- Every fixture and test runs inside this transaction; the final ROLLBACK
-- leaves the database unchanged.
BEGIN;
SET CONSTRAINTS ALL DEFERRED;

DO $careerbridge_provenance_regression$
DECLARE
	v_item_id uuid := gen_random_uuid();
	v_published_revision_id uuid := gen_random_uuid();
	v_draft_revision_a_id uuid := gen_random_uuid();
	v_draft_revision_b_id uuid := gen_random_uuid();
	v_source_insert_id uuid := gen_random_uuid();
	v_source_delete_id uuid := gen_random_uuid();
	v_source_move_from_published_id uuid := gen_random_uuid();
	v_source_move_to_published_id uuid := gen_random_uuid();
	v_source_move_draft_id uuid := gen_random_uuid();
	v_source_metadata_id uuid := gen_random_uuid();
	v_observed_revision_id uuid;
	v_observed_status text;
BEGIN
	INSERT INTO public.catalog_items (id, item_type)
	VALUES (v_item_id, 'field');

	INSERT INTO public.catalog_item_revisions (
		id, catalog_item_id, revision_number, publication_status,
		title, data_classification, verification_status
	)
	VALUES
		(v_published_revision_id, v_item_id, 1, 'draft', 'Published fixture', 'test', 'verified'),
		(v_draft_revision_a_id, v_item_id, 2, 'draft', 'Draft A fixture', 'test', 'unverified'),
		(v_draft_revision_b_id, v_item_id, 3, 'draft', 'Draft B fixture', 'test', 'unverified');

	INSERT INTO public.field_revisions (revision_id, field_content)
	VALUES
		(v_published_revision_id, '{}'::jsonb),
		(v_draft_revision_a_id, '{}'::jsonb),
		(v_draft_revision_b_id, '{}'::jsonb);

	INSERT INTO public.source_registry (
		id, source_name, category, source_type, data_types, status
	)
	VALUES
		(v_source_insert_id, 'Regression insert source', 'test', 'admin_manual_entry', ARRAY[]::text[], 'active'),
		(v_source_delete_id, 'Regression delete source', 'test', 'admin_manual_entry', ARRAY[]::text[], 'active'),
		(v_source_move_from_published_id, 'Regression published source', 'test', 'admin_manual_entry', ARRAY[]::text[], 'active'),
		(v_source_move_to_published_id, 'Regression target source', 'test', 'admin_manual_entry', ARRAY[]::text[], 'active'),
		(v_source_move_draft_id, 'Regression draft source', 'test', 'admin_manual_entry', ARRAY[]::text[], 'active'),
		(v_source_metadata_id, 'Regression metadata source', 'test', 'admin_manual_entry', ARRAY[]::text[], 'active');

	-- Seed provenance while the future published revision is still a draft.
	INSERT INTO public.catalog_revision_sources (revision_id, source_id, claim_key)
	VALUES
		(v_published_revision_id, v_source_delete_id, 'delete-case'),
		(v_published_revision_id, v_source_move_from_published_id, 'published-to-draft-case'),
		(v_draft_revision_a_id, v_source_move_to_published_id, 'draft-to-published-case'),
		(v_draft_revision_a_id, v_source_move_draft_id, 'draft-to-draft-case'),
		(v_draft_revision_a_id, v_source_metadata_id, 'draft-metadata-case');

	UPDATE public.catalog_item_revisions
	SET publication_status = 'published', published_at = now()
	WHERE id = v_published_revision_id;

	UPDATE public.catalog_items
	SET published_revision_id = v_published_revision_id
	WHERE id = v_item_id;

	-- 1. INSERT against a published revision must fail.
	BEGIN
		INSERT INTO public.catalog_revision_sources (revision_id, source_id, claim_key)
		VALUES (v_published_revision_id, v_source_insert_id, 'insert-case');
		RAISE EXCEPTION 'Regression failure: insert against published revision was allowed';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM <> 'Published catalogue provenance is immutable' THEN
			RAISE;
		END IF;
	END;
	RAISE NOTICE 'PASS 1: insert against published revision rejected';

	-- 2. DELETE from a published revision must fail.
	BEGIN
		DELETE FROM public.catalog_revision_sources
		WHERE revision_id = v_published_revision_id
			AND source_id = v_source_delete_id
			AND claim_key = 'delete-case';
		RAISE EXCEPTION 'Regression failure: delete from published revision was allowed';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM <> 'Published catalogue provenance is immutable' THEN
			RAISE;
		END IF;
	END;
	RAISE NOTICE 'PASS 2: delete from published revision rejected';

	-- 3. Moving provenance off a published revision must fail.
	BEGIN
		UPDATE public.catalog_revision_sources
		SET revision_id = v_draft_revision_a_id
		WHERE revision_id = v_published_revision_id
			AND source_id = v_source_move_from_published_id
			AND claim_key = 'published-to-draft-case';
		RAISE EXCEPTION 'Regression failure: moving provenance off published revision was allowed';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM <> 'Published catalogue provenance is immutable' THEN
			RAISE;
		END IF;
	END;
	RAISE NOTICE 'PASS 3: update from published revision to draft revision rejected';

	-- 4. Moving provenance onto a published revision must fail.
	BEGIN
		UPDATE public.catalog_revision_sources
		SET revision_id = v_published_revision_id
		WHERE revision_id = v_draft_revision_a_id
			AND source_id = v_source_move_to_published_id
			AND claim_key = 'draft-to-published-case';
		RAISE EXCEPTION 'Regression failure: moving provenance onto published revision was allowed';
	EXCEPTION WHEN OTHERS THEN
		IF SQLERRM <> 'Published catalogue provenance is immutable' THEN
			RAISE;
		END IF;
	END;
	RAISE NOTICE 'PASS 4: update from draft revision to published revision rejected';

	-- 5. Moving provenance between two drafts remains allowed.
	UPDATE public.catalog_revision_sources
	SET revision_id = v_draft_revision_b_id
	WHERE revision_id = v_draft_revision_a_id
		AND source_id = v_source_move_draft_id
		AND claim_key = 'draft-to-draft-case';

	SELECT revision_id
	INTO v_observed_revision_id
	FROM public.catalog_revision_sources
	WHERE source_id = v_source_move_draft_id
		AND claim_key = 'draft-to-draft-case';

	IF v_observed_revision_id IS DISTINCT FROM v_draft_revision_b_id THEN
		RAISE EXCEPTION 'Regression failure: draft-to-draft provenance update did not persist';
	END IF;
	RAISE NOTICE 'PASS 5: update between two draft revisions allowed';

	-- 6. Updating non-identity metadata on a draft revision remains allowed.
	UPDATE public.catalog_revision_sources
	SET checked_at = now(), verified_at = now(), verification_status = 'verified'
	WHERE revision_id = v_draft_revision_a_id
		AND source_id = v_source_metadata_id
		AND claim_key = 'draft-metadata-case';

	SELECT verification_status
	INTO v_observed_status
	FROM public.catalog_revision_sources
	WHERE revision_id = v_draft_revision_a_id
		AND source_id = v_source_metadata_id
		AND claim_key = 'draft-metadata-case';

	IF v_observed_status IS DISTINCT FROM 'verified' THEN
		RAISE EXCEPTION 'Regression failure: draft provenance metadata update did not persist';
	END IF;
	RAISE NOTICE 'PASS 6: non-identity provenance metadata update on draft allowed';
END
$careerbridge_provenance_regression$;

SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
