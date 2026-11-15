# 6. AI and Recommendation Design

## 6.1 Components

CareerBridge has distinct components: (1) ML recommender, (2) LLM assistant, (3) RAG retrieval, (4) XAI, and (5) location intelligence. Guided Explorer is rule-based and separate.

## 6.2 Recommender scope

Identify potentially relevant fields, courses and institutions using structured student context and catalogue attributes. Possible inputs include Class 10/12 stage, subjects/academic context where supplied, interests, activities, stated strengths/skills, learning preferences, future preferences and explicit constraints such as location or budget when voluntarily provided.

Distinguish known, skipped, uncertain, missing and not-applicable answers. Missing must not become a negative preference.

## 6.3 Content-based and collaborative methods

Content-based recommendation is the initial foundation: compare student context with structured field/course/offering attributes and preserve candidate evidence.

Design data contracts to support collaborative signals from the beginning, such as views, saves, exploration and explicit usefulness feedback. Collect only appropriate interactions. Collaborative filtering requires sufficient real representative interactions. Synthetic data can test code but cannot prove real-world quality.

## 6.4 Recommendation record

Preserve candidate ID/type, student-context version/reference, answer references, catalogue attributes, explanation evidence, missing/uncertain evidence, method/model version and timestamp. Support audit and evaluation.

## 6.5 Guide, Don't Decide

No definite career prediction, “best career” verdict, forced path or unexplained student-facing match percentage. Internal diagnostics may be used during development but must not be presented as proof of suitability.

## 6.6 XAI

Connect an actual student answer to an actual catalogue attribute and explain the relationship carefully. Example: student says they enjoy organising group activities; a field includes planning/coordination work; explanation: “You mentioned enjoying group activities. This field includes opportunities to explore planning and coordination.” Do not claim the student is naturally suited. If evidence is insufficient, do not show a personalised reason. Never ask an LLM to invent a post-hoc explanation.

## 6.7 LLM assistant

Understand natural-language questions and explain fields, qualifications, courses, official notices, admission requirements and scholarship information. Use current structured facts and retrieved documents. It must not invent catalogue records or time-sensitive facts.

## 6.8 RAG lifecycle

Register approved source → retrieve/upload permitted document → extract text/structure → preserve metadata/version → chunk → embed with versioned model → store retrieval metadata → retrieve relevant chunks → apply filters/reranking if selected → provide evidence to LLM → validate references → generate answer → record evaluation metadata.

Embedding provider/model and vector retrieval implementation remain open. Do not assume pgvector or a separate vector database without a recorded decision.

## 6.9 Structured facts versus documents

Use PostgreSQL records for canonical institution, campus, course, offering, fees, eligibility and dates. Use RAG for prospectuses, notices, policy explanations and supporting source text. Indexing a document does not automatically make every extracted statement a verified structured fact.

## 6.10 Answer rules

Prefer current approved structured records for current catalogue facts. Identify sources and dates, distinguish official statements from generated explanation, acknowledge conflicts and insufficient evidence, and never fabricate citations or URLs. Model memory is not a source for current official facts.

## 6.11 Multilingual AI

Planned languages: English, Hindi and Manipuri. Evaluate query understanding, retrieval across languages, source-language preservation, translation correctness, terminology, citation consistency and uncertainty. Do not assume equal quality across languages.

## 6.12 Safety and evaluation

Treat retrieved documents as untrusted input; defend against prompt injection; enforce user-level access to private data; keep API keys server-side; apply rate/cost controls; minimise personal data in logs. Evaluate recommender relevance, coverage, faithfulness, diversity and missing-answer behaviour. Evaluate RAG retrieval, citations, factuality, conflict handling, prompt-injection resistance, multilingual performance, latency and cost. Synthetic tests do not replace real-user evaluation.
