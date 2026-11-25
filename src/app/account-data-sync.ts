"use client";

import type { SavedItem } from "./explore/saved-items";
import {
  COUNSELLING_STORAGE_KEY,
  COMPLETED_COUNSELLING_STORAGE_KEY,
  DISCOVERY_STORAGE_KEY,
  EDUCATION_STAGE_STORAGE_KEY,
  EXPLORATION_HISTORY_STORAGE_KEY,
  SAVED_ITEMS_STORAGE_KEY,
} from "./personal-data-storage-keys";
import { isPersonalDataSnapshot, isSavedItem } from "./personal-data-validation";
import type {
  PersonalDataMutation,
  PersonalDataSnapshot,
} from "./personal-data-types";

export const ACCOUNT_CACHE_MARKER_KEY = "careerbridge:account-cache:v1";
export const PERSONAL_DATA_READY_EVENT = "careerbridge-personal-data-ready";
export const ACCOUNT_SYNC_EVENT = "careerbridge-account-sync";
export const PENDING_SAVE_KEY = "careerbridge:pending-save:v1";
export const ACCOUNT_MUTATION_QUEUE_PREFIX = "careerbridge:account-mutations:";
export const ACCOUNT_MUTATION_CONFLICT_PREFIX = "careerbridge:account-mutation-conflicts:";
const UNREADABLE_GUEST_BACKUP_KEY = "careerbridge:unreadable-guest-data:v1";
const GUEST_DATA_BACKUP_KEY = "careerbridge:guest-data-backup:v1";
const legacyStorageKeys = [
  SAVED_ITEMS_STORAGE_KEY,
  EXPLORATION_HISTORY_STORAGE_KEY,
  EDUCATION_STAGE_STORAGE_KEY,
  COUNSELLING_STORAGE_KEY,
  COMPLETED_COUNSELLING_STORAGE_KEY,
];

export type QueuedAccountMutation = {
  id: string;
  userId: number;
  mutation: PersonalDataMutation;
  createdAt: number;
  conflictCount?: number;
};

export function getAccountMutationQueueKey(userId: number) {
  return `${ACCOUNT_MUTATION_QUEUE_PREFIX}${userId}:v1`;
}

export function getAccountMutationConflictKey(userId: number) {
  return `${ACCOUNT_MUTATION_CONFLICT_PREFIX}${userId}:v1`;
}

let accountMode: boolean | undefined;
let activeUserId: number | null = null;
let activeFlushUserId: number | null = null;
let flushPromise: Promise<boolean> | null = null;

export function isPersonalDataReady() {
  return accountMode !== undefined;
}

export function isAccountMode() {
  return accountMode === true;
}

export function getActiveUserId(): number | null {
  return activeUserId ?? getAccountCacheUserId();
}

export function setAccountMode(enabled: boolean, userId?: number | null) {
  accountMode = enabled;
  activeUserId = enabled ? (userId ?? getAccountCacheUserId() ?? 0) : null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PERSONAL_DATA_READY_EVENT));
  }
}

export function lockPersonalData() {
  accountMode = undefined;
  activeUserId = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PERSONAL_DATA_READY_EVENT));
  }
}

export function commitPersonalDataIdentityTransition(
  previousUserId: string | null | undefined,
  nextUserId: string | null,
  invalidateOperations: () => void,
) {
  if (
    previousUserId === nextUserId ||
    (previousUserId === undefined && nextUserId === null)
  ) return false;
  invalidateOperations();
  lockPersonalData();
  return true;
}

export function emitPersonalDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PERSONAL_DATA_READY_EVENT));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseArrayEnvelope(raw: string | null, key: "items"): unknown[] | null {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || !Array.isArray(value[key])) return null;
    return value[key];
  } catch {
    return null;
  }
}

