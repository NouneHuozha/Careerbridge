# 11. Security, Privacy and Quality Assurance

## Purpose
CareerBridge may process information about school students, including minors. Privacy, security and trustworthy information are foundational requirements, not optional polish.

## Data minimisation
- Collect only information needed for a clearly defined student-facing purpose.
- Make optional questions genuinely optional.
- Avoid collecting sensitive personal details unless there is a justified requirement and an approved handling policy.
- Do not use student free-text responses as training data by default.
- Define retention and deletion rules for accounts, answers, saved items, logs and evaluation records.
- Explain where data is stored, how it is used and how a student can request deletion.
- Obtain appropriate consent/assent and guardian involvement where required by applicable law and the research context.

## Access control
- Enforce authorization server-side for every student and admin resource.
- Use least-privilege roles for contributors, reviewers, publishers and system administrators.
- Separate student access from administrative data operations.
- Prevent cross-user access to profiles, answers, saved items and private traces.
- Audit privileged actions, role changes, approvals and publication.
- Avoid storing secrets in source code, client bundles, logs or ordinary database fields.

## Application security
Validate all inputs server-side; constrain uploads by type and size; protect file parsing; use secure session/cookie settings; rate-limit sensitive endpoints; prevent injection and unsafe query construction; apply CSRF/origin protections where relevant; use secure headers and dependency updates; and avoid returning stack traces or internal details to users.

Treat scraped pages, uploaded documents and retrieved RAG chunks as untrusted data. They may contain prompt-injection instructions; never let them override system policy, authorization or tool boundaries.

## AI-specific controls
- Retrieve only data the requesting user is allowed to access.
- Keep provider keys server-side.
- Validate citations against retrieved source references.
- Do not expose private student context in another student's answer.
- Do not allow the LLM to invent catalogue records, eligibility, dates, fees or personalised rationale.
- Clearly distinguish generated explanations from official source statements.
- Apply rate limits, cost controls and safe failure behaviour.
- Minimise and redact personal information in observability traces.

## Data and publication quality
Test source provenance, freshness, duplicate detection, relationship integrity, status transitions, review permissions, last-known-good preservation and superseded-document exclusion. Corrections should be traceable. Unknown data must remain unknown rather than being filled with guesses.

## Test strategy
- **Unit:** domain rules, validators, transformations, status transitions and recommendation evidence construction.
- **Integration:** database constraints, API authorization, imports, source adapters, review/publication and indexing.
- **End-to-end:** student discovery, Guided Explorer, Explore catalogues, saved/next-step journeys and complete Admin data workflow.
- **AI/RAG:** retrieval relevance, citation correctness, unsupported questions, stale/superseded source handling, prompt injection and privacy boundaries.
- **Data quality:** source conflicts, malformed imports, duplicate entities, missing values and failed refreshes.
- **UX/accessibility:** keyboard operation, focus, contrast, labels, responsive layouts, loading/empty/error/recovery states.
- **Security:** cross-user access, role escalation, upload abuse, rate limits, secret exposure and common web vulnerabilities.
- **Performance/reliability:** pagination, long-running jobs, retries, timeouts, backups and recovery.

## Evaluation with students
Use a documented protocol, appropriate consent and privacy safeguards. Evaluate whether students understand options and explanations, whether sources are trusted, whether the experience feels pressuring, and whether next steps are clear. A small usability study can reveal issues but must not be described as statistically representative without a suitable design.

## Release readiness
A feature is not complete because its page renders. Before release, verify permissions, data quality, source/freshness behaviour, error handling, accessibility, integration and tests. Record known limitations and do not claim checks that were not run.
