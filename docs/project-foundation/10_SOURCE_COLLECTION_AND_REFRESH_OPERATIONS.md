# 10. Source Collection and Refresh Operations

## Purpose
Define how CareerBridge discovers, collects, verifies and refreshes education information. This document complements the database and Admin requirements; it does not authorise collection methods that violate source terms or access controls.

## Source priority
1. Official APIs and structured government datasets.
2. Official downloadable datasets, prospectuses, notices and circulars.
3. Public official pages where automated access is permitted.
4. Admin-assisted manual entry when structured access is unavailable.

Third-party directories may help discover a source but should not replace authoritative evidence for consequential facts such as eligibility, fees and deadlines.

## Source register
Each source should record organisation and source name; canonical URL; source type and authority; covered categories; access method and permitted-use notes; expected update behaviour and configured check schedule; last attempted check, last successful check and last detected change; parser/adapter version and operational status; and review policy. Credentials belong in a secure secret store, never in ordinary source records or browser code.

## What to collect
For institutions/campuses: official name, type, state/district, campus/location, website, affiliation/recognition where verifiable, and source references.

For courses/offerings: course title, award/qualification, level, duration, mode, campus/institution relationship, eligibility, fees and admission details only when supported by current sources.

For examinations/scholarships: administering authority, purpose, eligibility, dates/deadlines, application route, required documents and official notice references.

For pathways: qualification transitions, prerequisite rules and authoritative references. Do not infer a formal pathway from a marketing description.

## Refresh policy
Use category schedules as initial defaults, then tune them to observed source behaviour and urgency:
- Stable institution identity/address: quarterly or on announced change.
- Course availability: quarterly; monthly during active admission periods.
- Eligibility and qualification rules: quarterly; monthly during active periods.
- Fees/admission details: monthly; weekly during active admission periods.
- Admission/exam/scholarship notices and deadlines: weekly; daily near critical windows where the source and infrastructure support it.
- Pathway rules: every six months or on official change.
- Knowledge-base documents: weekly/event-triggered checks where feasible.
- General field descriptions: every 6–12 months or on substantive change.

A schedule is a check frequency, not a claim that the source publishes new data at that frequency. Avoid unnecessary requests and respect rate limits.

## Collection and review lifecycle
Source registration → scheduled/manual fetch → retrieval metadata → parsing → validation → duplicate/relationship checks → change detection → review queue → approval → publication → audit → search/recommendation/RAG refresh.

A parser failure, timeout, empty response or unexpected page change must not clear existing published data. Record the failure, retain last-known-good values and alert an administrator where appropriate.

## Change sensitivity
Changes to deadlines, fees, eligibility, recognition and application links are consequential and should receive explicit evidence review before publication. Low-risk metadata may use a lighter review policy only after that policy is defined and audited.

## Evidence requirements
Retain source URL, source title/authority, retrieval timestamp, publication/effective date where available, relevant excerpt or document version where permitted, parsed value, reviewer and decision. For changing fields, track provenance and checked date at field level where practical.

## Responsible collection
- Do not bypass authentication, access controls, CAPTCHAs, anti-bot protections or technical restrictions.
- Do not ignore website terms, robots guidance or applicable law.
- Prefer official APIs, downloads, feeds and documented access routes.
- Store copies only when permitted and necessary.
- Provide manual collection/review fallback when automated access is unreliable.
- Do not present search-engine snippets as verified records.

## Operational measures
Track source coverage, successful/failed checks, parser error rate, stale high-impact fields, review queue age, detected changes awaiting approval, duplicate rate and publication corrections. Use these measures to improve collection quality rather than maximising record count.
