"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  allowsMultipleCounsellingSelections,
  normalizeCounsellingSelection,
  toggleCounsellingSelection,
  type CounsellingQuestion,
} from "./counselling-data";
import type { CounsellingAnswer } from "./counselling-engine";

export function CounsellingAnswerEditor({
  answer,
  question,
  onCancel,
  onSave,
}: {
  answer: CounsellingAnswer;
  question: CounsellingQuestion;
  onCancel: () => void;
  onSave: (optionIds: string[], originalText: string) => void;
}) {
  const [selected, setSelected] = useState(() =>
    normalizeCounsellingSelection(question, answer.optionIds).filter(
      (id) => question.options?.find((option) => option.id === id)?.enabled !== false,
    ),
  );
  const [originalText, setOriginalText] = useState(answer.originalText);
  const isMulti = allowsMultipleCounsellingSelections(question);

  function toggle(optionId: string) {
    setSelected((current) =>
      toggleCounsellingSelection(question, current, optionId),
    );
  }

  return (
    <div className="mt-4 rounded-2xl bg-[#fbfaf6] p-4 sm:p-5">
      {question.options && question.responseType !== "free_text" && (
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-[#354b40]">
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
          <div className="grid gap-2 sm:grid-cols-2">
            {question.options.filter((option) => option.enabled !== false).map((option) => {
              const pressed = selected.includes(option.id);
              const atSelectionLimit =
                question.maxSelections !== undefined &&
                selected.length >= question.maxSelections &&
                !pressed &&
                !option.exclusive;
              return (
                <button
                  type="button"
                  key={option.id}
                  disabled={atSelectionLimit}
                  aria-pressed={pressed}
                  onClick={() => toggle(option.id)}
                  className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] ${
                    pressed
                      ? "border-[#145543] bg-[#145543] text-white ring-2 ring-inset ring-[#145543]"
                      : "border-transparent bg-white text-[#18352d] hover:bg-[#e4f0e8]"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {option.label}
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
                    {pressed ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <label
        htmlFor={`answer-text-${answer.id}`}
        className="mt-5 block text-sm font-semibold text-[#354b40]"
      >
        {question.id === "Q003" ? "Your answer (optional)" : "Your own words (optional)"}
      </label>
      <textarea
        id={`answer-text-${answer.id}`}
        value={originalText}
        onChange={(event) => setOriginalText(event.target.value)}
        rows={question.responseType === "free_text" ? 5 : 3}
        className="mt-2 block w-full resize-y rounded-xl bg-white px-3 py-3 text-base leading-relaxed text-[#18352d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSave(selected, originalText)}
          disabled={!selected.length && !originalText.trim()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#145543] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] disabled:opacity-50"
        >
          <Check aria-hidden="true" className="h-4 w-4" />
          Save changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-[#145543] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
