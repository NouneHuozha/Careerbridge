# Independent Review — CareerBridge Institutions Import & Reader Design

**Review date:** 23 November 2026  
**Auditor:** Antigravity (Independent Clean-Room Review)  
**Target Document:** `docs/review/institutions-import-design.md`  
**Reference Documents & Context:**
- `docs/review/institutions-import-readiness.md`
- `docs/review/institutions-import-readiness-independent-review.md`
- `docs/review/institutions-development-db-verification.md`
- `docs/review/institutions-schema-safety-review.md`
- `src/db/schema/catalog.ts`
- `drizzle/0000_initial-schema.sql`
- Source modules in `src/app/explore/institution-directory/` and `src/app/explore/institutions/`

---

## 1. Executive Summary & Verdict

### Overall Verdict: Approve with corrections

The proposed design in `institutions-import-design.md` is **approved with specific corrections**.

The author has successfully addressed the primary architectural risks and database constraints identified across prior review phases:
1. **Preserves Existing Identities:** It rejects destructive alias re-pointing and instead models new campus-qualified keys as secondary aliases on the existing 44 seeded `course_offering` identities.
2. **Honors Database Immutability Triggers:** It explicitly accounts for `prevent_published_revision_update` and `prevent_published_typed_revision_update` by specifying a strict no-op on content match and revision increment on content change, banning in-place `UPDATE` operations on published records.
3. **Eliminates Route Ambiguity:** It proposes canonical detail routing by stable catalogue UUID (`/explore/institutions/offers/[catalogItemId]`) and gates legacy slug-based routes on strict 1:1 resolution.
4. **Enforces Strict Database Predicates:** It keeps demo, draft, and unverified data off public surfaces using SQL WHERE/JOIN conditions enforcing `published_revision_id`, `publication_status = 'published'`, and `data_classification = 'real'`.
5. **No Database Migrations Required:** It confirms that the existing Drizzle schema (`src/db/schema/catalog.ts`) and triggers in `0000_initial-schema.sql` completely support the entity hierarchy, JSONB payloads, and claim-level provenance.

However, **four specific architectural and operational corrections must be resolved** before implementation begins. Most notably, the proposed reader rule requiring offering foreign keys to strictly match active course and campus published pointers introduces an unviable cascading invalidation risk during routine campus contact or course syllabus updates.

---

## 2. Evaluation Against the Nine Review Objectives

### 1. Preservation of Existing Identities
- **Finding:** **Fully Satisfied.**
- **Details:** The design preserves the 21 seeded institution identities and accounts for the 44 seeded `course_offering` identities (21 contextless legacy keys and 23 course-only keys). Rather than blindly minting new deterministic UUIDs and stranding existing records, it mandates a reviewed manifest and attaches secondary campus-qualified aliases to existing `catalog_items`.

### 2. Alias Migration Strategy
- **Finding:** **Fully Satisfied.**
- **Details:** The alias strategy operates within the constraints of `catalog_item_aliases` (composite PK `(source_system, external_type, external_key, external_context_key)`). It preserves legacy contextless and course-only keys as backwards-compatibility aliases, ensuring saved items and exploration history do not break. Ambiguous multi-campus course-only aliases fail closed until human resolution.

### 3. Content Hashing, Revision Creation, and Immutability
- **Finding:** **Fully Satisfied.**
- **Details:** Computes a normalized SHA-256 fingerprint over common fields, typed JSONB payloads, and normalized source inputs (excluding volatile IDs, timestamps, and lifecycle statuses). It branches cleanly:
  - Exact match with current published revision: no-op (no revision created).
  - Content change: inserts `MAX(revision_number) + 1` in `draft` status.
  - Published revisions and typed rows are never updated in place.

### 4. Course Revision Dependencies and Prerequisites
- **Finding:** **Satisfied with One Critical Correction (Finding 1 below).**
- **Details:** Correctly identifies that all 38 course revisions in development are `demo`/`draft`/`unverified` and cannot satisfy real offering prerequisites. However, the proposed requirement that `course_revision_id` and `campus_revision_id` must continuously equal the *current* published pointer of the parent creates a severe operational failure mode.

### 5. Transaction Boundaries, Idempotency, Retries, and Recovery
- **Finding:** **Fully Satisfied.**
- **Details:** Boundaries are atomic per institution aggregate, followed by dependent offering transactions. Row locks on `catalog_items` serialize revision number increments. Concurrency retries are bounded and restricted to deadlocks/serialization errors. Reruns are idempotent via alias resolution and content fingerprints. Recovery is strictly forward-only.

### 6. Public Reader Safeguards and Leakage Prevention
- **Finding:** **Fully Satisfied.**
- **Details:** Enforces all predicates in SQL joins: `published_revision_id = id`, `publication_status = 'published'`, and `data_classification = 'real'`. Demo queries are isolated in separate functions protected by a fail-closed environment guard (`NODE_ENV === 'development'` and non-hosted only).

