import { useSyncExternalStore } from "react";
import { enqueueAccountMutation, isPersonalDataReady } from "./account-data-sync";
import { EDUCATION_STAGE_STORAGE_KEY } from "./personal-data-storage-keys";

export type EducationStage = "class-10" | "class-12";

const LEGACY_DISCOVERY_STORAGE_KEY = "careerbridge:type-1-discovery:v1";
const EDUCATION_STAGE_CHANGE_EVENT = "careerbridge-education-stage-change";
const LOADING_SNAPSHOT = "\u0000loading";
const UNAVAILABLE_SNAPSHOT = "\u0000unavailable";
const INVALID_SNAPSHOT = "\u0000invalid";

function isEducationStage(value: unknown): value is EducationStage {
  return value === "class-10" || value === "class-12";
}

function getSnapshot() {
  if (!isPersonalDataReady()) return LOADING_SNAPSHOT;
  try {
    let savedStage = window.sessionStorage.getItem(EDUCATION_STAGE_STORAGE_KEY);
    if (savedStage === null) {
      const legacyStage = window.localStorage.getItem(EDUCATION_STAGE_STORAGE_KEY);
      if (legacyStage !== null && isEducationStage(legacyStage)) {
        window.sessionStorage.setItem(EDUCATION_STAGE_STORAGE_KEY, legacyStage);
        window.localStorage.removeItem(EDUCATION_STAGE_STORAGE_KEY);
        savedStage = legacyStage;
      } else if (legacyStage !== null) {
        return INVALID_SNAPSHOT;
      }
    }
    if (savedStage !== null) {
      return isEducationStage(savedStage) ? savedStage : INVALID_SNAPSHOT;
    }

    try {
      const legacyAnswers = window.sessionStorage.getItem(LEGACY_DISCOVERY_STORAGE_KEY);
      if (legacyAnswers) {
        const legacyData: unknown = JSON.parse(legacyAnswers);
        if (
          typeof legacyData === "object" &&
          legacyData !== null &&
          "classContext" in legacyData &&
          isEducationStage(legacyData.classContext)
        ) {
          window.sessionStorage.setItem(
            EDUCATION_STAGE_STORAGE_KEY,
            legacyData.classContext,
          );
          return legacyData.classContext;
        }
      }
    } catch {
      // Older activity choices can be ignored if they cannot be migrated.
    }

    return "";
  } catch {
    return UNAVAILABLE_SNAPSHOT;
  }
}

function getServerSnapshot() {
  return LOADING_SNAPSHOT;
}

function subscribe(callback: () => void) {
  window.addEventListener(EDUCATION_STAGE_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  window.addEventListener("careerbridge-personal-data-ready", callback);
  return () => {
    window.removeEventListener(EDUCATION_STAGE_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener("careerbridge-personal-data-ready", callback);
  };
}

export function useEducationStage() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (snapshot === LOADING_SNAPSHOT) return { status: "loading" } as const;
  if (snapshot === UNAVAILABLE_SNAPSHOT) return { status: "unavailable" } as const;
  if (snapshot === INVALID_SNAPSHOT) return { status: "invalid" } as const;
  if (snapshot === "") return { status: "empty" } as const;
  return { status: "saved", stage: snapshot as EducationStage } as const;
}

export function saveEducationStage(stage: EducationStage) {
  if (!isPersonalDataReady()) return false;
  try {
    window.sessionStorage.setItem(EDUCATION_STAGE_STORAGE_KEY, stage);
    window.dispatchEvent(new Event(EDUCATION_STAGE_CHANGE_EVENT));
    enqueueAccountMutation({ type: "progress.educationStage", value: stage });
    return true;
  } catch {
    return false;
  }
}
