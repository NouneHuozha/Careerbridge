import { useSyncExternalStore } from "react";
import { enqueueAccountMutation, isPersonalDataReady } from "../account-data-sync";
import { DISCOVERY_STORAGE_KEY } from "../personal-data-storage-keys";
import { activityOptions, type ActivityId } from "./activity-options";

export { activityOptions } from "./activity-options";
export type { ActivityId } from "./activity-options";

export type DiscoveryAnswers = {
  activityIds: ActivityId[];
};

export { DISCOVERY_STORAGE_KEY };
const DISCOVERY_CHANGE_EVENT = "careerbridge-discovery-change";
const LOADING_SNAPSHOT = "\u0000loading";
const UNAVAILABLE_SNAPSHOT = "\u0000unavailable";

export function createEmptyAnswers(): DiscoveryAnswers {
  return { activityIds: [] };
}

function getSnapshot() {
  if (!isPersonalDataReady()) return LOADING_SNAPSHOT;
  try {
    return window.sessionStorage.getItem(DISCOVERY_STORAGE_KEY) ?? "";
  } catch {
    return UNAVAILABLE_SNAPSHOT;
  }
}

function getServerSnapshot() {
  return LOADING_SNAPSHOT;
}

function subscribe(callback: () => void) {
  window.addEventListener(DISCOVERY_CHANGE_EVENT, callback);
  window.addEventListener("careerbridge-personal-data-ready", callback);
  return () => {
    window.removeEventListener(DISCOVERY_CHANGE_EVENT, callback);
    window.removeEventListener("careerbridge-personal-data-ready", callback);
  };
}

function parseSnapshot(raw: string) {
  if (raw === LOADING_SNAPSHOT) return { status: "loading" } as const;
  if (raw === UNAVAILABLE_SNAPSHOT) return { status: "unavailable" } as const;
  if (raw === "") return { status: "empty", answers: createEmptyAnswers() } as const;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { status: "invalid" } as const;
  }

  if (!isDiscoveryAnswers(value)) return { status: "invalid" } as const;
  return { status: "saved", answers: { activityIds: value.activityIds } } as const;
}

export function useStoredDiscoveryAnswers() {
  return parseSnapshot(
    useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
  );
}

export function saveAnswers(answers: DiscoveryAnswers) {
  if (!isPersonalDataReady()) return false;
  try {
    window.sessionStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(answers));
    window.dispatchEvent(new Event(DISCOVERY_CHANGE_EVENT));
    enqueueAccountMutation({ type: "progress.discoveryAnswers", value: answers });
    return true;
  } catch {
    return false;
  }
}

export function clearAnswers() {
  if (!isPersonalDataReady()) return false;
  try {
    window.sessionStorage.removeItem(DISCOVERY_STORAGE_KEY);
    window.dispatchEvent(new Event(DISCOVERY_CHANGE_EVENT));
    enqueueAccountMutation({ type: "progress.discoveryAnswers", value: null });
    return true;
  } catch {
    return false;
  }
}

function isDiscoveryAnswers(value: unknown): value is DiscoveryAnswers {
  if (typeof value !== "object" || value === null) return false;

  if (!("activityIds" in value)) {
    return false;
  }

  const { activityIds } = value;

  if (
    !Array.isArray(activityIds) ||
    activityIds.length > 3 ||
    !activityIds.every(
      (id): id is ActivityId =>
        typeof id === "string" &&
        activityOptions.some((activity) => activity.id === id),
    ) ||
    new Set(activityIds).size !== activityIds.length
  ) {
    return false;
  }

  return true;
}
