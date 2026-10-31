import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Clock3,
  Compass,
  FileText,
  GitFork,
  GraduationCap,
  Leaf,
  Search,
  Signpost,
} from "lucide-react";

const libraryLinks = [
  { label: "Explore broad areas", detail: "Browse without choosing a career", icon: Compass },
  { label: "After Class 10", detail: "Explore streams and skill options", icon: GraduationCap },
  { label: "After Class 12", detail: "Explore courses and study routes", icon: BookOpen },
  { label: "Courses", detail: "Degrees, diplomas, and training", icon: BriefcaseBusiness },
  { label: "Colleges", detail: "Find institutions and course details", icon: Building2 },
  { label: "Requirements and fees", detail: "Check source status and what is confirmed", icon: FileText },
];

const steps = [
  {
    title: "Choose how to browse",
    text: "Pick a few activities, choose a class context, or skip both and browse.",
    icon: Compass,
  },
  {
    title: "Explore study options",
    text: "Interest picks can suggest broad areas, but every option stays open.",
    icon: BookOpen,
  },
  {
    title: "Check the details",
    text: "Review courses, colleges, official sources, and clearly marked unknowns.",
    icon: Signpost,
  },
];

export default function HomePage() {
  return (
    <main className="bg-[#fbfaf6] text-[#18352d]">
      <section className="relative isolate min-h-[710px] overflow-visible bg-[#123f34] text-white lg:min-h-[760px]">
        <Image
          src="/SunlitModernLibraryStudyWorkspace.png"
          alt="A sunlit library study space with books and a laptop"
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(8,52,43,.97)_0%,rgba(8,52,43,.91)_30%,rgba(8,52,43,.62)_49%,rgba(8,52,43,.05)_77%),linear-gradient(0deg,rgba(8,52,43,.20),transparent_42%)]"
        />
        <header className="cb-container absolute inset-x-0 top-0 z-20 flex min-h-20 items-center justify-between gap-6">
          <Link
            href="#top"
            className="font-serif text-xl font-semibold tracking-tight text-white sm:text-2xl"
          >
            CareerBridge
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-8 text-sm font-medium text-white/90 sm:flex"
          >
            <Link href="#how-it-works" className="transition hover:text-white">
              How it works
            </Link>
            <Link href="#explore" className="transition hover:text-white">
              Browse options
            </Link>
          </nav>
          <Link
            href="#getting-started"
            className="inline-flex min-h-11 items-center rounded-full border border-white/35 bg-[#103f35]/60 px-5 text-sm font-semibold text-white transition hover:bg-[#103f35]/80"
          >
            Choose a starting point
          </Link>
        </header>

        <div
          id="top"
          className="cb-container relative flex min-h-[710px] flex-col justify-center pb-36 pt-32 lg:min-h-[760px] lg:pb-40"
        >
          <div className="max-w-[620px]">
            <h1 className="max-w-[15ch] font-serif text-[clamp(3.4rem,7vw,6.2rem)] font-semibold leading-[.94] tracking-[-.055em] text-white">
              No plan yet? You can still explore.
            </h1>
            <p className="mt-6 max-w-[47ch] text-base leading-relaxed text-white/90 sm:text-lg">
              Browse study options by interest, class, or course. You don’t
              need to decide today.
            </p>
          </div>
        </div>

        <div
          id="getting-started"
          className="cb-container relative z-10 -mt-20 lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0 lg:translate-y-[34%]"
        >
          <div className="grid gap-4 rounded-[1.55rem] border border-white/80 bg-[#fffefa] p-4 shadow-[0_18px_55px_-30px_rgba(8,39,31,.42)] lg:grid-cols-3 lg:gap-5 lg:p-5">
            <article className="flex min-h-[230px] items-start gap-4 rounded-[1.15rem] border border-[#e3e2d9] bg-[#f7f7f2] p-6 sm:gap-5 sm:p-7">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#e4f0e8] text-[#145543] sm:h-16 sm:w-16">
                <Compass aria-hidden="true" className="h-7 w-7 sm:h-8 sm:w-8" />
              </span>
              <span className="min-w-0">
                <span className="block font-serif text-[1.3rem] font-semibold leading-tight tracking-[-.035em] text-[#172c25] sm:text-[1.45rem]">
                  I’m not sure where to start
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-[#59665e]">
                  Start with optional interests and class context. You can skip
                  both and browse all options.
                </span>
                <Link
                  href="/discover"
                  className="group/button mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f2cf78] px-5 text-sm font-semibold text-[#263b2e] transition hover:bg-[#ebc45e]"
                >
                  Start exploring
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform group-hover/button:translate-x-1"
                  />
                </Link>
              </span>
            </article>
            <article className="flex min-h-[230px] items-start gap-4 rounded-[1.15rem] border border-[#e3e2d9] bg-white p-6 sm:gap-5 sm:p-7">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#e4f0e8] text-[#145543] sm:h-16 sm:w-16">
                <BookOpen aria-hidden="true" className="h-7 w-7 sm:h-8 sm:w-8" />
              </span>
              <span className="min-w-0">
                <span className="block font-serif text-[1.3rem] font-semibold leading-tight tracking-[-.035em] text-[#172c25] sm:text-[1.45rem]">
                  I want to browse on my own
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-[#59665e]">
                  Browse all topics without answering questions first.
                </span>
                <Link
                  href="#explore"
                  className="group/button mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f2cf78] px-5 text-sm font-semibold text-[#263b2e] transition hover:bg-[#ebc45e]"
                >
                  Browse options
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform group-hover/button:translate-x-1"
                  />
                </Link>
              </span>
            </article>
            <article className="flex min-h-[230px] items-start gap-4 rounded-[1.15rem] border border-[#e3e2d9] bg-white p-6 sm:gap-5 sm:p-7">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#e4f0e8] text-[#145543] sm:h-16 sm:w-16">
                <Search aria-hidden="true" className="h-7 w-7 sm:h-8 sm:w-8" />
              </span>
              <span className="min-w-0">
                <span className="block font-serif text-[1.3rem] font-semibold leading-tight tracking-[-.035em] text-[#172c25] sm:text-[1.45rem]">
                  I know what I’m looking for
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-[#59665e]">
                  Find a course or college by name. Direct search is not
                  available yet.
                </span>
                <span className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#f1f1e9] px-5 text-sm font-semibold text-[#52645a]">
                  Search coming soon
                </span>
              </span>
            </article>
          </div>
        </div>
      </section>

      <section
        className="cb-container pb-8 pt-40 sm:pt-44 lg:pt-40"
        aria-label="A supportive way to explore"
      >
        <div className="flex flex-wrap items-center justify-center gap-x-9 gap-y-4 border-b border-[#dddcd4] pb-9 text-sm text-[#59665e] sm:gap-x-12">
          <span className="inline-flex items-center gap-2">
            <Leaf aria-hidden="true" className="h-5 w-5 text-[#145543]" />
            Browse without answering
          </span>
          <span aria-hidden="true" className="hidden h-5 w-px bg-[#cccfc6] sm:block" />
          <span className="inline-flex items-center gap-2">
            <Clock3 aria-hidden="true" className="h-5 w-5 text-[#145543]" />
            Go at your own pace
          </span>
          <span aria-hidden="true" className="hidden h-5 w-px bg-[#cccfc6] sm:block" />
          <span className="inline-flex items-center gap-2">
            <GitFork aria-hidden="true" className="h-5 w-5 text-[#145543]" />
            Change direction later
          </span>
        </div>
      </section>

      <section
        id="how-it-works"
        className="cb-container pb-16 pt-12 sm:pb-20 sm:pt-16"
        aria-labelledby="how-title"
      >
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-[#145543]">Your interests are a starting point</p>
          <h2
            id="how-title"
            className="mt-3 font-serif text-[clamp(2.8rem,5vw,4.2rem)] font-semibold leading-[1.02] tracking-[-.055em] text-[#102d26]"
          >
            Explore, don’t decide.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#354b40] sm:text-lg">
            Your picks help you find places to explore. They don’t rank your
            future, decide what suits you, or tell you what you qualify for.
          </p>
        </div>
        <div className="relative mt-14">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-[42px] w-full md:block"
            viewBox="0 0 1200 42"
            preserveAspectRatio="none"
          >
            <path
              d="M8 22 H376 C390 22 392 39 408 39 C424 39 426 22 442 22 H758 C774 22 776 39 792 39 C808 39 810 22 826 22 H1192"
              fill="none"
              stroke="#24614f"
              strokeWidth="1.6"
            />
            <path
              d="M8 22 V28 M1192 22 V28"
              fill="none"
              stroke="#24614f"
              strokeWidth="1.6"
            />
          </svg>
          <div className="grid gap-5 md:grid-cols-3 md:gap-0">
            {steps.map(({ title, text, icon: Icon }, index) => (
              <article
                key={title}
                className={`relative min-h-[190px] border border-[#dddcd4] bg-transparent px-6 pb-7 pt-9 sm:px-8 md:border-t-0 md:pt-[2.4rem] ${index === 0 ? "md:rounded-bl-[1rem] md:rounded-tl-[1rem]" : "md:border-l-0"} ${index === steps.length - 1 ? "md:rounded-br-[1rem] md:rounded-tr-[1rem]" : ""}`}
              >
                <span className="absolute left-[13%] top-[-1rem] z-20 grid h-10 w-10 place-items-center rounded-full bg-[#145543] text-base font-semibold text-white md:left-[13%] md:top-[2px]">
                  {index + 1}
                </span>
                <div className="flex items-center gap-5 md:pt-0">
                  <span className="grid h-[82px] w-[82px] shrink-0 place-items-center rounded-full bg-[#e7f1e9] text-[#145543]">
                    <Icon aria-hidden="true" className="h-9 w-9" />
                  </span>
                  <div>
                    <h3 className="font-serif text-xl font-semibold leading-tight tracking-[-.03em] text-[#18372e]">
                      {title}
                    </h3>
                    <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-[#646e68]">
                      {text}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="explore"
        className="cb-container pb-12 pt-4 sm:pb-14"
        aria-labelledby="library-title"
      >
        <div>
          <h2
            id="library-title"
            className="font-serif text-[clamp(2rem,3.6vw,2.8rem)] font-semibold tracking-[-.045em] text-[#102d26]"
          >
            What you can explore
          </h2>
          <p className="mt-1 text-[#606b65]">
            Start broad, then choose your class context whenever you’re ready.
          </p>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {libraryLinks.map(({ label, detail, icon: Icon }) => (
            <article
              key={label}
              className="flex min-h-[94px] items-center gap-5 rounded-xl border border-[#ddded6] bg-transparent px-5 py-4"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e4f0e8] text-[#145543]">
                <Icon aria-hidden="true" className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block font-serif text-lg font-semibold text-[#18372e]">
                  {label}
                </span>
                <span className="block text-sm text-[#68736d]">{detail}</span>
              </span>
            </article>
          ))}
        </div>
      </section>

      <footer className="bg-[#123f34] text-white">
        <div className="cb-container flex flex-col gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-serif text-xl font-semibold">CareerBridge</span>
          <p className="text-sm text-white/80">
            Browse your options. Your interests don’t decide your future.
          </p>
        </div>
      </footer>
    </main>
  );
}
