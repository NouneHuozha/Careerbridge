# Institutions Import & Reader Design

**Status:** Design baseline; the draft importer and authenticated review support are implemented. No real institution import or publication has been performed.
**Scope:** Repository data mapping, catalogue import lifecycle, server-side readers, and frontend migration.

## Evidence and confidence

This design uses the current TypeScript data and Drizzle schema, plus the requested reviews:

- [Institutions catalogue audit](./institutions-catalogue-audit.md)
- [Institutions schema safety review](./institutions-schema-safety-review.md)
- [Institutions development database verification](./institutions-development-db-verification.md)
- [Institutions import readiness](./institutions-import-readiness.md)
- [Independent import-readiness review](./institutions-import-readiness-independent-review.md)

Evidence labels:

- **Verified in repository:** inspected current source, migration, or schema definitions.
- **Reported development snapshot:** recorded by the read-only database report dated 20 November 2026; not re-queried for this design.
- **Recommendation:** proposed implementation contract, not current behavior.
- **Assumption / decision:** requires confirmation before implementation where indicated.

No Neon connection or SQL was used for this design.

## Current architecture and verified facts

### Implemented import and review workflow

- `scripts/import-institution-catalogue-draft.mjs` imports one institution, campus, or course-offering record per invocation: `node scripts/import-institution-catalogue-draft.mjs [--preview] <one-record.json>`. `--preview` runs read-only and reports identity/revision/source actions; normal execution is restricted to the verified Neon development endpoint and creates draft revisions only.
- Identity aliases are resolved exactly inside a transaction. Conflicting alias targets fail; existing aliases are retained. The canonical campus alias is parent-qualified as `<institution-id>--<campus-id>`. A course offering uses its own stable ID as the alias key and the canonical course ID as context; compatible legacy institution-key aliases remain intact.
- Real offerings require exact current published real course and campus revisions and a published real parent institution. The importer hashes normalized persisted content, reuses unchanged revisions, and refuses to overwrite an unresolved non-published revision.
- The authenticated `src/app/api/admin/catalogue/lifecycle/route.ts` and its existing lifecycle helpers now support institution, campus, and course-offering draft retrieval, submission, source association, claim review, approval, rejection, and guarded publication using the same admin authorization and revision safeguards.
- No institution/campus/offering payload has been imported into Neon, and no schema migration or real-database write was made. Integration tests use only a temporary disposable PostgreSQL container. The static source data and public readers remain unchanged.

### Source and route architecture

- `src/app/explore/institution-directory/institution-registry.ts` contains 21 institution records: 2 non-demo candidates and 19 explicitly marked demo. Each record currently embeds one campus, whose ID is `main`.
- `src/app/explore/institution-directory/institution-profile-data.ts` contains 2 authored profiles and builds 21 profile pages by adding 19 demo pages. It has 6 programme entries; 4 include a local course ID and 2 do not.
- `src/app/explore/institutions/institution-data.ts` contains 19 demo BCA offerings. They are static sample records, not evidence that real institutions offer BCA.
- The directory and detail routes are general institution profiles. The `/explore/institutions` listing and offering detail route are course-specific. They currently consume static TypeScript data.
- Other static consumers include `src/app/explore/courses/catalog/[courseId]/page.tsx`, `src/app/explore/history/history-resolver.ts`, and `src/app/explore/saved/saved-items-page.tsx`.
- There is no `src/db/institutions.ts` reader. Existing `src/db/courses.ts` and `src/db/fields.ts` are server-only published-reader patterns; Courses also has a separately guarded development demo reader.
- The current offering detail route resolves by a slug that can equal the institution slug, with course context in query parameters. This is ambiguous for multiple courses or campuses.
- The static institution registry has 8 URL declarations, all distinct: 4 institutional URLs and 4 sample URLs. The earlier readiness report's count of 5 unique URLs is inconsistent with the current source; the independent review's count of 8 is confirmed by the registry. This count does not establish evidence quality.

### Existing schema and migration

`src/db/schema/catalog.ts` and `drizzle/0000_initial-schema.sql` define:

