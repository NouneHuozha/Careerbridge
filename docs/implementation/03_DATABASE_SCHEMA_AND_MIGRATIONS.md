# 3. Database Schema and Migrations

## 3.1 Direction

Neon PostgreSQL + Drizzle ORM. Use a version-controlled Drizzle schema and migration history. The existing custom SQL schema and direct `pg` queries are migration inputs, not the target architecture.

## 3.2 Schema domains

Organise schema by domain: identity/application users; student profile/discovery; Guided Explorer; geography; institutions/campuses; fields/courses/offerings; pathways/qualifications; examinations/scholarships; source registry and fetch runs; candidate changes/reviews/publications; saved/history/next steps; knowledge documents/versions/chunks; recommendation runs/evidence; audit events.

## 3.3 Core relational rules

- Use stable primary keys; avoid using display names as identifiers.
- Institution has many campuses.
- Campus belongs to one institution and has its own address/coordinates.
- Course has many offerings; offering references a course and campus.
- Source references may be many-to-many with records through a provenance relation.
- Time-sensitive facts may need a fact/source record rather than one undifferentiated record-level source.
- Student-owned rows reference the internal application user, not arbitrary client-supplied IDs.
- Saved items should use a stable polymorphic reference or a well-defined join design with referential integrity; select and document one approach.
- RAG chunks reference a specific document version.

## 3.4 JSONB policy

Use relational columns/tables for core entities, searchable attributes, permissions, lifecycle state and relationships. JSONB is appropriate for genuinely flexible provider payloads, extraction metadata or versioned answer structures where schema flexibility is justified. Do not place the entire student domain or catalogue in one opaque JSONB field merely for convenience.

## 3.5 Constraints and indexes

Use foreign keys, unique constraints, check constraints and indexes for common filters and joins. Define uniqueness rules for institution identity, campus identity, source URL normalization and external identifiers. Add indexes for state/district, publication status, entity relationships, source freshness and student-owned queries. Avoid speculative indexes; inspect query plans as data grows.

## 3.6 Migrations

1. Add Drizzle schema alongside the existing database without deleting old tables.
2. Generate/review migration SQL.
3. Apply migrations to a disposable development database.
4. Test constraints and rollback/recovery strategy.
5. Back up existing data.
6. Apply additive production migration.
7. Backfill and reconcile records.
8. Switch reads/writes in controlled steps.
9. Remove obsolete schema only after verified cutover and retention approval.

Never edit an already-applied migration to change history. Create a new migration.

## 3.7 Existing account-data migration

Inspect the current `users`, `auth_sessions` and `account_data` data. Map each JSONB field to its approved destination model. Preserve supported saved items, history, education stage, discovery answers and Guided Explorer data. Record row counts and checksums/reconciliation where appropriate. Do not assume every JSON property is valid; profile, classify and migrate with error reports.

## 3.8 Environments

Separate local, test/staging and production databases. Use independent credentials. Run migrations through a controlled deployment step, not automatically from every app instance at runtime. Restrict production database access and use backups before destructive changes.

## 3.9 Seed data

Use deterministic seed scripts for tests and clearly labelled demo data. Production real data must enter through approved import/source workflows. Never mix demo seeds into verified production records.

## 3.10 Verification

Test fresh database setup, upgrade from the current schema, foreign-key behaviour, uniqueness, transaction rollback, student ownership, query performance and backup restoration.

## 3.11 Initial Drizzle migration scope

The initial Drizzle schema contains only the approved catalogue and student domains:

- Geography: `states`.
- Catalogue identities and lifecycle: `catalog_items`, `catalog_item_aliases`, `catalog_item_revisions`.
- Typed catalogue revisions: `field_revisions`, `institution_revisions`, `campus_revisions`, `course_revisions`, `course_offering_revisions`, `pathway_revisions`, `examination_revisions`, and `scholarship_revisions`.
- Provenance: `source_registry`, `catalog_revision_sources`.
- Student data: `student_profiles`, `discover_answers`, `guided_explorer_sessions`, `guided_explorer_session_questions`, `guided_explorer_answers`, `saved_items`, and `exploration_history`.

The migration does not declare or alter `users`, `auth_sessions`, or `account_data`. It requires all three existing `public` tables and an integer `public.users.id` before creating the new schema, then adds foreign keys to `users`. Provision or restore the legacy authentication schema and preserve its data separately before applying this migration; no legacy account or session copy is included here.

The migration seeds the eight Northeast state rows and deterministic CareerBridge aliases for current static field, course, institution, pathway, examination, scholarship, and institution-offering identities. It does not seed catalogue revision content or backfill student rows. Saved/history backfill must resolve each legacy key through `catalog_item_aliases`, keep offering `courseId` as the context key (including the empty-string case), leave `account_data` intact during reconciliation, and switch reads/writes only after counts, contexts, timestamps, removals, and restored items match.

Handwritten migration SQL enforces the published-revision pointer/status relationship and immutability, exactly one correctly typed row per catalogue revision, catalogue relationship item types, source URL normalization, legacy alias type mapping, and Saved/History context-key consistency. `UNIQUE NULLS NOT DISTINCT` requires PostgreSQL 15 or later.

Admin review/publication event tables, `student_next_steps`, Clerk, AI/RAG/recommendation data, source-fetch scheduling, and catalogue content imports remain later-phase work. The initial migration has not been applied; do not treat successful Drizzle generation as validation against a database.
