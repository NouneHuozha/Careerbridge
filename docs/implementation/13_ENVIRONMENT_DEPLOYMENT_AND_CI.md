# 13. Environment, Deployment and CI

## 13.1 Environments

Maintain isolated local, test/staging and production environments. Each has separate database credentials, Clerk configuration, Maps keys, AI credentials, storage and job secrets. Never point local experiments at production by default.

## 13.2 Configuration

Maintain `.env.example` with variable names and safe placeholders only. Validate required configuration at startup or deployment. Fail clearly when required production settings are absent. Never commit `.env`, private keys, database URLs or provider secrets.

## 13.3 Vercel direction

Deploy the Next.js app to Vercel after validating runtime compatibility. Confirm Neon connection pooling/adapter, Drizzle migrations, Clerk domains/webhooks, Maps key restrictions, background jobs, file storage and scheduled tasks. Long-running work must use an appropriate job/worker service rather than normal request execution.

## 13.4 CI checks

Run dependency install with lockfile, formatting/lint, TypeScript typecheck, unit/integration tests, build, migration validation and secret/dependency scanning. Use least-privilege CI credentials. Do not run destructive production migrations from unreviewed pull requests.

## 13.5 Deployment sequence

Review change → CI checks → backup if required → apply reviewed migrations → deploy app → verify health/auth/DB → verify jobs/webhooks → monitor errors → rollback or forward-fix using documented procedure. Ensure app and schema versions are compatible during rollout.

## 13.6 Rollback

Prefer backward-compatible expand/contract migrations. Do not assume schema rollback is safe after data writes. Define recovery and forward-fix for each destructive or irreversible migration. Keep prior app deployment available where possible.

## 13.7 Domains and webhooks

Document production/staging domains, Clerk redirect URLs, webhook endpoints, Maps referrer restrictions and provider callback URLs. Do not store secrets in documentation.