- `catalog_items` stable UUID identities and item types, with a nullable published-revision pointer.
- `catalog_item_aliases` keyed by `(source_system, external_type, external_key, external_context_key)`. For CareerBridge aliases, a trigger validates alias external type against the target catalogue item type. Non-empty context is allowed only for `institution-offering`.
- `catalog_item_revisions` common title/summary/description and distinct `publication_status`, `data_classification`, and `verification_status` fields.
- Typed `institution_revisions`, `campus_revisions`, and `course_offering_revisions`; campus and offering payloads use JSONB objects.
- Composite foreign keys and triggers that check typed relationships, including campus-to-institution and offering-to-course/campus item types. Offerings reference exact course and campus identity/revision pairs.
- `source_registry` and `catalog_revision_sources` for source metadata and claim-key provenance.
- Deferred published-pointer checks and immutability triggers for published revision and typed content. Published content is changed by creating another revision, not by updating the published rows.

The migration seeds deterministic identity UUIDs from the full alias tuple using an MD5 formula. The importer must resolve existing aliases, not reproduce this formula to guess IDs. New identities can use the database UUID default and become deterministic to future runs through their canonical alias.

### Development database snapshot (historical)

The 20 November 2026 read-only report recorded 21 institution identities, 0 campus identities, 44 course-offering identities, and 0 typed institution/campus/offering revisions. The 44 offering aliases consisted of 21 empty-context aliases and 23 course-only contexts. It also recorded 38 course revisions as draft/demo/unverified with no published course pointers.

These are **reported snapshot facts, not a current database preflight**. Implementation must freshly verify the authorized development target and re-inventory live aliases, identities, revisions, pointers, and provenance before any write. The counts do not prove the semantic mapping of each alias.

## Proposed data flow and entity relationships

Keep the domain boundaries:

```text
Institution identity
  ├─ published institution revision (general profile, independent of course)
  └─ Campus identity
       └─ published campus revision (parent institution identity, location)
            └─ Course-offering identity
                 └─ published offering revision
                      ├─ exact course identity + course revision
                      └─ exact campus identity + campus revision
```

An offering belongs to an institution through the campus revision's `institution_item_id`. Do not duplicate institution profile or campus claims into the general course revision. Duration, eligibility, fees, study mode, and admission-cycle facts stay on the offering revision.

Flow:

1. Validate source records and construct a normalized, reviewable import plan.
2. Resolve identities by exact canonical alias tuple; reuse existing seeded identities.
3. Create or resolve institution and campus revisions independently of offering details.
4. Resolve exact eligible course revisions from the catalogue.
5. Create or resolve campus-specific offering identities and revisions.
6. Attach claim-level provenance and any additional aliases without changing pre-existing alias targets.
7. Leave all imported revisions unpublished. A separate review/publication operation promotes an approved revision and updates its identity pointer.
8. Server-only readers expose only the current, fully eligible published graph. No static/demo fallback is used by public routes.

## Identity and alias migration strategy

### Canonical identity resolution

**Recommendation:** The exact alias tuple is the stable identity-resolution contract:

| Entity | Canonical CareerBridge alias |
|---|---|
| Institution | `source_system='careerbridge'`, `external_type='institution'`, `external_key=<stable institution ID>`, empty context. |
| Campus | `source_system='careerbridge'`, `external_type='campus'`, `external_key=<institution ID>--<campus ID>`, empty context. Parent-qualifying the key avoids collisions when campus IDs such as `main` repeat across institutions. |
| Course offering | `source_system='careerbridge'`, `external_type='institution-offering'`, `external_key=<stable offering ID>`, `external_context_key=<canonical course ID>`. Legacy institution-key aliases are retained only with empty or matching course-ID context. |

For institution IDs, the existing migration already seeds the exact institution alias convention. Campus aliases are not seeded; the parent-qualified convention is now enforced by import validation.

For new identities, create the catalogue row and canonical alias in the same transaction. The database-generated UUID is not the idempotency key; the canonical alias is. An exact alias match must resolve to one catalogue item of the expected type. If it resolves to another type or a conflicting item, abort with an explicit identity conflict.

### Existing offering aliases: do not switch formats blindly

**Verified:** The migration creates 21 contextless `institution-offering` identities and 23 contextual identities keyed by institution plus course ID. The reported development snapshot has the same aggregate alias counts. Existing alias rows and targets must remain unchanged.

**Recommendation:**

