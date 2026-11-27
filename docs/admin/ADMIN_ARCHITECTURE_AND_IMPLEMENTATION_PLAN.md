# CareerBridge Admin Architecture and Implementation Plan

**Status:** Inspection and proposal only. No Admin pages, application code, database, authentication, or permissions were changed for this audit.

**Audit date:** 2026-11-27.

> **Current UI status:** This blueprint predates the current Admin routes and preview screens. Its statement above describes the state at audit time, not the current repository. See [Admin Page Inventory and Implementation Checklist](./ADMIN_PAGE_INVENTORY_AND_IMPLEMENTATION_CHECKLIST.md) for current screen coverage and remaining frontend work. The security, lifecycle, and data-governance constraints below remain relevant.

## 1. Executive summary

At the time of this audit, CareerBridge had a shared PostgreSQL catalogue model and working public readers for several real catalogues, but no Admin Panel routes or UI. Admin screens have since been added; their current coverage is listed in [Admin Page Inventory and Implementation Checklist](./ADMIN_PAGE_INVENTORY_AND_IMPLEMENTATION_CHECKLIST.md). The lifecycle and data-governance differences documented below remain relevant.

At audit time, two Admin lifecycle APIs existed, but catalogue workflows were not uniform:

- The institutions/campuses/offerings and examinations/scholarships route supports listing and reading reviewable revisions and actions for source association, submission, claim review, approval, rejection, and publication.
- Pathways use a separate POST-only lifecycle route.
- Courses and fields currently rely on dedicated scripts for import and publication; they do not have the same authenticated review API.

The recommended implementation is a protected Admin interface over the existing catalogue identities, revisions, source registry, validators, readers, and lifecycle rules. It must not create a parallel CMS or treat scripts for one catalogue as the policy for every catalogue.

## 2. Existing application architecture

### Application routes and layouts

The root App Router layout (`src/app/layout.tsx`) mounts `ClerkProvider` and the student `AccountProvider`. `src/proxy.ts` installs Clerk middleware, but that middleware is not an Admin authorization boundary.

The main student application is under `/explore` and uses `src/app/explore/layout.tsx` and `StudentNavigation`. Existing routes include:

- Explore landing, fields, courses, institutions, institution directory, pathways, examinations, scholarships, saved items, history, settings, and next steps.
- Course-specific institution discovery at `/explore/institutions?course=...` and its course-context profile.
- A separate `/explore/institution-directory` route with static institution-profile data.

There are currently **no Admin page routes**. Existing Admin API routes are:

- `POST /api/admin/pathways/lifecycle`
- `GET|POST /api/admin/catalogue/lifecycle`

The generic catalogue route accepts `institution`, `campus`, `course_offering`, `exam`, and `scholarship`; it does not accept `field`, `course`, or `pathway`.

### Database and shared catalogue model

The Drizzle catalogue schema is in `src/db/schema/catalog.ts`. Shared tables are:

- `catalog_items`: stable typed identity and `published_revision_id`.
- `catalog_item_aliases`: unique source/type/key/context identity tuples. Course-specific offering aliases use a non-empty context, ordinarily the course ID.
- `catalog_item_revisions`: revision number, shared title/summary/description, publication and verification status, classification, timestamps, and coarse creator/updater/publisher IDs.
- Typed revision tables: `field_revisions`, `institution_revisions`, `campus_revisions`, `course_revisions`, `course_offering_revisions`, `pathway_revisions`, `examination_revisions`, and `scholarship_revisions`.
- `source_registry`: canonical source metadata and active/paused/retired status.
- `catalog_revision_sources`: many-to-many revision/source links with `claim_key`, checked/verified timestamps, and current verification status.

Important relationships are enforced with foreign keys, including campus → institution, course → exact field revision, and offering → exact course and campus revisions. The offering therefore describes delivery at a campus; it is not another course identity. Published readers use the current item pointer and exact typed revision.

