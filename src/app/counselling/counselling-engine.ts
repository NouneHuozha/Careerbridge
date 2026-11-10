"use client";

import { useSyncExternalStore } from "react";
import {
  allCounsellingQuestions,
  allowsMultipleCounsellingSelections,
  branchQuestionIds,
  counsellingQuestionById,
  type CounsellingCategory,
  type CounsellingOption,
  type CounsellingQuestion,
  normalizeCounsellingSelection,
  hasExclusiveSelectionConflict,
} from "./counselling-data";

export type CounsellingStatus = "active" | "paused" | "completed";
export type AnswerInterpretation = "clear" | "probable" | "ambiguous" | "unrecognised";
export type AnswerState = "answered" | "unsure" | "none" | "skip";
export type InsightStatus =
  | "student_stated"
  | "student_preference"
  | "experience"
  | "inferred"
  | "needs_clarification"
  | "student_unsure";

export type CounsellingAnswer = {
  id: string;
  questionId: string;
  optionIds: string[];
  originalText: string;
  interpretationStatus: AnswerInterpretation;
  responseState: AnswerState;
  contextOptionId?: string;
  createdAt: string;
  editedAt?: string;
};

export type StudentInsight = {
  id: string;
  category: CounsellingCategory;
  value: string;
  status: InsightStatus;
  sourceQuestionIds: string[];
  sourceAnswerIds: string[];
  writtenResponseId?: string;
  updatedAt: string;
};

export type CounsellingSession = {
  version: 1;
  questionBankVersion: 1;
  id: string;
  status: CounsellingStatus;
  completionReason?: "finished_early";
  currentQuestionId: string | null;
  questionPath: string[];
  pathIndex: number;
  askedQuestionIds: string[];
  skippedQuestionIds: string[];
  answers: CounsellingAnswer[];
  updatedAt: string;
};

export type SessionRead =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "unavailable" }
  | { status: "invalid" }
  | { status: "saved"; session: CounsellingSession };

export type SaveResult =
  | { ok: true; session: CounsellingSession }
  | { ok: false; reason: "unavailable" | "dependent_answers" };

export type NextAction =
  | { action: "follow_up" | "discover"; questionId: string; reasonCode: string }
  | { action: "complete"; reasonCode: string };

export const COUNSELLING_STORAGE_KEY = "careerbridge:user1-counselling:v1";
const CHANGE_EVENT = "careerbridge-counselling-change";
const LOADING_SNAPSHOT = "\u0000loading";
const UNAVAILABLE_SNAPSHOT = "\u0000unavailable";
const questionIds = new Set(allCounsellingQuestions.map(({ id }) => id));

function getSnapshot() {
  try {
    return window.localStorage.getItem(COUNSELLING_STORAGE_KEY) ?? "";
  } catch {
    return UNAVAILABLE_SNAPSHOT;
  }
}

function getServerSnapshot() {
  return LOADING_SNAPSHOT;
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCounsellingAnswer(value: unknown): value is CounsellingAnswer {
  if (!isRecord(value)) return false;
  const question =
    typeof value.questionId === "string"
      ? counsellingQuestionById.get(value.questionId)
      : undefined;
  return (
    typeof value.id === "string" &&
    typeof value.questionId === "string" &&
    question !== undefined &&
    Array.isArray(value.optionIds) &&
    value.optionIds.every(
      (id) => typeof id === "string" && question.options?.some((option) => option.id === id),
    ) &&
    (allowsMultipleCounsellingSelections(question) || value.optionIds.length <= 1) &&
    typeof value.originalText === "string" &&
    (value.interpretationStatus === "clear" ||
      value.interpretationStatus === "probable" ||
      value.interpretationStatus === "ambiguous" ||
      value.interpretationStatus === "unrecognised") &&
    (value.responseState === "answered" ||
      value.responseState === "unsure" ||
      value.responseState === "none" ||
      value.responseState === "skip") &&
    typeof value.createdAt === "string" &&
    (value.editedAt === undefined || typeof value.editedAt === "string") &&
    (value.contextOptionId === undefined || typeof value.contextOptionId === "string")
  );
}

function isCounsellingSession(value: unknown): value is CounsellingSession {
  if (!isRecord(value)) return false;
  return (
    value.version === 1 &&
    value.questionBankVersion === 1 &&
    typeof value.id === "string" &&
    (value.status === "active" || value.status === "paused" || value.status === "completed") &&
    (value.completionReason === undefined ||
      (value.completionReason === "finished_early" && value.status === "completed")) &&
    (value.currentQuestionId === null ||
      (typeof value.currentQuestionId === "string" && questionIds.has(value.currentQuestionId))) &&
    Array.isArray(value.questionPath) &&
    value.questionPath.length > 0 &&
    value.questionPath.every((id) => typeof id === "string" && questionIds.has(id)) &&
    Number.isInteger(value.pathIndex) &&
    (value.pathIndex as number) >= 0 &&
    (value.pathIndex as number) < value.questionPath.length &&
    (value.currentQuestionId === null ||
      value.currentQuestionId === value.questionPath[value.pathIndex as number]) &&
    Array.isArray(value.askedQuestionIds) &&
    value.askedQuestionIds.every((id) => typeof id === "string" && questionIds.has(id)) &&
    Array.isArray(value.skippedQuestionIds) &&
    value.skippedQuestionIds.every((id) => typeof id === "string" && questionIds.has(id)) &&
    Array.isArray(value.answers) &&
    value.answers.every(isCounsellingAnswer) &&
    typeof value.updatedAt === "string"
  );
}

function parseSnapshot(snapshot: string): SessionRead {
  if (snapshot === LOADING_SNAPSHOT) return { status: "loading" };
  if (snapshot === UNAVAILABLE_SNAPSHOT) return { status: "unavailable" };
  if (!snapshot) return { status: "empty" };

  let value: unknown;
  try {
    value = JSON.parse(snapshot);
  } catch {
    return { status: "invalid" };
  }

  return isCounsellingSession(value)
    ? { status: "saved", session: value }
    : { status: "invalid" };
}

export function useCounsellingSession(): SessionRead {
  return parseSnapshot(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot));
}