1. Before writes, read all 44 existing offering aliases and their target IDs on the verified development branch. Prepare a reviewed mapping manifest from each alias tuple to the actual institution, course, campus, and variant it represents. Do not derive the mapping from counts alone.
2. For a known course-only alias representing exactly one existing campus offering, add the campus-qualified alias to that same existing catalogue item. Never create a second item merely because the new alias tuple differs.
3. Do not repoint or delete the course-only alias. If an old contextless alias can be tied to the same offering without changing its target, preserve it as a compatibility alias. Do not attach a legacy alias to a different item to make the new design fit.
4. If one course-only alias could represent multiple campuses or variants, it is ambiguous. Keep the existing alias bound to its current identity and stop that mapping until a human-approved disposition identifies which existing identity, if any, can be reused. Create additional identities only for verified distinct offerings and only after the mapping plan is approved.
5. Preserve contextless identities with no reliable course/campus meaning as legacy identities. Do not fabricate a typed offering revision for them. The preflight must account for every existing identity as reused or intentionally retained legacy; no new identity may be left without its canonical alias.
6. If the manifest cannot match an existing alias to a real offering safely, fail closed. Do not silently leave a parallel duplicate or silently strand the seeded identity.

This strategy requires reviewing actual alias rows and mapping decisions; no alias mutation or migration is part of this design task.

## Revision and publication lifecycle

### Content fingerprint and unchanged detection

**Recommendation:** Compute a SHA-256 fingerprint over the normalized, persisted representation of one revision:

- Common revision fields (`title`, `summary`, `description`).
- The relevant typed payload (`institution_content`, `campus_content`, or `offering_details`) and typed relationship identity/revision IDs.
- Normalized source-link inputs for the revision (source URL/key, claim key, and checked date when actually checked).

Canonicalize JSON recursively by sorting object keys; preserve array order unless the field is explicitly defined as a set, in which case sort by a stable key. Normalize dates and URLs only through documented validators. Omit volatile DB IDs for the revision, timestamps, import run IDs, and presentation-only fields. Keep classification, publication status, and verification state outside the content fingerprint: they are lifecycle decisions and must not be inferred from content equality.

No new hash column is currently justified. Recompute the hash from the stored revision and compare it with the normalized input. This permits unchanged detection without adding schema. If a stored revision cannot be normalized unambiguously, stop for manual review rather than treating it as changed or unchanged.

### No-op and changed-record rules

- If the desired fingerprint matches the current published revision, do not create a revision.
- If it matches the latest importer candidate revision, do not create a revision.
- If content differs from the published revision and there is no unresolved draft/review/approved revision, insert a new revision with `MAX(revision_number) + 1`; never update the published revision or its typed row.
- If an unresolved non-published revision exists with a different fingerprint, stop and report a conflict. An operator must resolve/reject/archive that candidate before another import can proceed. The importer must not overwrite review work or create an unbounded trail of duplicate drafts.
- Calculate the next revision number while holding a lock on the catalogue item in the transaction; the unique `(catalog_item_id, revision_number)` constraint remains the final race guard.
- If a previously published record changes, keep the old published revision and pointer visible until a separately reviewed new revision is published. Do not update or delete published content or its provenance.

The importer should be able to rerun after a transaction or client failure: committed identity aliases and content fingerprints resolve to a no-op; uncommitted identity/revision/provenance writes roll back together.

### Status dimensions

Never conflate:

- **Classification:** `real`, `demo`, or `test`; source facts do not choose this automatically.
- **Publication:** `draft`, `in_review`, `approved`, `published`, `archived`, or `rejected`.
- **Verification:** the schema's separate claim/revision status vocabulary.

Demo rows remain `demo` and are never made public by marking them published. Candidate real institutions are not real/verified merely because their names appear in source code. Review must explicitly approve classification and each claim's evidence. The frontend's `outdated` term has no direct schema equivalent; define a reviewed translation to `stale` or `expired` before importing any such value.

Publishing is a distinct, audited operation. It verifies source review and the entire dependency graph, sets the new revision to `published`, and updates the pointer in one transaction. The database pointer trigger checks published status and ownership but does not require `real`; the publication service and public reader must enforce the classification requirement.

## Course dependencies

`course_offering_revisions` requires both the exact `course_item_id` + `course_revision_id` pair and exact `campus_item_id` + `campus_revision_id` pair. Its foreign keys ensure each revision belongs to its supplied identity; migration triggers validate the item types. These constraints do not by themselves prove either revision is the current eligible published version.

**Real-offering prerequisites:**

