# Clerk Authentication and Account Provisioning

## Provider and routes

Clerk is the sole authentication provider. The existing custom sign-in and sign-up pages remain in place; their forms use Clerk's email/password APIs and email-code verification. `ClerkProvider` is mounted above `AccountProvider`, and `src/proxy.ts` runs `clerkMiddleware()` without making guest-facing pages private.

Every protected Route Handler checks the Clerk session on the server and resolves it through `users.external_id`. Proxy execution is not an authorization check. Account and student ownership uses only the internal numeric `users.id` returned by this lookup; client-provided IDs, email addresses, and Clerk IDs are never used as ownership proof.

## Clerk development configuration

Add these variable names to the local environment, using values from a Clerk **development** instance:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

In the Clerk Dashboard:

- Enable email address and password sign-up/sign-in.
- Require verification of the primary email address with an email code.
- Enable first name collection because CareerBridge records the verified Clerk profile name.
- Set the development application URL to `http://localhost:3000`.
- Use `/sign-in` and `/sign-up` as the custom sign-in/sign-up URLs; successful flows return to `/explore` unless a safe same-origin `next` path was requested.
- Configure the development email delivery method so verification codes can be received.

No Clerk webhook is currently used. Do not add a webhook secret unless a separately reviewed webhook implementation is introduced. Never copy real keys into `.env.example`.

## Identity and internal user provisioning

The identity mapping is:

```text
Clerk user ID -> users.external_id -> users.id (integer)
```

Student-owned records and the existing `account_data` snapshot continue to use internal numeric `users.id`. A verified Clerk session must explicitly complete `/api/auth/provision` with the required Privacy Notice acceptance and age/guardian attestation. The server obtains the Clerk identity, verified primary email, and profile name itself; it does not trust identity or profile fields posted by the browser.

Provisioning is idempotent for a Clerk identity. Unique email or identity conflicts return an explicit error. Legacy local-auth accounts are not linked, imported, or recovered; a conflicting legacy email is not silently claimed by a Clerk identity.

## Existing CareerBridge data and guest behavior

The existing JSONB `account_data` snapshot and its API contract are retained. The API resolves the caller's internal numeric user ID from Clerk before reading or writing data. The existing explicit guest-data transfer prompt and cache isolation remain in place; only data the user chooses to transfer is merged, using the existing deduplication behavior.

The Drizzle student tables continue to reference integer user IDs. Their database foreign keys cascade on user deletion; no student table or account-data schema change is part of this cutover.

## Sign-out and deletion

Sign-out uses Clerk, then clears CareerBridge's account-specific browser cache and broadcasts the signed-out state to other tabs.

Account deletion requires the existing password confirmation and `DELETE` confirmation. The server verifies the password with Clerk, deletes the Clerk identity, then deletes the internal user in a database transaction; existing foreign-key cascades remove associated CareerBridge data. If Clerk deletion fails, the transaction is rolled back. If the Clerk identity is removed but the database commit fails, the endpoint reports a partial failure instead of success; the remaining database cleanup requires support intervention.

## Legacy database objects

`auth_sessions` and `users.password_hash` are retained in the current database for now and are no longer used by application authentication. The existing SQL foundation and initial migration are not changed here. Review their eventual removal separately after confirming deployment and migration dependencies.

## Verification

Local type, lint, and focused regression checks can run without external services. End-to-end registration, email verification, Clerk sign-in/sign-out, identity provisioning, and deletion require a configured Clerk development instance and test account. Database integration checks must target a confirmed development database, never production.
