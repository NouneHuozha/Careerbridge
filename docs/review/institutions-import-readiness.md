# Institutions Import Readiness and Data Mapping

## Scope and evidence

This is a repository-only audit of current institution-related data and its fit with the existing catalogue schema. It does not implement an importer, connect to a database, or change data.

Repository facts below were checked against the current source modules, schema, migration, and existing reports:

- [Institutions catalogue audit](./institutions-catalogue-audit.md)
- [Institutions schema safety review](./institutions-schema-safety-review.md)
- [Institutions development database verification](./institutions-development-db-verification.md)

Live development database counts below are quoted from the Phase 2C report; they were not re-queried for this audit. No production or database access was performed.

## Source-data inventory and current consumers

| Source | Current contents | Consumption |
|---|---|---|
| `src/app/explore/institution-directory/institution-registry.ts` | 21 institution records, each with a nested campus; 2 non-demo candidates and 19 explicitly marked demo. Registry identity IDs equal their slugs. | Imported by profile and offering data modules; supplies institution/campus names and baseline location/contact data. |
| `src/app/explore/institution-directory/institution-profile-data.ts` | 2 authored profiles, 6 programme entries, and 21 profile pages after generating 19 demo pages from the registry. | General directory, institution detail, history, and saved-item resolution use the generated profile-page collection. |
| `src/app/explore/institutions/institution-data.ts` | 19 offering records (`demo-01`–`demo-19`), all demo and all for course ID `bca`. The records resolve locally to institution/campus and course references. | Course-specific institution explorer and institution detail; course detail only admits non-demo offerings with a verified source and checked date. |
| Course catalogue data (`src/app/explore/courses/catalog/`) | 38 course records. Institution data references `bca`, `ba`, and `bsc`; all three IDs resolve in the local catalogue. | Provides course context. It is not evidence that a specific institution/campus offers a course. |
| `drizzle/0000_initial-schema.sql` | Seeds catalogue identities and aliases, including institution and legacy/contextual offering aliases; also seeds the eight supported Northeast state identities. | Database bootstrap and compatibility identifiers; not an institution importer. |
| `src/db/schema/catalog.ts` | Defines identities, revisions, institution/campus/offering typed revisions, aliases, source registry, and revision-source links. | Database model. |
| `src/app/explore/institution-directory/institution-data.test.mjs` | Checks registry/profile/offering uniqueness and references. | Focused static data validation. |
| `scripts/` | No institution-specific import or seed script was found. Existing course/field scripts are separate and do not import these institution records. | No current institution import path. |

General institution routes consume static profile data through the institution directory and `[slug]` detail route. Course-specific institution listings consume the static offering resolver. History and saved-item routes also resolve institution records from these static collections. Replacing these data sources therefore requires updating their readers as well as importing catalogue rows; this report does not propose or implement that integration.

### Current record counts and quality

| Dataset | Count and observed state |
|---|---|
| Institution registry identities | 21: 2 non-demo candidates (`kohima-science-college-jotsoma`, `st-edmunds-college-shillong`) and 19 demo records. IDs/slugs are unique and identical; no duplicate normalized institution names were found. |
| Nested campus records | 21, one per registry institution. Every campus ID is `main`, so the campus ID is only unique within its parent. All have name, city, district, and state. Two have locality, one has an address, two have location-source objects, one has email, and none has phone, facilities, or directions URL. |
| Authored general profiles | 2. |
| Generated profile pages | 21 total: the 2 authored profiles plus 19 generated demo pages. The data test still asserts that the authored-profile and generated-page counts are equal; that assertion fails (`21 !== 2`). The focused test result recorded for this audit is 3 passed, 1 failed. No source or test was changed. |
| Programme entries | 6 across the authored profiles; all are unverified. Four reference local course IDs (`ba`/`bsc`); two have no course ID. None identifies a campus, so these references alone are not campus-specific offerings. |
| Reported programme count | Kohima reports 13 programmes while its profile lists 4. These may describe different scopes; preserve the aggregate statement separately and do not invent the nine missing entries. |
| Institution-specific offerings | 19, all demo BCA examples. Three have source arrays, two have offering-detail objects, and one has a prospectus entry. Every source URL in these demo offering records uses `example.com`; these are illustrative, not evidence. |
| Profile source objects | 19 occurrences across 6 unique URLs. None has a `checkedOn` value or source-level verification status. A profile `lastReviewed` value is not a per-claim source check. |
| Registry source objects | 8 occurrences across 5 unique URLs. Four have `checkedOn` values; the checked records are sample/demo content. A URL or a check date by itself does not establish that each associated claim is verified. |