Student tables are in `src/db/schema/student.ts`; they are not Admin or catalogue-management tables. `users`, `auth_sessions`, and `account_data` are defined separately in the legacy SQL schema and are not represented in the Drizzle schema module. No dedicated catalogue audit-event, review-comment, or source-fetch-run table was found. Revision metadata and source claim rows retain current state, not a complete append-only sequence of Admin decisions.

## 3. Actual catalogue workflows

| Catalogue | Identity, revisions, and relationships | Creation and lifecycle actually present | Student-facing reads and remaining demo/static behavior |
|---|---|---|---|
| **Institutions and campuses** | `catalog_items`, aliases, common revisions, `institution_revisions` and `campus_revisions`. A campus references its parent institution. Source associations are claim-level. | `scripts/import-institution-catalogue-draft.mjs` validates one record, supports `--preview`, resolves complete aliases, reconciles sources and creates a draft or new revision without replacing the published pointer. The generic catalogue lifecycle API supports reviewable GET/list and source association, submit, verified/disputed/unavailable claim decisions, approve, reject, and publish. | `src/db/institutions.ts` and `src/app/explore/institution-page-data.ts` read published real identities. Sensitive claims are filtered unless the corresponding claim has verified provenance. The main institution directory is database-backed. A separate `/explore/institution-directory` still uses static `institution-registry.ts` and `institution-profile-data.ts`; saved/history display helpers also retain static institution-offering fixtures. |
| **Courses** | `course_revisions` references an exact field item/revision; course identity and revision are shared catalogue records. | `scripts/import-real-course-draft.mjs` supports preview, validation, identity reuse, source reconciliation, and draft/revision creation. `scripts/publish-real-course.mjs` supplies preflight, approve, and publish operations with dependency/provenance checks and expected published-pointer comparison. There is no authenticated course review lifecycle API equivalent to the generic route; claim review/publication remains a script workflow. | `src/db/courses.ts` reads published real courses and exposes a development-only demo reader. The normal courses page and course detail load published database records. |
| **Fields** | `field_revisions` stores field-specific JSON content; sources are attached to the common revision. Courses bind to a specific field revision. | `scripts/import-fields-catalogue-draft.mjs` and `scripts/sync-fields-catalogue-revised.mjs` prepare drafts/revisions. `scripts/publish-fields-catalogue-revised.mjs` directly changes revision status and the published pointer; it is not an authenticated claim-review workflow. Its inspected publication path can leave a revision `pending_review`. No field lifecycle API exists. | `src/db/fields.ts` returns published real fields and does not require the revision-level verification status to be `verified`. `/explore/fields` and field detail read these records. There is no field demo fallback in these routes. Align the Admin publication policy with the actual field data before exposing it as an ordinary workflow. |
| **Course offerings** | `course_offering_revisions` links a specific course revision and campus revision; campus links to institution. Canonical alias resolution must retain exact `external_context_key` to distinguish offerings for different courses. | Uses the institution importer and generic catalogue lifecycle API. The API validates offering context and relationships; the importer prevents aliases resolving to conflicting identities. Review and publish are separate transitions. | The published offering reader joins the current published offering, course, campus, and institution revisions. The Course → Institution journey is database-backed. It requires published real dependencies; verified-sensitive offering claims are only exposed with verified provenance. No demo offering fallback is used by this journey. |
| **Pathways** | `pathway_revisions` contains stage, course stage, grouping/category, route content; claim sources join through the shared provenance tables. | `scripts/import-real-pathway-draft.mjs` validates and previews imports. `POST /api/admin/pathways/lifecycle` supports submit, review, approve, and publish. It is separate from the generic API: no read/list endpoint, reject action, or source-association action is present there. Its review shape accepts verified claims only. | `src/db/pathways.ts` returns published real **verified** pathways. Development UI may additionally merge database demo drafts and local static examples from `route-data.ts`; production returns published records only. |
| **Examinations** | `examination_revisions` stores typed exam data; sources and claim states use shared tables. | `scripts/import-real-exam-scholarship-draft.mjs` supports preview, validation, source reconciliation, idempotent identity resolution, and new drafts/revisions. The generic lifecycle route supports reviewable GET/list, source association, submit, claim decisions, approve, reject, and publish. | `src/db/examinations.ts` requires published real and revision-level verified status for public real records. In development, the UI can add database demos and local examples from `examination-data.ts`. |
| **Scholarships** | `scholarship_revisions` stores typed provider, support, region, cycle/status, and detail data; claims use shared source links. | Uses the same importer and generic lifecycle API as examinations, with scholarship-specific validation. | `src/db/scholarships.ts` requires published real and verified status. Development may merge database demos and local examples from `scholarship-data.ts`; production returns published real verified records. |

