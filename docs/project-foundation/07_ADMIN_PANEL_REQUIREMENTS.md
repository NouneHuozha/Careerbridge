# 7. Admin Panel Requirements

## 7.1 Role

Admin is a core platform capability. It governs catalogue records, sources, imports, verification, publication, knowledge documents and operational jobs. It is not merely CRUD and must not be postponed as optional future work.

## 7.2 Roles

Target roles: Data Contributor, Reviewer/Verifier, Publisher/Admin and System Administrator. Contributors create drafts/imports; reviewers inspect evidence and approve/reject/request corrections; publishers publish approved records; system administrators manage roles and configuration. Exact permissions must be enforced server-side. Hiding a button is not authorization. Self-approval should be disallowed by default for material data changes.

## 7.3 Admin areas

Dashboard; Institutions; Campuses; Courses and Offerings; Fields; Pathways; Examinations; Scholarships; Sources and Checks; Imports and Exports; Review and Publication; Knowledge Base; Update Jobs and Errors; Audit History; Users and Roles.

Do not create empty navigation areas without a working purpose.

## 7.4 Dashboard

Show database-derived counts, draft/review/published totals, stale time-sensitive facts, source-check status, detected changes, failed imports, indexing status and recent admin actions. Never hardcode operational counts.

## 7.5 Catalogue management

Institution records support type, state, district, website, identity facts and sources. Campus records support parent institution, address, district/state and coordinates. Course records describe the course; offerings describe the specific campus delivery and its eligibility, mode, fees and admission details. Fields use one canonical content source. Pathways, examinations and scholarships preserve official evidence and freshness.

## 7.6 Source registry

Store source name, authority, canonical URL, category, supplied data types, access method, permitted-use notes, expected update behaviour, schedule, last attempt/success/change, status and parser adapter. Secrets belong in a secure secret store, never browser-visible source records.

## 7.7 Import/export

CSV/XLSX imports require template, preview, column mapping, required-field and relationship validation, duplicate detection, source/classification checks, dry run, row-level errors, summary and audit. Imported records enter draft/review. Exports require permission and must avoid unnecessary personal data.

## 7.8 Review and publication

Review screen shows old and proposed values, source evidence, source dates, validation, relationships, conflicts and history. Actions: approve, reject with reason, request correction, mark disputed/unavailable. Approval and publication may be separate permissions. Publish only through authorised action or approved policy; record actor/time; update dependent indexes; preserve last-known-good data.

## 7.9 Knowledge Base

Register approved URLs/documents, upload permitted files, preview extracted content, inspect extraction errors, version documents, trigger indexing/re-indexing, inspect status and mark documents superseded/withdrawn. Knowledge indexing is distinct from catalogue verification/publication.

## 7.10 Jobs and audit

View scheduled jobs, status, failures, safe retry, source pause/resume, last success and next run. Audit consequential create/update/import/review/publish/archive/source/job/indexing/role actions with actor, target, timestamp, reason and relevant before/after data. Avoid unnecessary student data in logs.

## 7.11 First vertical slice

Build an end-to-end institution workflow: create/import real draft → validate → duplicate detection → attach source → review → approve → publish → show in student directory → propose later source change → review and publish → audit all actions. Test role restrictions and prove a failed source check does not erase published data.
