# 4. Technical Architecture

## 4.1 Agreed direction

Next.js, React, TypeScript, Tailwind CSS, Neon PostgreSQL, Drizzle ORM, Clerk, Google Maps Platform and Vercel deployment direction. Current code does not yet contain all integrations. Open provider choices must be evaluated and logged: LLM, embeddings, vector retrieval, background jobs, object storage and monitoring.

## 4.2 Architecture style

Begin with a modular application, not unnecessary microservices. Keep domain logic, application services, data access, external adapters and background jobs separated so components can be extracted later if operational evidence requires it.

## 4.3 Layers

- **Presentation:** student and Admin pages, forms, navigation, accessible UI.
- **Application/API:** request handling, validation, auth context, authorization, orchestration and response contracts.
- **Domain:** discovery, Guided Explorer, catalogue, source governance, publication, recommendations and student-account rules.
- **Data access:** Drizzle schema, typed queries, transactions and migrations.
- **Integrations:** Clerk, Neon connection, Maps, LLM, embeddings, storage and job provider.
- **Background processing:** source refresh, imports, parsing, document extraction, embeddings, indexing and maintenance.

Pages must not own scraping, migrations, recommendation algorithms or AI orchestration.

## 4.4 Domains

Identity/accounts; student discovery; Guided Explorer; education catalogue; saved/history/next steps; source governance; recommendations; XAI; knowledge base/RAG; LLM assistant; location; Admin.

## 4.5 Canonical data boundaries

PostgreSQL holds canonical structured facts. Source documents retain evidence and feed RAG. RAG chunks are not automatically verified structured records. ML uses structured student context and catalogue attributes. LLM generates answers using retrieved evidence. XAI references actual answer and catalogue evidence. Admin controls review/publication.

## 4.6 Ingestion flow

Official source or permitted import → source registry → collection → parse → validate → duplicate/change detection → review → approval → publication → dependent search/recommendation/RAG refresh. Failed collection must preserve last-known-good published values.

## 4.7 AI boundaries

ML must not invent catalogue records. LLM must not invent current fees, deadlines or eligibility. RAG must retrieve traceable approved evidence. XAI must explain actual evidence, not create plausible reasons after selection. Guided Explorer is rule-based and separate from the LLM.

## 4.8 Database and ORM

Neon is the hosted PostgreSQL direction; PostgreSQL is the database system; Drizzle is the ORM/schema/migration tooling; a driver/adapter connects the application. Current code uses `pg` directly. Introduce Drizzle with a compatible adapter after checking runtime, transactions and deployment constraints. Drizzle does not eliminate SQL; migrations remain versioned and may contain SQL.

## 4.9 Authentication

Clerk is the agreed authentication direction. Preserve existing student/account data. Establish stable Clerk-user-to-application-user mapping. Replace custom sessions only after integration and migration verification. Enforce role authorization on the server. Do not delete existing auth tables prematurely.

## 4.10 Background jobs

Long-running refresh, import, extraction and embedding work must not run in normal page requests. The selected job provider must support schedules, retries, idempotency, failure state, observability and safe reprocessing, and must be compatible with the deployment runtime. Provider remains open.

## 4.11 Maps

Store institution/campus address and coordinates with provenance. Use Google Maps Platform for supported map and route features. Do not require exact home address for general browsing. Never invent route metrics.

## 4.12 Deployment and reliability

Vercel is the deployment direction. Validate Neon connection behaviour, Drizzle adapter, Clerk configuration, background jobs, storage, scheduled tasks, environment separation, backups and provider limits before production. Keep secrets server-side. Use migrations, idempotent jobs, last-known-good data, monitoring and recovery procedures.
