import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import type { PoolClient } from "pg";
import type { AuthUser } from "./auth-types";
import { getDb } from "../db/client";
import { getPool } from "../db/pool";
import { discoverAnswers, studentProfiles } from "../db/schema/student";
import {
  emptyPersonalData,
  isPersonalDataSnapshot,
} from "./personal-data-validation";
import type {
  PersonalDataMutation,
  PersonalDataSnapshot,
} from "./personal-data-types";

type DatabaseTransaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

let schemaReady: Promise<void> | undefined;

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const result = await getPool().query<{
        users: string | null;
        accountData: string | null;
      }>(
        `SELECT to_regclass('public.users') AS users,
                to_regclass('public.account_data') AS "accountData"`,
      );
      if (!result.rows[0]?.users || !result.rows[0]?.accountData) {
        throw new Error("The users and account_data tables are missing from the configured PostgreSQL database.");
      }
    })().catch((error: unknown) => {
      schemaReady = undefined;
      throw error;
    });
  }
  await schemaReady;
}

function toUser(row: { id: number; email: string; full_name: string | null }): AuthUser {
  return { id: row.id, email: row.email, name: row.full_name };
}

export class AuthenticationRequiredError extends Error {}
export class AccountProvisioningRequiredError extends Error {}
export class AccountIdentityConflictError extends Error {}
export class AccountSetupValidationError extends Error {}
export class AccountDeletionPendingError extends Error {}
export class AccountDeletionBlockedError extends Error {}
export class AccountDeletionPartialError extends Error {}

function isPostgresUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function errorStatus(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : null;
}

async function withClerkIdentityLock<T>(
  clerkUserId: string,
  operation: (client: PoolClient) => Promise<T>,
) {
  const client = await getPool().connect();
  let locked = false;
  let operationFailed = false;
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [clerkUserId]);
    locked = true;
    return await operation(client);
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    let unlockError: unknown;
    if (locked) {
      try {
        const result = await client.query<{ unlocked: boolean }>(
          "SELECT pg_advisory_unlock(hashtext($1)) AS unlocked",
          [clerkUserId],
        );
        if (result.rows[0]?.unlocked !== true) {
          throw new Error("The Clerk identity lock could not be released.");
        }
      } catch (error) {
        unlockError = error;
      }
    }

    if (unlockError) {
      client.release(unlockError instanceof Error ? unlockError : new Error("Identity lock release failed."));
      if (operationFailed) {
        console.error("[careerbridge-next] Clerk identity lock release failed", unlockError);
      } else {
        throw unlockError;
      }
    } else {
      client.release();
    }
  }
}

export async function getCurrentUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;
  const clerkUser = await currentUser();
  if (clerkUser?.id === clerkUserId && clerkUser.privateMetadata.careerbridgeDeletionPending === true) {
    throw new AccountDeletionPendingError("Account deletion is in progress. Finish deleting your account to continue.");
  }
  await ensureSchema();
  const result = await getPool().query<{
    id: number;
    email: string;
    full_name: string | null;
    auth_provider: string;
  }>(
    "SELECT id, email, full_name, auth_provider FROM users WHERE external_id = $1 LIMIT 1",
    [clerkUserId],
  );
  const record = result.rows[0];
  if (!record) throw new AccountProvisioningRequiredError("Finish setting up your CareerBridge account.");
  if (record.auth_provider !== "clerk") {
    throw new AccountIdentityConflictError("This identity is not linked to a CareerBridge account.");
  }
  return toUser(record);
}

