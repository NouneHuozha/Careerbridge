import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Compass,
  FileCheck2,
  GitFork,
  GraduationCap,
  HandCoins,
  Lightbulb,
  Map,
  Search,
  ShieldCheck,
  Signpost,
} from "lucide-react";
import { SiteHeader } from "../site-header";

export const metadata: Metadata = {
  title: "About CareerBridge",
  description:
    "Learn why CareerBridge exists, its focus on Northeast India, and how it helps students explore education possibilities.",
};

const states = [
  "Arunachal Pradesh",
  "Assam",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Sikkim",
  "Tripura",
];

const areas = [
  {
    name: "Fields",
    question: "What areas of study and work can I learn about?",
    href: "/explore/fields",
    icon: Compass,
  },
  {
    name: "Courses",
    question: "What qualifications and programmes can I study?",
    href: "/explore/courses",
    icon: GraduationCap,
  },
  {
    name: "Institutions",
    question: "Where might I be able to study?",
    href: "/explore/institution-directory",
    icon: Building2,
  },
  {
    name: "Pathways",
    question: "What routes could be available after Class 10 or 12?",
    href: "/explore/pathways",
    icon: Map,
  },
  {
    name: "Examinations",
    question: "Which entrance or qualifying examinations should I understand?",
    href: "/explore/examinations",
    icon: FileCheck2,
  },
  {
    name: "Scholarships",
    question: "What financial support opportunities might be available?",
    href: "/explore/scholarships",
    icon: HandCoins,
  },
];

const principles = [
  {
    title: "Guide, don’t decide",
    description:
      "Help students understand possible directions without choosing a career for them.",
    icon: Compass,
  },
  {
    title: "Keep possibilities open",
    description:
      "An initial interest should never restrict access to other fields or opportunities.",
    icon: GitFork,
  },
  {
    title: "Explain, don’t just suggest",
    description:
      "Where a possibility is based on a student’s answers, make the supporting reasons understandable.",
    icon: Lightbulb,
  },
  {
    title: "Be transparent",
    description:
      "Make information sources, checking dates and unavailable details clear where provided.",
    icon: ShieldCheck,
  },
];

const aimsToProvide = [
  "Organised education information.",
  "Possible areas and routes to explore.",
  "Explanations that help students understand options.",
  "A starting point for further research.",
];

const doesNotPromise = [
  "Predicting a student’s future or ability.",
  "Admission, scholarships or employment.",
  "Complete or always up-to-date coverage of every opportunity.",
  "Replacing official institutions, notices or admission authorities.",
];

function SectionLabel({
  children,
  light = false,
}: {
  children: string;
  light?: boolean;
}) {
  return (
    <p className={`text-sm font-semibold ${light ? "text-[#d5e6da]" : "text-[#28614f]"}`}>
      {children}
    </p>
  );
}