1. The target course identity resolves unambiguously through its canonical alias.
2. It has a published pointer whose revision belongs to it, has a typed course row, and is `published` + `real`.
3. The campus identity has a current `published` + `real` campus revision; its parent institution identity has a current `published` + `real` institution revision.
4. The offering cites the exact selected course and campus revision IDs, and a reviewed provenance record supports any factual offering claims.
5. The offering revision is itself `real`, review-approved, and published only through the controlled publication workflow.

The development report's 38 course revisions are demo/draft/unverified with no published pointers. They are **not** valid prerequisites for real offerings. Local static presence of `bca`, `ba`, or `bsc` is not a substitute for an eligible database course revision.

**Reader consistency recommendation:** Require an offering's referenced course and campus revision IDs to equal the current published pointers for those identities, and require the campus's parent institution to have a current published real profile. This is the strictest way to avoid serving mismatched revision snapshots. A changed course or campus revision therefore requires compatible offering revisions to be prepared and promoted in the same publication transaction; otherwise the affected offering is temporarily omitted rather than served with stale relationships.

## Import algorithm and failure handling

### Preflight and dry run

1. Freshly verify the intended Neon project, development branch ID/name, and configured endpoint metadata using authenticated metadata; do not infer safety from a URL, prior report, or branch label alone.
2. Use a read-only database inspection to confirm applied migrations, aliases, item types, revision/pointer state, source rows, and relation integrity. Stop on any target mismatch.
3. Validate each input record: stable identifiers, permitted type/status values, parent references, state resolution, duplicate names/slugs/aliases, normalized URLs, source claim mappings, and required relationship IDs.
4. Produce a dry-run plan listing exact existing identities to reuse, new identities, revisions to create/no-op, alias additions, provenance links, and unresolved conflicts. Require human approval before writes.
5. Fail before any write if an identity is ambiguous, a required course revision is not eligible, source or classification is unsupported, or aliases collide.

### Write transaction units and ordered work

Use an atomic transaction per institution aggregate where feasible. Each aggregate transaction contains identity/alias resolution and new draft institution/campus revisions; offering transactions follow only after all referenced records and exact course revisions resolve. Do not hold one long transaction open across manual review or batches.

1. **Institution identities and revisions:** resolve the exact canonical alias; create identity + alias atomically only if absent. Lock the identity; insert a new draft typed revision only when the fingerprint changed and there is no unresolved candidate.
2. **Campus identities and revisions:** use the parent-qualified alias and resolve the institution identity first. Resolve the state through its existing code/name row; do not invent state UUIDs. Insert the campus typed revision with the parent institution identity and validated location payload.
3. **Course references:** read and validate exact published real course identity/revision pairs. Revalidate them inside the offering write transaction so a concurrent publication cannot invalidate the plan.
4. **Offering identities and revisions:** resolve existing context-only aliases through the approved mapping manifest, then attach campus-qualified aliases without changing existing targets. Create any genuinely new identity and its canonical alias in one transaction. Insert offering revision with exact course/campus revision references.
5. **Aliases and provenance:** add secondary aliases and source/claim links atomically with the related draft revision. Source registry rows can be reused by normalized URL; if a canonical alias key already exists but points elsewhere, abort rather than overwrite. No database state is published by the importer.

If existing user data requires that steps 1–5 be committed in separate batches, each batch must have a durable, reviewed manifest and be independently rerunnable. Never leave a new catalogue identity committed without its canonical alias. A failure during a transaction rolls back every identity, alias, revision, and provenance row written by that transaction.

### Locking, retries, and recovery

- Use a transaction and lock an existing `catalog_items` row before selecting the next revision number. New identity creation is serialized by the canonical alias primary key.
- Use a serializable transaction or an equivalent per-identity lock discipline for identity/revision writes. Handle only known serialization/deadlock retries (bounded retries with backoff). Do not retry validation failures or relationship conflicts.
- On unique alias conflict, re-read the exact alias and validate target item type and approved mapping. If the target differs, report a conflict and abort; never `ON CONFLICT DO UPDATE` the alias target.
- On a unique revision-number conflict, roll back and retry resolution/locking once through the bounded concurrency path; do not overwrite another revision.
- If the connection drops during commit, rerun the same input after reconnecting to the verified development target. Exact aliases and fingerprints must identify committed work; the importer must not guess whether the commit succeeded.
- Log batch/record identifiers, decisions, row counts, and error codes, not credentials, full connection strings, or unnecessary institution personal/contact data.
- Recovery is forward-only. Do not delete identities or rewrite published revisions to “clean up.” Use new revisions or explicit operator-reviewed alias corrections in a separately approved operation.

