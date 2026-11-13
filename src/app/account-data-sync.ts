"use client";

import type { SavedItem } from "./explore/saved-items";
import {
  COUNSELLING_STORAGE_KEY,
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
const UNREADABLE_GUEST_BACKUP_KEY = "careerbridge:unreadable-guest-data:v1";
const legacyStorageKeys = [
  SAVED_ITEMS_STORAGE_KEY,
  EXPLORATION_HISTORY_STORAGE_KEY,
  EDUCATION_STAGE_STORAGE_KEY,
  COUNSELLING_STORAGE_KEY,
];

let accountMode: boolean | undefined;
let mutationQueue: PersonalDataMutation[] = [];
let flushPromise: Promise<boolean> | null = null;

export function isPersonalDataReady() {
  return accountMode !== undefined;
}

export function isAccountMode() {
  return accountMode === true;
}

export function setAccountMode(enabled: boolean) {
  accountMode = enabled;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PERSONAL_DATA_READY_EVENT));
  }
}

export function lockPersonalData() {
  accountMode = undefined;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PERSONAL_DATA_READY_EVENT));
  }
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
  if (data.discoveryAnswers) {
    window.sessionStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(data.discoveryAnswers));
  } else {
    window.sessionStorage.removeItem(DISCOVERY_STORAGE_KEY);
  }
  window.sessionStorage.setItem(ACCOUNT_CACHE_MARKER_KEY, JSON.stringify({ userId }));
  if (clearUnreadableBackup) {
    window.sessionStorage.removeItem(UNREADABLE_GUEST_BACKUP_KEY);
  }
  emitPersonalDataChanged();
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
  mutationQueue = [];
  setAccountMode(false);
  window.dispatchEvent(new Event("careerbridge-saved-items-change"));
  window.dispatchEvent(new Event("careerbridge-exploration-history-change"));
  window.dispatchEvent(new Event("careerbridge-education-stage-change"));
  window.dispatchEvent(new Event("careerbridge-counselling-change"));
  window.dispatchEvent(new Event("careerbridge-discovery-change"));
}

function notifySync(message: string | null) {
  window.dispatchEvent(new CustomEvent(ACCOUNT_SYNC_EVENT, { detail: { message } }));
}

export function enqueueAccountMutation(mutation: PersonalDataMutation) {
  if (!isAccountMode()) return;
  mutationQueue.push(mutation);
  void flushAccountMutations();
}

export function flushAccountMutations(): Promise<boolean> {
  if (!isAccountMode()) return Promise.resolve(true);
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    while (mutationQueue.length > 0) {
      const mutation = mutationQueue[0];
      let response: Response;
      try {
        response = await fetch("/api/account/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mutation),
        });
      } catch {
        notifySync("We couldn't sync your latest account change. Your tab still has it; retry to save it to your account.");
        return false;
      }
      if (!response.ok) {
        let message = "We couldn't sync your latest account change. Your tab still has it; retry to save it to your account.";
        try {
          const result = await response.json() as { error?: string };
          if (result.error) message = result.error;
        } catch {
          // Keep the actionable default when the server response isn't readable.
        }
        notifySync(message);
        return false;
      }
      mutationQueue.shift();
    }
    notifySync(null);
    return true;
  })().finally(() => {
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