function parseJson(raw: string | null): unknown | null | undefined {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function readPersonalDataCache(): {
  data: PersonalDataSnapshot | null;
  hasContent: boolean;
  unreadable: boolean;
} {
  const savedRaw = window.sessionStorage.getItem(SAVED_ITEMS_STORAGE_KEY);
  const historyRaw = window.sessionStorage.getItem(EXPLORATION_HISTORY_STORAGE_KEY);
  const stageRaw = window.sessionStorage.getItem(EDUCATION_STAGE_STORAGE_KEY);
  const counsellingRaw = window.sessionStorage.getItem(COUNSELLING_STORAGE_KEY);
  const completedCounsellingRaw = window.sessionStorage.getItem(COMPLETED_COUNSELLING_STORAGE_KEY);
  const discoveryRaw = window.sessionStorage.getItem(DISCOVERY_STORAGE_KEY);
  const savedItems = parseArrayEnvelope(savedRaw, "items");
  const history = parseArrayEnvelope(historyRaw, "items");
  const counsellingSession = parseJson(counsellingRaw);
  const discoveryAnswers = parseJson(discoveryRaw);
  const educationStage =
    stageRaw === "class-10" || stageRaw === "class-12" ? stageRaw : stageRaw === null ? null : undefined;
  const data: unknown = {
    savedItems,
    history,
    educationStage,
    counsellingSession,
    latestCompletedCounsellingSession: parseJson(completedCounsellingRaw),
    discoveryAnswers,
  };
  const hasContent =
    (savedItems?.length ?? 0) > 0 ||
    (history?.length ?? 0) > 0 ||
    educationStage != null ||
    (counsellingSession !== null && counsellingSession !== undefined) ||
    (isRecord(discoveryAnswers) && Array.isArray(discoveryAnswers.activityIds)
      ? discoveryAnswers.activityIds.length
      : 0) > 0;
  const valid =
    savedItems !== null &&
    history !== null &&
    counsellingSession !== undefined &&
    parseJson(completedCounsellingRaw) !== undefined &&
    discoveryAnswers !== undefined &&
    educationStage !== undefined &&
    isPersonalDataSnapshot(data);

  if (!valid || !isPersonalDataSnapshot(data)) {
    const raw = {
      saved: savedRaw,
      history: historyRaw,
      stage: stageRaw,
      counselling: counsellingRaw,
      discovery: discoveryRaw,
    };
    window.sessionStorage.setItem(UNREADABLE_GUEST_BACKUP_KEY, JSON.stringify(raw));
    return { data: null, hasContent, unreadable: true };
  }
  return { data, hasContent, unreadable: false };
}

export function migrateLegacyPersonalDataToSession() {
  const keys = [
    SAVED_ITEMS_STORAGE_KEY,
    EXPLORATION_HISTORY_STORAGE_KEY,
    EDUCATION_STAGE_STORAGE_KEY,
    COUNSELLING_STORAGE_KEY,
    COMPLETED_COUNSELLING_STORAGE_KEY,
    DISCOVERY_STORAGE_KEY,
  ];
  const values = new Map<string, string>();
  for (const key of keys) {
    const current = window.sessionStorage.getItem(key);
    const legacy = current === null ? window.localStorage.getItem(key) : null;
    const value = current ?? legacy;
    if (value !== null) values.set(key, value);
  }

  const savedItems = parseArrayEnvelope(values.get(SAVED_ITEMS_STORAGE_KEY) ?? null, "items");
  const history = parseArrayEnvelope(values.get(EXPLORATION_HISTORY_STORAGE_KEY) ?? null, "items");
  const stageRaw = values.get(EDUCATION_STAGE_STORAGE_KEY) ?? null;
  const educationStage =
    stageRaw === "class-10" || stageRaw === "class-12" ? stageRaw : stageRaw === null ? null : undefined;
  const data: unknown = {
    savedItems,
    history,
    educationStage,
    counsellingSession: parseJson(values.get(COUNSELLING_STORAGE_KEY) ?? null),
    latestCompletedCounsellingSession: parseJson(values.get(COMPLETED_COUNSELLING_STORAGE_KEY) ?? null),
    discoveryAnswers: parseJson(values.get(DISCOVERY_STORAGE_KEY) ?? null),
  };
  const valid = isPersonalDataSnapshot(data);

  for (const [key, value] of values) {
    if (window.sessionStorage.getItem(key) === null) {
      window.sessionStorage.setItem(key, value);
    }
    if (valid && window.localStorage.getItem(key) !== null) {
      window.localStorage.removeItem(key);
    }
  }
}

export function getAccountCacheUserId() {
  try {
    const raw = window.sessionStorage.getItem(ACCOUNT_CACHE_MARKER_KEY);
    if (!raw) return null;
    const marker: unknown = JSON.parse(raw);
    return isRecord(marker) &&
      typeof marker.userId === "number" &&
      Number.isInteger(marker.userId)
      ? marker.userId
      : null;
  } catch {
    return null;
  }
}

export function hydrateAccountCache(
  data: PersonalDataSnapshot,
  userId: number,
  clearUnreadableBackup = true,
) {
  if (!isPersonalDataSnapshot(data)) {
    throw new Error("The account returned data that could not be validated.");
  }
  const cachedUserId = getAccountCacheUserId();
  if (cachedUserId !== null && cachedUserId !== userId) {
    window.sessionStorage.removeItem(COMPLETED_COUNSELLING_STORAGE_KEY);
  }
  writePersonalDataCache(data);
  window.sessionStorage.setItem(ACCOUNT_CACHE_MARKER_KEY, JSON.stringify({ userId }));
  activeUserId = userId;
  if (clearUnreadableBackup) {
    window.sessionStorage.removeItem(UNREADABLE_GUEST_BACKUP_KEY);
  }
  emitPersonalDataChanged();
}

function writePersonalDataCache(data: PersonalDataSnapshot) {
  window.sessionStorage.setItem(
    SAVED_ITEMS_STORAGE_KEY,
    JSON.stringify({ version: 1, items: data.savedItems }),
  );
  window.sessionStorage.setItem(
    EXPLORATION_HISTORY_STORAGE_KEY,
    JSON.stringify({ version: 1, items: data.history }),
  );
  if (data.educationStage) {
    window.sessionStorage.setItem(EDUCATION_STAGE_STORAGE_KEY, data.educationStage);
  } else {
    window.sessionStorage.removeItem(EDUCATION_STAGE_STORAGE_KEY);
  }
  if (data.counsellingSession) {
    window.sessionStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(data.counsellingSession));
  } else {
    window.sessionStorage.removeItem(COUNSELLING_STORAGE_KEY);
  }
  if (data.latestCompletedCounsellingSession !== undefined) {
    if (data.latestCompletedCounsellingSession) {
      window.sessionStorage.setItem(
        COMPLETED_COUNSELLING_STORAGE_KEY,
        JSON.stringify(data.latestCompletedCounsellingSession),
      );
    } else {
      window.sessionStorage.removeItem(COMPLETED_COUNSELLING_STORAGE_KEY);
    }
  }
  if (data.discoveryAnswers) {
    window.sessionStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(data.discoveryAnswers));
  } else {
    window.sessionStorage.removeItem(DISCOVERY_STORAGE_KEY);
  }
}

