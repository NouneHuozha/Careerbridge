# CareerBridge Next — User Type 1: Complete Product Specification

**Target User:** Class 10 / Class 12 student in Nagaland (Northeast India) who has **no idea** what to do after school.  
**Status:** User-walkthrough reviewed product direction (v3.1; catalogue facts and privacy behavior require verification)  
**Scope:** MVP journey for the “no idea where to start” student — Landing → Discovery or direct browse → Areas to Explore (Possibilities) → verified study options → shared college list → college detail. Guided Explorer is an optional alternate entry to the same exploration results.

---

## 1. User Profile

| Attribute | Detail |
|-----------|--------|
| **Name** | User Type 1 — "No Idea" Student |
| **Who** | Class 10 or Class 12 student, Nagaland / Northeast India |
| **Mindset** | “I don’t know what to do next. I’m worried about choosing the wrong thing.” The experience must not require the student to know their strengths or career terminology. |
| **Device** | Likely mobile phone, possibly shared computer at cyber café |
| **Constraints** | Minimal data collection. No account required to browse. No pressure to decide today. |

---

## 2. Guiding Principles

| Principle | Application |
|-----------|-------------|
| **Guide, don't decide** | No "top match," no rankings, no "you should be a X" language. Show broad areas first. |
| **One clear next action per page** | Each screen has an obvious way forward. Discovery asks for a browsing context before optional activities; “Browse all areas” always bypasses questions. Keep the direct exploration route short and do not add steps solely to force a decision. |
| **Honest about uncertainty** | Fees, exams, scholarships, course availability, and eligibility show "not verified" where unknown. Never invent numbers or imply an unverified route is an admission guarantee. |
| **Always know where you are** | Journey pages provide a clear back action and a separate "Clear my choices" action. The labels explain whether choices are kept or removed. |
| **Mobile-first** | Thumb-friendly buttons, readable text, no horizontal scroll, minimal data usage. |
| **Guided Explorer is optional** | The student can continue directly from Discovery to Possibilities. Guided Explorer is a voluntary, step-by-step alternative from Discovery or Possibilities; uncertainty never automatically sends the student there. It is not a human counsellor. |
| **Class 10 ≠ Class 12** | Separate paths after class selection. Different streams vs different course areas. |
| **Activity picks are explainable suggestions** | Use a curated, visible mapping; say "may connect." It is exploratory, not a match score or eligibility decision. Always offer all areas and pathways. |
| **Filters are reversible** | Changing a class or pick clears only incompatible downstream context, explains what changed, and preserves the student's activity answers. |
| **Uncertainty is a valid outcome** | A student may choose “I’m not sure” for class, skip activities, or browse all areas without creating a profile, being forced to confirm an interpretation, or being redirected to Guided Explorer. |
| **Explain in context** | Keep short path/course explanations beside the option. Use an expandable card or focused dialog for optional detail; use a separate page for substantial, source-heavy, or frequently changing catalogue information. Do not hide essential caveats or sources. |

---

## 3. Complete Flow Diagram

![Visual flow diagram showing the complete User Type 1 journey from Landing through Discovery or direct browsing to study options and college details, including recovery paths.](./USER_TYPE_1_FLOW.svg)

**Download/view:** [USER_TYPE_1_FLOW.svg](./USER_TYPE_1_FLOW.svg)

For the complete component-level diagrams—including Discovery, optional Guided Explorer, Class 10/12 branches, shared college pages, state boundaries, and recovery cases—see [User Type 1 MVP Architecture](./USER_TYPE_1_ARCHITECTURE.md).

**Core path:** Landing -> direct Discovery (choose a browsing context: Class 10, Class 12, or “I’m not sure”; then optionally choose up to three activities or none) -> Areas to Explore (the Possibilities results page) -> study options (only where reviewed catalogue content exists) -> public option/course detail -> shared College List -> College Detail. A student may bypass questions from Landing or Discovery and browse every area in neutral order. Guided Explorer is a voluntary alternate route from Discovery or Possibilities: welcome -> optional class context -> optional activities -> the same shared Areas to Explore results. Being unsure does not trigger or require Guided Explorer. A class choice organizes browsing; it never decides eligibility. Valid public content works without session state.

