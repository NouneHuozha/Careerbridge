"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  GraduationCap,
  Info,
  Plus,
  Sparkles,
} from "lucide-react";
import {
  activityOptions,
  createEmptyAnswers,
  saveAnswers,
  takeGuidedExplorerDraftSeed,
  useStoredDiscoveryAnswers,
  type ActivityId,
  type ClassContext,
  type DiscoveryAnswers,
} from "../discover/flow-data";

type Step = "welcome" | "class" | "activities";
type ClassChoice = ClassContext | "skip" | null;

const classOptions: {
  value: Exclude<ClassChoice, null>;
  label: string;
  description: string;
  icon: typeof GraduationCap;
}[] = [
  {
    value: "class-10",
    label: "Class 10",
    description: "Browse study options after Class 10.",
    icon: GraduationCap,
  },
  {
    value: "class-12",
    label: "Class 12",
    description: "Browse study options after Class 12.",
    icon: BookOpen,
  },
  {
    value: "general",
    label: "I’m not sure / another class",
    description: "Keep the view broad; no class will be assumed.",
    icon: Compass,
  },
  {
    value: "skip",
    label: "Skip class question",
    description: "Leave the class context unspecified.",
    icon: ArrowRight,
  },
];

const resultsHref = "/discover/results?via=guided";
const allAreasHref = "/discover/results?mode=all&via=guided";

function getSavedAnswers(
  stored: ReturnType<typeof useStoredDiscoveryAnswers>,
): DiscoveryAnswers {
  if (stored.status === "saved" || stored.status === "empty") {
    return stored.answers;
  }
  return createEmptyAnswers();
}

