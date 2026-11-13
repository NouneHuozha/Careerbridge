import { allCounsellingQuestions, allowsMultipleCounsellingSelections } from "./counselling/counselling-data";
import { activityOptions } from "./discover/activity-options";
import type { ExplorationHistoryItem } from "./explore/exploration-history";
import type { SavedItem } from "./explore/saved-items";
import type {
  PersonalDataMutation,
  PersonalDataSnapshot,
} from "./personal-data-types";

const savedTypes = new Set([
  "field",
  "course",
  "institution",
  "institution-offering",
  "pathway",
  "examination",
  "scholarship",
]);
const questionById = new Map(allCounsellingQuestions.map((question) => [question.id, question]));
const activityIds: ReadonlySet<string> = new Set(activityOptions.map(({ id }) => id));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length <= maximum;
}

function isContext(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([key, item]) =>
    ["courseId", "courseName", "fieldId", "stage"].includes(key) &&
    isString(item, 200),
  );
}

export function isSavedItem(value: unknown): value is SavedItem {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    savedTypes.has(value.type) &&
    isString(value.id, 200) &&
    value.id.length > 0 &&
    typeof value.savedAt === "number" &&
    Number.isFinite(value.savedAt) &&
    isContext(value.context)
  );
}

function isHistoryItem(value: unknown): value is ExplorationHistoryItem {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    savedTypes.has(value.type) &&
    isString(value.id, 200) &&
    value.id.length > 0 &&
    typeof value.lastVisitedAt === "number" &&
    Number.isFinite(value.lastVisitedAt) &&
    Number.isInteger(value.visitCount) &&
    (value.visitCount as number) >= 1 &&
    isContext(value.context)
  );
}

function isCounsellingAnswer(value: unknown) {
  if (!isRecord(value)) return false;
  const question =
    typeof value.questionId === "string" ? questionById.get(value.questionId) : undefined;
  return (
    isString(value.id, 200) &&
    question !== undefined &&
    Array.isArray(value.optionIds) &&
    value.optionIds.length <= 20 &&
    value.optionIds.every(
      (id) => typeof id === "string" && question.options?.some((option) => option.id === id),
    ) &&
    (allowsMultipleCounsellingSelections(question) || value.optionIds.length <= 1) &&
    isString(value.originalText, 100_000) &&
    ["clear", "probable", "ambiguous", "unrecognised"].includes(
      String(value.interpretationStatus),
    ) &&
    ["answered", "unsure", "none", "skip"].includes(String(value.responseState)) &&
    isString(value.createdAt, 100) &&
    (value.editedAt === undefined || isString(value.editedAt, 100)) &&
    (value.contextOptionId === undefined || isString(value.contextOptionId, 200))
  );
}

function isCounsellingSession(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    value.questionBankVersion === 1 &&
    isString(value.id, 200) &&
    ["active", "paused", "completed"].includes(String(value.status)) &&
    (value.completionReason === undefined ||
      (value.completionReason === "finished_early" && value.status === "completed")) &&
    (value.currentQuestionId === null ||
      (typeof value.currentQuestionId === "string" && questionById.has(value.currentQuestionId))) &&
    Array.isArray(value.questionPath) &&
    value.questionPath.length > 0 &&
    value.questionPath.length <= 100 &&
    value.questionPath.every((id) => typeof id === "string" && questionById.has(id)) &&
    Number.isInteger(value.pathIndex) &&
    (value.pathIndex as number) >= 0 &&
    (value.pathIndex as number) < value.questionPath.length &&
    (value.currentQuestionId === null ||
      value.currentQuestionId === value.questionPath[value.pathIndex as number]) &&
    Array.isArray(value.askedQuestionIds) &&
    value.askedQuestionIds.length <= 100 &&
    value.askedQuestionIds.every((id) => typeof id === "string" && questionById.has(id)) &&
    Array.isArray(value.skippedQuestionIds) &&
    value.skippedQuestionIds.length <= 100 &&
    value.skippedQuestionIds.every((id) => typeof id === "string" && questionById.has(id)) &&
    Array.isArray(value.answers) &&
    value.answers.length <= 100 &&
    value.answers.every(isCounsellingAnswer) &&
    isString(value.updatedAt, 100)
  );
}

function isDiscoveryAnswers(value: unknown) {
  return (
    isRecord(value) &&
    Array.isArray(value.activityIds) &&
    value.activityIds.length <= 3 &&
    value.activityIds.every((id) => typeof id === "string" && activityIds.has(id)) &&
    new Set(value.activityIds).size === value.activityIds.length
  );
}

export function isPersonalDataSnapshot(value: unknown): value is PersonalDataSnapshot {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.savedItems) &&
    value.savedItems.length <= 10_000 &&
    value.savedItems.every(isSavedItem) &&
    Array.isArray(value.history) &&
    value.history.length <= 10_000 &&
    value.history.every(isHistoryItem) &&
    (value.educationStage === null ||
      value.educationStage === "class-10" ||
      value.educationStage === "class-12") &&
    (value.counsellingSession === null || isCounsellingSession(value.counsellingSession)) &&
    (value.discoveryAnswers === null || isDiscoveryAnswers(value.discoveryAnswers))
  );
}

export function isPersonalDataMutation(value: unknown): value is PersonalDataMutation {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  switch (value.type) {
    case "saved.add":
      return isSavedItem(value.item);
    case "saved.remove":
      return (
        isRecord(value.item) &&
        typeof value.item.type === "string" &&
        savedTypes.has(value.item.type) &&
        isString(value.item.id, 200) &&
        value.item.id.length > 0 &&
        isContext(value.item.context)
      );
    case "history.record":
      return (
        isRecord(value.item) &&
        typeof value.item.type === "string" &&
        savedTypes.has(value.item.type) &&
        isString(value.item.id, 200) &&
        value.item.id.length > 0 &&
        typeof value.item.lastVisitedAt === "number" &&
        Number.isFinite(value.item.lastVisitedAt) &&
        isContext(value.item.context)
      );
    case "history.remove":
      return (
        isRecord(value.item) &&
        typeof value.item.type === "string" &&
        savedTypes.has(value.item.type) &&
        isString(value.item.id, 200) &&
        value.item.id.length > 0 &&
        isContext(value.item.context)
      );
    case "history.restore":
      return isHistoryItem(value.item);
    case "history.clear":
      return true;
    case "progress.educationStage":
      return value.value === null || value.value === "class-10" || value.value === "class-12";
    case "progress.counsellingSession":
      return value.value === null || isCounsellingSession(value.value);
    case "progress.discoveryAnswers":
      return value.value === null || isDiscoveryAnswers(value.value);
    case "migration.keep":
      return isPersonalDataSnapshot(value.data);
    default:
      return false;
  }
}

export function emptyPersonalData(): PersonalDataSnapshot {
  return {
    savedItems: [],
    history: [],
    educationStage: null,
    counsellingSession: null,
    discoveryAnswers: null,
  };
}

export function personalDataHasContent(data: PersonalDataSnapshot) {
  return (
    data.savedItems.length > 0 ||
    data.history.length > 0 ||
    data.educationStage !== null ||
    data.counsellingSession !== null ||
    (data.discoveryAnswers?.activityIds.length ?? 0) > 0
  );
}
