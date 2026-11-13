# 8. Development Roadmap

## Delivery rule
Build the complete core system from the beginning. Milestones manage complexity and validation; they must not be used to omit core requirements or defer their architecture. The agreed project plan is the source of truth. Preserve compatible code, adjust partially aligned code and rebuild fundamentally conflicting parts.

## Stage 0 — Documentation and repository audit
Inventory routes, components, data sources, APIs, tables, dependencies and tests. Compare them with target flows/requirements. Classify each area as keep, adjust, rebuild, missing or needs verification. Identify stale docs and contradictory instructions. Confirm environment/deployment constraints.

**Exit:** agreed requirements and traceable implementation-gap list. Do not claim a feature works without evidence.

## Stage 1 — Core foundation
Confirm database/migration strategy; define domain entities and relationships; establish student/admin identity and server-side authorization; define API/service conventions; source provenance, verification and publication states; audit events and background-job interfaces; and contracts for recommender, LLM, RAG, XAI and location.

**Exit:** schema and service boundaries support the full target system, not only the first module.

## Stage 2 — Institution data vertical slice
Register official sources; collect initial real Nagaland institution data; implement institution/campus schema and location fields; build Admin create/import, validation, duplicate detection and review; publish approved records; connect general institution directory/profiles to published DB data; preserve general profile versus course offering.

**Exit:** end-to-end institution data flow works with provenance and audit. Schema supports all eight states even if coverage is partial.

## Stage 3 — Remaining education catalogue
Build courses/offerings, fields/shared field content, pathways, examinations and scholarships; import templates/source mappings; student catalogue APIs and route realignment; empty, stale, unavailable and error states.

**Exit:** student pages consume approved published records rather than duplicated hardcoded production arrays.

## Stage 4 — Data collection/update operations
Implement source-specific schedules and job runner; API/download/monitoring/manual adapters; change detection/review; retries/failure handling/alerts; freshness and stale-data handling; Admin operational views. This can begin alongside the institution slice.

## Stage 5 — AI core integration
Implement structured content-based recommender; interaction model and collaborative capability with honest limits until enough real interactions exist; student evidence/explanation service; knowledge ingestion/versioning; RAG retrieval and source-grounded LLM; citation/uncertainty behaviour; Admin knowledge-base controls and re-indexing.

**Exit:** recommendations and answers are testable, traceable and consistent with Guide, Don't Decide.

## Stage 6 — Location intelligence
Store institution/campus geography from the foundation. Integrate map display and route/distance/travel-time services; disclose limitations; validate provider coverage and quotas. Map UI/provider integration may follow the data foundation.

## Stage 7 — Student frontend realignment
Realign Discover/results, Guided Explorer/completion, shared Explore, fields, courses, institutions, pathways, exams, scholarships, Saved and My Next Steps as their requirements are finalised. Do not blindly rewrite the whole frontend before target flows and data contracts are clear.

## Stage 8 — Testing and evaluation
Unit tests for domain/validation; integration tests for APIs, permissions, ingestion and publication; end-to-end student/admin journeys; data-quality/source-change tests; RAG retrieval/citation and unsupported-answer tests; recommender/explanation evaluation; accessibility, performance and security checks; student usability evaluation with consent.

## Sequencing
Do not repair the entire frontend as a preliminary project and do not build Admin in isolation. Audit and design first, establish backend foundations, then complete vertical slices in which Admin entry, verification, publication and student consumption work together. AI architecture and contracts are foundational and AI implementation proceeds alongside data foundations.

## Definition of done
A module is complete only when requirements, data model, permissions, validation, source/freshness behaviour, empty/error states, integration and tests are addressed. A visually complete page backed by unverified hardcoded records is not a completed data feature.
