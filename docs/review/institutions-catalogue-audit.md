# Institutions Catalogue Audit

**Audit date:** 20 November 2026
**Scope:** Read-only inspection of the current application, static data, Drizzle schema, and checked-in migrations. No application, data, or database changes were made.

## Important Neon verification limit

The current `.env.local` has `NEON_BRANCH=production`, while its pooled and unpooled database URL hosts match the Neon endpoint previously mapped by authenticated API inspection to the development branch. That earlier mapping is historical, not a fresh verification for this audit. No Neon API tool or local `neonctl` executable was available to reconcile the mismatch.

To avoid a possible production connection, no PostgreSQL connection or live SQL query was made. The database findings below describe the checked-in schema and migrations, **not verified live Neon tables, migration history, identities, or revision counts**. Confirm the current development branch using authenticated Neon metadata before any future database inspection.

## 1. Frontend routes and architecture

| Student-facing route | Implementation | Observed behavior |
|---|---|---|
| `/explore/institution-directory` | `src/app/explore/institution-directory/page.tsx`, `institution-directory.tsx` | General institution directory backed by local static profile data. Search matches institution, campus/location, and programme names. Filters cover state, district, institution type, and ownership; districts depend on selected state. Results sort A–Z and paginate 9 at a time. A filtered empty state offers filter clearing. |
| `/explore/institution-directory/[slug]` | `institution-directory/[slug]/page.tsx`, `institution-profile.tsx` | General profile route looks up `institutionProfilePages` by slug and calls `notFound()` when absent. Renders profile facts, programmes, admission notices, documents, financial support, campus details, and sources when present. Programme search and qualification filtering are local. |
| `/explore/institutions?course=<id>` | `src/app/explore/institutions/page.tsx`, `institutions-explorer.tsx` | Course-specific institution/campus listing. Reads `course`, `courseName`, `field`, `stage`, and filter/sort/page parameters. Without a course it asks students to choose one; broad exploration categories are not treated as specific programmes. It supports location search, state/district and conditional type/ownership filters, A–Z/Z–A sort, and pagination of 8. |
| `/explore/institutions/[slug]` | `institutions/[slug]/page.tsx`, `institutions/[slug]/profile.tsx` | Course-offering detail is resolved from the static offering array by slug. A supplied course ID must match the offering or the route calls `notFound()`. Return links preserve the course context and listing filters. |

Course-specific pages are distinct from the general directory. Course detail pages currently link to `/explore/institutions` and render only static offerings that are non-demo and have a source marked verified with a check date. Search/filter state is carried into offering detail and its return link.

### Loading, empty, error, and not-found behavior

- Both directory routes and course-specific listing/detail routes have loading skeletons.
- `/explore/institutions` has a generic `error.tsx` boundary with a retry action. The general directory has no route-specific error boundary; its current data path is synchronous and local.
- General directory filters show “No institutions match those filters.” Course-specific listing distinguishes missing course context from a course with no source-checked listings. Institution and offering details use the app-level `notFound()` UI.
- These are client/static-data behaviors today; they are not evidence of database loading or database error handling.

## 2. Current data inventory

Counts were computed from the current TypeScript data modules, not inferred from prior audit counts.

| Data set | Current count and status |
|---|---|
| `institutionRecords` | 21 identities: 2 non-demo records and 19 `isDemo` records. IDs and slugs are unique. |
| Campuses in those records | 21 total, one `main` campus per institution; no institution currently exercises a multiple-campus profile. City, district, and state are populated for all 21. One has a street address; two have a location source; none has coordinates or `directionsUrl`. No campus has a phone; one sample campus has an email. |
| `institutionProfiles` | 2 profile records: Kohima Science College, Jotsoma; and St. Edmund’s College. `institutionProfilePages` expands these with 19 fictional sample pages, for 21 rendered pages total. |
| Real-profile programmes | 6 recorded programme entries, 4 with course IDs (`ba`/`bsc`); zero satisfy the current verified-programme predicate. Kohima records 13 as a separately reported programme count and 4 entries; St. Edmund’s has 2 recorded entries. |
| `institutionCampusOfferings` | 19 records, all demo/sample and all for `bca`. IDs are `demo-01` through `demo-19`; their slugs match their institution IDs and all institution/campus/course references resolve in the local data. No duplicate institution-campus-course tuple was found. |
| Offering detail and sources | 2 of 19 have an `offering` details object; 17 do not. Three have `sources` entries, and `demo-01` also has a prospectus. The sample offering source URLs use `example.com`; other offering records often have no source. |
| Static course catalogue | 38 records; the institution data references only course IDs present in it. The public Courses route is now publication-driven, so static catalogue existence alone does not make those courses available. |

