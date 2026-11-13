# 3. User Flows and Navigation

## Principles
Navigation supports discovery without forcing a fixed sequence. Explore is the shared destination. Reuse known education stage and answer context.

## Primary student journey
1. Student enters Discover.
2. Student selects Class 10 or Class 12, unless already supplied by onboarding.
3. Student may optionally share activities/interests.
4. Discover Results presents possible fields with reasons based on actual responses.
5. Student chooses Explore on my own or Explore with guidance / Guided Explorer.
6. Both routes lead to the shared Explore home. Guided context carries relevant evidence; independent browsing remains open-ended.

## Guided Explorer
Target route concepts:
- /counselling — introduction and start/resume state.
- /counselling/conversation — one question at a time with supporting notes/context.
- /counselling/complete — completion and next action.
- /counselling/summary — optional answer review if retained in final design.
- /explore — shared exploration home.

“Guided Explorer” is the student-facing name. “Counselling” may remain an internal route/legacy code term, but copy must not imply a human counsellor is present.

Conversation supports Back, Skip, Continue, Edit and Exit/save/finish for now as applicable. No numeric progress percentage. Questions may adapt across interests, curiosity, learning/subjects, strengths and future preferences. Uncertainty is valid.

Completion primary action: Start exploring → /explore. Secondary action: Review my answers. Preserve evidence for explanations. Do not display a definitive career verdict.

## Explore information architecture
Shared categories: Fields, Courses, Institutions, Pathways, Examinations and Scholarships. Guided-derived possibilities can appear alongside general starting points without creating a separate guided-only homepage.

## Field flow
Directory browsing may open a concise overview/dialog. A guided possibility may open a useful field detail with a small evidence section. Provide next actions such as Courses, Institutions and Pathways. Avoid a long narrow-subfield grid as the immediate next step. Reuse shared field content.

## Course flow
Canonical catalogue direction: /explore/courses/catalog with optional field and stage query context. Course detail explains verified information. Course-specific institution listing shows actual providers and preserves course context into offering detail.

## Institution flows
Two distinct flows:
1. General directory → general institution profile.
2. Course catalogue/detail → institutions offering that course → course-specific offering detail.

Previously agreed route concepts:
- /explore/institution-directory
- /explore/institution-directory/[slug]
- /explore/institutions?course=...
- /explore/institutions/[slug]?course=...

Verify these against actual repository routes before implementation. Institution profiles should be modular and show only supported information. A map is useful on institution/location detail, not required on every listing.

## Other discovery flows
Pathways, examinations and scholarships each need a listing and meaningful detail experience. Eligibility, dates and application information must be source-supported.

## Navigation shell
Previously discussed desktop navigation: Explore, Saved, My Next Steps. Verify exact labels and responsive behaviour against the current design. Do not add navigation items solely to fill space. My Next Steps should track actions students choose, not prescribe a career sequence; final content must be confirmed before implementation.

## Route reconciliation
Audit actual routes and entry points; map each to this target; identify duplicate/legacy routes; preserve routes with distinct use; consolidate duplicates; check links and saved references before removing any route.