export default function AboutPage() {
  return (
    <>
      <SiteHeader publicPage />
      <main className="overflow-hidden bg-[#fbfaf6] text-[#18352d]">
        <section
          aria-labelledby="about-title"
          className="cb-container grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(25rem,.95fr)] lg:items-center lg:gap-14 lg:py-20"
        >
          <div className="max-w-2xl">
            <SectionLabel>About CareerBridge</SectionLabel>
            <h1
              id="about-title"
              className="mt-4 font-serif text-[clamp(1.75rem,3.6vw,3.25rem)] font-semibold leading-[1.02] tracking-[-.05em] text-[#102d26] [text-wrap:balance]"
            >
              <span className="block">Education possibilities</span>
              <span className="block">should be easier to see.</span>
            </h1>
            <p className="mt-5 max-w-[43ch] font-serif text-xl leading-snug text-[#354b40] sm:text-2xl">
              A clearer way to explore what comes next.
            </p>
            <p className="mt-4 max-w-[57ch] text-base leading-relaxed text-[#354b40]">
              CareerBridge is an education and career exploration platform designed
              to help students understand the different opportunities available
              after Class 10 and Class 12.
            </p>
            <p className="mt-4 max-w-[57ch] text-base leading-relaxed text-[#354b40]">
              From discovering fields of study to understanding courses,
              institutions and possible education pathways, our aim is to make
              information easier to find, understand and explore.
            </p>
          </div>

          <div className="rounded-[1.5rem] bg-[#e7efe7] p-5 sm:p-7 lg:p-8">
            <SectionLabel>Seeing the bigger picture</SectionLabel>
            <h2 className="mt-3 font-serif text-2xl font-semibold leading-tight tracking-[-.03em] text-[#18352d] sm:text-3xl">
              There is more than one possibility.
            </h2>
            <p className="mt-3 max-w-[48ch] text-base leading-relaxed text-[#354b40]">
              Different areas of education connect to different study options and
              opportunities.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 sm:col-span-2">
                <div className="flex items-center gap-3">
                  <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0 text-[#145543]" />
                  <h3 className="font-semibold">Fields of study</h3>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-[#59665e]">
                  Discover areas you may not have considered.
                </p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <h3 className="font-semibold">Courses</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#59665e]">
                  What you could study.
                </p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <h3 className="font-semibold">Institutions</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#59665e]">
                  Where you could study.
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 sm:col-span-2">
                <h3 className="font-semibold">Education pathways and opportunities</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#59665e]">
                  Understand possible ways forward.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="why-title"
          className="bg-white py-14 sm:py-20"
        >
          <div className="cb-container">
            <SectionLabel>01 – Why we exist</SectionLabel>
            <h2
              id="why-title"
              className="mt-3 max-w-[25ch] font-serif text-[clamp(1.8rem,3.8vw,3.25rem)] font-semibold leading-[1.08] tracking-[-.04em] text-[#102d26] [text-wrap:balance]"
            >
              Knowing what comes next can be hard.
            </h2>
            <div className="mt-5 grid gap-4 text-base leading-relaxed text-[#354b40] md:grid-cols-2 md:gap-8">
              <p>
                Having potential doesn’t always mean knowing what to do next.
                A student can be interested in learning, have ideas about the
                future and still struggle to understand the opportunities
                available to them.
              </p>
              <p>
                Information about courses, colleges, examinations and
                scholarships can be scattered across different websites and
                sources. Sometimes students know a few familiar options but
                have little opportunity to discover what else exists.
              </p>
            </div>
            <p className="mt-5 max-w-[72ch] text-base font-semibold leading-relaxed text-[#18352d]">
              The challenge is not always a lack of ambition. It can be a lack
              of visibility, accessible information and guidance.
            </p>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {[
                {
                  title: "Limited awareness",
                  description:
                    "Students may know only a small number of familiar study areas and opportunities.",
                  icon: Search,
                },
                {
                  title: "Disconnected information",
                  description:
                    "Understanding courses, institutions and requirements often means searching across different sources.",
                  icon: GitFork,
                },
                {
                  title: "Unclear next steps",
                  description:
                    "Even after finding an interesting option, students may not know what to look at next.",
                  icon: Signpost,
                },
              ].map(({ title, description, icon: Icon }) => (
                <article key={title} className="rounded-2xl bg-[#f0f3ef] p-5 sm:p-6">
                  <Icon aria-hidden="true" className="h-5 w-5 text-[#28614f]" />
                  <h3 className="mt-3 font-serif text-xl font-semibold text-[#18352d]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#354b40]">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="purpose-title"
          className="cb-container py-14 sm:py-20"
        >
          <div className="grid gap-7 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>
              <SectionLabel>02 – Our purpose</SectionLabel>
              <h2
                id="purpose-title"
                className="mt-3 max-w-[24ch] font-serif text-[clamp(1.75rem,2.8vw,2.5rem)] font-semibold leading-[1.04] tracking-[-.045em] text-[#102d26]"
              >
                Make possibilities visible.
              </h2>
            </div>
            <div className="max-w-[62ch] text-base leading-relaxed text-[#354b40]">
              <p>
                CareerBridge aims to give students a clearer picture of the
                education options around them. By bringing different kinds of
                education information together and explaining how they relate,
                we want to make it easier for students to explore beyond what
                they already know.
              </p>
              <p className="mt-4">
                We believe students should have the opportunity to understand
                their options before feeling pressured to choose one.
              </p>
            </div>
          </div>
          <div className="mt-9 grid gap-4 pt-6 sm:grid-cols-2 sm:gap-6">
            <article className="rounded-2xl bg-[#e8efe7] p-5 sm:p-6">
              <SectionLabel>Our mission</SectionLabel>
              <h3 className="mt-2 font-serif text-xl font-semibold leading-snug text-[#18352d] sm:text-2xl">
                Make education information easier to discover and understand.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#354b40]">
                Help students explore fields, study options, institutions and
                opportunities with clearer information.
              </p>
            </article>
            <article className="rounded-2xl bg-[#173f34] p-5 text-white sm:p-6">
              <SectionLabel light>Our vision</SectionLabel>
              <h3 className="mt-2 font-serif text-xl font-semibold leading-snug text-white sm:text-2xl">
                A future where students can see more of what is possible.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/85">
                More awareness, better understanding and more informed
                educational choices.
              </p>
            </article>
          </div>
        </section>

        <section
          aria-labelledby="regional-title"
          className="bg-[#173f34] py-14 text-white sm:py-20"
        >
          <div className="cb-container grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,.9fr)] lg:items-center lg:gap-14">
            <div>
              <SectionLabel light>03 – Our regional focus</SectionLabel>
              <h2
                id="regional-title"
                className="mt-3 max-w-[15ch] font-serif text-[clamp(2.2rem,4.4vw,3.8rem)] font-semibold leading-[1.04] tracking-[-.045em] text-white"
              >
                Built with Northeast India in mind.
              </h2>
              <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-white/90">
                Students should be able to discover educational opportunities
                beyond the options they hear about most often. CareerBridge is
                being developed with the educational needs and opportunities
                of Northeast India in focus.
              </p>
              <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-white/90">
                Our aim is to make relevant information from across the region
                easier to discover, while continuing to improve the breadth and
                reliability of the information available.
              </p>
            </div>
            <div className="rounded-2xl bg-[#fbfaf6] p-5 text-[#18352d] sm:p-6">
              <h3 className="font-semibold">The eight Northeast states</h3>
              <ul className="mt-4 grid grid-cols-2 gap-2" aria-label="Northeast states">
                {states.map((state) => (
                  <li
                    key={state}
                    className="rounded-lg bg-[#e8efe7] px-3 py-2 text-sm font-medium text-[#29483a]"
                  >
                    {state}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-[#59665e]">
                Regional focus does not mean every institution or opportunity
                is already covered.
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="together-title"
          className="bg-white py-14 sm:py-20"
        >
          <div className="cb-container">
            <SectionLabel>04 – What we bring together</SectionLabel>
            <h2
              id="together-title"
              className="mt-3 max-w-[24ch] font-serif text-[clamp(2rem,3.8vw,3.25rem)] font-semibold leading-[1.08] tracking-[-.04em] text-[#102d26]"
            >
              Education, considered together.
            </h2>
            <p className="mt-4 max-w-[66ch] text-base leading-relaxed text-[#354b40]">
              CareerBridge brings several connected areas into one exploration
              platform. Each helps students answer a different question about
              their education options.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {areas.map(({ name, question, href, icon: Icon }) => (
                <Link
                  key={name}
                  href={href}
                  className="group min-h-36 rounded-2xl bg-[#fbfaf6] p-5 transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] sm:p-6"
                >
                  <Icon aria-hidden="true" className="h-6 w-6 text-[#28614f]" />
                  <h3 className="mt-4 font-serif text-xl font-semibold text-[#18352d]">
                    {name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#354b40]">
                    {question}
                  </p>
                  <span className="sr-only">Explore {name}</span>
                </Link>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-[#59665e]">
              These areas are connected, but students can explore each one
              independently.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="principles-title"
          className="bg-[#e8efe7] py-14 sm:py-20"
        >
          <div className="cb-container">
            <SectionLabel>05 – Our principles</SectionLabel>
            <h2
              id="principles-title"
              className="mt-3 font-serif text-[clamp(2rem,3.8vw,3.25rem)] font-semibold leading-[1.08] tracking-[-.04em] text-[#18352d]"
            >
              Guide, don’t decide.
            </h2>
            <p className="mt-3 max-w-[65ch] text-base leading-relaxed text-[#354b40]">
              The way we design CareerBridge matters just as much as the
              information it brings together.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {principles.map(({ title, description, icon: Icon }) => (
                <article key={title} className="rounded-2xl bg-white p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-[#28614f]" />
                    <h3 className="font-serif text-xl font-semibold text-[#18352d]">
                      {title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[#354b40]">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="expectations-title"
          className="cb-container py-14 sm:py-20"
        >
          <SectionLabel>06 – Honest expectations</SectionLabel>
          <h2
            id="expectations-title"
            className="mt-3 max-w-[21ch] font-serif text-[clamp(2rem,3.8vw,3.25rem)] font-semibold leading-[1.08] tracking-[-.04em] text-[#102d26]"
          >
            What CareerBridge can and cannot do.
          </h2>
          <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-[#354b40]">
            We want students to understand the role of the platform and use its
            information thoughtfully.
          </p>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl bg-[#e8efe7] p-5 sm:p-6">
              <h3 className="font-semibold text-[#18352d]">What it aims to provide</h3>
              <ul className="mt-4 space-y-3">
                {aimsToProvide.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#354b40]">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#28614f]" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl bg-[#f0f3ef] p-5 sm:p-6">
              <h3 className="font-semibold text-[#18352d]">What it does not promise</h3>
              <ul className="mt-4 space-y-3">
                {doesNotPromise.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#354b40]">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#59665e]" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
          <aside className="mt-4 rounded-2xl bg-white p-5 sm:p-6">
            <h3 className="font-semibold text-[#18352d]">
              Information should be checked before important decisions.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#354b40]">
              Students should consult the relevant official institution or
              authority for current eligibility, admission dates, fees and
              application requirements.
            </p>
          </aside>
        </section>

        <section className="bg-[#173f34] py-12 text-white sm:py-16">
          <div className="cb-container">
            <SectionLabel light>Our belief</SectionLabel>
            <h2 className="mt-3 max-w-[18ch] font-serif text-[clamp(2.2rem,4.5vw,4rem)] font-semibold leading-[1.03] tracking-[-.045em] text-white">
              Your future is yours to explore.
            </h2>
            <p className="mt-4 max-w-[66ch] text-base leading-relaxed text-white/90">
              Every student deserves the chance to understand what is possible
              before deciding what comes next. CareerBridge exists to help make
              those possibilities easier to see.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold">
              <Link
                href="/how-it-works"
                className="inline-flex min-h-11 items-center gap-2 text-white underline decoration-white/50 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                How CareerBridge works
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/explore"
                className="inline-flex min-h-11 items-center gap-2 text-white underline decoration-white/50 underline-offset-4 transition-colors hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Explore your possibilities
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-[#fbfaf6] text-[#18352d]">
        <div className="cb-container py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-serif text-xl font-semibold">CareerBridge</p>
              <p className="mt-1 text-sm text-[#59665e]">Explore your possibilities.</p>
            </div>
            <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#354b40]">
              <Link href="/explore" className="underline-offset-4 hover:underline">Explore</Link>
              <Link href="/how-it-works" className="underline-offset-4 hover:underline">How it works</Link>
              <Link href="/about" aria-current="page" className="underline-offset-4 hover:underline">About</Link>
            </nav>
          </div>
          <p className="mt-6 pt-4 text-sm text-[#59665e]">
            Helping students discover and understand education possibilities.
          </p>
        </div>
      </footer>
    </>
  );
}