Across importers, real imported claims remain unverified/pending review. Source metadata reconciliation supports preview/apply and normalized-URL conflict checks. It is importer plumbing, not a browser-based source registry or automated source-check service.

### Public visibility is not uniform

The readers for fields, courses, institutions, campuses, and offerings generally select published real revisions without a blanket revision-level `verification_status='verified'` condition. Institution reads have additional sensitive-claim filtering. Pathways, examinations, and scholarships explicitly require revision-level verification for published real records. Admin must present publication and verification as distinct states and must not infer that `published` means every claim is verified.

## 4. Authentication, authorization, and security findings

`src/app/auth-server.ts` calls Clerk server-side, confirms the current Clerk user, then maps the Clerk ID through `users.external_id` to an internal CareerBridge user. Client-provided user IDs, emails, or roles are not the identity proof. New account provisioning creates a Clerk-backed user with the default student role.

The legacy `users` schema has a single `role` column (default `student`); the Drizzle catalogue schema does not define application users or Admin roles. The two existing Admin APIs independently check the mapped user for `role='admin'`, Clerk provider, and non-null external ID. The generic catalogue POST also enforces same-origin requests, body size limits, strict request shapes, and server-side actor derivation. No Admin authorization gap was found in the two existing Admin API routes inspected; this is not a full application security audit.

Admin access is not managed through a UI. `scripts/bootstrap-pathway-admin.mjs` is a one-time, interactive, development-database-only owner bootstrap that verifies a Clerk private-metadata marker and refuses if an Admin already exists. It is not a general grant/revoke process.

**Deployment blocker:** both Admin lifecycle APIs call a guard that pins operations to the verified Neon development endpoint/branch and `neondb`. They are not production Admin APIs. Do not remove that guard casually; production use needs an explicitly reviewed, environment-aware target policy with independent credentials and protections.

## 5. Existing capabilities to reuse

- Shared catalogue identities, aliases, typed revisions, relationship foreign keys, source registry, and per-claim provenance.
- Domain-specific import validators and scripts with preview, duplicate/identity resolution, and source reconciliation.
- Existing lifecycle operations and concurrency/published-pointer checks where available.
- Server-only Drizzle public readers and provenance-aware transformations.
- Clerk-to-internal-user identity mapping, `getCurrentUser()`, and existing server-side Admin role checks.
- Existing loading/error/empty UI patterns and student-facing pages for end-to-end publication verification.

Do not call CLI scripts from the browser or accept arbitrary server file paths. Reuse their validation and domain operations behind an explicit, authenticated server boundary; do not make UI components write catalogue tables directly.

## 6. Gaps and genuine blockers

