import { useSyncExternalStore } from "react";

export const activityOptions = [
  {
    id: "fixing",
    label: "Fixing or building things",
    description: "Repairing or making useful things",
    areaId: "technology",
  },
  {
    id: "helping",
    label: "Helping or caring for people",
    description: "Caregiving, health support, or first aid",
    areaId: "health",
  },
  {
    id: "outdoors",
    label: "Being outdoors with plants or animals",
    description: "Plants, animals, nature, fieldwork",
    areaId: "nature",
  },
  {
    id: "computers",
    label: "Using computers or phones",
    description: "Exploring apps, devices, or the internet",
    areaId: "technology",
  },
  {
    id: "organising",
    label: "Organising activities or plans",
    description: "Planning events, schedules, or group tasks",
    areaId: "business",
  },
  {
    id: "creative",
    label: "Drawing, designing, or making things",
    description: "Art, crafts, design, or creative projects",
    areaId: "creative",
  },
  {
    id: "numbers",
    label: "Working with numbers or information",
    description: "Calculations, accounts, or organizing data",
    areaId: "finance",
  },
  {
    id: "teaching",
    label: "Teaching or explaining things",
    description: "Helping someone understand a topic",
    areaId: "education",
  },
] as const;

export type ActivityId = (typeof activityOptions)[number]["id"];
export type ClassContext = "class-10" | "class-12" | "general";
export type AreaId = (typeof areas)[number]["id"];

export type DiscoveryAnswers = {
  activityIds: ActivityId[];
  notSure: boolean;
  classContext: ClassContext | null;
};

export const areas = [
  {
    id: "technology",
    name: "Technology & Computing",
    description: "Computers, devices, digital tools, and technical work.",
  },
  {
    id: "health",
    name: "Health & Care",
    description: "Health, care, and supporting people's wellbeing.",
  },
  {
    id: "nature",
    name: "Nature & Fieldwork",
    description: "Plants, animals, the environment, and outdoor work.",
  },
  {
    id: "business",
    name: "Business & Office",
    description: "Planning, organising, business, and office work.",
  },
  {
    id: "creative",
    name: "Creative & Design",
    description: "Making, visual ideas, design, and creative work.",
  },
  {
    id: "finance",
    name: "Finance & Data",
    description: "Numbers, accounts, information, and data.",
  },
  {
    id: "education",
    name: "Education & Social",
    description: "Teaching, learning, and supporting communities.",
  },
] as const;

export const DISCOVERY_STORAGE_KEY = "careerbridge:type-1-discovery:v1";
const DISCOVERY_CHANGE_EVENT = "careerbridge-discovery-change";
const LOADING_SNAPSHOT = "\u0000loading";
const UNAVAILABLE_SNAPSHOT = "\u0000unavailable";
let guidedExplorerDraftSeed: DiscoveryAnswers | null = null;

export function createEmptyAnswers(): DiscoveryAnswers {
  return { activityIds: [], notSure: false, classContext: null };
}

export function setGuidedExplorerDraftSeed(answers: DiscoveryAnswers) {
  guidedExplorerDraftSeed = {
    activityIds: [...answers.activityIds],
    notSure: false,
    classContext: answers.classContext,
  };
}

export function takeGuidedExplorerDraftSeed() {
  const seed = guidedExplorerDraftSeed;
  guidedExplorerDraftSeed = null;
  return seed
    ? { ...seed, activityIds: [...seed.activityIds] }
    : null;
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
  return { status: "saved", answers: value } as const;
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

export function getMappedAreas(activityIds: ActivityId[]) {
  const mappedIds = new Set(
    activityIds.map(
      (id) => activityOptions.find((activity) => activity.id === id)?.areaId,
    ),
  );

  return areas.filter((area) => mappedIds.has(area.id));
}

function isDiscoveryAnswers(value: unknown): value is DiscoveryAnswers {
  if (typeof value !== "object" || value === null) return false;

  if (!("activityIds" in value) || !("notSure" in value) || !("classContext" in value)) {
    return false;
  }

  const { activityIds, notSure, classContext } = value;

  if (
    !Array.isArray(activityIds) ||
    activityIds.length > 3 ||
    !activityIds.every(
      (id): id is ActivityId =>
        typeof id === "string" &&
        activityOptions.some((activity) => activity.id === id),
    ) ||
    new Set(activityIds).size !== activityIds.length ||
    typeof notSure !== "boolean" ||
    (notSure && activityIds.length > 0) ||
    !(
      classContext === null ||
      classContext === "class-10" ||
      classContext === "class-12" ||
      classContext === "general"
    )
  ) {
    return false;
  }

  return true;
}
