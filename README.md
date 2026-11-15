# CareerBridge

CareerBridge helps students explore education and career possibilities, understand courses and institutions, and identify informed next steps. Institution coverage focuses on Northeast India alongside relevant national education opportunities.

**Guide, don't decide.** CareerBridge supports exploration; it does not predict or choose a student's future.

This repository includes the project-foundation documents and implementation specifications needed to build CareerBridge.

## Source of truth

The approved product direction and decisions in `docs/project-foundation/` govern implementation. Existing code is evidence of current implementation, not authority to change the agreed product direction.

## Important status distinction

- **Agreed target:** the intended product and technology direction documented here.
- **Current implementation:** the code currently present in the repository. It does not yet fully match the target.
- **Open decision:** a choice that has not been confirmed. It must be evaluated and recorded before adoption.
- **Verified:** confirmed by inspecting the relevant source/configuration or running the relevant test. A written plan is not proof of implementation.

## Documentation map

- [Project foundation](docs/project-foundation/README.md) defines the product direction and system-level requirements.
- [Implementation specifications](docs/implementation/README.md) translate that direction into buildable technical contracts.
- [UI/UX improvement guide](docs/UI_UX_IMPROVEMENT_GUIDE.md) is a flexible design and accessibility reference.
- [Agent instructions](AGENTS.md) define repository-wide working rules.

## Confirmed technology direction

- Next.js
- React
- TypeScript
- Tailwind CSS
- Neon PostgreSQL
- Drizzle ORM
- Clerk
- Google Maps Platform
- Vercel deployment direction

The LLM provider, embedding model/provider, vector retrieval implementation, background-job provider, file/object storage provider and monitoring provider remain open until evaluated and recorded.

## Setup

Use the scripts in `package.json` and the actual environment configuration for local development. The documented technology direction does not mean every service is already installed or configured. Never commit local secrets.

## Working rules

1. Do not treat demo data as verified real data.
2. Do not invent institution, course, eligibility, fee, deadline or scholarship facts.
3. Do not weaken the `GUIDE, DON'T DECIDE` principle.
4. Do not remove existing account data during auth/database migration.
5. Do not mark a feature complete until its acceptance criteria and tests pass.
6. Update the decision log when a material project decision changes.
7. Keep local secrets out of Git and documentation.