1. **No Admin UI:** no pages, protected layout, navigation, forms, queue, or responsive Admin components.
2. **No single write API:** generic catalogue and pathway endpoints cover only some types and transitions. Fields and courses have script-only, non-equivalent workflows.
3. **Dev-only lifecycle guard:** current APIs cannot safely serve an intended production Admin Panel.
4. **No granular permission model:** current authorization is one `admin` boolean-like role check. Contributor, reviewer, publisher, and system-administrator roles in the product requirements are targets, not implemented roles.
5. **No Admin access-management workflow:** only the one-time dev bootstrap exists.
6. **No immutable audit/event log:** current `updated_by`/`published_by` and provenance timestamps are insufficient for a full before/after decision history with reasons and correlation IDs.
7. **No source operations subsystem:** source registry metadata exists, but scheduled checks, fetch history, change detection, retry state, and parser/job management do not.
8. **Inconsistent review semantics:** the generic route supports disputed/unavailable claims and rejection but has no request-correction action or decision reason field. The pathway route only reviews verified claims and lacks reject/read/list operations. Course and field publication paths do not offer the same authenticated claim review.
9. **Verification policy differs by reader:** fields/courses/institutions/offerings and pathways/exams/scholarships do not have identical visibility rules. In particular, the field publication script can publish `pending_review` revisions. Establish the intended rule per type before making a general Publish button.
10. **Import UI and storage are absent:** current import is local JSON/script-driven. No private upload storage or file-processing boundary exists.

## 7. Proposed Admin information architecture

Build one `/admin` area with a dedicated Admin shell, shared navigation, and a narrow, task-focused information architecture. Do not create separate lifecycle implementations for every catalogue.

| Proposed route | Responsibility |
|---|---|
| `/admin` | Database-derived queue summary, drafts awaiting review, recent published revisions, and actionable failures. No hardcoded counts. |
| `/admin/catalogue` | Shared catalogue search/filter by type, lifecycle, verification, classification, source freshness, and relationship. |
| `/admin/catalogue/institutions` and `/admin/catalogue/campuses` | Institution and campus lists, create/import entry, parent-child relationships, and detail links. |
| `/admin/catalogue/courses` and `/admin/catalogue/fields` | Course/field lists, exact field relationship, lifecycle state, and static-to-canonical content boundary. |
| `/admin/catalogue/offerings` | Offerings with course, campus, institution, and exact revision dependencies visible. |
| `/admin/catalogue/pathways`, `/admin/catalogue/examinations`, `/admin/catalogue/scholarships` | Shared catalogue-list presentation over their existing distinct validation and lifecycle policies. |
| `/admin/review` | Shared queue for eligible reviewable revisions, filterable by type/status/age. |
| `/admin/review/[kind]/[itemKey]/[revisionId]` | Revision comparison, typed content, aliases, dependency pointers, claim/source matrix, validation findings, and history; expose only actions supported by that type's server workflow. |
| `/admin/sources` | Registry metadata and revision usage. Show only source operations that exist; do not imply that automated checks are available. |
| `/admin/imports` | Validate/preview a supported payload, display identity/dependency resolution and row/field errors, then explicitly create draft revisions. |
| `/admin/history` | Immutable audit events and revision timeline, once an audit store exists. |
| `/admin/access` | Role/access management for authorized system administrators, only after a supported grant/revoke model is agreed and implemented. |

Do not add empty Knowledge Base, jobs, or source-refresh screens until backing workflows and data exist. Add those later as real vertical slices.

## 8. Proposed implementation architecture

### Routes and components

- Add an Admin route tree under `src/app/admin/` with a server-rendered layout and its own navigation. Keep the existing root Clerk and account providers intact; do not reuse student navigation as Admin authorization.
- Use Server Components for protected initial reads and queue/detail data. Use Client Components only for interactive filters, editors, evidence decisions, confirmation dialogs, and progress states.
- Reuse common catalogue UI for lifecycle/status badges, source/provenance rows, revision diffs, dependency links, validation errors, tables, and accessible forms. Keep type-specific forms and validation rules separate where the schemas differ.
- Preserve semantic headings, keyboard operation, focus management, reduced motion, responsive layouts, and explicit loading/empty/error states.

### Server and database boundary