**Page count:** Keep the direct exploration route as short as practical. Do not add a screen solely to force a decision, confirm an invented profile, or send an unsure student to counselling. A path/course explanation may be inline when brief; public catalogue details remain directly navigable when the student needs deeper or source-rich information.

### User-perspective walkthrough

| Student situation | What happens | Why they do not get stuck |
|-------------------|--------------|----------------------------|
| “I have no idea,” chooses nothing | “Browse all areas” opens every area in neutral order without answers | The bypass never requires a class or activity |
| Is unsure about class, has completed a class, or is waiting for results | Chooses the closest clearly explained context or “I’m not sure”; no class is inferred | Broad browsing remains available |
| Knows their context but no activity fits | Continues with no activity picks; Areas to Explore shows every area neutrally unless reviewed mappings exist | No forced activity pick or fabricated catalogue |
| Is still unsure after choosing class or activities | Goes directly to Areas to Explore, can browse all areas, or can choose Guided Explorer | Guided Explorer is optional and never a consequence of uncertainty |
| Opens a course, college, or area link directly | Requested public content loads without a session; an optional Discovery link is available | No forced restart and no guessed class |
| Finds no relevant course or college | Explain whether the catalogue has no verified entries or the request failed to load; offer all areas, unfiltered colleges, and retry where applicable | A missing result is not presented as an error or a dead end |
| Wants to change their mind or is using a shared device | "Back to Discovery" preserves choices; "Clear my choices" confirms, clears them, and returns to general Discovery | Back and clear have distinct, predictable effects |

**Release check:** Walk these cases on a small phone and with a keyboard before launch; include students or representative users who are unsure where to start. Confirm they understand the class-context question, optional nature of activities, meaning of mapped areas, and how to find a next step without feeling pushed to choose. Every screen must have a visible next action, a way back, and a route to browse all areas. Test loading, empty, invalid-content, and failure states. Do not count a disabled or “Coming later” control as a working recovery.

---

## 4. Page-by-Page Specification

### 4.1 Landing Page (`/`)

**Purpose:** Let the student self-identify their entry point. No pressure.

**Content:**
1. **Hero headline:** "You don't need to have your whole future figured out."
2. **Sub-headline:** "CareerBridge helps you explore career and education options in Nagaland and the Northeast, at your own pace. No pressure to decide today."
3. **Three entry doors (equal size):**
   - **Door 1 (primary, highlighted):** “I’m not sure where to start” — “Choose a browsing context and optionally explore everyday activities.” → `/discover`
   - **Door 2:** “I’d rather browse on my own” — “Browse every area in a neutral order, without answering questions.” → `/discover/results` (opens all areas in neutral order)
   - **Door 3:** "I know exactly what I want to study" — "Browse or search courses and colleges." → `/catalogue`
4. **Trust strip (3 short reassurances):**
   - "No right answer required"
   - "Go at your own pace"
   - "Change direction later"
5. **Example box (optional):** A clearly labeled example of browsing, not a prediction or a stored profile.

**Student actions:** Door 1 starts Discovery; Door 2 opens all areas; Door 3 opens the public catalogue search. `/catalogue` must be a defined, working search/browse page for verified course and college records before the door is enabled. Exam search is out of MVP scope. If any destination is not ready, show a labeled "Coming later" state and keep Discovery available.
**System behavior:** No account required. Do not claim that nothing is remembered until storage and network behavior are verified.

**Do NOT include:** "Apply now," "Sign up," "Choose your career," specific job titles, salary promises.

---

### 4.1a Public Catalogue Search (`/catalogue`)

**Purpose:** Give students who already know a course or institution a direct, public way to find verified catalogue entries without completing Discovery.

**Content:** One search field for course or college names, plus browse links to all areas and `/colleges`. Results link to public course, area, or college pages. Do not include exam search in MVP.

**Behavior:** Search only the published catalogue; do not imply a result exists if it is not in the data. Empty search shows browsing links. `/catalogue?area=[area-slug]` filters by a public catalogue area; it does not contain a student's answer. No session state is required and no personalized ranking is applied.

**Release gate:** Door 3 stays visibly marked "Coming later" until this route searches verified course and college records.

---

### 4.2 Discovery Page (`/discover`) — Self-Guided Entry

**Purpose:** Help an unsure student begin exploring without treating their choices as a test, recommendation, profile, or eligibility check.

**URL:** `/discover`

