# 4. Authentication and Account Migration

## 4.1 Target

Clerk is the agreed authentication provider. CareerBridge maintains its own application-user record and domain data. Clerk identity is not a replacement for application roles, student profile data or database authorization.

## 4.2 Current baseline

The inspected application contains custom password hashing/session handling and tables for users, auth_sessions and account_data. Treat these as existing user data and migration dependencies. Do not delete or disable them before cutover is verified.

## 4.3 Identity mapping

Create a stable internal application-user ID and a unique mapping to Clerk user ID. Decide how email changes, account linking, duplicate emails, deleted Clerk users and webhook retries are handled. Never trust a client-supplied Clerk ID without verifying the authenticated server context.

## 4.4 Sign-in migration

Choose and document a migration strategy supported by Clerk for existing users (for example, supported import/password migration or staged reauthentication). Do not export or expose password hashes unnecessarily. Do not promise password continuity until the chosen migration method is tested.

## 4.5 Data migration

Inventory every existing account_data field and its actual usage. Map saved items, history, education stage, discovery answers and Guided Explorer data to approved models. Preserve ownership. Reconcile user counts, row counts and representative records. Keep a rollback path until validation is complete.

## 4.6 Session cutover

Integrate Clerk server-side identity checks, route protection and session handling. Update API handlers and account queries to use the authenticated application-user mapping. Only after successful verification should custom session creation/sign-in be disabled. Retire old session tables only after migration and retention review.

## 4.7 Roles and Admin access

Define application roles and permissions in a server-controlled source of truth. Clerk metadata may carry claims for convenience, but privileged actions must be checked against trusted server-side role state and current policy. Role changes are audited. Default new users to student-level access; never allow self-assignment of Admin roles.

## 4.8 Webhooks

Verify webhook signatures, handle retries idempotently, record event IDs, and reconcile missed events. Webhooks may synchronize identity metadata but must not be the sole basis for sensitive authorization if a stale claim could grant access.

## 4.9 Guest behaviour

Document what guests can do, what is device-local, what requires sign-in and how guest data may be transferred if that feature is approved. Do not silently merge accounts or overwrite data.

## 4.10 Acceptance tests

New user, existing user migration, sign-in, sign-out, session expiry, email change, account deletion, webhook retry, student data ownership, guest behaviour, Admin denial for students, role revocation and preservation of saved/history/progress data.