## Provenance and verification contract

### Source records and claim links

- Normalize source URLs deterministically and reuse `source_registry` entries by normalized URL. Source records need a meaningful name, category, source type, and authority when known; only use `admin_manual_entry` for a genuinely manual evidence source.
- Link sources from the revision using stable `claim_key` values tied to typed content fields, e.g. institution profile claims, campus address/location claims, and offering duration/eligibility/fees/admission claims. Define and test the key vocabulary with the JSONB mapping.
- Store `checked_at` only when the source was actually checked. A source URL or profile `lastReviewed` date alone is not evidence that each claim was checked.
- A claim marked `verified` requires a relevant source URL (or documented manual evidence where a URL is not applicable), a real checked date, and a verified date. Claims missing these remain `pending_review`, `unverified`, or `not_collected` according to actual workflow state.
- Do not import `example.com` sample evidence as real provenance. Do not copy checked dates from demo records into a real record.

### Missing and unverified content

- Missing means no value was supplied; do not store fabricated empty strings, zeros, or false values.
- A claim explicitly checked and found unavailable may be represented as unavailable with the source/check evidence that supports the unavailability. A claim never researched should be absent or `not_collected`, not “unavailable.”
- Public readers may expose an unverified claim only with an explicit, claim-level “not verified” treatment. Do not style or phrase it as confirmed. Require stricter editorial review for time-sensitive/high-impact admission, eligibility, and fee facts; exact display/withholding rules remain an open product decision.
- Provenance belongs to the revision that was reviewed. A changed claim or source creates a new revision; do not mutate provenance attached to a published revision.

## Reader API design

**Recommendation:** Add a server-only `src/db/institutions.ts`, following the existing Courses/Fields reader conventions. Keep DB types and Drizzle queries off the client. Initial functions:

```text
listPublishedInstitutions(filters?)
getPublishedInstitution(identifier)
listPublishedCampuses(institutionIdentifier)
listPublishedInstitutionOfferings({ courseId?, institutionId?, campusId? })
getPublishedInstitutionOffering(catalogItemId)

listDemoInstitutionsForDevelopment()
listDemoInstitutionOfferingsForDevelopment(filters?)
```

Use named published/demo functions rather than a mode boolean that can accidentally flow from a request parameter. Demo functions call a fail-closed environment guard equivalent to the course demo reader: only local `NODE_ENV=development`, and no hosted/preview deployment unless it is explicitly identified as the development environment. Demo rows never fall back into published functions. Keep the UI visibly marked as sample.

### Public query predicates

Every public entity must be reached through its own catalogue item's `published_revision_id`, with all of:

- Item type is the expected type.
- Selected revision ID equals that identity's published pointer and belongs to that identity.
- Revision `publication_status='published'` and `data_classification='real'`.
- The correct typed revision row exists for that revision.
- Related identity/revision types and relationships match the typed foreign keys.

For an offering, also require:

- Its course identity has a published pointer to a `published` + `real` typed course revision, and the offering's exact `course_revision_id` matches it.
- Its campus identity has a published pointer to a `published` + `real` typed campus revision, and the offering's exact `campus_revision_id` matches it.
- The campus parent institution identity has a published pointer to a `published` + `real` typed institution revision.

Use joins/conditions to enforce these rules in SQL, not post-filtered arrays that may expose rows before validation. Validate JSONB contracts in the row mapper; invalid typed payloads or conflicting canonical aliases are errors, not empty defaults. Resolve slugs/aliases only after publication predicates and reject ambiguous matches.

### Return and error behavior

- `list...` returns `[]` for a valid query with no eligible records.
- `get...` returns `null` for an unknown or non-public identifier; do not reveal whether a draft/demo identity exists.
- Database failures and malformed published data throw and reach a route error boundary. Do not catch broadly and return `[]`.
- Existing routes use `notFound()` for missing records. Add/retain error boundaries with a retry affordance for database failures; do not show not-found UI for a failed database query.
- Preserve per-claim provenance in the reader result. Missing provenance must not be rendered as verified.