**Step 1 — Choose a browsing context.** Ask a plain-language question such as **“Which class or study stage should we use to organize browsing?”** Make clear that Class 10 and Class 12 are browsing contexts only. Students who have completed a class or are waiting for results should be able to choose the closest context, or select **“I’m not sure / another class.”** Do not infer a class or imply eligibility.

| Option | Behavior |
|--------|----------|
| **Class 10** | Organizes browsing around the Class 10 context; never implies eligibility |
| **Class 12** | Organizes browsing around the Class 12 context; never implies eligibility |
| **I’m not sure / another class** | Opens broad browsing without guessing the student’s class |

**Step 2 — Optional activities.** After a context is selected, show the eight everyday activity choices. The student may select up to three, change them freely, or select none. A fourth selection is not added; show **“Choose up to 3 activities. You can change them anytime.”** Do not add a separate “not sure about activities” toggle; choosing none is valid.

**Continue actions:** The primary action is available as soon as a browsing context is selected, whether or not activities were picked. Use **“Show me possibilities”** for Class 10/12 and **“Browse broadly”** for “I’m not sure / another class.” Activity picks are optional; zero picks must not block continuing. Continuing stores only the MVP browsing context and activity picks in the current tab and opens the shared Areas to Explore results. Do not put student answers in URLs.

**Always-available bypass:** Keep **“I’d rather browse all areas”** visible before any answer is required. It opens the shared Results in neutral all-areas mode without requiring class or activity answers and without clearing saved choices.

**Guidance:** State close to the controls that this is not a test; class only organizes browsing; activities are optional starting points; and none of the choices determines eligibility. Guided Explorer may be offered as an optional, clearly labeled alternative, but uncertainty must not automatically send the student there.

**Accessibility and motion:** Use a native single-choice radio group with a correctly associated legend and helper text; make activity selection keyboard operable; honor `prefers-reduced-motion`. Ensure all actions have visible focus and touch targets.

---

### 4.3 Areas to Explore / Possibilities (`/discover/results`)

**Student-facing heading:** **“Here are areas you can explore.”** “Possibilities” may be used as a concise internal or navigation label, but the visible page heading should explain the page’s purpose plainly.

**Purpose:** Show broad study areas a student may browse, with literal explanations of any optional activity connections. This is not a counselling outcome, profile, eligibility check, ranking, or career assignment. There is no hidden algorithm or usage-data claim.

**URL:** `/discover/results`. Student answers are not placed in query parameters. Public content slugs may appear on their own detail URLs.

**Results behavior:**
- If activities were selected, render every distinct mapped area. Deduplicate activities mapping to the same area and explain all relevant picks on that card; never cap the result to an arbitrary two or three areas.
- If no activity was selected, or no reviewed mapping is available, show all areas in neutral order and say **“No problem—let’s browse broadly.”** Do not fabricate a starting picture or imply a profile was created.
- Visibly label the chosen context as Class 10, Class 12, or general / no class selected. General browsing never silently assumes a class.
- Keep every area and public option reachable regardless of answers. Picks can suggest where to begin but never filter out options or establish eligibility.
- State plainly: **“These ideas help you browse; they do not tell you which courses you qualify for.”**

**Curated activity → area mapping:**

| Activity pick | Broad area | Example wording |
|---------------|-------------|-----------------|
| Fixing things | Technology & Computing | “You said you like fixing things—this area may connect to repair and technical work.” |
| Computers & phones | Technology & Computing | “You said you like using computers—this area may connect to digital work.” |
| Helping people | Health & Care | “You said you like helping people—this area may connect to care and wellbeing.” |
| Working outdoors | Nature & Fieldwork | “You said you like working outdoors—this area may connect to nature-based work.” |
| Organising and planning | Business & Office | “You said you like organising—this area may connect to planning and office work.” |
| Drawing and making | Creative & Design | “You said you like drawing and making—this area may connect to creative work.” |
| Working with numbers | Finance & Data | “You said you like working with numbers—this area may connect to finance and data work.” |
| Teaching and explaining | Education & Social | “You said you like teaching—this area may connect to education and community work.” |

Every mapping is an editorial exploration prompt, not a verified qualification, admission route, or claim about outcomes. Have mappings reviewed before publication.

