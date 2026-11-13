import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Building2,
  Check,
  CircleHelp,
  Compass,
  FileCheck2,
  GraduationCap,
  Map,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "../site-header";

export const metadata: Metadata = {
  title: "How it works | CareerBridge",
  description:
    "Learn how to explore study options, understand CareerBridge information, and manage your progress.",
};

const guideLinks = [
  { number: "01", label: "Choose how to begin", href: "#choose" },
  { number: "02", label: "Keep your progress", href: "#progress" },
  { number: "03", label: "Get started with Discover", href: "#discover" },
  { number: "04", label: "Explore the sections", href: "#explore" },
  { number: "05", label: "Use detail pages", href: "#details" },
  { number: "06", label: "Use information carefully", href: "#information" },
];

const exploreSections = [
  {
    name: "Fields",
    description: "Understand broad areas of study and work.",
    when: "When you want to learn what an area involves.",
    href: "/explore/fields",
    icon: Compass,
  },
  {
    name: "Courses",
    description: "Find programmes, qualifications and entry requirements.",
    when: "When you want to know what you can study.",
    href: "/explore/courses",
    icon: GraduationCap,
  },
  {
    name: "Institutions",
    description: "Discover colleges, universities and other places to study.",
    when: "When you want to compare places to study.",
    href: "/explore/institution-directory",
    icon: Building2,
  },
  {
    name: "Pathways",
    description: "Understand possible education routes after Class 10 or 12.",
    when: "When you want to see what could come next.",
    href: "/explore/pathways",
    icon: Map,
  },
  {
    name: "Examinations",
    description: "Learn about entrance and qualifying examinations.",
    when: "When you need to understand an exam or its requirements.",
    href: "/explore/examinations",
    icon: FileCheck2,
  },
  {
    name: "Scholarships",
    description: "Explore financial assistance and scholarship opportunities.",
    when: "When you want to find possible financial support.",
    href: "/explore/scholarships",
    icon: Sparkles,
  },
];

const faqs = [
  {
    question: "Do I need to know what career I want?",
    answer: "No. You can start without a particular career in mind.",
  },
  {
    question: "Will CareerBridge decide what I should become?",
    answer:
      "No. It helps you understand possibilities and information. Your decisions remain yours.",
  },
  {
    question: "Do I have to use every section in order?",
    answer:
      "No. You can explore sections independently and follow connections whenever they are useful.",
  },
  {
    question: "Can I use CareerBridge without an account?",
    answer:
      "Yes. You can browse and explore as a guest. Temporary progress stays in this tab; sign in or create an account to save items and keep supported progress across visits and devices.",
  },
  {
    question: "What if some information is missing?",
    answer:
      "Some details may not be available. Check the official source rather than assuming information that is not shown.",
  },
];

