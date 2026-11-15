# 12. Implementation Alignment and Open Decisions

## 12.1 Purpose

This document separates agreed target architecture from observed repository implementation. It must be refreshed after each major alignment milestone.

## 12.2 Repository baseline observed during documentation review

Repository: `NouneHuozha/Careerbridge`, branch `main`.

Observed package direction includes Next.js 16.4.3, React 19.3.0, TypeScript, Tailwind CSS 4 and `pg`. Drizzle and Clerk were not present in the inspected package manifest. The application contains custom password/session logic and a manually maintained SQL schema with users, auth_sessions and account_data. The account_data design uses JSONB for several student data categories.

The inspected route inventory included student discovery, Guided Explorer, Explore catalogues, Saved/History/Next Steps and informational pages. No Admin route was found in the inspected route inventory. This is a repository snapshot, not a claim about unpushed local changes.

## 12.3 Alignment table

| Area | Agreed target | Observed baseline | Required action |
|---|---|---|---|
| Frontend | Next.js/React/TS/Tailwind | Present | Keep and align |
| Database | Neon PostgreSQL | Generic PostgreSQL via `pg`; host not proven by tracked code | Confirm local endpoint privately; configure Neon target |
| ORM | Drizzle | Not in inspected manifest | Introduce schema/query/migrations |
| Auth | Clerk | Custom password/session implementation | Migrate identity and preserve account data |
| Schema | Relational domain model with selective JSONB | Small manual schema and broad account JSONB | Design and migrate structured entities |
| Admin | Core governed workflow | No Admin route found | Build Admin vertical slice |
| Catalogue data | Real sourced governed records | Existing static/demo/unverified data present | Audit, classify and migrate verified records |
| AI | ML + LLM/RAG + XAI | Not established as complete integration | Implement distinct services and evaluations |
| Maps | Google Maps Platform | Verify actual integration before claiming | Implement provider-backed features |
| Deployment | Vercel direction | Must verify project configuration | Configure and validate |

## 12.4 Migration principles

Do not delete existing custom-auth tables or account data before Clerk integration, identity mapping, migration and verification. Use staged migration, backups, reconciliation counts and rollback plans. Drizzle adoption must not cause data loss. Preserve valid student saves/history/progress where their current semantics remain approved.

## 12.5 Open decisions

The following are genuinely open until evaluated and logged:

- LLM provider/model.
- Embedding provider/model.
- Vector retrieval implementation.
- Background-job provider.
- File/object storage provider.
- Monitoring/error-reporting provider.
- Exact Drizzle driver/adapter for the chosen runtime.
- Detailed retention periods and consent language.
- Exact Admin role claims/synchronization implementation.

Do not ask again whether Neon, Drizzle or Clerk are intended target choices; they are recorded as confirmed direction. Do verify whether local deployment credentials/projects already exist without exposing secrets.

## 12.6 Status vocabulary

- Planned: documented target, not implemented.
- In progress: implementation has started but acceptance is incomplete.
- Implemented: code exists and is integrated.
- Verified: relevant tests or operational checks have been run successfully.
- Blocked: dependency or decision prevents progress.
- Deprecated: retained only for migration/compatibility and scheduled for removal.

A checked-in document is not evidence that a feature is implemented.
