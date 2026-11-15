# 16. Operations, Backup and Recovery

## 16.1 Operational ownership

Document who monitors application health, source jobs, imports, RAG indexing, AI usage, provider quotas, security alerts and backup status. Assign operational owners before production.

## 16.2 Monitoring

Monitor app errors/latency, DB availability and connection pressure, auth/webhook failures, job queue delay, source failures/staleness, import errors, RAG indexing failures, AI latency/cost and Maps quota/billing. Alert thresholds should be based on service needs and adjusted after observing normal behaviour.

## 16.3 Backups

Use Neon-supported backup/restore capabilities and any additional export strategy required by retention/recovery needs. Define recovery point and recovery time objectives before production; do not invent them without owner approval. Test restore to an isolated environment and verify record counts/relationships.

## 16.4 Recovery

Document steps for database outage, accidental deletion, bad migration, corrupted import, compromised credentials, source parser regression, failed indexing and provider outage. Preserve last-known-good catalogue data. Prefer forward fixes for incompatible schema/data changes when rollback would lose writes.

## 16.5 Incident response

Classify incident, contain access, preserve evidence, rotate credentials where needed, assess student-data impact, restore service, communicate according to policy and record post-incident actions. Do not place secrets or unnecessary personal data in incident reports.

## 16.6 Retention and deletion

Define retention for source snapshots, raw imports, logs, AI traces, student data and audit events with privacy/legal requirements. Deletion workflows must account for backups, derived indexes and provider copies. Do not promise complete deletion until all relevant stores and retention rules are covered.

## 16.7 Cost controls

Track database, hosting, Maps, LLM, embeddings, vector storage, object storage and job execution costs. Apply budgets/alerts, quotas, caching where safe and usage limits. Provider selection must consider total operational cost, not only API price.
