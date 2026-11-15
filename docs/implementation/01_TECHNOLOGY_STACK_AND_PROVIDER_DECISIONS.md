# 1. Technology Stack and Provider Decisions

## 1.1 Confirmed stack direction

| Concern | Target | Decision |
|---|---|---|
| Web framework | Next.js | Confirmed |
| UI | React | Confirmed |
| Language | TypeScript | Confirmed |
| Styling | Tailwind CSS | Confirmed |
| Relational database | PostgreSQL hosted on Neon | Confirmed |
| ORM/schema | Drizzle ORM | Confirmed |
| Authentication | Clerk | Confirmed |
| Maps | Google Maps Platform | Confirmed |
| Deployment | Vercel direction | Confirmed |

These are target decisions. The current repository may not yet contain all integrations.

## 1.2 Terminology

PostgreSQL is the database engine. Neon is the hosted PostgreSQL provider. Drizzle is the TypeScript ORM/schema/migration toolkit. A driver/adapter connects the runtime to PostgreSQL. Clerk provides identity/authentication; CareerBridge still owns application roles and domain data.

## 1.3 Existing baseline

The inspected repository uses `pg` and `DATABASE_URL`, custom authentication and manually maintained SQL. A tracked connection string does not prove which host is used. Confirm the local endpoint from a sanitized hostname/project reference only; never share or commit the full connection string.

## 1.4 Adapter decision

Before choosing Drizzle's Neon HTTP/serverless or node-postgres adapter, verify Next.js runtime, transaction requirements, connection pooling, migration execution and Vercel deployment behaviour. Record the selected adapter and reason in the decision log. Do not install both alternatives without need.

## 1.5 Open provider evaluations

### LLM
Compare factuality, tool/API support, language performance (English/Hindi/Manipuri), privacy/data controls, latency, rate limits, price and model/version stability.

### Embeddings
Compare multilingual retrieval, domain terminology, dimension/cost, versioning, batch limits and data handling.

### Vector retrieval
Compare PostgreSQL extension, managed vector service and other viable options for filtering, metadata, scale, backup, latency, operational burden and cost. No vector product is preselected by this document.

### Background jobs
Require schedules, retries, idempotency, concurrency control, observability, dead-letter/failure visibility and compatibility with Vercel/Next.js.

### Object storage
Require private access, signed URLs, file size limits, retention/deletion, encryption, lifecycle policy and reasonable cost.

### Monitoring
Require error reporting, performance traces, alerting, privacy controls and retention configuration.

## 1.6 Dependency policy

Add a dependency only when a documented feature needs it. Check maintenance, licence, security posture, runtime compatibility and bundle impact. Pin/lock dependencies and review upgrades. Never add a provider SDK merely because it is popular.

## 1.7 Environment variables

Use `.env.example` with names and safe placeholders only. Expected categories include database URL, Clerk publishable/secret keys and webhook secret, Google Maps browser/server keys as applicable, LLM/embedding credentials, storage credentials, job signing secrets and monitoring DSN. Exact names must match implementation. Never include real values in docs or Git.
