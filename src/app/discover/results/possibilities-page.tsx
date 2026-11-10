"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronDown, Compass, MessageCircle, Info } from "lucide-react";
import { activityOptions, useStoredDiscoveryAnswers } from "../flow-data";
import { useEducationStage } from "../../education-stage";
import {
  getActivityConnections,
  getPossibilityFields,
  possibilityFields,
  type PossibilityField,
} from "../possibility-fields";
import { FieldOverviewDialog } from "./field-overview-dialog";
import { SiteHeader } from "../../site-header";
import { Breadcrumbs } from "../../breadcrumbs";

const classLabels = {
  "class-10": "Class 10",
  "class-12": "Class 12",
} as const;

function FieldCards({
  fields,
  onLearnMore,
  children,
}: {
  fields: readonly PossibilityField[];
  onLearnMore: (field: PossibilityField, trigger: HTMLButtonElement) => void;
  children?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
      {fields.map((field) => (
        <article
          key={field.id}
          className="group flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white transition-transform duration-300 hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <div className="relative aspect-[3/2] overflow-hidden bg-[#e6eeea]">
            <Image
              src={field.image}
              alt={field.imageAlt}
              fill
              sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, (max-width: 1536px) 24vw, 18vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
            />
          </div>
          <div className="flex flex-1 flex-col p-3 sm:p-4 lg:p-5">
            <h3 className="font-serif text-base font-semibold leading-tight tracking-[-.025em] text-[#18372e] sm:text-xl">
              {field.name}
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-[#384a3e] sm:mt-3 sm:text-base">
              {field.description}
            </p>
            <button
              type="button"
              aria-label={`Learn more about ${field.name}`}
              onClick={(event) => onLearnMore(field, event.currentTarget)}
              className="cb-card-action mt-3 w-fit sm:mt-5"
            >
              Learn more
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </article>
      ))}
      {children}
    </div>
  );
}

export default function PossibilitiesPage() {
  const stored = useStoredDiscoveryAnswers();
  const education = useEducationStage();
  const [showAllPossibilities, setShowAllPossibilities] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);
  const [activeField, setActiveField] = useState<PossibilityField | null>(null);
  const fieldGuideTrigger = useRef<HTMLButtonElement | null>(null);

  function openFieldGuide(field: PossibilityField, trigger: HTMLButtonElement) {
    fieldGuideTrigger.current = trigger;
    setActiveField(field);
  }

  function closeFieldGuide() {
    setActiveField(null);
    requestAnimationFrame(() => fieldGuideTrigger.current?.focus({ preventScroll: true }));
  }

  if (stored.status === "loading" || education.status === "loading") {
    return (
      <main
        aria-busy="true"
        className="min-h-svh bg-[#fbfaf6] text-[#18352d]"
      >
        <SiteHeader />
        <p className="sr-only" role="status">Loading your choices…</p>
      </main>
    );
  }

  if (stored.status !== "saved" || education.status !== "saved") {
    return (
      <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
        <SiteHeader />
        <Breadcrumbs items={[{ label: "Discovery", href: "/discover" }, { label: "Study options" }]} className="pt-4" />
        <section className="cb-container pb-16 pt-6">
          <div className="max-w-2xl rounded-2xl border border-[#e7d5a8] bg-[#fff9eb] p-6">
            <Info aria-hidden="true" className="h-6 w-6 text-[#72551e]" />
            <h1 className="mt-4 font-serif text-3xl font-semibold text-[#18372e]">
              Your choices aren’t available yet.
            </h1>
            <p className="mt-3 text-base leading-relaxed text-[#59665e]">
              Go back to Discovery to review your education stage and activity choices. You can change your activities anytime.
            </p>
            <Link href="/discover" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white hover:bg-[#0f4537]">
              Back to Discovery <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const answers = stored.answers;
  const selectedActivities = answers.activityIds
    .map((id) => activityOptions.find((activity) => activity.id === id))
    .filter((activity): activity is (typeof activityOptions)[number] => activity !== undefined);
  const isPersonalised = answers.activityIds.length > 0;
  const fields = getPossibilityFields(answers.activityIds);
  const visibleFields = !isPersonalised || showAllPossibilities ? fields : fields.slice(0, 4);

  return (
    <>
      <SiteHeader />
      <main className="cb-page-enter min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <section className="bg-[#123f34] pb-8 text-white sm:pb-10 lg:pb-12">
        <Breadcrumbs items={[{ label: "Discovery", href: "/discover" }, { label: "Study options" }]} dark className="pt-4" />
        <div className="cb-container grid gap-6 pt-5 sm:pt-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)] lg:items-end lg:gap-10 lg:pt-10">
          <div className="max-w-4xl">
            <h1 className="max-w-[14ch] font-serif text-[clamp(2.75rem,5.5vw,5.5rem)] font-semibold leading-[.96] tracking-[-.05em] text-white">
              Discover what’s possible.
            </h1>
            <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-white/85 sm:text-lg">
              There are many things you can study and do. Let’s take a look at some of them.
            </p>
          </div>

          <section aria-labelledby="your-choices-title" className="rounded-3xl bg-[#eaf2ed] p-5 text-[#18352d] sm:p-6 lg:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="your-choices-title" className="font-serif text-2xl font-semibold tracking-[-.03em] text-[#18372e] sm:text-3xl">
                Your choices
              </h2>
              <Link href="/discover" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-[#145543] underline underline-offset-4 transition-colors hover:text-[#0f4537]">
                Edit choices
              </Link>
            </div>
            <p className="mt-4 text-sm font-semibold text-[#52645a]">Education</p>
            <span className="mt-2 inline-flex min-h-9 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#145543]">
              {classLabels[education.stage]}
            </span>
            <p className="mt-4 text-sm font-semibold text-[#52645a]">Things you enjoy</p>
            {selectedActivities.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Selected activities">
                {selectedActivities.map((activity) => (
                  <li key={activity.id} className="inline-flex min-h-9 items-center rounded-full bg-white px-3 text-sm font-medium text-[#384a3e]">
                    {activity.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[#384a3e]">No activities selected</p>
            )}
          </section>
        </div>
      </section>

      <div className="pb-16 sm:pb-20 lg:pb-24">
        <section id="fields" aria-labelledby="fields-title" className="cb-container py-8 sm:py-10 lg:py-12">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div>
              <h2 id="fields-title" className="max-w-[20ch] font-serif text-[clamp(2rem,3.8vw,3.75rem)] font-semibold leading-[1.02] tracking-[-.04em] text-[#102d26]">
                Different fields to discover
              </h2>
              <p className="mt-4 max-w-[75ch] text-base leading-relaxed text-[#384a3e] sm:text-lg">
                {isPersonalised
                  ? "Your choices give us a starting point, not a ranked match. Here are some fields you can learn about. You can look at any field, even if it isn't listed here."
                  : "You didn’t choose any activities, so all 13 fields are shown for general browsing. They aren’t ranked or personalised."}
              </p>
            </div>
            <aside className="flex max-w-sm gap-3 rounded-2xl border border-[#ead39a] bg-[#fff8e8] p-3.5 text-[#18372e] sm:p-4" aria-label="Tip for exploring fields">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f7e7b6] text-[#765b24]">
                <Info aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[#765b24]">A tip as you explore</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#594c32]">
                  Open any field guide to see what people do, what you could study and where it may lead.
                </p>
              </div>
            </aside>
          </div>

          <div className="mt-6 sm:mt-8">
            <FieldCards
              fields={visibleFields}
              onLearnMore={openFieldGuide}
            >
              {isPersonalised && (
                <article className="flex flex-col justify-between rounded-2xl bg-[#eaf2ed] p-5 sm:p-6">
                  <div>
                    <h3 className="font-serif text-xl font-semibold leading-tight tracking-[-.025em] text-[#18372e] sm:text-2xl">
                      Look beyond these starting points
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#384a3e] sm:text-base">
                      Browse all 13 fields, including ones not shown here.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-expanded={showAllFields}
                    aria-controls="all-fields-list"
                    onClick={() => setShowAllFields((shown) => !shown)}
                    className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-[#145543] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                  >
                    {showAllFields ? "Hide all fields" : "Browse all 13 fields"}
                    <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${showAllFields ? "rotate-180" : ""}`} />
                  </button>
                </article>
              )}
            </FieldCards>
          </div>
          {isPersonalised && fields.length > 4 && (
            <button
              type="button"
              aria-expanded={showAllPossibilities}
              onClick={() => setShowAllPossibilities((shown) => !shown)}
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#eaf2ed] px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#dce9e0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              {showAllPossibilities ? "Show fewer possibilities" : "See all possibilities"}
              <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${showAllPossibilities ? "rotate-180" : ""}`} />
            </button>
          )}
          <div id="all-fields-list" className="mt-10 scroll-mt-6 sm:mt-14" hidden={!isPersonalised || !showAllFields}>
            <div className="mb-6">
              <h3 className="font-serif text-2xl font-semibold tracking-[-.03em] text-[#18372e] sm:text-3xl">
                All 13 fields
              </h3>
              <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[#384a3e] sm:text-base">
                Explore any field, whether or not it appeared in your starting points.
              </p>
            </div>
            <div>
              <FieldCards fields={possibilityFields} onLearnMore={openFieldGuide} />
            </div>
          </div>
        </section>

        <section aria-labelledby="next-step-title" className="cb-container">
          <div className="rounded-3xl bg-[#eaf2ed] p-5 sm:p-8 lg:p-12">
            <h2 id="next-step-title" className="font-serif text-[clamp(2rem,4vw,3.75rem)] font-semibold leading-tight tracking-[-.04em] text-[#102d26]">
              What would you like to do now?
            </h2>
            <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-[#384a3e] sm:text-lg">
              You can explore by yourself or get some help. Choose whichever feels right.
            </p>
            <div className="mt-7 grid gap-3 lg:grid-cols-2 lg:gap-5">
              <article
                className="cb-reveal group rounded-2xl bg-white p-5 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_16px_34px_-24px_rgba(24,53,45,.4)] motion-reduce:transform-none motion-reduce:transition-none sm:p-7"
                style={{ animationDelay: "100ms" }}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e4f0e8] text-[#145543]">
                    <Compass aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <h3 className="font-serif text-xl font-semibold text-[#18372e] sm:text-2xl">Explore on my own</h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[#384a3e] sm:text-base">
                  Want to look around and find out more? Explore different fields, courses, colleges and study options at your own pace.
                </p>
                <Link
                  href="/explore"
                  className="cb-card-action mt-5 w-full border-[#e9c66b] bg-[#f2cf78] text-[#18352d] hover:border-[#e1b94f] hover:bg-[#e9c15d] active:bg-[#dcb34b]"
                >
                  Start exploring <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </article>
              <article
                className="cb-reveal group rounded-2xl bg-white p-5 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_16px_34px_-24px_rgba(24,53,45,.4)] motion-reduce:transform-none motion-reduce:transition-none sm:p-7"
                style={{ animationDelay: "220ms" }}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e4f0e8] text-[#145543]">
                    <MessageCircle aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <h3 className="font-serif text-xl font-semibold text-[#18372e] sm:text-2xl">I need some guidance</h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[#384a3e] sm:text-base">
                  Not sure what you like or where to start? We can go through a few simple questions together to help you understand your interests and choices.
                </p>
                <Link
                  href="/counselling"
                  className="cb-card-action mt-5 w-full border-[#e9c66b] bg-[#f2cf78] text-[#18352d] hover:border-[#e1b94f] hover:bg-[#e9c15d] active:bg-[#dcb34b]"
                >
                  Get guidance <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </article>
            </div>
            <p className="mt-7 text-center text-sm leading-relaxed text-[#384a3e] sm:text-base">
              You don’t have to decide everything today. Take your time.
            </p>
          </div>
        </section>
      </div>
      {activeField && (
        <FieldOverviewDialog
          key={activeField.id}
          field={activeField}
          activities={getActivityConnections(activeField.id, answers.activityIds).flatMap(
            ({ activityId, reason }) => {
              const activity = activityOptions.find((item) => item.id === activityId);
              return activity ? [{ label: activity.label, reason }] : [];
            },
          )}
          onClose={closeFieldGuide}
        />
      )}
      </main>
    </>
  );
}
