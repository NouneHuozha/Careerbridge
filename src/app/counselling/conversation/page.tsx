"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pencil, RotateCcw, X } from "lucide-react";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import { SiteHeader } from "../../site-header";
import { Breadcrumbs } from "../../breadcrumbs";
import { CounsellingAnswerEditor } from "../answer-editor";
import {
  editCounsellingAnswer,
  getDependentAnswerEditImpact,
  getDependentAnswerRemovalImpact,
  goToPreviousQuestion,
  questionForSession,
  setCounsellingStatus,
  skipCurrentQuestion,
  startNewCounselling,
  submitCounsellingAnswer,
  useCounsellingSession,
  type CounsellingAnswer,
  type CounsellingSession,
} from "../counselling-engine";
import {
  allowsMultipleCounsellingSelections,
  counsellingQuestionById,
  normalizeCounsellingSelection,
  toggleCounsellingSelection,
  type CounsellingOption,
  type CounsellingQuestion,
} from "../counselling-data";

function storedAnswer(session: CounsellingSession, questionId: string): CounsellingAnswer | undefined {
  return [...session.answers].reverse().find((answer) => answer.questionId === questionId);
}

function questionGuidance(session: CounsellingSession, question: CounsellingQuestion) {
  const previousQuestionId = session.questionPath[session.pathIndex - 1];
  if (question.id === "Q001") return "Start with everyday things that interest you.";
  if (question.id === "Q003") {
    return "You can add a little more detail if you like, or skip this question.";
  }
  if (
    question.id === "Q006" &&
    storedAnswer(session, "Q001")?.responseState === "unsure"
  ) {
    return "It’s okay not to know yet. You can try a different question.";
  }
  if (previousQuestionId && session.skippedQuestionIds.includes(previousQuestionId)) {
    return "That question was skipped. Continue when you’re ready.";
  }
  return "You can skip any question or finish whenever you like.";
}

function panelQuestionTitle(question: CounsellingQuestion) {
  return question.text;
}

function answerLabels(answer: CounsellingAnswer, question: CounsellingQuestion) {
  return normalizeCounsellingSelection(question, answer.optionIds)
    .map((id) => question.options?.find((option) => option.id === id)?.label)
    .filter((label): label is string => label !== undefined);
}

