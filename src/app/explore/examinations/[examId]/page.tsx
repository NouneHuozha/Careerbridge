import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { Breadcrumbs } from "../../../breadcrumbs";
import { SavedItemButton } from "../../saved-item-button";
import { HistoryVisit } from "../../history-visit";
import { possibilityFields } from "../../../discover/possibility-fields";
import { examinations } from "../examination-data";

export const instant = false;

type PageProps = {
  params: Promise<{ examId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const processSteps = [
  {
    title: "Check the requirements",
    description:
      "Identify the relevant paper and read its eligibility conditions in the current information bulletin.",
  },
  {
    title: "Apply for the examination",
    description:
      "Complete the application using the official examination portal and follow its current instructions.",
  },
  {
    title: "Prepare and take the examination",
    description:
      "Use the syllabus, examination pattern and instructions published for the relevant cycle.",
  },
  {
    title: "Check your result",
    description:
      "Review the result and follow the next admission or counselling process that applies to you.",
  },
  {
    title: "Explore admission opportunities",
    description:
      "Check each participating institution’s programme-specific eligibility and selection requirements.",
  },
];

function OfficialLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center gap-2 font-semibold text-[#145543] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
    >
      {children}
      <ExternalLink aria-hidden="true" className="h-4 w-4" />
    </a>
  );
}

export function generateStaticParams() {
  return examinations
    .filter((exam) => exam.id === "jee-main")
    .map(({ id }) => ({ examId: id }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { examId } = await params;
  const examination = examinations.find((exam) => exam.id === examId);
  return examination
    ? {
        title: `${examination.name} | Examinations | CareerBridge`,
        description: examination.purpose,
      }
    : { title: "Examination details | CareerBridge" };
}

export default async function ExaminationDetailsPage({
  params,
  searchParams,
}: PageProps) {
  const [{ examId }, query] = await Promise.all([params, searchParams]);
  const examination = examinations.find(
    (exam) => exam.id === examId && exam.id === "jee-main",
  );
  if (!examination) notFound();

  const listingParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") listingParams.set(key, value);
    else if (value) value.forEach((item) => listingParams.append(key, item));
  }
  const listingHref = `/explore/examinations${listingParams.size ? `?${listingParams.toString()}` : ""}`;
  const coursesHref = "/explore/courses?stage=class-12&field=engineering";
  const officialUrl = examination.officialUrl;
  const savedStage =
    query.stage === "class-10" ||
    query.stage === "class-12" ||
    query.stage === "all"
      ? query.stage
      : undefined;
  const savedFieldId =
    typeof query.field === "string" &&
    possibilityFields.some((field) => field.id === query.field)
      ? query.field
      : undefined;

  return (
    <main className="cb-page-enter min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <HistoryVisit
        type="examination"
        id={examination.id}
        context={{
          ...(savedStage ? { stage: savedStage } : {}),
          ...(savedFieldId ? { fieldId: savedFieldId } : {}),
        }}
      />
      <div className="cb-container pb-14 pt-6 sm:pb-20 sm:pt-8">
        <Breadcrumbs
          items={[
            { label: "Explore", href: "/explore" },
            { label: "Examinations", href: listingHref },
            { label: examination.name },
          ]}
          className="!px-0"
        />

        <section className="exam-hero relative mt-8 overflow-hidden rounded-[2rem] bg-[#18352d] px-6 py-8 text-white sm:px-10 sm:py-11 lg:px-14 lg:py-14">
          <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full border border-white/10" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-4 -top-16 h-64 w-64 rounded-full border border-white/10" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end lg:gap-12">
          <div className="exam-hero-copy">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#e2ebe5]">
                National-level entrance examination
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#e2ebe5]">
                For undergraduate admission
              </span>
            </div>
            <h1 className="mt-6 font-serif text-[clamp(3.5rem,8vw,6.5rem)] font-semibold leading-[.9] tracking-[-.065em]">
              {examination.name}
            </h1>
            <p className="mt-4 font-serif text-xl text-[#c8ddd0] sm:text-2xl">
              Joint Entrance Examination (Main)
            </p>
            <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-[#f3f5f1] sm:text-xl">
              {examination.purpose}
            </p>
            <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#c8ddd0]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d2b778]" aria-hidden="true" />
              Conducted by {examination.authority}
            </p>
            <div className="mt-5">
              <SavedItemButton
                type="examination"
                id={examination.id}
                context={{
                  ...(savedStage ? { stage: savedStage } : {}),
                  ...(savedFieldId ? { fieldId: savedFieldId } : {}),
                }}
              />
            </div>
          </div>

          <div className="exam-hero-papers rounded-2xl border border-white/15 bg-white/[.07] p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#c8ddd0]">
              Three paper routes
            </p>
            <ol className="mt-4 space-y-3">
              {[
                ["01", "Paper 1", "B.E. / B.Tech"],
                ["02A", "Paper 2A", "B.Arch"],
                ["02B", "Paper 2B", "B.Planning"],
              ].map(([number, paper, programme], index) => (
                <li
                  key={paper}
                  className="exam-paper-row flex items-center gap-3 border-t border-white/10 pt-3"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-[#d2b778] px-2 text-[10px] font-bold text-[#18352d]">
                    {number}
                  </span>
                  <span>
                    <span className="block text-xs text-[#c8ddd0]">{paper}</span>
                    <span className="mt-0.5 block text-sm font-semibold text-white">
                      {programme}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          </div>
        </section>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-10">
          <div className="space-y-5">
            <section
              className="cb-scroll-reveal rounded-3xl border border-[#dce7df] bg-white p-5 sm:p-7"
              aria-labelledby="purpose-title"
            >
              <SectionHeading
                icon={<GraduationCap aria-hidden="true" className="h-5 w-5" />}
                number="01"
                title="What is this examination for?"
                id="purpose-title"
              />
              <div className="mt-5 space-y-5">
                <p className="leading-relaxed text-[#52645a]">
                  JEE Main is used in admission processes for certain
                  undergraduate programmes. It is also the qualifying
                  examination for candidates seeking to appear in JEE Advanced,
                  subject to separate eligibility requirements.
                </p>
                <div>
                  <h3 className="font-semibold">Which programmes are connected to it?</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {[
                      ["B.E. / B.Tech", "Engineering and technology", "Paper 1"],
                      ["B.Arch", "Architecture", "Paper 2A"],
                      ["B.Planning", "Planning", "Paper 2B"],
                    ].map(([name, field, paper]) => (
                      <div
                        key={name}
                        className="exam-programme-card rounded-2xl bg-[#f7f8f5] p-4 transition duration-200 hover:-translate-y-1 hover:border-[#9fc5ad] hover:bg-[#eef4ef]"
                      >
                        <p className="font-serif text-xl font-semibold">{name}</p>
                        <p className="mt-1 text-sm text-[#59665e]">{field}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[.08em] text-[#718078]">
                          {paper}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#eaf2ed] p-4 sm:p-5">
                  <h3 className="font-semibold">
                    Does everyone need to take JEE Main?
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#52645a]">
                    No. Different institutions and programmes can have
                    different admission routes. Some may use JEE Main scores,
                    while others use a different entrance examination or
                    selection process.
                  </p>
                </div>
              </div>
            </section>

            <section
              className="cb-scroll-reveal rounded-3xl border border-[#dce7df] bg-white p-5 sm:p-7"
              aria-labelledby="eligibility-title"
            >
              <SectionHeading
                icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}
                number="02"
                title="Who can apply?"
                id="eligibility-title"
              />
              <p className="mt-5 leading-relaxed text-[#52645a]">
                Eligibility depends on the examination rules for the relevant
                year and the programme you want to pursue.
              </p>
              <ul className="mt-4 space-y-3">
                {[
                  [
                    "Qualifying education",
                    "Check whether you have passed or are appearing for an accepted qualifying examination.",
                  ],
                  [
                    "Required subjects",
                    "Subject requirements may differ for B.E./B.Tech, B.Arch and B.Planning.",
                  ],
                  [
                    "Year and other conditions",
                    "Review the applicable passing-year rules and other conditions in the current information bulletin.",
                  ],
                ].map(([title, description]) => (
                  <li
                    key={title}
                    className="flex gap-3 rounded-xl bg-[#f7f8f5] p-4"
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 shrink-0 text-[#145543]"
                    />
                    <p className="text-sm leading-relaxed text-[#52645a]">
                      <strong className="text-[#18352d]">{title}.</strong>{" "}
                      {description}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl border border-[#ead39a] bg-[#fff8e8] p-4 text-sm leading-relaxed text-[#594c32]">
                Being allowed to take an examination does not automatically
                mean you meet the admission requirements of every institution.
              </p>
              {officialUrl && (
                <div className="mt-3">
                  <OfficialLink href={officialUrl}>
                    Read official eligibility rules and bulletin
                  </OfficialLink>
                </div>
              )}
            </section>

            <section
              className="cb-scroll-reveal rounded-3xl border border-[#dce7df] bg-white p-5 sm:p-7"
              aria-labelledby="process-title"
            >
              <SectionHeading
                icon={<ListChecks aria-hidden="true" className="h-5 w-5" />}
                number="03"
                title="How does the process work?"
                id="process-title"
              />
              <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                A general journey from applying to exploring admission.
              </p>
              <ol className="exam-process mt-5 space-y-3">
                {processSteps.map((step, index) => (
                  <li
                    key={step.title}
                    className="exam-process-step relative grid gap-3 rounded-2xl bg-[#f7f8f5] p-4 sm:grid-cols-[2.5rem_1fr] sm:items-start"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#eaf2ed] text-sm font-bold text-[#145543]">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-[#59665e]">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section
              className="cb-scroll-reveal rounded-3xl border border-[#dce7df] bg-white p-5 sm:p-7"
              aria-labelledby="prepare-title"
            >
              <SectionHeading
                icon={<BookOpen aria-hidden="true" className="h-5 w-5" />}
                number="04"
                title="What should you prepare?"
                id="prepare-title"
              />
              <p className="mt-5 leading-relaxed text-[#52645a]">
                The examination paper you choose determines the subjects,
                pattern and syllabus you need to understand.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#f7f8f5] p-4">
                  <h3 className="font-semibold">Examination pattern</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                    Review question types, duration, marking scheme and paper
                    structure in the current bulletin.
                  </p>
                  {officialUrl && (
                    <div className="mt-2">
                      <OfficialLink href={officialUrl}>
                        View official examination updates
                      </OfficialLink>
                    </div>
                  )}
                </div>
                <div className="rounded-2xl bg-[#f7f8f5] p-4">
                  <h3 className="font-semibold">Syllabus</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                    Check the subjects and topics for your selected paper and
                    examination cycle.
                  </p>
                  {officialUrl && (
                    <div className="mt-2">
                      <OfficialLink href={officialUrl}>
                        Find official syllabus information
                      </OfficialLink>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-[#718078]">
                CareerBridge does not provide exam preparation, mock tests or
                performance tracking.
              </p>
            </section>

            <section
              className="cb-scroll-reveal rounded-3xl border border-[#dce7df] bg-white p-5 sm:p-7"
              aria-labelledby="dates-title"
            >
              <SectionHeading
                icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />}
                number="05"
                title="Important dates and application"
                id="dates-title"
              />
              <div className="mt-5 rounded-2xl border border-[#ead39a] bg-[#fff8e8] p-4 sm:p-5">
                <p className="font-semibold text-[#765b24]">
                  Current examination cycle not verified
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#594c32]">
                  Application periods, examination dates and result
                  announcements change each cycle. This page does not display
                  dates until they can be checked against the relevant official
                  notification.
                </p>
                {officialUrl && (
                  <div className="mt-3">
                    <OfficialLink href={officialUrl}>
                      Visit official examination portal
                    </OfficialLink>
                  </div>
                )}
              </div>
            </section>

            <section
              className="cb-scroll-reveal rounded-3xl bg-[#eaf2ed] p-5 sm:p-7"
              aria-labelledby="after-exam-title"
            >
              <SectionHeading
                icon={<ArrowRight aria-hidden="true" className="h-5 w-5" />}
                number="06"
                title="What happens after the examination?"
                id="after-exam-title"
              />
              <p className="mt-5 leading-relaxed text-[#354b40]">
                Your result may be used in an admission or counselling process.
                The next steps depend on the programme and participating
                institution.
              </p>
              <div className="mt-4 rounded-2xl bg-white p-4">
                <h3 className="font-semibold">Remember</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#52645a]">
                  Taking an examination or receiving a score does not guarantee
                  a seat. Separate eligibility, ranking, counselling and
                  admission requirements may still apply.
                </p>
              </div>
            </section>

            <section
              className="cb-scroll-reveal rounded-3xl border border-[#dce7df] bg-white p-5 sm:p-7"
              aria-labelledby="related-courses-title"
            >
              <h2
                id="related-courses-title"
                className="font-serif text-2xl font-semibold tracking-[-.03em] sm:text-3xl"
              >
                Explore related courses
              </h2>
              <p className="mt-2 leading-relaxed text-[#59665e]">
                If you want to understand the programmes connected to this
                examination, continue exploring.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Link
                  href={coursesHref}
                  className="group rounded-2xl bg-[#f7f8f5] p-4 transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  <span className="font-semibold">Engineering and technology</span>
                  <span className="mt-1 block text-sm text-[#59665e]">
                    Explore engineering study options after Class 12.
                  </span>
                  <span className="cb-card-action mt-3">
                    Explore courses
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </Link>
                <div className="rounded-2xl bg-[#f7f8f5] p-4">
                  <span className="font-semibold">Architecture and planning</span>
                  <span className="mt-1 block text-sm text-[#59665e]">
                    Related programme routes include B.Arch and B.Planning.
                    Course listings are not available here yet.
                  </span>
                </div>
              </div>
            </section>

            <section
              className="cb-scroll-reveal rounded-2xl border border-[#dce7df] p-5 sm:p-6"
              aria-labelledby="official-info-title"
            >
              <div className="flex items-start gap-3">
                <BookOpen
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-[#145543]"
                />
                <div>
                  <h2 id="official-info-title" className="font-semibold">
                    Official information and sources
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#52645a]">
                    This overview is based on the supplied wireframe and has
                    not been independently checked against the current JEE Main
                    information bulletin. Use the official portal for current
                    eligibility, pattern, syllabus, dates and notifications.
                    Last-checked date: not available.
                  </p>
                  {officialUrl && (
                    <div className="mt-2">
                      <OfficialLink href={officialUrl}>
                        NTA JEE Main official portal
                      </OfficialLink>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <aside className="h-fit space-y-4 lg:sticky lg:top-6">
            <section className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-6">
              <h2 className="font-serif text-2xl font-semibold tracking-[-.03em]">
                At a glance
              </h2>
              <dl className="mt-4 divide-y divide-[#e5ebe7]">
              {[
                ["Examination level", "National"],
                ["Admission level", "Undergraduate"],
                ["Typical entry stage", "After Class 12"],
                ["Examination mode", "As specified in current bulletin"],
              ].map(([label, value]) => (
                <div key={label} className="py-3 first:pt-0 last:pb-0">
                  <dt className="text-xs font-semibold uppercase tracking-[.08em] text-[#718078]">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-[#29483a]">
                    {value}
                  </dd>
                </div>
              ))}
              </dl>
              <p className="mt-4 border-t border-[#e5ebe7] pt-4 text-xs leading-relaxed text-[#59665e]">
                The entry stage means the usual qualifying education stage, not
                your current class.
              </p>
              {officialUrl && (
                <div className="mt-3">
                  <OfficialLink href={officialUrl}>
                    Official examination website
                  </OfficialLink>
                </div>
              )}
            </section>

            <nav
              aria-label="On this page"
              className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-6"
            >
              <h2 className="font-serif text-xl font-semibold">On this page</h2>
              <ol className="mt-3 space-y-1">
                {[
                  ["purpose-title", "What it is for"],
                  ["eligibility-title", "Who can apply"],
                  ["process-title", "How it works"],
                  ["prepare-title", "What to prepare"],
                  ["dates-title", "Dates and application"],
                  ["after-exam-title", "After the examination"],
                  ["related-courses-title", "Related courses"],
                ].map(([id, label], index) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="group flex min-h-10 items-center gap-3 rounded-lg px-2 text-sm text-[#52645a] transition-colors hover:bg-[#f3f5f1] hover:text-[#145543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                    >
                      <span className="text-xs font-semibold text-[#9aa89e]">
                        0{index + 1}
                      </span>
                      {label}
                      <ArrowRight
                        aria-hidden="true"
                        className="ml-auto h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                      />
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <section className="rounded-2xl bg-[#18352d] p-5 text-white">
            <p className="text-sm font-semibold text-[#c8ddd0]">
              A useful distinction
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold">
              Three different checks
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#e2ebe5]">
              <li>
                <strong className="text-white">Examination eligibility:</strong>{" "}
                Can you apply to take the examination?
              </li>
              <li>
                <strong className="text-white">Course eligibility:</strong>{" "}
                Do you meet the programme requirements?
              </li>
              <li>
                <strong className="text-white">Institution admission:</strong>{" "}
                Does the institution accept this examination, and what else is
                required?
              </li>
            </ul>
            <p className="mt-4 border-t border-white/20 pt-4 text-xs leading-relaxed text-[#c8ddd0]">
              These are not interchangeable. Check each one separately.
            </p>
            </section>
          </aside>
        </div>

        <Link
          href={listingHref}
          className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full font-semibold text-[#145543] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#145543]"
        >
          <ArrowRight aria-hidden="true" className="h-4 w-4 rotate-180" />
          Back to examinations
        </Link>
      </div>
    </main>
  );
}

function SectionHeading({
  icon,
  number,
  title,
  id,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  id: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf2ed] text-[#145543]">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold tracking-[.1em] text-[#718078]">
          {number}
        </p>
        <h2
          id={id}
          className="mt-1 font-serif text-xl font-semibold tracking-[-.025em] sm:text-2xl"
        >
          {title}
        </h2>
      </div>
    </div>
  );
}
