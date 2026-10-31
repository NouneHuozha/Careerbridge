# TODO

## Areas to Explore → class-specific study-option entry

- `/discover/results` remains the shared destination from Discovery and says “Here are areas you can explore.” It does not present results as a test, profile, ranking, recommendation, career assignment, or eligibility decision.
- The page uses saved browsing context only as context. It shows Class 10, Class 12, or general/no-class-selected visibly; it never infers a class. Activity picks are optional; zero picks or missing/invalid saved state show all areas in neutral order without implying a profile.
- With activity picks, show every distinct curated mapped area, deduplicate activities that map to the same area, and explain literally which picked activities may connect to that area. Picks suggest where to begin; they never hide other areas or establish eligibility.
- Keep every area reachable. “Browse all areas” opens neutral all-area mode without clearing answers. “Change my choices” returns to Discovery and preserves saved answers. “Clear my choices” is separate, asks for confirmation, removes current-tab choices, and returns to Discovery in general-browse mode.
- When saved data is malformed, do not use it to render a personal context; show broad public content, explain that the data was not used, and provide the same confirmed clear-and-return recovery. If storage is inaccessible, do not claim that it was cleared or preserved.
- Do not repeat the Class 10/12 category cards on Results. Class 10 context leads to `/discover/streams`; Class 12 context leads to `/discover/courses`. General/unspecified context remains neutral and may offer an optional route back to Discovery to choose a context; it must not silently select a branch or route the student to Guided Explorer.
- If a class-specific catalogue is not ready, explain that honestly and keep broad-area browsing and change-context actions available; do not create fake “Explore” links or disabled “Coming later” controls.

## Public Class 10 Path — Stream Options (`/discover/streams`)

- A student may open this page after selecting Class 10 or directly as public catalogue content; it must render without session state. It must not claim the visitor is personally a Class 10 student or is eligible for any option.
- The page answers “After Class 10, what would you like to study?” Its header has a working back link to Areas to Explore; keep a separate Change choices action.
- Show four equal-weight study-category cards: Science; Arts / Humanities; Commerce; Vocational / Skill. Each card has its name and a plain-language summary. Show example subjects only when verified for the actual institution/board. On a detail page, hard-coded general “areas to research” may be used to make the path explorable only if they are prominently labelled illustrative and not presented as verified or locally available.
- A short, stable explanation may open inline using an accessible disclosure. Keep “Explore this option” as a distinct action only when a real public destination with reviewed content exists. Do not imply that a stream guarantees entry to a course or job.
- Where specific local subjects, options, or requirements are not verified, state that plainly. Do not invent a subject combination, school, course, prerequisite, or admission fact. Offer working actions to browse all areas and to say “I’m not sure yet” without clearing activity picks.

## Public Class 12 Path — Course Areas (`/discover/courses`)

- A student may open this page after selecting Class 12 or directly as public catalogue content; it must render without session state. It must not claim the visitor is personally a Class 12 student or is eligible for any option.
- The page answers “After Class 12, what kind of study interests you?” Its header has a working back link to Areas to Explore; keep a separate Change choices action.
- Show four distinct course-area cards: Diploma / Polytechnic; University degree; Skill training; Professional study. Each card has its name and a plain-language summary; list actual courses and verified duration/admission details only when they exist in reviewed catalogue records.
- A brief stable explanation may expand inline. Keep “See courses in this area” as a distinct action only when a real, working course destination exists. Do not infer eligibility from class or activity picks.
- Where specific local courses, providers, institutions, duration, or requirements are not verified, say so plainly. Do not invent course names, entry rules, exams, fees, or institutions. Offer working actions to browse all areas and to browse without a class context while preserving any saved activity picks.

## Shared page quality and navigation

