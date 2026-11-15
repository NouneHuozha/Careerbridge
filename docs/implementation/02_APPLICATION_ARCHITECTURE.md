# 2. Application Architecture

## 2.1 Goal

Keep the Next.js application modular. Do not place domain logic in page components or build microservices without demonstrated need.

## 2.2 Suggested source boundaries

Use the existing repository conventions where sound, but establish clear boundaries such as:

- `src/app/`: route entry points and route handlers.
- `src/components/`: reusable presentation components.
- `src/features/`: feature-specific UI and application workflows.
- `src/server/`: server-only services and orchestration.
- `src/domain/`: domain types and pure rules.
- `src/db/`: Drizzle schema, connection and repositories.
- `src/integrations/`: Clerk, Maps, LLM, embeddings, storage and job adapters.
- `src/jobs/`: background job definitions.
- `src/lib/`: small cross-cutting utilities only.

This is a target boundary, not an instruction to move every file blindly. Inventory imports and route dependencies before refactoring.

## 2.3 Dependency direction

Presentation → application services → domain/repositories → integrations. Domain rules should not import Next.js UI, provider SDKs or database clients. Provider adapters implement interfaces consumed by application services.

## 2.4 Server/client separation

Database clients, secret-bearing SDKs, authorization checks, source ingestion and AI orchestration are server-only. Client components receive only the data needed to render and interact. Never expose server environment variables or admin-only data in client bundles.

## 2.5 Error model

Use typed application errors for validation, unauthenticated, forbidden, not found, conflict, rate limit, provider unavailable and unexpected failures. Map them to safe API/UI states. Log correlation IDs and safe metadata; do not expose stack traces or secrets to students.

## 2.6 Validation

Validate at every external boundary: forms, route handlers, webhooks, imports, provider responses and background job payloads. The schema-validation library is an implementation choice and must be selected consistently; do not assume one until approved.

## 2.7 Shared domain contracts

Define shared types for entity IDs, catalogue status, provenance, pagination, source references, recommendation evidence and API errors. Avoid duplicated field definitions in multiple pages.

## 2.8 Observability

Record request/job correlation IDs, duration, outcome and safe error category. Avoid logging passwords, tokens, full student answers or connection strings. Add metrics for ingestion, indexing, AI latency/cost and failed jobs once the monitoring provider is selected.

## 2.9 Architecture tests

Add checks that prevent client imports of server-only modules, domain imports of UI/provider SDKs and duplicated canonical data definitions. Document exceptions.
