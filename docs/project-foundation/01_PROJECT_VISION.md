# 1. Project Vision

## Overview
CareerBridge is a career and education exploration platform intended to help students understand possible academic and career directions and the practical steps, courses, institutions and opportunities connected to them.

It combines structured student context and education data with hybrid recommendations, an LLM assistant grounded through retrieval-augmented generation (RAG), explainable evidence and location-aware institution discovery. Its regional focus is Northeast India, while supporting relevant national education opportunities.

CareerBridge is an exploration and information aid. It does not make a student's career decision for them.

## Problem
Students may reach important education transition points without knowing what options exist, what different fields involve, which courses lead to which opportunities, what eligibility rules apply, or where relevant institutions are located. Information is scattered across institution websites, government portals, prospectuses and notices. Students may rely on informal advice because reliable information is difficult to discover and compare.

This can be amplified in Northeast India, where geography, travel time, transport access and institution distribution affect whether an option is practical. CareerBridge aims to make information easier to discover, understand and verify, while being honest about coverage gaps.

## Aim
Provide understandable, evidence-based ways for students to explore education and career possibilities, investigate relevant courses and institutions, and identify useful next steps.

## Objectives
1. Organise reliable information about fields, courses, institutions, pathways, examinations and scholarships.
2. Use structured student context—education stage, interests, activities, subjects, skills and stated preferences—to surface potentially relevant options.
3. Develop a hybrid recommendation approach combining content-based methods and collaborative signals when sufficient real interaction data exists.
4. Provide a natural-language assistant powered by an LLM and RAG, grounded in approved knowledge sources.
5. Explain why an option was surfaced using traceable student answers and catalogue evidence.
6. Support institution discovery with geographic information and map/route guidance.
7. Provide an Admin Panel and governed data workflows to maintain, review and publish information.
8. Evaluate usefulness, clarity, trust and recommendation quality through technical tests and student feedback.

## Target students and geography
Current student stage scope is Class 10 and Class 12. Education stage is collected at the appropriate discovery/onboarding point and reused; do not repeatedly ask students for it on unrelated pages.

Institution discovery targets all eight Northeast Indian states: Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim and Tripura. Initial real institution-data collection may start with Nagaland, but database design, source management and product architecture must support all eight from the beginning. Relevant national courses, examinations and scholarships are included where useful.

## Core system
The intended system includes student discovery/profile context; Explore for fields, courses, institutions, pathways, examinations and scholarships; hybrid recommendation; LLM + RAG assistant; explainability; education database and source governance; Admin Panel; location-aware institution data and map integration; and account, saved-item and progress capabilities as defined by product requirements.

These are core architectural responsibilities. Delivery may be sequenced into testable modules, but they must not be silently omitted or indefinitely deferred.

## Guide, don't decide
CareerBridge helps students explore; it does not choose a career or education path for them.

Do not predict a definitive career, label one career as the student's best future, show unexplained match/fit percentages as authority, force a fixed path, or turn uncertain answers into confident claims. Prefer wording such as “Explore this field”, “Potentially relevant” and “Reasons to explore”. Present alternatives and acknowledge uncertainty.

Any personalised explanation must be grounded in actual student-provided evidence and/or reliable catalogue evidence. Do not invent reasons.

## Experience principles
- Reassuring: students may be unsure and should not feel behind.
- Exploratory: browsing without a fixed goal is valid.
- Clear: explain unfamiliar terms and practical requirements.
- Transparent: show sources, dates and verification status where relevant.
- Respectful: allow skipping, revisiting and changing answers.
- Region-aware: make geography useful without assuming students can or must relocate.
- Honest about gaps: distinguish unavailable, uncollected and unverified information.

## Data integrity
Real, sourced data is primary. Synthetic/demo/test records may support development and controlled testing but must be labelled and separated from verified information. Relevant records retain source name/URL, publication or effective date where known, last-checked and last-verified timestamps, verification and publication states, data classification and change history. Time-sensitive details need their own freshness checks. Missing information must not be fabricated.

## Intended technology direction
Planning context identifies Next.js, React, TypeScript and Tailwind CSS; PostgreSQL/Neon with Drizzle ORM; and Vercel as a likely deployment target. The current repository includes account/authentication and account-data code. Exact production choices for identity provider, hosting, job scheduler and AI provider must be confirmed from repository configuration and technical review before being treated as final.

## Evaluation and success
Evaluate information correctness and traceability; student understanding and trust; answer grounding and citation quality; recommendation usefulness without coercion; data-update reliability; and usability. Planning has discussed evaluation with approximately 30–50 real students. This is a target, not a completed study or a statistically representative claim. Obtain appropriate consent and protect participant data.

CareerBridge succeeds when students can discover possibilities, understand why information may matter, investigate concrete options and take informed next steps while retaining control over their decisions.
