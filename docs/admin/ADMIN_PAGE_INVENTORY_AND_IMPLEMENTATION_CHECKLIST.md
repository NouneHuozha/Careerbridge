# Admin Page Inventory and Implementation Checklist

**Status checked:** 2026-11-27
**Purpose:** Consolidate the approved Admin wireframes, current route coverage, and remaining frontend work. This is a UI inventory, not evidence that every workflow is backed by live data or APIs.

The earlier [Admin architecture and implementation plan](./ADMIN_ARCHITECTURE_AND_IMPLEMENTATION_PLAN.md) remains useful for authentication, lifecycle, audit, and data-governance constraints. Its route proposal predates the current Admin UI; use this inventory for current screen coverage.

## Status key

- **UI present** — a route/component exists; data connectivity and workflow behavior must still be checked separately.
- **Preview-only** — interactions or records are illustrative/local and do not persist or perform external work.
- **Not built** — no route or screen exists yet.
- **Known gap** — the wireframe requires a screen/type not represented by the current route or category model.

## Main navigation

| Section | Current route | Status | Scope |
|---|---|---|---|
| Overview | `/admin` | UI present | Admin dashboard and recent activity. Confirm each metric's source before presenting it as live. |
| Catalogue | `/admin/catalogue` | UI present; known gap | Browse catalogue types and records, inspect details and revisions, and open contextual activity. |
| Data Intake | `/admin/data-intake` | Preview-only | Spreadsheet, manual-entry, and research-assisted draft preparation previews. No upload, fetch, job creation, or record writes. |
| Review Queue | `/admin/review` | UI present | Queue and claim-review workspace. Show only actions supported by the relevant server lifecycle. |
| Sources | `/admin/sources` | UI present; preview-only operations | Source registry and maintenance views. A registered source does not imply automated fetching or change detection. |
| Audit History | `/admin/audit` | Preview-only | Illustrative lifecycle event directory and event details; not a general system log. |
| Settings | `/admin/settings` | UI present | Small account and personal workspace-preference area. Preferences are stored in this browser and do not sync across devices. |

## Page and route inventory

### 1. Overview

| View | Route | Status / acceptance note |
|---|---|---|
| Admin dashboard | `/admin` | UI present. Keep the full-width shell, useful catalogue/review context, quick actions, and recent activity. Never label sample values as live counts. |

### 2. Catalogue

| View | Route | Status / acceptance note |
|---|---|---|
| Catalogue directory | `/admin/catalogue` | UI present. Search and type navigation should use the existing shared catalogue presentation. |
| Category directory | `/admin/catalogue/[category]` (plus `/admin/catalogue/courses`) | UI present for the current category definitions: courses, institutions, campuses, course offerings, pathways, examinations, and scholarships. |
| Record details | `/admin/catalogue/[category]/[id]` | UI present. Preserve record identity, current revision, source/evidence, relationships, and lifecycle state. |
| Edit draft revision | `/admin/catalogue/[category]/[id]/edit` | UI present. Do not edit published data in place or bypass revision/lifecycle rules. |
| Review record revision | `/admin/catalogue/[category]/[id]/review` | UI present. Claim-level evidence and type-specific lifecycle support remain authoritative. |
| Compare revisions | `/admin/catalogue/[category]/[id]/compare` | UI present. Show only available revision data; do not invent before/after fields. |
| Record activity | `/admin/catalogue/[category]/[id]/activity` | UI present as the contextual audit-history view. |
| **Fields directory/detail** | Proposed `/admin/catalogue/fields` | **Known gap.** The current Admin category slug/preview definitions do not include Fields, despite Fields being in the wider product requirements and Settings wireframe. Confirm the field editor contract and lifecycle before adding this route; do not treat a dynamic unknown category as a working Fields page. |

### 3. Data Intake

| View | Route | Status / acceptance note |
|---|---|---|
| Intake overview and shared lifecycle | `/admin/data-intake` | Preview-only. Show all three entry methods and their convergence on draft preparation → review → approval/publication. |
| Spreadsheet import | `/admin/data-intake/import` | Preview-only, five local steps: choose type/file, map columns, validate/correct sample rows, choose duplicate handling, and inspect an example summary. The selected file's contents are not read or uploaded. |
| Manual type chooser | `/admin/data-intake/manual` | Preview-only. Offers Field, Course, Institution, Pathway, Examination, and Scholarship; Campuses and Course Offerings are related-record workflows. |
| Type-specific manual form | `/admin/data-intake/manual/[recordType]` | Preview-only. Reuses available Catalogue field definitions and source/evidence concepts; Fields currently has only a minimal name/description form because no Admin Fields schema is defined. |
| Research request | `/admin/data-intake/research` | Preview-only. A source URL is displayed as information only; no source is fetched and no background job is started. |
| Candidate claim review | `/admin/data-intake/research/review` | Preview-only. Review/edit/accept/discard applies only to local sample state; candidate acceptance is not verification or publication. |
| Intake history | `/admin/data-intake/history` | Preview-only example entries; manual form previews are not recorded as jobs. |
| Intake job details | `/admin/data-intake/history/[jobId]` | Preview-only example metadata/results; no job or report is persisted. |