**Area cards:**
- Area name and concise plain-language description; keep enough explanation visible to understand the card without opening a popup.
- Where applicable, a literal explanation such as **“You picked [activity]. This is one area you could explore—not a prediction.”** Combine all relevant picks when multiple activities map to the same area.
- A clear **“Explore study options”** action only when a real public destination exists. Use reviewed catalogue entries only; if none are verified, explain that honestly and provide working browse/recovery actions.
- **“Browse every area”** never clears activity picks.
- **“Change my choices”** returns to Discovery with existing class and activity picks preserved.
- An optional **“Want a step-by-step way to look around?”** link to Guided Explorer. Explain that it is self-guided and no person is involved. It is never the required next action and must not appear as an automatic response to uncertainty.

**Explanation interaction rule:** Keep a short, stable definition or introductory explanation inline or in an expandable card so the student can stay in context. A focused, accessible dialog or mobile bottom sheet is appropriate for optional context that is longer but self-contained. Use a separate public page when the student is moving into substantial detail, comparing multiple related options, or needs current admission, eligibility, fee, institution, or source/check-date information. Do not hide essential cautions or verification status in a popup, and do not make students open repeated popups just to compare basic differences.

**Class-to-option associations:** Class 10 and Class 12 categories may organize browsing only where reviewed catalogue records support the connection. Broad editorial associations are not claims that a route or course exists locally. Do not show course titles, prerequisites, or eligibility solely because of an activity or class choice. Every area remains browseable.

**Bottom actions:** **“Browse every area,” “Change my choices,”** and the optional Guided Explorer link. All retain or preserve choices except the separate, explicitly confirmed **“Clear my choices”** action.

---

### 4.4 Class 10 Path — Stream Options (`/discover/streams`)

**Entry:** Student selected Class 10, or opened this public catalogue directly. No session state is required.

**URL:** `/discover/streams` (public catalogue content; no saved answer is required to open it).

**Header:** Back link → `/discover` | Title: "After Class 10, what would you like to study?"

**Study-category cards (equal weight):**

| Stream/category | What it means | Example subjects or learning focus |
|-----------------|--------------|-----------------------------------|
| Science | Science-focused study in the next stage | Show subjects only when verified for the institution/board |
| Arts / Humanities | Humanities and social-science-focused study | Show subjects only when verified for the institution/board |
| Commerce | Business, accounting, and economics-focused study | Show subjects only when verified for the institution/board |
| Vocational / Skill | Practical or occupational study options | Show actual options only when verified in the catalogue |

**Each card:** Name · plain-language summary · verified subjects/options where available · “Possible areas to research” only when sourced. Provide a short **“Learn more”** expansion for optional explanatory detail when that detail is brief and stable. Keep **“Explore this option”** as the separate action to navigate to deeper study-option content. Do not imply that a stream guarantees entry to a course or job.

**Bottom links:** "Browse every option" and "I don't know my class" return to the general catalogue without clearing activity picks. The latter leads to `/discover/results` in general-browse mode.

---

### 4.5 Stream Detail (`/streams/[stream]`)

**Trigger:** Student clicked a stream card.

**URL:** `/streams/science` (or arts, commerce, vocational)

**Header:** Back link → `/discover/streams` | Title: "[Stream Name]"

**Content:** Verified next-study categories and course pages associated with this stream. Do not prescribe a career or assert eligibility unless current official requirements are cited. Short definitions and stable introductory explanations may be expanded inline or shown in a focused, accessible dialog/bottom sheet so students can stay in context. Use a separate public page for substantial content, multiple related options, current admission facts, or material requiring source/check-date presentation. Essential cautions and source status must not be hidden.

| Study area | What to explore | Requirement source |
|------------|-----------------|-------------------|
| Example study area | Broad description, not a career assignment | Official course/admission source and checked date |

Each item links to public course details or the shared college list. Keep examples out of production until their actual local availability and requirements are verified.

**Rule:** No path is "better." Equal visual weight; alternatives remain available.

---

### 4.6 Class 12 Path — Course Areas (`/discover/courses`)

**Entry:** Student selected Class 12, or opened this public catalogue directly. No session state is required.

**URL:** `/discover/courses` (public catalogue content; no saved answer is required to open it).

**Header:** Back link → `/discover` | Title: "After Class 12, what kind of study interests you?"

**Course Area Cards:**