export async function provisionCurrentUser(input: {
  privacyAccepted: boolean;
  ageAttestation: "adult" | "minor-guardian";
}) {
  if (input.privacyAccepted !== true) {
    throw new AccountSetupValidationError("Please review and accept the Privacy Notice.");
  }
  if (input.ageAttestation !== "adult" && input.ageAttestation !== "minor-guardian") {
    throw new AccountSetupValidationError("Please confirm the age and guardian information.");
  }

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new AuthenticationRequiredError("Sign in to finish account setup.");
  await ensureSchema();
  return withClerkIdentityLock(clerkUserId, async (client) => {
    const clerkUser = await currentUser();
    if (!clerkUser || clerkUser.id !== clerkUserId) {
      throw new AuthenticationRequiredError("Sign in to finish account setup.");
    }
    if (clerkUser.privateMetadata.careerbridgeDeletionPending === true) {
      throw new AccountDeletionPendingError("Account deletion is in progress. Finish deleting your account instead.");
    }

    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    );
    if (!primaryEmail || primaryEmail.verification?.status !== "verified") {
      throw new AccountSetupValidationError("Verify your email address before creating a CareerBridge account.");
    }
    const email = primaryEmail.emailAddress.trim().toLowerCase();
    const fullName = [clerkUser.firstName, clerkUser.lastName]
      .filter((name): name is string => Boolean(name?.trim()))
      .join(" ")
      .trim();
    if (email.length > 191 || !fullName || fullName.length > 120) {
      throw new AccountSetupValidationError("Your verified Clerk profile needs a valid email and first name.");
    }

    try {
      const result = await client.query<{
        id: number;
        email: string;
        full_name: string | null;
        auth_provider: string;
      }>(
        `INSERT INTO users (
           external_id, email, full_name, auth_provider,
           privacy_notice_version, privacy_notice_accepted_at, age_attestation, age_attested_at
         )
         VALUES ($1, $2, $3, 'clerk', 'careerbridge-privacy-v1', NOW(), $4, NOW())
         ON CONFLICT (external_id) DO UPDATE SET
           email = EXCLUDED.email,
           full_name = EXCLUDED.full_name,
           privacy_notice_version = COALESCE(users.privacy_notice_version, EXCLUDED.privacy_notice_version),
           privacy_notice_accepted_at = COALESCE(users.privacy_notice_accepted_at, EXCLUDED.privacy_notice_accepted_at),
           age_attestation = COALESCE(users.age_attestation, EXCLUDED.age_attestation),
           age_attested_at = COALESCE(users.age_attested_at, EXCLUDED.age_attested_at),
           updated_at = NOW()
         WHERE users.auth_provider = 'clerk'
         RETURNING id, email, full_name, auth_provider`,
        [clerkUserId, email, fullName, input.ageAttestation],
      );
      if (result.rows[0]) return toUser(result.rows[0]);

      throw new AccountIdentityConflictError(
        "This identity is already associated with an account that cannot be linked to Clerk.",
      );
    } catch (error) {
      if (error instanceof AccountIdentityConflictError) throw error;
      if (isPostgresUniqueViolation(error)) {
        throw new AccountIdentityConflictError(
          "An account with this email already exists and cannot be linked to this Clerk identity.",
        );
      }
      throw error;
    }
  });
}

function personalDataKey(item: { type: string; id: string; context?: { courseId?: string } }) {
  return item.type === "institution-offering"
    ? `${item.type}:${item.id}:${item.context?.courseId ?? ""}`
    : `${item.type}:${item.id}`;
}

function mergePersonalData(
  current: PersonalDataSnapshot,
  incoming: PersonalDataSnapshot,
): PersonalDataSnapshot {
  const saved = new Map(current.savedItems.map((item) => [personalDataKey(item), item]));
  for (const item of incoming.savedItems) {
    const key = personalDataKey(item);
    const existing = saved.get(key);
    if (!existing || item.savedAt > existing.savedAt) saved.set(key, item);
  }

  const history = new Map(current.history.map((item) => [personalDataKey(item), item]));
  for (const item of incoming.history) {
    const key = personalDataKey(item);
    const existing = history.get(key);
    history.set(key, existing
      ? {
          ...existing,
          lastVisitedAt: Math.max(existing.lastVisitedAt, item.lastVisitedAt),
          visitCount: Math.max(existing.visitCount, item.visitCount),
        }
      : item);
  }

  return {
    savedItems: [...saved.values()],
    history: [...history.values()],
    educationStage: current.educationStage ?? incoming.educationStage,
    counsellingSession: incoming.counsellingSession ?? current.counsellingSession,
    discoveryAnswers: current.discoveryAnswers ?? incoming.discoveryAnswers,
  };
}

