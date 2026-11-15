# 9. Decision Log

This log records material decisions. New decisions must include date, status, rationale, impact and superseded decision where relevant. Do not convert an open technical choice into a confirmed decision by implication.

| ID | Decision | Status | Notes |
|---|---|---|---|
| D-001 | The approved project plan is the source of truth; code must be aligned to it. | Confirmed | Existing implementation does not redefine product scope. |
| D-002 | Product principle is GUIDE, DON'T DECIDE. | Confirmed | No career verdicts, forced paths or unexplained match authority. |
| D-003 | Current student stage scope is Class 10 and Class 12. | Confirmed | Do not add result-status variants without approval. |
| D-004 | Current active student flow is User 1, the unsure student. | Confirmed | User 2/3 are outside current active scope. |
| D-005 | Guided Explorer is optional, self-guided and rule-based. | Confirmed | Not human counselling or paid AI counselling. |
| D-006 | Independent and guided journeys share `/explore`. | Confirmed | Context differs; homepage remains shared. |
| D-007 | Institution discovery supports all eight Northeast states. | Confirmed | Initial real collection may begin in Nagaland. |
| D-008 | Real sourced data is primary; demo/test data is labelled and separate. | Confirmed | No fabricated records or facts. |
| D-009 | Admin/data governance is a core system capability. | Confirmed | Not a later optional add-on. |
| D-010 | Hybrid ML, LLM+RAG and XAI are distinct cooperating components. | Confirmed | Guided Explorer remains rule-based. |
| D-011 | Student-facing recommendation language remains exploratory. | Confirmed | Reasons must be evidence-grounded. |
| D-012 | Current course catalogue direction is `/explore/courses/catalog`. | Confirmed | Preserve field/stage query context. |
| D-013 | General institution profiles and course-specific offerings are separate journeys/data relationships. | Confirmed | Institution, campus and offering are distinct. |
| D-014 | Planned platform languages are English, Hindi and Manipuri. | Confirmed | Quality must be evaluated; do not overclaim coverage. |
| D-015 | Database direction is Neon PostgreSQL. | Confirmed target | Actual current connection endpoint must be checked locally; never expose secrets. |
| D-016 | ORM direction is Drizzle ORM. | Confirmed target | Not installed in the inspected package manifest. |
| D-017 | Authentication direction is Clerk. | Confirmed target | Current repo has custom auth; migrate without data loss. |
| D-018 | Frontend direction is Next.js, React, TypeScript and Tailwind CSS. | Confirmed | Present in current repository. |
| D-019 | Google Maps Platform is the location integration direction. | Confirmed target | Verify API/product selection and billing/security configuration before use. |
| D-020 | Vercel is the deployment direction. | Confirmed target | Validate runtime, jobs, DB and storage compatibility. |
| D-021 | LLM provider is not yet selected. | Open | Compare quality, language support, privacy, cost and API stability. |
| D-022 | Embedding provider/model is not yet selected. | Open | Evaluate multilingual retrieval and versioning. |
| D-023 | Vector retrieval implementation is not yet selected. | Open | Compare PostgreSQL extension and managed alternatives; do not assume pgvector. |
| D-024 | Background-job provider is not yet selected. | Open | Must support scheduling, retries, idempotency and deployment compatibility. |
| D-025 | File/object storage provider is not yet selected. | Open | Evaluate document size, access control, retention and cost. |
| D-026 | Monitoring/error-reporting provider is not yet selected. | Open | Evaluate privacy, alerting, retention and cost. |
| D-027 | Collaborative filtering architecture is planned, but performance claims require real interaction data. | Confirmed | Synthetic data only validates implementation. |
| D-028 | Student home address is not required for general institution discovery. | Confirmed | Use minimum necessary location precision. |
| D-029 | Current implementation status must be reported honestly. | Confirmed | A plan is not proof of implementation or testing. |

## Decision change process

Propose change → explain reason and alternatives → assess product/data/security/operational impact → obtain owner approval → add a new decision entry → update affected foundation and implementation documents → update traceability → implement and test. Do not silently rewrite an earlier decision.
