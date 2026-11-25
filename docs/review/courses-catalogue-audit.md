# Courses Catalogue Phase 1 Read-only Audit

## Scope and evidence labels

This audit covers the Courses UI and static data, the existing Drizzle schema and migration history, and a read-only inspection of the authenticated Neon development branch. No source data, database records, migrations, or production resources were changed.

- **Confirmed implementation**: directly observed in the checked-in source.
- **Confirmed development database**: observed using a read-only transaction against the verified development endpoint.
- **Demo/sample**: explicitly marked as illustrative, demo, or sample in source.
- **Missing/unverified**: not represented in the current data, or not substantiated by inspected source records.
- **Recommendation**: proposed next-phase work, not an existing behavior.

## 1. Routes and frontend architecture

### Confirmed implementation

| Route | Behavior | Source |
| --- | --- | --- |
| `/explore/courses` | Canonical directory. A server page wraps the client catalogue in a collection loading skeleton. | [page.tsx](../../src/app/explore/courses/page.tsx), [loading.tsx](../../src/app/explore/courses/loading.tsx) |
| `/explore/courses/catalog` | Compatibility route; redirects to `/explore/courses`, retaining only allowed `stage` and known `field` query values. | [page.tsx](../../src/app/explore/courses/catalog/page.tsx), [loading.tsx](../../src/app/explore/courses/catalog/loading.tsx) |
| `/explore/courses/catalog/[courseId]` | Course detail route. Static params and content currently come from in-memory data; unknown IDs or missing detail objects call `notFound()`. | [page.tsx](../../src/app/explore/courses/catalog/[courseId]/page.tsx), [loading.tsx](../../src/app/explore/courses/catalog/[courseId]/loading.tsx) |

The directory filters the static `courseCatalog` by:

- `stage`: `class-10`, `class-12`, or `all`. A valid query value takes precedence; otherwise the saved education stage is used, falling back to `all`.
- `field`: a known `possibilityFields` ID, or `all`.
- Qualification: the seven qualification labels below. This selection is local UI state, not a query parameter.
- Search: course name, short description, mapped field name, and qualification label. It does not search detail copy or entry text.

The `catalog` compatibility route accepts `stage=class-10`, `class-12`, or `all`; it only forwards `field` when it is a recognized field ID. Detail links carry the selected stage. The detail page also carries course ID/name, field, and stage into the Institutions route.

The catalogue displays a no-results filter state and a “show more” control. Directory and detail routes have loading skeletons. A missing detail is a Next.js not-found state. There is no Courses-specific `error.tsx` or database-load error state because these routes currently read static modules rather than a database.

The detail page displays overview and learning areas; optional plain-language explanation, learning experience, admission guidance, and provider guidance; a broad entry-route table; institution links; and placeholders explaining that progression, examinations, scholarships, and information sources are not yet verified. “Typical duration” is explicitly hard-coded as “Not verified; check with the provider.”

### Relevant files

- [page.tsx](../../src/app/explore/courses/page.tsx)
- [loading.tsx](../../src/app/explore/courses/loading.tsx)
- [page.tsx](../../src/app/explore/courses/catalog/page.tsx)
- [loading.tsx](../../src/app/explore/courses/catalog/loading.tsx)
- [course-catalog.tsx](../../src/app/explore/courses/catalog/course-catalog.tsx)
- [course-catalog-data.ts](../../src/app/explore/courses/catalog/course-catalog-data.ts)
- [course-catalog.test.mjs](../../src/app/explore/courses/catalog/course-catalog.test.mjs)
- [page.tsx](../../src/app/explore/courses/catalog/[courseId]/page.tsx)
- [loading.tsx](../../src/app/explore/courses/catalog/[courseId]/loading.tsx)
- [course-detail-data.ts](../../src/app/explore/courses/catalog/course-detail-data.ts)
- [institution-data.ts](../../src/app/explore/institutions/institution-data.ts)
- [institution-registry.ts](../../src/app/explore/institution-directory/institution-registry.ts)
- [possibility-fields.ts](../../src/app/discover/possibility-fields.ts) and [field-data.ts](../../src/app/explore/fields/field-data.ts) (the field IDs and names used by the course filter)

## 2. Existing course data inventory

### Confirmed implementation

The checked-in catalogue contains **38** unique course IDs, not approximately 32. Each has a matching detail record. The current structural test confirms unique IDs, detail coverage, selected stage membership, and explicit exploration-category flags. Every course field ID resolves to an existing `possibilityFields` entry.

The base record contract in [course-catalog-data.ts](../../src/app/explore/courses/catalog/course-catalog-data.ts) is:

`id`, `name`, `description`, `fieldId`, `qualification`, `stages`, `entryAfterClass10`, `entryAfterClass12`, and optional `isExplorationCategory`.

The table below inventories the exact IDs, titles, short descriptions, fields, qualification labels, stages, and route text represented by those records. “—” means the source value is an empty string.

| ID | Title — short description | Field | Qualification | Stage(s) | Entry after Class 10 / Class 12 |
| --- | --- | --- | --- | --- | --- |
| `bca` | Bachelor of Computer Applications (BCA) — Explore computing, programming and computer applications. | technology | Degree | 12 | — / Entry after Class 12 |
| `bcom` | Bachelor of Commerce (B.Com.) — Study accounting, finance, business and commerce. | business | Degree | 12 | — / Entry after Class 12 |
| `engineering-diploma` | Diploma in Engineering — Develop technical knowledge and practical engineering skills. | engineering | Diploma | 10, 12 | Entry after Class 10 may be available; check the programme. / Entry route varies by programme |
| `bsc` | Bachelor of Science (B.Sc.) — Explore scientific subjects and different areas of study. | science | Degree | 12 | — / Entry after Class 12 |
| `ba` | Bachelor of Arts (B.A.) — Explore humanities, languages and social sciences. | social-sciences | Degree | 12 | — / Entry after Class 12 |
| `btech` | Bachelor of Technology (B.Tech.) — Study engineering principles and their practical applications. | engineering | Degree | 12 | — / Subject and entrance requirements may apply |
| `btech-computer-science` | B.Tech. in Computer Science and Engineering — Study computing systems, software and engineering principles through a specialised undergraduate programme. | technology | Degree | 12 | — / Subject and entrance requirements vary by institution and admission route. |
| `technology-diploma` | Technical Diploma in Computing or Electronics — Explore diploma-level study in a technology area; the exact branch and programme depend on the provider. | technology | Diploma | 12 | — / Entry rules depend on the named diploma, institution and admission route. |
| `computing-certificate` | Computing and Technology Certificate — Explore focused computing or technology learning; syllabus, length and award depend on the provider. | technology | Certificate | 12 | — / Check the selected provider's entry requirements and certificate recognition. |
| `mbbs` | Bachelor of Medicine and Bachelor of Surgery (MBBS) — Study medical sciences and prepare for clinical training. | healthcare | Professional | 12 | — / Specific subjects and entrance requirements apply |
| `bdes` | Bachelor of Design (B.Des.) — Explore design methods, visual communication and creative practice. | arts-design | Degree | 12 | — / Entry after Class 12; selection varies by institution |
| `ba-llb` | Bachelor of Arts and Bachelor of Laws (B.A. LL.B.) — Combine undergraduate study with foundational legal education. | law | Professional | 12 | — / Entry and selection requirements vary |
| `bba` | Bachelor of Business Administration (BBA) — Study business, management, communication and organisations. | business | Degree | 12 | — / Entry after Class 12 |
| `bpharm` | Bachelor of Pharmacy (B.Pharm.) — Learn about medicines, pharmaceutical sciences and pharmacy practice. | healthcare | Professional | 12 | — / Required subjects and entry rules vary |
| `bsc-agriculture` | Bachelor of Science in Agriculture — Explore crop science, soils and sustainable agriculture. | agriculture-environment | Degree | 12 | — / Subject and admission requirements vary |
| `hotel-management` | Hospitality and Hotel Management — Study hospitality operations, guest services and tourism. | hospitality-tourism | Degree | 12 | — / Entry route varies by programme |
| `bsc-nursing` | Bachelor of Science in Nursing — Study nursing practice, health sciences and patient care. | healthcare | Professional | 12 | — / Specific subjects and eligibility rules apply |
| `bsw` | Bachelor of Social Work (BSW) — Explore social services, communities and support practice. | social-sciences | Degree | 12 | — / Entry after Class 12 |
| `journalism` | Journalism and Mass Communication — Explore reporting, media production and communication. | media | Degree | 12 | — / Entry route varies by institution |
| `environmental-science` | Environmental Science — Study ecosystems, environmental change and conservation. | agriculture-environment | Degree | 12 | — / Subject requirements vary by programme |
| `bfa` | Bachelor of Fine Arts (B.F.A.) — Develop creative practice across visual arts and studio work. | arts-design | Degree | 12 | — / Portfolio or selection requirements may apply |
| `computer-science` | Computer Science — Explore algorithms, software, data and computer systems. | technology | Degree | 12 | — / Subject requirements vary by institution |
| `barch` | Bachelor of Architecture (B.Arch.) — Study architectural design, the built environment and planning. | engineering | Professional | 12 | — / Specific subject and admission requirements apply |
| `psychology` | Psychology — Explore human behaviour, thinking and research methods. | social-sciences | Degree | 12 | — / Entry after Class 12; subject rules vary |
| `public-administration` | Public Administration — Study public institutions, policy and community services. | government | Degree | 12 | — / Entry after Class 12 |
| `vocational-multimedia` | Multimedia and Digital Media — Build creative and technical skills for digital content. | media | Vocational | 12 | — / Entry route varies by provider |
| `mathematics` | Bachelor of Science in Mathematics — Study mathematical ideas, reasoning and quantitative methods. | science | Degree | 12 | — / Subject requirements vary by institution |
| `higher-secondary` | Higher Secondary (Class 11–12) — Continue school education and choose from available subject groups. | education | Higher secondary | 10 | Entry after Class 10 / — |
| `higher-secondary-science` | Higher Secondary — Science with Mathematics — Study subjects such as Physics, Chemistry and Mathematics as a foundation for technology, engineering and science routes. | technology | Higher secondary | 10 | Subject combinations and school availability vary. / — |
| `computer-engineering-diploma` | Diploma in Computer Engineering — Learn about computer hardware, programming and systems. | technology | Diploma | 10 | Entry after Class 10 may be available / — |
| `electronics-trade` | Computer or Electronics Trade — Explore practical technical trade training; the exact occupation and certificate depend on the named trade and provider. | technology | Vocational | 10 | Requirements vary by trade and training provider. / — |
| `digital-skills` | Computer and Digital Skills Programme — Explore shorter programmes covering practical computer, internet or digital workplace skills. | technology | Skill training | 10 | Check the chosen provider's course requirements. / — |
| `iti-electrician` | ITI Electrician Trade — Build practical skills in electrical installation and maintenance. | engineering | Vocational | 10 | Entry requirements vary by trade and institute / — |
| `iti-copa` | ITI Computer Operator and Programming Assistant — Develop foundational computer operation and programming skills. | technology | Vocational | 10 | Check current trade and institute requirements / — |
| `civil-diploma` | Diploma in Civil Engineering — Explore construction methods, materials and civil engineering. | engineering | Diploma | 10 | Entry after Class 10 may be available / — |
| `agriculture-certificate` | Agriculture Skills Certificate — Learn practical foundations related to crops and farming. | agriculture-environment | Certificate | 10 | Provider-specific requirements apply / — |
| `hospitality-vocational` | Hospitality and Tourism Skills — Explore guest services, hospitality and tourism operations. | hospitality-tourism | Vocational | 10 | Entry route varies by provider / — |
| `healthcare-support` | Healthcare Support Training — Explore introductory skills used in healthcare support roles. | healthcare | Skill training | 10 | Check the training provider's entry requirements / — |

