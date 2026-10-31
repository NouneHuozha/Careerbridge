# CareerBridge Next — User Type 1: Detailed Plan from Discovery to End

**Target user:** Class 10 / Class 12 student in Nagaland (Northeast India) who has no idea what to do after school.  
**Scope:** From the Discovery page (`/discover`) through to the final College Detail page, including the optional Counselling branch.  
**Status:** Final planning doc — ready for implementation.

---

## 0. Flow Overview (Single Source of Truth)

```
Landing (/)
  └─ Door 1: "I have no idea where to start"
        └─ DISCOVERY (/discover) ──┬─ Class 10 ──► Stream Options → Stream Detail → College List → College Detail
                                   └─ Class 12 ──► Course Areas   → Course Detail   → College List → College Detail
  └─ (Optional branch from any page): COUNSELLING (/counselling)
        └─ Orientation → Questions → Review & Confirm → My Guidance Home → Possibilities → Routes → Colleges
```

**Key rule:** Discovery and Counselling are equal, independent entry points. Neither blocks the other. A student can do Discovery only, Counselling only, or both in any order.

**Maximum pages from Discovery to College Detail:** 5 pages (Class 10), 5 pages (Class 12), 6 pages (Counselling branch).

---

## 1. DISCOVERY PAGE (`/discover`) — SHARED ENTRY

### 1.1 Purpose
Translate everyday activities into career direction without asking for abstract self-assessment ("strengths," "values," "goals").

### 1.2 URL
`/discover`

### 1.3 Layout (mobile-first, single column)

#### Header
- **Back link:** `← Back to start` → goes to `/`
- **Title:** "Start with things you might like"
- **Subtitle:** "Pick 1 to 3 everyday things that sound like you. You don't have to pick anything if you're not sure."

#### Activity Cards (6–8 cards, 2 per row on mobile, 3–4 on desktop)

Each card: icon + label + one-line plain-language meaning + selection state (selected / unselected / hover)

| # | Label | Plain-language meaning | Icon concept |
|---|-------|----------------------|--------------|
| 1 | Fixing things | Repairing phones, bikes, electronics | Wrench / screwdriver |
| 2 | Helping people feel better | Caregiving, health support, first aid | Heart / cross |
| 3 | Working outdoors | Plants, animals, nature, fieldwork | Tree / leaf |
| 4 | Computers & phones | Using computers, mobile apps, internet | Laptop / phone |
| 5 | Organising & planning | Events, schedules, keeping things in order | Calendar / clipboard |
| 6 | Drawing & making | Art, crafts, design, building things | Pencil / hammer |
| 7 | Working with numbers | Accounts, calculations, data | Calculator / abacus |
| 8 | Teaching & explaining | Helping friends understand, tutoring | Chalkboard / person |

**Card states:**
- **Unselected:** White background, subtle border, gray text
- **Hover:** Light green background (`--forest` at 5%), border tinted
- **Selected:** Stronger green background (`--forest` at 15%), checkmark inside, border solid `--forest`

**Selection rule:** Maximum 3 cards. A 4th tap deselects the earliest selection or shows gentle toast: "Pick up to 3 things."

**Special option:** "Not sure about any of these" — a toggle below the cards. If selected, all activity cards deselect and the student can still proceed.

#### Action Buttons (below cards)

Stacked vertically on mobile, side-by-side on desktop:

| Button | Label | Behavior | When enabled |
|--------|-------|----------|--------------|
| Primary | "Show me options" | → Class 10/12 path page | Only if 1–3 cards selected OR "not sure" toggled |
| Secondary | "Browse all areas without picking" | → General browse page (all areas equally) | Always |
| Tertiary | "I'm still not sure — help me look around" | → Gentler explore view with broader categories | Always |

#### Reassurance Line
Below buttons, centered, small text: "These are just starting ideas. You can change your mind anytime. Nothing here decides your future."

### 1.4 Edge Cases

| Scenario | Behavior |
|----------|----------|
| 0 cards picked, clicks "Show me options" | Gentle toast: "Pick at least one thing, or use 'Browse all areas' instead." |
| 0 cards picked, clicks "Browse all areas" | Goes to general browse showing all career areas equally |
| Picks cards, changes mind before submitting | Can deselect cards freely; primary button re-evaluates |
| Picks "not sure" + cards | "Not sure" takes precedence; cards ignored |

### 1.5 System Behavior (Behind the Scenes)
- Maps selected activities to career clusters:
  - "Fixing things" → Technical / Engineering cluster
  - "Helping people feel better" → Health / Care cluster
  - "Working outdoors" → Nature / Agriculture cluster
  - "Computers & phones" → IT / Digital cluster
  - "Organising & planning" → Business / Admin cluster
  - "Drawing & making" → Creative / Design cluster
  - "Working with numbers" → Finance / Data cluster
  - "Teaching & explaining" → Education / Social cluster
