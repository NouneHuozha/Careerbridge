"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { removeById, upsertById } from "./collection-logic.mjs";

export const collectionCategories = [
  "Fields",
  "Courses",
  "Institutions",
  "Pathways",
  "Examinations",
  "Scholarships",
] as const;

export type CollectionCategory = (typeof collectionCategories)[number];
export type CollectionScope =
  | "all"
  | "selected"
  | "needing-updates"
  | "discover-new";
export type CollectionFrequency =
  | "Hourly"
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Quarterly"
  | "Custom";

export type CollectionConfig = {
  id: string;
  name: string;
  category: CollectionCategory;
  regions: string[];
  scope: CollectionScope;
  target: string;
  useRegisteredSources: boolean;
  discoverOfficialSources: boolean;
  startingUrls: string[];
  fields: string[];
  discoveryDepth: string;
  includeHtml: boolean;
  includePdf: boolean;
  permittedDocumentsOnly: boolean;
  changeDetection: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CollectionSchedule = {
  id: string;
  configId: string;
  frequency: CollectionFrequency;
  startDate: string;
  time: string;
  timeZone: string;
  endDate: string;
  retryTemporaryFailures: boolean;
  notifyOnChanges: boolean;
  active: boolean;
};

export type CollectionRules = {
  compareExistingData: boolean;
  preserveSourceVersions: boolean;
  requireReview: boolean;
  autoPublishLowRisk: boolean;
  discoveryDepth: number;
  maximumFileSizeMb: number;
  retryLimit: number;
};

type CollectionState = {
  configs: CollectionConfig[];
  schedules: CollectionSchedule[];
  rules: CollectionRules;
  globallyPaused: boolean;
};

type CollectionContextValue = CollectionState & {
  ready: boolean;
  storageError: string;
  saveConfig: (config: CollectionConfig) => void;
  deleteConfig: (id: string) => void;
  saveSchedule: (schedule: CollectionSchedule) => void;
  deleteSchedule: (id: string) => void;
  setGloballyPaused: (paused: boolean) => void;
  saveRules: (rules: CollectionRules) => void;
};

type CollectionSnapshot = CollectionState & {
  ready: boolean;
  storageError: string;
};

const STORAGE_KEY = "careerbridge.admin.automated-collection.v1";

const initialState: CollectionState = {
  configs: [],
  schedules: [],
  rules: {
    compareExistingData: true,
    preserveSourceVersions: true,
    requireReview: true,
    autoPublishLowRisk: false,
    discoveryDepth: 2,
    maximumFileSizeMb: 20,
    retryLimit: 3,
  },
  globallyPaused: false,
};

function isCollectionCategory(value: unknown): value is CollectionCategory {
  return collectionCategories.includes(value as CollectionCategory);
}

function isStoredState(value: unknown): value is CollectionState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<CollectionState>;
  return (
    Array.isArray(state.configs) &&
    state.configs.every((config) =>
      config &&
      typeof config.id === "string" &&
      typeof config.name === "string" &&
      isCollectionCategory(config.category) &&
      Array.isArray(config.regions) &&
      Array.isArray(config.fields) &&
      Array.isArray(config.startingUrls) &&
      typeof config.useRegisteredSources === "boolean" &&
      typeof config.discoverOfficialSources === "boolean",
    ) &&
    Array.isArray(state.schedules) &&
    state.schedules.every((schedule) =>
      schedule &&
      typeof schedule.id === "string" &&
      typeof schedule.configId === "string" &&
      typeof schedule.active === "boolean",
    ) &&
    !!state.rules &&
    typeof state.rules === "object" &&
    typeof state.globallyPaused === "boolean"
  );
}

const initialSnapshot: CollectionSnapshot = {
  ...initialState,
  ready: false,
  storageError: "",
};
let snapshot = initialSnapshot;
let initialized = false;
const listeners = new Set<() => void>();

function publish(next: CollectionSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function initializeStorage() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      publish({ ...initialState, ready: true, storageError: "" });
      return;
    }
    const parsed: unknown = JSON.parse(saved);
    if (!isStoredState(parsed)) {
      publish({
        ...initialState,
        ready: true,
        storageError: "Saved collection settings are invalid. They were not changed.",
      });
      return;
    }
    publish({ ...parsed, ready: true, storageError: "" });
  } catch {
    publish({
      ...initialState,
      ready: true,
      storageError: "Collection settings could not be read from this browser.",
    });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const wasInitialized = initialized;
  initializeStorage();
  if (wasInitialized) listener();
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return initialSnapshot;
}

function updateState(update: (current: CollectionState) => CollectionState) {
  if (!snapshot.ready || snapshot.storageError) return;
  const next = update(snapshot);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    publish({ ...next, ready: true, storageError: "" });
  } catch {
    publish({
      ...snapshot,
      storageError: "Collection settings could not be saved in this browser.",
    });
  }
}

function saveConfig(config: CollectionConfig) {
  updateState((current) => {
    return { ...current, configs: upsertById(current.configs, config) };
  });
}

function deleteConfig(id: string) {
  updateState((current) => ({
    ...current,
    configs: removeById(current.configs, id),
    schedules: current.schedules.filter((schedule) => schedule.configId !== id),
  }));
}

function saveSchedule(schedule: CollectionSchedule) {
  updateState((current) => ({
    ...current,
    schedules: upsertById(current.schedules, schedule),
  }));
}

function deleteSchedule(id: string) {
  updateState((current) => ({
    ...current,
    schedules: removeById(current.schedules, id),
  }));
}

function setGloballyPaused(globallyPaused: boolean) {
  updateState((current) => ({ ...current, globallyPaused }));
}

function saveRules(rules: CollectionRules) {
  updateState((current) => ({ ...current, rules }));
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

export function AutomatedCollectionProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const value = useMemo(
    () => ({
      ...state,
      saveConfig,
      deleteConfig,
      saveSchedule,
      deleteSchedule,
      setGloballyPaused,
      saveRules,
    }),
    [state],
  );

  if (!state.ready) {
    return (
      <div role="status" className="mx-auto max-w-3xl px-6 py-12 text-sm text-[#526b72]">
        Loading saved collection workspace…
      </div>
    );
  }

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useAutomatedCollection() {
  const context = useContext(CollectionContext);
  if (!context) {
    throw new Error("useAutomatedCollection must be used within AutomatedCollectionProvider.");
  }
  return context;
}

export function createCollectionId() {
  return globalThis.crypto?.randomUUID?.() ?? `collection-${Date.now()}`;
}

export function getFieldsForCategory(category: CollectionCategory) {
  const fields: Record<CollectionCategory, string[]> = {
    Fields: ["Description", "Related subjects", "Education areas"],
    Courses: ["Name", "Qualification", "Duration", "Eligibility"],
    Institutions: ["Identity", "Location", "Contact", "Status"],
    Pathways: ["Entry requirements", "Progression", "Qualification"],
    Examinations: ["Authority", "Eligibility", "Dates", "Notifications"],
    Scholarships: ["Provider", "Eligibility", "Benefits", "Deadlines"],
  };
  return fields[category];
}
