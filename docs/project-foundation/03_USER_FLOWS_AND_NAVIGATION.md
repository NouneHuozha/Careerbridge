# 3. User Flows and Navigation

## 3.1 Main journey

```text
Discover → Class 10 / Class 12 → Optional activities/interests → Discover Results
                                                               |
                                    +--------------------------+-------------------------+
                                    |                                                    |
                              Explore on my own                                Explore with guidance
                                    |                                                    |
                                    |                                            Guided Explorer
                                    |                                                    |
                                    +---------------------------+------------------------+
                                                                |
                                                        Shared /explore
```

Both choices lead to the same Explore homepage. Independent exploration uses general browsing and available context. Guided Explorer adds optional reflection evidence; it does not create a separate guided-only homepage.

## 3.2 Discover

`/discover` reassures unsure students, captures Class 10 or Class 12, and optionally collects activities/interests. Reuse known stage; do not re-ask it on unrelated pages. Do not add completed-result or waiting-result variants without approval.

## 3.3 Discover Results

`/discover/results` contains “Discover what’s possible”, “Your choices”, possibility cards with evidence-based reasons, Learn more field overview, Browse all fields and two equal entry cards: “Explore on my own” and “Explore with guidance”/“Try Guided Explorer”.

## 3.4 Guided Explorer routes

Student-facing name: Guided Explorer. Existing `/counselling` route prefix may remain for compatibility, but UI copy must not imply a human counsellor.

- `/counselling`: introduction and start/resume state.
- `/counselling/conversation`: one-question-at-a-time reflection.
- `/counselling/complete`: completion.
- `/counselling/summary`: optional answer review.
- `/explore`: shared destination.

Support Back, Skip, Continue, Edit, Exit and Save/Finish for now. Themes: Interests, Curiosity, Learning/subjects, Strengths and Future preferences. Questions may adapt; not all are mandatory. Do not show numeric progress or a career verdict.

Session states: no saved session, active, paused, completed and early exit. Device-local storage must be described honestly; do not claim account synchronisation unless implemented.

Completion primary action: Start exploring → `/explore`. Secondary: Review my answers.

## 3.5 Shared Explore

`/explore` serves independent browsing, Guided Explorer completion, partial answers and no-answer users. Sections: Fields, Courses, Institutions, Pathways, Examinations and Scholarships. Personalised starting points may show answer evidence, while general browsing remains available.

## 3.6 Field experience

The normal Fields directory may use a concise overview dialog. Guided possibility cards may open a full detail page. Both use one shared data source. A broad field overview should lead to Courses, Institutions and Pathways, not a large narrow-subfield grid.

## 3.7 Course experience

Canonical direction: `/explore/courses/catalog`; optional `field` and `stage` context. Keep one shared catalogue. Detail pages link to actual campus offerings.

## 3.8 Institution experiences

General directory: `/explore/institution-directory` and `/explore/institution-directory/[slug]`.

Course-specific discovery: `/explore/institutions?course=...` and `/explore/institutions/[slug]?course=...`.

Preserve selected course context. General profile, campus and specific offering facts remain distinct. Map belongs on relevant detail pages, not every list row.

## 3.9 Other catalogue journeys

Pathways, examinations and scholarships each have listing/detail pairs. Detail pages show official evidence, freshness and unavailable states where applicable.

## 3.10 Account journeys

Saved revisits saved items. History revisits prior supported items. My Next Steps tracks student-selected actions and never prescribes a career route.

## 3.11 Navigation

Previously agreed desktop navigation: Explore, Saved and My Next Steps. Do not add items solely to fill space. Preserve current visual structure unless a reviewed requirement calls for a change.

## 3.12 Route migration rules

Inventory routes and inbound links before changing them. Map each route to a distinct purpose, preserve query context, inspect saved references, keep routes that serve distinct flows, redirect obsolete routes safely, and test direct navigation, refresh, back/forward and deep links.