- Selects 2–3 career areas with genuine overlap. Never pads to a fixed number.
- If zero strong matches: shows honest message + "Browse all areas" option.

---

## 2. CLASS 10 PATH (After Discovery)

### 2.1 Stream Options Page (`/discover/streams`)

**Trigger:** Class 10 student selected activities on Discovery.

**URL:** `/discover/streams`

**Header:**
- Back link: `← Back to activities` → `/discover`
- Title: "After Class 10, what would you like to study?"
- Subtitle: "Pick the stream that sounds closest to you. You can change later."

**Four Stream Cards (equal weight, 2 per row):**

| Stream | What it means (plain language) | Careers it can lead to | Example subjects |
|--------|-------------------------------|----------------------|------------------|
| **Science** | Study physics, chemistry, biology, maths in Class 11-12 | Doctor, engineer, researcher, teacher | Physics, Chemistry, Biology, Maths |
| **Arts** | Study history, geography, political science, languages | Teacher, civil services, writer, designer | History, Geography, English, Political Science |
| **Commerce** | Study accounts, business studies, economics | Accountant, banker, business owner, CA | Accountancy, Business Studies, Economics |
| **Vocational / Skill** | Learn practical work (electrician, IT, healthcare, hospitality) | Electrician, technician, chef, nurse assistant | Trade-specific skills |

**Each card contains:**
- Stream name (large, serif font)
- "What you'll study" — 2-3 sentences
- "Careers this can lead to" — 3-4 examples, no rankings, no "top pick" badge
- "Exams after this stream" — gentle mention only (e.g., NEET for medical, JEE for engineering — only if relevant, not emphasized)
- Button: "See what comes after this stream →"

**Bottom link:** "Not sure which stream?" → "Browse all streams without picking" (shows all 4 equally without selection)

**Rule:** No "best stream" badge. No salary promises. No fixed number (student can pick 1 or browse all).

### 2.2 Stream Detail Page (`/streams/[stream]`)

**Trigger:** Student clicked a stream card.

**URL:** `/streams/science` (or arts, commerce, vocational)

**Header:**
- Back link: `← Back to streams` → `/discover/streams`
- Title: "[Stream Name]" (e.g., Science)
- Subtitle: "After Class 10, [stream] means studying [subjects] in Class 11-12."

**Content: Two or more paths from this stream (equal weight)**

Each path card contains:
- Path name (e.g., Medical line, Engineering line, Pure Science line)
- Focus (1-2 words)
- Leads to (3-4 career examples)
- Entrance exam? (Yes/No + name, only if applicable)
- Duration (e.g., "5.5 years (MBBS)", "4 years (B.Tech)", "3 years (B.Sc)")
- Button: "See colleges and courses →"

**Example for Science → Medical line:**
- Focus: Biology
- Leads to: Doctor, nurse, pharmacist, medical researcher
- Entrance exam: NEET (after Class 12)
- Duration: 5.5 years (MBBS)

**Example for Science → Engineering line:**
- Focus: Maths
- Leads to: Engineer, technician, researcher
- Entrance exam: JEE / state exams (after Class 12)
- Duration: 4 years (B.Tech)

**Verification badges on exam names where data exists:** "Checked January 2026" or "Not verified — check official source"

**Rule:** No path is "better" than another. Equal visual weight. No "Step 1 of 3" counter.

### 2.3 College / Course List for Stream Path (`/streams/[stream]/[path]`)

**Trigger:** Student clicked "See colleges and courses" on a stream path.

**URL:** `/streams/science/medical` (example)

**Header:**
- Back link: `← Back to Science` → `/streams/science`
- Title: "Medical line — courses and colleges"
- Subtitle: "Courses available after Class 12 in Nagaland and the Northeast."

**Course cards (list view, not grid dump):**

| Field | Content |
|-------|---------|
| Course name | e.g., MBBS, B.Sc Nursing, B.Pharm |
| Duration | e.g., 5.5 years, 4 years, 3 years |
| Entrance exam | NEET (with verification badge) or "Direct admission" |
| Colleges in Nagaland/NE | List of specific colleges offering this course |
| Save button | "Save this course" |

**Empty state:** "We don't have verified course listings for this path yet. You can check directly with institutions."

**Rule:** Only courses relevant to this path. No unrelated courses dumped in.

### 2.4 College List Page (Shared with Class 12 path) — see Section 4.3