| Area | What it means | Catalogue content |
|------|--------------|-------------------|
| Diploma / Polytechnic | Practical or technical study | Actual listed diplomas and verified details |
| University degree | Academic study at a college/university | Actual listed degree courses and verified details |
| Skill training | Shorter occupational training | Actual listed courses and verified details |
| Professional study | Specialized study with defined requirements | Actual listed courses and official requirements |

**Each card:** Area name · plain-language summary · actual listed courses · verified duration/admission details where available. A brief explanation may expand in place; a separate destination is for deeper course exploration and source-rich or changing facts. Keep **“See courses in this area”** distinct from **“Learn more.”** Do not infer eligibility from subjects or interest.

---

### 4.7 Course Area Detail (`/courses/[area]`)

**Trigger:** Student clicked a course area card.

**URL:** `/courses/diploma` (example)

**Header:** Back link → `/discover/courses` | Title: "[Area Name]"

**Content:** Actual course types in the catalogue, each with a link to its official source and the date checked:

| Course | Admission requirements | Duration | Institutions |
|--------|------------------------|----------|--------------|
| Verified course entry | Officially sourced; label unknowns | Officially sourced or "Not verified" | Verified listings only |

Each course type: a concise description and a **“Learn more”** disclosure for brief, stable explanation where useful; **“See colleges”** navigates to the shared college list. Show verification status and source for changing or consequential facts. Do not make students open repeated popups just to compare basic differences: keep a useful summary visible on each option card.

Do not ship placeholder examples or present unverified course availability, exams, duration, or institution names as facts.

---

### 4.8 Shared College List Page (`/colleges?route=[route-slug]`)

**Trigger:** Student clicked "See colleges" on a public course/route page reached from either Discovery or Guided Explorer.

**URL:** `/colleges?route=[route-slug]`

**Header:** Back link → previous page | Title: "Colleges offering [Route Name]"

**College cards (list view):**

| Field | Content |
|-------|---------|
| College name | Verified institution name |
| Type badge | Verified institution type |
| District | Verified district/location |
| Course offered | Verified course name |
| Admission | Officially sourced requirements or "Not verified" |
| Fees | Course/year-specific source or "Not currently verified — check college prospectus" |
| Hostel | Verified information or omit / "Not verified" |
| Official website | Verified official link; opens safely in a new tab |

**Below list:** When the route is valid but no verified college entries are available, say "We don't have verified college listings for this option yet." Offer "Browse all colleges" → `/colleges` and "Browse all areas" → `/discover/results`. Do not imply that no colleges exist. If the list fails to load, show a separate error with "Try again" and the same browse links.

**One shared page for both Class 10 and Class 12 paths.** No separate duplicate list step.

---

### 4.9 College Detail Page (`/college/[code]`) — Final Page

**Entry:** Student clicked a college name from College List, or opened this public content URL directly.

**URL:** `/college/[code]`

**Header:** Back link → previous page | Title: College name | Subtitle: Type badge + district

**Sections (top section first — scannable basics):**

1. **Courses offered here** — Verified course list; never hide other courses based on session context
2. **Admission & eligibility** — One concise section for verified entry requirements, exams, dates, documents, and application cycle. Label unknown information "Not verified."
3. **Location** — District, verified address, map link if available
4. **Fees** — Scoped to specific course + academic year. If unknown: "Not currently verified — check college prospectus." Never show ₹0 or "free" if unknown.
5. **Official contact** — Verified website (new tab), phone, email if available

**Below (expandable/collapsible section):**
6. **Hostel & facilities** — Verified information only; label unknowns

**Verification rules:**
- Unknown data: "Not verified" with source/check date where available — never an unexplained "Not confirmed"
- Never hide urgent deadlines or unknown-data warnings behind expandable sections
- Never invent numbers
- Keep exam and admission details in the single Admission & eligibility section; do not repeat them in separate sections. Scholarship content is out of MVP scope.

**"What's next?" box:** Link to the official college/admission source when available. Do not prescribe actions tied to unverified exams or fees. Save actions are out of MVP scope.

---

### 4.10 Guided Explorer Page (`/counselling`) — Self-Guided Entry (Optional)

**Purpose:** A calmer, step-by-step alternative to Discovery. It asks only for browsing context and optional activities; it does not diagnose the student or create a career profile. **Not a human counsellor.**

**URL:** `/counselling`

**Entry points:** From Discovery or Areas to Explore using a clearly optional **“Try Guided Explorer”** / **“Help me look around”** action. It is not an automatic next step for students who choose “I’m not sure” or remain uncertain after seeing possibilities.