function applyPersonalDataMutation(
  current: PersonalDataSnapshot,
  mutation: PersonalDataMutation,
): PersonalDataSnapshot {
  switch (mutation.type) {
    case "saved.add": {
      const key = personalDataKey(mutation.item);
      const index = current.savedItems.findIndex((item) => personalDataKey(item) === key);
      const items = [...current.savedItems];
      if (index === -1) items.push(mutation.item);
      else if (mutation.item.savedAt > items[index].savedAt) items[index] = mutation.item;
      return { ...current, savedItems: items };
    }
    case "saved.remove": {
      const key = personalDataKey(mutation.item);
      return {
        ...current,
        savedItems: current.savedItems.filter((item) => personalDataKey(item) !== key),
      };
    }
    case "history.record": {
      const key = personalDataKey(mutation.item);
      const existing = current.history.find((item) => personalDataKey(item) === key);
      if (existing && mutation.item.lastVisitedAt <= existing.lastVisitedAt) return current;
      const item = {
        ...mutation.item,
        visitCount: existing ? existing.visitCount + 1 : 1,
      };
      return {
        ...current,
        history: [
          ...current.history.filter((entry) => personalDataKey(entry) !== key),
          item,
        ],
      };
    }
    case "history.remove": {
      const key = personalDataKey(mutation.item);
      return {
        ...current,
        history: current.history.filter((item) => personalDataKey(item) !== key),
      };
    }
    case "history.restore": {
      const key = personalDataKey(mutation.item);
      return current.history.some((item) => personalDataKey(item) === key)
        ? current
        : { ...current, history: [...current.history, mutation.item] };
    }
    case "history.clear":
      return { ...current, history: [] };
    case "progress.educationStage":
      return { ...current, educationStage: mutation.value };
    case "progress.counsellingSession":
      return { ...current, counsellingSession: mutation.value };
    case "progress.discoveryAnswers":
      return { ...current, discoveryAnswers: mutation.value };
    case "migration.keep":
      return mergePersonalData(current, mutation.data);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function snapshotFromStoredData(
  data: unknown,
  educationStage: unknown,
  answers: unknown,
): PersonalDataSnapshot {
  if (!isRecord(data)) {
    throw new Error("Stored account data is invalid and requires support.");
  }
  const snapshot = { ...data, educationStage, discoveryAnswers: answers };
  if (!isPersonalDataSnapshot(snapshot)) {
    throw new Error("Stored account data is invalid and requires support.");
  }
  return snapshot;
}

function serializeAccountData(snapshot: PersonalDataSnapshot) {
  const serialized = JSON.stringify({
    ...snapshot,
    educationStage: undefined,
    discoveryAnswers: undefined,
  });
  if (serialized === undefined) {
    throw new Error("Account data could not be serialized.");
  }
  return serialized;
}

async function writeAccountData(
  tx: DatabaseTransaction,
  userId: number,
  snapshot: PersonalDataSnapshot,
) {
  await tx.execute(sql`
    UPDATE public.account_data
    SET data = ${serializeAccountData(snapshot)}::jsonb, updated_at = NOW()
    WHERE user_id = ${userId}
  `);
}

async function loadAccountSnapshot(
  tx: DatabaseTransaction,
  userId: number,
  createAccountData: boolean,
) {
  if (createAccountData) {
    await tx.execute(sql`
      INSERT INTO public.account_data (user_id)
      VALUES (${userId})
      ON CONFLICT (user_id) DO NOTHING
    `);
  }

  const accountResult = await tx.execute<{ data: unknown }>(sql`
    SELECT data
    FROM public.account_data
    WHERE user_id = ${userId}
    FOR UPDATE
  `);
  const accountDataExists = accountResult.rows.length > 0;
  const storedData = accountDataExists ? accountResult.rows[0].data : emptyPersonalData();
  if (!isRecord(storedData)) {
    throw new Error("Stored account data is invalid and requires support.");
  }

  let [profile] = await tx
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, userId))
    .limit(1);
  let [answersRecord] = await tx
    .select()
    .from(discoverAnswers)
    .where(eq(discoverAnswers.userId, userId))
    .limit(1);

  const initialSnapshot = snapshotFromStoredData(
    storedData,
    profile ? profile.educationStage : storedData.educationStage ?? null,
    answersRecord ? answersRecord.answers : storedData.discoveryAnswers ?? null,
  );

  if (!profile && initialSnapshot.educationStage !== null) {
    await tx
      .insert(studentProfiles)
      .values({ userId, educationStage: initialSnapshot.educationStage })
      .onConflictDoNothing();
    [profile] = await tx
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId))
      .limit(1);
  }

  if (!answersRecord && initialSnapshot.discoveryAnswers !== null) {
    await tx
      .insert(discoverAnswers)
      .values({ userId, answers: initialSnapshot.discoveryAnswers })
      .onConflictDoNothing();
    [answersRecord] = await tx
      .select()
      .from(discoverAnswers)
      .where(eq(discoverAnswers.userId, userId))
      .limit(1);
  }

  const snapshot = snapshotFromStoredData(
    storedData,
    profile ? profile.educationStage : initialSnapshot.educationStage,
    answersRecord ? answersRecord.answers : initialSnapshot.discoveryAnswers,
  );
  return {
    snapshot,
    accountDataExists,
    hasLegacyProgress:
      storedData.educationStage != null || storedData.discoveryAnswers != null,
  };
}