function NotesPanel({
  session,
}: {
  session: CounsellingSession;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editError, setEditError] = useState("");
  const [pendingEdit, setPendingEdit] = useState<{
    optionIds: string[];
    originalText: string;
  } | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const answers = session.answers;
  const editingAnswer = answers.find((answer) => answer.id === editingId);
  const editingQuestion = editingAnswer
    ? counsellingQuestionById.get(editingAnswer.questionId)
    : undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (editingId && dialog && !dialog.open) dialog.showModal();
  }, [editingId]);

  function closeEditor() {
    setEditingId(null);
    setPendingEdit(null);
    setEditError("");
  }

  function saveEdit(
    answerId: string,
    input: { optionIds: string[]; originalText: string },
    confirmed = false,
  ) {
    const affected = getDependentAnswerEditImpact(session, answerId, input);
    if (affected.length && !confirmed) {
      setPendingEdit(input);
      return;
    }
    const result = editCounsellingAnswer(session, answerId, input, confirmed);
    if (!result.ok) {
      setEditError(
        result.reason === "dependent_answers"
          ? "Some later answers need your confirmation before this change can be saved."
          : "This browser couldn’t save that change. Your answer is unchanged.",
      );
      return;
    }
    closeEditor();
  }

  function confirmEdit() {
    if (editingAnswer && pendingEdit) {
      saveEdit(editingAnswer.id, pendingEdit, true);
    }
  }

  function startNewConversation() {
    const result = startNewCounselling();
    if (!result.ok) {
      setEditError("This browser couldn’t start a new exploration. Your answers are unchanged.");
      return;
    }
    setConfirmNew(false);
    setEditingId(null);
    setPendingEdit(null);
    setEditError("");
  }

  const pendingImpact =
    editingAnswer && pendingEdit
      ? getDependentAnswerEditImpact(session, editingAnswer.id, pendingEdit)
      : [];

  const editor = editingAnswer && editingQuestion ? (
    <dialog
      ref={dialogRef}
      aria-labelledby="edit-answer-title"
      className="fixed inset-0 z-50 m-auto max-h-[90svh] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-[#dce4dc] bg-[#fbfaf6] p-0 text-[#18352d] shadow-[0_24px_80px_rgba(16,45,36,0.28)] backdrop:bg-[#102d24]/55 backdrop:backdrop-blur-sm"
      onCancel={(event) => {
        event.preventDefault();
        closeEditor();
      }}
    >
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#59665e]">
              Edit your answer
            </p>
            <h2 id="edit-answer-title" className="mt-2 font-serif text-2xl font-semibold">
              {panelQuestionTitle(editingQuestion)}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeEditor}
            aria-label="Close answer editor"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#59665e]">
          Change only what you meant to share. Your current question stays open unless this change
          makes a later follow-up no longer relevant.
        </p>
        {editError && (
          <p className="mt-4 rounded-xl bg-[#f6e8e5] px-4 py-3 text-sm text-[#8a2e24]" role="alert">
            {editError}
          </p>
        )}
        {pendingEdit && (
          <div className="mt-5 rounded-2xl border border-[#d8b8a8] bg-[#fff8f4] p-4 sm:p-5">
            <h3 className="font-semibold text-[#18352d]">Update later questions?</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#354b40]">
              The following later answers depend on the earlier topic and no longer fit. They will
              be removed; other answers will stay. CareerBridge will choose a relevant next
              question.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#354b40]">
              {pendingImpact.map((answer) => {
                const question = counsellingQuestionById.get(answer.questionId);
                return question ? <li key={answer.id}>{panelQuestionTitle(question)}</li> : null;
              })}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={confirmEdit}
                className="inline-flex min-h-11 items-center rounded-full bg-[#145543] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Save and update questions
              </button>
              <button
                type="button"
                onClick={() => setPendingEdit(null)}
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-[#145543] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Keep current answers
              </button>
            </div>
          </div>
        )}
        <CounsellingAnswerEditor
          key={`${editingAnswer.id}-${editingAnswer.editedAt ?? editingAnswer.createdAt}`}
          answer={editingAnswer}
          question={editingQuestion}
          onCancel={closeEditor}
          onSave={(optionIds, originalText) => {
            setPendingEdit(null);
            setEditError("");
            saveEdit(editingAnswer.id, { optionIds, originalText });
          }}
        />
      </div>
    </dialog>
  ) : null;

  const content = (
    <div>
      <h2 className="font-serif text-2xl font-semibold tracking-[-.03em] text-[#18352d]">
        Your notes so far
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
        {answers.length === 1 ? "1 response" : `${answers.length} responses`} · You can change any of them.
      </p>
      {answers.length ? (
        <ul className="mt-5 space-y-3">
          {answers.map((answer) => {
            const question = counsellingQuestionById.get(answer.questionId);
            if (!question) return null;
            const labels = answerLabels(answer, question);
            return (
            <li
              key={answer.id}
              className="rounded-2xl border border-[#dce4dc] bg-white p-4 text-sm text-[#354b40] shadow-[0_6px_18px_rgba(24,53,45,0.035)]"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-relaxed text-[#18352d]">
                  {panelQuestionTitle(question)}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditError("");
                    setPendingEdit(null);
                    setEditingId(answer.id);
                  }}
                  aria-label={`Edit answer: ${panelQuestionTitle(question)}`}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#edf3ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                  Edit
                </button>
              </div>
              {labels.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {labels.map((label) => (
                    <li
                      key={label}
                      className="rounded-full bg-[#edf3ee] px-3 py-1.5 text-sm leading-relaxed text-[#18352d]"
                    >
                      {label}
                    </li>
                  ))}
                </ul>
              )}
              {answer.originalText.trim() && (
                <p className="mt-3 whitespace-pre-wrap border-l-2 border-[#8da99a] pl-3 leading-relaxed">
                  {answer.originalText}
                </p>
              )}
            </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 rounded-2xl bg-white p-4 text-sm leading-relaxed text-[#354b40]">
          Your answers will appear here as you share them.
        </p>
      )}
      <p className="mt-5 text-sm leading-relaxed text-[#145543]">
        These notes reflect what you chose to share, not conclusions about your future.
      </p>
      {editError && !editingId && (
        <p className="mt-3 text-sm text-[#8a2e24]" role="alert">
          {editError}
        </p>
      )}
      <button
        type="button"
        onClick={() => setConfirmNew(true)}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#9aafa0] px-4 text-sm font-semibold text-[#145543] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
      >
        <RotateCcw aria-hidden="true" className="h-4 w-4" />
        Start new conversation
      </button>
      <p className="mt-4 text-xs leading-relaxed text-[#145543]">
        Your answers stay in this browser session.
      </p>
    </div>
  );

  return (
    <>
      <details className="mb-5 bg-[#eaf2ed] p-4 lg:hidden">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-[#18352d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
          Your notes so far
        </summary>
        <div className="pt-4">{content}</div>
      </details>
      <aside className="hidden bg-[#eaf2ed] p-7 lg:sticky lg:top-8 lg:block lg:max-h-[calc(100svh-4rem)] lg:self-start lg:overflow-y-auto">
        {content}
      </aside>
      {editor}
      {confirmNew && (
        <dialog
          open
          aria-modal="true"
          aria-labelledby="new-exploration-title"
          className="fixed inset-0 z-[60] m-auto w-[min(30rem,calc(100vw-2rem))] rounded-3xl border border-[#dce4dc] bg-[#fbfaf6] p-0 text-[#18352d] shadow-[0_24px_80px_rgba(16,45,36,0.28)] backdrop:bg-[#102d24]/55 backdrop:backdrop-blur-sm"
          onCancel={(event) => {
            event.preventDefault();
            setConfirmNew(false);
          }}
        >
          <div className="p-6 sm:p-7">
            <h2 id="new-exploration-title" className="font-serif text-2xl font-semibold">
              Start a new exploration?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#354b40]">
              Your current answers and progress will be cleared from this device.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startNewConversation}
                className="inline-flex min-h-11 items-center rounded-full bg-[#145543] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Start new exploration
              </button>
              <button
                type="button"
                onClick={() => setConfirmNew(false)}
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-[#145543] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Keep current progress
              </button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}

function QuestionForm({
  question,
  session,
  onSubmit,
  onSkip,
  onBack,
  onFinish,
  saving,
}: {
  question: CounsellingQuestion;
  session: CounsellingSession;
  onSubmit: (optionIds: string[], originalText: string) => void;
  onSkip: () => void;
  onBack: () => void;
  onFinish: (optionIds: string[], originalText: string) => void;
  saving: boolean;
}) {
  const previous = storedAnswer(session, question.id);
  const [selected, setSelected] = useState<string[]>(() =>
    normalizeCounsellingSelection(question, previous?.optionIds ?? []),
  );
  const [originalText, setOriginalText] = useState(previous?.originalText ?? "");
  const isMulti = allowsMultipleCounsellingSelections(question);
  const prompt = question.text;

  function toggle(option: CounsellingOption) {
    setSelected((current) =>
      toggleCounsellingSelection(question, current, option.id),
    );
  }

  const canSubmit = selected.length > 0 || originalText.trim().length > 0;

  return (
    <section
      aria-labelledby="current-question"
      className="bg-white p-5 sm:p-8 lg:p-10"
    >
      <p className="text-base leading-relaxed text-[#145543]" aria-live="polite">
        {questionGuidance(session, question)}
      </p>
      <div key={question.id} className="mt-8">
        <h2
          id="current-question"
          aria-live="polite"
          aria-atomic="true"
          className="max-w-[24ch] font-serif text-3xl font-semibold leading-tight tracking-[-.04em] text-[#18352d] sm:text-4xl"
        >
          {prompt}
        </h2>

        {question.options && question.responseType !== "free_text" && (
          <fieldset className="mt-7">
            <legend className="mb-3 text-sm font-semibold text-[#145543]">
              {question.responseType === "mixed" && question.id !== "Q001"
                ? "Optional quick response"
                : isMulti
                  ? "Select all that apply"
                  : "Choose one"}
            </legend>
            {question.id === "Q001" && (
              <p className="mb-3 text-sm leading-relaxed text-[#59665e]">
                Choose up to 3 activities that interest you, or share your own answer below.
                “I&apos;m not sure” can be selected on its own.
              </p>
            )}
            {question.id === "Q002" && (
              <p className="mb-3 text-sm leading-relaxed text-[#59665e]">
                Choose all that fit. Select “Not sure” on its own.
              </p>
            )}
            {question.id === "Q005" && (
              <p className="mb-3 text-sm leading-relaxed text-[#59665e]">
                Choose up to 3 topics. Select “Not sure” on its own.
              </p>
            )}
            {question.responseType === "mixed" && question.id !== "Q001" && (
              <p className="mb-3 text-sm leading-relaxed text-[#59665e]">
                Choose one if it fits, or write your own answer below. These are just suggestions.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {question.options.filter((option) => option.enabled !== false).map((option) => {
                const pressed = selected.includes(option.id);
                const atSelectionLimit =
                  question.maxSelections !== undefined &&
                  selected.length >= question.maxSelections &&
                  !pressed &&
                  !option.exclusive;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={atSelectionLimit}
                    aria-pressed={pressed}
                    onClick={() => toggle(option)}
                    className={`flex min-h-12 items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left text-base font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] ${
                      pressed
                        ? "border-[#145543] bg-[#145543] text-white ring-2 ring-inset ring-[#145543]"
                        : "border-transparent bg-[#edf3ee] text-[#18352d] hover:bg-[#e4f0e8]"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <span>{option.label}</span>
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                        isMulti ? "rounded-md" : "rounded-full"
                      } ${
                        pressed
                          ? "border-white bg-white text-[#145543]"
                          : "border-[#708078] bg-transparent"
                      }`}
                    >
                      {pressed ? <span className="text-sm font-bold">✓</span> : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <label
          htmlFor="counselling-answer"
          className="mt-7 block text-sm font-semibold text-[#354b40]"
        >
          {question.id === "Q001"
            ? "Tell us what you enjoy doing (optional)"
            : question.id === "Q003"
              ? "Your answer (optional)"
              : "Or write in your own words (optional)"}
        </label>
        <textarea
          id="counselling-answer"
          value={originalText}
          onChange={(event) => setOriginalText(event.target.value)}
          rows={question.responseType === "free_text" ? 5 : 3}
          className="mt-2 block w-full resize-y rounded-xl bg-[#fbfaf6] px-4 py-3 text-base leading-relaxed text-[#18352d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          placeholder="Share only what you feel comfortable sharing."
        />
        <p className="mt-2 text-sm leading-relaxed text-[#145543]">
          Your words are saved as written, without automatic interpretation. Continue or finish to save them; skipping leaves this question unanswered.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={onBack}
            disabled={session.pathIndex === 0 || saving}
            className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#edf3ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={() => onFinish(selected, originalText)}
            disabled={saving}
            className="inline-flex min-h-12 items-center rounded-full px-4 text-sm font-semibold text-[#145543] underline underline-offset-4 transition-colors hover:bg-[#edf3ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] disabled:opacity-50"
          >
            Finish for now
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSkip}
            disabled={saving}
            className="inline-flex min-h-12 items-center justify-center rounded-full px-4 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#edf3ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] disabled:opacity-50"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => onSubmit(selected, originalText)}
            disabled={!canSubmit || saving}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#145543] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default function CounsellingConversationPage() {
  const router = useRouter();
  const stored = useCounsellingSession();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const session = stored.status === "saved" ? stored.session : null;
  const question = session ? questionForSession(session) : null;
  useEffect(() => {
    if (stored.status === "empty") router.replace("/counselling");
    if (stored.status === "saved" && stored.session.status === "completed") {
      router.replace("/counselling/complete");
    }
    if (stored.status === "saved" && stored.session.status === "paused") {
      router.replace("/counselling");
    }
    if (
      stored.status === "saved" &&
      stored.session.status === "active" &&
      stored.session.currentQuestionId === null
    ) {
      const result = setCounsellingStatus(stored.session, "completed");
      if (result.ok) {
        router.replace("/counselling/complete");
      } else {
        window.setTimeout(
          () => setError("This browser couldn’t save the end of Guided Explorer."),
          0,
        );
      }
    }
  }, [router, stored]);

  function save(result: ReturnType<typeof submitCounsellingAnswer>) {
    if (!result.ok) {
      setError("This browser couldn’t save your answer. Your current answer is still on this screen.");
      return;
    }
    setError("");
    if (result.session.currentQuestionId === null) {
      completeConversation(result.session);
    }
  }

  function completeConversation(currentSession: CounsellingSession) {
    const result = setCounsellingStatus(currentSession, "completed");
    if (!result.ok) {
      setError("This browser couldn’t save the end of Guided Explorer.");
      return;
    }
    router.replace("/counselling/complete");
  }

  function submit(optionIds: string[], originalText: string) {
    if (!session) return;
    setSaving(true);
    save(submitCounsellingAnswer(session, { optionIds, originalText }));
    setSaving(false);
  }

  function skip() {
    if (!session) return;
    const answer =
      session.currentQuestionId
        ? storedAnswer(session, session.currentQuestionId)
        : undefined;
    const affected = answer
      ? getDependentAnswerRemovalImpact(session, answer.id)
      : [];
    if (
      affected.length &&
      !window.confirm(
        `Skipping this response will also remove ${affected.length} later response${
          affected.length === 1 ? "" : "s"
        } that depend on it. Other responses will stay. Continue?`,
      )
    ) {
      return;
    }
    save(skipCurrentQuestion(session, affected.length > 0));
  }

  function finish(optionIds: string[], originalText: string) {
    if (!session) return;
    setSaving(true);
    let updatedSession = session;
    if (optionIds.length || originalText.trim()) {
      const saved = submitCounsellingAnswer(session, { optionIds, originalText });
      if (!saved.ok) {
        setError("This browser couldn’t save your response. Your exploration is still open.");
        setSaving(false);
        return;
      }
      updatedSession = saved.session;
    } else if (session.currentQuestionId && storedAnswer(session, session.currentQuestionId)) {
      const previous = storedAnswer(session, session.currentQuestionId);
      const affected = previous
        ? getDependentAnswerRemovalImpact(session, previous.id)
        : [];
      if (
        affected.length &&
        !window.confirm(
          `Finishing with this response unanswered will also remove ${affected.length} later response${
            affected.length === 1 ? "" : "s"
          } that depend on it. Continue?`,
        )
      ) {
        setSaving(false);
        return;
      }
      const skipped = skipCurrentQuestion(session, affected.length > 0);
      if (!skipped.ok) {
        setError("This browser couldn’t save your progress. Your exploration is still open.");
        setSaving(false);
        return;
      }
      updatedSession = skipped.session;
    }

    const result = setCounsellingStatus(updatedSession, "completed", "finished_early");
    if (!result.ok) {
      setError("This browser couldn’t save the end of Guided Explorer.");
      setSaving(false);
      return;
    }
    router.push("/counselling/complete");
    setSaving(false);
  }

  function back() {
    if (!session) return;
    save(goToPreviousQuestion(session));
  }

  if (stored.status === "loading") {
    return <PageLoadingSkeleton variant="conversation" />;
  }

  if (!session) {
    const unavailable = stored.status === "unavailable" || stored.status === "invalid";
    return (
      <>
      <SiteHeader counsellingSession={session ?? undefined} />
      <Breadcrumbs items={[{ label: "Guided Explorer", href: "/counselling" }, { label: "Questions" }]} className="pt-4" />
      <main className="min-h-svh bg-[#fbfaf6] px-5 pb-20 pt-5 text-[#18352d]">
        <div className="mx-auto max-w-2xl bg-[#eaf2ed] p-7 sm:p-10">
          <h1 className="font-serif text-3xl font-semibold tracking-[-.03em] sm:text-4xl">
            {unavailable ? "Your saved progress isn’t available." : "Opening Guided Explorer…"}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#354b40]">
            {unavailable
              ? "The saved progress could not be read or saved. It has not been erased."
              : "Your answers are kept in this browser session."}
          </p>
          <Link
            href="/counselling"
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            Back to introduction <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </main>
      </>
    );
  }

  if (!question && session.currentQuestionId === null) {
    if (!error) return null;

    return (
      <>
        <SiteHeader counsellingSession={session} />
        <Breadcrumbs items={[{ label: "Guided Explorer", href: "/counselling" }, { label: "Questions" }]} className="pt-4" />
        <main className="min-h-svh bg-[#fbfaf6] px-5 pb-20 pt-5 text-[#18352d]">
          <div className="mx-auto max-w-2xl bg-[#eaf2ed] p-7 sm:p-10">
            <h1 className="font-serif text-3xl font-semibold tracking-[-.03em] sm:text-4xl">
              Guided Explorer couldn’t be completed.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-[#354b40]" role="alert">
              {error}
            </p>
            <button
              type="button"
              onClick={() => completeConversation(session)}
              className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[#145543] px-5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Try again
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader counsellingSession={session} />
      <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">

      <Breadcrumbs items={[{ label: "Guided Explorer", href: "/counselling" }, { label: "Questions" }]} className="pt-4" />
      <div className="mx-auto max-w-7xl px-5 pb-6 pt-5 sm:px-8 sm:pb-10 lg:px-12">
        {error && (
          <p className="mb-5 bg-[#f6e8e5] px-4 py-3 text-sm leading-relaxed text-[#8a2e24]" role="alert">
            {error}
          </p>
        )}

        {question ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)] lg:gap-8">
            <QuestionForm
              key={`${session.id}-${question.id}-${storedAnswer(session, question.id)?.editedAt ?? ""}`}
              question={question}
              session={session}
              onSubmit={submit}
              onSkip={skip}
              onBack={back}
              onFinish={finish}
              saving={saving}
            />
            <NotesPanel session={session} />
          </div>
        ) : null}
      </div>
      </main>
    </>
  );
}
