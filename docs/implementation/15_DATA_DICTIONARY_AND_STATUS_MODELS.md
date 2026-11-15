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

`not_started`, `active`, `paused`, `completed`, `exited_early`. Storage location must be explicit (device-local or account-backed). Do not show account sync if state is only local.

## 15.9 Freshness semantics

- Last checked: source was successfully checked at this time.
- Last verified: a human or approved verification policy confirmed the fact at this time.
- Published at: this version became visible to students.
- Source publication date: date stated by source.

These timestamps are not interchangeable.

## 15.10 Missing values

Distinguish unknown/not collected, unavailable from source, not applicable, intentionally withheld and zero. Do not use zero or empty string to represent all missing cases.
