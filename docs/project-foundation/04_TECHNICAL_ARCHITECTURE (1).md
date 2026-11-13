# 4. Technical Architecture

## Architecture goals
Support the student web application, governed education-data operations, recommendation services, LLM + RAG, explainability and location-aware discovery. UI pages must not own scraping, recommendation logic or source validation.

## Repository baseline and confidence
The latest pushed repository was inspected during preparation. It contains a Next.js/TypeScript application and account-related API/database code, including SQL definitions for users, sessions and JSONB account data. Existing app code includes discovery, Guided Explorer, Explore catalogues and personal-data validation/synchronisation.

This is a limited repository observation, not a complete code audit, runtime test or production assessment. The complete education-data schema, Admin Panel, ingestion scheduler, recommender, RAG pipeline and production AI integrations must be inspected and verified before claiming they exist.

## Logical components
1. Web presentation: Next.js/React pages and accessible components.
2. Application/API layer: authenticated endpoints, validation and business rules.
3. Identity/access: student sessions and role-controlled admin access.
4. Relational data: canonical education records, profiles, sources, provenance, review and audit.
5. Ingestion workers: source checks, downloads, parsing, validation, change detection and retries.
6. Recommendation service: structured candidate generation consistent with Guide, Don't Decide.
7. Knowledge ingestion/retrieval: parsing, chunking, metadata, embeddings and retrieval.
8. LLM orchestration: context assembly, generation and citation validation.
9. Explainability: evidence objects derived from student answers and catalogue attributes.
10. Location service: normalized addresses/coordinates and map/route integration.
11. Admin interface: source, record, import, review, publication and operational controls.

## Boundaries
- Relational database is canonical for published structured records.
- Source documents and metadata are evidence for RAG; generated answers are not canonical records.
- Recommender generates candidates from structured data and student context, not LLM invention.
- LLM answers using retrieved evidence and structured results.
- Explainability references traceable evidence, not fabricated post-hoc reasons.
- Ingestion creates proposed changes; publication follows validation/review.
- Browser never holds privileged credentials or authorization logic.

## Data flow
Register approved source → fetch permitted material → store retrieval metadata → parse candidate facts/documents → validate schema/relationships/duplicates → compare changes → review according to risk → approve/publish → write audit history → refresh dependent search/recommendation/RAG indexes → serve published data with provenance/freshness. Fetch or parse failure must not overwrite published values.

## Technology direction
Planning context identifies Next.js, React, TypeScript and Tailwind; PostgreSQL/Neon with Drizzle ORM; and Vercel as a likely deployment target. Existing repository contains account/authentication code. Final production choices for identity provider, job runner, object storage, vector store, embedding model, LLM provider, map provider and monitoring must be confirmed from actual configuration and constraints. Do not describe a considered technology as deployed without evidence.

## APIs and services
Use typed contracts and server-side validation. Separate services for catalogue search/details, student context, saved items/progress, source registry, ingestion/review, publication, recommendations, retrieval/answer generation and location. Use pagination. Run long extraction, embedding and indexing tasks asynchronously and observe their status.

## Security and privacy
Enforce authentication/authorization server-side; least-privilege admin roles; server-side secrets; upload/API validation; origin protections; safe logging; documented retention/deletion/consent; audit consequential admin actions.

## Reliability and deployment
Use idempotent jobs and retries. Preserve last-known-good published data. Maintain separate development/test/staging/production configuration. Keep demo/test records identifiable and out of verified production content. Version migrations. Select a scheduler compatible with execution limits.

## Decisions requiring validation
Identity provider/migration; SQL/Drizzle migration conventions; background scheduler; source-document storage; vector retrieval and embedding model; LLM provider/cost/safety; Maps provider/quotas; backups, monitoring and deployment topology.