- Centralize server authorization in a server-only `requireAdmin`/permission boundary, but re-check authorization on every protected API request. A protected layout and hidden buttons are not sufficient.
- Initially align authorization with the actual single `admin` role unless/until granular roles are approved and backed by enforceable permissions. Never trust a client-supplied role.
- Keep catalogue reads in existing server-only reader modules. Keep writes in server-side application services/Route Handlers using transactions, typed input, and existing domain validators. Do not put DB clients or secrets in client bundles.
- Preserve each catalogue's real validator and lifecycle contract. Extend a shared UI around those contracts; do not force fields/courses into the generic route until their verification and lifecycle rules are resolved.
- Use the full alias identity tuple for lookup, including offering context. Imports must be idempotent, detect conflicting aliases, verify dependencies by item and revision identity, and create drafts rather than publish.
- Use the expected published revision pointer for updates/publication to prevent stale Admin forms from replacing a newer publication.
- Treat source registry metadata and claim-level provenance as distinct data. A source may support multiple claims; one claim's evidence must not imply another claim is verified.
- Use existing custom validation patterns and typed domain validators; no new validation dependency is needed for the first slice.

### Errors and states

Represent at least: unauthenticated (401/sign-in), unauthorized (403), not found (404), stale/conflicting revision (409), field/claim validation errors (422), and service/database unavailable (503). Preserve safe field-level diagnostics, never return SQL or secrets. Display unknown, unavailable, disputed, stale, and unverified distinctly; never turn missing data into a zero, an inferred value, or a successful fallback.

### Audit and sensitive operations

Before enabling Admin mutations in the UI, define an append-only event record for actor, action, target item/revision, timestamp, reason, request/correlation ID, and a minimal before/after summary. Avoid student data and credentials. Record import, source association, claim review, rejection/correction, approval, publication, and access changes. Decide transaction boundaries so a successful state change cannot silently lose its audit event.

Do not perform role grants, production writes, source fetching, or file imports from client code. Use explicit confirmation for rejection and publication and show the exact revision and current published pointer being affected.

## 9. Administrator workflows

### New record or import

1. Select the catalogue kind and validate the supported payload shape.
2. Preview without writes: resolve every alias tuple, show existing item/revision matches, detect ambiguity/duplicates, verify dependency IDs and exact revision pointers, reconcile source URLs, and report claim-level evidence gaps.
3. If identity is ambiguous, stop for human resolution. Do not create a near-duplicate identity.
4. On explicit confirmation, write one draft/revision and source/provenance links in one transaction. Imported real claims remain unverified/pending review.
5. Verify the draft via the Admin read path before review.

### Review, approval, publication

1. Compare proposed revision to the current published revision; show type-specific fields, dependencies, conflicts, source URLs, check dates, and claim statuses.
2. Review every claim against the exact listed source(s). Mark verified only when directly supported; use disputed/unavailable where the workflow supports it. Leave unsupported claims unverified and block approval/publication.
3. Approve only after required claims and typed/relationship validation pass. Keep reviewer and publisher permissions separate if the role model permits.
4. Publish using a transaction and expected current published pointer. Retain the former revision and its provenance; do not mutate it to make an update.
5. Verify the published result through the same student-facing reader and route, then retain the audit event.

### Existing AdtU example (previously completed; not re-queried during this audit)

The prior pilot used the existing AdtU institution, Panikhaiti campus, BCA course, and one course offering; it did not create duplicates. The offering identity is `assam-down-town-university--panikhaiti-campus--bca`, context `bca`, item `d873bc7f-99b6-4469-8361-f251694e4917`, revision `b82cbb9b-1a6e-4f9b-99d7-4fa60c70c647`. Its verified claims were only the official programme name and four-year duration, with the official AdtU programme URL. The campus address came from the official contact source.

The offering links exact existing course and campus revisions. The prior review also found the linked BCA course published as real while its verification status was `pending_review`; the current offering dependency validator permits a published real course without requiring course-level verified status. Do not silently tighten or loosen this rule in the UI: display the exact dependency status and resolve the policy before presenting it as a universally valid rule.

