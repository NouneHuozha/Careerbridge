"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  BadgeDollarSign,
  BookOpen,
  ClipboardCheck,
  Info,
  Landmark,
  Map,
  type LucideIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { possibilityFields } from "../discover/possibility-fields";
import { Breadcrumbs } from "../breadcrumbs";
import { getGuidedExploreStartingPoints } from "./explore-data";
import { useCounsellingSession } from "../counselling/counselling-engine";

const featuredFields = [
  possibilityFields.find((field) => field.id === "technology")!,
  possibilityFields.find((field) => field.id === "healthcare")!,
  possibilityFields.find((field) => field.id === "business")!,
];

const destinations = [
  {
    title: "Courses",
    description: "Find courses and qualifications.",
    icon: BookOpen,
    category: "Study options",
    detailLabel: "Explore",
    detail: "Programs and qualifications that match your interests.",
    action: "Explore courses",
    href: "/explore/courses",
  },
  {
    title: "Institutions",
    description: "Discover colleges and institutes.",
    icon: Landmark,
    category: "Places to study",
    detailLabel: "Explore",
    detail: "Colleges and institutes where learning takes place.",
    action: "Explore institutions",
    href: "/explore/institution-directory",
  },
  {
    title: "Pathways",
    description: "Understand study routes after Class 10 or 12.",
    icon: Map,
    category: "Education routes",
    detailLabel: "Plan ahead",
    detail: "Possible next steps after Class 10 or Class 12.",
    action: "Explore pathways",
    href: "/explore/pathways",
  },
];

const supportDestinations = [
  {
    title: "Examinations",
    description:
      "Understand entrance examinations, eligibility and admission processes.",
    icon: ClipboardCheck,
    category: "Admission",
    detailLabel: "Understand",
    detail: "Entrance exams, eligibility and admission processes.",
    action: "Explore examinations",
    href: "/explore/examinations",
  },
  {
    title: "Scholarships",
    description:
      "Discover scholarships, financial assistance and application opportunities.",
    icon: BadgeDollarSign,
    category: "Financial support",
    detailLabel: "Discover",
    detail: "Scholarships and assistance that may support your studies.",
    action: "Explore scholarships",
    href: "/explore/scholarships",
  },
];

