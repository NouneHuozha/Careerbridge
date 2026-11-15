# 14. Testing, Evaluation and Release

## 14.1 Test layers

- Unit: pure domain rules, validators, recommendation evidence and status transitions.
- Integration: repositories, database constraints, Clerk mapping, source adapters and job handlers.
- API: request/response contracts, authentication and authorization.
- End-to-end: student journeys, Admin workflows and account actions.
- AI evaluation: retrieval, citations, answer grounding and explanation faithfulness.
- Non-functional: accessibility, responsive behaviour, performance, security and recovery.

## 14.2 Critical end-to-end journeys

1. Class 10 Discover → Results → independent Explore.
2. Class 12 Discover → Results → Guided Explorer → completion → shared Explore.
3. Skip/partial Guided Explorer answers → Explore remains usable.
4. Save and revisit catalogue item.
5. Student cannot read another student's data.
6. Contributor creates institution draft → reviewer approves → publisher publishes → student directory displays it.
7. Source failure preserves published record.
8. Course-specific institution flow preserves course context.
9. RAG answer cites correct approved source and admits missing evidence.
10. Recommendation reason maps to real answer and catalogue attribute.

## 14.3 Data tests

Validate duplicate detection, source provenance, stale-state behaviour, demo/test separation, field-level dates, import row errors, relationship integrity and migration reconciliation.

## 14.4 AI evaluation

Maintain fixed evaluation sets and version them. Measure retrieval recall/precision, citation validity, factual correctness, unsupported answer rate, recommendation relevance, evidence faithfulness, sparse-answer handling, multilingual performance, latency and cost. Re-evaluate after model/prompt/index/feature changes.

## 14.5 Student evaluation

Plan a real-student study (approximately 30–50 participants as feasible) with consent and privacy safeguards. Evaluate comprehension, usefulness, trust, ease of discovery, confidence in understanding options and ability to identify next steps. Do not present this target as completed research.

## 14.6 Release gate

Require lint, typecheck, build, relevant automated tests, migration review, auth/permission tests, data-quality review, source freshness, accessibility review, secret scan, backup/restore evidence, monitoring and documented known limitations. State exactly which checks ran and their results.

## 14.7 Defect severity

Block release for data leakage, privilege escalation, data loss, fabricated high-impact facts, broken auth, destructive migration risk or materially misleading recommendation behaviour. Track lower-severity usability/data issues with owners and deadlines.
