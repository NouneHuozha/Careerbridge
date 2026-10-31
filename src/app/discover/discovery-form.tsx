"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BookOpen,
  Check,
  Compass,
  GraduationCap,
  Info,
  Plus,
} from "lucide-react";
import {
  activityOptions,
  clearAnswers,
  createEmptyAnswers,
  saveAnswers,
  useStoredDiscoveryAnswers,
  type ActivityId,
  type ClassContext,
  type DiscoveryAnswers,
} from "./flow-data";
import ClearChoicesButton from "./clear-choices-button";

const classOptions: {
  value: ClassContext;
  label: string;
  description: string;
  icon: typeof GraduationCap;
}[] = [
  {
    value: "class-10",
    label: "Class 10",
    description: "Explore what you can study after Class 10.",
    icon: GraduationCap,
  },
  {
    value: "class-12",
    label: "Class 12",
    description: "Explore what you can study after Class 12.",
    icon: BookOpen,
  },
  {
    value: "general",
    label: "I’m not sure",
    description: "That’s okay. Browse broadly without choosing a class.",
    icon: Compass,
  },
];

export default function DiscoveryForm() {
  const stored = useStoredDiscoveryAnswers();
  const [draft, setDraft] = useState<DiscoveryAnswers | null>(null);
  const [notice, setNotice] = useState("");
  const [selectionMessage, setSelectionMessage] = useState("");
  const ready = stored.status !== "loading";
  const answers =
    draft ??
    (stored.status === "saved" || stored.status === "empty"
      ? stored.answers
      : createEmptyAnswers());
  const storageNotice =
    stored.status === "invalid"
      ? "We couldn’t read your earlier choices. They haven’t been used. Start fresh or browse all areas."
      : stored.status === "unavailable"
        ? "We couldn’t access choices saved in this tab. You can still browse all areas."
        : "";

  function toggleActivity(id: ActivityId) {
    setNotice("");
    setSelectionMessage("");

    if (answers.activityIds.includes(id)) {
      setDraft({
        ...answers,
        notSure: false,
        activityIds: answers.activityIds.filter((activityId) => activityId !== id),
      });
      return;
    }

    if (answers.activityIds.length === 3) {
      setSelectionMessage("Choose up to 3 activities. You can change them anytime.");
      return;
    }

    setDraft({
      ...answers,
      notSure: false,
      activityIds: [...answers.activityIds, id],
    });
  }

  function saveChoices() {
    setNotice("");
    if (!saveAnswers(answers)) {
      setNotice(
        "We couldn’t save your choices in this tab. Your current selections are still shown here.",
      );
      return;
    }
    setNotice("Your choices are saved in this tab. This is the current stopping point.");
  }

  function clearCurrentChoices() {
    if (!clearAnswers()) {
      setNotice("We couldn’t clear the saved choices in this tab. Please try again.");
      return false;
    }
    setDraft(createEmptyAnswers());
    setNotice("");
    setSelectionMessage("");
    return true;
  }

  return (
    <main className="cb-page-enter min-h-screen overflow-hidden bg-[#fbfaf6] text-[#18352d]">
      <header className="relative z-10 bg-[#123f34] text-white">
        <div className="cb-container flex min-h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="font-serif text-xl font-semibold tracking-tight sm:text-2xl"
          >
            CareerBridge
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 px-4 text-sm font-semibold transition-colors hover:bg-white/10"
          >
            <span aria-hidden="true">←</span> Home
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#123f34] pb-4 text-white sm:pb-6 lg:pb-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-36 -top-52 h-[32rem] w-[32rem] rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-36 h-[24rem] w-[24rem] rounded-full border border-[#f2cf78]/20"
        />
        <div className="cb-container relative grid gap-6 pt-6 sm:gap-8 sm:pt-8 md:grid-cols-[minmax(0,1.2fr)_minmax(260px,.8fr)] md:items-center lg:pt-10">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#f2cf78] sm:text-sm">
              Discovery <span className="px-2 text-white/40">/</span> A first step
            </p>
            <h1 className="mt-3 max-w-none font-serif text-[clamp(2.25rem,5.2vw,4.7rem)] font-semibold leading-none tracking-[-.05em] text-white">
              You can be unsure.
            </h1>
            <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-white/80 sm:text-base">
              Choose a class context, then optionally pick activities.
            </p>
          </div>

          <aside className="max-w-sm rounded-2xl border border-white/15 bg-white/[.06] p-4 text-sm leading-relaxed text-white/85">
            This is the current Discovery page. The pages that would follow it
            are not included right now.
          </aside>
        </div>
      </section>

      <div className="cb-container pb-16 pt-3 sm:pb-20 sm:pt-6 lg:pt-7">
        {(notice || storageNotice) && (
          <div
            role={notice.includes("couldn’t") ? "alert" : "status"}
            className="mb-7 flex flex-wrap items-start gap-3 rounded-xl border border-[#c8954e] bg-[#fbf1df] p-4 text-sm leading-relaxed text-[#4c3922]"
          >
            <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p>{notice || storageNotice}</p>
              {storageNotice.includes("couldn’t read") && (
                <ClearChoicesButton
                  onConfirm={clearCurrentChoices}
                  label="Clear earlier choices"
                  className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                />
              )}
            </div>
          </div>
        )}

        <div className="mb-3 flex items-start gap-3 rounded-2xl border border-[#e7d5a8] bg-[#fff9eb] p-3 text-[#384a3e] shadow-[0_8px_24px_-20px_rgba(24,53,45,.28)] sm:mb-6 sm:gap-4 sm:p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f2cf78]/45 text-[#72551e]">
            <Info aria-hidden="true" className="h-5 w-5" />
          </span>
          <p className="max-w-5xl text-sm leading-relaxed">
            <strong className="font-semibold text-[#243a2f]">Not a test:</strong>{" "}
            class organizes browsing; activities are optional ideas. Nothing
            decides what you qualify for.
          </p>
        </div>

        <div aria-busy={!ready} className="space-y-8 sm:space-y-16">
          <fieldset
            disabled={!ready}
            aria-describedby="class-help"
            className="min-w-0"
          >
            <legend className="block font-serif text-[clamp(1.8rem,3.2vw,2.7rem)] font-semibold leading-tight tracking-[-.04em] text-[#102d26]">
              <span className="block font-sans text-xs font-semibold uppercase tracking-[.15em] text-[#718078]">
                First, a little context
              </span>
              <span className="mt-1.5 block text-[1.55rem] sm:text-[clamp(1.8rem,3.2vw,2.7rem)]">
                Choose your class
              </span>
            </legend>
            <p
              id="class-help"
              className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[#59665e] sm:text-base"
            >
              Your class organizes browsing—it doesn’t decide eligibility. If
              you’re unsure, choose “I’m not sure.”
            </p>

            <div
              className="mt-3 grid gap-2.5 md:mt-4 md:grid-cols-3 md:gap-3 lg:gap-5"
            >
              {classOptions.map(({ value, label, description, icon: Icon }, index) => {
                const selected = answers.classContext === value;
                return (
                  <label
                    key={value}
                    className={`cb-reveal group relative flex min-h-[72px] cursor-pointer flex-row items-center justify-start gap-3 rounded-2xl border p-3 transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#759586] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#145543] motion-reduce:transform-none motion-reduce:transition-none md:min-h-[120px] md:flex-col md:items-stretch md:justify-between md:gap-0 md:p-5 ${
                      selected
                        ? "border-[#145543] bg-[#eaf2ed] shadow-[0_12px_30px_-24px_rgba(20,85,67,.7)]"
                        : "border-[#d9ddd5] bg-white hover:bg-[#fffefa]"
                    }`}
                    style={{ animationDelay: `${index * 65}ms` }}
                  >
                    <span className="flex w-auto shrink-0 items-center justify-between gap-2 md:w-full md:items-start md:gap-4">
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-full transition-colors md:h-10 md:w-10 ${
                          selected
                            ? "bg-[#145543] text-white"
                            : "bg-[#eaf2ed] text-[#145543]"
                        }`}
                      >
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <input
                        type="radio"
                        name="class-context"
                        value={value}
                        checked={selected}
                        onChange={() => {
                          setDraft({
                            ...answers,
                            classContext: value,
                          });
                          setNotice("");
                        }}
                        className="sr-only"
                        required
                      />
                      <span
                        aria-hidden="true"
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors ${
                          selected
                            ? "border-[#145543] bg-[#145543] text-white"
                            : "border-[#aab7ad] bg-white text-transparent group-hover:border-[#759586]"
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </span>
                    </span>
                    <span className="block min-w-0 flex-1 md:mt-3 md:flex-none">
                      <span className="block font-serif text-base font-semibold tracking-[-.02em] text-[#18372e] md:text-lg">
                        {label}
                      </span>
                      <span className="mt-0.5 block max-w-[42ch] text-xs leading-snug text-[#626e67] md:mt-1 md:text-sm md:leading-relaxed">
                        {description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {answers.classContext && (
            <section
              aria-labelledby="activity-title"
              className="cb-reveal border-t border-[#dddcd4] pt-10 sm:pt-12"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#718078]">
                    Optional activities — skip anytime
                  </p>
                  <h2
                    id="activity-title"
                    className="mt-2 font-serif text-[clamp(1.8rem,3.2vw,2.7rem)] font-semibold leading-tight tracking-[-.04em] text-[#102d26]"
                  >
                    What do you enjoy—or want to try?
                  </h2>
                  <p
                    id="activity-help"
                    className="mt-3 max-w-3xl rounded-xl border border-[#e7d5a8] bg-[#fff9eb] px-4 py-3 text-sm leading-relaxed text-[#4c3922]"
                  >
                    <strong className="font-semibold">Optional:</strong> Pick
                    up to 3, or leave them all unselected. You can still
                    continue.
                  </p>
                </div>
                <span className="rounded-full border border-[#d9ddd5] bg-white px-4 py-2 text-sm font-medium text-[#59665e]">
                  <span aria-live="polite">
                    {answers.activityIds.length} of 3 selected
                  </span>
                </span>
              </div>

              <div
                role="group"
                aria-describedby="activity-help"
                aria-label="Optional activities. Choose up to three or skip all."
                className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4"
              >
                {activityOptions.map(({ id, label, description }, index) => {
                  const selected = answers.activityIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleActivity(id)}
                      className={`cb-reveal group flex min-h-[126px] items-start gap-4 rounded-2xl border p-4 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] motion-reduce:transform-none motion-reduce:transition-none sm:p-5 ${
                        selected
                          ? "border-[#145543] bg-[#eaf2ed] shadow-[0_12px_30px_-24px_rgba(20,85,67,.7)]"
                          : "border-[#d9ddd5] bg-white hover:border-[#8eae9b] hover:bg-[#fffefa]"
                      }`}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors ${
                          selected
                            ? "bg-[#145543] text-white"
                            : "bg-[#eaf2ed] text-[#145543]"
                        }`}
                      >
                        {selected ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold leading-snug text-[#18372e]">
                          {label}
                        </span>
                        <span className="mt-1.5 block text-sm leading-relaxed text-[#626e67]">
                          {description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <p
                aria-live="polite"
                className="mt-3 min-h-6 text-sm font-medium text-[#72551e]"
              >
                {selectionMessage}
              </p>
            </section>
          )}

          <div className="border-t border-[#d9ddd5] pt-6 sm:pt-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                {!answers.classContext ? (
                  <>
                    <p className="font-semibold text-[#18372e]">
                      Choose a class or “I’m not sure” to continue.
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[#59665e]">
                      Activities are optional. Your class choice only sets browsing context.
                    </p>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-[#59665e]">
                    {answers.classContext === "general"
                      ? "No class assumed. You’ll browse broad areas."
                      : `Your ${answers.classContext === "class-10" ? "Class 10" : "Class 12"} choice organizes browsing only; it does not decide eligibility.`}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {answers.activityIds.length > 0 ||
                answers.notSure ||
                answers.classContext ? (
                  <ClearChoicesButton
                    onConfirm={clearCurrentChoices}
                    disabled={!ready}
                    className="inline-flex min-h-12 items-center justify-center px-3 text-sm font-semibold text-[#59665e] underline underline-offset-4 transition-colors hover:text-[#145543] disabled:opacity-60"
                  />
                ) : null}
                <button
                  type="button"
                  disabled={!ready || !answers.classContext}
                  onClick={saveChoices}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#145543] px-6 text-sm font-semibold text-white transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[#0f4537] motion-reduce:transform-none motion-reduce:transition-none disabled:cursor-not-allowed disabled:bg-[#aab7ad] disabled:text-white"
                >
                  Save my choices
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