- Both branch pages keep Class 10 and Class 12 content genuinely distinct while sharing consistent navigation, card behavior, responsive styling, and tone. Use the established CareerBridge forest-green, warm-cream editorial style; no decorative imagery is required for these text-led choices.
- Keep essential caveats and catalogue status visible outside disclosures. Cards need enough summary to compare without opening them. Do not force a choice or duplicate the same question/cards on Results and again on the branch page.
- On mobile, use readable single-column cards and generous touch targets; use a responsive multi-column layout on wider screens. Preserve keyboard operation, visible focus, semantic headings, readable contrast, and reduced-motion support.
- Keep answers out of URLs. Back and Change choices preserve answers. Clearing is separately confirmed and returns to Discovery in general-browse mode. Valid public pages remain usable without session state.
- Maintain the public route manifest for every implemented page. Keep the optional Guided Explorer distinct and voluntary; uncertainty never sends the student there automatically.

## Landing direct-browse entry

- The Landing page's “I want to browse on my own” / “Browse options” action opens `/discover/results?mode=all` directly. It does not scroll to static library tiles or require class/activity answers.
- Keep the “I know what I’m looking for” search entry explicitly unavailable until `/catalogue` can search published, reviewed course and college records. Do not make placeholder search controls appear functional.

## Shared College List and College Detail

- Use one public College List page for Class 10 and Class 12 routes: `/colleges?route=[route-slug]`; `/colleges` is the explicit unfiltered list. Direct access works without session state. Route filters use public route identifiers, never student answers or inferred class context.
- List only reviewed institution/course records. Each college card shows the verified institution name, type, district/location, and verified course/route association. Link the institution name to `/college/[code]`. The official website opens safely in a new tab.
- Show admission requirements only with an official source; otherwise state “Not verified.” Show fees only for the named course and academic year; when unknown say “Not currently verified — check college prospectus.” For hostel information, use a verified value or “Not verified,” and omit unsupported claims.
- An unknown/invalid route is different from a valid route with no verified college entries. For a valid empty route, say “We don’t have verified college listings for this option yet,” without implying no colleges exist, and offer “Browse all colleges” (`/colleges`) and “Browse all areas” (`/discover/results`). Any genuine load failure gets a separate actionable error and retry.
- The unfiltered list uses all published/reviewed records; a filtered list shows only records with a reviewed association to that route. Route filters can be removed without deleting saved browsing choices.
- `/college/[code]` is a public detail page with a working return to the previous/list view. Show verified courses; one concise admission/eligibility section; verified location; course-and-year-specific fees or the exact unknown wording above; official contact links; and verified hostel/facilities only. Unknown values stay unknown, and official sources/check dates accompany changing facts where available. Do not show save/compare actions.
- A small hard-coded dataset is acceptable before the backend exists only when each real institution/course fact is sourced and labelled accurately. Do not invent an institution, course offering, route association, admission rule, fee, deadline, or source. Keep the data in one replaceable data module and use honest empty states when no supported record exists.
- Keep both class branches converging on this shared list after a real study-option/course choice. Do not create separate Class 10 and Class 12 college lists, and do not add comparison, save, action-plan, account, or personal-profile features as part of this slice.
- Add `/colleges` and `/college/:code` to the public route manifest. Public content and invalid-detail recovery must work without session state.

## Public study-option detail pages

