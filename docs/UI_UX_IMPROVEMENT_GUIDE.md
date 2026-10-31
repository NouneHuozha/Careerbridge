# UI/UX Improvement Ideas & Guidance Elements

> **Improve what exists. Do not invent requirements.**

This is a general reference for website UI/UX improvement ideas and guidance elements. It is not a fixed visual design or product specification.

## 1. Purpose and use

- Read the user's specific request first and keep changes within its scope.
- Inspect the relevant page and existing code before recommending or implementing changes.
- Do not assume a preferred brand style, color palette, font, page flow, feature, or business requirement.
- Preserve intentional existing choices unless there is evidence they cause a problem or the user asks to change them.
- If missing context materially affects the result, ask a concise question instead of inventing an answer.
- Treat suggestions as options until they are relevant to the actual page and task.

## 2. General UI/UX improvement ideas

- **Visual hierarchy:** make important content and the primary action easy to notice.
- **Layout and spacing:** review alignment, grouping, whitespace, density, and consistency.
- **Consistency:** similar components and interactions should behave similarly.
- **Readability:** keep text legible, concise, and easy to scan.
- **Navigation:** help users understand where they are and what options are available.
- **Interaction feedback:** communicate click, selection, save, submit, loading, and error states.
- **Forms and inputs:** use clear labels, explain constraints, prevent avoidable errors, and make errors actionable.
- **Responsive behavior:** support different screen sizes and input methods.
- **Accessibility:** review keyboard operation, focus visibility, semantic structure, contrast, labels, and assistive technology.
- **Loading and performance:** communicate loading where useful; avoid unnecessary effects and heavy dependencies.
- **Content clarity:** use plain language and action labels that explain what will happen.
- **Error prevention and recovery:** help users avoid mistakes and recover from failures.
- **Empty states:** explain why an area has no content and offer a relevant next step where one exists.
- **Motion and microinteractions:** use animation only when it clarifies state, feedback, or continuity.
- **Visual polish:** refine details when they support clarity and consistency.

## 3. Guidance elements: when and how to use them

| Element | Use when | Example |
|---|---|---|
| Helper text | A field/control needs a brief explanation or constraint | “Choose up to three activities to explore.” |
| Instructional text | Users need to know how to complete a step | “Choose up to three options to continue.” |
| Supporting text | A heading needs context, not a direct instruction | “These options can help you explore the available choices.” |
| Information box / info callout | Neutral information deserves a distinct container | “You can change this preference later.” |
| Tip box | Optional advice may improve the result | “Tip: Review your details before submitting.” |
| Warning / caution box | A meaningful risk or consequence needs attention | “Leaving this page may discard unsaved changes.” |
| Error message | Input needs correction or an action failed | “Enter a valid email address.” |
| Success message | An action has actually completed | “Your changes have been saved.” |
| Toast notification | Brief, non-blocking confirmation is useful | “Item saved.” |
| Tooltip | A control/icon needs a short explanation on hover or focus | Explain an unfamiliar icon; do not hide essential instructions here. |
| Popover | Optional details or a small group of controls are needed on demand | A compact panel with extra options. |
| Coach mark | A particular control needs a brief guided explanation | Highlight a button and explain its purpose. |
| Onboarding hint/tour | New users need a short introduction | A brief, dismissible sequence of key features. |
| Contextual help | Help belongs beside the feature it explains | Explain a filter beside the filter. |
| Inline guidance | A short instruction belongs directly beside an action | A note beside an upload control explaining the next step. |
| Empty-state guidance | An area has no content | Explain the state and offer an optional relevant action. |
| Progress indicator | A process genuinely has multiple steps | “Step 2 of 4” with accurate progress. |

### Rules for guidance elements

- Place guidance close to the heading, field, or action it explains.
- Keep it concise, specific, and plain-language.
- Routine instructions usually belong directly on the page; use an information box only when extra emphasis is justified.
- Do not put every instruction in a box or repeat the same message in several places.
- Do not hide essential guidance exclusively in hover states, tooltips, color, or animation.
- Ensure guidance and icons are accessible and readable.
- Use warnings for meaningful consequences, not routine information.
- Confirm success only after an action actually succeeds.
- Do not rely on a brief toast for critical information.
- Keep onboarding short and allow dismissal or skipping where appropriate.
- If no special emphasis is needed, plain supporting text is often clearest.

## 4. Interactive states and feedback

Review the relevant states for each component:

