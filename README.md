# CareerBridge

CareerBridge helps students explore education and career possibilities, understand courses and institutions, and identify informed next steps. Its institution focus is Northeast India, alongside relevant national education opportunities.

**Guide, don't decide.** CareerBridge supports exploration; it does not predict or choose a student's future.

## Documentation
- [Project foundation](docs/project-foundation/README.md) is the agreed product and engineering source of truth.
- [UI/UX improvement guide](docs/UI_UX_IMPROVEMENT_GUIDE.md) is a supporting design reference.
- [Agent instructions](AGENTS.md) define repository-wide working rules.

## Core guardrails
- Current student-stage scope: Class 10 and Class 12.
- Institution architecture supports all eight Northeast states; initial real-data collection may begin in Nagaland.
- Real, sourced information is primary. Demo/test records must be labelled and separated.
- Structured records are canonical for published facts.
- Admin/data governance, hybrid recommendations, LLM + RAG, explainability and location-aware data are core system responsibilities.
- Planned capabilities are not necessarily implemented. Inspect and test before making implementation claims.

## Setup
Follow the actual package scripts, environment files and migration instructions in this repository. Do not assume a technology mentioned in planning documents is installed or configured. Verify the current account/authentication schema and setup path against the application code before deployment.
