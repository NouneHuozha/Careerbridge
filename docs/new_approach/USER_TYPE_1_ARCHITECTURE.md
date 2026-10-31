# CareerBridge — User Type 1 MVP Architecture

This document complements [`PLAN_USER_TYPE_1_FINAL.md`](./PLAN_USER_TYPE_1_FINAL.md). The plan defines product requirements; these diagrams show how the screens, branches, shared destinations, state, and recovery paths fit together. They describe the intended product flow—not a deployment or backend architecture.

## 1. Whole student journey

```mermaid
flowchart TD
    L[Landing: explore without pressure]
    L -->|Not sure where to start| D[Discovery]
    L -->|Browse independently| A[Areas to Explore: neutral all-area view]
    L -->|Know a course or college| S[Public catalogue search<br/>only when verified records are ready]

    D --> C{Choose browsing context}
    C -->|Class 10| P[Optional activity picks<br/>up to 3 or none]
    C -->|Class 12| P
    C -->|Unsure / another class| P
    D -->|Browse all areas| A
    P -->|Continue, including with no picks| R[Areas to Explore / Possibilities]
    P -. optional alternative .-> G[Guided Explorer]
    G -->|Optional questions or skip| R
    R -->|Open any area| O[Public study options]
    R -->|Browse all / change choices| R
    R -. optional alternative .-> G
    S -->|Published result| O

    O -->|Class 10 context| X[Class 10 study categories]
    O -->|Class 12 context| Y[Class 12 course areas]
    O -->|No class context| Z[General browse]
    X --> T[Public stream / option detail]
    Y --> U[Public course-area detail]
    Z --> V[Public options by area]
    T --> K[Shared college list]
    U --> K
    V --> K
    K -->|Select a verified institution| I[College detail]
```

**Principle:** the direct Discovery path continues to Areas to Explore. Guided Explorer is an optional alternative to reach the same broad exploration destination; it is never a required step or an automatic destination for an unsure student. A student can stop at any point, browse all areas, or return to change choices.

## 2. Discovery interaction

```mermaid
flowchart TD
    D[Discovery opens] --> Q{Choose browsing context}
    Q -->|Class 10| A[Show optional activities]
    Q -->|Class 12| A
    Q -->|I'm not sure / another class| A
    D -->|Browse all areas, without answering| ALL[Open neutral all-area Results]

    A --> PICK[Choose 0–3 activities]
    PICK -->|0, 1, 2, or 3 choices| READY[Continue is enabled]
    PICK -->|Attempt a fourth| LIMIT[Do not add it; show inline limit message]
    LIMIT --> PICK
    READY -->|Show me possibilities / Browse broadly| SAVE[Store only class context + activity picks<br/>in current-tab session state]
    SAVE --> RESULTS[Open shared Areas to Explore]
    SAVE -->|Save failure| ERR[Explain draft was not saved;<br/>offer browse without saving]
    ERR --> ALL
    D -->|Optional: try Guided Explorer| GUIDE[Open separate guided route]
```

The browse-all link is available before the student answers anything. Activity picks are optional. The class context organizes the view; it does not determine eligibility. Do not send answer values in URLs.

## 3. Guided Explorer — optional route to the same results

```mermaid
flowchart TD
    ENTRY[Optional link from Discovery or Areas to Explore] --> W[Welcome:<br/>self-guided; no person involved]
    W -->|Start| C{Optional class context}
    W -->|Browse every area| ALL[Shared neutral all-area Results]
    C -->|Choose Class 10 / Class 12 / unsure| ACT[Optional activity picks]
    C -->|Skip class| ACT
    ACT -->|Choose up to 3 or none| REVIEW[Show literal choices only;<br/>no inferred profile]
    ACT -->|Browse every area| ALL
    REVIEW -->|Continue| SAVE[Update tab-scoped browsing choices]
    SAVE --> R[Shared Areas to Explore results]
    SAVE -->|Storage failure| FAIL[Keep previous saved choices;<br/>offer browse without saving]
    FAIL --> ALL
    REVIEW -->|Back / change answers| W
```

Guided Explorer drafts remain in memory until the student continues. Leaving before continuing does not replace previously saved choices. Do not add long counselling questionnaires, free-text prompts, sensitive personal questions, or a personalized dashboard to this MVP. “Unsure” never automatically routes a student into Guided Explorer.

