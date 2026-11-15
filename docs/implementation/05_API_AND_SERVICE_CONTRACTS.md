# 5. API and Service Contracts

## 5.1 Principles

API routes are transport boundaries. Business rules belong in application/domain services. Validate all input and output boundaries. Enforce authentication and authorization on the server. Keep response shapes stable and version changes deliberately.

## 5.2 API groups

- Authentication/account context (Clerk-backed).
- Student discovery and Guided Explorer persistence where approved.
- Catalogue read/search: fields, courses, institutions, campuses, offerings, pathways, examinations and scholarships.
- Saved/history/next steps.
- Recommendation requests and evidence.
- Assistant/RAG queries.
- Location/map provider requests where server-side use is required.
- Admin CRUD/review/publication/import/source/job/knowledge-base operations.

## 5.3 Response conventions

Use consistent success envelopes or documented resource responses. Errors should contain a stable machine-readable code, safe message and optional field errors/correlation ID. Do not expose SQL, stack traces, provider secrets or internal prompts.

## 5.4 Pagination and filtering

Use bounded pagination. Validate page size and sort fields. Whitelist filter/sort keys. Preserve query context such as `field`, `stage` and `course` where routes require it. Avoid unbounded list endpoints.

## 5.5 Authorization

Every student-owned read/write derives owner identity from the authenticated server context. Admin endpoints check role and specific permission for each operation. Never trust user ID, role or publication status supplied by the client.

## 5.6 Idempotency

Use idempotency keys or stable job/import identifiers for expensive/retryable writes. Webhooks and background jobs must tolerate duplicate delivery. Publication and import actions must not create duplicate records when retried.

## 5.7 Rate limits

Apply stricter limits to sign-in-related actions, AI requests, imports, exports, source refresh triggers and expensive searches. Limits should be configurable and observable.

## 5.8 Service interfaces

Define application services for catalogue search, institution offering lookup, source review/publication, recommendation, explanation, RAG answer generation, account data and location requests. Services should receive typed inputs and return typed domain results; provider SDK response types should not leak into UI components.

## 5.9 API documentation

Maintain route/method, auth requirement, permission, request schema, response schema, error cases, idempotency and tests in the relevant implementation module. Add OpenAPI only if it materially helps integration; do not create an unmaintained spec.