export default function ExplorePage() {
  const stored = useCounsellingSession();
  const guidedStartingPoints = getGuidedExploreStartingPoints(stored);
  const afterGuidedExplorer = guidedStartingPoints !== null;
  const startingPoints = guidedStartingPoints ?? [];
  const completedEarly =
    stored.status === "saved" &&
    stored.session.status === "completed" &&
    stored.session.completionReason === "finished_early";
  const unfinishedGuidedExplorer =
    stored.status === "saved" &&
    (stored.session.status === "active" || stored.session.status === "paused");
  const completedWithoutPossibilities =
    afterGuidedExplorer && startingPoints.length === 0;
  const [selectedPossibility, setSelectedPossibility] =
    useState<(typeof startingPoints)[number] | null>(null);
  const possibilityDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (
      selectedPossibility &&
      possibilityDialogRef.current &&
      !possibilityDialogRef.current.open
    ) {
      possibilityDialogRef.current.showModal();
    }
  }, [selectedPossibility]);

  return (
    <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <Breadcrumbs items={[{ label: "Explore" }]} className="pt-4" />
      <section className="cb-container grid gap-6 pb-8 pt-5 sm:gap-8 sm:pb-10 sm:pt-7 lg:grid-cols-[1.15fr_.85fr] lg:items-end lg:gap-10 lg:pb-12 lg:pt-9">
        <div>
          <h1 className="max-w-[12ch] font-serif text-[clamp(3rem,6.5vw,5.8rem)] font-semibold leading-[.95] tracking-[-.055em]">
            Explore your options.
          </h1>
          <p className="mt-7 max-w-[47ch] text-lg leading-relaxed text-[#354b40] sm:text-xl">
            Find out what you can study, where you can study and what paths are available.
          </p>
        </div>
        <aside className="rounded-2xl border border-[#ead39a] bg-[#fff8e8] p-4 text-[#18352d] sm:p-5" aria-labelledby="guidance-title">
          {unfinishedGuidedExplorer ? (
            <div>
              <h2 id="guidance-title" className="font-serif text-xl font-semibold text-[#18352d]">
                Continue your Guided Explorer
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#354b40]">
                You haven&apos;t finished exploring your interests yet. You can continue from where you left off whenever you&apos;re ready.
              </p>
              <Link
                href={stored.session.status === "active" ? "/counselling/conversation" : "/counselling"}
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#145543] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Continue Guided Explorer <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/explore/fields"
                className="mt-1 block min-h-11 content-center text-sm font-semibold text-[#145543] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Explore independently
              </Link>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f7e7b6] text-[#765b24]">
                <Info aria-hidden="true" className="h-4 w-4" />
              </span>
              <div>
                <h2 id="guidance-title" className="text-sm font-semibold text-[#765b24]">A simple way to explore</h2>
                <p className="mt-1 text-sm leading-relaxed text-[#594c32]">
                  Start with a field that interests you. Explore courses, institutions and study routes whenever you&apos;re ready.
                </p>
              </div>
            </div>
          )}
        </aside>
      </section>

      {afterGuidedExplorer && startingPoints.length > 0 ? (
        <section
          className="cb-container pb-10 sm:pb-14"
          aria-labelledby="possibilities-title"
        >
          <div className="rounded-[2rem] bg-[#eaf2ed] p-5 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="cb-reveal text-sm font-semibold text-[#4c6a5a]">From Guided Explorer</p>
                <h2
                  id="possibilities-title"
                  className="cb-reveal mt-2 font-serif text-3xl font-semibold tracking-[-.04em] sm:text-4xl"
                  style={{ animationDelay: "60ms" }}
                >
                  A few places to begin.
                </h2>
                <p
                  className="cb-reveal mt-3 max-w-[68ch] text-base leading-relaxed text-[#354b40]"
                  style={{ animationDelay: "120ms" }}
                >
                  {completedEarly
                    ? "You chose to finish Guided Explorer early. You can explore using what you’ve shared so far."
                    : "These fields connect to things you mentioned during Guided Explorer. They are starting points for exploration, not assessments or limits on what you can explore."}
                </p>
              </div>
              <Link
                href="/counselling/summary"
                className="cb-reveal inline-flex min-h-11 shrink-0 items-center gap-2 self-start text-sm font-semibold text-[#145543] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] sm:self-auto"
                style={{ animationDelay: "160ms" }}
              >
                {completedEarly ? "Review or continue Guided Explorer" : "Review my answers"}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>

            <div
              className={`mt-6 grid grid-cols-1 gap-4 ${
                startingPoints.length === 1
                  ? "max-w-2xl"
                  : startingPoints.length === 2
                    ? "sm:grid-cols-2"
                    : "min-[480px]:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {startingPoints.map(({ field, evidence, writtenEvidence }, index) => {
                const primaryEvidence =
                  evidence.find((item) => item.relationship === "direct") ?? evidence[0];
                return (
                  <article
                    key={field.id}
                    style={{ animationDelay: `${180 + index * 80}ms` }}
                    className="cb-reveal flex h-full flex-col overflow-hidden rounded-2xl bg-white"
                  >
                    <div className="relative aspect-[2.15/1] overflow-hidden bg-[#dce7df]">
                      <Image
                        src={field.image}
                        alt={field.imageAlt}
                        fill
                        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                        loading={index < 3 ? "eager" : "lazy"}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
                      <h3 className="font-serif text-xl font-semibold leading-tight tracking-[-.025em] sm:text-2xl">
                        {field.name}
                      </h3>
                      <p className="mt-2 text-base leading-relaxed text-[#354b40]">
                        {field.description}
                      </p>
                      <div className="mt-5 rounded-xl bg-[#f2f6f2] p-4">
                        <p className="text-base font-semibold text-[#18352d]">Why this appeared</p>
                        <p className="mt-2 text-base leading-relaxed text-[#354b40]">
                          {primaryEvidence.explanation}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPossibility({ field, evidence, writtenEvidence })
                          }
                          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#145543] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                        >
                          See explanation and your answers
                          <Info aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-auto pt-4">
                        <Link
                          href={`/explore/fields/${field.id}?from=guided`}
                          className="cb-card-action w-full justify-center"
                        >
                          Explore {field.name}
                          <ArrowRight aria-hidden="true" className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <dialog
              ref={possibilityDialogRef}
              aria-labelledby="possibility-dialog-title"
              onClose={() => setSelectedPossibility(null)}
              onClick={(event) => {
                if (event.target === event.currentTarget) event.currentTarget.close();
              }}
              className="m-auto max-h-[min(88dvh,52rem)] w-[min(42rem,calc(100%-2rem))] overflow-y-auto rounded-3xl border-0 bg-white p-0 text-[#18352d] shadow-2xl backdrop:bg-[#18352d]/60"
            >
              {selectedPossibility && (
                <div className="p-5 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#4c6a5a]">Why this appeared</p>
                      <h2
                        id="possibility-dialog-title"
                        className="mt-1 font-serif text-2xl font-semibold tracking-[-.03em] sm:text-3xl"
                      >
                        {selectedPossibility.field.name}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => possibilityDialogRef.current?.close()}
                      aria-label="Close explanation"
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f2f6f2] text-[#18352d] transition-colors hover:bg-[#e3ece5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                    >
                      <X aria-hidden="true" className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mt-4 text-base leading-relaxed text-[#354b40]">
                    {selectedPossibility.evidence.find(
                      (item) => item.relationship === "direct",
                    )?.explanation ?? selectedPossibility.evidence[0]?.explanation}
                  </p>
                  <div className="mt-5 grid gap-3">
                    {selectedPossibility.evidence.map((item) => (
                      <div key={item.answerId} className="rounded-xl bg-[#f2f6f2] p-4">
                        <p className="text-sm font-semibold leading-relaxed text-[#18352d]">
                          {item.questionText}
                        </p>
                        <blockquote className="mt-2 border-l-2 border-[#8da99a] pl-3 text-base font-medium leading-relaxed text-[#18352d]">
                          {item.selectedAnswers.join(", ")}
                        </blockquote>
                        <p className="mt-2 text-sm leading-relaxed text-[#354b40]">
                          {item.explanation}
                        </p>
                      </div>
                    ))}
                    {selectedPossibility.writtenEvidence.map((note) => (
                      <div key={note.id} className="rounded-xl bg-[#f2f6f2] p-4">
                        <p className="text-sm font-semibold leading-relaxed text-[#18352d]">
                          Your note for “{note.questionText}”{" "}
                          <span className="font-normal text-[#52645a]">(not interpreted)</span>
                        </p>
                        <blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-[#8da99a] pl-3 text-base leading-relaxed text-[#354b40]">
                          {note.text}
                        </blockquote>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </dialog>

            <div className="mt-6 rounded-2xl bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5">
              <div>
                <h2 className="font-serif text-xl font-semibold tracking-[-.025em]">
                  Want to explore other fields?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#354b40]">
                  Browse every field, including ones not shown above.
                </p>
              </div>
              <Link
                href="/explore/fields"
                className="cb-card-action mt-4 w-full justify-between sm:mt-0 sm:w-auto sm:shrink-0"
              >
                Explore all fields <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="cb-container pb-10 sm:pb-14" aria-labelledby="fields-title">
          <div className="grid overflow-hidden rounded-[2rem] bg-[#eaf2ed] lg:grid-cols-[.86fr_1.14fr]">
            <div className="p-5 sm:p-8 lg:flex lg:items-center lg:py-9 lg:pl-9 lg:pr-4">
              <div className="w-full">
                <p className="text-sm font-semibold text-[#4c6a5a]">
                  Discover areas of study and work
                </p>
                <h2
                  id="fields-title"
                  className="mt-4 max-w-[16ch] font-serif text-3xl font-semibold leading-tight tracking-[-.04em] sm:text-4xl"
                >
                  {completedWithoutPossibilities
                    ? "Explore fields at your own pace."
                    : unfinishedGuidedExplorer
                      ? "Explore fields."
                      : "Find a field to begin with."}
                </h2>
                <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-[#59665e]">
                  {completedWithoutPossibilities
                    ? "Your answers don’t have to point to a particular field. Browse different areas and discover what interests you along the way."
                    : unfinishedGuidedExplorer
                      ? "You can browse all fields even if you haven’t completed Guided Explorer."
                      : "Explore Technology, Healthcare, Business and more. These are starting points, not recommendations."}
                </p>
                <Link
                  href="/explore/fields"
                  className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  Discover fields <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="grid min-h-[220px] grid-cols-3 gap-1.5 p-1.5 sm:min-h-[300px] sm:gap-2 sm:p-2">
              {featuredFields.map((field, index) => (
                <div
                  key={field.id}
                  className={`relative overflow-hidden rounded-[1.35rem] ${index === 1 ? "mt-6 sm:mt-12" : index === 2 ? "mt-3 sm:mt-6" : ""}`}
                >
                  <Image
                    src={field.image}
                    alt={field.imageAlt}
                    fill
                    sizes="(max-width: 1023px) 33vw, 24vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="cb-container pb-14 sm:pb-20" aria-labelledby="destinations-title">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 id="destinations-title" className="font-serif text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Then go deeper.</h2>
            <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-[#59665e]">Once something interests you, explore the related courses, institutions and study routes.</p>
          </div>
          <span className="text-sm font-semibold text-[#6b7b71]">Choose your own pace</span>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {destinations.map((destination, index) => (
            <ExploreDestinationCard
              key={destination.title}
              {...destination}
              index={index}
            />
          ))}
        </div>

        <section
          className="mt-12 border-t border-[#dce7df] pt-9 sm:mt-16 sm:pt-12"
          aria-labelledby="support-title"
        >
          <div className="max-w-2xl">
            <h2
              id="support-title"
              className="font-serif text-3xl font-semibold tracking-[-.04em] sm:text-4xl"
            >
              Admission &amp; financial support
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#59665e]">
              Understand admission requirements and discover financial support
              for your education.
            </p>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {supportDestinations.map((destination, index) => (
              <ExploreDestinationCard
                key={destination.title}
                {...destination}
                index={index}
              />
            ))}
          </div>
        </section>
      </section>

      <footer className="bg-[#18352d] px-5 py-14 text-center text-[#f7f8f5] sm:py-20">
        <p className="font-serif text-3xl tracking-[-.03em] sm:text-4xl">You don&apos;t have to decide everything today.</p>
        <p className="mt-3 text-base text-[#c8ddd0]">Take your time. Curiosity is a good place to start.</p>
      </footer>
    </main>
  );
}

function ExploreDestinationCard({
  title,
  description,
  icon: Icon,
  category,
  detailLabel,
  detail,
  action,
  href,
  index,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  category: string;
  detailLabel: string;
  detail: string;
  action: string;
  href?: string;
  index: number;
}) {
  const titleId = `destination-${title.toLowerCase()}`;
  const className =
    "cb-reveal group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce7df] bg-white p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-[#9fc5ad] hover:shadow-[0_16px_34px_rgba(16,45,36,0.1)] motion-reduce:transform-none sm:p-6";
  const content = (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 origin-bottom scale-y-0 bg-[#77b996] transition-transform duration-300 group-hover:scale-y-100"
      />
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf2ed]">
          <Icon aria-hidden="true" className="h-5 w-5 text-[#145543]" />
        </span>
        <span className="rounded-full bg-[#eaf2ed] px-3 py-1 text-xs font-semibold text-[#145543]">
          {category}
        </span>
      </div>
      <h3
        id={titleId}
        className="mt-4 font-serif text-[1.4rem] font-semibold leading-tight tracking-[-.025em]"
      >
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
        {description}
      </p>
      <div className="mt-4 rounded-xl bg-[#f5f8f5] px-3.5 py-3 text-sm leading-relaxed text-[#52645a]">
        <span className="font-semibold text-[#18352d]">{detailLabel}</span>
        <span className="mx-2 text-[#a2b1a7]">·</span>
        {detail}
      </div>
      <div className="mt-auto pt-5">
        <span
          className={`cb-card-action self-start ${href ? "" : "cb-card-action-disabled"}`}
        >
          {href ? action : "Coming soon"}
          {href ? (
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          ) : null}
        </span>
      </div>
    </>
  );

  return href ? (
    <Link
      href={href}
      aria-labelledby={titleId}
      className={`${className} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {content}
    </Link>
  ) : (
    <article
      aria-labelledby={titleId}
      className={className}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {content}
    </article>
  );
}
