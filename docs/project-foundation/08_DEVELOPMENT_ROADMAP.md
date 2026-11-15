# 8. Development Roadmap

## 8.1 Delivery rule

Build the complete core architecture incrementally. Phases manage complexity; they must not be used to omit or indefinitely defer Admin, real data governance, ML, RAG, XAI or location architecture. The agreed plan is authoritative over incompatible existing code. Preserve compatible work, refactor partially aligned work and replace conflicting work when necessary.

## 8.2 Stage 0 — Documentation and alignment

Audit routes, components, shared data, database/auth, dependencies, tests, data provenance and Admin gaps. Classify each area Keep, Adjust, Rebuild, Missing or Needs verification. Complete implementation specifications and traceability. Exit: target is clear and contradictions/open decisions are recorded.

## 8.3 Stage 1 — Technical foundation

Align application structure; introduce Drizzle and versioned migrations; configure Neon environments; integrate Clerk; design Clerk-to-application-user mapping; migrate existing accounts/data safely; establish role authorization; define API/service contracts; set up validation, error handling, logging, testing and deployment environments. Exit: existing account data preserved; auth and DB flows tested; no secrets committed.

## 8.4 Stage 2 — Data model and Admin vertical slice

Implement geography, institution, campus, course, offering, field, pathway, examination, scholarship, source, verification, publication and audit models. Build Admin roles and institution end-to-end workflow. Implement CSV/XLSX preview/validation/import. Exit: an approved real institution record reaches the student directory through the governed DB workflow.

## 8.5 Stage 3 — Student experience alignment

Align Discover, Results, Guided Explorer and shared Explore with approved flows. Consolidate field data. Canonicalise course route. Separate general institution and course-offering flows. Implement Saved, History and student-controlled Next Steps to requirements. Exit: User 1 flow works end-to-end with no duplicate/conflicting data source.

## 8.6 Stage 4 — Real catalogue coverage and source operations

Collect and verify initial real data, beginning with the agreed initial region while supporting all eight states. Implement source registry, refresh jobs, candidate change review, publication, freshness and failure preservation. Exit: source-to-publication workflow is observable and tested.

## 8.7 Stage 5 — ML and XAI

Implement content-based recommendation, candidate/evidence contracts, answer-state handling, explainability and evaluation harness. Prepare collaborative signals without claiming performance before adequate real data. Exit: each personalised surfaced option has defensible evidence and tests.

## 8.8 Stage 6 — RAG and LLM assistant

Select and record providers/embedding/vector implementation. Implement document lifecycle, retrieval, source references, grounded answers, refusal/uncertainty, prompt-injection controls, cost/rate limits and evaluation. Exit: answers are traceable and unsupported-answer behaviour is tested.

## 8.9 Stage 7 — Location and multilingual support

Integrate Google Maps Platform, validated campus coordinates, maps and route features. Implement English/Hindi/Manipuri localisation progressively and evaluate translation/retrieval quality. Exit: map claims are provider-backed and language fallbacks are clear.

## 8.10 Stage 8 — Hardening and evaluation

Complete accessibility, responsive, security, load, backup/restore, monitoring, data quality and real-student evaluation. Fix issues before release. Exit: release checklist passes and limitations are documented.

## 8.11 Stage completion rule

A stage is not complete because pages exist. Require working integration, data integrity, permission tests, error/recovery behaviour, documented evidence and acceptance tests. Record actual status; never claim tests/build pass unless run.
