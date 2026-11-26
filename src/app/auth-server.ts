import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import type { PoolClient } from "pg";
import type { AuthUser } from "./auth-types";
import { getDb } from "../db/client";
import { getIdentityLockPool, getPool } from "../db/pool";
import { catalogItemAliases } from "../db/schema/catalog";
import {
  discoverAnswers,
  explorationHistory,
  guidedExplorerAnswers,
  guidedExplorerOperationReceipts,
  guidedExplorerSessionQuestions,
  guidedExplorerSessions,
  savedItems,
  studentProfiles,
} from "../db/schema/student";
import type { CounsellingAnswer, CounsellingSession } from "./counselling/counselling-engine";
import type { ExplorationHistoryItem } from "./explore/exploration-history";
import type { SavedItem } from "./explore/saved-items";
import {
  emptyPersonalData,
  isPersonalDataSnapshot,
} from "./personal-data-validation";
import type {
  GuidedExplorerOperation,
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
        catalogItemAliases: string | null;
        studentProfiles: string | null;
        discoverAnswers: string | null;
        guidedExplorerSessions: string | null;
        guidedExplorerSessionQuestions: string | null;
        guidedExplorerAnswers: string | null;
        guidedExplorerOperationReceipts: string | null;
        savedItems: string | null;
        explorationHistory: string | null;
      }>(
        `SELECT to_regclass('public.users') AS users,
                to_regclass('public.account_data') AS "accountData",
                to_regclass('public.catalog_item_aliases') AS "catalogItemAliases",
                to_regclass('public.student_profiles') AS "studentProfiles",
                to_regclass('public.discover_answers') AS "discoverAnswers",
                to_regclass('public.guided_explorer_sessions') AS "guidedExplorerSessions",
                to_regclass('public.guided_explorer_session_questions') AS "guidedExplorerSessionQuestions",
                to_regclass('public.guided_explorer_answers') AS "guidedExplorerAnswers",
                 to_regclass('public.guided_explorer_operation_receipts') AS "guidedExplorerOperationReceipts",
                to_regclass('public.saved_items') AS "savedItems",
                to_regclass('public.exploration_history') AS "explorationHistory"`,
      );
      if (Object.values(result.rows[0] ?? {}).some((table) => !table)) {
        throw new Error("The account and student-data tables are missing from the configured PostgreSQL database.");
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
export class AccountEmailConflictError extends Error {}
export class AccountSetupValidationError extends Error {}
export class AccountDeletionPendingError extends Error {}
export class AccountDeletionBlockedError extends Error {}
export class AccountDeletionPartialError extends Error {}
export class AccountReverificationRequiredError extends Error {}
export class AccountSessionChangedError extends Error {}
export class CatalogueItemReferenceError extends Error {}
export class StudentDataConflictError extends Error {}
export class GuidedExplorerConflictError extends StudentDataConflictError {
  constructor(
    message: string,
    readonly operationId: string,
    readonly code: "stale_revision" | "different_active_session",
    readonly authoritativeSession: CounsellingSession | null,
  ) {
    super(message);
  }
}
export class ClerkUserLookupUnavailableError extends Error {
  constructor() {
    super("The Clerk current-user lookup is unavailable.");
    this.name = "ClerkUserLookupUnavailableError";
  }
}

const CURRENT_USER_MAX_ATTEMPTS = 3;
const CURRENT_USER_RETRY_DELAY_MS = 100;

function isPostgresUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function getVerifiedPrimaryEmail(clerkUser: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  const primaryEmail = clerkUser.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId,
  );
  if (!primaryEmail || primaryEmail.verification?.status !== "verified") return null;
  const email = primaryEmail.emailAddress.trim().toLowerCase();
  return email.length > 0 && email.length <= 191 ? email : null;
}

function errorStatus(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : null;
}

function clerkErrorDetail(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("errors" in error) ||
    !Array.isArray(error.errors)
  ) {
    return null;
  }
  return error.errors.find((detail) => typeof detail === "object" && detail !== null) ?? null;
}

function safeClerkErrorCode(error: unknown) {
  const detail = clerkErrorDetail(error);
  if (!detail || !("code" in detail) || typeof detail.code !== "string") return null;
  return /^[a-z0-9_]{1,64}$/i.test(detail.code) ? detail.code : null;
}

function isClerkTransportFailure(error: unknown) {
  if (error instanceof TypeError && error.message === "fetch failed") return true;
  const detail = clerkErrorDetail(error);
  return Boolean(
    detail &&
    "code" in detail &&
    detail.code === "unexpected_error" &&
    "message" in detail &&
    detail.message === "fetch failed",
  );
}

function currentUserFailureCategory(error: unknown) {
  const status = errorStatus(error);
  if (status !== null) return status >= 500 && status <= 599 ? "server" : "non_retryable";
  return isClerkTransportFailure(error) ? "transport" : "non_retryable";
}

type ClerkAuthDiagnostic = {
  event:
    | "auth_identity"
    | "auth_identity_exception"
    | "current_user_lookup"
    | "current_user_lookup_exception";
  clerkUserIdPresent: boolean | null;
  clerkCurrentUserFound: boolean | null;
  clerkUserIdMatchesCurrentUser: boolean | null;
  failureCategory?: ReturnType<typeof currentUserFailureCategory>;
  status?: number | null;
  clerkErrorCode?: string | null;
  attempt?: number;
  maxAttempts?: number;
  retrying?: boolean;
};

function logClerkAuthDiagnostic(diagnostic: ClerkAuthDiagnostic) {
  if (process.env.NODE_ENV === "development") {
    console.info("[careerbridge-next] Clerk auth diagnostic", diagnostic);
  }
}