**Page header:**
```
Guided Explorer
Self-guided browsing — no person involved. You can skip questions and browse all options.
```

**Persistence:** Seed the questions with existing choices from the current tab when available. Keep edits as an in-memory draft until the student continues to Results; leaving earlier leaves the previously saved choices unchanged. On continuing, store only the class context and activity picks in the existing tab-scoped `sessionStorage` state. Do not promise that answers are private or never reach a server; disclose hosting logs and analytics behavior before launch.

**Relationship to Discovery and Possibilities:** This is an optional alternate entry, not a required counselling step. The direct Discovery route continues straight to the shared Areas to Explore results. Guided Explorer uses the same limited choices, makes them skippable, and reaches the same results. A student who remains unsure can keep browsing broadly without entering Guided Explorer. Class context only labels or organizes browsing and never qualifies or excludes the student. Show only catalogue records that have passed the review/readiness gate; never imply availability before verification.

#### Step 1: Welcome

**Header:** Back to Discovery | Title: "Let's look around together"

**Content:**
- Say plainly: "Self-guided browsing—no person involved."
- Reassure the student: there are no perfect answers; they can change direction; their picks never hide other areas.
- Button: "Start"
- Keep "Browse every area" available without starting the questions.

#### Step 2: Optional class context

**Question:** "Which class are you in now?"

Offer Class 10, Class 12, and "I'm not sure / another class." Also provide "Skip class question." A skipped class stays unspecified; do not infer one. "Continue" is always enabled and advances even when no option is selected.

#### Step 3: Optional activities

Reuse the eight Discovery activity choices. Select at most three; a fourth is not added and receives inline feedback. Leave all unselected to skip. Do not add a separate "not sure about activities" answer. "Show me areas" is always enabled; "Skip activities and browse broadly" clears only the draft activity picks and continues. Back returns to class context without losing the draft.

At every stage, keep "Browse every area" available. It opens the shared neutral all-areas Results without hiding any area. If saving the current draft fails, explain that the previous saved choices were not changed and offer a way to browse every area without saving the draft.

**Rules for both questions:**
- No answer is required; "I'm not sure / another class" and skipping the class question both lead to a general view.
- Back preserves the current in-memory answers.
- No exact address, family income, phone, email, caste, or religion.
- No free-text answers in MVP.
- Do not ask about subjects, location, budget, or study/work preference unless verified catalogue behavior exists and is explained before asking.

#### Step 4: Results

**Header:** "Here are areas you can explore"

**Content:** Reuse the shared Areas to Explore results component at `/discover/results`. If answers were supplied, show only their literal values (“You chose Class 12” / “You picked working outdoors”) and mapped areas with the caveat that these are exploration prompts, not recommendations. Keep every area available. If no answers were supplied, omit the answer summary and say “No problem—let’s browse broadly.” Only describe or link catalogue content that has passed the review/readiness gate; do not imply an area card opens a catalogue if no such destination or verified records are available.

**Actions:** “Change answers” returns to Guided Explorer with saved choices prefilled. “Browse every area” opens the shared neutral Results without clearing saved choices. An area action opens the same public study-options path available from direct Discovery. No confirmation is needed to browse. Guided Explorer never becomes mandatory because the student is unsure.

**Privacy:** No free-text fields or profile in MVP. Do not imply answers are private until the actual data flow has been verified. Leaving before continuing does not save the in-memory draft; continuing updates the existing session-scoped browsing state.

#### Later, not MVP: My Guidance Home (`/guidance`)

Do not build a personalized dashboard in this MVP. The shared Results and public catalogue are the destination for both Discovery and Guided Explorer.

If built later, it must be optional, use only explicitly saved data, show all catalogue options, and define each destination before linking to it. Exams, scholarships, compare, resume, and saved-work hubs are out of MVP scope until their content and behavior are specified.

---

## 5. Thread Navigation (All Pages After Landing)

**Position:** Top of journey pages, below header. Do not require a breadcrumb trail for public catalogue pages.

**Format:**
```
You are here: Results → Study option → Course → Colleges → College details
     ↑ click an available step to go back
```

