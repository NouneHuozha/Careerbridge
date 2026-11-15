# 11. Security, Privacy and Quality Assurance

## 11.1 Security principles

Use least privilege, defence in depth, server-side authorization, secret isolation, input validation, secure session handling through Clerk, auditable admin actions and privacy minimisation.

## 11.2 Identity and authorization

Clerk is the agreed authentication direction. Authentication proves identity; CareerBridge authorization decides what that identity may do. Enforce student ownership and Admin role/permission checks on the server for every protected operation. Never rely on hidden UI controls or client-provided role values. Map Clerk identities to internal application users using stable identifiers and verified webhook/synchronization logic.

## 11.3 Student privacy

Collect only data necessary for a stated feature. Explain optional inputs. Avoid exact home address for general institution discovery. Protect discovery answers, saved items, history and next steps as private student data. Provide approved data access/deletion/export controls and document retention rules. Do not put secrets or sensitive student data in logs.

## 11.4 Secrets and integrations

Keep DB, Clerk, Maps, LLM, embedding, storage and job credentials server-side. Use separate development/staging/production credentials. Rotate compromised credentials. Restrict API keys by application/API where supported. Never commit `.env` files or paste connection strings into issues/docs.

## 11.5 API and application security

Validate all inputs at trust boundaries. Enforce authorization on every read/write. Use parameterized/typed DB access. Apply rate limits to authentication, AI and expensive operations. Protect state-changing routes against CSRF where relevant. Configure secure cookie/session behaviour through the selected auth integration. Prevent mass assignment and unsafe object access. Avoid exposing stack traces or secrets to clients.

## 11.6 Admin security

Separate contributor, reviewer, publisher and system-admin permissions. Require server-side checks and audit high-impact actions. Protect role changes, source configuration, publication and exports. Reviewers should not silently approve their own material changes by default.

## 11.7 AI security

Treat retrieved documents and user input as untrusted. Defend against prompt injection. Do not allow retrieved text to change system instructions or authorization. Do not expose another student's data through retrieval. Validate citations against retrieved evidence. Apply rate/cost controls and safe failure behaviour.

## 11.8 Data integrity

Use migrations, foreign keys, uniqueness constraints, transactions and validation. Preserve last-known-good records. Use idempotent imports/jobs. Separate real/demo/test data. Audit publication and important changes. Back up and test restore.

## 11.9 Quality assurance

Test unit/domain rules, API/service contracts, database constraints/migrations, authentication, authorization, student flows, Admin workflows, ingestion, AI retrieval/explanations, maps, localization, accessibility, responsive layouts and recovery paths.

## 11.10 Minimum test categories

- Unit tests for domain logic and validation.
- Integration tests for DB, auth and services.
- API tests for permissions and response contracts.
- End-to-end tests for Discover → Results → Guided/independent → Explore.
- Admin vertical-slice tests from draft to publication.
- Migration/data-preservation tests.
- Source failure/last-known-good tests.
- RAG citation and unsupported-answer tests.
- XAI evidence-faithfulness tests.
- Accessibility and responsive checks.
- Backup/restore drills.

## 11.11 Release quality gate

No release based solely on pages rendering. Require passing build/typecheck/lint and relevant tests, verified migrations, permission checks, source/data quality review, secrets scan, backup/restore evidence, operational monitoring and documented known limitations. Do not report checks as passed unless actually executed.