### Demo reader behavior

Demo queries use separate functions and an explicit development-only surface. They select only `data_classification='demo'` records and intended preview revisions; they must never be called by ordinary student-facing routes. In production, the guard fails before querying. If there are no demo revisions, return an empty preview state, not static fallback data.

## Frontend integration plan

1. **General profile remains general:** the directory and profile pages load institutions and campuses without a selected course. Course references should not be used to manufacture institution records.
2. **Course-specific offerings remain distinct:** institution listings are filtered by the published course identity and return offering/campus rows. Offering-specific facts stay on the offering and keep their claim verification state.
3. **Stable routes:** use a stable offering catalogue identity as the canonical detail route key, e.g. `/explore/institutions/offers/[catalogItemId]`. Human slugs remain labels/aliases, not unique offering identity. The existing `/explore/institutions/[slug]?course=...` route may be retained as a compatibility resolver only when the institution/course/(optional campus) tuple resolves to exactly one published offering; otherwise return not-found or redirect to the canonical route, never choose the first match.
4. **General profile slugs:** resolve through institution aliases plus the current published revision; if two published identities claim the same route slug, fail the route as ambiguous and do not select arbitrarily.
5. **Server-to-client boundary:** route server components call the reader and pass serializable mapped data into existing client search/filter components. Client components do not import `getDb` or query catalogue tables.
6. **Static consumers to migrate:** directory list and profile page; course-specific institution list and detail; Courses detail's “institutions” section; saved-item resolver; history resolver. Their identifiers/links must use canonical catalogue item identity and retain legacy slug/course aliases only as compatibility input.
7. **Existing saved/history entries:** resolve old institution slugs and offering slug + course context through aliases when unique. If they cannot be resolved, show an unavailable item without deleting or rewriting user storage as part of this migration.
8. **Remove static demo data from public routes:** keep it only behind the explicit local development preview. No empty database result may trigger a static sample fallback.

## Safety and testing criteria

### Focused unit tests

- Canonical alias tuple construction is stable, escaped, and distinguishes same course at different campuses/variants.
- Identity resolution reuses an exact existing alias; wrong item type, conflicting target, duplicate slug, and ambiguous legacy alias all fail explicitly.
- Hash canonicalization is stable across object-key order and changes when meaningful content, relationship IDs, or source/check evidence changes.
- Missing versus unavailable fields remain distinct; verified claims without required source/check evidence are rejected.
- Status/classification mapping never infers `real`, `published`, or `verified` from missing demo flags or URLs.
- Route resolver rejects multiple matching offerings and legacy records without a unique course/campus context.
- Demo environment guard rejects production, preview, and misconfigured hosted environments.

### Disposable PostgreSQL integration tests

Use only a disposable PostgreSQL database; never Neon. Validate:

- Identity and canonical alias creation is atomic and idempotent, including retry after a simulated failure.
- Existing institution and offering aliases preserve their original `catalog_item_id`; campus-qualified alias additions reuse only reviewed compatible identities.
- Alias conflict and concurrent import cannot create duplicate or aliasless identities.
- Concurrent revision creation allocates one next revision number; unique constraints/locks prevent duplicate numbers.
- Re-importing identical normalized content creates no revision; changed content creates a new draft; unresolved edits/review state block overwrite.
- Any error in an aggregate transaction rolls back identity, alias, typed revision, and provenance inserts together.
- Published revision/typed content is never updated or deleted; a content change creates a new revision and does not move the published pointer automatically.
- An offering cannot reference a wrong course/campus identity or revision; real-offering preconditions reject demo/draft/unpublished courses.
- Provenance links are claim-specific; source and checked-date rules are enforced; missing/unavailable details map distinctly.

### Reader leakage and route acceptance tests

- Public list/detail readers exclude `demo`, `test`, `draft`, `in_review`, wrong-pointer, wrong-owner, missing-typed-row, unpublished parent, and non-real related course/campus/institution rows.
- Offering readers include only exact current published course/campus revisions and a published real parent institution.
- Demo data is available only through the guarded development reader and never through normal public readers, including when published queries return empty.
- Valid empty catalogue returns empty state; missing profile/offering returns not-found; DB failure renders error/retry and does not masquerade as empty/not-found.
- Duplicate institution slug and duplicate course/campus offering route contexts fail closed.
- General directory is independent of course selection; course listing/detail retain course, field, stage, filters, and back-navigation context.
- Saved/history legacy keys resolve when unique and remain safely unavailable when they do not.
- No sample/demo institution appears on normal directory, course, saved, or history routes.