### Updates, missing information, and rejected revisions

- Keep the last-known-good published pointer while a proposed revision is reviewed.
- Use an idempotent import/content comparison to report unchanged records and create a new revision for changed content. Never re-import an identity as a workaround for revision conflicts.
- A rejected revision remains in history. Current workflows do not consistently support correction requests or rejection reasons; do not simulate these in the UI until the API contract is added.
- Keep unavailable, uncollected, disputed, and unsupported facts distinct. Do not invent fees, eligibility, seats, dates, source details, or admission claims to fill gaps.
- When a source fails, retain the previous published revision and expose a source-operation failure only if such operation state is implemented.

## 10. Implementation order

1. **Resolve security and lifecycle decisions:** define production environment targeting, the initial permission model, Admin grant/revoke ownership, rejection versus correction semantics, verification requirements per catalogue, and audit retention.
2. **Build the server Admin foundation:** shared server-side authorization helper, environment guard contract, protected Admin layout/navigation, safe error handling, and authorization tests. Keep the existing student layout unchanged.
3. **Add audit persistence before UI writes:** migration and append-only event service with tests; add reason fields and correction semantics to lifecycle APIs where decided.
4. **Deliver the first vertical slice for Institutions → Campuses → Offerings:** import preview, exact relationship/alias resolution, draft creation, review queue/detail, source/provenance review, approval, publication, and student-facing verification using the existing lifecycle rules.
5. **Bring Pathways, Examinations, and Scholarships into the shared Admin UI:** preserve their individual route/service differences; add missing read/list/reject/correction operations only as explicit API work.
6. **Resolve and implement Courses and Fields workflows:** unify authenticated review/publish semantics without reusing the fields direct-publication script or bypassing verification.
7. **Add source-registry and access-management screens only after backing permissions and data exist.** Add source checks/jobs, uploads, exports, or knowledge-base management as separate secured vertical slices, not placeholder pages.

## 11. First-version acceptance criteria

- A student, guest, or non-admin cannot load protected Admin data or mutate any Admin endpoint; the server returns safe 401/403 results.
- Every Admin mutation rechecks the server-derived Clerk identity and authorization; client-supplied actor IDs/roles are ignored.
- The supported first-slice workflow can preview, resolve duplicates/dependencies, create one draft, review each claim, approve, publish, and verify the corresponding student-facing record.
- Every source association is claim-specific. Imported real claims are not marked verified by import.
- Unverified or unsupported required claims block approval/publication; unknown and unavailable values remain explicit.
- Updating an existing identity creates a new revision; a stale expected published pointer cannot replace a newer publication; the previous published result remains available after validation or publication failure.
- Audit events capture every consequential Admin action with actor, target, time, reason, and minimal before/after information, without secrets or unnecessary student data.
- The UI provides tested loading, empty, validation, conflict, unavailable-service, and permission-denied states; is keyboard accessible and responsive.
- Relevant unit, API authorization, database integration, migration, and end-to-end tests pass. Student pages display the newly published data only through the canonical public reader.
- Admin deployment is enabled only after the development-only target guard is replaced by a reviewed environment-specific policy; development and production credentials remain separate.

## 12. Unresolved decisions

1. Should the first Admin release remain development-only, or is production administration required immediately? The current lifecycle APIs are explicitly development-targeted.
2. Is the first release intentionally one `admin` role, or must contributor/reviewer/publisher/system-admin permissions be implemented before the first production mutation?
3. Who can grant/revoke Admin access after the one-time owner bootstrap, and what verification/approval is required for that action?
4. Must self-review/self-approval be prevented in the first slice? The product requirement says this should be disallowed by default for material changes, but current APIs do not enforce a general separation-of-duties policy.
5. What constitutes a required claim for each catalogue, and can a published real dependency with `pending_review` verification support a verified offering?
6. Should rejection require a reason and return a draft for correction, or should correction always create a new revision? Pathways currently lacks rejection, and generic catalogue rejection does not accept a reason.
7. What audit-event retention, access, and before/after detail are acceptable? No dedicated audit table currently exists.
8. Are scheduled source checks and imports in the first release or later? The source registry currently has no job/fetch history or schedule model.

