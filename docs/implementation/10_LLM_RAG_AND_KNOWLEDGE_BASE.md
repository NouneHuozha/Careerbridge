# 10. LLM, RAG and Knowledge Base

## 10.1 Provider status

LLM provider, model, embedding provider/model and vector retrieval implementation remain open. Select them through documented evaluation of factuality, multilingual performance, privacy, cost, latency, context limits, operational reliability and portability. Do not hard-code a provider into domain logic.

## 10.2 Knowledge source lifecycle

Register approved source → retrieve/upload permitted document → virus/file-type/size checks → extract text → preserve metadata/version → review extraction → chunk → embed → index → evaluate retrieval → publish searchable version. Supersede/withdraw old versions safely.

## 10.3 Document metadata

Store title, authority, canonical URL, document type, topic, language, publication/effective date, retrieval date, content hash, version, supersedes/superseded-by, extraction status, indexing status and access classification.

## 10.4 Chunking and embeddings

Chunk by document structure where possible; preserve page/section/paragraph references. Avoid splitting tables and eligibility clauses in ways that lose meaning. Version chunking and embedding configuration. Re-embed when the model/version changes. Preserve parent document and version for every chunk.

## 10.5 Retrieval

Retrieve using query understanding and metadata filters (topic, authority, date, region, language and document status as applicable). Evaluate lexical/vector/hybrid options and reranking before choosing. Exclude withdrawn/superseded sources unless explicitly needed for historical questions. Do not expose private or Admin-only documents to students.

## 10.6 Structured facts

Use current approved database records for current structured facts such as fees, deadlines, course availability and eligibility. RAG supplies supporting official document detail. The answer should identify which source supports each material claim.

## 10.7 Answer orchestration

Classify query → retrieve structured records and/or approved documents → assemble evidence with provenance → generate constrained answer → validate citations and dates → return answer and sources. If evidence is missing/conflicting/stale, state the limitation rather than guessing.

## 10.8 Prompt and tool safety

Treat user input and retrieved text as untrusted. Retrieved content cannot override system rules or access control. Tools must enforce authorization independently. Do not allow arbitrary URLs, SQL or privileged actions from model output. Validate all tool arguments and output.

## 10.9 Evaluation

Maintain test questions with expected sources and answer criteria. Measure retrieval recall/precision, citation correctness, factuality, unsupported answer rate, conflict handling, multilingual quality, prompt-injection resistance, latency and cost. Re-run evaluation after model, prompt, chunking or index changes.

## 10.10 Cost and privacy

Apply per-user limits, token budgets, caching where safe, provider timeout/retry and cost monitoring. Do not send unnecessary personal student data to providers. Review provider retention/training settings and applicable terms before production.
