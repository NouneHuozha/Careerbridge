# 15. Data Dictionary and Status Models

## 15.1 Purpose

This document defines shared vocabulary and status semantics. Physical columns and exact enums are implemented in Drizzle schema and must stay aligned here.

## 15.2 Common metadata

Where applicable: `id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `data_classification`, `verification_status`, `publication_status`, source relationships and audit references. Use UTC timestamps in storage; format for the user's locale in the UI.

## 15.3 Data classification

- `real`: sourced real-world record.
- `demo`: illustrative demonstration record.
- `test`: automated/manual test fixture.

Do not interpret `real` as verified. Classification and verification are separate.

## 15.4 Verification status vocabulary

Suggested values: `not_collected`, `unverified`, `pending_review`, `verified`, `partially_verified`, `disputed`, `unavailable`, `stale`, `expired`, `superseded`. Exact persisted enum may be normalised during schema design, but meanings must remain distinct.

## 15.5 Publication status vocabulary

Suggested values: `draft`, `in_review`, `approved`, `published`, `archived`, `rejected`. Approval does not automatically mean publication unless the workflow explicitly combines them.

## 15.6 Source check status

`queued`, `running`, `succeeded`, `no_change`, `change_detected`, `failed`, `blocked`, `cancelled`. A failed check does not change the published record's verification date.

## 15.7 Knowledge document status

Track document lifecycle separately from catalogue publication: `registered`, `retrieved`, `extraction_pending`, `extracted`, `review_required`, `approved_for_index`, `indexing`, `indexed`, `failed`, `superseded`, `withdrawn`.

## 15.8 Guided Explorer states

Persisted session statuses are `active`, `paused`, and `completed`. Active and paused sessions require `current_question_id`; completed sessions require it to be `NULL`. An early-completed session stores its continuation point in `resume_question_id`, which must reference a question at the session's current path position. Question traversal is represented once in `guided_explorer_session_questions.state`: `pending`, `asked`, or `skipped`.

Answer response states are `answered`, `unsure`, `none`, and `declined`. `declined` means the student selected the existing decline option; it does not mean the question was skipped. During account-data backfill, map legacy answer `responseState: "skip"` to `declined`, while translating `skippedQuestionIds` to question-row `state: "skipped"`. Preserve `original_text` as non-null text, including the existing empty-string value.

Storage location must be explicit (device-local or account-backed). Do not show account sync if state is only local.

## 15.9 Freshness semantics

- Last checked: source was successfully checked at this time.
- Last verified: a human or approved verification policy confirmed the fact at this time.
- Published at: this version became visible to students.
- Source publication date: date stated by source.

These timestamps are not interchangeable.

## 15.10 Missing values

Distinguish unknown/not collected, unavailable from source, not applicable, intentionally withheld and zero. Do not use zero or empty string to represent all missing cases.

## 15.11 Discover answers and student context

`discover_answers.answers` stores the complete `DiscoveryAnswers` JSON object. The database requires an object with an `activityIds` array of at most three entries but allows additional properties. `schema_version` is stored separately and must be positive.

Saved items and exploration history use `(user_id, catalog_item_id)` as their unique identity. Nullable `context` JSONB is descriptive context, not identity; preserve SQL `NULL` separately from an empty object. Resolve legacy keys through the full `catalog_item_aliases` key. For `institution-offering`, include `context.courseId` or the empty string in `external_context_key`, ensuring course-specific offerings resolve to distinct catalogue identities.

## 15.12 Source registry values

`source_registry.source_type` allows `official_api`, `structured_government_dataset`, `official_download`, `official_public_web_page`, and `admin_manual_entry`. Registry status allows `active`, `paused`, and `retired`; it is not a source-fetch job status.

`canonical_url` accepts an absolute HTTP(S) URL. `normalized_url` lowercases the scheme and hostname, removes the corresponding default port and fragment, and turns an empty path into `/`. It preserves path case, trailing slash, and query order/content. Uniqueness is enforced on the normalized value.
