import { useSyncExternalStore } from "react";
import { enqueueAccountMutation, isPersonalDataReady } from "../account-data-sync";
import { EXPLORATION_HISTORY_STORAGE_KEY } from "../personal-data-storage-keys";
import type { SavedItemContext, SavedItemType } from "./saved-items";

export type ExplorationHistoryItem = {
  type: SavedItemType;
  id: string;
  context?: SavedItemContext;
  lastVisitedAt: number;
  visitCount: number;
};

type Snapshot =
  | { status: "loading" }
  | { status: "unavailable" | "invalid" }
  | { status: "saved"; items: ExplorationHistoryItem[] };

const storageKey = EXPLORATION_HISTORY_STORAGE_KEY;
const changeEvent = "careerbridge-exploration-history-change";
const serverSnapshot: Snapshot = { status: "loading" };
let cachedRaw: string | null | undefined;
let cachedSnapshot: Snapshot = serverSnapshot;

function isHistoryType(value: unknown): value is SavedItemType {
  return value === "field" ||
    value === "course" ||
    value === "institution" ||
    value === "institution-offering" ||
    value === "pathway" ||
    value === "examination" ||
    value === "scholarship";
}

function isContext(value: unknown): value is SavedItemContext | undefined {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(([key, item]) =>
    ["courseId", "courseName", "fieldId", "stage"].includes(key) &&
    typeof item === "string" &&
    item.length <= 200,
  );
}

function parseHistory(raw: string | null): Snapshot {
  if (raw === null) return { status: "saved", items: [] };
  try {
    const data: unknown = JSON.parse(raw);
    if (
      typeof data !== "object" ||
      data === null ||
      !("version" in data) ||
      data.version !== 1 ||
      !("items" in data) ||
      !Array.isArray(data.items)
    ) {
      return { status: "invalid" };
    }

    const items: ExplorationHistoryItem[] = [];
    for (const value of data.items) {
      if (
        typeof value !== "object" ||
        value === null ||
        !("type" in value) ||
        !isHistoryType(value.type) ||
        !("id" in value) ||
        typeof value.id !== "string" ||
        value.id.length === 0 ||
        value.id.length > 200 ||
        !("lastVisitedAt" in value) ||
        typeof value.lastVisitedAt !== "number" ||
        !Number.isFinite(value.lastVisitedAt) ||
        !("visitCount" in value) ||
        typeof value.visitCount !== "number" ||
        !Number.isInteger(value.visitCount) ||
        value.visitCount < 1 ||
        ("context" in value && !isContext(value.context))
      ) {
        return { status: "invalid" };
      }
      items.push({
        type: value.type,
        id: value.id,
        context: value.context,
        lastVisitedAt: value.lastVisitedAt,
        visitCount: value.visitCount,
      });
    }
    return { status: "saved", items };
  } catch {
    return { status: "invalid" };
  }
}

function getSnapshot(): Snapshot {
  if (!isPersonalDataReady()) return serverSnapshot;
  try {
    let raw = window.sessionStorage.getItem(storageKey);
    if (raw === null) {
      const legacy = window.localStorage.getItem(storageKey);
      if (legacy !== null) {
        const migrated = parseHistory(legacy);
        if (migrated.status === "saved") {
          window.sessionStorage.setItem(storageKey, legacy);
          window.localStorage.removeItem(storageKey);
          raw = legacy;
        } else {
          return migrated;
        }
      }
    }
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedSnapshot = parseHistory(raw);
    }
    return cachedSnapshot;
  } catch {
    cachedRaw = undefined;
    cachedSnapshot = { status: "unavailable" };
    return cachedSnapshot;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(changeEvent, callback);
  window.addEventListener("storage", callback);
  window.addEventListener("careerbridge-personal-data-ready", callback);
  return () => {
    window.removeEventListener(changeEvent, callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener("careerbridge-personal-data-ready", callback);
  };
}

export function useExplorationHistory() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export function explorationHistoryKey(
  item: Pick<ExplorationHistoryItem, "type" | "id" | "context">,
) {
  return item.type === "institution-offering"
    ? `${item.type}:${item.id}:${item.context?.courseId ?? ""}`
    : `${item.type}:${item.id}`;
}

function updateHistory(update: (items: ExplorationHistoryItem[]) => ExplorationHistoryItem[]) {
  const snapshot = getSnapshot();
  if (snapshot.status !== "saved") return false;
  try {
    const items = update(snapshot.items);
    const raw = JSON.stringify({ version: 1, items });
    window.sessionStorage.setItem(storageKey, raw);
    cachedRaw = raw;
    cachedSnapshot = { status: "saved", items };
    window.dispatchEvent(new Event(changeEvent));
    return true;
  } catch {
    cachedRaw = undefined;
    cachedSnapshot = { status: "unavailable" };
    window.dispatchEvent(new Event(changeEvent));
    return false;
  }
}

export function recordHistoryVisit(
  item: Omit<ExplorationHistoryItem, "lastVisitedAt" | "visitCount"> & {
    lastVisitedAt?: number;
  },
) {
  let recorded: ExplorationHistoryItem | undefined;
  const updated = updateHistory((items) => {
    const key = explorationHistoryKey(item);
    const existing = items.find((entry) => explorationHistoryKey(entry) === key);
    const visitedAt = Math.max(
      item.lastVisitedAt ?? Date.now(),
      (existing?.lastVisitedAt ?? 0) + 1,
    );
    const nextItem: ExplorationHistoryItem = {
      ...item,
      lastVisitedAt: visitedAt,
      visitCount: existing ? existing.visitCount + 1 : 1,
    };
    recorded = nextItem;
    return [
      ...items.filter((entry) => explorationHistoryKey(entry) !== key),
      nextItem,
    ];
  });
  if (updated && recorded) {
    enqueueAccountMutation({
      type: "history.record",
      item: { type: recorded.type, id: recorded.id, context: recorded.context, lastVisitedAt: recorded.lastVisitedAt },
    });
  }
  return updated;
}

export function removeHistoryItem(
  item: Pick<ExplorationHistoryItem, "type" | "id" | "context">,
) {
  const key = explorationHistoryKey(item);
  const updated = updateHistory((items) =>
    items.filter((entry) => explorationHistoryKey(entry) !== key),
  );
  if (updated) enqueueAccountMutation({ type: "history.remove", item });
  return updated;
}

export function restoreHistoryItem(item: ExplorationHistoryItem) {
  const key = explorationHistoryKey(item);
  const updated = updateHistory((items) =>
    items.some((entry) => explorationHistoryKey(entry) === key)
      ? items
      : [...items, item],
  );
  if (updated) enqueueAccountMutation({ type: "history.restore", item });
  return updated;
}

export function clearExplorationHistory() {
  const updated = updateHistory(() => []);
  if (updated) enqueueAccountMutation({ type: "history.clear" });
  return updated;
}
