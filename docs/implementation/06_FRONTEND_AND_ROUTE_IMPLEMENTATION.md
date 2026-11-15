# 6. Frontend and Route Implementation

## 6.1 Principles

Preserve the agreed calm, minimal, trustworthy academic visual direction: deep navy, muted teal, off-white, greys and white. Avoid neon, glow, glass and decorative AI effects. Preserve compatible existing visual structure; do not redesign pages without a requirement.

Use the [UI/UX improvement guide](../UI_UX_IMPROVEMENT_GUIDE.md) as a flexible reference. Apply only guidance relevant to the page and task; do not invent requirements or add unrelated changes.

## 6.2 Shared UI

Use shared components for navigation, page containers, catalogue cards, filters, source/freshness labels, empty/error states, dialogs, forms and accessible controls. Avoid duplicating domain content in components.

## 6.3 Canonical data ownership

One source of truth per domain: field content, course definitions, institution identities, campuses, offerings, pathways, examinations and scholarships. Page-specific view models may transform data but must not become competing factual stores.

## 6.4 Route alignment

Implement and test `/discover`, `/discover/results`, Guided Explorer routes, shared `/explore`, course catalogue `/explore/courses/catalog`, general institution directory/profile, course-specific institution flow, pathway/exam/scholarship listing/detail, Saved, History and My Next Steps. Preserve route context and legacy redirects where approved.

## 6.5 Discover and Guided Explorer

Use Class 10/12 only. Capture stage once. Possibility explanations must reference actual answer evidence. Guided Explorer is one question at a time, optional, rule-based and skippable; completion leads to shared Explore. Device-local persistence copy must match actual storage behaviour.

## 6.6 Explore and catalogues

Shared Explore supports personalised starting points and general browsing. Fields avoid oversized subfield grids. Course catalogue supports field/stage context. Institution general profile and course-specific offering experiences remain separate. Maps are used where location helps, primarily on detail pages.

## 6.7 Data states

Design explicit loading, empty, error, stale, unavailable, unverified, demo and partial-data states. Do not leave sparse records looking broken or fill gaps with invented content. Distinguish “not collected” from “not applicable”.

## 6.8 Accessibility and responsive behaviour

Keyboard navigation, focus management, semantic headings/landmarks, labels, contrast, reduced motion, accessible dialogs and useful mobile layouts are required. Test desktop and mobile breakpoints. Do not rely on colour alone for status.

## 6.9 Frontend data access

Client components call approved server/API boundaries. Never import database clients, secret-bearing SDKs, Admin repositories or private environment values into client code. Avoid fetching the same catalogue data redundantly across nested components.

## 6.10 Acceptance

Test route refresh/deep links, query context, back/forward, empty/error/loading states, responsive layouts, keyboard use, evidence rendering and ownership restrictions.