The test assertion failure is an audit finding, not a proposed test fix. The correct distinction in the data is 2 authored profiles versus 21 generated pages.

### Existing development database snapshot

The Phase 2C verification report records 21 institution identities, 0 campus identities, 44 institution-offering identities, and 0 typed institution, campus, or offering revisions. It records 44 offering aliases: 21 with empty context keys and 23 with non-empty context keys. The migration history and hashes matched the repository at that time.

The migration seeds 21 institution aliases and offering aliases for 21 contextless legacy keys plus 23 institution/course pairs (19 demo BCA references and 4 BA/BSc profile references). Those counts match the reported aggregate counts, but this audit did not inspect the live alias rows, UUID mappings, or current database.

## Data-to-schema mapping

The schema separates catalogue identity (`catalog_items`) from revisioned, publishable content (`catalog_item_revisions` plus one typed revision table). Stable identity must be resolved through `catalog_item_aliases`; do not assume a TypeScript slug is a database UUID.

### Institution identity and revision

| Source value | Schema destination / mapping |
|---|---|
| `InstitutionRecord.id` (currently equal to `slug`) | Resolve/create an `institution` identity with alias tuple `source_system='careerbridge'`, `external_type='institution'`, `external_key=InstitutionRecord.id`, and empty context. The migration uses deterministic UUIDs derived from alias tuples; importer code should resolve the alias rather than independently reproduce that UUID algorithm. |
| `name` | `catalog_item_revisions.title`. |
| `slug`, `initials`, `type`, `ownership` | `institution_revisions.slug`, `initials`, `institution_type`, `ownership`. The schema accepts the current type/ownership vocabularies; ownership is nullable. |
| `introduction`, `description` | Common revision `summary`/`description`, preserving their separate meaning. |
| Website, facts, admissions, documents, notices, fees, scholarships, related scholarships, programme summaries, reported programme counts, and other institution-level content | `institution_revisions.institution_content` JSON object, retaining field scope and source references. Do not move campus- or course-specific details into the general profile. |
| `isDemo` | Not a schema column. Set the revision's `data_classification` explicitly from reviewed source data; never infer `real` from a missing `isDemo` property. |

The two authored profiles are candidates for real institution records, not verified claims. The profile's source list and aggregate programme count do not establish that each fact, ownership value, or programme is current.

### Campus identity and revision

| Source value | Schema destination / mapping |
|---|---|
| Parent institution ID plus campus ID | Resolve/create a `campus` identity with a stable parent-qualified alias key (for example, `external_type='campus'`, `external_key='<institution-id>/<campus-id>'`, empty context). This campus alias shape is a recommendation, not an existing seeded alias. Campus aliases must use an empty context key because the schema permits non-empty context only for `institution-offering`. The current repeated `main` IDs must not be used alone as globally unique keys. |
| Parent institution | `campus_revisions.institution_item_id` references the institution identity, not its revision. |
| State | Resolve the exact state identity from `states` (country code `IN`) and set `campus_revisions.state_id`; the current schema has the eight Northeast state identities. Do not derive or invent state UUIDs in importer code. |
| Campus name, locality, city, district, address, directions, contact details, facilities, and location-source data | `campus_revisions.campus_content` JSON object, with claim-level source links for sourced facts. Keep institution-level content separate. |
| Registry's nested `campuses` and profile-page composite | Split into institution and campus identities/revisions during mapping; these are combined in the frontend source shape, not one database entity. |

The schema supports multiple campuses per institution. The current static dataset has only one campus per institution, and 19 of those locations are explicitly fictional demo data.

### Course-offering identity and revision

