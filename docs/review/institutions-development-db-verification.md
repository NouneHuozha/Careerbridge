# Institutions Development Database Verification

**Date:** 20 November 2026  
**Outcome: VERIFIED — the development target was confirmed and inspected read-only.**

## 1. Target verification

Authenticated Neon CLI checks succeeded:

- `neon me` exited successfully.
- `neon projects list` in the authenticated organization confirmed **Careerbridge**, project ID `calm-brook-21165945`.
- `neon branches list --project-id calm-brook-21165945` showed the **current** `development` branch, ID `br-wandering-flower-a1f6ys66`, status `ready`.

Safe local metadata also agrees:

| Source | Verified metadata |
|---|---|
| `.env.local` | Project `calm-brook-21165945`; branch `development`; branch ID `br-wandering-flower-a1f6ys66` |
| `.neon` | Project `calm-brook-21165945`; branch `development` |
| `DATABASE_URL` | Pooled host `ep-divine-fog-a1uxos5z-pooler.ap-southeast-1.aws.neon.tech` |
| `DATABASE_URL_UNPOOLED` | Direct host `ep-divine-fog-a1uxos5z.ap-southeast-1.aws.neon.tech` |
| `drizzle.config.ts` | Uses `DATABASE_URL_UNPOOLED` for Drizzle; does not itself verify branch identity. |

Both configured hosts match the development endpoint hostnames confirmed by Neon Console. The PostgreSQL session used only the configured direct endpoint. No connection was made to production or backup.

## 2. Database identity and inspection method

- Database: `neondb`
- PostgreSQL: `18.7 (84da7d8)`
- Driver: the project uses `pg` (`Pool`); the direct endpoint was loaded from the project environment after validating the expected project, branch, branch ID, and hostname.
- Each inspection transaction began with `BEGIN READ ONLY`, set a transaction-local statement timeout, checked `transaction_read_only = on`, ran SELECTs, and ended with `ROLLBACK`.

No complete connection strings, credentials, personal information, or individual catalogue content are included here.

## 3. Applied migration history

The database contains `drizzle.__drizzle_migrations`. Its three applied rows match the checked-in journal entries and SQL file hashes:

| DB migration ID | Repository migration | Applied at (UTC) | SQL file hash matches |
|---:|---|---|---|
| 1 | `0000_initial-schema` | 2026-11-15 12:33:39.497 | Yes |
| 2 | `0001_unique_guided_explorer_answer` | 2026-11-18 04:41:50.310 | Yes |
| 3 | `0002_guided_explorer_operations` | 2026-11-19 04:41:50.000 | Yes |

These correspond to `drizzle/0000_initial-schema.sql`, `drizzle/0001_unique_guided_explorer_answer.sql`, and `drizzle/0002_guided_explorer_operations.sql`.

## 4. Actual catalogue counts

### Identities

| Item type | Identity count |
|---|---:|
| `institution` | 21 |
| `campus` | 0 |
| `course_offering` | 44 |
| `course` | 38 |
| `field` | 13 |
| `examination` | 7 |
| `pathway` | 11 |
| `scholarship` | 6 |

### Revisions and typed rows

| Item type | Publication status | Classification | Verification status | Revisions |
|---|---|---|---|---:|
| `course` | `draft` | `demo` | `unverified` | 38 |
| `field` | `draft` | `real` | `pending_review` | 13 |
| `field` | `published` | `real` | `pending_review` | 13 |
| `institution`, `campus`, `course_offering` | — | — | — | 0 |

Typed revision counts are 38 `course_revisions`, 26 `field_revisions`, 0 `institution_revisions`, 0 `campus_revisions`, and 0 `course_offering_revisions`.

### Published pointers

- All 13 field identities have a pointer. Each resolves to a revision owned by that identity, with `publication_status='published'`, `data_classification='real'`, and a matching typed field row.
- No course, institution, campus, or course-offering identity has a published pointer.
- Across checked identities, there were no dangling pointer targets, wrong-owner pointers, pointers to unpublished/non-real revisions, or pointers missing their typed row.

Thus, this database currently has no published institution or course-offering content. The 38 course revisions remain unpublished demo drafts.

## 5. Provenance, aliases, and relationship integrity

### Provenance

- `source_registry` contains 20 source records.
- `catalog_revision_sources` has 0 links for institutions, campuses, and course offerings.
- No dangling revision or source references were found in the provenance table.

### Institution-offering aliases

- 44 `institution-offering` aliases link to 44 distinct `course_offering` identities; none link to the wrong item type.
- 21 aliases have an empty `external_context_key`; 23 have a non-empty context.
- No duplicate complete alias key was found. The live primary key is `(source_system, external_type, external_key, external_context_key)`.
- **Campus collision analysis is inconclusive:** there are no campus identities and no typed course-offering revisions, so no alias can be joined to an actual course/campus relationship. The zero relationship-path/collision counts reflect this absence of data, not proof that future multi-campus keys are collision-free. The 21 empty contexts are not demonstrably campus-qualified; the non-empty contexts cannot be assessed semantically without typed relationships.

The live database has validated foreign keys for the published pointer, campus parent identity, course/campus revision references, and source links. The `catalog_items_published_revision_status_check`, typed-row checks, alias type check, campus institution-type check, and course-offering item-type check triggers are enabled. The read-only relationship checks found 0 invalid institution typed rows, 0 campus/parent mismatches, and 0 offering/course/campus/parent mismatches; the latter checks had no typed rows to evaluate.

## 6. Differences from the earlier code audit

The Phase 1 audit’s 21 institution records, 21 campuses, and 19 demo BCA offerings describe local source/demo data, not live Neon rows. In development:

- The institution identity count is also 21, but there are no typed institution revisions.
- There are 0 campus identities; the 21 static campus records are not present as database identities.
- There are 44 offering identities rather than 19 static demo BCA entries, but none has a typed offering revision.
- The 38 demo course revisions are present as draft/unverified records, consistent with the previously reported course import.

The Phase 2A schema review described supported schema relationships; this inspection confirms the corresponding live tables, validated foreign keys, and enabled triggers, but found no institution/campus/offering revision data exercising those relationships.

## 7. Blockers and unresolved issues

1. Institution and campus profiles have not been imported: the 21 institution identities have no revisions and there are no campus identities.
2. The 44 offering identities have no typed offering revisions or provenance links.
3. Before any offering import, define/verify campus-qualified alias contexts. Existing empty contexts and absent typed relationships prevent confirming that aliases distinguish the same course at multiple campuses.
4. The `pg` driver emitted an upstream warning about future `sslmode` interpretation changes in a future major version. The current connection succeeded; no configuration was changed. Review separately before a major `pg` upgrade.

## 8. Safety confirmation

This was a read-only inspection of the verified development branch. Queries ran in PostgreSQL read-only transactions and each transaction was rolled back. No INSERT, UPDATE, DELETE, DDL, migration, import, seed, branch operation, production access, or backup-branch connection occurred. No database records, schema, or configuration were changed.
