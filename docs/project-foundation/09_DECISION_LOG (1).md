# 9. Decision Log

Durable decisions from project planning. Append new decisions with date, context, decision and impact. Record replacements rather than silently rewriting history.

## D-001 — Project plan is the source of truth
**Decision:** Agreed product plan, not accidental current implementation, defines the target. Preserve compatible code; adjust/rebuild conflicting parts after audit.

## D-002 — Guide, don't decide
**Decision:** Support exploration, not career prediction or decision. No deterministic verdicts, “best career” claims, forced paths or student-facing match/fit percentages. Explanations must be evidence-based.

## D-003 — Student stage
**Decision:** Current scope is Class 10 and Class 12. Capture stage at the appropriate discovery/onboarding point and reuse it. Do not add completed/waiting-result variants without approval.

## D-004 — Northeast-wide institution architecture
**Decision:** Institution discovery targets all eight Northeast states, not Nagaland alone. Initial real institution collection may begin in Nagaland; architecture supports all eight.

## D-005 — Guided Explorer
**Decision:** Student-facing name is Guided Explorer; optional self-guided experience, not human counselling. Completion leads to shared Explore with answer evidence.

## D-006 — Shared Explore
**Decision:** Independent browsing and Guided Explorer both lead to /explore. Guided context enriches the shared experience; it does not create a separate dead end.

## D-007 — Simplified field exploration
**Decision:** Broad field selection leads to an understandable overview and next actions (Courses, Institutions, Pathways), not an overwhelming narrow-subfield grid. Reuse shared field data.

## D-008 — Course catalogue
**Decision:** /explore/courses/catalog is the canonical shared catalogue direction, with optional field and stage context. Avoid duplicate catalogue experiences.

## D-009 — Institution profile versus offering
**Decision:** General institution profile and course-specific offering are distinct. Model institution/campus separately from course offering.

## D-010 — Real data primary
**Decision:** Use real, sourced information as primary student-facing data. Demo/test records must be labelled and separated. Do not invent data to fill pages.

## D-011 — Admin is core
**Decision:** Admin and data management are required platform capabilities, not optional future extras. Include sources, imports, validation, review, publication, audit and knowledge-base operations.

## D-012 — Controlled publication
**Decision:** Scraped/imported changes do not automatically overwrite published information without validation and appropriate review. Preserve provenance, change detection and last-known-good values.

## D-013 — Source-specific update schedules
**Decision:** Refresh frequency varies by source/category. Stable identity data checks less often; admission notices and deadlines more often. Schedules are configurable and tuned to actual source behaviour.

## D-014 — Hybrid AI core
**Decision:** Structured recommendation, LLM + RAG and XAI are core and architected from the beginning. Structured records remain canonical; LLM answers use retrieved evidence; explanations cite actual evidence.

## D-015 — Collaborative filtering evidence
**Decision:** Build architecture for collaborative signals, but real performance claims require sufficient real user interactions. Synthetic interactions test software, not real-world effectiveness.

## D-016 — Location data before map UI
**Decision:** Institution/campus location data belongs in foundational schema. Map/route UI integration may be sequenced later.

## D-017 — Phased implementation, complete core design
**Decision:** Phases manage complexity; they must not omit or indefinitely postpone core requirements. Build end-to-end vertical slices. AI architecture is included from the beginning.

## D-018 — Honest implementation status
**Decision:** Target requirements, observed code and tested behaviour are distinct. Do not claim implementation or test success without evidence.

## Adding a decision
### D-XXX — Short title
- Date: YYYY-MM-DD
- Context: why a decision was needed.
- Decision: what was agreed.
- Impact: affected documents, architecture or implementation.
- Status: proposed / agreed / superseded.
