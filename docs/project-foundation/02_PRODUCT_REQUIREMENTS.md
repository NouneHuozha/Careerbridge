# 2. Product Requirements

## 2.1 Scope and terminology

Current student scope is Class 10 and Class 12, with active focus on User 1 (unsure student). Stage is captured once in Discover/onboarding and reused. These are target requirements, not claims about implementation status.

## 2.2 Discover and results

`/discover` reassures students, captures Class 10/12 and accepts optional activities/interests. It explains why information is requested and avoids unnecessary personal data.

`/discover/results` presents possible fields, “Your choices”, field cards and a Learn more interaction, Browse all fields, and two equally weighted choices: “Explore on my own” and “Explore with guidance”/Guided Explorer. Each personalised possibility must explain why it appears using actual answers. A generic field list is not a personalised result.

## 2.3 Guided Explorer

Guided Explorer is optional, self-guided and rule-based. It is not human counselling, paid AI counselling, a career prediction or a definitive assessment. It asks one question at a time and may adapt follow-ups across Interests, Curiosity, Learning/subjects, Strengths and Future preferences. Support Back, Skip, Continue, Edit, Exit and Save/Finish for now. Not every question is mandatory. No numeric progress percentage or definitive career verdict.

Support no-session, active, paused, completed and early-exit states. If stored in local storage, tell students it is saved on their device and not synchronised to their account. Never claim account sync until implemented and approved.

## 2.4 Shared Explore

`/explore` is the common destination for independent browsing and students returning from Guided Explorer. It must work with full, partial or absent personalisation context. It includes Fields, Courses, Institutions, Pathways, Examinations and Scholarships. General browsing remains available; do not show an “unknown answers” warning or require Guided Explorer.

## 2.5 Fields

Use one canonical field-content source across directory dialogs and detail pages. Explain broad fields simply and provide Courses, Institutions and Pathways as next actions. Do not overwhelm students with large narrow-subfield grids immediately after selecting a broad field. Guided field details may show a concise “Based on what you shared” evidence section without rewriting factual field content.

## 2.6 Courses

Canonical direction: `/explore/courses/catalog`, with optional `field` and `stage` query context. Support search, useful filters, Class 10/12 context, qualification, duration where verified, details and actual institution offerings. A course definition is distinct from an institution/campus offering. Never invent eligibility, duration, fees or availability.

## 2.7 Institutions

Support all eight Northeast states. Separate general institution discovery from course-specific offering discovery:

- General: `/explore/institution-directory` and `/explore/institution-directory/[slug]`.
- Course-specific: `/explore/institutions?course=...` and `/explore/institutions/[slug]?course=...`.

Institution, campus and course offering are separate entities. Listing cards should support comparison; maps belong primarily on relevant detail/location pages. Sparse profiles must remain honest. Do not invent facilities, history or promotional claims.

## 2.8 Pathways, examinations and scholarships

Each has listing and detail experiences. Pathways explain possible qualification progressions without implying one mandatory route. Examination details include authority, purpose, eligibility, application process, dates and official sources where verified. Scholarship details include provider, purpose, eligibility, benefits, documents, application steps, deadline and official source where verified. Time-sensitive claims show freshness. Never infer eligibility without adequate evidence.

## 2.9 Saved, History and My Next Steps

Saved allows private revisiting of supported catalogue items, stable item identity, duplicate prevention and handling unavailable/expired records. Do not imply folders, sharing or notes unless approved.

History is private to the student and supports revisit/removal according to account controls.

My Next Steps tracks actions selected by the student. It must not prescribe a career sequence or automatically decide what the student should do.

## 2.10 ML recommender and XAI

Surface potentially relevant fields, courses and institutions using structured student context and catalogue attributes. Treat skipped, uncertain and missing answers distinctly. Do not interpret missing as a negative preference. Preserve evidence and provide careful explanations tied to actual answers and attributes. No deterministic career verdict or unexplained student-facing match score.

## 2.11 LLM and RAG

Support natural-language questions and source-grounded answers. Prefer current approved structured records for current facts and RAG for official document detail. Cite sources, preserve dates, acknowledge missing/conflicting evidence and avoid fabricated URLs, eligibility, fees and deadlines. Model memory alone is not a source of current official facts.

## 2.12 Location

Support institution/campus address and coordinates, map display, distance and provider-backed travel time/routes. Do not require exact home address for general discovery. Use only location precision necessary for a requested feature and explain its use. Never invent route metrics.

## 2.13 Admin Panel

Core requirement. Support Dashboard, Institutions, Campuses, Courses/Offerings, Fields, Pathways, Examinations, Scholarships, Sources/Checks, Imports/Exports, Review/Publication, Knowledge Base, Jobs/Errors, Audit History and Users/Roles. Every consequential action is permission-controlled and audited. Admin data is not published directly from an unreviewed import.

## 2.14 Data governance

Every relevant record supports real/demo/test classification, provenance, checked/verified dates, verification state, publication state and change metadata. Time-sensitive fields may require field-level provenance. Imported/scraped changes enter review according to risk. Failed collection preserves last-known-good data.

## 2.15 Non-functional requirements

Privacy, secure authentication, server-side authorization, accessibility, responsive UI, reliable ingestion, traceability, freshness, typed/validated APIs, background processing, monitoring, backups, recovery, testable business logic and clear loading/empty/error states.

## 2.16 Out of scope unless separately approved

Human counselling appointments, paid AI counselling, career/job-placement guarantees, social networking, public student profiles, public reviews, saved folders, sharing saved lists, personal notes and native mobile apps.

## 2.17 Acceptance rule

A page rendering is insufficient. Verify data correctness, relationships, validation, permissions, provenance/freshness, loading/empty/error/recovery states, accessibility, responsive interaction, integration and relevant tests.
