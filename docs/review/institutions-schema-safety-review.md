# Institutions Schema & Data Safety Review

**Review date:** 20 November 2026  
**Scope:** Focused review of catalogue identities/revisions, relationship constraints, publication/provenance safeguards, and the proposed institution/course-offering model. This review used checked-in schema, migrations, readers, and the Phase 1 audit only.

## Database environment safety

No Neon connection or SQL was used, as required. The Phase 1 audit recorded inconsistent local branch metadata and endpoint mapping. Before any future live database operation, freshly verify the Neon project, development branch, and endpoint using authenticated metadata; do not infer the active branch from `.env.local`, an earlier mapping, or the database URL alone.

The findings here describe the Drizzle schema and checked-in migration definitions. They do not confirm which migrations or catalogue rows currently exist in Neon.

## 1. Existing schema relationships

Catalogue identities and revision content are separated:

| Table | Role and relevant relationship |
|---|---|
| `catalog_items` | Stable UUID identity and `item_type`; types include `institution`, `campus`, `course`, and `course_offering`. `published_revision_id` points to a revision. |
| `catalog_item_aliases` | External/canonical keys with primary key `(source_system, external_type, external_key, external_context_key)`. The context may be non-empty only for `institution-offering`. A trigger checks CareerBridge alias types against the target item type. |
| `catalog_item_revisions` | Common revision metadata: revision number, publication status, data classification, verification status, and publication/audit timestamps. Revision number is unique per identity. |
| `institution_revisions` | Institution-level profile revision: slug, initials, institution type, ownership, and object-valued `institution_content` JSONB. It does not depend on a course. |
| `campus_revisions` | Campus-level revision: parent `institution_item_id`, optional normalized `state_id`, and object-valued `campus_content` JSONB. A trigger requires the parent to be an institution item. |
| `course_revisions` | General-course revision, including its field identity/revision and course-specific attributes. |
| `course_offering_revisions` | Offering revision, with course identity/revision, campus identity/revision, slug, and object-valued `offering_details` JSONB. |
| `states` | Normalized state identity referenced by `campus_revisions.state_id`. |
| `source_registry` / `catalog_revision_sources` | Reusable source metadata and revision-level provenance links keyed by `claim_key`, with checked/verified timestamps and relationship verification status. |

`course_offering_revisions` has composite foreign keys to `(catalog_item_id, revision_id)` for both the course and campus references. The migration’s `course_offering_revisions_item_type_check` trigger requires those identities to be `course` and `campus`. `campus_revisions_institution_type_check` checks that the campus belongs to an institution identity. This gives the path:

`institution identity → campus revision → course-offering revision ← course revision`

Each campus is a separate catalogue identity, so one institution can have multiple campuses. Each course-offering identity/revision can point to a campus and a course; the schema does not constrain a course or campus to a single offering.

The initial migration creates the typed tables and seeds legacy catalogue aliases/identities, but does not insert typed institution, campus, or offering revisions, or campus identities. This is migration-file evidence only; live state is unverified.

## 2. General profile and offering separation

The model has the right conceptual boundaries:

- General institution facts belong to `institution_revisions.institution_content`; they are not tied to a selected course.
- Location/contact/facility information belongs to an independent campus identity and `campus_revisions.campus_content`. A state can also use `state_id`.
- Course-wide information belongs to `course_revisions`.
- Campus-specific duration, eligibility, study mode, fees, and admission cycles belong to `course_offering_revisions.offering_details`, not the general institution profile or course revision.

The offering row references the exact course and campus revisions as well as their identities. The institution association is reached through the campus revision’s `institution_item_id`; there is no direct institution-revision reference on the offering. That is sufficient for the stated identity relationship and allows institution profile revisions to evolve independently.

### Multiplicity and offering identity

The relationships support:

- One institution identity → multiple campus identities.
- One campus/course pair → multiple distinct offering identities if needed.
- One course identity → offerings at multiple campuses/institutions.

There is **no unique constraint** on an institution slug, campus parent/name, course-campus pair, or `course_offering_revisions.slug`. This permits multiple/variant offerings, but does not prevent accidental duplicates. `catalog_item_aliases` can provide a unique canonical external key, but the importer/reader must keep that alias consistent with the typed revision and enforce route-slug uniqueness.

The initial migration’s contextual offering aliases use an institution slug plus course ID; they do not include a campus key. For the same course at multiple campuses of one institution, that key shape would collide. The alias table can represent a campus-qualified offering context, but the canonical key convention must be decided before imports—e.g. include the campus identity and, if applicable, a distinct programme/intake variant. This is an identity-contract issue, not a missing column.

## 3. Publication and verification safeguards

### What the database enforces