async function currentUserWithRetry() {
  for (let attempt = 1; attempt <= CURRENT_USER_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await currentUser();
    } catch (error) {
      const failureCategory = currentUserFailureCategory(error);
      const retrying =
        (failureCategory === "transport" || failureCategory === "server") &&
        attempt < CURRENT_USER_MAX_ATTEMPTS;
      const diagnostics = {
        failureCategory,
        attempt,
        maxAttempts: CURRENT_USER_MAX_ATTEMPTS,
        status: errorStatus(error),
        clerkErrorCode: safeClerkErrorCode(error),
        retrying,
      };

      logClerkAuthDiagnostic({
        event: "current_user_lookup_exception",
        clerkUserIdPresent: true,
        clerkCurrentUserFound: null,
        clerkUserIdMatchesCurrentUser: null,
        failureCategory,
        status: diagnostics.status,
        clerkErrorCode: diagnostics.clerkErrorCode,
        attempt,
        maxAttempts: CURRENT_USER_MAX_ATTEMPTS,
        retrying,
      });

      if (retrying) {
        console.warn("[careerbridge-next] Clerk current-user lookup failed", diagnostics);
        await new Promise((resolve) =>
          setTimeout(resolve, CURRENT_USER_RETRY_DELAY_MS * attempt),
        );
        continue;
      }

      console.error("[careerbridge-next] Clerk current-user lookup failed", diagnostics);
      throw new ClerkUserLookupUnavailableError();
    }
  }
  throw new ClerkUserLookupUnavailableError();
}