The 19 fictional institution names are: Eastern Hills College; Sample North Valley University; Sample Institute of Computing; Sample Hillside College; Sample Riverbend University; Sample Eastern Skills Institute; Sample Mountainview College; Sample Greenfield University; Sample Lakeside College; Sample Plateau Institute; Sample Cedar Grove College; Sample Sunrise University; Sample Blue Ridge Institute; Sample Pinecrest College; Sample Cloudpeak University; Sample Maple Leaf Institute; Sample Silver Stream College; Sample Orchid Valley University; and Sample Fernwood Institute.

### Content quality and provenance

- The two non-demo websites and six profile-level source links do not carry `checkedOn` or a source-level `verificationStatus`. Their presence does not verify claims.
- Kohima’s three structured facts and all six programme records are explicitly `unverified`; no programme is counted as verified. The profile’s “last reviewed” date is not a per-source checked date.
- Kohima has a description, introduction, facts, programmes, admission guidance, and documents, but no fees, admission notices, or scholarships. St. Edmund’s has two programme records and limited-information guidance, but no description/introduction, facts, admission section, documents, fees, notices, or scholarships.
- All 19 sample institutions are marked `isDemo`. The directory displays a fictional-samples notice and each sample card/profile is labeled fictional or unverified. The course-specific listing and detail likewise show explicit sample warnings.
- The sample offering’s `example.com` links, dates, fees, eligibility, and other values are placeholders. They are explicitly represented as sample data and must not be migrated as factual evidence.
- The local integrity test `src/app/explore/institution-directory/institution-data.test.mjs` passes identity, campus, and reference checks, but has one stale count assertion: it expects `institutionProfilePages.length === institutionProfiles.length` (21 versus 2) even though the page array deliberately appends 19 sample profiles. Current result: 3/4 tests pass. No test or institution module was changed.

## 3. Location and map behavior

- The general profile page embeds Google Maps and offers directions only when a campus has a street address. In the current data that is only Kohima; the other profiles show textual locations without a map pin.
- The course-specific offering detail uses an explicit `directionsUrl` or constructs a Google Maps search link from an address. No `directionsUrl` or latitude/longitude values are currently populated.
- The schema has a normalized `states` table and a campus `state_id` foreign key, but address, locality, city, and map-related values fit in `campus_content` JSONB. There are no coordinate columns.

## 4. Drizzle schema and migration findings

The checked-in journal lists three migrations: `0000_initial-schema`, `0001_unique_guided_explorer_answer`, and `0002_guided_explorer_operations`. Migrations 0001 and 0002 concern Guided Explorer, not Institutions. Migration 0000 defines the catalogue tables, states, source/provenance tables, and relationship constraints.

### Institution and campus model

- `catalog_items`: UUID identity, constrained `item_type` (includes `institution`, `campus`, and `course_offering`), timestamps, and nullable `published_revision_id`.
- `catalog_item_revisions`: revision number, title/summary/description, publication status, data classification, verification status, timestamps, and audit-user IDs.
- `institution_revisions`: one typed row per revision with `slug`, `initials`, `institution_type`, optional `ownership`, and `institution_content` JSONB. Checks constrain type/ownership and require a non-empty slug/initials and an object payload. Slug has an index, not a unique constraint.
- `campus_revisions`: one typed row per revision, `institution_item_id`, optional `state_id`, and `campus_content` JSONB. A trigger checks the parent identity is an institution item; the FKs constrain the parent and state references.
- Multiple campuses are represented as separate `campus` catalogue identities linked to an institution identity. This is structurally supported, though the current static data has only one campus per institution.

### Course-offering model and relationships

- `course_offering_revisions`: revision ID, course identity/revision pair, campus identity/revision pair, non-empty `slug`, and object-valued `offering_details` JSONB.
- Composite foreign keys require each referenced revision to belong to the supplied course/campus identity. A migration trigger checks the referenced item types are `course` and `campus`; another checks campus revisions reference institutions. Thus the intended course → offering → campus → institution relationship is represented and type-checked.
- Admission cycles, eligibility, duration, study mode, fees, and scholarships have no dedicated columns; they can be stored in offering JSONB. Their internal structure and claim-to-source mapping therefore require application-level validation/conventions.

### Publication, verification, aliases, and provenance

