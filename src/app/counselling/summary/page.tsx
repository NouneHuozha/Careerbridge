"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { PageLoadingSkeleton } from "../../page-loading-skeleton";
import { SiteHeader } from "../../site-header";
import { Breadcrumbs } from "../../breadcrumbs";
import { CounsellingAnswerEditor } from "../answer-editor";
import {
  clearCounsellingAnswers,
  continueCounselling,
  editCounsellingAnswer,
  getDependentAnswerEditImpact,
  getDependentAnswerRemovalImpact,
  removeCounsellingAnswer,
  setCounsellingStatus,
  useCounsellingSession,
  type CounsellingAnswer,
  type CounsellingSession,
} from "../counselling-engine";
import {
  counsellingQuestionById,
  normalizeCounsellingSelection,
  type CounsellingQuestion,
} from "../counselling-data";

function answerLabels(answer: CounsellingAnswer, question: CounsellingQuestion) {
  return normalizeCounsellingSelection(question, answer.optionIds)
    .map((id) => question.options?.find((option) => option.id === id)?.label)
    .filter((label): label is string => label !== undefined);
}

export default function CounsellingSummaryPage() {
  const router = useRouter();
  const stored = useCounsellingSession();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  if (stored.status === "loading") {
    return <PageLoadingSkeleton variant="summary" />;
  }
  if (stored.status !== "saved") {
    const unavailable = stored.status === "unavailable" || stored.status === "invalid";
    return (
      <>
      <SiteHeader />
      <Breadcrumbs items={[{ label: "Guided Explorer", href: "/counselling" }, { label: "Your notes" }]} className="pt-4" />
      <main className="min-h-svh bg-[#fbfaf6] px-5 pb-20 pt-5 text-[#18352d]">
        <div className="mx-auto max-w-2xl bg-[#eaf2ed] p-7 sm:p-10">
          <h1 className="font-serif text-3xl font-semibold tracking-[-.03em] sm:text-4xl">
            {unavailable ? "Your summary isn’t available." : "There’s no summary yet."}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#354b40]">
            {unavailable
              ? "Your saved notes could not be read. They have not been erased."
              : "Start Guided Explorer whenever you feel ready."}
          </p>
          <Link
            href="/counselling"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[#145543] px-5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            Back to introduction
          </Link>
        </div>
      </main>
      </>
    );
  }

  const session: CounsellingSession = stored.session;
  const answers = session.answers;
  const canContinue = !!session.currentQuestionId;

  function updateAnswer(answerId: string, optionIds: string[], originalText: string) {
    const input = { optionIds, originalText };
    const affected = getDependentAnswerEditImpact(session, answerId, input);
    if (
      affected.length &&
      !window.confirm(
        `This change no longer fits ${affected.length} later answer${
          affected.length === 1 ? "" : "s"
        }:\n\n${affected
          .map((answer) => counsellingQuestionById.get(answer.questionId)?.text)
          .filter((text): text is string => !!text)
          .join("\n")}\n\nThose answers will be removed; other answers will stay.`,
      )
    ) {
      return;
    }
    const result = editCounsellingAnswer(session, answerId, input, affected.length > 0);
    if (!result.ok) {
      setError("This browser couldn’t save that change. Your saved answer is unchanged.");
      return;
    }
    setError("");
    if (result.session.status === "active") {
      router.push("/counselling/conversation");
      return;
    }
    setNotice("Your summary has been updated.");
    setEditingId(null);
  }

  function removeAnswer(answer: CounsellingAnswer) {
    const affected = getDependentAnswerRemovalImpact(session, answer.id);
    const dependentQuestions = affected
      .map((answer) => counsellingQuestionById.get(answer.questionId)?.text)
      .filter((text): text is string => !!text);
    const confirmation = dependentQuestions.length
      ? `Remove this response? These later responses depend on it and will also be removed:\n\n${dependentQuestions.join("\n")}\n\nOther responses will stay.`
      : "Remove this response from your exploration notes?";
    if (!window.confirm(confirmation)) return;
    const result = removeCounsellingAnswer(session, answer.id, affected.length > 0);
    if (!result.ok) {
      setError("This browser couldn’t remove that answer. Your saved answer is unchanged.");
      return;
    }
    setError("");
    setNotice("The answer and its summary note have been removed.");
    setEditingId(null);
  }

  function clearAnswers() {
    if (
      !window.confirm(
        "Clear all responses and restart Guided Explorer from the first question? This cannot be undone.",
      )
    ) {
      return;
    }
    const result = clearCounsellingAnswers(session);
    if (!result.ok) {
      setError("This browser couldn’t clear your responses. Your saved answers are unchanged.");
      return;
    }
    setError("");
    setNotice("Your responses were cleared. You can start again from the first question.");
    setEditingId(null);
  }

  function continueConversation() {
    const result =
      session.status === "completed"
        ? continueCounselling(session)
        : setCounsellingStatus(session, "active");
    if (!result.ok) {
      setError("There isn’t another saved question to continue with.");
      return;
    }
    router.push("/counselling/conversation");
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">

      <Breadcrumbs items={[{ label: "Guided Explorer", href: "/counselling" }, { label: "Your notes" }]} className="pt-4" />
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-5 sm:px-8 lg:px-12">
        <p className="text-sm font-semibold uppercase tracking-[.14em] text-[#59665e]">
          Your reflection
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-.04em] sm:text-6xl">
          Your exploration notes
        </h1>
        <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-[#354b40] sm:text-lg">
          A chronological record of what you chose to share. Your written responses are kept as
          written and are not interpreted as a career assessment. You can edit or remove any response.
        </p>

        {notice && (
          <p className="mt-5 rounded-xl bg-[#eaf2ed] px-4 py-3 text-sm text-[#0f4537]" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="mt-5 rounded-xl bg-[#f6e8e5] px-4 py-3 text-sm text-[#8a2e24]" role="alert">
            {error}
          </p>
        )}

        <section className="mt-11" aria-labelledby="answers-title">
          <div className="flex flex-col justify-between gap-2 border-b border-[#d9ddd5] pb-4 sm:flex-row sm:items-end">
            <div>
              <h2 id="answers-title" className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">
                Responses in the order you shared them
              </h2>
            </div>
            <p className="text-sm text-[#59665e]">
              {answers.length === 1 ? "1 response" : `${answers.length} responses`}
            </p>
          </div>
          {answers.length ? (
            <ul className="mt-5 grid gap-4">
              {answers.map((answer, index) => {
                const question = counsellingQuestionById.get(answer.questionId);
                if (!question) return null;
                const isEditing = editingId === answer.id;
                const labels = answerLabels(answer, question);
                return (
                  <li
                    key={answer.id}
                    className="rounded-2xl border border-[#dce4dc] bg-white p-5 shadow-[0_8px_24px_rgba(24,53,45,0.04)] sm:p-6"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#59665e]">
                          Response {index + 1}
                        </p>
                        <h3 className="mt-2 text-base font-semibold leading-relaxed text-[#18352d] sm:text-lg">
                          {question.text}
                        </h3>
                        {!isEditing && (
                          <div className="mt-4">
                            <p className="text-xs font-semibold uppercase tracking-[.1em] text-[#59665e]">
                              Your answer
                            </p>
                            {labels.length > 0 && (
                              <ul className="mt-2 flex flex-wrap gap-2">
                                {labels.map((label) => (
                                  <li
                                    key={label}
                                    className="rounded-full border border-[#cbd9ce] bg-[#f2f6f2] px-3 py-1.5 text-sm leading-relaxed text-[#18352d]"
                                  >
                                    {label}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {answer.originalText.trim() && (
                              <blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-[#8da99a] pl-3 text-sm leading-relaxed text-[#354b40]">
                                {answer.originalText}
                              </blockquote>
                            )}
                            {!labels.length && !answer.originalText.trim() && (
                              <p className="mt-2 text-sm text-[#59665e]">No answer recorded</p>
                            )}
                          </div>
                        )}
                      </div>
                      {!isEditing && (
                        <div className="flex shrink-0 gap-1 self-start">
                          <button
                            type="button"
                            onClick={() => {
                              setNotice("");
                              setEditingId(answer.id);
                            }}
                            aria-label={`Edit answer: ${question.text}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#edf3ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                          >
                            <Pencil aria-hidden="true" className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAnswer(answer)}
                            aria-label={`Remove answer: ${question.text}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[#8a2e24] transition-colors hover:bg-[#f6e8e5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a2e24]"
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <CounsellingAnswerEditor
                        key={`${answer.id}-${answer.editedAt ?? answer.createdAt}`}
                        answer={answer}
                        question={question}
                        onCancel={() => setEditingId(null)}
                        onSave={(optionIds, originalText) =>
                          updateAnswer(answer.id, optionIds, originalText)
                        }
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-5 rounded-2xl border border-[#dce4dc] bg-white p-6 text-base leading-relaxed text-[#354b40]">
              You haven’t shared any responses yet. You can start Guided Explorer whenever
              you’re ready, or explore any field without knowing what interests you first.
            </p>
          )}
        </section>

        {answers.length > 0 && (
          <button
            type="button"
            onClick={clearAnswers}
            className="mt-5 inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-[#8a2e24] underline underline-offset-4 transition-colors hover:bg-[#f6e8e5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a2e24]"
          >
            Clear all answers
          </button>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          {canContinue && (
            <button
              type="button"
              onClick={continueConversation}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#145543] px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#edf3ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Continue Guided Explorer <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
          <Link
            href="/explore"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            Explore your options <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-[#59665e]">
          Your responses stay in this browser session. They do not limit which fields you can explore.
        </p>
      </div>
      </main>
    </>
  );
}
