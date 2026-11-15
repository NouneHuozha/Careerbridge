# 9. ML Recommender and Explainability

## 9.1 Responsibilities

Recommend potentially relevant fields, courses and institutions. Do not decide a student's career. Keep model candidate generation separate from explanation rendering and student-facing copy.

## 9.2 Inputs

Use approved student context: education stage, optional subjects/academic context, interests, activities, strengths/skills, learning preferences and explicitly provided constraints. Preserve answer provenance and version. Treat skipped, uncertain and missing distinctly.

## 9.3 Catalogue features

Define versioned, typed attributes for fields, courses and offerings. Include verified prerequisites, qualification level, subject areas, mode and location where relevant. Avoid training on unverified demo records as if factual.

## 9.4 Initial approach

Begin with transparent content-based candidate generation and rule/feature weighting that can be inspected and tested. Keep weights/configuration versioned. Do not imply statistical ML sophistication if the current implementation is deterministic rules. As data and evaluation mature, compare suitable ML ranking/classification methods.

## 9.5 Collaborative signals

Design event contracts for views, saves, exploration and explicit usefulness feedback with privacy controls. Collaborative filtering is not validated until sufficient real interaction data exists. Synthetic events are test fixtures only.

## 9.6 Evidence contract

Every candidate carries entity ID/type, context version, matched student answer references, matched catalogue attributes, method/version, uncertainty and timestamp. Explanations must be generated from this evidence, not invented post hoc.

## 9.7 Explanation generation

Use templates or constrained generation grounded in evidence. Avoid personality diagnosis and claims of aptitude. If evidence is weak or absent, omit personalised explanation and provide a neutral catalogue description.

## 9.8 Evaluation

Create labelled evaluation cases with expert-reviewed expected relevance and evidence. Measure precision/recall at useful cutoffs, catalogue coverage, diversity, stability, evidence faithfulness and performance for sparse answers. Include counterfactual tests: removing an answer should remove or alter only explanations that depend on it.

## 9.9 Versioning and monitoring

Record algorithm/config version, feature schema version and input context version. Monitor candidate distribution, missing-data effects, feedback and drift. Do not silently change ranking behaviour without regression evaluation.

## 9.10 UX policy

Use exploratory language. Do not display unexplained match percentages, rankings or “best career”. Show reasons and alternatives, and let the student continue browsing freely.