- Publication status (`draft`, `in_review`, `approved`, `published`, `archived`, `rejected`), data classification (`real`, `demo`, `test`), and verification status (`not_collected`, `unverified`, `pending_review`, `verified`, `partially_verified`, `disputed`, `unavailable`, `stale`, `expired`, `superseded`) are separate.
- `catalog_items.published_revision_id` has a deferred composite FK to a revision of the same item. A deferred trigger requires that revision’s publication status to be `published`; published revision and provenance content is guarded against update/delete.
- The pointer/status constraints do **not** make a record real or establish that its claims are verified. A reader must still filter classification and apply the intended claim-verification policy.
- `catalog_item_aliases` supports institution aliases and context-specific `institution-offering` aliases. The initial migration derives deterministic IDs for the seeded identity/alias set.
- `source_registry` stores source identity/type/category and URL metadata. `catalog_revision_sources` attaches sources to catalogue revisions using `claim_key`, `checked_at`, `verified_at`, and a separate verification status. This supports claim-level provenance, but the claim-key vocabulary and JSONB-to-claim mapping are application responsibilities.
- The initial migration seeds eight Northeast `states` and catalogue identity/alias rows for the 21 institutions and the institution-offering keys represented by the static dataset. It does not insert typed institution, campus, or offering revisions, and it does not seed campus identities. This is migration-file evidence only; live state is unverified.

## 5. Assessment and reliability requirements

The checked-in schema can represent general institution profiles, multiple campuses, course-specific campus offerings, course relationships, sources, and the admission/fee/eligibility content currently modeled in the frontend. **No schema migration is indicated by the code audit.** Confirm the deployed schema and actual rows on the verified development branch before implementation; do not infer them from migration definitions.

For student-facing integration:

1. Use a server-only reader that follows the identity’s published pointer, verifies that the revision belongs to the identity and is published, and requires `data_classification='real'`. Do not treat publication alone as verification.
2. Resolve a course offering only through its published offering revision and matching published course, campus, and institution revisions. Preserve the existing foreign-key/type checks, while enforcing each related record’s publication/classification at read time.
3. Keep sample/demo data out of ordinary routes. If retained for design review, isolate it behind an explicit development-only preview path and never silently fall back to it.
4. Keep claim-level verification distinct: a source URL or published profile is not proof. Display status/check dates for the claims they support and leave missing information absent or explicitly “not recorded.”
5. Validate JSONB contracts, unique route aliases/slugs, and campus/course relationships in application code. The schema checks JSON object shape but not every nested field or unique slug.

## 6. Gaps and risks

- Neither `src/db/institutions.ts` nor another institution database reader exists. Both institution experiences currently consume static TypeScript arrays; they do not enforce database publication state.
- The general profile programmes and all current course-offering records link to the static course catalogue. General profile links for `ba`/`bsc` can lead to the database-backed Courses route, where the corresponding record must also be published to resolve.
- The course-specific `bca` listing directly exposes the 19 sample offerings when addressed, although each is prominently identified as illustrative. The normal Courses detail page filters these demos out.
- The migration seeds aliases/identities but no campus identities or typed institution/campus/offering revisions. Do not interpret seeded aliases as live published content.
- Current `.env.local` branch metadata says production while the configured endpoint host matches the endpoint previously mapped to development. This audit did not resolve that mismatch or inspect live Neon.
- Source URLs and `lastReviewed` labels are uneven; most genuine profile claims remain unverified, and sample sources must not be mistaken for real provenance.
- The existing institution integrity test has the sample-profile count mismatch described above.

## 7. Recommended implementation phases

1. **Branch and data preflight:** reconcile `.env.local` branch metadata with authenticated Neon project/branch/endpoint metadata. Only then perform read-only checks of current migrations, identities, aliases, revisions, pointers, campuses, and provenance on development.
2. **Content/provenance mapping:** decide the canonical slug/alias scheme, map existing real profiles and campus facts to their source claims, and keep every unsupported claim unverified. Treat sample records separately.
3. **Server-only institution reader:** implement published real institution/profile and campus readers, then a course-offering reader that joins the required published course/campus/institution revisions and provenance. Reuse existing alias and publication patterns; do not create a migration unless live evidence shows a real schema gap.
4. **Route integration:** connect general directory/profile pages, then course-specific listing/detail pages, preserving search, filters, context, maps, and current empty/error/not-found states. Remove competing hardcoded student-facing institution content and do not add a demo fallback.
5. **Verification and publication:** test unpublished/demo exclusion, revisions/pointer ownership, aliases, multiple campuses, course/field contexts, source statuses, error/empty states, and route behavior against mocks/disposable PostgreSQL. Publish only source-reviewed real revisions after explicit content review.

## Recommendation

Proceed to an Institutions implementation phase only after confirming the development branch and inspecting its live catalogue state read-only. The existing schema is sufficient in principle; the main gaps are live-state verification, the absence of an institution reader, source/claim completeness, and separation of the 19 sample profiles/offerings from normal student-facing routes. No code, data, migration, or database changes were made for this audit.
