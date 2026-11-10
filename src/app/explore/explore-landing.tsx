"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  GraduationCap,
  Map,
  PanelsTopLeft,
} from "lucide-react";
import { SiteHeader } from "../site-header";
import {
  counsellingQuestionById,
  normalizeCounsellingSelection,
} from "../counselling/counselling-data";
import {
  useCounsellingSession,
  type CounsellingAnswer,
} from "../counselling/counselling-engine";

const fieldByCounsellingOption: Record<string, string[]> = {
  "using-computers-or-technology": ["Technology"],
  "drawing-designing-or-making-things": ["Arts & Design"],
  "reading-learning-or-discovering": ["Science & Research"],
  "sports-or-physical-activity": ["Sports & Wellness"],
  "helping-or-spending-time-with-people": ["Healthcare", "Education"],
  "puzzles-or-figuring-things-out": ["Engineering", "Technology"],
  "videos-movies-or-content": ["Media"],
  games: ["Technology", "Media"],
  "hands-on-activities": ["Engineering"],
  "outdoors-or-nature": ["Agriculture & Environment"],
  "technology-or-machines": ["Technology"],
  "the-human-body": ["Science & Research"],
  "nature-or-the-world": ["Science & Research", "Agriculture & Environment"],
  "people-or-behaviour": ["Social Sciences"],
  "business-or-money": ["Business & Management"],
  "design-or-creation": ["Arts & Design"],
  "stories-or-media": ["Media"],
};

const fieldDescriptions: Record<string, string> = {
  Technology: "You mentioned computers, technology or machines.",
  "Arts & Design": "You mentioned making, designing or creating.",
  "Science & Research": "You mentioned learning, discovering or asking questions.",
  "Sports & Wellness": "You mentioned sports or physical activity.",
  Healthcare: "You mentioned helping or spending time with people.",
  Education: "You mentioned helping or spending time with people.",
  Engineering: "You mentioned hands-on activities or figuring things out.",
  Media: "You mentioned stories, media, videos or content.",
  "Agriculture & Environment": "You mentioned outdoors, nature or the world around you.",
  "Social Sciences": "You mentioned people or behaviour.",
  "Business & Management": "You mentioned business or money.",
};

function selectedOptionIds(answer: CounsellingAnswer) {
  const question = counsellingQuestionById.get(answer.questionId);
  return question ? normalizeCounsellingSelection(question, answer.optionIds) : [];
}

function getSuggestedFields(answers: CounsellingAnswer[]) {
  const fields: { name: string; description: string }[] = [];
  const seen = new Set<string>();

  for (const answer of answers) {
    for (const optionId of selectedOptionIds(answer)) {
      for (const name of fieldByCounsellingOption[optionId] ?? []) {
        if (seen.has(name)) continue;
        seen.add(name);
        fields.push({ name, description: fieldDescriptions[name] });
      }
    }
  }

  return fields.slice(0, 4);
}

const catalogue = [
  {
    title: "Fields",
    description: "Discover areas of study and work.",
    icon: PanelsTopLeft,
  },
  {
    title: "Courses",
    description: "Explore programmes and qualifications.",
    icon: GraduationCap,
  },
  {
    title: "Institutions",
    description: "Find colleges and training centres.",
    icon: Building2,
  },
  {
    title: "Pathways",
    description: "Understand different education routes.",
    icon: Map,
  },
] as const;

export function ExploreLanding() {
  const stored = useCounsellingSession();
  const answers =
    stored.status === "saved" ? stored.session.answers : [];
  const suggestedFields = getSuggestedFields(answers);

  return (
    <>
      <SiteHeader dark />
      <main className="min-h-svh bg-[#080b0a] text-[#f4f4ef]">
        <div className="mx-auto max-w-6xl px-5 pb-20 pt-28 sm:px-8 sm:pt-36 lg:px-12">
          <div className="max-w-3xl border-t border-white/10 pt-7 sm:pt-9">
            <h1 className="max-w-[18ch] text-4xl font-semibold leading-[1.05] tracking-[-.045em] sm:text-6xl">
              Explore different fields, courses, institutions and pathways.
            </h1>
            <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-white/65 sm:text-xl">
              Take your time finding out what interests you.
            </p>
          </div>

          <section
            aria-labelledby="starting-point-title"
            className="mt-12 rounded-[1.75rem] bg-[#292a29] p-6 sm:p-9 lg:p-10"
          >
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <h2
                  id="starting-point-title"
                  className="text-3xl font-semibold tracking-[-.035em] sm:text-4xl"
                >
                  Your starting point
                </h2>
                <p className="mt-4 text-xl text-white/65 sm:text-2xl">
                  Based on what you&apos;ve shared
                </p>
              </div>
              {suggestedFields.length > 0 && (
                <span className="rounded-full bg-[#1d5d3d] px-4 py-2 text-sm font-semibold text-[#7af0a0]">
                  Based on your answers
                </span>
              )}
            </div>

            {suggestedFields.length > 0 ? (
              <>
                <div className="mt-7 flex flex-wrap gap-3">
                  {suggestedFields.map((field) => (
                    <span
                      key={field.name}
                      className="rounded-full bg-[#424342] px-5 py-2.5 text-lg font-medium text-white/90"
                    >
                      {field.name}
                    </span>
                  ))}
                </div>
                <p className="mt-7 max-w-[58ch] text-lg leading-relaxed text-white/65">
                  These are suggestions to explore, not rankings. You can explore any field.
                </p>
              </>
            ) : (
              <p className="mt-7 max-w-[58ch] text-lg leading-relaxed text-white/65">
                You haven&apos;t shared enough for a starting point yet. You can explore any field
                at your own pace.
              </p>
            )}
          </section>

          <section aria-labelledby="explore-anything-title" className="mt-12">
            <h2 id="explore-anything-title" className="text-2xl font-semibold tracking-[-.03em] sm:text-3xl">
              Or explore anything you like
            </h2>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {catalogue.map(({ title, description, icon: Icon }) => (
                <Link
                  key={title}
                  href="/discover/results"
                  className="group min-h-32 rounded-2xl border border-white/15 p-5 transition-colors hover:border-[#55c779]/60 hover:bg-white/[.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7af0a0] sm:p-6"
                >
                  <Icon aria-hidden="true" className="h-6 w-6 text-[#78b18d]" />
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#56dd85]">
                    Explore <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