### 7. Unambiguous Offering Identifiers and Frontend Routes
- **Finding:** **Fully Satisfied.**
- **Details:** Identifies that static offerings currently share their parent institution’s slug (`offering.slug === institution.slug`), causing collisions when one institution offers multiple courses. Resolves this by establishing `/explore/institutions/offers/[catalogItemId]` as the canonical route and treating legacy `[slug]?course=...` as a compatibility resolver that fails closed on ambiguity.

### 8. Testing Rigor and Verification Guarantees
- **Finding:** **Fully Satisfied.**
- **Details:** Three-layer testing strategy:
  1. Focused unit tests (alias construction, hashing, route resolution, demo guards).
  2. Disposable PostgreSQL integration tests (never against Neon: testing atomicity, trigger immutability, rollback, concurrent revision increments).
  3. Reader leakage acceptance tests (verifying exclusion of draft, demo, test, wrong-owner, and unverified data).

### 9. Schema Sufficiency and Underlying Assumptions
- **Finding:** **Fully Satisfied.**
- **Details:** Confirms that no DDL changes, index changes, or database migrations are required. Correctly identifies that application-level validation must enforce JSONB structure, route uniqueness, and claim-level evidence gates.

---

## 3. Findings Ranked by Severity

### Critical (P0 — Design Defects & Systemic Risks)

#### Finding 1: Strict Upstream Pointer Matching Causes Cascading Offering Invalidation
- **Location:** Section "Course dependencies", line 168.
- **Issue:** The design recommends: *"Require an offering's referenced course and campus revision IDs to equal the current published pointers for those identities... A changed course or campus revision therefore requires compatible offering revisions to be prepared and promoted in the same publication transaction; otherwise the affected offering is temporarily omitted..."*
- **Impact:** In production, if an administrator publishes a minor correction to a campus (e.g. updating an office phone number, directions URL, or facility badge), `campus.published_revision_id` advances. Under this rule, **every course offering at that campus will instantly and silently disappear from student-facing search and directory routes** until each offering is re-drafted, re-referenced, and re-published. The same cascade occurs globally if a course revision is updated.
- **Database Reality:** The database foreign key `course_offering_revisions_course_revision_fk` and composite key `(course_item_id, course_revision_id)` enforce that the referenced revision belongs to the item and was validly published. The database intentionally decouples offering revisions from pointer tracking so that published historical revisions remain immutable and valid until explicitly upgraded.
- **Correction:** Relax the reader query predicate:
  - An offering is eligible if its referenced `course_revision_id` and `campus_revision_id` are both `publication_status = 'published'` AND `data_classification = 'real'`.
  - It does **not** need to equal the current active pointer of the parent item to remain visible.
  - Implement an administrative staleness audit (or optional warning flag) to notify curators when an offering points to an older published course/campus revision, rather than unpublishing the offering from student view.

---

### High (P1 — Ambiguities & Incomplete Contracts)

#### Finding 2: Lack of Explicit Escaping Specification for Compound Alias Keys
- **Location:** Section "Identity and alias migration strategy", lines 95–96.
- **Issue:** The design proposes campus keys as `<institution-id>/<campus-id>` and offering context keys as `<course-id>/<campus-id>`. It notes that an "encoded/versioned segment format" should be used, but leaves the exact delimiter escaping rule undefined.
- **Impact:** If an institution, campus, or course identifier contains a delimiter (such as a slash or hyphen), splitting or parsing keys during reverse-lookup or legacy compatibility matching becomes ambiguous.
- **Correction:** Explicitly define the compound key encoding contract in the design specification:
  - Format: `encodeURIComponent(segmentA) + ":" + encodeURIComponent(segmentB)` (or a fixed length-prefixed format).
  - Disallow raw slashes in `external_key` and `external_context_key`.

#### Finding 3: Ambiguous Policy for Rendering Unverified Claims
- **Location:** Section "Missing and unverified content", lines 214–216, and "Unresolved decisions", line 329.
- **Issue:** The design permits public readers to render unverified claims with an explicit "not verified" badge, but leaves high-impact claims (fees, eligibility, admission deadlines) as an "open product decision".
- **Impact:** In the source data, Kohima and St. Edmund's have 100% unverified facts. If the reader displays unverified fee schedules or eligibility criteria with small disclaimer badges, students may rely on speculative or outdated requirements.
- **Correction:** Formalize a strict two-tier claim policy in the design:
  1. *Descriptive profile facts (establishment year, accreditation, general intro):* Permitted to display with an explicit "Unverified Claim" badge if source evidence is pending.
  2. *High-stakes actionable facts (tuition fees, eligibility criteria, application deadlines, bank details):* **Hard gate.** Reader must withhold these fields completely (omitted from response payload) unless `catalog_revision_sources.verification_status = 'verified'` with a non-null `verified_at` timestamp.