- Publication status (`draft`, `in_review`, `approved`, `published`, `archived`, `rejected`), classification (`real`, `demo`, `test`), and verification status are separate fields with separate allowed-value checks.
- `catalog_items_published_revision_fk` is a deferred composite FK tying the pointer to a revision of the same identity.
- The deferred `catalog_items_published_revision_status_check` trigger requires a non-null pointer to reference a revision whose status is `published`.
- Deferred typed-row checks require exactly one typed revision matching the catalogue item type.
- Relationship triggers validate the campus→institution, course→field, and offering→course/campus item types.
- Published revision content and its provenance are guarded against update/delete.

### What remains a reader/application responsibility

- The pointer trigger does not require `data_classification='real'` or a verified status. The schema therefore does not prevent a demo/test revision from being published; a normal reader must explicitly require both the matching published pointer/status and `data_classification='real'`.
- Draft/unpublished revisions can exist without being pointed to. A reader must follow the identity’s pointer and require `publication_status='published'`; selecting the latest revision or a published-status row without checking the pointer is insufficient.
- No institution reader exists yet. The existing Fields and Courses readers use published/real predicates; the future Institutions reader must apply the same restrictions to institution, campus, and offering records and to the referenced course revisions.
- Publication does not assert that every fact is verified. A published real profile may contain unverified claims. Claim-level verification should remain visible and should not be inferred from a linked source.
- `catalog_revision_sources` can associate a source with a claim key and record `checked_at`, `verified_at`, and verification status. These fields are nullable and the schema does not require a checked/verified date when a status says `verified`; readers/content validation must apply the chosen evidence policy.
- JSONB constraints require an object, not a valid nested shape. Missing offering details should remain absent; unverified values must be labelled or withheld rather than presented as confirmed.

The Phase 1 audit found the existing static institution-offering records are demo-only and that the two real institution profiles have no verified programme entries. These local-data findings are not live Neon evidence. The current static institution routes are not database readers, so database publication controls do not govern their content yet; demo labels do not substitute for reader-side filtering in a future integration.

## 4. Gaps and migration assessment

### Concrete integration contracts to define

1. **Campus-qualified offering aliases:** extend the alias context convention to distinguish campus-level offerings (and any real programme/intake variants). Current seeded institution+course contexts do not distinguish campuses.
2. **Slug/identity agreement:** `institution_revisions.slug` has a non-unique index, while `course_offering_revisions.slug` is only checked for non-empty text. Resolve routes through canonical aliases or enforce unique, stable route slugs in the reader/import process; validate that alias and typed slug agree.
3. **Duplicate offering policy:** no unique constraint prevents duplicate offering identities for the same course/campus. Decide whether this is valid for variants/intakes before adding any uniqueness rule; do not assume one row per pair.
4. **Nested content/provenance convention:** define the JSONB keys and claim-key mapping for admission, eligibility, fees, duration, and study mode. The schema supports these values and provenance without a new table, but does not validate their nested semantics.
5. **Public reader policy:** enforce publication pointer ownership, `published` status, and `real` classification across all joined identities/revisions. Define how to display unverified or missing individual claims without blocking otherwise useful profile guidance.

**Migration recommendation: no migration is currently justified.** The existing identities, revision tables, typed relations, JSONB payloads, and provenance links can represent the stated requirements. The identified issues can be handled by defining identity/alias and JSONB contracts and implementing a strict reader. Reconsider schema changes only if live development data or a concrete content requirement proves one of these contracts cannot be represented safely.

## 5. Recommended next implementation phase

1. Resolve the development-branch metadata mismatch and perform the separately authorized, read-only live preflight only after the active development branch is freshly verified.
2. Inventory existing institution/campus/offering identities, aliases, revisions, pointers, and source links on that branch. Reuse existing identities; do not infer live counts from migration seeds.
3. Agree on campus/offering identity granularity and canonical alias/route keys, including how one course offered at multiple campuses is distinguished.
4. Implement a server-only Institutions reader. Require published pointers and real classifications for the institution, campus, offering, and referenced course; preserve claim-specific provenance and missing/unverified state.
5. Add reader tests for demo/test/draft exclusion, pointer ownership, wrong item types, multiple campuses, repeated courses across campuses, duplicate alias/slug handling, and missing/unverified offering facts before connecting routes.

## 6. Decisions requiring clarification

- Should one offering identity represent a single course at one campus, or may it cover multiple intakes/program variants? This determines the campus/context alias key and duplicate policy.
- May a real institution profile be published when some facts remain unverified, provided each claim is labelled accurately? A reasonable default is yes for general guidance, while requiring explicit evidence before any offering claim is presented as verified.
- Which offering facts are required for a listing to appear, versus optional and shown as “not available” (for example fees, duration, and admission dates)?

No schema edits, migrations, database connections, SQL, imports, publication, or production access were performed for this review.
