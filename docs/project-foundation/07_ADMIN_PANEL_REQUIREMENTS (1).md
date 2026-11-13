# 7. Admin Panel Requirements

## Purpose
Admin is a core operational part of CareerBridge. It governs education data, sources, imports, verification, publication, knowledge documents and update jobs. It is not merely a dashboard or unrestricted CRUD screens.

## Roles
Define least-privilege roles before exposing actions. Candidate roles:
- Data contributor: create/import drafts and submit for review.
- Reviewer/verifier: inspect evidence and approve/reject within assigned scope.
- Publisher/admin: publish approved records and manage source configuration.
- System administrator: manage roles and system settings.

Finalize the role matrix. Enforce every permission server-side, not only by hiding UI controls.

## Admin areas
Dashboard; Institutions and campuses; Courses and offerings; Fields; Pathways; Examinations; Scholarships; Sources and checks; Imports/exports; Review/publication queue; Knowledge Base and RAG indexing; Update jobs/errors; Audit history; restricted Users/Roles.

Do not create empty sections merely to fill navigation. Each area needs a defined workflow and data contract.

## Dashboard
Show actual counts by category and state; drafts, review queue and published records; stale time-sensitive fields; recent source checks/changes; failed imports/fetches/indexing; and deadline/source-review alerts where supported. Do not hardcode dashboard counts.

## Record management
Support search/filter/pagination; create/edit draft; required-field validation; linked-record selection and relationship checks; source/provenance; data classification; student-facing preview; submit for review; approve/reject/request correction; publish/update/archive; and version/audit history.

## Institution workflow
Support state, district, institution identity/type, campus, address, coordinates, website, affiliation/recognition and source evidence where available. Keep profile data separate from course offerings. Publish partial profiles only under an explicit policy and show missing information honestly. First operational milestone: real Nagaland institutions, with all-eight-state schema support.

## Source registry
Manage source name/canonical URL, organisation/authority, category, supplied data types, access method (API, download, monitored page, manual), access/terms notes, check frequency, active status, last check/success/change, reliability/review policy and parser configuration reference. Do not store secrets in plain text source records or expose them to browsers.

## Imports
1. Select entity type/template.
2. Upload supported file.
3. Map columns if needed.
4. Preview rows.
5. Validate fields, relationships and formats.
6. Detect duplicates.
7. Show row errors/warnings.
8. Allow dry run.
9. Import accepted rows as drafts/review candidates.
10. Provide result report and audit entry.

Imports must not silently publish unverified records.

## Automated source updates
Run configurable source-specific checks; record every run; compare extracted candidates to published values; show before/after differences and evidence; route sensitive changes to human review; preserve last-known-good values on failure; support retry/pause/disable; respect rate limits and source access rules.

## Review and publication
Reviewers see candidate and proposed changes, original/extracted values, source and excerpt, source/fetch dates, validation results, meaningful confidence indicators, source conflicts and current value/history. Actions include approve, reject with reason, request correction or mark disputed/unavailable. Approval and publication permissions may be separate.

## Knowledge Base
Support approved document/URL ingestion, metadata/versioning, extraction preview, indexing status/errors, reprocess/re-index, superseded/withdrawn state and inspection of source/chunk references used in answers. RAG indexing state is distinct from structured-record verification/publication.

## Audit and operations
Record who did what, when and why for imports, approval, publication, archive, source configuration, role changes and corrections. Avoid unnecessary student data in audit logs. Provide safe retry and failure inspection; do not expose secrets or stack traces to unauthorised users.

## First vertical-slice acceptance
An authorised admin creates/imports a real institution draft; validation and duplicate checks run; source evidence is attached; reviewer approves; authorised publisher publishes; student directory reads the published DB record; later update creates a reviewable change and preserves history; fetch failure does not erase published data; every action is permission-checked and audited.