Qualification counts are: Degree 18, Professional 5, Vocational 5, Diploma 4, Higher secondary 2, Certificate 2, and Skill training 2. There are 12 Class 10 stage memberships and 27 Class 12 memberships; `engineering-diploma` belongs to both. Four entries are explicitly marked broad exploration categories: `technology-diploma`, `computing-certificate`, `electronics-trade`, and `digital-skills`.

Each detail record in [course-detail-data.ts](../../src/app/explore/courses/catalog/course-detail-data.ts) contains one `overview` and three `learningAreas` (each with title and description). Seven records add `simpleExplanation`, `admission`, and `providerDescription`; five add `learningExperience`. These are narrative guidance, not a normalized provider-specific syllabus or eligibility contract.

### Missing or unverified course facts

- Neither course data file contains course-specific source URLs or claim-level provenance.
- The catalogue has no structured eligibility/subject/marks/entrance requirements beyond stage tags and free-text entry guidance.
- No course record defines duration. The detail UI deliberately labels duration unverified.
- Course records have no direct institution IDs. The separate `institutionCampusOfferings` data has 19 entries, all demo offers for BCA; all 19 resolve to institutions marked `isDemo`. Its eight source URL references use `example.com` and are sample-only, not evidence.
- The detail UI does not currently list verified progression, exam, or scholarship relationships.
- Similar or overlapping concepts exist as separate identities (for example, broad and named computing/engineering options). IDs are unique, but editorial equivalence and whether broad options are categories or specific courses need review; this audit does not merge or correct them.
- Generalized text such as “Entry after Class 12” is not a verified eligibility rule for every institution or programme. The existing UI labels the catalogue illustrative and directs students to verify official criteria.