### 2.5 College Detail Page (Shared) — see Section 4.6

---

## 3. CLASS 12 PATH (After Discovery)

### 3.1 Course Areas Page (`/discover/courses`)

**Trigger:** Class 12 student selected activities on Discovery.

**URL:** `/discover/courses`

**Header:**
- Back link: `← Back to activities` → `/discover`
- Title: "After Class 12, what kind of study interests you?"
- Subtitle: "Pick an area that sounds closest to you. You can change later."

**Course Area Cards (not job titles, equal weight):**

| Area | What it means | Example courses | Duration |
|------|---------------|-----------------|----------|
| Diploma / Polytechnic | Hands-on technical training | Computer Engineering, Civil Engineering, Electronics | 3 years |
| University Degree | Academic study at college/university | BA, B.Sc, B.Com, BCA, BBA | 3-4 years |
| Skill Certification | Short-term job training | ITI, NIELIT, paramedical courses | 6-12 months |
| Professional / Job-oriented | Direct employment focus | Nursing, teaching, hotel management | Varies |

**Each card contains:**
- Area name (large, serif font)
- "What you'll learn" — 2-3 sentences
- "Careers after completing" — 3-4 examples
- "Entrance exam needed?" — exam name or "Direct admission"
- Button: "See courses in this area →"

**Bottom link:** "Not sure?" → "Browse all courses without picking"

**Rule:** No specific job titles. No "top pick." Equal visual weight.

### 3.2 Course Area Detail Page (`/courses/[area]`)

**Trigger:** Student clicked a course area card.

**URL:** `/courses/diploma` (example)

**Header:**
- Back link: `← Back to course areas` → `/discover/courses`
- Title: "[Area Name]" (e.g., Diploma / Polytechnic)
- Subtitle: "Diploma courses are 3-year technical programs after Class 12."

**Content: Available course types in Nagaland/NE**

Table or card list:

| Course | Entrance exam | Duration | Colleges |
|--------|---------------|----------|----------|
| Computer Engineering Diploma | DEET | 3 years | Govt/Private Polytechnics |
| Civil Engineering Diploma | DEET | 3 years | Polytechnics |
| Electronics Diploma | DEET or direct admission | 3 years | Polytechnics |

Each course type:
- Button: "See colleges →"
- Verification badge on entrance exam

**Rule:** No course is "better" than another. No fixed count.

### 3.3 College List Page (Shared with Class 10 path) — see Section 4.3

### 3.4 College Detail Page (Shared) — see Section 4.6

---

## 4. SHARED COLLEGE FLOW (Class 10 & Class 12 Converge)

### 4.1 College List Page (`/colleges?route=[route-slug]`)

**Trigger:** Student clicked "See colleges" on a route/course.

**URL:** `/colleges?route=computer-engineering-diploma` (example)

**Header:**
- Back link: `← Back to [route name]` → previous page
- Title: "Colleges offering [Route Name]"
- Subtitle: "These are places where you can study this route. Not all details are verified yet."

**College cards (list view):**

| Field | Content |
|-------|---------|
| College name | e.g., Govt Polytechnic Kohima |
| Type badge | State Govt / Private / Autonomous |
| District | e.g., Kohima, Nagaland |
| Course offered | Specific course name |
| Admission | Entrance exam name or "Direct admission" |
| Fees | "Not currently verified — check college prospectus" OR actual verified amount |
| Hostel | "Check with college" if unknown |
| Official website link | Opens in new tab, clearly marked |
| Save button | "Save this college" |

**Below list:**
- "No more colleges found for this route in our database." (if end)
- "Still not sure? Go back and explore other routes."
- "Browse all colleges in Nagaland"

**Rule:** If no colleges match → honest empty state + recovery options. Never invent colleges.

### 4.2 College Detail Page (`/college/[code]`)

**Trigger:** Student clicked a college name from College List.

**URL:** `/college/govt-polytechnic-kohima` (example)

**Header:**
- Back link: `← Back to colleges` → previous page
- Title: College name
- Subtitle: Type badge + district + state

**Sections (in order):**

**1. About this college**
- What kind of institution
- Levels offered (diploma, degree, etc.)
- Type (State Govt / Private / Autonomous)

**2. Courses in this field** (scoped to the path student came from)
- Only courses relevant to the student's exploration path
- Each: course name, duration, entrance exam, verification badge
- NOT a dump of all courses the college offers

**3. Admission process**
- Entrance exam names
- Dates (if known, with verification badge)
- Documents needed
- Application cycle
- If unknown: "Admission dates not currently verified — check college website"

