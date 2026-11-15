# 10. Source Collection and Refresh Operations

## 10.1 Purpose

Define how CareerBridge discovers, checks, imports, reviews and updates public education information without silently publishing unreliable data.

## 10.2 Source priority

1. Official APIs and structured government datasets.
2. Official downloadable datasets, notices and prospectuses.
3. Permitted public official web pages.
4. Admin-assisted manual entry/import.

Third-party summaries may help discovery but must not replace authoritative evidence for material claims.

## 10.3 Permitted access

Respect site terms, robots/access rules, rate limits and applicable law. Do not bypass logins, CAPTCHAs, paywalls, anti-bot controls or technical restrictions. Prefer official feeds/downloads. Record the access method and permitted-use notes.

## 10.4 Source registry

Record source name, authority, canonical URL, category, data types, access method, terms/notes, expected update behaviour, refresh schedule, last attempted/successful check, last detected change, parser/adapter version and source status. Store credentials only in secure secrets management.

## 10.5 Refresh schedule defaults

Institution identity/campus/address: quarterly and event-triggered. Course availability: quarterly, monthly during admissions. Eligibility: quarterly, monthly during active periods. Fees/admission: monthly, weekly during active admission. Admission/exam/scholarship notices: weekly, daily near deadlines where feasible. Pathway rules: six-monthly and event-triggered. Knowledge documents: weekly/event-triggered. General field descriptions: every 6–12 months. Tune to source behaviour, urgency, rate limits and cost.

## 10.6 Collection pipeline

Schedule/trigger → fetch permitted content → record HTTP/retrieval metadata → store raw response/document where allowed → parse → normalize → validate → detect duplicates and changes → create candidate update → review according to risk → approve/reject → publish → update search/recommendation/RAG indexes → audit outcome.

## 10.7 Change detection

Compare normalized facts and source/document versions. Record old value, proposed value, source, retrieval time and confidence/parse status. A parser returning empty or malformed content is not evidence that the published value should be deleted.

## 10.8 Review policy

Material changes to fees, eligibility, deadlines, recognition, course availability and scholarship benefits require human review unless a separately approved high-confidence policy exists. Low-risk stable metadata may use a documented policy, but all publication remains auditable.

## 10.9 Failure handling

On timeout, blocked response, parser failure, unexpected page structure or empty extraction: mark check failed, preserve last-known-good data, alert/queue review as appropriate, apply bounded retries and avoid repeated aggressive requests. Do not reset checked/verified dates to imply success.

## 10.10 Imports

CSV/XLSX imports use templates, preview, validation, duplicate detection, source metadata, dry run and row-level errors. Imported changes enter review. Record uploader, file hash, import time, mapping version and outcome. Do not publish directly from a raw import.

## 10.11 Freshness display

Use field-level freshness for time-sensitive details where available. Distinguish verified/current, checked but unverified, stale, unavailable and not collected. “Last checked” is not the same as “verified”. Display source and checked date where useful to students.

## 10.12 Reprocessing and audit

Every job has an ID, source, start/end, status, parser version, counts, error summary and retry relationship. Reprocessing must be idempotent. Preserve source snapshots and audit records according to retention policy.