### 4. Review Queue

| View | Route | Status / acceptance note |
|---|---|---|
| Submitted revisions queue | `/admin/review` | UI present. Counts, records, evidence, status, filters, and actions must reflect actual reviewable revisions when connected. |
| Claim review workspace | `/admin/review/[category]/[id]` | UI present. Assess each claim against its own evidence; keep approval separate from publication; do not allow direct edits to published records. |

### 5. Sources

| View | Route | Status / acceptance note |
|---|---|---|
| Sources directory | `/admin/sources` | UI present with preview source data. |
| Register source | `/admin/sources/new` | UI present; do not imply that registration authorizes scraping or automated checking. |
| Source details | `/admin/sources/[sourceId]` | UI present; linked claims and records should remain claim/record specific. |
| Edit source | `/admin/sources/[sourceId]/edit` | UI present. Metadata changes must not silently change historical claim assessments. |
| Source check history | `/admin/sources/[sourceId]/history` | UI present; attempt history is illustrative unless backed by persisted checks. |
| Check attempt details | `/admin/sources/[sourceId]/history/[attemptId]` | UI present; no fabricated fetch outcome or error details. |
| Source maintenance | `/admin/sources/maintenance` | UI present; no automated freshness, scheduling, or change detection is implied. |

### 6. Audit History

| View | Route | Status / acceptance note |
|---|---|---|
| Audit events directory | `/admin/audit` | Preview-only. Describe lifecycle events only; do not imply failed attempts or field-level snapshots are recorded. |
| Audit event details | `/admin/audit/[eventId]` | Preview-only. Show actor, action, target, revision, and timestamp only when present in the event. |
| Record activity history | `/admin/catalogue/[category]/[id]/activity` | Contextual route listed under Catalogue; share the same audit scope and limitations. |

### 7. Settings

Keep Settings as one small Admin section. Do not add role-management, system-configuration, or security-management pages.

| View | Proposed route | Required content and behavior |
|---|---|---|
| Settings overview | `/admin/settings` | UI present. Two destinations: Admin Account and Workspace Preferences. |
| Admin Account | `/admin/settings/account` | UI present. Read the signed-in identity and role from existing auth/account data; manage account details through Clerk and sign out through the existing flow. |
| Workspace Preferences | `/admin/settings/preferences` | UI present. Defaults: **25** records, **DD MMM YYYY**, and **Comfortable** density. Compact is also available; saving gives explicit feedback. |

**Preference persistence:** preferences are browser-local and do not sync across devices. Do not store credentials, API keys, database settings, authorization policy, or publication permissions here.

**Explicit exclusions:** Admin role grants, field-schema editing, import validation rules, source-fetching rules, secrets, and publication permissions stay in their respective product/server boundaries—not Settings.

## Remaining implementation checklist

### Before starting the next page work

- [ ] Reconcile the current Catalogue UI with the wider Fields requirement and agree on the Field editor/category contract.
- [ ] Verify which existing Overview, Catalogue, Review Queue, Sources, and Audit data/actions are connected versus illustrative; preserve an explicit preview label for anything static.
- [ ] Keep the existing server-side Admin authorization as the security boundary. Current authorization checks the Clerk-linked user and the database `admin` role; Settings must not edit or simulate that role.

### Settings acceptance

- [x] Settings overview, Admin Account, and Workspace Preferences use the Admin shell.
- [x] Account identity and actions reuse the existing Clerk account flow.
- [x] Browser-local preferences use the specified defaults and apply page-size, date-format, and density changes to Admin views.
- [x] Settings excludes role management, secrets, source-fetching, import-policy, and publication-permission controls.
- [ ] Add focused tests for provider account actions and complete keyboard/mobile acceptance.

### Cross-section acceptance

- [ ] Verify the sidebar, active item, page title, breadcrumb, full-width layout, and collapsible mobile navigation across all inventory routes.
- [ ] Check loading, empty, error, and permission-denied states; confirm accessible labels, focus visibility, and table overflow handling.
- [ ] Make preview/live status unambiguous. No example counts, jobs, sources, audit events, or account details should appear as real data.
- [ ] Keep frontend-only work read-only with respect to Neon and production. Do not upload sample files, fetch source URLs, or write catalogue records.
- [ ] Run targeted tests, typecheck, lint, and browser acceptance. Defer production build while `.next/dev/lock` exists; retry after the development server has shut down normally.

## Current next step

Resolve the Catalogue Fields gap. Do not expand Settings into role or system administration, and do not start backend wiring as part of this inventory task.