**4. Fees**
- Scoped to specific course and academic year
- If unknown: "Fees not currently verified — check college prospectus"
- NEVER show ₹0 or "free" for unknown fees

**5. Hostel & facilities**
- "Check with college" if unknown
- No invented amenities

**6. Scholarships**
- Provider, amount, deadline, eligibility
- Verification badge on each
- If none listed: "No scholarships currently listed"

**7. Entrance exams**
- Exam name, dates, documents, application window
- Verification badge
- If unknown: "Exam details not currently verified"

**8. Official website + contact**
- Opens in new tab
- Clearly marked as external link
- Phone/email if available

**9. Save this college** button (optional, guest or account)

#### "What's next?" Box (required on this page)
3-4 small, concrete actions:
1. "Check entrance exam dates (e.g., DEET)"
2. "Visit college website for current fees"
3. "Ask school office about application forms"
4. "Talk to parents about budget"

**Verification note at bottom:**
"Last checked: [date]. Some details may have changed. Always confirm with the college before applying."

**Verification badge rules:**
- Verified: "Source: [official source] — Checked January 2026"
- Not verified: "Not currently verified — check college prospectus"
- Never invent numbers

---

## 5. OPTIONAL COUNSELLING BRANCH (Separate Entry)

**Trigger:** Student clicks "I'm still not sure — help me look around" on Discovery, or navigates to `/counselling` from any page.

**URL:** `/counselling`

**URL:** `/counselling`

### 5.1 Orientation Page

**Header:**
- Back link: `← Back to start` → `/`
- Title: "A short conversation about you"
- Subtitle: "Your answers help CareerBridge show possibilities that are more relevant to you. They do not decide your future, rank you, or lock you into a path."

**Reassurance cards (3):**
1. "You can be unsure" — "There are no perfect answers."
2. "You stay in control" — "You can edit or change direction later."
3. "We ask only what helps" — "We do not need your exact address or family income."

**Guest note:** "You can continue as a guest. Guest progress is deleted after 24 hours of inactivity; sign up to keep it."

**Button:** "Start counselling" → Question 1

### 5.2 Counselling Questions (Max 5-6)

**Class 10 variant:**
1. "Which class are you in?" → Class 10 (radio, required)
2. "What do you like doing after school?" (concrete activities, multiple choice, "Not sure yet" option)
3. "Do you like studying books or doing practical work?" (radio, "Not sure yet")
4. "Where do you want to study after Class 10?" (same town / another town in Nagaland / outside Nagaland / not sure)
5. "Do you know what you want to do after Class 12?" (Yes / No / Not sure)

**Class 12 variant:**
1. "Which class are you in?" → Class 12 (radio, required)
2. "What subjects did you study?" (Science / Arts / Commerce / Vocational / Not sure yet)
3. "What do you enjoy doing?" (concrete activities)
4. "Do you want to study further or start working?" (Study further / Start working / Not sure)
5. "What matters most to you?" (Fees / Location / Job quickly / Further study / Not sure)

**Rules for every question:**
- "Not sure yet" is always a valid option
- Back button works and preserves answers
- No question is mandatory to proceed
- No "you must answer this to continue" pressure
- Optional questions marked optional
- Progress shown as topic label, not "Step X of 5"

### 5.3 Review & Confirm Page

**Header:**
- Back link: `← Back to questions` → `/counselling`
- Title: "Here is what we understood"

**Content:**
- "You said:" — plain-language summary of answers
- "We understood:" — interpreted starting picture
- "Still unclear:" — anything marked "not sure"
- [Change] link per section
- [Add optional detail] button

**Confirmation button:** "Confirm this starting picture" — explicitly states: "This guides your exploration. It does not decide your future. You can change it later."

### 5.4 My Guidance Home (`/guidance`)

**Trigger:** After counselling confirmation.

**Header:**
- Back link: `← Back to home` → `/`
- Title: "My Guidance"
- Subtitle: "Your starting picture"

**Sections:**

**1. Orientation**
- "Your counselling picture is a starting point, not a career assignment."

**2. Starting picture**
- Brief summary of relevant signals
- [Review / Edit] button

**3. Supported possibilities** (2-4 max, data-driven count)
- Each: direction card + "why this may connect" (plain language)
- [Open field guide] button per possibility
- No fixed count badge

**4. Direct contextual entry hubs** (independent, equal weight)
- Study pathways
- Courses
- Institutions
- Exams & requirements
- Fees & financial aid
- Compare options

**5. Resume / saved work** (if persistence available)
- "Continue a previous exploration / saved work (when available)"

**6. Optional next actions**
- 2-3 small checks, not a mandatory checklist

