# 7. Admin Panel Implementation

## 7.1 Architecture

Admin is a protected application area backed by server-side services and the same canonical catalogue/source models used by the student platform. Do not build a separate Admin-only copy of catalogue facts.

## 7.2 Route protection

Protect Admin routes at the server boundary. Authenticate with Clerk and authorize using trusted application roles/permissions. Re-check permission in every mutation and sensitive read. A route guard alone is insufficient.

## 7.3 Modules

Dashboard; institutions; campuses; courses/offerings; fields; pathways; examinations; scholarships; source registry; imports; review/publication; knowledge base; jobs/errors; audit; users/roles.

## 7.4 CRUD workflow

Create/edit draft → validate → attach source → save → submit for review. Review compares current/proposed values and evidence. Reviewer approves/rejects/requests correction. Publisher publishes. Each state transition is permission-checked and audited.

Fields are created through `POST /api/admin/catalogue/fields`. The request accepts a required name, optional summary and partial content, and optional HTTPS source evidence. It requires a same-origin Admin request and a verified Neon development target, creates a new canonical identity and revision 1 as `draft`/`unverified`, and leaves the published-revision pointer unset. Duplicate current Field names return `409 Conflict`; creation never publishes a record. The shared editor appends a draft or `in_review` revision with an expected-revision check; marking a revision ready for review requires all six content sections. Existing source links carry forward as unverified, and edits do not change the published pointer.

The Fields directory reports database-backed total, published, and needs-review counts. A Field with a published revision remains Published while a newer draft or in-review revision is separately identified. Admin-only lifecycle actions publish only the latest in-review revision after checking required content and the expected published pointer; archive creates an archived history revision and clears the public pointer; deleting a draft either removes that draft revision from a published Field or deletes an unpublished-only identity, subject to database references. All write actions require a same-origin request and the verified Neon development target.

Field images are stored in the `field_revision_images` child table as revision-scoped PostgreSQL `bytea` values (`image/jpeg`, `image/png`, or `image/webp`, maximum 5 MiB). The Admin editor can keep, replace, or remove an image while saving a revision; the student-facing image endpoint serves only the published revision, so draft changes remain private. Existing local Field images are imported idempotently with `npm run import:field-images:development`, which verifies the configured Neon development branch and never overwrites an existing image or intentional removal.

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