## Schema changes genuinely required

**None identified from the inspected requirements and current schema.** Existing identities, revisions, typed relationships, JSONB payloads, aliases, and claim-level provenance can support the proposed design. Use application-level validators and strict readers for JSONB shape, route uniqueness, identity mapping, `real` classification, and verified-source requirements.

The schema does not enforce unique slugs or `data_classification='real'` on a published pointer. This is a real safeguard boundary, but it does not currently require a migration: readers and the controlled publication service can fail closed and reject ambiguous slugs. Reconsider a unique index or stronger database publication constraint only if the product chooses a concrete global uniqueness/publication invariant and live development data is checked for compatibility.

The content fingerprint can be recomputed from stored revision fields, so no fingerprint column is required for this design. If future import requirements demand an immutable source-bundle identity or automated reconciliation across independently edited drafts, first prove that recomputation plus conflict-stop is insufficient; only then propose durable import-ledger/schema storage.

## Unresolved decisions and blockers

1. **Alias disposition:** Which of the 21 contextless and 23 course-only seeded offering identities represent real offerings, and which remain legacy-only? This requires a fresh development read-only alias/target inventory and reviewed mapping; counts alone are insufficient.
2. **Campus alias format:** Confirm the canonical parent-qualified campus key before any campus import.
3. **Offering granularity:** Decide whether one identity represents course + campus only or also an intake/program variant; this affects context keys, duplicate policy, and routes.
4. **Legacy route policy:** Decide when a legacy slug/course URL redirects to the stable offering route versus returning not-found for ambiguity.
5. **Dependency pointer policy:** This design recommends exact equality with current course/campus published pointers. Confirm the associated requirement to publish dependent offering revisions in the same transaction when those pointers change.
6. **Claim display policy:** Decide which unverified facts may be shown with a visible warning and which high-impact claims (fees, eligibility, admission deadlines) must be withheld until verified.
7. **Data readiness:** The current two profile candidates and six programme entries do not have sufficient claim-level evidence; two programme entries lack course IDs, and no programme has a campus mapping. The 19 offering records are demo samples. These are content blockers, not schema gaps.
8. **Course readiness:** The dated development report lists no published real course pointers; real offering import remains blocked until exact eligible course revisions exist.
9. **Environment/data preflight:** The development snapshot is dated 20 November 2026. Reconfirm current development branch metadata and database state before any implementation that connects or writes.
10. **Existing static test:** Prior reports record a stale profile-page count assertion (`21` generated pages versus `2` authored profiles). Correct it as part of the test migration work; it does not justify changing the data model.

## Explicit implementation order

1. **Approve identity contracts and decisions:** canonical campus alias, offering granularity, legacy alias disposition, and route key.
2. **Fresh development preflight:** verify the development branch and read-only inventory; stop on mismatch or alias ambiguity. Do not use production.
3. **Build validation and dry-run mapping:** implement source validators, normalized fingerprints, deterministic alias resolution, mapping manifest, and conflict report. Test without writes.
4. **Prepare real source evidence and course prerequisites:** curate institution/campus claims, map programme IDs/campuses, and obtain eligible published real course revisions. Keep all demo content classified demo.
5. **Implement and test institution/campus importer:** identities, aliases, revisions, provenance, transaction/idempotency and failure recovery; import only approved development data as drafts.
6. **Implement offering importer:** resolve legacy offering identities before adding campus-qualified aliases; require exact course/campus revisions and provenance. Do not publish through the importer.
7. **Implement `src/db/institutions.ts`:** published institution, campus, and offering readers; strict relationship/pointer/classification predicates; separate guarded development demo functions.
8. **Integrate frontend readers:** migrate general directory/profile first, then course-specific list/detail, Courses detail, saved items, and history. Add stable offering route and compatibility resolution; remove public static demo fallback.
9. **Run acceptance and publication review:** unit tests, disposable PostgreSQL tests, reader leakage tests, and browser route acceptance. Publish only through a separately approved transaction after content and provenance review.

## Actions not performed

- No source, schema, migration, configuration, or data was modified.
- No database connection, SQL, import, seed, publication, branch operation, commit, or push was performed.