export function preserveGuestDataCache(data: PersonalDataSnapshot) {
  if (!isPersonalDataSnapshot(data)) {
    throw new Error("Guest data could not be validated for this session.");
  }
  window.sessionStorage.setItem(GUEST_DATA_BACKUP_KEY, JSON.stringify(data));
}

export function clearGuestDataCache() {
  window.sessionStorage.removeItem(GUEST_DATA_BACKUP_KEY);
}

export function restoreGuestDataCache() {
  const rawGuestData = window.sessionStorage.getItem(GUEST_DATA_BACKUP_KEY);
  let guestData: PersonalDataSnapshot | null = null;
  if (rawGuestData !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawGuestData);
    } catch {
      throw new Error("Guest data could not be restored.");
    }
    if (!isPersonalDataSnapshot(parsed)) {
      throw new Error("Guest data could not be restored.");
    }
    guestData = parsed;
  }
  const unreadableGuestData = window.sessionStorage.getItem(UNREADABLE_GUEST_BACKUP_KEY);

  clearPersonalDataCache();
  if (guestData) writePersonalDataCache(guestData);
  if (unreadableGuestData !== null) {
    window.sessionStorage.setItem(UNREADABLE_GUEST_BACKUP_KEY, unreadableGuestData);
  }
  clearGuestDataCache();
  setAccountMode(false);
}

export function clearPersonalDataCache() {
  for (const key of [
    ...legacyStorageKeys,
    DISCOVERY_STORAGE_KEY,
    ACCOUNT_CACHE_MARKER_KEY,
    PENDING_SAVE_KEY,
    UNREADABLE_GUEST_BACKUP_KEY,
  ]) {
    window.sessionStorage.removeItem(key);
    if (key !== ACCOUNT_CACHE_MARKER_KEY && key !== PENDING_SAVE_KEY && key !== UNREADABLE_GUEST_BACKUP_KEY) {
      window.localStorage.removeItem(key);
    }
  }
  setAccountMode(false);
  window.dispatchEvent(new Event("careerbridge-saved-items-change"));
  window.dispatchEvent(new Event("careerbridge-exploration-history-change"));
  window.dispatchEvent(new Event("careerbridge-education-stage-change"));
  window.dispatchEvent(new Event("careerbridge-counselling-change"));
  window.dispatchEvent(new Event("careerbridge-discovery-change"));
}

export function loadAccountMutationQueue(userId: number): QueuedAccountMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(getAccountMutationQueueKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid: QueuedAccountMutation[] = [];
    for (const item of parsed) {
      if (
        isRecord(item) &&
        typeof item.id === "string" &&
        item.userId === userId &&
        typeof item.createdAt === "number" &&
        isRecord(item.mutation)
      ) {
        valid.push(item as QueuedAccountMutation);
      }
    }
    return valid;
  } catch {
    return [];
  }
}

export function saveAccountMutationQueue(userId: number, queue: QueuedAccountMutation[]) {
  if (typeof window === "undefined") return;
  try {
    const key = getAccountMutationQueueKey(userId);
    if (queue.length === 0) {
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, JSON.stringify(queue));
    }
  } catch {
    // Keep in-memory or ignore if storage unavailable
  }
}

export function clearAccountMutationQueue(userId: number) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(getAccountMutationQueueKey(userId));
  } catch {
    // Ignore
  }
}

function preserveAccountMutationConflicts(userId: number, items: QueuedAccountMutation[]) {
  try {
    const raw = window.sessionStorage.getItem(getAccountMutationConflictKey(userId));
    const conflicts: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(conflicts)) return false;
    const additions = items.filter((item) =>
      !conflicts.some((conflict) => isRecord(conflict) && conflict.id === item.id),
    );
    if (additions.length) {
      conflicts.push(...additions);
      window.sessionStorage.setItem(getAccountMutationConflictKey(userId), JSON.stringify(conflicts));
    }
    return true;
  } catch {
    return false;
  }
}

function quarantineLegacyCounsellingSessionMutations(
  userId: number,
  queue: QueuedAccountMutation[],
  sessionId: string,
) {
  const legacy = queue.filter((item) =>
    item.mutation.type === "progress.counsellingSession" &&
    item.mutation.value?.id === sessionId,
  );
  if (legacy.length === 0 || !preserveAccountMutationConflicts(userId, legacy)) return null;
  const ids = new Set(legacy.map((item) => item.id));
  return queue.filter((item) => !ids.has(item.id));
}

export function hasPendingAccountMutations(userId?: number | null): boolean {
  const targetId = userId ?? getActiveUserId();
  if (targetId === null || targetId === undefined) return false;
  return loadAccountMutationQueue(targetId).length > 0;
}

