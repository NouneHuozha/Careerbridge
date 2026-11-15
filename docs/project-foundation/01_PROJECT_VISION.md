# 1. Project Vision

## 1.1 Overview

CareerBridge is an AI-powered career and education guidance and exploration platform for students, with a focus on Northeast India. It helps students discover fields, courses, institutions, pathways, examinations and scholarships; understand why an option may be worth exploring; and identify useful next steps.

The platform combines structured education data, a hybrid Machine Learning recommender, an LLM assistant grounded through Retrieval-Augmented Generation (RAG), Explainable AI (XAI), and location intelligence. An Admin Panel governs the information on which the student experience depends.

**Core principle: GUIDE, DON'T DECIDE.** CareerBridge helps students explore. It does not choose their future.

## 1.2 Problem

Students may reach Class 10 or Class 12 without knowing what options exist, what they can study next, which institutions offer relevant programmes, what eligibility applies, or where to find reliable and current information. They may depend on friends or incomplete advice, overlook alternatives, or be unaware of examinations and scholarships.

In Northeast India, geography adds practical constraints. Institutions may be spread across states, districts and towns; travel time, transport access, distance and relocation can affect whether an option is practical. Information is fragmented across official websites, notices, prospectuses and government portals.

## 1.3 Aim and objectives

Provide understandable, personalised and evidence-based exploration of education and career possibilities. Objectives:

1. Organise reliable information about fields, courses, institutions, pathways, examinations and scholarships.
2. Help students explore using education stage and optional interests, activities, subjects, skills and stated preferences.
3. Build a hybrid ML recommender for potentially relevant fields, courses and institutions.
4. Provide an LLM assistant grounded in approved, traceable information through RAG.
5. Explain surfaced options using actual student answers and catalogue evidence.
6. Support institution location, maps, distance, travel-time and route guidance.
7. Provide Admin workflows for collection, imports, review, verification, publication and knowledge-base maintenance.
8. Support student accounts, saved items, history and student-controlled next steps.
9. Plan for English, Hindi and Manipuri.
10. Evaluate quality and usefulness with real students and technical evaluation methods.

## 1.4 Current student scope

Current education stages: **Class 10 and Class 12 only**. The active product focus is **User 1: the unsure student**, who may have no idea what career or field to pursue. Do not introduce User 2/3 flows or completed-result/waiting-result variants into current scope without explicit approval.

Capture education stage at the agreed Discover/onboarding step and reuse it. Do not repeatedly ask for it on unrelated pages.

## 1.5 Geography

Institution discovery must support all eight Northeast states: Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim and Tripura. Initial real-data collection may begin with Nagaland; this is a collection sequence, not a Nagaland-only product scope. Database, Admin, source registry and filters must support all eight states from the beginning. Include relevant national opportunities.

Do not claim full regional coverage until records have actually been collected and verified.

## 1.6 Product capabilities

- **Discover:** capture Class 10/12 and optional activities/interests; reassure students who are unsure.
- **Discover Results:** show possibilities with reasons grounded in submitted answers.
- **Guided Explorer:** optional, self-guided, rule-based reflection; not human counselling and not paid AI counselling.
- **Explore:** shared destination for independent and guided students; Fields, Courses, Institutions, Pathways, Examinations and Scholarships.
- **ML recommender:** surface potentially relevant options from structured context and catalogue data.
- **LLM + RAG assistant:** answer natural-language questions using approved sources and structured facts.
- **XAI:** explain why an option was surfaced using real evidence.
- **Location intelligence:** support institution/campus location and Google Maps Platform features.
- **Admin:** govern records, sources, imports, verification, publication and knowledge documents.

## 1.7 GUIDE, DON'T DECIDE

The platform must present possibilities, explain evidence, show alternatives, acknowledge uncertainty and keep the student in control. It must not predict a definite career, declare a “best career”, force a fixed sequence, display unexplained match percentages as authority, or invent explanations.

Preferred language: “Explore this field”, “Potentially relevant”, “Reasons to explore”, “Based on what you shared”. Avoid “Your career”, “Your perfect career”, “Your best match”, or claims that CareerBridge has selected the student's future.

## 1.8 Data reliability

Real, sourced information is primary. Demo/test data may support development but must be classified and separated. Relevant facts retain source name/URL, authority, publication/effective date where available, last-checked and last-verified timestamps, verification and publication states, data classification and change history. Time-sensitive facts such as fees, admission dates, eligibility and deadlines need freshness tracking. Missing information remains missing; never fabricate it.

## 1.9 AI responsibilities

- ML identifies potentially relevant options using structured student context and catalogue attributes.
- LLM understands questions and generates natural-language responses.
- RAG retrieves traceable approved knowledge to ground factual answers.
- XAI explains surfaced options from actual evidence.
- Location intelligence supplies geographic context and provider-backed route information.

These components are distinct and must not be collapsed into one opaque “AI recommendation”. Guided Explorer remains rule-based and separate from the LLM assistant.

## 1.10 Languages and evaluation

Planned languages: English, Hindi and Manipuri. Plan for UI translation, search, source-language metadata, AI input/output and translation provenance. Do not claim complete translation until tested.

The project intends to evaluate with real students, with approximately 30–50 participants as a feasible target, subject to consent, privacy and appropriate research procedures. This is a target, not a completed study or a claim of statistical representativeness.

## 1.11 Agreed technology direction

Next.js, React, TypeScript, Tailwind CSS, Neon PostgreSQL, Drizzle ORM, Clerk, Google Maps Platform and Vercel deployment direction. The current repository does not yet contain every integration. LLM provider, embedding model/provider, vector retrieval implementation, background-job provider, object storage and monitoring provider remain open until documented evaluation.
