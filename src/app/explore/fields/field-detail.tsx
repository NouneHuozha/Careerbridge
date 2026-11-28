"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Landmark, Map, type LucideIcon } from "lucide-react";
import { Breadcrumbs } from "../../breadcrumbs";
import { getGuidedExploreStartingPoints } from "../explore-data";
import { SavedItemButton } from "../saved-item-button";
import { useCounsellingSession } from "../../counselling/counselling-engine";
import type { StudyStage } from "./field-data";
import type { PublishedField } from "../../../db/fields";
import { getFieldImage } from "./field-image";

export function FieldDetail({
  field,
  initialStage,
  fromGuidedExplorer,
}: {
  field: PublishedField;
  initialStage?: StudyStage;
  fromGuidedExplorer: boolean;
}) {
  const storedCounselling = useCounsellingSession();
  const startingPoint = fromGuidedExplorer
    ? getGuidedExploreStartingPoints(storedCounselling)?.find(
        (suggestion) => suggestion.field.id === field.id,
      )
    : undefined;
  const exploreParams = new URLSearchParams({ field: field.id });
  if (initialStage) exploreParams.set("stage", initialStage);

  return (
    <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <Breadcrumbs
        items={[
          { label: "Explore", href: "/explore" },
          { label: "Fields", href: "/explore/fields" },
          { label: field.title },
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
              {field.title}
            </h1>
            <p className="mt-5 max-w-[58ch] text-lg leading-relaxed text-[#354b40] sm:text-xl">
              {field.summary ?? field.content.introduction}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a href="#field-overview" className="cb-card-action inline-flex">
                Understand the field <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <SavedItemButton
                type="field"
                id={field.id}
                context={initialStage ? { stage: initialStage } : undefined}
              />
            </div>
          </div>
          <div className="relative min-h-56 overflow-hidden rounded-[1.75rem] bg-[#dce7df] sm:min-h-80">
            <Image
              src={getFieldImage(field.id)}
              alt=""
              fill
              unoptimized
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
              This is one way to begin exploring, not a recommendation or a decision about your future.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {startingPoint.evidence.map((evidence) => (
                <blockquote key={evidence.answerId} className="rounded-xl bg-white p-4 text-sm leading-relaxed text-[#354b40]">
                  <p className="font-semibold text-[#18352d]">{evidence.questionText}</p>
                  {evidence.selectedAnswers.length > 0 && (
                    <p className="mt-2"><span className="font-semibold">You selected: </span>{evidence.selectedAnswers.join(", ")}</p>
                  )}
                  <p className="mt-2">{evidence.explanation}</p>
                </blockquote>
              ))}
              {startingPoint.writtenEvidence.map((note) => (
                <blockquote key={note.id} className="rounded-xl bg-white p-4 text-sm leading-relaxed text-[#354b40]">
                  <p className="font-semibold text-[#18352d]">Your note for “{note.questionText}” (not interpreted)</p>
                  <p className="mt-2 whitespace-pre-wrap">{note.text}</p>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="cb-container space-y-14 pb-16 pt-6 sm:space-y-20 sm:pb-24">
        <section id="field-overview" aria-labelledby="field-overview-title" className="scroll-mt-8">
          <SectionHeading id="field-overview-title" eyebrow="Start with the big picture" title={`What is ${field.title.toLowerCase()} about?`} />
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <article className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7">
              <p className="text-base leading-relaxed text-[#354b40] sm:text-lg">{field.content.introduction}</p>
            </article>
            <article className="rounded-2xl bg-[#eaf2ed] p-5 sm:p-7">
              <h3 className="font-semibold">What it broadly involves</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#384a3e] sm:text-base">{field.content.broadlyInvolves}</p>
            </article>
          </div>
        </section>

        <section aria-labelledby="field-activities-title">
          <SectionHeading id="field-activities-title" eyebrow="The work can vary" title="What might people do?" />
          <article className="mt-6 rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7">
            <p className="text-sm leading-relaxed text-[#384a3e] sm:text-base">{field.content.activitiesAndWorkAreas}</p>
          </article>
        </section>

        <section aria-labelledby="field-learning-title">
          <SectionHeading id="field-learning-title" eyebrow="Useful foundations" title="What might you learn or connect with?" />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7">
              <h3 className="font-serif text-xl font-semibold">Learning and subject connections</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#384a3e] sm:text-base">{field.content.learningAndSubjectConnections}</p>
            </article>
            <article className="rounded-2xl bg-[#eaf2ed] p-5 sm:p-7">
              <h3 className="font-serif text-xl font-semibold">Course families to explore</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#384a3e] sm:text-base">{field.content.courseFamiliesToExplore}</p>
            </article>
          </div>
        </section>

        <section aria-labelledby="field-further-title">
          <SectionHeading id="field-further-title" eyebrow="Explore carefully" title="Before you make a choice" />
          <article className="mt-6 rounded-2xl bg-[#123f34] p-5 text-white sm:p-7">
            <p className="text-sm leading-relaxed text-white/90 sm:text-base">{field.content.furtherExploration}</p>
            {field.provenance.length > 0 && (
              <div className="mt-5 border-t border-white/20 pt-4">
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-white/70">Source context</p>
                <ul className="mt-3 space-y-2">
                  {field.provenance.map((source) =>
                    source.canonicalUrl ? (
                      <li key={`${source.sourceId}:${source.claimKey}`} className="text-sm">
                        <a href={source.canonicalUrl} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">
                          {source.sourceName}
                        </a>
                        {source.checkedAt && (
                          <span className="ml-2 text-white/70">
                            Checked {source.checkedAt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}.
                          </span>
                        )}
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            )}
          </article>
        </section>

        <section aria-labelledby="field-next-title" className="rounded-[1.75rem] bg-[#123f34] p-5 text-white sm:p-8 lg:p-10">
          <SectionHeading id="field-next-title" eyebrow="Choose what to explore next" title="Keep exploring this field." light />
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <ExploreLink href={`/explore/courses?${exploreParams.toString()}`} title="Courses" description="Browse the shared course catalogue by field and stage." icon={BookOpen} />
            <ExploreLink href={`/explore/institutions?${exploreParams.toString()}`} title="Institutions" description="Find institutions and offerings connected to this field." icon={Landmark} />
            <ExploreLink href={`/explore/pathways?${exploreParams.toString()}`} title="Pathways" description="Compare possible study routes for your chosen stage." icon={Map} />
          </div>
          <Link href="/explore/fields" className="cb-card-action mt-6 border-[#e9c66b] bg-[#f2cf78] text-[#18352d] hover:border-[#e1b94f] hover:bg-[#e9c15d]">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to all fields
          </Link>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ id, eyebrow, title, light = false }: { id: string; eyebrow: string; title: string; light?: boolean }) {
  return (
    <div>
      <p className={`text-sm font-semibold uppercase tracking-[.12em] ${light ? "text-white/70" : "text-[#4c6a5a]"}`}>{eyebrow}</p>
      <h2 id={id} className={`mt-2 max-w-[24ch] font-serif text-3xl font-semibold leading-tight tracking-[-.04em] sm:text-4xl ${light ? "text-white" : "text-[#18352d]"}`}>{title}</h2>
    </div>
  );
}

function ExploreLink({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: LucideIcon }) {
  return (
    <Link href={href} className="cb-reveal group relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white p-5 text-[#18352d] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-[#9fc5ad] hover:shadow-[0_16px_34px_rgba(16,45,36,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf2ed]"><Icon aria-hidden="true" className="h-5 w-5 text-[#145543]" /></span>
      <h3 className="mt-5 font-serif text-xl font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[#59665e]">{description}</p>
      <span className="cb-card-action mt-5 self-start">Explore <ArrowRight aria-hidden="true" className="h-4 w-4" /></span>
    </Link>
  );
}