function notifySync(message: string | null) {
  window.dispatchEvent(new CustomEvent(ACCOUNT_SYNC_EVENT, { detail: { message } }));
}

function timestampValue(value: string | undefined): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

type CounsellingSessionSnapshot = Exclude<PersonalDataSnapshot["counsellingSession"], null>;

function parseCounsellingSessionSnapshot(value: unknown): CounsellingSessionSnapshot | null {
  const snapshot: unknown = {
    savedItems: [],
    history: [],
    educationStage: null,
    counsellingSession: value,
    discoveryAnswers: null,
  };
  if (!isPersonalDataSnapshot(snapshot) || snapshot.counsellingSession === null) return null;
  return snapshot.counsellingSession;
}

function readCounsellingSessionSnapshot(): CounsellingSessionSnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(COUNSELLING_STORAGE_KEY);
    return raw === null ? null : parseCounsellingSessionSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

function repairQueuedCounsellingOperation(item: QueuedAccountMutation) {
  if (item.mutation.type !== "progress.counsellingOperation") return item;
  const session = item.mutation.operation.session;
  const referencedIds = [
    ...session.askedQuestionIds,
    ...session.skippedQuestionIds,
    ...session.answers.map((answer) => answer.questionId),
  ];
  if (referencedIds.every((id) => session.questionPath.includes(id))) return item;
  const questionPath = [...new Set([...referencedIds, ...session.questionPath])];
  const currentQuestionId = session.currentQuestionId ??
    session.questionPath[session.pathIndex] ??
    questionPath.at(-1) ??
    null;
  return {
    ...item,
    mutation: {
      ...item.mutation,
      operation: {
        ...item.mutation.operation,
        session: {
          ...session,
          questionPath,
          pathIndex: currentQuestionId ? questionPath.indexOf(currentQuestionId) : questionPath.length - 1,
          currentQuestionId,
        },
      },
    },
  } as QueuedAccountMutation;
}

function sameCounsellingSessionState(
  left: CounsellingSessionSnapshot,
  right: CounsellingSessionSnapshot,
) {
  return (
    left.version === right.version &&
    left.questionBankVersion === right.questionBankVersion &&
    left.id === right.id &&
    left.status === right.status &&
    left.completionReason === right.completionReason &&
    left.currentQuestionId === right.currentQuestionId &&
    left.pathIndex === right.pathIndex &&
    left.updatedAt === right.updatedAt &&
    JSON.stringify(left.questionPath) === JSON.stringify(right.questionPath) &&
    JSON.stringify(left.askedQuestionIds) === JSON.stringify(right.askedQuestionIds) &&
    JSON.stringify(left.skippedQuestionIds) === JSON.stringify(right.skippedQuestionIds) &&
    JSON.stringify(left.answers) === JSON.stringify(right.answers)
  );
}

function isEmptyInitialCounsellingSession(session: CounsellingSessionSnapshot) {
  return (
    session.status === "active" &&
    session.currentQuestionId === "Q001" &&
    session.pathIndex === 0 &&
    session.questionPath.length === 1 &&
    session.questionPath[0] === "Q001" &&
    session.askedQuestionIds.length === 1 &&
    session.askedQuestionIds[0] === "Q001" &&
    session.skippedQuestionIds.length === 0 &&
    session.answers.length === 0
  );
}

function isObsoleteInitialCounsellingMutation(
  item: QueuedAccountMutation,
  sessionId: string,
) {
  if (
    item.mutation.type !== "progress.counsellingSession" ||
    item.mutation.value?.id !== sessionId
  ) return false;
  const session = parseCounsellingSessionSnapshot(item.mutation.value);
  return session !== null && isEmptyInitialCounsellingSession(session);
}

function coalesceObsoleteCompletedCounsellingMutations(
  queue: QueuedAccountMutation[],
  authoritativeSession: CounsellingSessionSnapshot,
): QueuedAccountMutation[] | null {
  const serverTimestamp = timestampValue(authoritativeSession.updatedAt);
  const groups = new Map<
    string,
    Array<{ item: QueuedAccountMutation; session: CounsellingSessionSnapshot }>
  >();

  for (const item of queue) {
    if (item.mutation.type !== "progress.counsellingSession") continue;
    if (!item.mutation.value) return null;
    if (item.mutation.value.id === authoritativeSession.id) continue;

    const session = parseCounsellingSessionSnapshot(item.mutation.value);
    if (!session) return null;
    const group = groups.get(session.id) ?? [];
    group.push({ item, session });
    groups.set(session.id, group);
  }

  if (groups.size === 0) return null;

  const finalMutationIds = new Set<string>();
  for (const group of groups.values()) {
    let previousTimestamp = 0;
    for (const { session } of group) {
      const timestamp = timestampValue(session.updatedAt);
      if (timestamp < previousTimestamp) return null;
      previousTimestamp = timestamp;
    }

    const final = group[group.length - 1];
    const finalTimestamp = timestampValue(final.session.updatedAt);
    if (
      final.session.status !== "completed" ||
      finalTimestamp >= serverTimestamp ||
      final.session.answers.some((answer) => {
        const answerTime = timestampValue(answer.editedAt ?? answer.createdAt);
        return answerTime === 0 || answerTime > finalTimestamp;
      })
    ) return null;
    finalMutationIds.add(final.item.id);
  }

  const reconciled = queue
    .filter((item) => {
      if (item.mutation.type !== "progress.counsellingSession") return true;
      if (!item.mutation.value) return false;
      return item.mutation.value.id === authoritativeSession.id ||
        finalMutationIds.has(item.id);
    })
    .map((item) =>
      finalMutationIds.has(item.id)
        ? { ...item, conflictCount: Math.max(item.conflictCount ?? 0, 1) }
        : item,
    );

  return reconciled.length !== queue.length ||
    reconciled.some((item, index) =>
      item.id !== queue[index]?.id ||
      item.conflictCount !== queue[index]?.conflictCount,
    )
    ? reconciled
    : null;
}