- Make every Class 10 stream card navigate with a distinct “Explore this stream” action to its public `/streams/[stream]` page (Science, Arts/Humanities, Commerce, or Vocational/Skill). Keep its short summary and accessible inline “What this means” expansion separate from that navigation action.
- Make every Class 12 course-area card navigate with a distinct “See courses in this area” action to its public `/courses/[area]` page (Diploma/Polytechnic, University degree, Skill training, or Professional study). Keep its inline explanation separate from the course-area destination.
- Every valid detail URL renders directly without saved session state. Use async route params, validate slugs against the known categories, and provide a human-friendly invalid-slug page with working links to Discovery, all areas, and the relevant public parent guide. An invalid slug is not the same state as a valid page with no verified catalogue records.
- Design each screen for its use rather than forcing identical layouts: Class 10 details should orient a student to a broad stream and what to verify with their school/board; Class 12 details should foreground course-area catalogue status and the facts a student must check with the official provider. Keep useful summaries visible and essential status outside disclosures.
- Hard-coded general study areas or course types may be shown as examples because the user approved them for this stage. Label them prominently as “Illustrative examples — not verified local listings,” and explain that local availability and admission facts are not confirmed. Keep those examples visually separate from actual catalogue records; they do not count as verified listings. For any later reviewed record with changing or consequential facts, show the official source and check date, label unknown facts “Not verified,” and do not imply eligibility. Do not invent subjects, exams, entry rules, fees, institutions, or record IDs. Also show a clear, honest no-verified-listings state; never imply that no real options exist or use a disabled “Coming soon” link.
- Where overview cards repeat an action label, include the selected stream/course-area name in that link's accessible name.
- Only show “See colleges” or other downstream catalogue actions if a real, working public destination with verified content exists. When no listing is available, keep a prominent route back to the relevant Class 10/12 overview, a route to browse all areas, and a route to browse without a class context; do not strand the student.
- Distinguish invalid slug, valid empty catalogue, and a genuine catalogue-load failure. Do not mislabel an empty state as a load failure. Keep public content usable when session storage is empty, invalid, or unavailable.
- Every detail page has a working named link to its correct public parent. Change choices preserves valid answers; separately confirmed Clear my choices clears current-tab values and returns to general Discovery. Browsing without class context preserves any readable activity picks and does not make claims when storage is unavailable.
- Keep answers out of URLs. Add `/streams/:stream` and `/courses/:area` to the public route manifest and keep all route entries synchronized with App Router source.
- Preserve mobile readability, no horizontal scroll, generous touch targets, visible keyboard focus, semantic page structure, reduced-motion support, and the project's accessible text contrast. Use lightweight CSS/vector motifs rather than unneeded heavy imagery.

## Optional Guided Explorer (`/counselling`)

- Guided Explorer is a voluntary, self-guided alternative from Discovery or Areas to Explore. It is not a human counsellor, a diagnosis, a profile, a required step, or an automatic destination for a student who is unsure. The direct Discovery path continues to the same shared Results page.
- The header says “Guided Explorer” and “Self-guided browsing — no person involved. You can skip questions and browse all options.” The welcome screen is titled “Let’s look around together,” says there are no perfect answers and choices can be changed, offers “Start,” and keeps “Browse every area” available without starting.
- Seed the questions from readable choices already saved in the current tab. Keep new edits in memory until the student continues to Results; leaving early must not replace previously saved choices. Do not put answer values in URLs, create a profile, or make unverified privacy promises.
- The optional class step asks “Which class are you in now?” and offers Class 10, Class 12, “I’m not sure / another class,” and “Skip class question.” Skipping leaves class unspecified; Continue remains available without a selection. Class context only organizes browsing and never qualifies or excludes a student.
- The optional activity step reuses the eight Discovery activities. A student may choose up to three or none; a fourth is not added and receives inline feedback. Do not add a separate “not sure about activities” answer. “Show me areas” is always available. “Skip activities and browse broadly” clears only the draft activity picks; Back returns to the class step without losing the draft.
- Keep “Browse every area” available at every stage. It opens the shared neutral Results without saving the current draft or clearing earlier saved choices. If saving a continued draft fails, explain what is known about the saved choices and offer browsing without saving the draft.
- Results reuse `/discover/results` and show only literal chosen values and mapped exploration prompts, not a recommendation or inferred profile. Keep every area available. “Change answers” returns to Guided Explorer with saved choices prefilled; public option links use the same paths as direct Discovery.
- Ask no exact address, family income, phone, email, caste, religion, or free-text questions. Do not add exams, fees, scholarships, or other questions unless verified catalogue behavior exists and is explained first.
- Add `/counselling` to the public route manifest. All screens remain keyboard-operable, mobile-readable, and usable without saved session state.
