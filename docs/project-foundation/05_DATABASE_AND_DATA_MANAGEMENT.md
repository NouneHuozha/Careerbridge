# 5. Database and Data Management

## Principles
Use a relational database for canonical structured records. Preserve provenance and verification state. Real sourced data is primary; demo/test data is labelled and separated. Support all eight Northeast states even if initial collection starts in Nagaland. Preserve history and last-known-good data.

## Core domains
- **Geography:** state, district, locality, address, campus coordinates and optional route metadata.
- **Education catalogue:** institution, campus, affiliation/recognition facts, course/programme, course offering, field, pathway, qualification relationships, examination, eligibility/application information and scholarship/scheme.
- **Student context:** account, stage, relevant interests/activities/subjects/skills/preferences, Guided Explorer session and answers, consent/privacy metadata. Collect only what is necessary.
- **Source governance:** source registry, fetch/check run, source document/version, extracted candidate/change, review decision, publication state and audit event.
- **AI support:** knowledge document/version/chunks/index metadata, retrieval references, recommendation run/evidence and privacy-safe response trace where appropriate.

## Entity relationship principles
- Institution has one or more campuses; a campus belongs to one institution.
- Course/programme is a catalogue entity; a course offering connects a course to a specific campus/institution and may carry its own dates, fees, mode and eligibility.
- Field-to-course, pathway-to-qualification and examination/scholarship eligibility should use explicit relationships where needed, not duplicated free-text lists.
- Source records can support multiple entities and individual time-sensitive fields.
- Student answers and recommendation evidence should reference stable IDs and versions, with privacy-aware retention.
- RAG documents/chunks are separate from canonical structured catalogue entities.

This is a domain outline, not a final physical schema. Confirm table names, cardinality, constraints and migrations during implementation review.

## Provenance
Relevant records should support data classification (real/demo/test); source ID/name/URL; source publication/effective date where known; last checked and last verified timestamps; verification state and reviewer; publication state and timestamp; created/updated timestamps and actor; and version/change history. A record may have multiple sources. Time-sensitive fields such as fees, admission dates and scholarship deadlines may need field-level source and checked-date metadata.

## Status model
Verification states may include awaiting review, verified, partially verified, unverified, disputed, unavailable, not collected, expired or superseded. Publication states may include draft, in review, approved, published, archived and rejected. These are separate concepts. Publication must not imply all fields are complete/current.

## Collection methods
Priority: official APIs and structured government datasets; official downloadable CSV/XLSX and public documents; automated monitoring/extraction from permitted official pages; and admin-assisted manual entry/import from prospectuses, circulars and notices.

Do not rely on search snippets as authoritative data. Do not bypass logins, access controls, anti-bot protections or website terms. Retain source URLs and retrieval metadata. Store source copies only where legally and technically appropriate.

## Initial refresh schedule
Schedules are configurable per source and category. Suggested starting defaults:

| Category | Normal check | Active application period |
|---|---|---|
| Institution identity, campus, address | Quarterly | On announced change |
| Course/programme availability | Quarterly | Monthly |
| Eligibility and qualification rules | Quarterly | Monthly |
| Fees and admission details | Monthly | Weekly |
| Admission notices and deadlines | Weekly | Daily near deadlines |
| Examination notices and dates | Weekly | Daily near application/deadline windows |
| Scholarship notices and deadlines | Weekly | Daily near active windows |
| Pathway/qualification rules | Every six months | On official change |
| Knowledge-base source updates | Weekly | Event-triggered where possible |
| General field descriptions | Every 6–12 months | On substantive change |

These are operational starting points, not claims about how often sources publish. Tune for observed source behaviour, urgency, rate limits and cost.

## Update pipeline
1. Register source, authority, allowed method, categories and schedule.
2. Fetch or receive source material.
3. Store retrieval result, timestamp and document version.
4. Parse candidate values.
5. Validate formats, required fields, relationships and plausible ranges.
6. Detect duplicates and compare with current values.
7. Create proposed change with before/after values and evidence.
8. Route for review according to sensitivity and confidence.
9. Approve/reject/request correction.
10. Publish approved changes and write audit history.
11. Refresh dependent catalogue/search/recommendation/RAG indexes.
12. Record outcome and next check time.

A failed request, empty parse or changed page layout must never delete or replace valid published data.

## Import workflow
CSV/XLSX imports need templates, preview, column mapping, row-level errors, required-field and relationship checks, duplicate detection, source/classification requirements, dry-run, import summary and audit record. Imports enter draft/review, not automatic publication.

## RAG document lifecycle
Preserve title, source organisation/URL, document type/topic, publication date, retrieval date, version/content hash, superseded relationship and extraction/indexing status. When an approved source changes, create a new version, reprocess and update retrieval indexes. Keep enough history to explain which version supported an answer. Do not retrieve superseded material as current guidance.

## Data quality
Do not fabricate missing values. Distinguish zero, unknown, not applicable and unavailable. Preserve original units/currency and normalize carefully. Keep institution, campus and course offering distinct. Avoid duplicate entities. Make corrections and archives auditable. Show source/freshness where information can affect decisions.

## Initial rollout
Start with real Nagaland institution data while implementing schema/source governance for all eight states. Expand coverage after the end-to-end workflow is stable. Collect relevant national courses, examinations and scholarships. Do not claim comprehensive Northeast coverage until sources and records have actually been collected and verified.