function answerTimestamp(answer: Record<string, unknown>): number {
  return timestampValue(
    typeof answer.editedAt === "string"
      ? answer.editedAt
      : typeof answer.createdAt === "string"
        ? answer.createdAt
        : undefined,
  );
}

function hasNewerCounsellingAnswer(
  local: Record<string, unknown>,
  server: Record<string, unknown>,
): boolean {
  const localAnswers = Array.isArray(local.answers) ? local.answers : [];
  const serverAnswers = Array.isArray(server.answers) ? server.answers : [];
  const serverUpdatedAt = timestampValue(
    typeof server.updatedAt === "string" ? server.updatedAt : undefined,
  );
  return localAnswers.some((localAnswer) => {
    if (!isRecord(localAnswer) || typeof localAnswer.questionId !== "string") return false;
    const serverAnswer = serverAnswers.find((answer) =>
      isRecord(answer) && answer.questionId === localAnswer.questionId,
    );
    return isRecord(serverAnswer)
      ? answerTimestamp(localAnswer) > answerTimestamp(serverAnswer)
      : answerTimestamp(localAnswer) > serverUpdatedAt;
  });
}

function mergeCounsellingConflictSnapshot(
  local: Record<string, unknown>,
  server: Record<string, unknown>,
): Record<string, unknown> {
  const localUpdatedAt =
    typeof local.updatedAt === "string" ? local.updatedAt : "";
  const serverUpdatedAt =
    typeof server.updatedAt === "string" ? server.updatedAt : "";

  if (timestampValue(serverUpdatedAt) > timestampValue(localUpdatedAt)) {
    const localAnswers = Array.isArray(local.answers) ? local.answers : [];
    const serverAnswers = Array.isArray(server.answers) ? server.answers : [];
    const mergedAnswers = [...serverAnswers];
    for (const localAnswer of localAnswers) {
      if (!isRecord(localAnswer) || typeof localAnswer.questionId !== "string") continue;
      const serverIndex = mergedAnswers.findIndex((answer) =>
        isRecord(answer) && answer.questionId === localAnswer.questionId,
      );
      if (serverIndex === -1) {
        if (answerTimestamp(localAnswer) >= timestampValue(serverUpdatedAt)) {
          mergedAnswers.push(localAnswer);
        }
      } else {
        const serverAnswer = mergedAnswers[serverIndex];
        if (isRecord(serverAnswer) && answerTimestamp(localAnswer) >= answerTimestamp(serverAnswer)) {
          mergedAnswers[serverIndex] = localAnswer;
        }
      }
    }
    return {
      ...server,
      answers: mergedAnswers,
      persistedUpdatedAt: server.persistedUpdatedAt,
    };
  }

  const serverAnswers = Array.isArray(server.answers) ? server.answers : [];
  const localAnswers = Array.isArray(local.answers) ? local.answers : [];
  const mergedAnswers = [...localAnswers];
  for (const serverAnswer of serverAnswers) {
    if (!isRecord(serverAnswer) || typeof serverAnswer.questionId !== "string") continue;
    const localIndex = mergedAnswers.findIndex((answer) =>
      isRecord(answer) && answer.questionId === serverAnswer.questionId,
    );
    if (localIndex === -1) {
      mergedAnswers.push(serverAnswer);
    } else {
      const localAnswer = mergedAnswers[localIndex];
      if (isRecord(localAnswer) && answerTimestamp(serverAnswer) > answerTimestamp(localAnswer)) {
        mergedAnswers[localIndex] = serverAnswer;
      }
    }
  }
  return {
    ...local,
    answers: mergedAnswers,
    persistedUpdatedAt: server.persistedUpdatedAt,
  };
}