- **Default:** purpose and behavior are clear.
- **Hover:** restrained cue; not the only way to access information.
- **Focus:** keyboard focus is visible.
- **Selected/active:** current choice is clear and not indicated by color alone.
- **Disabled:** unavailable state is clear; explain why when necessary.
- **Loading:** work in progress is communicated and duplicate submissions are prevented where needed.
- **Success:** completion is confirmed accurately.
- **Error:** message explains what happened and how to recover.
- **Empty:** absence of content is explained, with a relevant next step where appropriate.
- **Pressed/expanded:** buttons, menus, accordions, and similar controls communicate their state.

## 5. Accessibility and responsive review

- Use semantic elements and a logical heading structure.
- Make controls keyboard-operable with visible focus.
- Label form controls and associate helper/error text with the correct field.
- Check contrast and do not rely on color alone.
- Give meaningful images suitable alternative text and mark decorative images appropriately.
- Give icon-only controls accessible names.
- Check zoom, reflow, long text, and errors for clipping or unwanted horizontal scrolling.
- Make controls practical to use with touch input.
- Respect reduced-motion preferences.
- Test actual pages at relevant mobile, tablet, and desktop sizes.

## 6. Motion and microinteractions

- Use motion to clarify feedback, selection, expansion, or transitions—not merely as decoration.
- Keep animation brief and restrained.
- Prefer lightweight techniques and avoid unnecessary dependencies.
- Avoid motion that delays tasks, distracts users, or makes content hard to read.
- Respect reduced-motion preferences and keep the interface understandable without animation.
- Verify that motion does not cause layout shifts, clipping, or performance issues.

## 7. Practical UI/UX review checklist

- [ ] The page's purpose is understandable.
- [ ] The primary action is easy to identify where one exists.
- [ ] Hierarchy and spacing support scanning.
- [ ] Similar components behave consistently.
- [ ] Labels and instructions are clear and concise.
- [ ] Guidance is useful, well placed, and not excessive.
- [ ] Relevant focus, selected, disabled, loading, success, and error states exist.
- [ ] Forms have clear labels and actionable validation.
- [ ] Layout works at relevant screen sizes without clipping or unwanted overflow.
- [ ] Keyboard navigation and focus visibility have been checked.
- [ ] Contrast, accessible names, and semantic structure have been considered.
- [ ] Animations are purposeful and do not obstruct use.
- [ ] Visible controls work; no fake buttons or misleading success messages were added.
- [ ] Changes do not introduce unrelated regressions.

## 8. Instructions for the coding agent

1. Read the user's request carefully and identify its scope.
2. Inspect the relevant page and existing project patterns before proposing changes.
3. Do not invent product requirements, workflows, features, brand choices, colors, fonts, or content.
4. Do not assume every suggestion in this guide belongs on every page.
5. If missing information materially affects the implementation, ask rather than guessing.
6. Prefer the smallest coherent change that improves the identified issue.
7. Reuse existing components and dependencies where appropriate; do not add libraries without a concrete need.
8. Implement relevant states and responsive behavior for changed elements.
9. Run available relevant checks and report what was actually run.
10. Inspect the rendered result when a preview/browser is available and fix visible problems.
11. Summarize what changed and mention unresolved limitations.
12. For CareerBridge students, including minors, follow the project's data-minimization and privacy rules; do not add personal-data collection as a UI/UX improvement.

## 9. Proactive use during design

Use this guide as an ongoing UI/UX design reference throughout the design process—not merely when the user explicitly asks for a specific improvement. Consult it while planning, designing, implementing, and reviewing a page. Proactively notice relevant opportunities to improve hierarchy, layout, interactions, usability, accessibility, responsive behavior, feedback, and user guidance, including helper text, instructional text, tooltips, contextual help, and other guidance elements. Apply the relevant improvements without requiring the user to list every detail in each prompt.

Use judgment: this guide is a source of reminders and design ideas, not a rigid checklist. Apply only what fits the actual page, existing project, and current request. Do not add unnecessary elements or expand the task into unrelated changes. Do not invent product requirements, workflows, features, brand choices, colors, fonts, or content. Preserve intentional existing choices unless there is a clear reason to improve them.

## 10. Copyable standing instruction

> Use `docs/UI_UX_IMPROVEMENT_GUIDE.md` as an ongoing UI/UX design reference. Automatically consult and apply relevant design principles, improvement ideas, and guidance elements throughout the design process. Identify opportunities to improve the interface, interactions, usability, and user guidance as you work, even when I haven't explicitly mentioned them. Apply them where appropriate to the existing design and my current request, without waiting for me to point out every detail or turning the guide into a rigid checklist. Do not invent requirements or add unrelated features or changes.

## Suggested placement

Save this file as `docs/UI_UX_IMPROVEMENT_GUIDE.md` and add a short reference to it in `AGENTS.md` if the project uses project-level agent instructions. Keep it separate from any future product-specific requirements or design-system documentation.