function persist(session: CounsellingSession): SaveResult {
  try {
    window.localStorage.setItem(COUNSELLING_STORAGE_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return { ok: true, session };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export function removeSavedCounselling():
  | { ok: true }
  | { ok: false; reason: "unavailable" } {
  try {
    window.localStorage.removeItem(COUNSELLING_STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return { ok: true };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export function startOrResumeCounselling(read: SessionRead): SaveResult {
  if (
    read.status === "saved" &&
    (read.session.status === "active" || read.session.status === "paused")
  ) {
    return persist({ ...read.session, status: "active", updatedAt: new Date().toISOString() });
  }

  return startNewCounselling();
}

export function startNewCounselling(): SaveResult {
  const firstQuestion = counsellingQuestionById.get("Q001");
  if (!firstQuestion) return { ok: false, reason: "unavailable" };

  const session: CounsellingSession = {
    version: 1,
    questionBankVersion: 1,
    id: crypto.randomUUID(),
    status: "active",
    currentQuestionId: firstQuestion.id,
    questionPath: [firstQuestion.id],
    pathIndex: 0,
    askedQuestionIds: [firstQuestion.id],
    skippedQuestionIds: [],
    answers: [],
    updatedAt: new Date().toISOString(),
  };
  return persist(session);
}

export function setCounsellingStatus(
  session: CounsellingSession,
  status: CounsellingStatus,
  completionReason?: "finished_early",
): SaveResult {
  return persist({
    ...session,
    status,
    completionReason: status === "completed" ? completionReason : undefined,
    updatedAt: new Date().toISOString(),
  });
}

function lastAnswerFor(session: CounsellingSession, questionId: string) {
  return [...session.answers].reverse().find((answer) => answer.questionId === questionId);
}

function responseStateFor(options: CounsellingOption[]): AnswerState {
  if (options.some((option) => option.kind === "unsure")) return "unsure";
  if (options.some((option) => option.kind === "none")) return "none";
  if (options.some((option) => option.kind === "declined")) return "skip";
  return "answered";
}

function selectedTopics(questionId: string, answer: CounsellingAnswer | undefined) {
  if (!answer || answer.responseState === "unsure") return [];
  const optionTopic: Record<string, string> =
    questionId === "Q001"
      ? {
          "using-computers-or-technology": "technology",
          "drawing-designing-or-making-things": "creative",
          "sports-or-physical-activity": "sports",
          "helping-or-spending-time-with-people": "people",
          "outdoors-or-nature": "nature",
        }
      : questionId === "Q005"
        ? {
            "computers-or-digital-technology": "technology",
            "the-human-body": "science",
            "nature-or-the-natural-world": "nature",
            "people-behaviour-or-communities": "people",
            "people-or-behaviour": "people",
            "business-or-money": "business",
            "design-or-creative-expression": "creative",
            "technology-or-machines": "technology",
            "nature-or-the-world": "nature",
            "design-or-creation": "creative",
          }
        : {};

  return [...new Set(
    answer.optionIds
      .map((optionId) => optionTopic[optionId])
      .filter((topic): topic is string => topic !== undefined),
  )];
}

function hasTopicFollowUp(session: CounsellingSession, topic: string) {
  const ids = branchQuestionIds[topic as keyof typeof branchQuestionIds];
  return ids?.some(
    (id) =>
      session.askedQuestionIds.includes(id) ||
      session.skippedQuestionIds.includes(id),
  ) ?? false;
}

const branchIds: Set<string> = new Set(Object.values(branchQuestionIds).flat());

function hasFollowUpSince(session: CounsellingSession, sourceQuestionId: string) {
  const sourceIndex = session.questionPath.indexOf(sourceQuestionId);
  if (sourceIndex < 0) return false;
  const nextSourceIndex =
    sourceQuestionId === "Q001"
      ? session.questionPath.indexOf("Q005", sourceIndex + 1)
      : -1;
  const endIndex = nextSourceIndex < 0 ? session.questionPath.length : nextSourceIndex;
  return session.questionPath
    .slice(sourceIndex + 1, endIndex)
    .some(
      (questionId) =>
        branchIds.has(questionId) &&
        (session.askedQuestionIds.includes(questionId) ||
          session.skippedQuestionIds.includes(questionId)),
    );
}

function nextTopicFollowUp(
  session: CounsellingSession,
  topics: string[],
  sourceQuestionId: string,
) {
  if (hasFollowUpSince(session, sourceQuestionId)) return null;
  for (const topic of [...topics].sort()) {
    if (hasTopicFollowUp(session, topic)) continue;
    const ids = branchQuestionIds[topic as keyof typeof branchQuestionIds];
    const questionId = ids?.find(
      (id) =>
        counsellingQuestionById.get(id)?.enabled !== false &&
        !session.askedQuestionIds.includes(id) &&
        !session.skippedQuestionIds.includes(id),
    );
    if (questionId) return questionId;
  }
  return null;
}

function firstAvailable(
  session: CounsellingSession,
  questionId: string,
  reasonCode: string,
): NextAction {
  const isNextInExistingPath =
    session.pathIndex < session.questionPath.length - 1 &&
    session.questionPath.slice(session.pathIndex + 1).includes(questionId);
  if (
    (!session.askedQuestionIds.includes(questionId) &&
      !session.skippedQuestionIds.includes(questionId)) ||
    isNextInExistingPath
  ) {
    const question = counsellingQuestionById.get(questionId);
    if (question?.enabled === false) return { action: "complete", reasonCode: "question_unavailable" };
    return {
      action: question?.role === "discovery" ? "discover" : "follow_up",
      questionId,
      reasonCode,
    };
  }
  return { action: "complete", reasonCode: "no_new_relevant_question" };
}

function nextUnanswered(
  session: CounsellingSession,
  questionIds: string[],
  reasonCode: string,
): NextAction | null {
  for (const questionId of questionIds) {
    const isPendingInPath =
      session.pathIndex < session.questionPath.length - 1 &&
      session.questionPath.slice(session.pathIndex + 1).includes(questionId) &&
      !lastAnswerFor(session, questionId);
    if (
      !session.skippedQuestionIds.includes(questionId) &&
      !lastAnswerFor(session, questionId) &&
      (!session.askedQuestionIds.includes(questionId) || isPendingInPath)
    ) {
      return firstAvailable(session, questionId, reasonCode);
    }
  }
  return null;
}

export function chooseNextAction(
  session: CounsellingSession,
  completedQuestionId: string,
): NextAction {
  const answer = lastAnswerFor(session, completedQuestionId);
  const openingTopics = selectedTopics("Q001", lastAnswerFor(session, "Q001"));
  const curiosityTopics = selectedTopics("Q005", lastAnswerFor(session, "Q005"));

  if (completedQuestionId === "Q001") {
    if (answer?.responseState === "unsure") {
      return nextUnanswered(session, ["Q006"], "try_one_different_angle") ?? {
        action: "complete",
        reasonCode: "accepted_uncertainty",
      };
    }
    if (
      answer?.optionIds.includes("something-else") &&
      !answer.originalText.trim()
    ) {
      const clarification = nextUnanswered(
        session,
        ["Q003"],
        "clarify_unmapped_activity",
      );
      if (clarification) return clarification;
    }
    if (answer?.optionIds.length || answer?.originalText.trim()) {
      const motivation = nextUnanswered(
        session,
        ["Q002"],
        "understand_activity_motivation",
      );
      if (motivation) return motivation;
    }
    const openingBranch = nextTopicFollowUp(session, openingTopics, "Q001");
    if (openingBranch) {
      return firstAvailable(session, openingBranch, "follow_direct_interest");
    }
    const curiosity = nextUnanswered(session, ["Q005"], "discover_curiosity");
    if (curiosity) return curiosity;
    const curiosityBranch = nextTopicFollowUp(session, curiosityTopics, "Q005");
    return curiosityBranch
      ? firstAvailable(session, curiosityBranch, "follow_direct_curiosity")
      : { action: "complete", reasonCode: "relevant_topics_explored" };
  }

  if (completedQuestionId === "Q002") {
    if (answer?.responseState === "unsure") {
      return nextUnanswered(session, ["Q005"], "discover_curiosity") ?? {
        action: "complete",
        reasonCode: "motivation_unclear",
      };
    }
    const branch = nextTopicFollowUp(session, openingTopics, "Q001");
    if (branch) return firstAvailable(session, branch, "follow_direct_interest");
    const curiosity = nextUnanswered(session, ["Q005"], "discover_curiosity");
    if (curiosity) return curiosity;
    const curiosityBranch = nextTopicFollowUp(session, curiosityTopics, "Q005");
    return curiosityBranch
      ? firstAvailable(session, curiosityBranch, "follow_direct_curiosity")
      : { action: "complete", reasonCode: "relevant_topics_explored" };
  }

  if (completedQuestionId === "Q003") {
    const openingAnswer = lastAnswerFor(session, "Q001");
    const hasKnownOpeningActivity = openingAnswer?.optionIds.some(
      (optionId) => optionId !== "something-else" && optionId !== "i-m-not-sure",
    );
    const hasClarification = !!lastAnswerFor(session, "Q003")?.originalText.trim();
    if (
      (hasKnownOpeningActivity || hasClarification) &&
      !lastAnswerFor(session, "Q002")
    ) {
      const motivation = nextUnanswered(
        session,
        ["Q002"],
        "understand_activity_motivation",
      );
      if (motivation) return motivation;
    }
    const curiosity = nextUnanswered(session, ["Q005"], "discover_curiosity");
    if (curiosity) return curiosity;
    const branch = nextTopicFollowUp(session, curiosityTopics, "Q005");
    return branch
      ? firstAvailable(session, branch, "follow_direct_curiosity")
      : { action: "complete", reasonCode: "relevant_topics_explored" };
  }

  if (completedQuestionId === "Q006") {
    return {
      action: "complete",
      reasonCode: answer?.responseState === "unsure"
        ? "accepted_uncertainty"
        : "alternate_angle_shared",
    };
  }

  if (completedQuestionId === "Q005") {
    if (answer?.responseState === "unsure") {
      return nextUnanswered(session, ["Q006"], "try_one_different_angle") ?? {
        action: "complete",
        reasonCode: "accepted_uncertainty",
      };
    }
    const branch = nextTopicFollowUp(session, curiosityTopics, "Q005");
    return branch
      ? firstAvailable(session, branch, "follow_direct_curiosity")
      : { action: "complete", reasonCode: "curiosity_shared_or_unclear" };
  }

  if (completedQuestionId.startsWith("T") ||
    completedQuestionId.startsWith("A") ||
    completedQuestionId.startsWith("S") ||
    completedQuestionId.startsWith("P") ||
    completedQuestionId.startsWith("B") ||
    completedQuestionId.startsWith("SP") ||
    completedQuestionId.startsWith("N")) {
    const openingBranch = nextTopicFollowUp(session, openingTopics, "Q001");
    if (openingBranch) {
      return firstAvailable(session, openingBranch, "follow_another_shared_interest");
    }
    const curiosity = nextUnanswered(session, ["Q005"], "discover_another_area");
    if (curiosity) return curiosity;
    const curiosityBranch = nextTopicFollowUp(session, curiosityTopics, "Q005");
    return curiosityBranch
      ? firstAvailable(session, curiosityBranch, "follow_direct_curiosity")
      : { action: "complete", reasonCode: "relevant_topics_explored" };
  }

  return { action: "complete", reasonCode: "optional_question_finished" };
}

function getCurrentQuestion(session: CounsellingSession): CounsellingQuestion | null {
  return session.currentQuestionId
    ? counsellingQuestionById.get(session.currentQuestionId) ?? null
    : null;
}

function saveNextQuestion(
  session: CounsellingSession,
  questionId: string | null,
): SaveResult {
  const existingPathIndex = questionId
    ? session.questionPath.indexOf(questionId, session.pathIndex + 1)
    : -1;
  const path =
    existingPathIndex >= 0
      ? session.questionPath
      : session.questionPath.slice(0, session.pathIndex + 1);
  if (questionId && existingPathIndex < 0) path.push(questionId);
  const nextSession = {
    ...session,
    currentQuestionId: questionId,
    questionPath: path,
    pathIndex: questionId && existingPathIndex >= 0 ? existingPathIndex : path.length - 1,
    status: "active" as const,
    updatedAt: new Date().toISOString(),
  };
  return persist(nextSession);
}

function advanceAfter(
  session: CounsellingSession,
  completedQuestionId: string,
): SaveResult {
  const next = chooseNextAction(session, completedQuestionId);
  return saveNextQuestion(session, next.action === "complete" ? null : next.questionId);
}

export function submitCounsellingAnswer(
  session: CounsellingSession,
  input: { optionIds: string[]; originalText: string },
): SaveResult {
  const question = getCurrentQuestion(session);
  if (!question) return { ok: false, reason: "unavailable" };

  const validOptions = new Set(question.options?.map((option) => option.id) ?? []);
  if (
    input.optionIds.some(
      (id) =>
        !validOptions.has(id) ||
        question.options?.find((option) => option.id === id)?.enabled === false,
    )
  ) {
    return { ok: false, reason: "unavailable" };
  }
  if (!allowsMultipleCounsellingSelections(question) && input.optionIds.length > 1) {
    return { ok: false, reason: "unavailable" };
  }
  if (hasExclusiveSelectionConflict(question, input.optionIds)) {
    return { ok: false, reason: "unavailable" };
  }
  if (question.maxSelections && input.optionIds.length > question.maxSelections) {
    return { ok: false, reason: "unavailable" };
  }
  if (!input.optionIds.length && !input.originalText.trim()) {
    return { ok: false, reason: "unavailable" };
  }

  const previous = lastAnswerFor(session, question.id);
  const selectedOptions = input.optionIds
    .map((id) => question.options?.find((option) => option.id === id))
    .filter((option) => option !== undefined);
  const responseState = responseStateFor(selectedOptions);
  const conflictsWithOtherSelection =
    selectedOptions.length > 1 &&
    selectedOptions.some((option) =>
      ["unsure", "none", "declined"].includes(option.kind ?? ""),
    );
  const interpretationStatus: AnswerInterpretation =
    (input.optionIds.length && input.originalText.trim()) || conflictsWithOtherSelection
      ? "ambiguous"
      : input.optionIds.length
        ? "clear"
        : "unrecognised";
  const answer: CounsellingAnswer = {
    id: previous?.id ?? crypto.randomUUID(),
    questionId: question.id,
    optionIds: input.optionIds,
    originalText: input.originalText.trim(),
    interpretationStatus,
    responseState,
    contextOptionId:
      question.id === "Q002" &&
      lastAnswerFor(session, "Q001")?.optionIds.length === 1
        ? lastAnswerFor(session, "Q001")?.optionIds[0]
        : undefined,
    createdAt: previous?.createdAt ?? new Date().toISOString(),
    editedAt: previous ? new Date().toISOString() : undefined,
  };
  const answers = previous
    ? session.answers.map((item) => (item.id === previous.id ? answer : item))
    : [...session.answers, answer];
  const updated = {
    ...session,
    answers,
    askedQuestionIds: session.askedQuestionIds.includes(question.id)
      ? session.askedQuestionIds
      : [...session.askedQuestionIds, question.id],
    updatedAt: new Date().toISOString(),
  };
  return advanceAfter(updated, question.id);
}

export function skipCurrentQuestion(
  session: CounsellingSession,
  confirmDependentRemoval = false,
): SaveResult {
  const question = getCurrentQuestion(session);
  if (!question || !question.skipAllowed) return { ok: false, reason: "unavailable" };
  const dependentIds = dependentQuestionIds(session, question.id, null);
  const dependentAnswers = session.answers.filter(
    (answer) => answer.questionId !== question.id && dependentIds.includes(answer.questionId),
  );
  if (dependentAnswers.length && !confirmDependentRemoval) {
    return { ok: false, reason: "dependent_answers" };
  }
  const removedIds = new Set([question.id, ...dependentIds]);
  const skipped = {
    ...session,
    answers: session.answers.filter((answer) => !removedIds.has(answer.questionId)),
    askedQuestionIds: session.askedQuestionIds.filter((id) => !removedIds.has(id)),
    skippedQuestionIds: session.skippedQuestionIds.includes(question.id)
      ? session.skippedQuestionIds.filter((id) => !dependentIds.includes(id))
      : [
          ...session.skippedQuestionIds.filter((id) => !dependentIds.includes(id)),
          question.id,
        ],
    updatedAt: new Date().toISOString(),
  };
  const next = chooseNextAction(skipped, question.id);
  return saveNextQuestion(skipped, next.action === "complete" ? null : next.questionId);
}

export function goToPreviousQuestion(session: CounsellingSession): SaveResult {
  if (session.pathIndex <= 0) return { ok: false, reason: "unavailable" };
  const pathIndex = session.pathIndex - 1;
  return persist({
    ...session,
    currentQuestionId: session.questionPath[pathIndex],
    pathIndex,
    updatedAt: new Date().toISOString(),
  });
}

export function removeCounsellingAnswer(
  session: CounsellingSession,
  answerId: string,
  confirmDependentRemoval = false,
): SaveResult {
  const answer = session.answers.find((item) => item.id === answerId);
  if (!answer) return { ok: false, reason: "unavailable" };
  const dependentIds = dependentQuestionIds(session, answer.questionId, null);
  const dependentAnswers = session.answers.filter(
    (item) => item.id !== answerId && dependentIds.includes(item.questionId),
  );
  if (dependentAnswers.length && !confirmDependentRemoval) {
    return { ok: false, reason: "dependent_answers" };
  }
  const removedIds = new Set([answer.questionId, ...dependentIds]);
  return persist({
    ...session,
    answers: session.answers.filter(
      (item) => item.id !== answerId && !dependentIds.includes(item.questionId),
    ),
    askedQuestionIds: session.askedQuestionIds.filter((id) => !removedIds.has(id)),
    skippedQuestionIds: session.skippedQuestionIds.filter((id) => !removedIds.has(id)),
    updatedAt: new Date().toISOString(),
  });
}

function editedAnswerFor(
  session: CounsellingSession,
  answerId: string,
  input: { optionIds: string[]; originalText: string },
) {
  const previous = session.answers.find((answer) => answer.id === answerId);
  const question = previous
    ? counsellingQuestionById.get(previous.questionId)
    : undefined;
  if (!previous || !question) return null;

  const validOptions = new Set(question.options?.map((option) => option.id) ?? []);
  if (
    input.optionIds.some(
      (id) =>
        !validOptions.has(id) ||
        question.options?.find((option) => option.id === id)?.enabled === false,
    ) ||
    (!allowsMultipleCounsellingSelections(question) && input.optionIds.length > 1) ||
    (question.maxSelections !== undefined &&
      input.optionIds.length > question.maxSelections) ||
    hasExclusiveSelectionConflict(question, input.optionIds) ||
    (!input.optionIds.length && !input.originalText.trim())
  ) {
    return null;
  }

  const selectedOptions = input.optionIds
    .map((id) => question.options?.find((option) => option.id === id))
    .filter((option) => option !== undefined);
  const conflictsWithOtherSelection =
    selectedOptions.length > 1 &&
    selectedOptions.some((option) =>
      ["unsure", "none", "declined"].includes(option.kind ?? ""),
    );
  const answer: CounsellingAnswer = {
    ...previous,
    optionIds: input.optionIds,
    originalText: input.originalText.trim(),
    interpretationStatus:
      (input.optionIds.length && input.originalText.trim()) || conflictsWithOtherSelection
        ? "ambiguous"
        : input.optionIds.length
          ? "clear"
          : "unrecognised",
    responseState: responseStateFor(selectedOptions),
    editedAt: new Date().toISOString(),
  };
  return { answer, question };
}

function branchTopicForQuestion(questionId: string) {
  return Object.entries(branchQuestionIds).find(([, ids]) =>
    ids.some((id) => id === questionId),
  )?.[0] ?? null;
}

function branchTopicsFor(session: CounsellingSession) {
  return new Set(
    ["Q001", "Q005"]
      .flatMap((id) => selectedTopics(id, lastAnswerFor(session, id))),
  );
}

function dependentQuestionIds(
  session: CounsellingSession,
  editedQuestionId: string,
  updatedAnswer: CounsellingAnswer | null,
) {
  if (
    editedQuestionId !== "Q001" &&
    editedQuestionId !== "Q002" &&
    editedQuestionId !== "Q005"
  ) return [];
  const before = branchTopicsFor(session);
  const afterAnswers = session.answers
    .filter((answer) => answer.questionId !== editedQuestionId)
    .concat(updatedAnswer ? [updatedAnswer] : []);
  const after = branchTopicsFor({ ...session, answers: afterAnswers });
  const editedIndex = session.questionPath.indexOf(editedQuestionId);
  const ids = new Set([...session.questionPath, ...session.answers.map((answer) => answer.questionId)]);
  const dependent = [...ids].filter((id) => {
    const topic = branchTopicForQuestion(id);
    const questionIndex = session.questionPath.indexOf(id);
    return (
      topic !== null &&
      before.has(topic) &&
      !after.has(topic) &&
      questionIndex > editedIndex
    );
  });
  const previousAnswer = lastAnswerFor(session, editedQuestionId);
  const questionAfterEdit = (questionId: string) =>
    lastAnswerFor(session, questionId);
  if (editedQuestionId === "Q001") {
    const previousOptions = previousAnswer?.optionIds ?? [];
    const nextOptions = updatedAnswer?.optionIds ?? [];
    const q002Answer = questionAfterEdit("Q002");
    if (
      q002Answer &&
      !previousOptions.some((optionId) => nextOptions.includes(optionId))
    ) {
      dependent.push("Q002");
    }

    if (
      questionAfterEdit("Q003") &&
      (!updatedAnswer?.optionIds.includes("something-else") ||
        !!updatedAnswer.originalText.trim())
    ) {
      dependent.push("Q003");
    }
    if (
      questionAfterEdit("Q006") &&
      previousAnswer?.responseState === "unsure" &&
      updatedAnswer?.responseState !== "unsure" &&
      session.questionPath[session.questionPath.indexOf("Q006") - 1] === "Q001"
    ) {
      dependent.push("Q006");
    }
  }
  if (
    editedQuestionId === "Q002" &&
    questionAfterEdit("Q006") &&
    session.questionPath[session.questionPath.indexOf("Q006") - 1] === "Q002"
  ) {
    dependent.push("Q006");
  }
  if (
    editedQuestionId === "Q005" &&
    questionAfterEdit("Q006") &&
    previousAnswer?.responseState === "unsure" &&
    updatedAnswer?.responseState !== "unsure" &&
    session.questionPath[session.questionPath.indexOf("Q006") - 1] === "Q005"
  ) {
    dependent.push("Q006");
  }
  return [...new Set(dependent)];
}

export function getDependentAnswerEditImpact(
  session: CounsellingSession,
  answerId: string,
  input: { optionIds: string[]; originalText: string },
) {
  const edited = editedAnswerFor(session, answerId, input);
  if (!edited) return [];
  const ids = new Set(dependentQuestionIds(session, edited.question.id, edited.answer));
  return session.answers.filter((answer) => ids.has(answer.questionId));
}

export function getDependentAnswerRemovalImpact(
  session: CounsellingSession,
  answerId: string,
) {
  const answer = session.answers.find((item) => item.id === answerId);
  if (!answer) return [];
  const ids = new Set(dependentQuestionIds(session, answer.questionId, null));
  return session.answers.filter(
    (item) => item.id !== answerId && ids.has(item.questionId),
  );
}

export function clearCounsellingAnswers(session: CounsellingSession): SaveResult {
  const firstQuestion = counsellingQuestionById.get("Q001");
  if (!firstQuestion) return { ok: false, reason: "unavailable" };
  return persist({
    ...session,
    status: "active",
    currentQuestionId: firstQuestion.id,
    questionPath: [firstQuestion.id],
    pathIndex: 0,
    askedQuestionIds: [firstQuestion.id],
    skippedQuestionIds: [],
    answers: [],
    updatedAt: new Date().toISOString(),
  });
}

function nextQuestionAfterEdit(
  session: CounsellingSession,
  questionId: string,
  answer: CounsellingAnswer,
): string | null {
  const available = (id: string) =>
    !session.askedQuestionIds.includes(id) &&
    !session.skippedQuestionIds.includes(id);
  if (questionId === "Q001") {
    if (answer.responseState === "unsure") return available("Q006") ? "Q006" : null;
    if (answer.optionIds.includes("something-else") && !answer.originalText.trim()) {
      if (available("Q003")) return "Q003";
    }
    if (
      (answer.optionIds.length || answer.originalText.trim()) &&
      !lastAnswerFor(session, "Q002") &&
      available("Q002")
    ) return "Q002";
    return (
      nextTopicFollowUp(session, selectedTopics("Q001", answer), "Q001") ??
      (available("Q005") ? "Q005" : null)
    );
  }
  if (questionId === "Q002") {
    if (answer.responseState === "unsure") return available("Q005") ? "Q005" : null;
    return (
      nextTopicFollowUp(
        session,
        selectedTopics("Q001", lastAnswerFor(session, "Q001")),
        "Q001",
      ) ??
      (available("Q005") ? "Q005" : null)
    );
  }
  if (questionId === "Q003") {
    return lastAnswerFor(session, "Q001")?.optionIds.some(
      (optionId) => optionId !== "something-else" && optionId !== "i-m-not-sure",
    ) &&
      !lastAnswerFor(session, "Q002") &&
      available("Q002")
      ? "Q002"
      : available("Q005")
        ? "Q005"
        : null;
  }
  if (questionId === "Q005") {
    return answer.responseState === "unsure"
      ? available("Q006")
        ? "Q006"
        : null
      : nextTopicFollowUp(session, selectedTopics("Q005", answer), "Q005");
  }
  return null;
}

export function editCounsellingAnswer(
  session: CounsellingSession,
  answerId: string,
  input: { optionIds: string[]; originalText: string },
  confirmDependentRemoval = false,
): SaveResult {
  const edited = editedAnswerFor(session, answerId, input);
  if (!edited) return { ok: false, reason: "unavailable" };
  const invalidatedIds = dependentQuestionIds(session, edited.question.id, edited.answer);
  const invalidatedSet = new Set(invalidatedIds);
  const invalidatedAnswers = session.answers.filter((answer) =>
    invalidatedSet.has(answer.questionId),
  );
  if (invalidatedAnswers.length && !confirmDependentRemoval) {
    return { ok: false, reason: "dependent_answers" };
  }

  let updated: CounsellingSession = {
    ...session,
    answers: session.answers.map((answer) =>
      answer.id === edited.answer.id
        ? edited.answer
        : edited.question.id === "Q001" && answer.questionId === "Q002"
          ? {
              ...answer,
              contextOptionId:
                edited.answer.optionIds.length === 1
                  ? edited.answer.optionIds[0]
                  : undefined,
            }
          : answer,
    ).filter((answer) => !invalidatedSet.has(answer.questionId)),
    askedQuestionIds: session.askedQuestionIds.filter((id) => !invalidatedSet.has(id)),
    skippedQuestionIds: session.skippedQuestionIds.filter((id) => !invalidatedSet.has(id)),
    updatedAt: new Date().toISOString(),
  };
  const previousAnswer = session.answers.find((answer) => answer.id === edited.answer.id);
  const changed =
    !!previousAnswer &&
    (previousAnswer.originalText !== edited.answer.originalText ||
          previousAnswer.optionIds.length !== edited.answer.optionIds.length ||
          previousAnswer.optionIds.some((id, index) => id !== edited.answer.optionIds[index]));
  const target = nextQuestionAfterEdit(updated, edited.question.id, edited.answer);
  if (invalidatedIds.length || (changed && target)) {
    const editedIndex = session.questionPath.indexOf(edited.question.id);
    const firstInvalidatedIndex = Math.min(
          ...invalidatedIds
        .map((id) => session.questionPath.indexOf(id))
        .filter((index) => index > editedIndex),
    );
    const insertIndex = Number.isFinite(firstInvalidatedIndex)
      ? firstInvalidatedIndex
      : editedIndex + 1;
    const prefix = session.questionPath.slice(0, insertIndex);
    const remaining = session.questionPath
      .slice(insertIndex)
      .filter(
        (id) =>
          !invalidatedSet.has(id) &&
          id !== target,
      );
    const questionPath = [...prefix, ...(target ? [target] : []), ...remaining];
    const currentQuestionId = target ?? remaining[0] ?? null;
    updated = {
      ...updated,
      questionPath,
      pathIndex: currentQuestionId ? questionPath.indexOf(currentQuestionId) : questionPath.length - 1,
      currentQuestionId,
      status: currentQuestionId ? "active" : session.status,
    };
  }
  return persist(updated);
}

export function deriveStudentInsights(session: CounsellingSession): StudentInsight[] {
  const formatList = new Intl.ListFormat("en", { style: "long", type: "conjunction" });
  return session.answers.flatMap((answer) => {
    const question = counsellingQuestionById.get(answer.questionId);
    if (!question) return [];
    const options = normalizeCounsellingSelection(question, answer.optionIds)
      .map((id) => question.options?.find((option) => option.id === id))
      .filter((option): option is CounsellingOption => option !== undefined);
    const updatedAt = answer.editedAt ?? answer.createdAt;
    return [
      ...(options.length
        ? [{
            id: answer.id,
            category: question.category,
            value: `For “${question.text}”, you selected: ${formatList.format(
              options.map((option) => option.label),
            )}.`,
            status: "student_stated" as const,
            sourceQuestionIds: [answer.questionId],
            sourceAnswerIds: [answer.id],
            updatedAt,
          }]
        : []),
      ...(answer.originalText.trim()
        ? [{
            id: `${answer.id}:written`,
            category: question.category,
            value: `For “${question.text}”, you wrote: “${answer.originalText.trim()}”`,
            status: "student_stated" as const,
            sourceQuestionIds: [answer.questionId],
            sourceAnswerIds: [],
            writtenResponseId: `${answer.id}:written`,
            updatedAt,
          }]
        : []),
    ];
  });
}

export function continueCounselling(session: CounsellingSession): SaveResult {
  if (session.status !== "completed" || !session.currentQuestionId) {
    return { ok: false, reason: "unavailable" };
  }
  return persist({
    ...session,
    status: "active",
    completionReason: undefined,
    updatedAt: new Date().toISOString(),
  });
}

export function questionForSession(session: CounsellingSession) {
  return session.currentQuestionId
    ? counsellingQuestionById.get(session.currentQuestionId) ?? null
    : null;
}

export function responseLabel(session: CounsellingSession, answer: CounsellingAnswer) {
  const question = counsellingQuestionById.get(answer.questionId);
  const choices = answer.optionIds
    .map((id) => question?.options?.find((option) => option.id === id)?.label)
    .filter((label): label is string => label !== undefined);
  if (choices.length) return choices.join(", ");
  if (answer.originalText) return "Written answer (not interpreted)";
  return answer.responseState === "skip" ? "Skipped" : "No answer recorded";
}