async function withClerkIdentityLock<T>(
  clerkUserId: string,
  operation: (client: PoolClient) => Promise<T>,
) {
  const client = await getIdentityLockPool().connect();
  let locked = false;
  let operationFailed = false;
  let lockAcquisitionFailed = false;
  let operationError: unknown;
  let result!: T;
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [clerkUserId]);
    locked = true;
    result = await operation(client);
  } catch (error) {
    operationFailed = true;
    operationError = error;
    lockAcquisitionFailed = !locked;
  }

  const cleanupErrors: unknown[] = [];
  if (locked) {
    try {
      const unlockResult = await client.query<{ unlocked: boolean }>(
        "SELECT pg_advisory_unlock(hashtext($1)) AS unlocked",
        [clerkUserId],
      );
      if (unlockResult.rows[0]?.unlocked !== true) {
        throw new Error("The Clerk identity lock could not be released.");
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  try {
    const discardReason = cleanupErrors[0] ??
      (lockAcquisitionFailed ? operationError : undefined);
    client.release(
      discardReason === undefined
        ? undefined
        : discardReason instanceof Error
          ? discardReason
          : new Error("The identity-lock connection could not be reused safely."),
    );
  } catch (error) {
    cleanupErrors.push(error);
  }

  if (operationFailed) {
    if (cleanupErrors.length > 0) {
      console.error("[careerbridge-next] Clerk identity lock cleanup failed", cleanupErrors);
    }
    throw operationError;
  }

  if (cleanupErrors.length > 0) throw cleanupErrors[0];
  return result;
}

async function syncClerkPrimaryEmail(clerkUserId: string) {
  return withClerkIdentityLock(clerkUserId, async (client) => {
    const clerkUser = await currentUserWithRetry();
    if (!clerkUser || clerkUser.id !== clerkUserId) {
      throw new AuthenticationRequiredError("Sign in again before syncing your email address.");
    }
    if (clerkUser.privateMetadata.careerbridgeDeletionPending === true) {
      throw new AccountDeletionPendingError("Account deletion is in progress. Finish deleting your account instead.");
    }

    const email = getVerifiedPrimaryEmail(clerkUser);
    if (!email) {
      throw new AccountSetupValidationError("A verified primary email address is required to sync your account.");
    }

    const existing = await client.query<{
      id: number;
      email: string;
      full_name: string | null;
      auth_provider: string;
    }>(
      "SELECT id, email, full_name, auth_provider FROM users WHERE external_id = $1 LIMIT 1",
      [clerkUserId],
    );
    const record = existing.rows[0];
    if (!record) {
      throw new AccountProvisioningRequiredError("Finish setting up your CareerBridge account.");
    }
    if (record.auth_provider !== "clerk") {
      throw new AccountIdentityConflictError("This identity is not linked to a CareerBridge account.");
    }
    if (record.email === email) return toUser(record);

    try {
      const updated = await client.query<{
        id: number;
        email: string;
        full_name: string | null;
        auth_provider: string;
      }>(
        `UPDATE users SET email = $2
         WHERE external_id = $1 AND auth_provider = 'clerk'
         RETURNING id, email, full_name, auth_provider`,
        [clerkUserId, email],
      );
      if (!updated.rows[0]) {
        throw new AccountProvisioningRequiredError("Finish setting up your CareerBridge account.");
      }
      return toUser(updated.rows[0]);
    } catch (error) {
      if (error instanceof AccountProvisioningRequiredError) throw error;
      if (isPostgresUniqueViolation(error)) {
        throw new AccountEmailConflictError(
          "That verified email address is already associated with another CareerBridge account.",
        );
      }
      throw error;
    }
  });
}

export async function getCurrentUser() {
  let clerkUserId: string | null;
  try {
    ({ userId: clerkUserId } = await auth());
  } catch (error) {
    logClerkAuthDiagnostic({
      event: "auth_identity_exception",
      clerkUserIdPresent: null,
      clerkCurrentUserFound: null,
      clerkUserIdMatchesCurrentUser: null,
      failureCategory: currentUserFailureCategory(error),
      status: errorStatus(error),
      clerkErrorCode: safeClerkErrorCode(error),
    });
    throw error;
  }
  if (!clerkUserId) {
    logClerkAuthDiagnostic({
      event: "auth_identity",
      clerkUserIdPresent: false,
      clerkCurrentUserFound: null,
      clerkUserIdMatchesCurrentUser: null,
    });
    return null;
  }
  const clerkUser = await currentUserWithRetry();
  logClerkAuthDiagnostic({
    event: "current_user_lookup",
    clerkUserIdPresent: true,
    clerkCurrentUserFound: clerkUser !== null,
    clerkUserIdMatchesCurrentUser: clerkUser ? clerkUser.id === clerkUserId : null,
  });
  if (!clerkUser || clerkUser.id !== clerkUserId) {
    throw new AuthenticationRequiredError("Sign in again to continue.");
  }
  if (clerkUser.privateMetadata.careerbridgeDeletionPending === true) {
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
  const primaryEmail = getVerifiedPrimaryEmail(clerkUser);
  if (primaryEmail && primaryEmail !== record.email) {
    return syncClerkPrimaryEmail(clerkUserId);
  }
  return toUser(record);
}

export async function syncCurrentUserPrimaryEmail(expectedUserId: string) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    throw new AuthenticationRequiredError("Sign in before syncing your email address.");
  }
  if (expectedUserId !== clerkUserId) {
    throw new AccountSessionChangedError("Your account changed. Refresh the page before retrying email synchronization.");
  }
  await ensureSchema();
  return syncClerkPrimaryEmail(clerkUserId);
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
    const clerkUser = await currentUserWithRetry();
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

function personalDataKey(
  item: { type: string; id: string; context?: { courseId?: string } },
  aliases?: CatalogueAliasIndex,
) {
  const alias = aliases?.byLegacyIdentity.get(legacyCatalogueAliasKey(item));
  if (alias) return `catalog:${alias.catalogItemId}`;
  return item.type === "institution-offering"
    ? `${item.type}:${item.id}:${item.context?.courseId ?? ""}`
    : `${item.type}:${item.id}`;
}

function mergePersonalData(
  current: PersonalDataSnapshot,
  incoming: PersonalDataSnapshot,
  aliases?: CatalogueAliasIndex,
): PersonalDataSnapshot {
  return {
    savedItems: mergeSavedItems(current.savedItems, incoming.savedItems, aliases),
    history: mergeHistoryItems(current.history, incoming.history, aliases),
    educationStage: current.educationStage ?? incoming.educationStage,
    counsellingSession: current.counsellingSession ?? incoming.counsellingSession,
    discoveryAnswers: current.discoveryAnswers ?? incoming.discoveryAnswers,
  };
}

type CatalogueAlias = typeof catalogItemAliases.$inferSelect;

type CatalogueAliasIndex = {
  byLegacyIdentity: Map<string, CatalogueAlias>;
  byCatalogueId: Map<string, CatalogueAlias[]>;
};

function catalogueAliasKey(type: string, id: string, contextKey = "") {
  return `${type}:${id}:${contextKey}`;
}

function legacyCatalogueAliasKey(item: {
  type: string;
  id: string;
  context?: { courseId?: string };
}) {
  return catalogueAliasKey(
    item.type,
    item.id,
    item.type === "institution-offering" ? item.context?.courseId ?? "" : "",
  );
}

function indexCatalogueAliases(aliases: CatalogueAlias[]): CatalogueAliasIndex {
  const byLegacyIdentity = new Map<string, CatalogueAlias>();
  const byCatalogueId = new Map<string, CatalogueAlias[]>();
  for (const alias of aliases) {
    byLegacyIdentity.set(
      catalogueAliasKey(alias.externalType, alias.externalKey, alias.externalContextKey),
      alias,
    );
    const matches = byCatalogueId.get(alias.catalogItemId) ?? [];
    matches.push(alias);
    byCatalogueId.set(alias.catalogItemId, matches);
  }
  return { byLegacyIdentity, byCatalogueId };
}

function savedItemType(value: string): SavedItem["type"] | null {
  switch (value) {
    case "field":
    case "course":
    case "institution":
    case "institution-offering":
    case "pathway":
    case "examination":
    case "scholarship":
      return value;
    default:
      return null;
  }
}

function requiredCatalogueAlias(
  item: { type: string; id: string; context?: { courseId?: string } },
  aliases: CatalogueAliasIndex,
) {
  const alias = aliases.byLegacyIdentity.get(legacyCatalogueAliasKey(item));
  if (!alias || !savedItemType(alias.externalType)) {
    throw new CatalogueItemReferenceError(
      "This saved item is no longer available in the CareerBridge catalogue.",
    );
  }
  return alias;
}

function catalogueAliasForRow(
  catalogueItemId: string,
  context: Record<string, string> | null,
  aliases: CatalogueAliasIndex,
) {
  const matches = aliases.byCatalogueId.get(catalogueItemId) ?? [];
  const courseId = context?.courseId ?? "";
  return matches.find((alias) =>
    alias.externalType === "institution-offering" &&
    alias.externalContextKey === courseId,
  ) ?? matches[0];
}

function storedContext(
  context: Record<string, string> | null,
  alias: CatalogueAlias,
) {
  if (!context && !alias.externalContextKey) return undefined;
  const result = { ...(context ?? {}) };
  if (alias.externalType === "institution-offering" && alias.externalContextKey) {
    result.courseId = alias.externalContextKey;
  }
  return result;
}

function storedTimestamp(value: Date) {
  const timestamp = value.getTime();
  if (!Number.isFinite(timestamp)) {
    throw new Error("A stored student-data timestamp is invalid.");
  }
  return timestamp;
}

function savedItemFromRow(
  row: typeof savedItems.$inferSelect,
  aliases: CatalogueAliasIndex,
): SavedItem {
  const alias = catalogueAliasForRow(row.catalogItemId, row.context, aliases);
  const type = alias ? savedItemType(alias.externalType) : null;
  if (!alias || !type) {
    throw new Error("A saved record references an unavailable catalogue item.");
  }
  return {
    type,
    id: alias.externalKey,
    savedAt: storedTimestamp(row.savedAt),
    context: storedContext(row.context, alias),
  };
}

function historyItemFromRow(
  row: typeof explorationHistory.$inferSelect,
  aliases: CatalogueAliasIndex,
): ExplorationHistoryItem {
  const alias = catalogueAliasForRow(row.catalogItemId, row.context, aliases);
  const type = alias ? savedItemType(alias.externalType) : null;
  if (!alias || !type) {
    throw new Error("A history record references an unavailable catalogue item.");
  }
  return {
    type,
    id: alias.externalKey,
    lastVisitedAt: storedTimestamp(row.lastVisitedAt),
    visitCount: row.visitCount,
    context: storedContext(row.context, alias),
  };
}

function savedRowsFor(
  userId: number,
  items: SavedItem[],
  aliases: CatalogueAliasIndex,
) {
  const rows = new Map<string, typeof savedItems.$inferInsert>();
  for (const item of items) {
    const alias = requiredCatalogueAlias(item, aliases);
    const row = {
      userId,
      catalogItemId: alias.catalogItemId,
      context: item.context ?? null,
      savedAt: new Date(item.savedAt),
    };
    const existing = rows.get(alias.catalogItemId);
    if (!existing || row.savedAt > existing.savedAt) {
      rows.set(alias.catalogItemId, row);
    }
  }
  return [...rows.values()];
}

function historyRowsFor(
  userId: number,
  items: ExplorationHistoryItem[],
  aliases: CatalogueAliasIndex,
) {
  const rows = new Map<string, typeof explorationHistory.$inferInsert>();
  for (const item of items) {
    const alias = requiredCatalogueAlias(item, aliases);
    const row = {
      userId,
      catalogItemId: alias.catalogItemId,
      context: item.context ?? null,
      lastVisitedAt: new Date(item.lastVisitedAt),
      visitCount: item.visitCount,
    };
    const existing = rows.get(alias.catalogItemId);
    if (!existing) {
      rows.set(alias.catalogItemId, row);
    } else {
      rows.set(alias.catalogItemId, {
        ...existing,
        ...(
          row.lastVisitedAt > existing.lastVisitedAt
            ? { lastVisitedAt: row.lastVisitedAt, context: row.context }
            : {}
        ),
        visitCount: Math.max(existing.visitCount ?? 1, row.visitCount ?? 1),
      });
    }
  }
  return [...rows.values()];
}

async function loadCatalogueAliases(tx: DatabaseTransaction) {
  const aliases = await tx
    .select()
    .from(catalogItemAliases)
    .where(eq(catalogItemAliases.sourceSystem, "careerbridge"));
  return indexCatalogueAliases(aliases);
}

async function persistSavedItems(
  tx: DatabaseTransaction,
  userId: number,
  items: SavedItem[],
  aliases: CatalogueAliasIndex,
  ignoreConflicts = false,
) {
  const rows = savedRowsFor(userId, items, aliases);
  if (!rows.length) return;
  const insert = tx.insert(savedItems).values(rows);
  if (ignoreConflicts) {
    await insert.onConflictDoNothing();
    return;
  }
  await insert.onConflictDoUpdate({
    target: [savedItems.userId, savedItems.catalogItemId],
    set: {
      context: sql`excluded.context`,
      savedAt: sql`excluded.saved_at`,
    },
  });
}

async function persistHistory(
  tx: DatabaseTransaction,
  userId: number,
  items: ExplorationHistoryItem[],
  aliases: CatalogueAliasIndex,
  ignoreConflicts = false,
) {
  const rows = historyRowsFor(userId, items, aliases);
  if (!rows.length) return;
  const insert = tx.insert(explorationHistory).values(rows);
  if (ignoreConflicts) {
    await insert.onConflictDoNothing();
    return;
  }
  await insert.onConflictDoUpdate({
    target: [explorationHistory.userId, explorationHistory.catalogItemId],
    set: {
      context: sql`excluded.context`,
      lastVisitedAt: sql`excluded.last_visited_at`,
      visitCount: sql`excluded.visit_count`,
    },
  });
}

function normalizeCounsellingSession(session: CounsellingSession): CounsellingSession {
  if (
    session.currentQuestionId !== null ||
    (session.status !== "active" &&
      session.status !== "paused" &&
      session.completionReason !== "finished_early")
  ) {
    return session;
  }
  const currentQuestionId = session.questionPath[session.pathIndex];
  if (!currentQuestionId) {
    throw new Error("The Guided Explorer resume question is unavailable.");
  }
  return { ...session, currentQuestionId };
}

function counsellingResponseState(value: string): CounsellingAnswer["responseState"] {
  switch (value) {
    case "answered":
    case "unsure":
    case "none":
      return value;
    case "declined":
      return "skip";
    default:
      throw new Error("A stored Guided Explorer answer state is invalid.");
  }
}

async function readCounsellingSession(
  tx: DatabaseTransaction,
  row: typeof guidedExplorerSessions.$inferSelect,
): Promise<CounsellingSession> {
  const questions = await tx
    .select()
    .from(guidedExplorerSessionQuestions)
    .where(eq(guidedExplorerSessionQuestions.sessionId, row.id));
  const answers = await tx
    .select()
    .from(guidedExplorerAnswers)
    .where(eq(guidedExplorerAnswers.sessionId, row.id));
  questions.sort((left, right) => left.pathPosition - right.pathPosition);
  answers.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

  const currentQuestionId = row.status === "completed"
    ? row.completionReason === "finished_early"
      ? row.resumeQuestionId
      : null
    : row.currentQuestionId;
  return {
    version: 1,
    questionBankVersion: row.questionBankVersion as 1,
    id: row.id,
    status: row.status as CounsellingSession["status"],
    ...(row.completionReason === "finished_early"
      ? { completionReason: "finished_early" as const }
      : {}),
    currentQuestionId,
    questionPath: questions.map((question) => question.questionId),
    pathIndex: row.pathIndex,
    askedQuestionIds: questions
      .filter((question) => question.state === "asked")
      .map((question) => question.questionId),
    skippedQuestionIds: questions
      .filter((question) => question.state === "skipped")
      .map((question) => question.questionId),
    answers: answers.map((answer) => ({
      id: answer.id,
      questionId: answer.questionId,
      optionIds: answer.optionIds,
      originalText: answer.originalText,
      interpretationStatus: answer.interpretationStatus as CounsellingAnswer["interpretationStatus"],
      responseState: counsellingResponseState(answer.responseState),
      ...(answer.contextOptionId === null
        ? {}
        : { contextOptionId: answer.contextOptionId }),
      createdAt: answer.createdAt.toISOString(),
      ...(answer.editedAt === null
        ? {}
        : { editedAt: answer.editedAt.toISOString() }),
    })),
    updatedAt: row.updatedAt.toISOString(),
    persistedUpdatedAt: row.updatedAt.toISOString(),
    persistedRevision: row.revision,
  };
}

function currentSessionRow(rows: (typeof guidedExplorerSessions.$inferSelect)[]) {
  return [...rows].sort((left, right) => {
    const leftCurrent = left.status === "active" || left.status === "paused" ? 0 : 1;
    const rightCurrent = right.status === "active" || right.status === "paused" ? 0 : 1;
    return leftCurrent - rightCurrent || right.updatedAt.getTime() - left.updatedAt.getTime();
  })[0];
}

function sameCompletedCounsellingProgress(
  left: CounsellingSession,
  right: CounsellingSession,
) {
  const answers = (session: CounsellingSession) =>
    [...session.answers]
      .sort((a, b) => a.questionId.localeCompare(b.questionId))
      .map((answer) => ({
        id: answer.id,
        questionId: answer.questionId,
        optionIds: answer.optionIds,
        originalText: answer.originalText,
        interpretationStatus: answer.interpretationStatus,
        responseState: answer.responseState,
        contextOptionId: answer.contextOptionId ?? null,
        createdAt: answer.createdAt,
        editedAt: answer.editedAt ?? null,
      }));

  return (
    left.id === right.id &&
    left.version === right.version &&
    left.questionBankVersion === right.questionBankVersion &&
    left.status === "completed" &&
    right.status === "completed" &&
    left.completionReason === right.completionReason &&
    left.currentQuestionId === right.currentQuestionId &&
    left.pathIndex === right.pathIndex &&
    JSON.stringify(left.questionPath) === JSON.stringify(right.questionPath) &&
    JSON.stringify(left.askedQuestionIds) === JSON.stringify(right.askedQuestionIds) &&
    JSON.stringify(left.skippedQuestionIds) === JSON.stringify(right.skippedQuestionIds) &&
    JSON.stringify(answers(left)) === JSON.stringify(answers(right))
  );
}

async function loadCounsellingSession(tx: DatabaseTransaction, userId: number) {
  const rows = await tx
    .select()
    .from(guidedExplorerSessions)
    .where(eq(guidedExplorerSessions.userId, userId));
  const row = currentSessionRow(rows);
  return row ? readCounsellingSession(tx, row) : null;
}

async function loadLatestCompletedCounsellingSession(tx: DatabaseTransaction, userId: number) {
  const rows = await tx
    .select()
    .from(guidedExplorerSessions)
    .where(eq(guidedExplorerSessions.userId, userId));
  const row = [...rows]
    .filter((session) => session.status === "completed")
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0];
  return row ? readCounsellingSession(tx, row) : null;
}

async function persistCounsellingSession(
  tx: DatabaseTransaction,
  userId: number,
  source: CounsellingSession,
  enforceTimestamp = true,
  allowHistoricalCompletion = false,
) {
  const session = normalizeCounsellingSession(source);
  const [sameId] = await tx
    .select()
    .from(guidedExplorerSessions)
    .where(eq(guidedExplorerSessions.id, session.id))
    .limit(1);
  if (sameId && sameId.userId !== userId) {
    throw new StudentDataConflictError("This Guided Explorer session belongs to another account.");
  }
  if (sameId && session.status === "completed" && sameId.status === "completed") {
    const storedSession = await readCounsellingSession(tx, sameId);
    if (sameCompletedCounsellingProgress(session, storedSession)) {
      return storedSession;
    }
  }
  if (
    enforceTimestamp &&
    (sameId && session.persistedUpdatedAt !== sameId.updatedAt.toISOString()) ||
    (!sameId && session.persistedUpdatedAt !== undefined)
  ) {
    throw new StudentDataConflictError(
      "Guided Explorer progress changed elsewhere. Refresh before saving again.",
    );
  }

  const userSessions = await tx
    .select()
    .from(guidedExplorerSessions)
    .where(eq(guidedExplorerSessions.userId, userId));
  const current = currentSessionRow(userSessions);
  const isHistoricalCompletedSnapshot =
    !sameId &&
    current !== undefined &&
    current.id !== session.id &&
    (current.status === "active" || current.status === "paused") &&
    session.status === "completed" &&
    Date.parse(session.updatedAt) < current.updatedAt.getTime();
  if (
    current &&
    current.id !== session.id &&
    !isHistoricalCompletedSnapshot &&
    !(allowHistoricalCompletion && session.status === "completed") &&
    !(
      current.status === "completed" &&
      session.status === "active"
    )
  ) {
    throw new StudentDataConflictError(
      "Your Guided Explorer session changed. Refresh and retry your update.",
    );
  }

  const now = new Date(Math.max(Date.now(), (sameId?.updatedAt.getTime() ?? 0) + 1));
  const completedEarly =
    session.status === "completed" && session.completionReason === "finished_early";
  await tx
    .insert(guidedExplorerSessions)
    .values({
      id: session.id,
      userId,
      version: 1,
      revision: (sameId?.revision ?? 0) + 1,
      questionBankVersion: session.questionBankVersion,
      status: session.status,
      completionReason: completedEarly ? "finished_early" : null,
      currentQuestionId: session.status === "completed" ? null : session.currentQuestionId,
      resumeQuestionId: completedEarly ? session.currentQuestionId : null,
      pathIndex: session.pathIndex,
      createdAt: sameId?.createdAt ?? now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: guidedExplorerSessions.id,
      set: {
        questionBankVersion: session.questionBankVersion,
        revision: (sameId?.revision ?? 0) + 1,
        status: session.status,
        completionReason: completedEarly ? "finished_early" : null,
        currentQuestionId: session.status === "completed" ? null : session.currentQuestionId,
        resumeQuestionId: completedEarly ? session.currentQuestionId : null,
        pathIndex: session.pathIndex,
        updatedAt: now,
      },
      setWhere: eq(guidedExplorerSessions.userId, userId),
    });
  const [persisted] = await tx
    .select()
    .from(guidedExplorerSessions)
    .where(eq(guidedExplorerSessions.id, session.id))
    .limit(1);
  if (!persisted || persisted.userId !== userId) {
    throw new StudentDataConflictError("This Guided Explorer session belongs to another account.");
  }

  await tx
    .delete(guidedExplorerSessionQuestions)
    .where(eq(guidedExplorerSessionQuestions.sessionId, session.id));
  await tx
    .delete(guidedExplorerAnswers)
    .where(eq(guidedExplorerAnswers.sessionId, session.id));

  await tx.insert(guidedExplorerSessionQuestions).values(
    session.questionPath.map((questionId, pathPosition) => ({
      sessionId: session.id,
      questionId,
      pathPosition,
      state: session.skippedQuestionIds.includes(questionId)
        ? "skipped"
        : session.askedQuestionIds.includes(questionId)
          ? "asked"
          : "pending",
    })),
  );
  if (session.answers.length) {
    await tx.insert(guidedExplorerAnswers).values(
      session.answers.map((answer) => ({
        id: answer.id,
        sessionId: session.id,
        questionId: answer.questionId,
        optionIds: answer.optionIds,
        originalText: answer.originalText,
        interpretationStatus: answer.interpretationStatus,
        responseState: answer.responseState === "skip" ? "declined" : answer.responseState,
        contextOptionId: answer.contextOptionId ?? null,
        createdAt: new Date(answer.createdAt),
        editedAt: answer.editedAt ? new Date(answer.editedAt) : null,
      })),
    );
  }
  return readCounsellingSession(tx, persisted);
}

async function persistCounsellingOperation(
  tx: DatabaseTransaction,
  userId: number,
  operation: GuidedExplorerOperation,
) {
  const [receipt] = await tx
    .select()
    .from(guidedExplorerOperationReceipts)
    .where(and(
      eq(guidedExplorerOperationReceipts.userId, userId),
      eq(guidedExplorerOperationReceipts.operationId, operation.operationId),
    ))
    .limit(1);
  if (receipt) {
    const [stored] = await tx
      .select()
      .from(guidedExplorerSessions)
      .where(eq(guidedExplorerSessions.id, receipt.sessionId))
      .limit(1);
    if (!stored || stored.userId !== userId) {
      throw new Error("A stored Guided Explorer operation receipt is invalid.");
    }
    return readCounsellingSession(tx, stored);
  }

  const [sameId] = await tx
    .select()
    .from(guidedExplorerSessions)
    .where(eq(guidedExplorerSessions.id, operation.session.id))
    .limit(1);
  if (sameId && sameId.userId !== userId) {
    throw new StudentDataConflictError("This Guided Explorer session belongs to another account.");
  }
  const current = await loadCounsellingSession(tx, userId);
  if (sameId && operation.baseRevision !== sameId.revision) {
    throw new GuidedExplorerConflictError(
      "Guided Explorer progress changed elsewhere. Refresh before saving again.",
      operation.operationId,
      "stale_revision",
      current,
    );
  }
  if (!sameId && operation.baseRevision !== null) {
    throw new GuidedExplorerConflictError(
      "Guided Explorer progress changed elsewhere. Refresh before saving again.",
      operation.operationId,
      "stale_revision",
      current,
    );
  }
  if (
    !sameId &&
    current &&
    current.id !== operation.session.id &&
    (current.status === "active" || current.status === "paused") &&
    operation.session.status !== "completed"
  ) {
    throw new GuidedExplorerConflictError(
      "A newer Guided Explorer session is active. Your earlier progress was retained for review.",
      operation.operationId,
      "different_active_session",
      current,
    );
  }

  const persisted = await persistCounsellingSession(tx, userId, operation.session, false, true);
  await tx.insert(guidedExplorerOperationReceipts).values({
    userId,
    operationId: operation.operationId,
    sessionId: persisted.id,
    revision: persisted.persistedRevision ?? 1,
  });
  return persisted;
}

function applyPersonalDataMutation(
  current: PersonalDataSnapshot,
  mutation: PersonalDataMutation,
  aliases?: CatalogueAliasIndex,
): PersonalDataSnapshot {
  switch (mutation.type) {
    case "saved.add": {
      const key = personalDataKey(mutation.item, aliases);
      const index = current.savedItems.findIndex((item) =>
        personalDataKey(item, aliases) === key,
      );
      const items = [...current.savedItems];
      if (index === -1) items.push(mutation.item);
      else if (mutation.item.savedAt > items[index].savedAt) items[index] = mutation.item;
      return { ...current, savedItems: items };
    }
    case "saved.remove": {
      const key = personalDataKey(mutation.item, aliases);
      return {
        ...current,
        savedItems: current.savedItems.filter((item) =>
          personalDataKey(item, aliases) !== key,
        ),
      };
    }
    case "history.record": {
      const key = personalDataKey(mutation.item, aliases);
      const existing = current.history.find((item) =>
        personalDataKey(item, aliases) === key,
      );
      if (existing && mutation.item.lastVisitedAt <= existing.lastVisitedAt) return current;
      const item = {
        ...mutation.item,
        visitCount: existing ? existing.visitCount + 1 : 1,
      };
      return {
        ...current,
        history: [
          ...current.history.filter((entry) =>
            personalDataKey(entry, aliases) !== key,
          ),
          item,
        ],
      };
    }
    case "history.remove": {
      const key = personalDataKey(mutation.item, aliases);
      return {
        ...current,
        history: current.history.filter((item) =>
          personalDataKey(item, aliases) !== key,
        ),
      };
    }
    case "history.restore": {
      const key = personalDataKey(mutation.item, aliases);
      return current.history.some((item) => personalDataKey(item, aliases) === key)
        ? current
        : { ...current, history: [...current.history, mutation.item] };
    }
    case "history.clear":
      return { ...current, history: [] };
    case "progress.educationStage":
      return { ...current, educationStage: mutation.value };
    case "progress.counsellingSession":
      return { ...current, counsellingSession: mutation.value };
    case "progress.counsellingOperation":
      return { ...current, counsellingSession: mutation.operation.session };
    case "progress.discoveryAnswers":
      return { ...current, discoveryAnswers: mutation.value };
    case "migration.keep":
      return mergePersonalData(current, mutation.data, aliases);
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
  const snapshotData = { ...data };
  delete snapshotData.removedLegacySavedItemKeys;
  const snapshot = { ...snapshotData, educationStage, discoveryAnswers: answers };
  if (!isPersonalDataSnapshot(snapshot)) {
    throw new Error("Stored account data is invalid and requires support.");
  }
  return snapshot;
}

function serializeAccountData(
  snapshot: PersonalDataSnapshot,
  removedLegacySavedItemKeys: string[],
) {
  const counsellingSession = snapshot.counsellingSession
    ? {
        ...snapshot.counsellingSession,
        persistedUpdatedAt: undefined,
        persistedRevision: undefined,
      }
    : null;
  const serialized = JSON.stringify({
    ...snapshot,
    educationStage: undefined,
    discoveryAnswers: undefined,
    counsellingSession,
    latestCompletedCounsellingSession: undefined,
    removedLegacySavedItemKeys:
      removedLegacySavedItemKeys.length > 0 ? removedLegacySavedItemKeys : undefined,
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
  removedLegacySavedItemKeys: string[],
) {
  await tx.execute(sql`
    UPDATE public.account_data
    SET data = ${serializeAccountData(snapshot, removedLegacySavedItemKeys)}::jsonb, updated_at = NOW()
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
  const storedRemovedKeys = storedData.removedLegacySavedItemKeys;
  if (
    storedRemovedKeys !== undefined &&
    (!Array.isArray(storedRemovedKeys) ||
      storedRemovedKeys.length > 10_000 ||
      !storedRemovedKeys.every((key) => typeof key === "string" && key.length <= 1_000))
  ) {
    throw new Error("Stored account data is invalid and requires support.");
  }
  const removedLegacySavedItemKeys = [
    ...new Set((storedRemovedKeys ?? []) as string[]),
  ];

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
  const aliases = await loadCatalogueAliases(tx);

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

  let savedRows = await tx
    .select()
    .from(savedItems)
    .where(eq(savedItems.userId, userId));
  let historyRows = await tx
    .select()
    .from(explorationHistory)
    .where(eq(explorationHistory.userId, userId));
  const savedCatalogueIds = new Set(savedRows.map((row) => row.catalogItemId));
  const historyCatalogueIds = new Set(historyRows.map((row) => row.catalogItemId));
  const legacySavedItems = mergeSavedItems([], initialSnapshot.savedItems, aliases).filter((item) => {
    const alias = aliases.byLegacyIdentity.get(legacyCatalogueAliasKey(item));
    if (!alias || savedCatalogueIds.has(alias.catalogItemId)) return false;
    savedCatalogueIds.add(alias.catalogItemId);
    return true;
  });
  const legacyHistory = mergeHistoryItems([], initialSnapshot.history, aliases).filter((item) => {
    const alias = aliases.byLegacyIdentity.get(legacyCatalogueAliasKey(item));
    if (!alias || historyCatalogueIds.has(alias.catalogItemId)) return false;
    historyCatalogueIds.add(alias.catalogItemId);
    return true;
  });
  await persistSavedItems(tx, userId, legacySavedItems, aliases, true);
  await persistHistory(tx, userId, legacyHistory, aliases, true);
  savedRows = await tx
    .select()
    .from(savedItems)
    .where(eq(savedItems.userId, userId));
  historyRows = await tx
    .select()
    .from(explorationHistory)
    .where(eq(explorationHistory.userId, userId));

  let counsellingSession = await loadCounsellingSession(tx, userId);
  if (!counsellingSession && initialSnapshot.counsellingSession) {
    await persistCounsellingSession(tx, userId, initialSnapshot.counsellingSession);
    counsellingSession = await loadCounsellingSession(tx, userId);
  }
  const latestCompletedCounsellingSession = await loadLatestCompletedCounsellingSession(tx, userId);

  const snapshot = snapshotFromStoredData(
    {
      ...storedData,
      counsellingSession: counsellingSession ?? initialSnapshot.counsellingSession,
      latestCompletedCounsellingSession,
      savedItems: mergeSavedItems(
        savedRows.map((row) => savedItemFromRow(row, aliases)),
        initialSnapshot.savedItems,
        aliases,
      ),
      history: mergeHistoryItems(
        historyRows.map((row) => historyItemFromRow(row, aliases)),
        initialSnapshot.history,
        aliases,
      ),
    },
    profile ? profile.educationStage : initialSnapshot.educationStage,
    answersRecord ? answersRecord.answers : initialSnapshot.discoveryAnswers,
  );
  return {
    snapshot,
    aliases,
    accountDataExists,
    removedLegacySavedItemKeys,
    hasLegacyProgress:
      storedData.educationStage != null || storedData.discoveryAnswers != null,
  };
}

function mergeSavedItems(
  current: SavedItem[],
  incoming: SavedItem[],
  aliases?: CatalogueAliasIndex,
) {
  const saved = new Map(current.map((item) => [personalDataKey(item, aliases), item]));
  for (const item of incoming) {
    const key = personalDataKey(item, aliases);
    const existing = saved.get(key);
    if (!existing || item.savedAt > existing.savedAt) saved.set(key, item);
  }
  return [...saved.values()];
}

function mergeHistoryItems(
  current: ExplorationHistoryItem[],
  incoming: ExplorationHistoryItem[],
  aliases?: CatalogueAliasIndex,
) {
  const history = new Map(current.map((item) => [personalDataKey(item, aliases), item]));
  for (const item of incoming) {
    const key = personalDataKey(item, aliases);
    const existing = history.get(key);
    history.set(key, existing
      ? {
          ...existing,
          lastVisitedAt: Math.max(existing.lastVisitedAt, item.lastVisitedAt),
          visitCount: Math.max(existing.visitCount, item.visitCount),
        }
      : item);
  }
  return [...history.values()];
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
      await writeAccountData(
        tx,
        userId,
        loaded.snapshot,
        loaded.removedLegacySavedItemKeys,
      );
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
    const loaded = await loadAccountSnapshot(tx, userId, true);
    const { snapshot: current, aliases } = loaded;
    const removedLegacySavedItemKeys = new Set(loaded.removedLegacySavedItemKeys);
    let effectiveMutation = mutation;
    if (mutation.type === "saved.remove") {
      const key = legacyCatalogueAliasKey(mutation.item);
      const isUnmappedLegacyItem = !aliases.byLegacyIdentity.has(key);
      if (
        isUnmappedLegacyItem &&
        current.savedItems.some((item) => legacyCatalogueAliasKey(item) === key)
      ) {
        removedLegacySavedItemKeys.add(key);
      }
    } else if (mutation.type === "saved.add") {
      removedLegacySavedItemKeys.delete(legacyCatalogueAliasKey(mutation.item));
    } else if (mutation.type === "migration.keep") {
      effectiveMutation = {
        ...mutation,
        data: {
          ...mutation.data,
          savedItems: mutation.data.savedItems.filter(
            (item) => !removedLegacySavedItemKeys.has(legacyCatalogueAliasKey(item)),
          ),
        },
      };
    }
    const next = applyPersonalDataMutation(current, effectiveMutation, aliases);

    if (mutation.type === "progress.educationStage") {
      await saveEducationStage(tx, userId, mutation.value);
    } else if (mutation.type === "progress.discoveryAnswers") {
      if (mutation.value === null) {
        await tx.delete(discoverAnswers).where(eq(discoverAnswers.userId, userId));
      } else {
        await saveDiscoveryAnswers(tx, userId, mutation.value);
      }
    } else if (mutation.type === "saved.add") {
      const item = next.savedItems.find(
        (savedItem) =>
          personalDataKey(savedItem, aliases) === personalDataKey(mutation.item, aliases),
      );
      if (item) await persistSavedItems(tx, userId, [item], aliases);
    } else if (mutation.type === "saved.remove") {
      const alias = aliases.byLegacyIdentity.get(legacyCatalogueAliasKey(mutation.item));
      if (alias && savedItemType(alias.externalType)) {
        await tx.delete(savedItems).where(and(
          eq(savedItems.userId, userId),
          eq(savedItems.catalogItemId, alias.catalogItemId),
        ));
      }
    } else if (mutation.type === "history.record" || mutation.type === "history.restore") {
      const item = next.history.find(
        (historyItem) =>
          personalDataKey(historyItem, aliases) === personalDataKey(mutation.item, aliases),
      );
      if (item && next.history !== current.history) {
        await persistHistory(tx, userId, [item], aliases);
      }
    } else if (mutation.type === "history.remove") {
      const alias = aliases.byLegacyIdentity.get(legacyCatalogueAliasKey(mutation.item));
      if (alias && savedItemType(alias.externalType)) {
        await tx.delete(explorationHistory).where(and(
          eq(explorationHistory.userId, userId),
          eq(explorationHistory.catalogItemId, alias.catalogItemId),
        ));
      }
    } else if (mutation.type === "history.clear") {
      await tx.delete(explorationHistory).where(eq(explorationHistory.userId, userId));
    } else if (mutation.type === "progress.counsellingSession") {
      if (mutation.value === null) {
        const sessions = await tx
          .select()
          .from(guidedExplorerSessions)
          .where(eq(guidedExplorerSessions.userId, userId));
        const current = currentSessionRow(sessions);
        if (current && (current.status === "active" || current.status === "paused")) {
          await tx.delete(guidedExplorerAnswers).where(
            eq(guidedExplorerAnswers.sessionId, current.id),
          );
          await tx.delete(guidedExplorerSessionQuestions).where(
            eq(guidedExplorerSessionQuestions.sessionId, current.id),
          );
          await tx.delete(guidedExplorerSessions).where(
            eq(guidedExplorerSessions.id, current.id),
          );
        }
        next.counsellingSession = await loadCounsellingSession(tx, userId);
      } else {
        next.counsellingSession = await persistCounsellingSession(tx, userId, mutation.value);
      }
    } else if (mutation.type === "progress.counsellingOperation") {
      next.counsellingSession = await persistCounsellingOperation(tx, userId, mutation.operation);
    } else if (effectiveMutation.type === "migration.keep") {
      const guestData = effectiveMutation.data;
      if (current.educationStage === null && mutation.data.educationStage !== null) {
        await saveEducationStage(tx, userId, guestData.educationStage);
      }
      if (current.discoveryAnswers === null && guestData.discoveryAnswers !== null) {
        await saveDiscoveryAnswers(tx, userId, guestData.discoveryAnswers);
      }
      if (guestData.counsellingSession && current.counsellingSession === null) {
        next.counsellingSession = await persistCounsellingSession(
          tx,
          userId,
          guestData.counsellingSession,
        );
      }
      await persistSavedItems(
        tx,
        userId,
        guestData.savedItems.filter((item) =>
          aliases.byLegacyIdentity.has(legacyCatalogueAliasKey(item)),
        ).map((item) =>
          next.savedItems.find((savedItem) =>
            personalDataKey(savedItem, aliases) === personalDataKey(item, aliases),
          ) ?? item,
        ),
        aliases,
      );
      await persistHistory(
        tx,
        userId,
        guestData.history.map((item) =>
          next.history.find((historyItem) =>
            personalDataKey(historyItem, aliases) === personalDataKey(item, aliases),
          ) ?? item,
        ),
        aliases,
      );
    }

    if (
      mutation.type === "progress.counsellingSession" ||
      mutation.type === "progress.counsellingOperation"
    ) {
      next.latestCompletedCounsellingSession = await loadLatestCompletedCounsellingSession(tx, userId);
    }

    await writeAccountData(tx, userId, next, [...removedLegacySavedItemKeys]);
    return next;
  });
}

export async function deleteAccount(expectedUserId: string) {
  const { userId: clerkUserId, has } = await auth();
  if (!clerkUserId) throw new AuthenticationRequiredError("Sign in again before deleting your account.");
  if (expectedUserId !== clerkUserId) {
    throw new AccountSessionChangedError("Your account session changed. Refresh and retry account deletion.");
  }
  if (!has({ reverification: "strict" })) {
    throw new AccountReverificationRequiredError("Reverify your identity before deleting your account.");
  }

  await ensureSchema();
  return withClerkIdentityLock(clerkUserId, async (client) => {
    const clerkUser = await currentUserWithRetry();
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