## 13. Files and evidence inspected

The following are code/document evidence for this blueprint; product/implementation specifications are not treated as proof that the described feature is already implemented.

- Repository guidance and product requirements: `AGENTS.md`, `README.md`, `docs/project-foundation/07_ADMIN_PANEL_REQUIREMENTS.md`, `docs/project-foundation/11_SECURITY_PRIVACY_AND_QUALITY_ASSURANCE.md`, `docs/implementation/03_DATABASE_SCHEMA_AND_MIGRATIONS.md`, `docs/implementation/04_AUTHENTICATION_AND_ACCOUNT_MIGRATION.md`, `docs/implementation/05_API_AND_SERVICE_CONTRACTS.md`, `docs/implementation/06_FRONTEND_AND_ROUTE_IMPLEMENTATION.md`, `docs/implementation/07_ADMIN_PANEL_IMPLEMENTATION.md`, `docs/implementation/15_DATA_DICTIONARY_AND_STATUS_MODELS.md`.
- App/auth routes and shell: `src/app/layout.tsx`, `src/app/explore/layout.tsx`, `src/app/explore/student-navigation.tsx`, `src/proxy.ts`, `src/app/auth-server.ts`, `src/app/auth-schema.sql`, `src/app/api/admin/catalogue/lifecycle/route.ts`, `src/app/api/admin/pathways/lifecycle/route.ts`.
- Schema, validation, and readers: `src/db/schema/catalog.ts`, `src/db/schema/student.ts`, `src/db/fields.ts`, `src/db/courses.ts`, `src/db/institutions.ts`, `src/db/pathways.ts`, `src/db/examinations.ts`, `src/db/scholarships.ts`, `src/db/catalogue-import-validation.ts`, `src/db/institution-import-validation.ts`, `src/db/course-import-validation.ts`, `src/db/pathway-import-validation.ts`, `src/db/examination-import-validation.ts`, `src/db/scholarship-import-validation.ts`, `src/db/source-reconciliation.mjs`.
- Import/lifecycle operations: `scripts/import-institution-catalogue-draft.mjs`, `scripts/import-real-course-draft.mjs`, `scripts/import-fields-catalogue-draft.mjs`, `scripts/sync-fields-catalogue-revised.mjs`, `scripts/publish-fields-catalogue-revised.mjs`, `scripts/publish-real-course.mjs`, `scripts/import-real-pathway-draft.mjs`, `scripts/import-real-exam-scholarship-draft.mjs`, `scripts/publish-real-pathway.mjs`, `scripts/bootstrap-pathway-admin.mjs`.
- Student-facing readers/fallbacks: `src/app/explore/institution-page-data.ts`, `src/app/explore/institution-directory/institution-registry.ts`, `src/app/explore/institution-directory/institution-profile-data.ts`, `src/app/explore/pathways/pathway-page-data.ts`, `src/app/explore/pathways/route-data.ts`, `src/app/explore/examinations/examination-page-data.ts`, `src/app/explore/examinations/examination-data.ts`, `src/app/explore/scholarships/scholarship-page-data.ts`, `src/app/explore/scholarships/scholarship-data.ts`, `src/app/explore/courses/page.tsx`, `src/app/explore/courses/catalog/[courseId]/page.tsx`, `src/app/explore/fields/page.tsx`, `src/app/explore/fields/[fieldId]/page.tsx`, `src/app/explore/institutions/page.tsx`.
- Existing import/lifecycle documentation: `scripts/real-pathway-publication.md`.

No database was queried, no API requests were made, no browser was used, and no tests/builds were run for this documentation-only audit.
