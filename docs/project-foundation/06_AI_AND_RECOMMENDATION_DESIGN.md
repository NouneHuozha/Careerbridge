# 6. AI and Recommendation Design

## Principle
Structured recommendation, retrieval-grounded language generation and explainability have different responsibilities. The LLM must not replace the catalogue or fabricate recommendations.

## Hybrid recommender
Potential inputs include Class 10/12 stage, subjects/academic context where supplied, interests, activity responses, stated skills/strengths, learning/future preferences and explicitly supplied constraints such as budget/location/relocation preferences. Represent missing, uncertain and skipped answers explicitly.

Use structured field/course/institution metadata and content-based methods to identify options sharing relevant attributes with student context. Collaborative filtering or interaction signals may complement this when sufficient real and representative user interaction data exists. Build interfaces and event capture with this in mind from the beginning, but do not claim real collaborative performance based only on synthetic interactions.

A recommendation result should preserve entity identity/type; student-answer/evidence references; relevant catalogue attributes and record versions; explanation reason codes or structured evidence; missing/uncertain information; and algorithm/model version and timestamp for evaluation.

Do not make output a deterministic career prediction. Avoid student-facing best-career claims, forced rankings and fit percentages. Internal diagnostic metrics may be used for engineering but are not a verdict about a student.

## Explainability
Explain which student answer or preference is relevant, which verified option attribute relates to it, why it may be worth exploring, and what is missing/uncertain. Maintain links to source answer IDs and catalogue record/version IDs. If no defensible reason exists, do not show a personalised explanation. Never ask an LLM to invent a plausible rationale after the fact.

## LLM assistant
The LLM can explain concepts, interpret retrieved official information, summarise source material, explain structured recommendation evidence and help students identify useful questions/next steps.

It must not invent institutions, courses, dates, fees, eligibility or scholarships; use model memory as current official information; override database publication/eligibility; claim a student is destined for a career; or hide uncertainty.

## RAG pipeline
1. Ingest approved source documents.
2. Extract text and structure.
3. Preserve source, publication date, retrieval date and version.
4. Chunk content with stable document/chunk references.
5. Generate embeddings using a versioned model.
6. Store vectors and metadata in the selected retrieval store.
7. Retrieve relevant chunks with query and metadata filters.
8. Optionally rerank.
9. Supply evidence and structured catalogue results to the LLM.
10. Generate an answer with source references.
11. Validate citations and unsupported factual claims where feasible.
12. Keep privacy-safe traces for evaluation/debugging.

Filter or clearly mark superseded documents. Current admission/fee information should prefer current approved structured records and official documents.

## Structured records versus documents
Use the relational database for canonical facts such as institution identity, offerings and approved deadlines. Use RAG for evidence in official documents, policy explanations and detailed source text. The assistant may combine them but must preserve the origin of each claim. Indexing a document does not automatically verify every extracted statement as a structured fact.

## Answer behaviour
Identify retrieved sources, include relevant dates, distinguish official statements from interpretation, report conflicts/incompleteness, say when evidence is insufficient, and never fabricate citations or URLs.

## Safety and privacy
Treat retrieved web/document content as untrusted data, not instructions. Defend against prompt injection. Do not expose one student's private profile to another. Apply access control before retrieval/tool calls. Minimise retention of sensitive free text. Keep provider credentials server-side. Apply rate limits and cost controls. Distinguish generated content from official source material.

## Evaluation
Evaluate candidate relevance/coverage, explanation faithfulness, retrieval precision/recall and freshness, citation correctness, answer factuality/uncertainty, deterministic/harmful career language, student comprehension/trust, latency, reliability and cost. Synthetic data tests software but cannot prove real-world quality. Real student evaluation requires consent and privacy safeguards.

## Implementation
Design interfaces for recommender, LLM, RAG and XAI from the beginning. Implement and connect them incrementally to real catalogue data and student experience. Do not postpone their architectural design until after frontend completion.