**Rules:**
- No dashboard with badges or completion percentages
- No fixed number of possibilities
- "Not sure yet" answers don't lead to empty state
- No forced sequence between hubs

---

## 6. THREAD NAVIGATION (All Pages After Landing)

**Position:** Top of page, below header.

**Format:**
```
You are here: Discovery → [Stream/Course Area] → [Route/Path] → Colleges
     ↑ click any step to jump back
```

**Behavior:**
- Clicking any step jumps back to that page
- Current step highlighted
- "Start over" button resets to Discovery

**Purpose:** Student never feels lost. Always knows where they are and can go back instantly.

---

## 7. SAVE / COMPARE ACTIONS (Available Throughout)

At any point, student can:
- **Save a college/course:** Adds to "My saved items" (guest session)
- **Compare:** If 2+ compatible items saved → side-by-side comparison (fees, duration, entrance requirements)
- **Action plan:** Simple checklist student creates themselves: "Check DEET exam dates," "Visit college office," "Ask parents about budget"

**No export, no sharing, no family discussion sheet** — future capabilities only.

---

## 8. EMPTY / ERROR STATES (Must Be Honest)

| Situation | What the student sees |
|-----------|----------------------|
| No careers match activity picks | "We couldn't find strong matches for those picks. Try browsing all career areas instead." |
| No colleges for a route | "We don't have verified college listings for this route yet. You can check directly with institutions." |
| Fees unknown | "Fees not currently verified — check college prospectus" (never ₹0 or "free") |
| Database unavailable | "We're having trouble loading information. Please try again." |
| Student wants to go back | Named back links work on every page + thread navigation |

---

## 9. MOBILE & ACCESSIBILITY REQUIREMENTS

- Thumb-friendly buttons (minimum 44px touch target)
- Readable text without zooming
- No horizontal scrolling
- Works on slow connections (no heavy images, no auto-playing video)
- Minimal data usage
- Visible focus indicators for keyboard navigation
- Reduced-motion support (respect `prefers-reduced-motion`)
- WCAG AA contrast target

---

## 10. VERIFICATION BADGE RULES (Non-Negotiable)

| State | Badge text | Example |
|-------|-----------|---------|
| Verified | "Source: [official source] — Checked January 2026" | Source: NBSE — Checked January 2026 |
| Not verified | "Not currently verified — check college prospectus" | Fees not currently verified |
| Unknown | "Not currently confirmed" | Hostel availability not confirmed |

**Never:** Invent fee numbers, invent exam dates, show "free" when unknown, show "₹0" when unknown.

---

## 11. WHAT TO AVOID (Student Perspective)

| Avoid | Why |
|-------|-----|
| Specific job titles as suggestions ("Computer Repair Technician") | Sounds like we're assigning a career. Use broad areas instead |
| "Top match" or "Best for you" badges | Feels like a test result/ranking |
| Fixed "Step 3 of 5" counters | Feels like an exam |
| Salary promises | Misleading, unverified |
| Fee numbers without verification | Dishonest |
| Forcing counselling before showing colleges | Discovery should work standalone |
| Class 10 student seeing B.Tech colleges | Wrong level |
| Class 12 student seeing "Choose Science/Arts/Commerce" | Wrong level |
| Six hubs on one page | Overwhelming |
| Empty state with no recovery | Dead end |

---

## 12. IMPLEMENTATION ORDER (MVP)

1. **Discovery page** (`/discover`) — activity cards
2. **Class 10 path** — Stream options → Stream detail → College list → College detail
3. **Class 12 path** — Course areas → Course detail → College list → College detail
4. **Thread navigation** on all pages
5. **College detail** with "what's next" box, scholarships, entrance exams
6. **Counselling** (optional, separate entry)
7. **Save / compare** functionality

---

## 13. Relationship to Old Project

**Old project (`careerbridge/`) is reference-only. Do not modify.**

**Portable from old project:**
- `ui.tsx` component kit → rewrite to new Tailwind 4 tokens (`--forest`, `--ivory`, `--gold`)
- `globals.css` token system → already in new project
- `source-link.tsx` pattern → keep for data honesty
- `verification-badge.tsx` pattern → keep — critical

**Do NOT port from old project:**
- 8+ abstract counselling questions → replace with 5-6 concrete questions
- 6 hubs on My Guidance home → replace with 2-4 possibilities + direct entry
- Fixed "3 possibilities" count → data-driven count
- Specific job titles as suggestions → broad areas first

---

**End of plan.** This covers every page, every step, every edge case for User Type 1 from Discovery to the end, split by Class 10 and Class 12, with optional Counselling branch, honest data practices, thread navigation, and verification rules.