export default function GuidedExplorer() {
  const router = useRouter();
  const stored = useStoredDiscoveryAnswers();
  const [step, setStep] = useState<Step>("welcome");
  const [draft, setDraft] = useState<DiscoveryAnswers | null>(null);
  const [classChoice, setClassChoice] = useState<ClassChoice>(null);
  const [selectionMessage, setSelectionMessage] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [seedReady, setSeedReady] = useState(false);
  const initialized = useRef(false);
  const savedAnswers = getSavedAnswers(stored);
  const answers = draft ?? savedAnswers;

  useEffect(() => {
    if (initialized.current || stored.status === "loading") return;

    initialized.current = true;
    const initial = takeGuidedExplorerDraftSeed() ?? savedAnswers;
    const normalized = {
      ...initial,
      activityIds: [...initial.activityIds],
      notSure: false,
    };
    setDraft(normalized);
    setClassChoice(normalized.classContext);
    setSeedReady(true);
  }, [savedAnswers, stored]);

  function chooseClass(choice: Exclude<ClassChoice, null>) {
    const classContext = choice === "skip" ? null : choice;
    setClassChoice(choice);
    setDraft({ ...answers, classContext, notSure: false });
  }

  function toggleActivity(id: ActivityId) {
    setSaveNotice("");
    setSelectionMessage("");

    if (answers.activityIds.includes(id)) {
      setDraft({
        ...answers,
        activityIds: answers.activityIds.filter((activityId) => activityId !== id),
        notSure: false,
      });
      return;
    }

    if (answers.activityIds.length >= 3) {
      setSelectionMessage(
        "Choose up to 3 activities. You can change them anytime.",
      );
      return;
    }

    setDraft({
      ...answers,
      activityIds: [...answers.activityIds, id],
      notSure: false,
    });
  }

  function continueToResults(nextAnswers: DiscoveryAnswers) {
    setSaveNotice("");
    const normalized = { ...nextAnswers, notSure: false };

    if (!seedReady || !saveAnswers(normalized)) {
      setSaveNotice(
        stored.status === "unavailable"
          ? "We couldn’t access or save choices in this tab. No write completed, so previously saved choices were not changed. Your draft is still on this screen; browse every area to continue without saving it."
          : "We couldn’t save this draft. Your previously saved choices are unchanged. You can keep editing here or browse every area without saving the draft.",
      );
      return;
    }

    setDraft(normalized);
    router.push(resultsHref);
  }

  const progress = step === "welcome" ? 1 : step === "class" ? 2 : 3;
  const stepLabel =
    step === "welcome"
      ? "Welcome · Step 1 of 3"
      : step === "class"
        ? "Class context · Step 2 of 3"
        : "Activities · Step 3 of 3";
  const storageNotice =
    stored.status === "invalid"
      ? "Earlier choices could not be read, so they haven’t been used. You can start fresh or browse every area."
      : stored.status === "unavailable"
        ? "Choices in this tab could not be accessed. Guided browsing still works, but saved choices cannot be confirmed."
        : "";

  return (
    <main
      aria-busy={!seedReady}
      className="min-h-screen bg-[#fbfaf6] text-[#18352d]"
    >
      <header className="bg-[#123f34] text-white">
        <div className="cb-container flex min-h-16 items-center justify-between gap-3 py-2">
          <Link
            href="/"
            className="font-serif text-xl font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2cf78] sm:text-2xl"
          >
            CareerBridge
          </Link>
          <Link
            href="/discover"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/35 px-4 text-sm font-semibold transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2cf78]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to Discovery
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#123f34] pb-10 text-white sm:pb-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-36 h-[30rem] w-[30rem] rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-24 h-[22rem] w-[22rem] rounded-full border border-[#f2cf78]/20"
        />
        <div className="cb-container relative pt-5 sm:pt-8">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-[#f2cf78] sm:text-sm">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Optional · Guided Explorer
          </p>
          <div className="mt-6 grid gap-7 md:grid-cols-[minmax(0,1.2fr)_minmax(17rem,.8fr)] md:items-end md:gap-12">
            <div className="max-w-4xl">
              <h1 className="font-serif text-[clamp(2.6rem,7vw,5.2rem)] font-semibold leading-[.98] tracking-[-.055em] text-white">
                Let’s look around together.
              </h1>
              <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-white/85 sm:text-lg">
                Self-guided browsing — no person involved. You can skip
                questions and browse all options.
              </p>
              {step === "welcome" && (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    disabled={!seedReady}
                    onClick={() => setStep("class")}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f2cf78] px-6 text-sm font-semibold text-[#123f34] transition-colors hover:bg-[#f7dfaa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2cf78] disabled:cursor-wait disabled:opacity-60"
                  >
                    Start
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <Link
                    href={allAreasHref}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/35 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2cf78]"
                  >
                    Browse every area
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                  <p className="text-xs leading-relaxed text-white/70 sm:ml-1">
                    Browsing every area skips these questions and does not save
                    this draft.
                  </p>
                </div>
              )}
            </div>
            <aside className="rounded-[1.4rem] border border-white/15 bg-white/[.07] p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#f2cf78]">
                A gentle way to start
              </p>
              <p className="mt-3 font-serif text-xl font-semibold leading-snug text-white">
                No perfect answers. No decision today.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Your choices help organize browsing. They do not tell you what
                you qualify for or hide other areas.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <div className="cb-container pb-16 pt-7 sm:pb-20 sm:pt-10">
        {storageNotice && (
          <p
            role="status"
            className="mb-6 rounded-xl border border-[#e7d5a8] bg-[#fff9eb] px-4 py-3 text-sm leading-relaxed text-[#4c3922]"
          >
            {storageNotice}
          </p>
        )}
        {stored.status === "loading" && (
          <p role="status" className="mb-6 text-sm text-[#59665e]">
            Checking for choices already saved in this tab…
          </p>
        )}
        {saveNotice && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-[#c8954e] bg-[#fbf1df] px-4 py-3 text-sm leading-relaxed text-[#4c3922]"
          >
            <p>{saveNotice}</p>
            <Link
              href={allAreasHref}
              className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Browse every area without saving
            </Link>
          </div>
        )}

        {step !== "welcome" && (
          <section
            aria-label="Browse without the guided questions"
            className="mb-7 flex flex-col gap-3 rounded-2xl border border-[#d9ddd5] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
          >
            <p className="text-sm leading-relaxed text-[#59665e]">
              Prefer to skip the questions? Browse every area in neutral order.
              This draft won’t be saved, and earlier saved choices won’t be
              cleared.
            </p>
            <Link
              href={allAreasHref}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-[#b8c8bd] bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Browse every area
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </section>
        )}

        <section aria-labelledby="guide-step-title">
          <div className="max-w-3xl">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
                {stepLabel}
              </p>
              <span className="text-xs font-semibold text-[#718078]">
                {progress} / 3
              </span>
            </div>
            <div
              aria-label={`Step ${progress} of 3`}
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e2e4dc]"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-full bg-[#145543] transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${(progress / 3) * 100}%` }}
              />
            </div>
          </div>

          {step === "welcome" && (
            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
                  A few optional steps
                </p>
                <h2
                  id="guide-step-title"
                  className="mt-2 font-serif text-3xl font-semibold tracking-[-.04em] text-[#102d26] sm:text-4xl"
                >
                  You can change direction at any time.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-[#59665e]">
                  We’ll ask for a browsing context and, only if you want, a few
                  everyday activities. Your picks never hide other areas or
                  decide what you qualify for.
                </p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    "There are no perfect answers.",
                    "Skip any question you like.",
                    "Every broad area stays open.",
                  ].map((item, index) => (
                    <li
                      key={item}
                      className="rounded-2xl border border-[#d9ddd5] bg-white p-4"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#eaf2ed] font-serif text-sm font-semibold text-[#145543]">
                        0{index + 1}
                      </span>
                      <p className="mt-3 text-sm font-medium leading-relaxed text-[#354b40]">
                        {item}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <aside className="rounded-[1.4rem] border border-[#e7d5a8] bg-[#fff9eb] p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#725b2f]">
                  Just so it’s clear
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#4c3922]">
                  This is a self-guided tool, not a person or a counselling
                  appointment. There is no free-text box or personal profile.
                </p>
              </aside>
            </div>
          )}

          {step === "class" && (
            <div className="mt-8 max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
                Optional class context
              </p>
              <h2
                id="guide-step-title"
                className="mt-2 font-serif text-3xl font-semibold tracking-[-.04em] text-[#102d26] sm:text-4xl"
              >
                Which class are you in now?
              </h2>
              <p id="class-context-help" className="mt-3 max-w-3xl text-sm leading-relaxed text-[#59665e] sm:text-base">
                Class only organizes what you browse. Choose a context, skip
                this question, or continue without selecting anything.
              </p>
              <fieldset
                disabled={!seedReady}
                aria-describedby="class-context-help"
                className="mt-6 grid gap-3 sm:grid-cols-2"
              >
                <legend className="sr-only">Choose an optional class context</legend>
                {classOptions.map(({ value, label, description, icon: Icon }) => {
                  const selected = classChoice === value;
                  return (
                    <label
                      key={value}
                      className={`group flex min-h-28 cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#145543] motion-reduce:transition-none sm:p-5 ${
                        selected
                          ? "border-[#145543] bg-[#eaf2ed]"
                          : "border-[#d9ddd5] bg-white hover:border-[#8eae9b]"
                      }`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf2ed] text-[#145543]">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-serif text-lg font-semibold leading-snug text-[#18372e]">
                          {label}
                        </span>
                        <span className="mt-1 block text-sm leading-relaxed text-[#59665e]">
                          {description}
                        </span>
                      </span>
                      <input
                        className="mt-1 h-5 w-5 accent-[#145543]"
                        type="radio"
                        name="guided-class-context"
                        value={value}
                        checked={selected}
                        onChange={() => chooseClass(value)}
                      />
                    </label>
                  );
                })}
              </fieldset>
            </div>
          )}

          {step === "activities" && (
            <div className="mt-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
                    Optional activities · skip anytime
                  </p>
                  <h2
                    id="guide-step-title"
                    className="mt-2 font-serif text-3xl font-semibold tracking-[-.04em] text-[#102d26] sm:text-4xl"
                  >
                    What do you enjoy—or want to try?
                  </h2>
                  <p id="activities-help" className="mt-3 text-sm leading-relaxed text-[#59665e] sm:text-base">
                    Choose up to three, or leave them all unselected. These are
                    possible starting points, not a test.
                  </p>
                </div>
                <span className="rounded-full border border-[#d9ddd5] bg-white px-4 py-2 text-sm font-medium text-[#59665e]">
                  <span aria-live="polite">{answers.activityIds.length} of 3 selected</span>
                </span>
              </div>

              <div
                role="group"
                aria-label="Optional activities. Choose up to three or skip all."
                aria-describedby="activities-help"
                className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                {activityOptions.map(({ id, label, description }) => {
                  const selected = answers.activityIds.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      disabled={!seedReady}
                      onClick={() => toggleActivity(id)}
                      className={`flex min-h-28 items-start gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none sm:p-5 ${
                        selected
                          ? "border-[#145543] bg-[#eaf2ed]"
                          : "border-[#d9ddd5] bg-white hover:border-[#8eae9b]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
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
            </div>
          )}

          {step !== "welcome" && (
            <div className="mt-8 flex flex-col gap-3 border-t border-[#d9ddd5] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  setSaveNotice("");
                  setStep(step === "activities" ? "class" : "welcome");
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#b8c8bd] bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back
              </button>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                {step === "class" ? (
                  <button
                    type="button"
                    disabled={!seedReady}
                    onClick={() => {
                      setSaveNotice("");
                      setStep("activities");
                    }}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#145543] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] disabled:cursor-wait disabled:opacity-60"
                  >
                    Continue
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={!seedReady}
                      onClick={() =>
                        continueToResults({
                          ...answers,
                          activityIds: [],
                          notSure: false,
                        })
                      }
                      className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#b8c8bd] bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] disabled:cursor-wait disabled:opacity-60"
                    >
                      Skip activities and browse broadly
                    </button>
                    <button
                      type="button"
                      disabled={!seedReady}
                      onClick={() => continueToResults(answers)}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#145543] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] disabled:cursor-wait disabled:opacity-60"
                    >
                      Show me areas
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

        </section>

        <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-[#718078]">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          Your class context and optional activities only organize browsing.
          This guide does not decide eligibility. Do not enter personal details.
        </p>
      </div>

      <footer className="bg-[#123f34] text-white">
        <div className="cb-container flex flex-col gap-3 py-7 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="font-serif text-lg font-semibold">
            CareerBridge
          </Link>
          <p className="text-sm text-white/75">
            Explore options. Your interests don’t decide your future.
          </p>
        </div>
      </footer>
    </main>
  );
}