**Behavior:**
- Clicking an available step returns to that page
- Current step highlighted
- "Back to Discovery" returns to Discovery and preserves current class/activity choices
- "Clear my choices" is separate: confirm, clear current-tab choices, and return to Discovery in general-browse mode
- On a directly opened page, use a normal back link to its public parent; do not show a dead "previous page" step

**Purpose:** Keep the student oriented without implying a forced sequence. Do not display steps that do not apply to the page they opened. Avoid "Start over" wording when choices are preserved.

---

## 6. Save / Compare Actions

Save, compare, and action-plan features are **out of MVP scope**. Do not show disabled controls or links to unbuilt pages. Revisit only after their data model, privacy behavior, and public destinations are specified.

---

## 7. Empty / Error States (Must Be Honest)

| Situation | What the student sees |
|-----------|----------------------|
| No activity-to-area mapping is available | Show all areas in neutral order: "We don't have a clear connection for these picks yet. You can still browse every area." |
| Valid route, but no verified colleges are listed | "We don't have verified college listings for this option yet." Link to all colleges and all areas; do not claim no colleges exist |
| Search returns no matches | "No results for that search." Offer clear-search, browse all courses, and browse all colleges |
| Catalogue has no verified records yet | Say listings are not available yet; offer other published areas and do not render example institutions as real |
| Fees unknown | "Fees not currently verified — check college prospectus" (never ₹0 or "free") |
| Catalogue failed to load | "We're having trouble loading this information." Provide "Try again" and links to other public catalogue pages; do not show an empty state that looks successful |
| Student wants class-organized options | Class 10 / Class 12 choices organize browsing only; state when verified class-specific records are not available and keep every area open |
| Student wants to go back | Named back links work on every page; browser Back behaves normally |

---

## 8. Direct URL Access / Missing Session State

**Direct URL to valid content:** Render the requested public content without requiring session state. For example, `/discover/results` (all areas if no session), `/discover/streams`, `/streams/science`, `/discover/courses`, `/courses/diploma`, `/catalogue`, `/catalogue?area=[area-slug]`, `/colleges`, and `/college/[code]` are independently browseable. Offer an optional link: "Want to explore by class or interests? Start at Discovery."

**Direct URL to invalid/missing content:** Show "We couldn't find that page" with links to Discovery, all areas, and the unfiltered college list. Distinguish an invalid slug from a valid page whose catalogue has no verified entries, and distinguish both from a load failure.

**Missing session state:** Never guess the student's class and never blank a valid public content page. If a student requests a class-filtered list without a class selection, show the unfiltered list and a non-blocking class prompt. `/colleges` is the explicit unfiltered college list.

**Browser Back:** Preserve normal behavior; direct entry must not produce a broken "previous page" link.

---

## 9. Changing Earlier Choice After Progressing

**Problem:** Changing Class 10 to Class 12 should not leave a stale stream, route, or college selection attached.

**Resolution:**
- Class is a browsing context, not an identity or verdict. When the student changes Class 10 ↔ Class 12, preserve activity picks but clear the current class-specific stream/course choice and any route-filtered college list. Do not maintain a hidden second path.
- Explain the reset once: "Your class changed, so we cleared the previous study option. Your activity picks are still here."
- Apply the same reset if moving from either class to "not sure / another class"; an unchanged class selection does not clear anything.
- When activity picks change, update the suggested areas on Results. Keep the chosen class and any course/college the student explicitly opened; picks are not eligibility filters and must not silently erase their browsing.
- Public pages remain directly accessible; changing context affects only the current personalized browsing chain.

---

## 10. Mobile & Accessibility Requirements

- Thumb-friendly buttons (minimum 44px touch target)
- Readable text without zooming
- No horizontal scrolling
- Works on slow connections (no heavy images, no auto-playing video)
- Minimal data usage
- Visible focus indicators for keyboard navigation
- Reduced-motion support (respect `prefers-reduced-motion`)
- WCAG AA contrast target

---

## 11. Data Storage & Privacy Boundary (Concrete)

**MVP state:** Store only the current tab's class context and activity picks in `sessionStorage` so they survive navigation and refresh. Do not store Guided Explorer profiles, saves, comparisons, or action plans in this MVP. Do not put answers in URLs, analytics events, or server requests.

**Lifetime and clearing:** State survives refresh/navigation in the same tab and is normally removed when that tab's session ends; browser session-restore behavior may vary. Provide "Clear my choices" on all journey pages, confirm, clear the session values, and return to Discovery. This does not erase hosting or analytics logs.