function SectionHeading({
  id,
  number,
  eyebrow,
  title,
  description,
  dark = false,
}: {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  dark?: boolean;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] md:items-end md:gap-10">
      <div>
        <p
          className={`text-xs font-bold uppercase tracking-[.18em] ${
            dark ? "text-[#f2cf78]" : "text-[#28614f]"
          }`}
        >
          {number} — {eyebrow}
        </p>
        <h2
          id={id}
          className={`mt-4 max-w-[14ch] font-serif text-[clamp(2.2rem,4.7vw,4rem)] font-semibold leading-[1.02] tracking-[-.05em] ${
            dark ? "text-white" : "text-[#102d26]"
          }`}
        >
          {title}
        </h2>
      </div>
      <p
        className={`max-w-[56ch] text-base leading-relaxed sm:text-lg ${
          dark ? "text-white/75" : "text-[#4f6158]"
        }`}
      >
        {description}
      </p>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-[#fbfaf6] text-[#18352d]">
        <div className="bg-[#123f34] text-white">
          <div className="cb-container pb-14 pt-8 sm:pb-20 sm:pt-12">
            <nav aria-label="Breadcrumb" className="text-sm text-white/70">
              <Link className="underline-offset-4 hover:underline" href="/">
                Home
              </Link>
              <span aria-hidden="true" className="px-2">/</span>
              <span aria-current="page" className="text-white">How it works</span>
            </nav>
            <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,.7fr)] lg:items-end lg:gap-16">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-[#f2cf78]">
                  CareerBridge user guide
                </p>
                <h1 className="mt-5 max-w-[12ch] font-serif text-[clamp(3.2rem,8vw,6.6rem)] font-semibold leading-[.94] tracking-[-.06em]">
                  How to use CareerBridge
                </h1>
                <p className="mt-6 max-w-[54ch] text-base leading-relaxed text-white/80 sm:text-lg">
                  Understand your options, find the information you need and
                  explore at your own pace.
                </p>
                <p className="mt-4 max-w-[59ch] text-sm leading-relaxed text-white/70 sm:text-base">
                  CareerBridge brings together information about fields,
                  courses, institutions, education pathways, examinations and
                  scholarships. This guide explains what you can do in each
                  section and how to make use of the information.
                </p>
              </div>
              <div className="border-t border-white/20 pt-6">
                <p className="text-sm font-semibold text-white">By the end of this guide</p>
                <ul className="mt-4 space-y-3">
                  {[
                    "Choose a suitable way to begin",
                    "Find the information you need",
                    "Understand course and institution details",
                    "Know where your progress is kept",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-white/80">
                      <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#f2cf78]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <a
              href="#guide"
              className="mt-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2cf78]"
            >
              Read the guide
              <ArrowDown aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </div>

        <section
          id="guide"
          aria-labelledby="guide-title"
          className="cb-container py-12 sm:py-16"
        >
          <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#d7ddd6] pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#28614f]">
                A guide to CareerBridge
              </p>
              <h2 id="guide-title" className="mt-2 font-serif text-2xl font-semibold tracking-[-.035em] sm:text-3xl">
                In this guide
              </h2>
            </div>
            <p className="max-w-[42ch] text-sm leading-relaxed text-[#59665e]">
              Choose a topic to jump to its explanation, or read from the beginning.
            </p>
          </div>
          <nav aria-label="How it works sections" className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3">
            {guideLinks.map(({ number, label, href }) => (
              <a
                key={number}
                href={href}
                className="group flex min-h-16 items-center gap-4 border-b border-[#d7ddd6] py-4 pr-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#145543]"
              >
                <span className="font-mono text-xs font-semibold text-[#7b8d82]">{number}</span>
                <span className="flex-1 text-sm font-semibold text-[#18352d] transition-colors group-hover:text-[#28614f]">
                  {label}
                </span>
                <ArrowRight aria-hidden="true" className="h-4 w-4 text-[#7b8d82] transition-transform group-hover:translate-x-1" />
              </a>
            ))}
          </nav>
        </section>

        <section id="choose" aria-labelledby="choose-title" className="scroll-mt-20 bg-[#eaf1e9] py-14 sm:py-20">
          <div className="cb-container">
            <SectionHeading
              id="choose-title"
              number="01"
              eyebrow="Choose how you want to use CareerBridge"
              title="Not every student starts in the same place."
              description="Some students are unsure. Some already have a particular interest. Others simply want to browse. Choose a starting point that feels right; you can change direction whenever you like."
            />
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              <article className="flex flex-col border-t-2 border-[#28614f] bg-[#fbfaf6] p-6 sm:p-7">
                <span className="w-fit rounded-full bg-[#dceadd] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#205844]">
                  Available
                </span>
                <h3 className="mt-5 font-serif text-2xl font-semibold tracking-[-.035em]">
                  1. I&apos;m unsure
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                  You don&apos;t yet know what field or course to explore.
                </p>
                <div className="mt-6 border-t border-[#d7ddd6] pt-5">
                  <p className="font-semibold">Try Guided Explorer</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                    Reflect on your interests and preferences through optional
                    questions. You can also use Discover to choose a class
                    context and activities.
                  </p>
                  <Link href="/counselling" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#145543] underline decoration-[#9ab6a5] underline-offset-4 hover:decoration-[#145543]">
                    Open Guided Explorer <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
              </article>
              <article className="flex flex-col border-t-2 border-[#28614f] bg-[#fbfaf6] p-6 sm:p-7">
                <span className="w-fit rounded-full bg-[#dceadd] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#205844]">
                  Available
                </span>
                <h3 className="mt-5 font-serif text-2xl font-semibold tracking-[-.035em]">
                  2. I have something in mind
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                  You already have a field, course or topic you want to explore.
                </p>
                <div className="mt-6 border-t border-[#d7ddd6] pt-5">
                  <p className="font-semibold">Start with your interest</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                    Open the relevant Explore section directly. Your chosen
                    topic can be your starting point; it doesn&apos;t limit
                    what else you can browse.
                  </p>
                  <Link href="/explore" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#145543] underline decoration-[#9ab6a5] underline-offset-4 hover:decoration-[#145543]">
                    Browse Explore <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
              </article>
              <article className="flex flex-col border-t-2 border-[#28614f] bg-[#fbfaf6] p-6 sm:p-7">
                <span className="w-fit rounded-full bg-[#dceadd] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#205844]">
                  Available
                </span>
                <h3 className="mt-5 font-serif text-2xl font-semibold tracking-[-.035em]">
                  3. I want to explore independently
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                  You prefer browsing without counselling or a specific starting interest.
                </p>
                <div className="mt-6 border-t border-[#d7ddd6] pt-5">
                  <p className="font-semibold">Browse on your own</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                    Explore fields and education information directly. You
                    don&apos;t have to answer questions first.
                  </p>
                  <Link href="/explore" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#145543] underline decoration-[#9ab6a5] underline-offset-4 hover:decoration-[#145543]">
                    Explore independently <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            </div>
            <aside className="mt-5 flex gap-4 border-l-2 border-[#c99d39] bg-[#f7f1df] px-5 py-4 sm:px-6">
              <CircleHelp aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#85641c]" />
              <p className="text-sm leading-relaxed text-[#51462d]">
                These are different ways to begin, not different levels of
                students. Having an interest doesn&apos;t mean you cannot
                explore other fields. Your starting point never restricts what
                you can browse.
              </p>
            </aside>
          </div>
        </section>

        <section id="progress" aria-labelledby="progress-title" className="scroll-mt-20 py-14 sm:py-20">
          <div className="cb-container">
            <SectionHeading
              id="progress-title"
              number="02"
              eyebrow="Keep your progress"
              title="Your exploration is not account-synced yet."
              description="You can browse CareerBridge without creating an account. Account sign-in and sign-up are available, but your exploration and saved items are currently kept in browser storage, not permanently attached to your account."
            />
            <div className="mt-10 grid gap-8 border-y border-[#d7ddd6] py-7 md:grid-cols-3 md:gap-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#28614f]">With an account</p>
                <p className="mt-3 text-sm leading-relaxed text-[#59665e]">
                  You can create an account or sign in. At the moment, this
                  does not sync Guided Explorer answers or saved items to your account.
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#28614f]">Without an account</p>
                <p className="mt-3 text-sm leading-relaxed text-[#59665e]">
                  You can still browse and use the exploration tools. Some
                  choices are held in the current tab; others remain in this
                  browser until its data is cleared.
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#28614f]">What to keep in mind</p>
                <p className="mt-3 text-sm leading-relaxed text-[#59665e]">
                  Closing a tab or clearing browser data can remove some
                  progress. Don&apos;t rely on account sign-in as a backup for
                  exploration data yet.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <Link href="/sign-up" className="inline-flex min-h-11 items-center gap-2 font-semibold text-[#145543] underline decoration-[#9ab6a5] underline-offset-4 hover:decoration-[#145543]">
                Create an account <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link href="/sign-in" className="inline-flex min-h-11 items-center font-semibold text-[#145543] underline decoration-[#9ab6a5] underline-offset-4 hover:decoration-[#145543]">
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section id="discover" aria-labelledby="discover-title" className="scroll-mt-20 bg-[#123f34] py-14 text-white sm:py-20">
          <div className="cb-container">
            <SectionHeading
              id="discover-title"
              number="03"
              eyebrow="Getting started with Discover"
              title="If you're unsure, Discover can help you find a starting point."
              description="Discover begins with your education stage and a few optional activity choices. They help organise possible areas to look into; they are not a test of your ability or a prediction of your future."
              dark
            />
            <div className="mt-10 grid gap-x-10 gap-y-9 md:grid-cols-2">
              <article className="border-t border-white/25 pt-5">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#f2cf78]">Step 1</p>
                <h3 className="mt-3 font-serif text-2xl font-semibold">Select your education stage</h3>
                <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-white/70">
                  Choose the stage that applies to you. CareerBridge currently focuses on Class 10 and Class 12 students.
                </p>
                <div className="mt-5 flex gap-3">
                  {["Class 10", "Class 12"].map((stage) => (
                    <span key={stage} className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold">
                      {stage}
                    </span>
                  ))}
                </div>
              </article>
              <article className="border-t border-white/25 pt-5">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#f2cf78]">Step 2</p>
                <h3 className="mt-3 font-serif text-2xl font-semibold">Share activities (optional)</h3>
                <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-white/70">
                  Choose up to three activities or things you enjoy, or skip this part. Your answers help organise initial possibilities; they do not measure your ability.
                </p>
                <ul className="mt-5 flex flex-wrap gap-2 text-sm text-white/85">
                  {["Using computers or phones", "Drawing or designing", "Solving problems"].map((activity) => (
                    <li key={activity} className="rounded-full bg-white/10 px-3 py-2">{activity}</li>
                  ))}
                </ul>
              </article>
              <article className="border-t border-white/25 pt-5">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#f2cf78]">Step 3</p>
                <h3 className="mt-3 font-serif text-2xl font-semibold">Understand your possibilities</h3>
                <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-white/70">
                  Results show fields that may be worth exploring. Open “Why this appeared” to see the answer or activity behind a possibility.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="border border-white/15 p-4">
                    <p className="font-semibold">Technology</p>
                    <p className="mt-1 text-sm text-white/65">Computers, software and digital systems.</p>
                    <span className="mt-3 inline-block text-xs font-semibold text-[#f2cf78]">Why this appeared</span>
                  </div>
                  <div className="border border-white/15 p-4">
                    <p className="font-semibold">Arts &amp; Design</p>
                    <p className="mt-1 text-sm text-white/65">Visual creativity and design.</p>
                    <span className="mt-3 inline-block text-xs font-semibold text-[#f2cf78]">Why this appeared</span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-white/55">Illustrative result preview, not a career prediction or ranking.</p>
              </article>
              <article className="border-t border-white/25 pt-5">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#f2cf78]">Step 4</p>
                <h3 className="mt-3 font-serif text-2xl font-semibold">Choose how to continue</h3>
                <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-white/70">
                  Browse fields and opportunities on your own, or open Guided Explorer to reflect on your interests through optional questions.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/explore" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f2cf78] px-4 text-sm font-semibold text-[#18352d] hover:bg-[#e9c15d]">
                    Explore on my own <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                  <Link href="/counselling" className="inline-flex min-h-11 items-center rounded-full border border-white/35 px-4 text-sm font-semibold text-white hover:bg-white/10">
                    Guided Explorer
                  </Link>
                </div>
              </article>
            </div>
            <div className="mt-12 grid gap-6 border-t border-white/20 pt-8 md:grid-cols-[.8fr_1.2fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#f2cf78]">A note about guidance</p>
                <h3 className="mt-3 font-serif text-2xl font-semibold">Structured, self-guided questions</h3>
              </div>
              <div className="max-w-[62ch] text-sm leading-relaxed text-white/75">
                <p>
                  In Guided Explorer, you see one question at a time. Where
                  supported, you can choose an answer or write your own
                  response. You can skip questions, go back, change answers or
                  finish when you&apos;re ready.
                </p>
                <p className="mt-3">
                  Review your answers before continuing to Explore. The
                  Explore homepage can then show possible starting points
                  supported by what you shared, with reasons and answers
                  visible. These are suggestions to explore, not conclusions
                  about you.
                </p>
                <p className="mt-3">
                  Guided Explorer is not a conversational AI Mentor. That is a
                  future feature, not something students should expect to be
                  available now.
                </p>
              </div>
            </div>
            <Link href="/discover" className="mt-9 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#f2cf78] underline decoration-white/35 underline-offset-4 hover:decoration-[#f2cf78]">
              Start Discover <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section id="explore" aria-labelledby="explore-title" className="scroll-mt-20 py-14 sm:py-20">
          <div className="cb-container">
            <SectionHeading
              id="explore-title"
              number="04"
              eyebrow="Understanding Explore"
              title="Explore the information available to you."
              description="Explore is the main information area. It is organised into six sections, each answering a different kind of question. Open a section directly; you do not have to complete a fixed sequence."
            />
            <div className="mt-10 grid gap-x-8 md:grid-cols-2">
              {exploreSections.map(({ name, description, when, href, icon: Icon }, index) => (
                <Link
                  key={name}
                  href={href}
                  className="group grid min-h-[150px] grid-cols-[2.75rem_1fr_auto] items-start gap-4 border-t border-[#d7ddd6] py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#145543]"
                >
                  <span className="font-mono text-xs font-semibold text-[#7b8d82]">0{index + 1}</span>
                  <span>
                    <span className="flex items-center gap-2 font-serif text-xl font-semibold tracking-[-.025em] text-[#18352d]">
                      <Icon aria-hidden="true" className="h-5 w-5 text-[#28614f]" />
                      {name}
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-[#59665e]">{description}</span>
                    <span className="mt-2 block text-xs font-semibold text-[#28614f]">{when}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className="mt-1 h-4 w-4 text-[#7b8d82] transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="details" aria-labelledby="details-title" className="scroll-mt-20 bg-[#eaf1e9] py-14 sm:py-20">
          <div className="cb-container">
            <SectionHeading
              id="details-title"
              number="05"
              eyebrow="How to use a detail page"
              title="Opening an item gives you more to understand."
              description="When you select a field, course, institution, pathway, examination or scholarship, its detail page brings together information about that item."
            />
            <div className="mt-10 grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
              <article className="bg-[#fbfaf6] p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#28614f]">Illustrative course detail</p>
                <h3 className="mt-3 font-serif text-2xl font-semibold tracking-[-.035em]">Bachelor of Computer Applications</h3>
                <p className="mt-1 text-sm text-[#69776e]">BCA · Illustrative example</p>
                <ol className="mt-7 space-y-5">
                  {[
                    ["Read the overview", "Understand what the course is and what students generally study."],
                    ["Check the key information", "Look for qualification type, duration and entry requirements where available."],
                    ["Understand who can apply", "Read the eligibility information and any subject or qualification requirements provided."],
                    ["Look at related information", "Where available, find institutions offering the course and possible related pathways."],
                    ["Keep information you want to revisit", "Use the save feature where available. Saved items are currently stored in this browser, not synced to your account."],
                  ].map(([title, detail], index) => (
                    <li key={title} className="grid grid-cols-[1.75rem_1fr] gap-3">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#dceadd] text-xs font-bold text-[#205844]">{index + 1}</span>
                      <span>
                        <span className="font-semibold">{title}</span>
                        <span className="mt-1 block text-sm leading-relaxed text-[#59665e]">{detail}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </article>
              <div>
                <h3 className="font-serif text-2xl font-semibold tracking-[-.035em]">Different pages answer different questions</h3>
                <dl className="mt-5 divide-y divide-[#cdd8ce] border-y border-[#cdd8ce]">
                  {[
                    ["Field detail", "What does this area involve?"],
                    ["Course detail", "What will I study and what are the requirements?"],
                    ["Institution detail", "What is this institution and what does it offer?"],
                    ["Pathway detail", "What are the possible stages and alternatives?"],
                  ].map(([term, definition]) => (
                    <div key={term} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-5">
                      <dt className="text-sm font-semibold text-[#205844]">{term}</dt>
                      <dd className="text-sm leading-relaxed text-[#59665e]">{definition}</dd>
                    </div>
                  ))}
                </dl>
                <aside className="mt-6 border-l-2 border-[#c99d39] bg-[#f7f1df] p-5">
                  <p className="font-semibold">Two ways to find institutions</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#51462d]">
                    The general Institutions directory shows overall institution
                    profiles. Opening institutions from a particular course
                    shows institutions associated with that course. These are
                    related, but not the same view.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    <Link href="/explore/institution-directory" className="font-semibold text-[#205844] underline underline-offset-4">General directory</Link>
                    <Link href="/explore/institutions?course=bca" className="font-semibold text-[#205844] underline underline-offset-4">Course institutions</Link>
                  </div>
                </aside>
              </div>
            </div>
            <div className="mt-12 border-t border-[#cdd8ce] pt-8">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#28614f]">How the sections connect</p>
              <h3 className="mt-3 font-serif text-2xl font-semibold tracking-[-.035em]">Follow a connection, or start anywhere.</h3>
              <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[#59665e]">
                Someone interested in Technology might explore the field, look
                at courses, find institutions and learn about possible
                pathways. This is an example, not a required route. Examinations
                and scholarships can also be explored independently.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  ["Field", "Technology", "Understand the area."],
                  ["Course", "BCA", "Explore a study option."],
                  ["Institution", "A college", "Find where it is offered."],
                ].map(([type, value, detail], index) => (
                  <div key={type} className="flex items-center gap-3 border-t border-[#aebfb1] py-4 sm:block sm:border-t-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#28614f] text-xs font-bold text-white sm:hidden">{index + 1}</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[.14em] text-[#28614f]">{type}</p>
                      <p className="mt-1 font-serif text-xl font-semibold">{value}</p>
                      <p className="mt-1 text-sm text-[#59665e]">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 flex items-start gap-3 text-sm font-semibold text-[#205844]">
                <Search aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                You can start with a course, search for an institution first or
                read about scholarships without choosing a field.
              </p>
            </div>
          </div>
        </section>

        <section id="information" aria-labelledby="information-title" className="scroll-mt-20 py-14 sm:py-20">
          <div className="cb-container">
            <SectionHeading
              id="information-title"
              number="06"
              eyebrow="Using information carefully"
              title="Know what you're reading before making a decision."
              description="Education information can change. CareerBridge can help you understand what is shown and where more checking may be needed."
            />
            <div className="mt-10 grid gap-x-10 md:grid-cols-2">
              {[
                ["Check the source", "Look for the official website, prospectus or published notice."],
                ["Check the date", "Look for the last-checked date when it is provided."],
                ["Understand missing information", "Unavailable information does not mean an item has no requirements or fees."],
                ["Verify important details", "Confirm current admissions, fees and deadlines with the official authority."],
              ].map(([title, detail], index) => (
                <div key={title} className="flex gap-4 border-t border-[#d7ddd6] py-5">
                  <span className="font-mono text-xs font-semibold text-[#7b8d82]">0{index + 1}</span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-[#59665e]">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 border-l-2 border-[#c99d39] bg-[#f7f1df] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#85641c]" />
                <div>
                  <p className="font-semibold text-[#3d3523]">A useful distinction</p>
                  <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-[#51462d]">
                    Information on CareerBridge is a starting point for
                    understanding your options, not a substitute for the
                    latest official admission, fee or deadline notice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-title" className="bg-[#eaf1e9] py-14 sm:py-20">
          <div className="cb-container">
            <div className="grid gap-5 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] md:gap-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#28614f]">A few things worth remembering</p>
                <h2 id="faq-title" className="mt-4 max-w-[12ch] font-serif text-[clamp(2.2rem,4.7vw,4rem)] font-semibold leading-[1.02] tracking-[-.05em] text-[#102d26]">
                  Common questions
                </h2>
              </div>
              <dl className="divide-y divide-[#cdd8ce] border-y border-[#cdd8ce]">
                {faqs.map(({ question, answer }) => (
                  <div key={question} className="py-5">
                    <dt className="font-semibold">{question}</dt>
                    <dd className="mt-2 max-w-[60ch] text-sm leading-relaxed text-[#59665e]">{answer}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="bg-[#123f34] py-14 text-white sm:py-20">
          <div className="cb-container grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#f2cf78]">Guide, don&apos;t decide</p>
              <h2 className="mt-4 max-w-[16ch] font-serif text-[clamp(2.4rem,5vw,4.5rem)] font-semibold leading-[1] tracking-[-.05em]">
                Explore with understanding, not pressure.
              </h2>
              <p className="mt-5 max-w-[56ch] text-base leading-relaxed text-white/75">
                Start with uncertainty, continue with an interest or explore
                independently. CareerBridge is here to help you understand what
                is possible, at your own pace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/discover" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#f2cf78] px-5 text-sm font-semibold text-[#18352d] hover:bg-[#e9c15d]">
                Start Discover <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link href="/explore" className="inline-flex min-h-12 items-center rounded-full border border-white/35 px-5 text-sm font-semibold text-white hover:bg-white/10">
                Browse Explore
              </Link>
            </div>
          </div>
        </section>
        <footer className="bg-[#0d332b] text-white">
          <div className="cb-container flex flex-col gap-3 py-7 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="font-serif text-xl font-semibold">CareerBridge</Link>
            <p className="text-sm text-white/70">
              Explore your possibilities. Your choices remain yours.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