| Source value | Schema destination / mapping |
|---|---|
| Institution, campus, and course | Offering revision must reference exact `course_item_id` + `course_revision_id` and `campus_item_id` + `campus_revision_id`. Course and campus revision pairs are constrained to their corresponding catalogue identities. |
| Offering identity | `catalog_items.item_type = 'course_offering'`; resolve/create its alias before writing a revision. The migration's legacy contextless aliases are compatibility identities, not sufficient evidence of a particular course/campus offering. |
| `courseId` | Resolve the existing course alias and exact revision. Local existence of `bca`, `ba`, or `bsc` is not enough to establish an appropriate real or published revision. |
| Offering slug and offering-specific description, study mode, duration, eligibility, fees, admission cycle, prospectus, and other offering details | `course_offering_revisions.slug` and `offering_details` JSON object. Preserve only fields actually present; do not treat absent details as zero, false, or verified. |
| `institution-offering` alias | Existing tuple convention is `source_system='careerbridge'`, `external_type='institution-offering'`, `external_key=<institution-slug>`, with empty context for legacy keys and `<course-id>` for seeded course contexts. Preserve those aliases. For new campus-specific mappings, include both course and campus identity in `external_context_key`, for example `<course-id>/<campus-id>`. If one course is offered at multiple campuses, each campus-specific offering needs its own identity. Do not overwrite or reuse a contextless legacy alias as a current offering key. |

The migration's 23 non-empty offering contexts are course-only, not campus-qualified. The aggregate live counts do not prove row-level key mappings. An authorized importer design should first resolve existing aliases and decide how to add campus-qualified aliases without changing legacy behavior.

## Source attribution and verification

`source_registry` stores source-level identity and classification fields such as source name, authority, canonical URL, category, source type, data types, and active/paused/retired status. `catalog_revision_sources` attaches a source to a specific revision and `claim_key`, with checked and verified timestamps and a verification status. Source links should be claim-specific (for example, institution ownership, campus location, or offering eligibility), not just attached to an entire institution page.

Current static `InformationSource` objects do not provide enough reviewed metadata to populate the source registry safely. In particular:

- No authored-profile source has a checked date or verification status.
- The demo offering URLs are examples, not evidence.
- The repository's `VerificationStatus` type includes `outdated`; database revision/source checks use `stale` and `expired` instead. No blind status mapping should be added. If an `outdated` value is ever imported, its intended meaning must be reviewed and mapped explicitly.
- A `checkedOn` date should map to `checked_at` only after confirming the source was actually checked. `verified_at` should be set only when the relevant claim has been verified.
- Source registry category and source type are required by the schema and cannot be inferred safely from a display label or URL alone.

Publication and factual verification are independent. `published` does not mean `verified`; missing or unverified details must remain visibly unconfirmed and must not be promoted into verified student-facing facts.

## Classification recommendations

`data_classification` supports `real`, `demo`, and `test`. `pending_review` is a `verification_status`, not a classification. Publication status is separate and supports `draft`, `in_review`, `approved`, `published`, `archived`, and `rejected`.

| Dataset | Classification recommendation | Publication / verification recommendation |
|---|---|---|
| 19 registry demo institutions, generated demo profiles, their fictional campuses, and 19 demo BCA offerings | `demo` | `draft` + `unverified`; no published pointer. Retain the demo label end-to-end. |
| Kohima and St. Edmund's institution/profile candidates | Do not classify their revisions as `real` until the entity and each imported claim are backed by reviewed sources. After that gate, `real` is appropriate. | Keep `draft` and `pending_review` until claim review and publication approval; do not set `verified` from profile presence or a URL. St. Edmund's ownership is missing and should remain absent. |
| Six authored programme entries | Only classify as `real` after a source is reviewed for each claim; otherwise defer rather than imply verified offerings. | `draft` + `pending_review` when staged with evidence; claims remain unverified until individually checked. Do not create two course offerings for entries lacking a course ID, and do not infer a campus. |
| Profile counts, campus contacts/locations, and other statements | Apply the same claim-level source gate as the parent profile; do not inherit `real` merely from a non-demo parent. | Keep missing facts absent; use `pending_review` or `unverified` as supported by actual review state. |
| Test fixtures, if added in a future test-only workflow | `test` | Never publish or expose in student-facing readers. No current institution dataset was identified as a test fixture. |