## 3. Neon schema, migrations, and development records

### Verified target and method

The authenticated Neon CLI was called with explicit project ID `calm-brook-21165945`; it listed development branch `br-wandering-flower-a1f6ys66` as the current, ready branch. A branch-specific connection-string lookup mapped that exact branch to `ep-divine-fog-a1uxos5z.ap-southeast-1.aws.neon.tech`, matching the host in `DATABASE_URL_UNPOOLED`. The configured `DATABASE_URL` uses the corresponding `-pooler` host. No connection string or credential was printed.

All database inspection used `DATABASE_URL_UNPOOLED` only after a hostname guard and inside `BEGIN READ ONLY` / `ROLLBACK`. The session reported database `neondb`, PostgreSQL 18.7. No production connection was made.

### Confirmed schema and migration history

The migration journal and the database's `drizzle.__drizzle_migrations` history agree on three applied entries:

1. [0000_initial-schema](../../drizzle/0000_initial-schema.sql)
2. [0001_unique_guided_explorer_answer](../../drizzle/0001_unique_guided_explorer_answer.sql)
3. [0002_guided_explorer_operations](../../drizzle/0002_guided_explorer_operations.sql)

Courses are already represented in [catalog.ts](../../src/db/schema/catalog.ts) and [0000_initial-schema.sql](../../drizzle/0000_initial-schema.sql):

- `catalog_items`: canonical UUID identity, `item_type` (including `course` and `course_offering`), and nullable `published_revision_id`. The migration adds a deferred composite foreign key to the item's own revision.
- `catalog_item_aliases`: unique external identity; `0000_initial-schema` seeds `careerbridge`/`course` aliases for the legacy course IDs.
- `catalog_item_revisions`: revision number, title, summary/description, publication status, `data_classification` (`real`, `demo`, `test`), verification status, and publication metadata. Constraints and triggers validate the published pointer and make published revisions immutable.
- `course_revisions`: `field_item_id` and pinned `field_revision_id`, qualification, stage array, Class 10/Class 12 entry text, `is_exploration_category`, and object-valued `course_content` JSONB. Composite foreign keys require a field item and a revision belonging to it.
- `course_offering_revisions`: versioned course-to-campus offer with explicit course and campus item/revision pairs, slug, and object-valued `offering_details` JSONB.
- `campus_revisions` links a campus to an institution item and optional state. The course-offering relation therefore reaches institutions through campus.
- `source_registry` and `catalog_revision_sources` support canonical sources and revision/claim-level links, including checked/verified timestamps and verification status.

`0001` and `0002` concern Guided Explorer answer uniqueness and operation receipts, not course catalogue schema.

### Confirmed development database state

Read-only counts returned:

| Check | Result |
| --- | ---: |
| `catalog_items` with `item_type='course'` | 38 |
| CareerBridge course aliases (`external_type='course'`, empty context) | 38 |
| App IDs missing from database aliases | 0 |
| Unexpected database course aliases | 0 |
| Course typed revisions in `course_revisions` | 0 |
| Course items with published revision pointer | 0 |
| Course-offering catalogue items | 44 |
| Course-offering typed revisions | 0 |
| Course-offering items with published revision pointer | 0 |
| Source/provenance links attached to course or offering revisions | 0 |

The 44 offering items are identities/aliases only; the database has no typed offering revisions or source-backed published offers. The 38 course identities likewise have no revision rows, so no course revision is draft, published, or otherwise available yet. The same read-only check found 13 field drafts and 13 published real field revisions, which can supply the pinned field revisions required by a course revision.

## 4. Data quality and provenance assessment

### Confirmed

- The 38 app IDs are unique and exactly match the 38 seeded development aliases.
- The catalog clearly labels entries as illustrative, and its course detail source section says facts still need official sources, publisher/publication dates, and last-checked dates.
- The four broad exploration categories are explicitly labeled in the directory and detail view.
- The institution list shown for a course excludes demo institutions and requires a source with URL, checked date, and `verified` status before rendering a positive institution card.

### Demo/sample and unverified

- Current course descriptions and detail narratives are CareerBridge-authored exploratory guidance; the course catalogue has no source links or provenance rows to establish official endorsement.
- Sample institution names, offer facts, dates, and URLs must not be migrated as real records. The eight `example.com` references are placeholders.
- The 44 development offering identities include legacy aliases, including institution/course combinations, but identity existence alone does not establish a current programme offering. They have no revision, publication pointer, or provenance link.
- “Professional” and other broad qualification labels are catalogue groupings. They are not sufficient evidence of a particular award, recognition, duration, or admission right.