---

### Medium (P2 — Implementation Sequencing & Phasing)

#### Finding 4: Conflation of Offline Importer Engineering with Live Ingestion
- **Location:** Section "Explicit implementation order", lines 336–346.
- **Issue:** Step 1 requires approving identity decisions, Step 2 requires development preflight, and Step 4 requires real source evidence and published real courses before building the importer in Step 5.
- **Impact:** This unnecessarily blocks software engineers from building and testing the core importer, validators, hash canonicalizers, and reader modules (`src/db/institutions.ts`) against mock data and disposable PostgreSQL while editorial curation of real data is ongoing.
- **Correction:** Formally decouple the implementation into two distinct phases:
  - **Phase A (Code Implementation & Automated Verification):** Build `src/db/institutions.ts`, import validation parsers, canonical hashing, and disposable test suites using mock datasets.
  - **Phase B (Live Target Preflight, Ingestion & Controlled Publication):** Re-verify Neon development branch, inventory live aliases, ingest reviewed real institutions as `draft`, and gate publication on real course readiness.

---

## 4. Matrix: Verified Facts vs. Recommendations vs. Assumptions

| Item | Status | Evaluation |
|---|---|---|
| **Zero migrations needed** | **Verified Fact** | Verified against `src/db/schema/catalog.ts` and `drizzle/0000_initial-schema.sql`. |
| **Immutability triggers prevent in-place UPDATE** | **Verified Fact** | Triggers `prevent_published_revision_update` and `prevent_published_typed_revision_update` exist and are active. |
| **Development courses are unpublished demo drafts** | **Reported Fact** | Verified from development DB snapshot (20 Nov 2026); blocks real offering publication. |
| **44 seeded offering identities exist in Neon** | **Reported Fact** | 21 contextless, 23 course-only; must be preserved via secondary aliases. |
| **Offering detail route by `[catalogItemId]`** | **Recommendation** | Sound architectural recommendation to eliminate slug collision. |
| **SHA-256 fingerprint without new schema column** | **Recommendation** | Sound recommendation; stored fields suffice for recomputation. |
| **Strict pointer equality for course/campus FKs** | **Recommendation** | **Defective recommendation (Finding 1); must be corrected.** |
| **Delimiter encoding format for aliases** | **Assumption / Open** | Requires explicit specification before coding (Finding 2). |
| **High-stakes unverified claim display policy** | **Assumption / Open** | Requires two-tier withholding rule (Finding 3). |

---

## 5. Specific Required Corrections to the Design Document

Before code implementation commences, update `docs/review/institutions-import-design.md` with the following revisions:

1. **Section "Course dependencies" (line 168):** Replace the recommendation for strict pointer equality (`offering.course_revision_id === course.published_revision_id`) with:
   > *"The reader requires that `course_revision_id` and `campus_revision_id` reference revisions that are `publication_status = 'published'` and `data_classification = 'real'`. They do not need to strictly equal the current active published pointer of the course or campus identity. Upstream revisions that supersede older published revisions will flag offerings for curator review rather than abruptly unpublishing them from student view."*

2. **Section "Identity and alias migration strategy" (line 96):** Specify the exact encoding convention:
   > *"Campus alias keys must be structured as `careerbridge:campus:<institution_slug>:<campus_id>`. Offering context keys must be structured as `<course_slug>:<campus_id>`. Individual segments must be URI-encoded to prevent delimiter collisions."*

3. **Section "Missing and unverified content" (line 214):** Insert the two-tier claim policy:
   > *"Descriptive metadata may be displayed with an unverified badge. Actionable financial and admission facts (fees, eligibility, deadlines) must be withheld by the reader unless backed by a verified provenance record with a valid `verified_at` date."*

4. **Section "Explicit implementation order" (line 336):** Separate Phase A (code, readers, offline tests) from Phase B (Neon preflight, live data curation, controlled publication).

---

## 6. Implementation Safety Verdict

### Can implementation safely begin?

**YES — with the scope partitioned as follows:**

1. **Permitted to begin immediately (Phase A):**
   - Writing `src/db/institutions.ts` (readers, SQL join predicates, error boundaries).
   - Writing the offline importer validation engine, recursive canonical JSON hasher, and dry-run report generator.
   - Writing comprehensive unit and disposable PostgreSQL integration tests.
   - Updating frontend route handlers to support canonical `/explore/institutions/offers/[catalogItemId]` routes and ambiguity-safe resolvers.

2. **Strictly blocked until Phase A is verified and editorial gates are cleared (Phase B):**
   - Connecting to Neon or performing any live database writes.
   - Importing real institution revisions into development (blocked until real sources are curated).
   - Publishing real course offerings (blocked until real course revisions are published).
   - Touching or retiring existing seeded offering aliases in Neon.