function rebaseCounsellingPersistenceState(
  userId: number,
  serverSession: Record<string, unknown>,
  queue: QueuedAccountMutation[],
) {
  const sessionId = serverSession.id;
  const persistedUpdatedAt = serverSession.persistedUpdatedAt;
  const persistedRevision = serverSession.persistedRevision;
  if (
    typeof sessionId !== "string" ||
    typeof persistedUpdatedAt !== "string" ||
    (persistedRevision !== undefined &&
      (typeof persistedRevision !== "number" ||
        !Number.isInteger(persistedRevision) ||
        persistedRevision < 1))
  ) return;

  for (const queuedItem of queue) {
    const mutation = queuedItem.mutation;
    if (
      mutation.type === "progress.counsellingSession" &&
      mutation.value?.id === sessionId
    ) {
      const merged = mergeCounsellingConflictSnapshot(
        mutation.value as unknown as Record<string, unknown>,
        serverSession,
      );
      queuedItem.mutation = {
        ...mutation,
        value: {
          ...merged,
          persistedUpdatedAt,
        } as typeof mutation.value,
      };
    } else if (
      mutation.type === "progress.counsellingOperation" &&
      mutation.operation.session.id === sessionId
    ) {
      const merged = mergeCounsellingConflictSnapshot(
        mutation.operation.session as unknown as Record<string, unknown>,
        serverSession,
      );
      queuedItem.mutation = {
        ...mutation,
        operation: {
          ...mutation.operation,
          baseRevision: typeof persistedRevision === "number"
            ? persistedRevision
            : mutation.operation.baseRevision,
          session: {
            ...merged,
            persistedUpdatedAt,
            ...(typeof persistedRevision === "number" ? { persistedRevision } : {}),
          } as typeof mutation.operation.session,
        },
      };
    }
  }

  if (getActiveUserId() !== userId) return;
  try {
    const raw = window.sessionStorage.getItem(COUNSELLING_STORAGE_KEY);
    if (!raw) return;
    const session: unknown = JSON.parse(raw);
    if (isRecord(session) && session.id === sessionId) {
      const merged =
        timestampValue(typeof session.updatedAt === "string" ? session.updatedAt : undefined) >=
          timestampValue(typeof serverSession.updatedAt === "string" ? serverSession.updatedAt : undefined) ||
        hasNewerCounsellingAnswer(session, serverSession)
        ? mergeCounsellingConflictSnapshot(session, serverSession)
        : serverSession;
      window.sessionStorage.setItem(
        COUNSELLING_STORAGE_KEY,
        JSON.stringify({
          ...merged,
          persistedUpdatedAt,
          ...(typeof persistedRevision === "number" ? { persistedRevision } : {}),
        }),
      );
      window.dispatchEvent(new Event(PERSONAL_DATA_READY_EVENT));
    }
  } catch {
    notifySync("Guided Explorer was saved, but its local sync state could not be updated.");
  }
}

export function enqueueAccountMutation(mutation: PersonalDataMutation) {
  if (!isAccountMode()) return;
  const userId = getActiveUserId();
  if (userId === null) return;

  const queue = loadAccountMutationQueue(userId);
  const queuedItem: QueuedAccountMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    mutation,
    createdAt: Date.now(),
  };
  queue.push(queuedItem);
  saveAccountMutationQueue(userId, queue);
  void flushAccountMutations(userId);
}

