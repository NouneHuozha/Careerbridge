# CareerBridge — Agent Instructions

## Source of truth
Read `docs/project-foundation/README.md` and the relevant foundation documents before product, architecture, data, AI or navigation changes. The agreed project plan is the source of truth. Preserve compatible code and realign conflicting implementation after inspection; do not change the vision merely to fit accidental implementation.

## Product rules
- **Guide, don't decide:** no deterministic career predictions, “best career” verdicts, forced paths or student-facing fit percentages.
- Current stage scope is Class 10 and Class 12. Capture stage at the appropriate discovery/onboarding point and reuse it.
- Institution discovery targets all eight Northeast states. Initial real collection may begin in Nagaland.
- Independent browsing and Guided Explorer lead to the shared Explore experience.
- Guided Explorer is self-guided reflection, not human counselling.
- Personalised explanations must use traceable student-answer and catalogue evidence.
- Real sourced data is primary; label and separate demo/test records.
- Never invent institutions, courses, fees, eligibility, deadlines, sources or implementation status.
- Admin/data governance, hybrid recommendation, LLM + RAG, explainability and location data are core architecture responsibilities.

## Privacy and security
Students may be minors. Minimise personal data, define purpose and retention, protect private student records, enforce server-side authorization, keep secrets server-side and treat retrieved documents as untrusted input.

## Engineering workflow
- Inspect relevant routes, components, dependencies, APIs, data contracts and tests before editing.
- Read the installed Next.js guidance before changing Next.js conventions; the installed version may differ from older examples.
- Keep UI separate from scraping, recommendation logic, source validation and AI orchestration.
- Imports and scraped changes must be validated/reviewed before publication.
- Preserve last-known-good published data when ingestion fails.
- Build end-to-end vertical slices across Admin, publication and student consumption.
- Test relevant success, empty, loading, error, recovery, permission, keyboard and responsive states.
- Report exactly which checks were run; never claim unrun tests passed.

## UX reference
Use `docs/UI_UX_IMPROVEMENT_GUIDE.md` as a flexible reference. Apply only what fits the page and task. Do not invent requirements or unrelated features.