## 5. Comparison with the Fields integration

[`fields.ts`](../../src/db/fields.ts) is the established server-only pattern: it follows `catalog_items.published_revision_id`, requires the pointed revision to belong to the same item and be `published` and `real`, maps typed content, retains aliases, and includes source/provenance metadata. The Fields UI loads that reader on the server and has an explicit route error boundary.

Reusable patterns are the published-pointer join and validation, real/demo/test exclusion, canonical alias resolution, claim-level source mapping, and explicit database error handling. Courses need their own reader/model: course stages, qualification, entry routes, exploration-category marker, flexible course detail content, and optional course-to-campus offerings do not fit the six-string Fields content contract. The current student-facing course IDs must continue to resolve through their existing aliases.

## 6. Frontend-to-database integration gaps

1. Replace both static data modules as the student-facing source of course descriptions; there is no Courses reader today.
2. Preserve `/explore/courses`, the `/catalog` redirect, `/catalog/[courseId]` URLs, existing course IDs, and field/stage query behavior.
3. Preserve current search, stage/field/qualification filters, saved-item and history identifiers, and detail navigation.
4. Define which narrative properties belong in `catalog_item_revisions` versus typed columns and `course_content`; retain the course-specific shape instead of copying Fields JSON keys.
5. Add explicit database load/error and empty/unpublished handling. Do not mask a database failure by returning the static catalogue.
6. Treat institution/course offers as separately sourced `course_offering` revisions pinned to exact course and campus revisions. Do not promote the current demo BCA offers or unversioned aliases as factual listings.

## 7. Migration assessment

**No schema migration is currently justified.** The existing schema already provides course identities, typed course revisions, pinned field revisions, course content JSONB, source/provenance links, campus/institution relationships, and versioned course offerings. The database already has all 38 course aliases. Initial population can use the existing tables and aliases; adding another course table would duplicate the catalogue model.

A schema change should be reconsidered only if Phase 2 demonstrates a real requirement that cannot be represented safely in `course_revisions`, `course_content`, `course_offering_revisions`, or claim-level provenance (for example, a normalized eligibility model that needs queryable, validated dimensions).

## 8. Risks and dependencies

- Editorial review and official-source research are prerequisites for assigning `real` classification or publishing records. A linked URL alone does not establish claim verification.
- Course IDs and alias mappings are used by current routes, saved items, and exploration history; keep them stable.
- Pinned field revisions can become stale when a field publishes a later revision; import logic must deliberately select and preserve the intended field revision.
- Do not infer named institutions or current offerings from sample content or identity-only legacy aliases.
- Because the current pages are partly static and the detail route has static params, database integration needs intentional runtime/cache and missing-data behavior rather than a superficial data-source replacement.
- This was a source and read-only database audit, not a browser acceptance test or a content verification exercise.

## 9. Ordered next-phase plan

1. Define the course-specific content contract and classify each existing record as a named programme or exploration category; retain all current canonical IDs.
2. Review course claims against official sources. Keep general explanation as CareerBridge guidance, and record source/claim scope and checked dates without claiming verification that did not occur.
3. Prepare an idempotent development-only import using existing course and offering identities. Create revisions only for reviewed content, pin each course to the intended field revision, and create offer revisions only for evidenced institution/campus/course relationships.
4. Implement a server-only Courses reader following the Fields published-pointer/error pattern but mapping the Courses-specific fields and offering/provenance data. Connect directory and detail routes without silent static fallback.
5. Add disposable PostgreSQL integration tests for published/draft/unpublished/demo/test filtering, aliases, six-or-more course-specific content properties, sources/claim dates, pinned field revisions, course-offering relationships, and missing/error cases. Then run typecheck, lint, focused tests, build when the development lock is clear, and read-only development smoke tests.

## 10. Verification performed for this audit

- Existing focused course catalogue structural tests: **3/3 passed** (`node --test src/app/explore/courses/catalog/course-catalog.test.mjs`).
- Neon authenticated branch listing and branch-specific endpoint mapping: development branch confirmed; configured direct endpoint matched.
- Read-only Neon inspection: 38/38 course aliases match app IDs; 0 course revisions, 0 course published pointers, 0 offering revisions, and 0 course/offering provenance links.
- No typecheck, lint, build, frontend browser test, write, migration, or production connection was performed; none was required for this read-only audit.

## Concise recommendation

Proceed to a Courses-specific content/provenance preparation phase using the existing catalogue schema and aliases. Do not publish the 38 records or any institution offerings until their claims and source relationships have been reviewed.