## 4. Study options and the shared institution journey

```mermaid
flowchart TD
    R[Areas to Explore] -->|Choose a broad area| AREA[Public area / study-options view]
    AREA -->|Class 10 context, if relevant content exists| STREAMS[Class 10 study categories]
    AREA -->|Class 12 context, if relevant content exists| COURSE_AREAS[Class 12 course areas]
    AREA -->|No class selected| GENERAL[General options; don't infer a class]

    STREAMS -->|Learn more: brief explanation may expand inline| STREAM[Stream / option detail]
    COURSE_AREAS -->|Learn more: brief explanation may expand inline| COURSE[Course-area detail]
    GENERAL -->|Choose a published public option| PUBLIC[Public option detail]
    STREAM -->|See colleges| COLLEGES[Shared college list]
    COURSE -->|See colleges| COLLEGES
    PUBLIC -->|See colleges| COLLEGES
    COLLEGES -->|Select a verified institution| COLLEGE[College detail]

    AREA -. no verified entries .-> EMPTY[Honest no-verified-listings state + browse links]
    STREAMS -. content not verified .-> EMPTY
    COURSE_AREAS -. content not verified .-> EMPTY
    COLLEGES -. load failure .-> ERROR[Distinct load error + retry + browse links]
```

### Choosing inline details versus a separate page

- Keep a useful summary visible on each option card so students can scan and compare without opening multiple overlays.
- Use an inline expansion for a short, stable definition or explanation.
- Use an accessible dialog or mobile bottom sheet for optional context that is longer but self-contained and does not need a new navigable destination.
- Use a separate public page for substantial content, related options, or changing/source-heavy details such as current admissions, eligibility, fees, institution availability, or official references.
- Never hide essential caveats, verification status, deadlines, or sources behind a popup.

### Shared catalogue rules

- Class 10 and Class 12 organize browsing only; neither activity picks nor class context establish eligibility.
- The college list is shared by both branches; do not build duplicate Class 10 and Class 12 college-list experiences.
- Only publish reviewed catalogue records. Unknown facts remain explicitly unknown.
- Distinguish a valid option with no verified listings from an invalid URL and from a catalogue load failure.

## 5. State, public routes, and recovery boundaries

```mermaid
flowchart LR
    USER[Student choices] -->|On continue only| TAB[Current-tab session state]
    TAB -->|class context + up to 3 activity IDs| RESULTS[Results rendering]
    TAB -->|Clear choices + confirmation| CLEARED[General browsing state]
    PUBLIC[Direct public URL] --> CONTENT[Render valid public content without session]
    PUBLIC -->|No session context| NOASSUME[Do not infer class; show general view]
    URL[Public content slug / area filter] --> CONTENT
    ANSWERS[Student answer values] -. never put in URL .-> URL
    ANSWERS -. never send as analytics answer events .-> ANALYTICS[Analytics boundary]
```

MVP state consists only of the current tab’s class context and activity picks in `sessionStorage`. Do not add account creation, cloud sync, profiles, saves, comparisons, or action plans in this MVP. Browser session restoration can vary. Clearing choices does not erase hosting or analytics logs. Verify actual network requests, analytics, hosting configuration, and logs before making privacy promises.

Every route should support:

- a named, working back action; normal browser Back;
- a distinct **Change my choices** path that preserves choices;
- a separately confirmed **Clear my choices** action;
- direct access to valid public catalogue content without session state;
- neutral browse-all recovery from empty, unavailable, or irrelevant results;
- separate invalid-content, no-verified-listings, and load-failure states.

## 6. MVP boundary

```mermaid
flowchart LR
    MVP[In MVP: Landing, Discovery, Areas to Explore,<br/>verified public options, shared college list/detail,<br/>optional Guided Explorer, honest recovery] --> END[Student can stop or continue exploring<br/>without being forced to decide]
    LATER[Later / excluded until separately specified:<br/>personal dashboard, account, save/compare,<br/>action plan, scholarship/exam hubs, human counselling] -. not required for MVP .-> END
```

These boundaries preserve a useful, complete exploration journey without implying that deferred features exist or are operational.
