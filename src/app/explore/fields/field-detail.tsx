"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Landmark, Map, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Breadcrumbs } from "../../breadcrumbs";
import { getGuidedExploreStartingPoints } from "../explore-data";
import { useCounsellingSession } from "../../counselling/counselling-engine";
import type { PossibilityField, StudyStage } from "./field-data";

type StageView = StudyStage | "both";

const stageOptions: { id: StageView; label: string }[] = [
  { id: "class-10", label: "After Class 10" },
  { id: "class-12", label: "After Class 12" },
  { id: "both", label: "Compare both" },
];

export function FieldDetail({
  field,
  initialStage,
  fromGuidedExplorer,
}: {
  field: PossibilityField;
  initialStage?: StudyStage;
  fromGuidedExplorer: boolean;
}) {
  const [stageView, setStageView] = useState<StageView>(initialStage ?? "both");
  const storedCounselling = useCounsellingSession();
  const startingPoint = fromGuidedExplorer
    ? getGuidedExploreStartingPoints(storedCounselling)?.find(
        (suggestion) => suggestion.field.id === field.id,
      )
    : undefined;
  const displayedStages: StudyStage[] =
    stageView === "both" ? ["class-10", "class-12"] : [stageView];
  const exploreParams = new URLSearchParams({ field: field.id });
  if (stageView !== "both") exploreParams.set("stage", stageView);

  return (
    <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <Breadcrumbs
        items={[
          { label: "Explore", href: "/explore" },
          { label: "Fields", href: "/explore/fields" },
          { label: field.name },
        ]}
        className="pt-4"
      />

      <section className="cb-container pb-10 pt-5 sm:pb-14 sm:pt-8">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)] lg:items-center lg:gap-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[.14em] text-[#4c6a5a]">
              Explore this field
            </p>
            <h1 className="mt-3 font-serif text-[clamp(2.75rem,6vw,5.25rem)] font-semibold leading-[.98] tracking-[-.05em]">
              {field.name}
            </h1>
            <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-[#354b40] sm:text-xl">
              {field.description} Discover what people do, what you might learn and some routes
              you could explore.
            </p>
            <a
              href="#field-overview"
              className="cb-card-action mt-6 inline-flex"
            >
              Understand the field <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
          <div className="relative min-h-56 overflow-hidden rounded-[1.75rem] bg-[#dce7df] sm:min-h-80">
            <Image
              src={field.image}
              alt={field.imageAlt}
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 48vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {startingPoint && (
        <section className="cb-container pb-8" aria-labelledby="guided-start-title">
          <div className="rounded-2xl border border-[#d6e5da] bg-[#eaf2ed] p-5 sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-[.12em] text-[#4c6a5a]">
              Your Guided Explorer starting point
            </p>
            <h2 id="guided-start-title" className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">
              A possibility connected to what you shared
            </h2>
            <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-[#52645a]">
              This is one way to begin exploring, not a recommendation or a decision about your
              future. You can explore any other field too.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {startingPoint.evidence.map((evidence) => (
                <blockquote
                  key={evidence.answerId}
                  className="rounded-xl bg-white p-4 text-sm leading-relaxed text-[#354b40]"
                >
                  <p className="font-semibold text-[#18352d]">{evidence.questionText}</p>
                  {evidence.selectedAnswers.length > 0 && (
                    <p className="mt-2">
                      <span className="font-semibold">You selected: </span>
                      {evidence.selectedAnswers.join(", ")}
                    </p>
                  )}
                  <p className="mt-2">{evidence.explanation}</p>
                </blockquote>
              ))}
              {startingPoint.writtenEvidence.map((note) => (
                <blockquote
                  key={note.id}
                  className="rounded-xl bg-white p-4 text-sm leading-relaxed text-[#354b40]"
                >
                  <p className="font-semibold text-[#18352d]">
                    Your note for “{note.questionText}” (not interpreted)
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">{note.text}</p>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="cb-container space-y-14 pb-16 pt-6 sm:space-y-20 sm:pb-24">
        <section id="field-overview" aria-labelledby="field-overview-title" className="scroll-mt-8">
          <SectionHeading id="field-overview-title" eyebrow="Start with the big picture" title={`What is ${field.name.toLowerCase()} about?`} />
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <article className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7">
              <p className="text-base leading-relaxed text-[#354b40] sm:text-lg">{field.introduction[0]}</p>
              <p className="mt-4 text-base leading-relaxed text-[#354b40] sm:text-lg">{field.introduction[1]}</p>
            </article>
            <div className="grid gap-4">
              <article className="rounded-2xl bg-[#eaf2ed] p-5 sm:p-6">
                <h3 className="font-semibold">An everyday example</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#384a3e] sm:text-base">{field.everydayExample}</p>
              </article>
              <article className="rounded-2xl bg-[#123f34] p-5 text-white sm:p-6">
                <h3 className="font-semibold">Why it matters</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/85 sm:text-base">{field.whyItMatters}</p>
              </article>
            </div>
          </div>
        </section>

        <section aria-labelledby="field-activities-title">
          <SectionHeading id="field-activities-title" eyebrow="The work can vary" title="What might people do?" />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {field.workExamples.map((activity) => (
              <li key={activity} className="rounded-2xl border border-[#dce7df] bg-white p-5 text-sm leading-relaxed text-[#384a3e] sm:text-base">
                {activity}
              </li>
            ))}
          </ul>
          <aside className="mt-4 rounded-2xl bg-[#eaf2ed] p-5 sm:p-7">
            <h3 className="font-serif text-xl font-semibold sm:text-2xl">People, tools and teamwork</h3>
            <p className="mt-3 max-w-[75ch] text-sm leading-relaxed text-[#384a3e] sm:text-base">{field.workContext}</p>
          </aside>
        </section>

        <section aria-labelledby="field-areas-title">
          <SectionHeading id="field-areas-title" eyebrow="One field, many directions" title="Different areas within this field" />
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {field.areas.map((area) => (
              <article key={area.name} className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-6">
                <h3 className="font-serif text-xl font-semibold sm:text-2xl">{area.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#59665e] sm:text-base">{area.description}</p>
                <p className="mt-4 border-l-2 border-[#9fc5ad] pl-3 text-sm leading-relaxed text-[#384a3e] sm:text-base">
                  <span className="font-semibold">For example: </span>{area.example}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="field-study-title">
          <SectionHeading id="field-study-title" eyebrow="Explore at your pace" title="What might studying it involve?" />
          <div role="group" aria-label="Choose which study routes to view" className="mt-6 flex flex-wrap gap-2">
            {stageOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={stageView === option.id}
                onClick={() => setStageView(option.id)}
                className="min-h-11 rounded-full border border-[#cbd9cf] bg-white px-4 text-sm font-semibold text-[#345b49] transition-colors hover:bg-[#eaf2ed] aria-pressed:border-[#145543] aria-pressed:bg-[#145543] aria-pressed:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className={`mt-5 grid gap-4 ${displayedStages.length === 2 ? "lg:grid-cols-2" : ""}`}>
            {displayedStages.map((stage) => (
              <article key={stage} className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7">
                <h3 className="font-serif text-2xl font-semibold">
                  Possible routes after Class {stage === "class-10" ? "10" : "12"}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                  Examples to explore, not a list of confirmed courses or admission requirements.
                </p>
                <ul className="mt-5 space-y-3">
                  {field.studyRoutes[stage].map((route) => (
                    <li key={route} className="flex gap-3 text-sm leading-relaxed text-[#384a3e] sm:text-base">
                      <span aria-hidden="true" className="mt-[.65em] h-2 w-2 shrink-0 rounded-full bg-[#278061]" />
                      {route}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 rounded-xl bg-[#eaf2ed] p-4">
                  <h4 className="text-sm font-semibold">What you may learn</h4>
                  <p className="mt-2 text-sm leading-relaxed text-[#384a3e] sm:text-base">{field.whatYouLearn[stage]}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-4 max-w-[85ch] text-sm leading-relaxed text-[#59665e]">
            Subjects, course availability, entrance requirements and recognition vary by board,
            state and institution. Check current official information before applying.
          </p>
        </section>

        <section aria-labelledby="field-future-title">
          <SectionHeading id="field-future-title" eyebrow="Possibilities, not promises" title="Where could this field lead?" />
          <p className="mt-4 max-w-[72ch] text-sm leading-relaxed text-[#59665e] sm:text-base">
            These are examples of roles and workplaces connected with the field. Each role may
            require different qualifications, experience or registration.
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <article className="rounded-2xl bg-[#eaf2ed] p-5 sm:p-7">
              <h3 className="font-serif text-xl font-semibold sm:text-2xl">Example roles</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {field.opportunities.map((role) => (
                  <li key={role} className="rounded-xl bg-white px-4 py-3 text-sm leading-relaxed text-[#384a3e]">{role}</li>
                ))}
              </ul>
            </article>
            <div className="grid gap-4">
              <InfoList title="Places people may work" items={field.workplaces} />
              <InfoList title="Skills that can help" items={field.usefulSkills} />
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#59665e]">
            {field.reflection}
          </p>
        </section>

        <section aria-labelledby="field-next-title" className="rounded-[1.75rem] bg-[#123f34] p-5 text-white sm:p-8 lg:p-10">
          <SectionHeading id="field-next-title" eyebrow="Choose what to explore next" title="Keep exploring this field." light />
          <div className="mt-6 grid gap-3 md:grid-cols-3 [&>*:nth-child(2)]:[animation-delay:90ms] [&>*:nth-child(3)]:[animation-delay:180ms]">
            <ExploreLink
              href={`/explore/courses?${exploreParams.toString()}`}
              title="Courses"
              description="Browse the shared course catalogue by field and stage."
              icon={BookOpen}
            />
            <ExploreLink
              href={`/explore/institutions?${exploreParams.toString()}`}
              title="Institutions"
              description="Find institutions and offerings connected to this field."
              icon={Landmark}
            />
            <ExploreLink
              href={`/explore/pathways?${exploreParams.toString()}`}
              title="Pathways"
              description="Compare possible study routes for your chosen stage."
              icon={Map}
            />
          </div>
          <Link
            href="/explore/fields"
            className="cb-card-action mt-6 border-[#e9c66b] bg-[#f2cf78] text-[#18352d] hover:border-[#e1b94f] hover:bg-[#e9c15d] active:bg-[#dcb34b]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to all fields
          </Link>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  light = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  light?: boolean;
}) {
  return (
    <div>
      <p className={`text-sm font-semibold uppercase tracking-[.12em] ${light ? "text-white/70" : "text-[#4c6a5a]"}`}>
        {eyebrow}
      </p>
      <h2 id={id} className={`mt-2 max-w-[24ch] font-serif text-3xl font-semibold leading-tight tracking-[-.04em] sm:text-4xl ${light ? "text-white" : "text-[#18352d]"}`}>
        {title}
      </h2>
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-6">
      <h3 className="font-serif text-xl font-semibold">{title}</h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item} className="rounded-full bg-[#eaf2ed] px-3 py-2 text-sm text-[#384a3e]">{item}</li>
        ))}
      </ul>
    </article>
  );
}

function ExploreLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="cb-reveal group relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white p-5 text-[#18352d] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-[#9fc5ad] hover:shadow-[0_16px_34px_rgba(16,45,36,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transform-none motion-reduce:transition-none sm:p-6"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 origin-bottom scale-y-0 bg-[#77b996] transition-transform duration-300 group-hover:scale-y-100 group-focus-visible:scale-y-100 motion-reduce:transition-none" />
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf2ed] transition-colors duration-200 group-hover:bg-[#dce9e0] motion-reduce:transition-none">
        <Icon aria-hidden="true" className="h-5 w-5 text-[#145543]" />
      </span>
      <h3 className="mt-5 font-serif text-xl font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[#59665e]">{description}</p>
      <span className="cb-card-action mt-5 self-start">
        Explore <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </span>
    </Link>
  );
}
