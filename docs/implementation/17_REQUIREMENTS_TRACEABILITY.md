# 17. Requirements Traceability

## 17.1 Purpose

Trace each requirement from product foundation to implementation, tests and release evidence. This prevents requirements from disappearing during development and prevents planned features being described as complete.

## 17.2 Traceability fields

For each requirement record:

- Requirement ID.
- Description.
- Source document/section.
- Priority and scope.
- Related route/domain/service/schema.
- Implementation owner.
- Status (planned/in progress/implemented/verified/blocked/deprecated).
- Test IDs.
- Evidence link (PR, commit, test run or operational record).
- Known limitations.

## 17.3 Initial requirement groups

- `DISC`: Discover and Results.
- `GUIDE`: Guided Explorer.
- `EXP`: Shared Explore and catalogue navigation.
- `FIELD`: Fields.
- `COURSE`: Courses and offerings.
- `INST`: Institutions and campuses.
- `PATH`: Pathways.
- `EXAM`: Examinations.
- `SCH`: Scholarships.
- `SAVE`: Saved/History/Next Steps.
- `AUTH`: Identity, account and authorization.
- `DATA`: Sources, ingestion, provenance and publication.
- `ADMIN`: Admin workflows.
- `ML`: Recommendation.
- `XAI`: Explainability.
- `RAG`: Knowledge base and assistant.
- `MAP`: Location intelligence.
- `I18N`: Multilingual support.
- `SEC`: Security and privacy.
- `OPS`: Deployment and operations.

## 17.4 Completion evidence

A requirement is `implemented` when code exists and is integrated. It is `verified` only when relevant tests or operational checks pass and evidence is recorded. A screenshot alone does not verify data integrity, authorization or backend behaviour.

## 17.5 Change control

When a requirement changes, update its source foundation document, decision log if material, implementation specification, traceability row and affected tests. Do not silently change implementation while leaving requirements contradictory.
