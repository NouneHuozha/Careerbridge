# 2. Product Requirements

This document defines target behaviour, not a claim that each requirement is already implemented.

## Student discovery
- Explain that students do not need to have a career decision already.
- Capture Class 10 or Class 12 stage at the appropriate initial step.
- Allow optional activities/interests where defined by the discovery flow.
- Present possible fields with clear reasons grounded in actual responses.
- Offer independent exploration and Guided Explorer.
- Reuse known stage/context instead of repeatedly asking for it.

## Guided Explorer
- Student-facing name: Guided Explorer. It is an optional self-guided question experience, not a human counselling service.
- Ask one question at a time; allow appropriate back, skip, edit and exit actions.
- Save progress according to the persistence design and explain where it is saved.
- Explore interests, curiosity, learning/subjects, strengths and future preferences.
- Treat uncertainty, skipped and ambiguous answers as valid.
- Completion leads to the shared Explore experience with relevant evidence retained.
- Do not show numeric counselling progress or claim a conclusive career assessment.

## Explore
The shared Explore area supports Fields, Courses, Institutions, Pathways, Examinations and Scholarships. It should provide useful starting points and general browsing. Guided-derived possibilities may appear alongside general content; do not create a separate dead-end guided homepage.

## Fields
- Explain fields in accessible language.
- Avoid overwhelming students with long grids of narrow subfields immediately after a broad-field selection.
- Provide next actions such as Courses, Institutions and Pathways.
- Reuse one shared field-content source across directory, dialog and detail experiences.
- Guided possibility details may include a concise “based on what you shared” evidence section without rewriting factual field content.

## Courses
- Shared catalogue direction: /explore/courses/catalog, with optional field and stage context.
- Support Class 10/Class 12 relevance, search and useful filters.
- Course details explain qualification/eligibility and duration where verified.
- Link courses to institutions and actual course offerings.
- Never invent eligibility or imply every institution offers a course.

## Institutions
Keep two distinct use cases: general institution directory/profile, and course-specific institutions/offering details. Support all eight Northeast states, campuses, addresses and geographic coordinates. Sparse information should be shown honestly, not padded. Maps are useful on institution/location details, not mandatory on every listing card.

## Pathways, examinations and scholarships
Provide listings and meaningful detail experiences. Explain eligibility, qualifications, application steps and deadlines only where supported by sources. Show source and checked date for time-sensitive information. Distinguish upcoming, open, expired, unknown and unverified states using reliable dates. Avoid oversized filters that distract from discovery.

## Saved items and progress
Support saving and revisiting defined catalogue items where implemented. Preserve item identity and relevant context. Protect account data with authenticated access and server-side validation. Do not imply folders, sharing, notes or other unapproved capabilities.

## Recommendations
Use structured student context and catalogue attributes to identify options worth exploring. Provide explanations grounded in actual answers and verified option attributes. Present alternatives and uncertainty. Do not expose a score as a definitive measure of suitability. The LLM must not invent catalogue records, eligibility, fees, deadlines or rationale.

## AI assistant
- Accept natural-language education/career questions.
- Retrieve approved knowledge before answering factual or time-sensitive questions.
- Identify source documents used.
- State when reliable evidence is insufficient.
- Distinguish general explanation from current institution-specific information.
- Respect known student context without asking for it again.

## Admin and data operations
Admin is a core platform capability. It must support role-controlled access; dashboard; catalogue management; source registry; manual entry; CSV/XLSX import with preview and validation; duplicate and relationship checks; draft/review/approval/publication/archive; detected-change review; document ingestion and RAG indexing; audit history and job-error reporting.

## Data quality
Relevant records must represent real/demo/test classification, source identity and URL, source publication/effective date where available, last checked and verified timestamps, verification and publication states, and change history. Distinguish verified, awaiting verification, unavailable, not collected, demo/test, expired and superseded as appropriate.

## Non-functional requirements
Security and server-side authorization; privacy and data minimisation; reliable ingestion that preserves last-known-good data; traceable AI claims; accessibility; maintainable shared schemas; pagination/search; asynchronous long-running jobs; and operational monitoring.

## Out of scope unless separately approved
Human counselling appointments, job-placement guarantees, paid counselling/paid AI advice, social networking, public user reviews, custom saved folders/sharing/notes and native mobile apps are not assumed to be current scope.

## Acceptance principle
A page rendering is not sufficient. Requirements include data correctness, permissions, validation, source/freshness behaviour, empty/error states, integration and appropriate tests or recorded manual verification.