async function saveEducationStage(
  tx: DatabaseTransaction,
  userId: number,
  educationStage: PersonalDataSnapshot["educationStage"],
) {
  await tx
    .insert(studentProfiles)
    .values({ userId, educationStage })
    .onConflictDoUpdate({
      target: studentProfiles.userId,
      set: { educationStage, updatedAt: sql`now()` },
    });
}

async function saveDiscoveryAnswers(
  tx: DatabaseTransaction,
  userId: number,
  answers: NonNullable<PersonalDataSnapshot["discoveryAnswers"]>,
) {
  await tx
    .insert(discoverAnswers)
    .values({ userId, answers })
    .onConflictDoUpdate({
      target: discoverAnswers.userId,
      set: { answers, updatedAt: sql`now()` },
    });
}

export async function getAccountData(userId: number): Promise<PersonalDataSnapshot> {
  await ensureSchema();
  return getDb().transaction(async (tx) => {
    const loaded = await loadAccountSnapshot(tx, userId, false);
    if (loaded.accountDataExists && loaded.hasLegacyProgress) {
      await writeAccountData(tx, userId, loaded.snapshot);
    }
    return loaded.snapshot;
  });
}

export async function updateAccountData(
  userId: number,
  mutation: PersonalDataMutation,
): Promise<PersonalDataSnapshot> {
  await ensureSchema();
  return getDb().transaction(async (tx) => {
    const { snapshot: current } = await loadAccountSnapshot(tx, userId, true);
    const next = applyPersonalDataMutation(current, mutation);

    if (mutation.type === "progress.educationStage") {
      await saveEducationStage(tx, userId, mutation.value);
    } else if (mutation.type === "progress.discoveryAnswers") {
      if (mutation.value === null) {
        await tx.delete(discoverAnswers).where(eq(discoverAnswers.userId, userId));
      } else {
        await saveDiscoveryAnswers(tx, userId, mutation.value);
      }
    } else if (mutation.type === "migration.keep") {
      if (current.educationStage === null && mutation.data.educationStage !== null) {
        await saveEducationStage(tx, userId, mutation.data.educationStage);
      }
      if (current.discoveryAnswers === null && mutation.data.discoveryAnswers !== null) {
        await saveDiscoveryAnswers(tx, userId, mutation.data.discoveryAnswers);
      }
    }

    await writeAccountData(tx, userId, next);
    return next;
  });
}

export async function deleteAccount() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new AuthenticationRequiredError("Sign in again before deleting your account.");

  await ensureSchema();
  return withClerkIdentityLock(clerkUserId, async (client) => {
    const clerkUser = await currentUser();
    if (!clerkUser || clerkUser.id !== clerkUserId) {
      throw new AuthenticationRequiredError("Sign in again before deleting your account.");
    }

    const clerk = await clerkClient();

    await clerk.users.updateUserMetadata(clerkUserId, {
      privateMetadata: { careerbridgeDeletionPending: true },
    });

    let databaseError: unknown;
    try {
      await client.query("BEGIN");
      await client.query(
        "DELETE FROM users WHERE external_id = $1 AND auth_provider = 'clerk'",
        [clerkUserId],
      );
      await client.query("COMMIT");
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("[careerbridge-next] account deletion rollback failed", rollbackError);
      }
      databaseError = error;
    }

    if (databaseError) {
      if (
        typeof databaseError === "object" &&
        databaseError !== null &&
        "code" in databaseError &&
        databaseError.code === "23503"
      ) {
        try {
          await clerk.users.updateUserMetadata(clerkUserId, {
            privateMetadata: { careerbridgeDeletionPending: null },
          });
        } catch {
          throw new AccountDeletionPartialError(
            "Account deletion is blocked by retained records, and CareerBridge could not clear the pending deletion state. Retry or contact support.",
          );
        }
        throw new AccountDeletionBlockedError(
          "This account is referenced by retained CareerBridge records and cannot be deleted automatically. Contact support.",
        );
      }
      throw new AccountDeletionPartialError(
        "CareerBridge could not finish removing your account data. Your sign-in is preserved; retry account deletion to continue.",
      );
    }

    try {
      await clerk.users.deleteUser(clerkUserId);
    } catch (error) {
      if (errorStatus(error) === 404) return true;
      throw new AccountDeletionPartialError(
        "Your CareerBridge data has been removed, but Clerk sign-in cleanup is still pending. Type DELETE and retry account deletion.",
      );
    }

    return true;
  });
}
