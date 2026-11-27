\set ON_ERROR_STOP on

-- Run only after the legacy auth schema, drizzle/0000_initial-schema.sql,
-- and drizzle/0003_admin_audit_events.sql have been applied to a disposable
-- PostgreSQL database. All fixtures are rolled back at the end.
BEGIN;

DO $admin_audit_regression$
DECLARE
	v_actor_id integer;
	v_item_id uuid := gen_random_uuid();
	v_other_item_id uuid := gen_random_uuid();
	v_revision_id uuid := gen_random_uuid();
	v_other_revision_id uuid := gen_random_uuid();
	v_event_id uuid := gen_random_uuid();
BEGIN
	INSERT INTO public.users (email, auth_provider, role)
	VALUES ('admin-audit-' || gen_random_uuid() || '@example.test', 'clerk', 'admin')
	RETURNING id INTO v_actor_id;

	INSERT INTO public.catalog_items (id, item_type)
	VALUES (v_item_id, 'institution'), (v_other_item_id, 'pathway');

	INSERT INTO public.catalog_item_revisions (
		id, catalog_item_id, revision_number, title, data_classification
	)
	VALUES
		(v_revision_id, v_item_id, 1, 'Audit fixture', 'test'),
		(v_other_revision_id, v_other_item_id, 1, 'Other fixture', 'test');

	INSERT INTO public.admin_audit_events (
		id, actor_id, kind, action, item_id, revision_id
	)
	VALUES (v_event_id, v_actor_id, 'institution', 'submit', v_item_id, v_revision_id);
	RAISE NOTICE 'PASS: valid audit event inserted';

	BEGIN
		UPDATE public.admin_audit_events SET action = 'publish' WHERE id = v_event_id;
		RAISE EXCEPTION 'Regression failure: audit event update was allowed';
	EXCEPTION WHEN raise_exception THEN
		IF SQLERRM <> 'Admin audit events are append-only and cannot be updated or deleted' THEN
			RAISE;
		END IF;
	END;
	RAISE NOTICE 'PASS: update rejected';

	BEGIN
		DELETE FROM public.admin_audit_events WHERE id = v_event_id;
		RAISE EXCEPTION 'Regression failure: audit event deletion was allowed';
	EXCEPTION WHEN raise_exception THEN
		IF SQLERRM <> 'Admin audit events are append-only and cannot be updated or deleted' THEN
			RAISE;
		END IF;
	END;
	RAISE NOTICE 'PASS: delete rejected';

	BEGIN
		INSERT INTO public.admin_audit_events (actor_id, kind, action, item_id, revision_id)
		VALUES (v_actor_id, 'institution', 'submit', v_item_id, v_other_revision_id);
		RAISE EXCEPTION 'Regression failure: mismatched item and revision were allowed';
	EXCEPTION WHEN foreign_key_violation THEN
		NULL;
	END;
	RAISE NOTICE 'PASS: revision from another item rejected';

	BEGIN
		INSERT INTO public.admin_audit_events (actor_id, kind, action, item_id, revision_id)
		VALUES (v_actor_id, 'examination', 'submit', v_item_id, v_revision_id);
		RAISE EXCEPTION 'Regression failure: invalid kind was allowed';
	EXCEPTION WHEN check_violation THEN
		NULL;
	END;
	RAISE NOTICE 'PASS: invalid kind rejected';

	BEGIN
		INSERT INTO public.admin_audit_events (actor_id, kind, action, item_id, revision_id)
		VALUES (v_actor_id, 'institution', 'unpublish', v_item_id, v_revision_id);
		RAISE EXCEPTION 'Regression failure: invalid action was allowed';
	EXCEPTION WHEN check_violation THEN
		NULL;
	END;
	RAISE NOTICE 'PASS: invalid action rejected';

	BEGIN
		INSERT INTO public.admin_audit_events (actor_id, kind, action, item_id, revision_id)
		VALUES (0, 'institution', 'submit', v_item_id, v_revision_id);
		RAISE EXCEPTION 'Regression failure: invalid actor reference was allowed';
	EXCEPTION WHEN foreign_key_violation THEN
		NULL;
	END;
	RAISE NOTICE 'PASS: invalid actor reference rejected';

	BEGIN
		INSERT INTO public.admin_audit_events (actor_id, kind, action, item_id, revision_id)
		VALUES (v_actor_id, 'institution', 'submit', gen_random_uuid(), v_revision_id);
		RAISE EXCEPTION 'Regression failure: invalid item reference was allowed';
	EXCEPTION WHEN foreign_key_violation THEN
		NULL;
	END;
	RAISE NOTICE 'PASS: invalid item reference rejected';

	BEGIN
		INSERT INTO public.admin_audit_events (actor_id, kind, action, item_id, revision_id)
		VALUES (v_actor_id, 'institution', 'submit', v_item_id, gen_random_uuid());
		RAISE EXCEPTION 'Regression failure: invalid revision reference was allowed';
	EXCEPTION WHEN foreign_key_violation THEN
		NULL;
	END;
	RAISE NOTICE 'PASS: invalid revision reference rejected';

	IF NOT EXISTS (SELECT 1 FROM public.admin_audit_events WHERE id = v_event_id) THEN
		RAISE EXCEPTION 'Regression failure: blocked mutation removed the valid audit event';
	END IF;
	RAISE NOTICE 'PASS: valid audit event remains after blocked mutations';
END
$admin_audit_regression$;

ROLLBACK;
