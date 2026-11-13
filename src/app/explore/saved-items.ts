import { useSyncExternalStore } from "react";
import { enqueueAccountMutation, isPersonalDataReady } from "../account-data-sync";
import { SAVED_ITEMS_STORAGE_KEY } from "../personal-data-storage-keys";

export type SavedItemType =
  | "field"
  | "course"
  | "institution"
  | "institution-offering"
  | "pathway"
  | "examination"
  | "scholarship";

export type SavedItemContext = {
  courseId?: string;
  courseName?: string;
  fieldId?: string;
  stage?: string;
};

export type SavedItem = {
  type: SavedItemType;
  id: string;
  context?: SavedItemContext;
  savedAt: number;
};

type Snapshot =
  | { status: "loading" }
  | { status: "unavailable" | "invalid" }
  | { status: "saved"; items: SavedItem[] };

const storageKey = SAVED_ITEMS_STORAGE_KEY;
const changeEvent = "careerbridge-saved-items-change";
const serverSnapshot: Snapshot = { status: "loading" };
let cachedRaw: string | null | undefined;
let cachedSnapshot: Snapshot = serverSnapshot;

function isSavedItemType(value: unknown): value is SavedItemType {
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

function parseItems(raw: string | null): Snapshot {
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

    const items: SavedItem[] = [];
    for (const value of data.items) {
      if (
        typeof value !== "object" ||
        value === null ||
        !("type" in value) ||
        !isSavedItemType(value.type) ||
        !("id" in value) ||
        typeof value.id !== "string" ||
        value.id.length === 0 ||
        value.id.length > 200 ||
        !("savedAt" in value) ||
        typeof value.savedAt !== "number" ||
        !Number.isFinite(value.savedAt) ||
        ("context" in value && !isContext(value.context))
      ) {
        return { status: "invalid" };
      }
      items.push({
        type: value.type,
        id: value.id,
        context: value.context,
        savedAt: value.savedAt,
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
        const migrated = parseItems(legacy);
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
      cachedSnapshot = parseItems(raw);
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

export function useSavedItems() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export function savedItemKey(item: Pick<SavedItem, "type" | "id" | "context">) {
  return item.type === "institution-offering"
    ? `${item.type}:${item.id}:${item.context?.courseId ?? ""}`
    : `${item.type}:${item.id}`;
}

function updateSavedItems(update: (items: SavedItem[]) => SavedItem[]) {
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

export function addSavedItem(item: Omit<SavedItem, "savedAt"> & { savedAt?: number }) {
  const nextItem: SavedItem = { ...item, savedAt: item.savedAt ?? Date.now() };
  const updated = updateSavedItems((items) => {
    const key = savedItemKey(nextItem);
    return items.some((saved) => savedItemKey(saved) === key)
      ? items
      : [...items, nextItem];
  });
  if (updated) enqueueAccountMutation({ type: "saved.add", item: nextItem });
  return updated;
}

export function removeSavedItem(item: Pick<SavedItem, "type" | "id" | "context">) {
  const key = savedItemKey(item);
  const updated = updateSavedItems((items) =>
    items.filter((saved) => savedItemKey(saved) !== key),
  );
  if (updated) enqueueAccountMutation({ type: "saved.remove", item });
  return updated;
}
