# 5. Database and Data Management

## 5.1 Direction

Use Neon PostgreSQL with Drizzle ORM. Current implementation uses `pg` direct queries and manually maintained SQL; migrate deliberately. Physical schema and migration conventions are specified in `docs/implementation/03_DATABASE_SCHEMA_AND_MIGRATIONS.md`.

## 5.2 Data principles

Real sourced data is primary. Demo/test records are labelled and separated. Published structured facts are canonical in PostgreSQL. Sources and changes are traceable. Verification differs from publication. Missing data remains missing. Historical changes are auditable. Student data is minimised and protected.

## 5.3 Domains and entities

Geography (state, district, locality); Institution; Campus; Course; Course Offering; Field; Pathway; Qualification; Examination; Scholarship; Student/Application User; Discovery Answer; Guided Explorer Session; Saved Item; History Item; Student Next Step; Source; Source Check/Fetch Run; Source Document and Version; Candidate Change; Review; Publication Event; Audit Event; Knowledge Document; Chunk/Embedding metadata; Recommendation Run and Evidence.

## 5.4 Relationships

An institution may have multiple campuses. Each campus belongs to an institution. A course may have many campus-specific offerings. An offering belongs to a specific campus. Institutions and records may have multiple sources; sources may support multiple records. A field relates to multiple courses. Pathways relate to qualifications, courses and examinations. Students may save multiple catalogue items and create history/next-step records. RAG chunks retain document and version identity.

## 5.5 Institution/campus/offering

Institution identity, campus location and course offering are separate. A course offered at one campus is not automatically offered at another. Fees, eligibility and admissions may vary by offering and academic session.

## 5.6 Provenance and classification

Relevant records retain source ID/name/URL/authority, source date where available, retrieval time, checked and verified times, reviewer, verification state, publication state, real/demo/test classification and change history. Important time-sensitive facts should have field-level provenance where practical.

## 5.7 Verification versus publication

Verification states may include awaiting verification, verified, partially verified, unverified, disputed, unavailable, not collected, expired and superseded. Publication states may include draft, in review, approved, published, archived and rejected. Publication does not imply every field is complete or current.

## 5.8 Refresh starting defaults

- Institution identity/campus/address: quarterly; event-triggered changes.
- Course availability: quarterly; monthly during admissions.
- Eligibility: quarterly; monthly during active periods.
- Fees/admission details: monthly; weekly during active admission.
- Admission/exam/scholarship notices: weekly; daily near deadlines where feasible.
- Pathway rules: every six months and on official change.
- Knowledge sources: weekly/event-triggered.
- General field descriptions: every 6–12 months.

Tune to source behaviour, urgency, rate limits and cost. These are defaults, not claims about source publication cadence.

## 5.9 Collection and update workflow

Register source → permitted fetch/import → store retrieval metadata → parse candidate facts → validate formats and relationships → detect duplicates and changes → review → approve/reject → publish → refresh dependent indexes → audit. Failed requests or parser changes must not erase valid published data.

## 5.10 Imports

CSV/XLSX workflow requires approved templates, column mapping, preview, row validation, relationship validation, duplicate detection, source requirements, real/demo/test classification, dry run, row-level errors, summary and audit. Imports enter draft/review; they do not silently publish verified data.

## 5.11 RAG documents

Preserve title, authority, URL, document type, topic, publication date, retrieval date, version/content hash, superseded relationship, extraction status, indexing status and chunk references. New source versions should create versioned documents and re-index safely. Superseded documents must not appear as current guidance.

## 5.12 Data quality

Distinguish zero, unknown, not applicable and unavailable. Preserve original units/currency. Prevent duplicate institutions/campuses. Validate relationships. Keep demo/test separate. Show source and freshness. Do not fabricate missing values.

## 5.13 Initial coverage

Initial real collection may start with Nagaland, while schema, Admin, source registry and filters support all eight Northeast states from day one. Coverage claims must reflect verified records only.
