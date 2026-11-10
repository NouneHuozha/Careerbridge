import { useSyncExternalStore } from "react";

export const activityOptions = [
  {
    id: "fixing",
    label: "Fixing or building things",
    description: "Repairing or making useful things",
  },
  {
    id: "helping",
    label: "Helping or caring for people",
    description: "Supporting, caring or helping others",
  },
  {
    id: "outdoors",
    label: "Being outdoors with plants or animals",
    description: "Plants, animals or nature",
  },
  {
    id: "computers",
    label: "Using computers or phones",
    description: "Apps, devices or the internet",
  },
  {
    id: "organising",
    label: "Organising activities or plans",
    description: "Planning events or group tasks",
  },
  {
    id: "creative",
    label: "Drawing, designing or making things",
    description: "Art, crafts or creative projects",
  },
  {
    id: "numbers",
    label: "Working with numbers or information",
    description: "Calculations or organising information",
  },
  {
    id: "teaching",
    label: "Teaching or explaining things",
    description: "Helping someone understand something",
  },
  {
    id: "talking",
    label: "Talking with people and sharing ideas",
    description: "Sharing ideas and talking with others",
  },
  {
    id: "problem-solving",
    label: "Solving problems and figuring things out",
    description: "Thinking through challenges",
  },
] as const;

export type ActivityId = (typeof activityOptions)[number]["id"];

export type DiscoveryAnswers = {
  activityIds: ActivityId[];
};

export const DISCOVERY_STORAGE_KEY = "careerbridge:type-1-discovery:v1";
const DISCOVERY_CHANGE_EVENT = "careerbridge-discovery-change";
const LOADING_SNAPSHOT = "\u0000loading";
const UNAVAILABLE_SNAPSHOT = "\u0000unavailable";

export function createEmptyAnswers(): DiscoveryAnswers {
  return { activityIds: [] };
}

function getSnapshot() {
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
  return () => window.removeEventListener(DISCOVERY_CHANGE_EVENT, callback);
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
  try {
    window.sessionStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(answers));
    window.dispatchEvent(new Event(DISCOVERY_CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearAnswers() {
  try {
    window.sessionStorage.removeItem(DISCOVERY_STORAGE_KEY);
    window.dispatchEvent(new Event(DISCOVERY_CHANGE_EVENT));
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