Do not treat “not marked demo” as proof of `real`. Public readers must filter both `publication_status = 'published'` and `data_classification = 'real'`, then present claim verification/missing-source state accurately.

## Data-quality issues and import blockers

1. **Authored profile versus generated page count:** 2 authored profiles expand to 21 pages; a focused test still asserts equal counts and fails. This is a stale test expectation, but it does not change the observed data counts.
2. **No campus identities or typed revisions in the verified database snapshot:** all 21 source campuses are unmapped to existing campus identities. The current development snapshot has 0 typed institution/campus/offering revisions.
3. **Repeated campus IDs:** all source campus IDs are `main`; identity keys must include the parent institution.
4. **Institution/campus shape is combined in static source:** the nested campus data and generated profile pages need a deliberate split into their separate database models.
5. **Programme references are incomplete:** two of six entries lack course IDs; none identifies a campus. Four local BA/BSc references are not proof of institution offerings.
6. **Programme count scope is unclear:** Kohima's reported count of 13 differs from the 4 listed entries. Preserve the sourced count separately until its scope and date are resolved.
7. **Weak or absent provenance:** authored profile sources have no checked dates/status, demo offer sources use `example.com`, and the audited database snapshot had no institution/campus/offering revision-source links.
8. **Current course revisions are not suitable evidence for real offerings:** the earlier development verification recorded 38 course revisions as demo/draft/unverified and no published course pointers. A real public offering must wait for an exact eligible real course revision and an exact campus revision. Their revision UUIDs were not inspected here.
9. **Alias compatibility and campus collisions:** 21 empty-context offering aliases and 23 course-only contexts exist in the migration/database snapshot. The current keys cannot distinguish the same course at multiple campuses. Preserve them and introduce campus-qualified aliases through a reviewed compatibility plan.
10. **Frontend status vocabulary mismatch:** `outdated` in the static type does not match the database's `stale`/`expired` values. Any future import mapping needs an explicit semantic decision.
11. **Live row-level alias/source state remains unverified here:** Phase 2C supplies aggregate counts only. This task did not inspect exact alias tuples, source-registry URL matches, or UUID relationships.

## Safe import dependency order

This is a dependency order for a future, separately approved importer; no step was executed here.

1. **Institution identities:** resolve existing institution aliases first; reuse the 21 known identities where the exact alias matches. Do not create duplicate identity rows from slugs.
2. **Institution revisions:** create only after source review and classification. Keep draft and verification status distinct from publication.
3. **Campus identities:** create/resolve parent-qualified campus aliases. Existing database snapshot has none.
4. **Campus revisions:** require the institution identity, validated parent relationship, resolved state (when known), and sourced campus claims.
5. **Course identity/revision references:** resolve the exact course identity and revision before creating an offering. Do not use a demo/draft course revision to represent a real public offering.
6. **Offering identities:** resolve existing legacy aliases without repurposing them; create campus-qualified identities/aliases for confirmed institution-course-campus combinations.
7. **Offering revisions:** require exact course and campus identity/revision pairs. Keep duration, mode, fees, eligibility, and admission details on the offering revision.
8. **Aliases and provenance:** preserve legacy aliases, add reviewed campus-specific aliases, and attach source-registry records to claim keys with checked/verified timestamps only when warranted.

## Recommendation

**NOT READY** for data import. The existing schema can represent the required hierarchy, so no schema change is indicated by this audit. However, the current source data does not yet support safe real offering imports: programme/course and campus relationships are incomplete, claims lack adequate checked provenance, development course revisions are demo/draft/unverified, and offering aliases do not include campus identity.

Importer design/planning may proceed using this mapping, with explicit gates for alias resolution, exact course/campus revision IDs, source review, and demo isolation. Actual import and publication should wait until those blockers are resolved.

## Actions not performed

- No source code, tests, configuration, or database records were modified.
- No database connection, SQL, migration, seed, import, publication, production access, commit, or push was performed.