export function flushAccountMutations(targetUserId?: number): Promise<boolean> {
  if (!isAccountMode()) return Promise.resolve(false);
  const currentUserId = getActiveUserId();
  if (currentUserId === null) return Promise.resolve(false);

  if (targetUserId !== undefined && targetUserId !== currentUserId) {
    return Promise.resolve(false);
  }

  const userId = currentUserId;
  if (flushPromise && activeFlushUserId === userId) {
    return flushPromise;
  }

  activeFlushUserId = userId;
  flushPromise = (async () => {
    let preservedConflict = false;
    while (true) {
      if (targetUserId === undefined && !isAccountMode()) {
        return false;
      }
      const queue = loadAccountMutationQueue(userId);
      if (queue.length === 0) break;

      const item = repairQueuedCounsellingOperation(queue[0]);
      if (item !== queue[0]) {
        queue[0] = item;
        saveAccountMutationQueue(userId, queue);
      }
      if (item.userId !== userId) {
        queue.shift();
        saveAccountMutationQueue(userId, queue);
        continue;
      }

      let response: Response;
      try {
        response = await fetch("/api/account/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...item.mutation,
            expectedUserId: item.userId,
          }),
        });
      } catch {
        notifySync("We couldn't sync your latest account change. Your tab still has it; retry to save it to your account.");
        return false;
      }

      if (getActiveUserId() !== userId || !isAccountMode()) {
        if (response.ok) {
          const currentQueue = loadAccountMutationQueue(userId);
          if (currentQueue.length > 0 && currentQueue[0].id === item.id) {
            currentQueue.shift();
            saveAccountMutationQueue(userId, currentQueue);
          }
        }
        return response.ok;
      }

      if (!response.ok) {
        let message = "We couldn't sync your latest account change. Your tab still has it; retry to save it to your account.";
        let authoritativeData: unknown;
        let conflict: unknown;
        try {
          const result = (await response.json()) as { error?: string; data?: unknown; conflict?: unknown };
          if (result.error) message = result.error;
          authoritativeData = result.data;
          conflict = result.conflict;
        } catch {
          // Keep default
        }

        if (
          item.mutation.type === "progress.counsellingOperation" &&
          response.status === 409 &&
          isRecord(conflict) &&
          conflict.type === "guided-explorer" &&
          conflict.operationId === item.mutation.operation.operationId
        ) {
          const currentQueue = loadAccountMutationQueue(userId);
          if (currentQueue[0]?.id === item.id) {
            if (!preserveAccountMutationConflicts(userId, [item])) {
              notifySync("Guided Explorer changed in another tab, but this tab could not preserve the conflict for review.");
              return false;
            }
            currentQueue.shift();
            saveAccountMutationQueue(userId, currentQueue);
          }
          preservedConflict = true;
          notifySync("Guided Explorer changed in another tab. This progress was kept for review and no longer blocks other saves.");
          continue;
        }

        if (
          item.mutation.type === "progress.counsellingSession" &&
          item.mutation.value &&
          isRecord(authoritativeData)
        ) {
          const serverSession = authoritativeData.counsellingSession;
          const localSession = item.mutation.value;
          if (
            isRecord(serverSession) &&
            typeof serverSession.id === "string" &&
            typeof serverSession.persistedUpdatedAt === "string"
          ) {
            if (serverSession.id !== localSession.id) {
              const authoritativeSession = parseCounsellingSessionSnapshot(serverSession);
              const currentSession = readCounsellingSessionSnapshot();
              const currentQueue = loadAccountMutationQueue(userId);
              if ((item.conflictCount ?? 0) >= 1) {
                notifySync("Guided Explorer changed again while syncing. Refresh it before retrying.");
                return false;
              }
              if (
                authoritativeSession &&
                currentQueue[0]?.id === item.id &&
                currentSession?.id === authoritativeSession.id &&
                sameCounsellingSessionState(currentSession, authoritativeSession) &&
                (authoritativeSession.status === "active" ||
                  authoritativeSession.status === "paused")
              ) {
                const reconciledQueue = coalesceObsoleteCompletedCounsellingMutations(
                  currentQueue,
                  authoritativeSession,
                );
                if (reconciledQueue) {
                  saveAccountMutationQueue(userId, reconciledQueue);
                  continue;
                }
              }
              if (
                authoritativeSession &&
                currentQueue[0]?.id === item.id &&
                currentSession?.id === authoritativeSession.id &&
                isEmptyInitialCounsellingSession(localSession) &&
                sameCounsellingSessionState(currentSession, authoritativeSession)
              ) {
                const reconciledQueue = currentQueue.filter(
                  (queuedItem) =>
                    !isObsoleteInitialCounsellingMutation(queuedItem, localSession.id),
                );
                if (reconciledQueue.length < currentQueue.length) {
                  saveAccountMutationQueue(userId, reconciledQueue);
                  continue;
                }
              }

              const canRebaseLocalSession =
                authoritativeSession !== null &&
                currentQueue[0]?.id === item.id &&
                currentSession?.id === authoritativeSession.id &&
                isEmptyInitialCounsellingSession(localSession) &&
                (
                  timestampValue(currentSession.updatedAt) >=
                    timestampValue(authoritativeSession.updatedAt) ||
                  hasNewerCounsellingAnswer(
                    currentSession as unknown as Record<string, unknown>,
                    authoritativeSession as unknown as Record<string, unknown>,
                  )
                );
              if (canRebaseLocalSession && (item.conflictCount ?? 0) < 1) {
                const rebased = parseCounsellingSessionSnapshot({
                  ...mergeCounsellingConflictSnapshot(
                    currentSession as unknown as Record<string, unknown>,
                    authoritativeSession as unknown as Record<string, unknown>,
                  ),
                  persistedUpdatedAt: authoritativeSession.persistedUpdatedAt,
                });
                if (rebased) {
                  const reconciledQueue = currentQueue.filter(
                    (queuedItem) =>
                      queuedItem.id === item.id ||
                      !isObsoleteInitialCounsellingMutation(queuedItem, localSession.id),
                  );
                  const rebasedHead = reconciledQueue.find(
                    (queuedItem) => queuedItem.id === item.id,
                  );
                  if (
                    rebasedHead?.mutation.type === "progress.counsellingSession" &&
                    rebasedHead.mutation.value
                  ) {
                    rebasedHead.mutation = {
                      ...rebasedHead.mutation,
                      value: rebased,
                    };
                    rebasedHead.conflictCount = 1;
                    saveAccountMutationQueue(userId, reconciledQueue);
                    if (getActiveUserId() === userId && isAccountMode()) {
                      window.sessionStorage.setItem(
                        COUNSELLING_STORAGE_KEY,
                        JSON.stringify(rebased),
                      );
                      window.dispatchEvent(new Event(PERSONAL_DATA_READY_EVENT));
                    }
                    continue;
                  }
                }
              }

              const reconciledQueue = quarantineLegacyCounsellingSessionMutations(
                userId,
                currentQueue,
                localSession.id,
              );
              if (reconciledQueue) {
                saveAccountMutationQueue(userId, reconciledQueue);
                preservedConflict = true;
                notifySync("Guided Explorer legacy progress was kept for review and no longer blocks other saves.");
                continue;
              }
              notifySync(
                "Guided Explorer has a different saved session. Your local progress and queued changes were kept for review.",
              );
              return false;
            }

            if ((item.conflictCount ?? 0) >= 1) {
              notifySync("Guided Explorer changed again while syncing. Refresh it before retrying.");
              return false;
            }

            const currentQueue = loadAccountMutationQueue(userId);
            const head = currentQueue[0];
            if (head?.id === item.id) {
              const storedSession = readCounsellingSessionSnapshot();
              if (storedSession && storedSession.id !== serverSession.id) {
                notifySync(
                  "A different Guided Explorer session is present in this tab. Your local progress and queued changes were kept for review.",
                );
                return false;
              }
              const recoverySession = storedSession ?? localSession;
              const serverTimestamp = timestampValue(
                typeof serverSession.updatedAt === "string" ? serverSession.updatedAt : undefined,
              );
              const localTimestamp = timestampValue(recoverySession.updatedAt);
              const hasNewerLocalAnswer = hasNewerCounsellingAnswer(
                recoverySession as unknown as Record<string, unknown>,
                serverSession,
              );
              const authoritativeSnapshot =
                parseCounsellingSessionSnapshot(serverSession);
              const serverMatchesLocal =
                storedSession !== null &&
                authoritativeSnapshot !== null &&
                sameCounsellingSessionState(
                  storedSession,
                  authoritativeSnapshot,
                );

              if (
                serverMatchesLocal ||
                (serverTimestamp > localTimestamp && !hasNewerLocalAnswer)
              ) {
                currentQueue.shift();
                for (const queuedItem of currentQueue) {
                  if (
                    queuedItem.mutation.type === "progress.counsellingSession" &&
                    queuedItem.mutation.value?.id === serverSession.id
                  ) {
                    const rebased = mergeCounsellingConflictSnapshot(
                      queuedItem.mutation.value as unknown as Record<string, unknown>,
                      serverSession,
                    );
                    queuedItem.mutation = {
                      ...queuedItem.mutation,
                      value: rebased,
                    } as PersonalDataMutation;
                    queuedItem.conflictCount = 0;
                  }
                }
                rebaseCounsellingPersistenceState(userId, serverSession, currentQueue);
                saveAccountMutationQueue(userId, currentQueue);
                notifySync("Guided Explorer loaded the latest saved progress.");
                continue;
              }

              const rebased = mergeCounsellingConflictSnapshot(
                recoverySession as unknown as Record<string, unknown>,
                serverSession,
              );
              head.mutation = {
                ...head.mutation,
                value: rebased,
              } as PersonalDataMutation;
              head.conflictCount = 1;
              saveAccountMutationQueue(userId, currentQueue);
              if (getActiveUserId() === userId && isAccountMode()) {
                window.sessionStorage.setItem(
                  COUNSELLING_STORAGE_KEY,
                  JSON.stringify(rebased),
                );
                window.dispatchEvent(new Event(PERSONAL_DATA_READY_EVENT));
              }
              continue;
            }
          }
        }

        notifySync(message);
        return false;
      }

      let authoritativeCounsellingSession: Record<string, unknown> | undefined;
      if (
        (item.mutation.type === "progress.counsellingSession" && item.mutation.value) ||
        item.mutation.type === "progress.counsellingOperation"
      ) {
        try {
          const result: unknown = await response.json();
          const data = isRecord(result) ? result.data : null;
          const session = isRecord(data) ? data.counsellingSession : null;
          if (
            !isRecord(session) ||
            session.id !== (item.mutation.type === "progress.counsellingOperation"
              ? item.mutation.operation.session.id
              : item.mutation.value?.id) ||
              typeof session.persistedUpdatedAt !== "string" ||
              (item.mutation.type === "progress.counsellingOperation" &&
                (typeof session.persistedRevision !== "number" || session.persistedRevision < 1)) ||
              typeof session.updatedAt !== "string" ||
              !Array.isArray(session.answers) ||
              !Array.isArray(session.questionPath)
          ) {
            notifySync("Guided Explorer was saved, but its sync version could not be confirmed.");
            return false;
          }
          authoritativeCounsellingSession = session;
        } catch {
          notifySync("Guided Explorer was saved, but its sync version could not be confirmed.");
          return false;
        }
      }

      const currentQueue = loadAccountMutationQueue(userId);
      if (currentQueue.length > 0 && currentQueue[0].id === item.id) {
        currentQueue.shift();
      }
      if (authoritativeCounsellingSession) {
        rebaseCounsellingPersistenceState(
          userId,
          authoritativeCounsellingSession,
          currentQueue,
        );
      }
      saveAccountMutationQueue(userId, currentQueue);
    }

    if (!preservedConflict) notifySync(null);
    return true;
  })().finally(() => {
    activeFlushUserId = null;
    flushPromise = null;
  });

  return flushPromise;
}

export function setPendingSave(item: Omit<SavedItem, "savedAt">, returnPath: string) {
  window.sessionStorage.setItem(
    PENDING_SAVE_KEY,
    JSON.stringify({ item: { ...item, savedAt: Date.now() }, returnPath, createdAt: Date.now() }),
  );
}

export function readPendingSave() {
  try {
    const raw = window.sessionStorage.getItem(PENDING_SAVE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      !isSavedItem(value.item) ||
      !isPersonalDataSnapshot({
        savedItems: [value.item],
        history: [],
        educationStage: null,
        counsellingSession: null,
        discoveryAnswers: null,
      }) ||
      typeof value.returnPath !== "string" ||
      !value.returnPath.startsWith("/") ||
      value.returnPath.startsWith("//") ||
      typeof value.createdAt !== "number" ||
      Date.now() - value.createdAt > 30 * 60 * 1000
    ) {
      window.sessionStorage.removeItem(PENDING_SAVE_KEY);
      return null;
    }
    return {
      item: value.item,
      returnPath: value.returnPath,
    };
  } catch {
    return null;
  }
}

export function clearPendingSave() {
  window.sessionStorage.removeItem(PENDING_SAVE_KEY);
}
