# 7. Admin Panel Implementation

## 7.1 Architecture

Admin is a protected application area backed by server-side services and the same canonical catalogue/source models used by the student platform. Do not build a separate Admin-only copy of catalogue facts.

## 7.2 Route protection

Protect Admin routes at the server boundary. Authenticate with Clerk and authorize using trusted application roles/permissions. Re-check permission in every mutation and sensitive read. A route guard alone is insufficient.

## 7.3 Modules

Dashboard; institutions; campuses; courses/offerings; fields; pathways; examinations; scholarships; source registry; imports; review/publication; knowledge base; jobs/errors; audit; users/roles.

## 7.4 CRUD workflow

Create/edit draft → validate → attach source → save → submit for review. Review compares current/proposed values and evidence. Reviewer approves/rejects/requests correction. Publisher publishes. Each state transition is permission-checked and audited.

## 7.5 Imports

Upload to private temporary storage; validate file type/size; parse safely; preview rows; map columns; validate relationships; detect duplicates; dry-run; import accepted rows as drafts; show row errors; record import manifest/hash and audit. Protect against formula injection in exported spreadsheets and malicious file content.

## 7.6 Source management

Store source metadata separately from secrets. Show last attempt, last successful check, change detection, schedule and errors. Allow only authorised source configuration and manual refresh actions. Apply rate limits and safe retry.

## 7.7 Publication

Use transactionally consistent publication. Preserve prior version/snapshot. Update catalogue/search indexes after publication. Trigger RAG re-index only for affected documents. Failed downstream indexing must not roll back valid catalogue publication; expose retry state.

## 7.8 Audit

Record actor, permission, action, target, timestamp, reason, before/after summary and correlation ID. Avoid storing unnecessary personal data or credentials. Protect audit records from ordinary mutation.

## 7.9 First vertical slice

Institution draft/import → validation → review → publication → student directory read. Include source provenance, duplicate handling, role checks, audit and failure preservation before expanding every Admin module.

## 7.10 Acceptance

Contributor cannot publish; student cannot access Admin; reviewer cannot grant self Admin; publisher cannot bypass required review; imports cannot publish directly; duplicate retries are safe; source failure preserves last-known-good data; audit records all consequential actions.