**Privacy wording is a release gate, not a pre-verified promise.** Before launch, inspect network requests, analytics, hosting configuration, and logs; ensure no answer values are transmitted or recorded. Public page requests still reach the hosting service and may generate technical logs. Publish a privacy notice that accurately describes the deployed behavior. Do not use "device only," "not sent to any server," "private," or guaranteed deletion claims until verified.

**Intended user-facing explanation after verification:**
```
Your choices help us show the options you asked to browse. They are not a test result or a decision about what you can study.
You can clear your choices at any time. See our privacy notice for information about technical data used to run this service.
```

No account, cloud sync, saving, or sharing is part of this MVP.

---

## 12. Implementation Order (MVP)

1. **Catalogue readiness gate** — confirm real course/college records and official sources; do not build UI around placeholder facts.
2. **Landing and public browse entry** — every visible door reaches a real route or an explicit coming-later state; enable `/catalogue` search before activating Door 3.
3. **Discovery state** — a Class 10 / Class 12 / "I’m not sure" context gate, optional activities, reversible choices, and an always-available browse-all bypass.
4. **Results and area mappings** — reviewed editorial mappings, dynamic deduplication, and "browse every area."
5. **Class 10 and Class 12 public catalogues** — verified options, clear unknowns, no unsupported career/eligibility claims.
6. **Shared college list and college detail** — route-filtered and unfiltered list, scannable basics, no duplicate admission/exam sections.
7. **Direct URL, empty/error recovery, navigation, and privacy notice** — valid public URLs work without session state; verify network behavior before making privacy claims.
8. **Guided Explorer** — optional step-by-step entry to the same Results; skipped answers go to general browse.

Do not include My Guidance Home, save/compare, scholarships/exam hubs, or action plans in MVP.

---

## 13. What to Avoid (Student Perspective)

| Avoid | Why |
|-------|-----|
| Specific job titles as suggestions ("Computer Repair Technician") | Sounds like we're assigning a career |
| "Top match" or "Best for you" badges | Feels like a test result/ranking |
| Fixed "Step 3 of 5" counters | Feels like an exam |
| Salary promises | Misleading, unverified |
| Fee numbers without verification | Dishonest |
| Forcing Guided Explorer before showing colleges | Discovery should work standalone |
| Showing a course as eligible because of an interest or class label alone | Eligibility must come from current official requirements |
| Asking class when a student is only browsing general content | Unnecessary friction |
| Sending all "not sure" students to a profile or empty dashboard | Browse broadly with neutral ordering |
| Linking to an unfinished page or hub | Broken doors make students feel stuck |
| Empty state with no recovery | Dead end |
| "Counselling" implying a human | Use "Guided Explorer" + "no person involved" disclaimer |
| Guaranteed deletion, privacy, or sign-up claims | Do not make them until the exact behavior is implemented and verified |
| "Checked January 2026" without real data | Use real checked date or provisional language |
| "Students with similar picks often explore" | Implies usage data we don't have |
| Hard filters that hide options based on tentative answers | Keep all options reachable; clearly explain any verified filter |

---

## 14. Relationship to Old Project

**Old project (`careerbridge/`) is reference-only. Do not modify.**

**Portable from old project:**
- `ui.tsx` component kit → rewrite to new Tailwind 4 tokens (`--forest`, `--ivory`, `--gold`)
- `globals.css` token system → already in new project
- `source-link.tsx` pattern → keep for data honesty
- `verification-badge.tsx` pattern → keep — critical for data honesty

**Do NOT port from old project:**
- 8+ abstract counselling questions → use only the two optional inputs with defined effects
- 6 undefined guidance hubs → defer from MVP
- Fixed result count → render every distinct mapped area and retain browse-all
- Specific job titles as suggestions → broad areas first
- Free-text "add optional detail" → removed for MVP

---

**End of specification.** This document is the MVP source of truth for the User Type 1 journey: low-pressure landing, class-context-first Discovery, optional activities, broad Areas to Explore, directly reachable public catalogue content, optional Guided Explorer, and honest recovery behavior. Before release, validate catalogue facts and deployed privacy/data flow; broad area associations are editorial prompts, not verified educational guidance. Validate the experience with students or representative users on mobile and keyboard before treating the flow as proven.
