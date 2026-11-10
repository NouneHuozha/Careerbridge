import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  FileText,
  GraduationCap,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { Breadcrumbs } from "../../../breadcrumbs";
import {
  scholarships,
  scholarshipStudyLevels,
} from "../scholarship-data";

type PageProps = {
  params: Promise<{ scholarshipId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const instant = false;

function getStudyLevelLabels(values: string[]) {
  return values
    .flatMap((value) => {
      const level = scholarshipStudyLevels.find((item) => item.value === value);
      return level ? [level.label] : [];
    });
}

function getListingHref(
  query: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") params.set(key, value);
    else value?.forEach((item) => params.append(key, item));
  }
  const queryString = params.toString();
  return `/explore/scholarships${queryString ? `?${queryString}` : ""}`;
}

function OfficialLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex min-h-11 items-center gap-2 font-semibold text-[#145543] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] ${className}`}
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
    </a>
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

export function generateStaticParams() {
  return scholarships.map(({ id }) => ({ scholarshipId: id }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { scholarshipId } = await params;
  const scholarship = scholarships.find((item) => item.id === scholarshipId);

  return scholarship
    ? {
        title: `${scholarship.name} | Scholarships | CareerBridge`,
        description: scholarship.purpose,
      }
    : { title: "Scholarship details | CareerBridge" };
}

export default async function ScholarshipDetailsPage({
  params,
  searchParams,
}: PageProps) {
  const [{ scholarshipId }, query] = await Promise.all([params, searchParams]);
  const scholarship = scholarships.find((item) => item.id === scholarshipId);
  if (!scholarship) notFound();

  const listingHref = getListingHref(query);
  const studyLevels = getStudyLevelLabels(scholarship.studyLevels);
  const hasRelatedOptions = Boolean(
    scholarship.detail.relatedCourses?.length ||
      scholarship.detail.relatedInstitutions?.length,
  );
  const sectionOffset = Number(hasRelatedOptions);
  const pageSections: [string, string][] = [
    ["support", "Financial support"],
    ["eligibility", "Eligibility"],
    ...(hasRelatedOptions
      ? [["covered-options", "Covered courses and institutions"] as [string, string]]
      : []),
    ["application", "Application"],
    ["documents", "Documents"],
    ...(scholarship.detail.renewal
      ? [["renewal", "Renewal"] as [string, string]]
      : []),
    ["sources", "Official sources"],
  ];

  return (
    <main className="cb-page-enter min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <div className="cb-container pb-14 pt-6 sm:pb-20 sm:pt-8">
        <Breadcrumbs
          items={[
            { label: "Explore", href: "/explore" },
            { label: "Scholarships", href: listingHref },
            { label: scholarship.name },
          ]}
          className="!px-0"
        />

        <section className="relative mt-8 overflow-hidden rounded-[2rem] bg-[#18352d] px-6 py-8 text-white sm:px-10 sm:py-11 lg:px-14 lg:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-4 -top-16 h-64 w-64 rounded-full border border-white/10"
          />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end lg:gap-12">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#e2ebe5]">
                  {scholarship.category}
                </span>
                <span className="rounded-full border border-[#d2b778]/40 bg-[#d2b778]/10 px-3 py-1.5 text-xs font-semibold text-[#f0dfb6]">
                  Current status not verified
                </span>
              </div>
              <h1 className="mt-6 max-w-4xl font-serif text-[clamp(2.6rem,4.5vw,4rem)] font-semibold leading-[.94] tracking-[-.055em]">
                {scholarship.name}
              </h1>
              <p className="mt-4 font-serif text-xl text-[#c8ddd0] sm:text-2xl">
                Provided by {scholarship.provider}
              </p>
              <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-[#f3f5f1] sm:text-xl">
                {scholarship.purpose}
              </p>
              <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#c8ddd0]">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                Use the official scheme information to confirm current details.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/[.07] p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#c8ddd0]">
                Study levels
              </p>
              <ul className="mt-4 space-y-3">
                {studyLevels.map((level, index) => (
                  <li
                    key={level}
                    className="flex items-center gap-3 border-t border-white/10 pt-3"
                  >
                    <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-[#d2b778] px-2 text-[10px] font-bold text-[#18352d]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {level}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-10">
          <div className="space-y-5">
            <section
              id="support"
              className="cb-scroll-reveal rounded-3xl border border-[#dce7df] bg-white p-5 sm:p-7"
              aria-labelledby="support-title"
            >
              <SectionHeading
                icon={<GraduationCap aria-hidden="true" className="h-5 w-5" />}
                number="01"
                title="What support does it provide?"
                id="support-title"
              />
              <p className="mt-4 text-base leading-relaxed text-[#52645a]">
                {scholarship.support}. The following scheme-specific points
                identify what to confirm; they are not verified current award
                terms.
              </p>
              <div className="mt-5 rounded-2xl border border-[#dce7df] bg-[#f5f8f5] p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#52715f]">
                  Benefit details to confirm
                </p>
                <ul className="mt-3 space-y-3 text-sm leading-relaxed text-[#354b40]">
                  {scholarship.detail.benefitNotes.map((item) => (
                    <li key={item} className="flex gap-3">
                      <CheckCircle2
                        aria-hidden="true"
                        className="mt-0.5 h-4 w-4 shrink-0 text-[#4c8067]"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[#59665e]">
                No exact amount is shown here because current award values and
                conditions have not been independently verified.
              </p>
            </section>

            <section
              id="eligibility"
              className="cb-scroll-reveal rounded-3xl border border-[#dce7df] bg-white p-5 sm:p-7"
              aria-labelledby="eligibility-title"
            >
              <SectionHeading
                icon={<ShieldCheck aria-hidden="true" className="h-5 w-5" />}
                number="02"
                title="Who can apply?"
                id="eligibility-title"
              />
              <p className="mt-3 text-base leading-relaxed text-[#52645a]">
                These scheme-specific conditions are a starting point for
                checking the official guidelines, not a confirmation that you
                are eligible.
              </p>
              <ul className="mt-5 divide-y divide-[#e7ece8]">
                {scholarship.detail.eligibility.map(({ title, description }) => (
                  <li key={title} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                    <CircleHelp
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 shrink-0 text-[#4c8067]"
                    />
                    <div>
                      <h3 className="font-semibold text-[#18352d]">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-[#52645a]">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-xl bg-[#fff8e8] px-4 py-3 text-sm leading-relaxed text-[#594c32]">
                Meeting eligibility conditions does not guarantee selection or
                payment. The responsible authority makes those decisions.
              </p>
            </section>

            {hasRelatedOptions && (
              <section
                id="covered-options"
                className="cb-scroll-reveal rounded-3xl border border-[#dce7df] bg-white p-5 sm:p-7"
                aria-labelledby="covered-options-title"
              >
                <SectionHeading
                  icon={<BookOpen aria-hidden="true" className="h-5 w-5" />}
                  number="03"
                  title="Courses and institutions covered"
                  id="covered-options-title"
                />
                <p className="mt-3 text-sm leading-relaxed text-[#52645a]">
                  These options are linked only when a supported relationship
                  has been confirmed for this scheme. Always verify the current
                  scheme notice.
                </p>
                {scholarship.detail.relatedCourses?.length ? (
                  <ul className="mt-4 divide-y divide-[#e7ece8]">
                    {scholarship.detail.relatedCourses.map((course) => (
                      <li
                        key={course.href}
                        className="flex flex-wrap items-center justify-between gap-2 py-3"
                      >
                        <span className="text-sm text-[#354b40]">
                          {course.name}
                        </span>
                        <Link
                          href={course.href}
                          className="cb-card-action"
                        >
                          Explore course
                          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {scholarship.detail.relatedInstitutions?.length ? (
                  <ul className="mt-4 divide-y divide-[#e7ece8]">
                    {scholarship.detail.relatedInstitutions.map(
                      (institution) => (
                        <li
                          key={institution.href}
                          className="flex flex-wrap items-center justify-between gap-2 py-3"
                        >
                          <span className="text-sm text-[#354b40]">
                            {institution.name}
                          </span>
                          <Link
                            href={institution.href}
                            className="cb-card-action"
                          >
                            View institution
                            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                          </Link>
                        </li>
                      ),
                    )}
                  </ul>
                ) : null}
              </section>
            )}

            <section
              id="application"
              className="cb-scroll-reveal rounded-3xl border border-[#dce7df] bg-white p-5 sm:p-7"
              aria-labelledby="application-title"
            >
              <SectionHeading
                icon={<ListChecks aria-hidden="true" className="h-5 w-5" />}
                number={String(3 + sectionOffset).padStart(2, "0")}
                title="How to apply"
                id="application-title"
              />
              <p className="mt-3 text-base leading-relaxed text-[#52645a]">
                {scholarship.detail.applicationMethod}
              </p>
              <ol className="mt-5 space-y-4">
                {scholarship.detail.applicationSteps.map((item, index) => (
                  <li key={item} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eaf2ed] text-xs font-bold text-[#145543]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="pt-1 text-sm leading-relaxed text-[#52645a]">
                      {item}
                    </p>
                  </li>
                ))}
              </ol>
              {scholarship.detail.afterApplication && (
                <div className="mt-5 rounded-2xl border border-[#dce7df] bg-[#f5f8f5] p-4 sm:p-5">
                  <h3 className="font-semibold text-[#18352d]">
                    What happens after you apply?
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#52645a]">
                    {scholarship.detail.afterApplication}
                  </p>
                </div>
              )}
              <p className="mt-5 text-sm leading-relaxed text-[#59665e]">
                This page does not accept applications. Follow the official
                source for the correct portal and instructions.
              </p>
            </section>

            <section
              id="documents"
              className="cb-scroll-reveal rounded-3xl border border-[#dce7df] bg-white p-5 sm:p-7"
              aria-labelledby="documents-title"
            >
              <SectionHeading
                icon={<FileText aria-hidden="true" className="h-5 w-5" />}
                number={String(4 + sectionOffset).padStart(2, "0")}
                title="Documents to check"
                id="documents-title"
              />
              <p className="mt-5 text-sm leading-relaxed text-[#52645a]">
                The official application notice determines what is required.
                These scheme-related examples have not been confirmed for the
                current cycle:
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {scholarship.detail.documents.map((item) => (
                  <li
                    key={item}
                    className="rounded-xl border border-[#e4eae5] bg-[#f8faf8] px-4 py-3 text-sm text-[#354b40]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {scholarship.detail.renewal && (
              <section
                id="renewal"
                className="cb-scroll-reveal rounded-3xl border border-[#dce7df] bg-white p-5 sm:p-7"
                aria-labelledby="renewal-title"
              >
                <SectionHeading
                  icon={<BookOpen aria-hidden="true" className="h-5 w-5" />}
                  number={String(5 + sectionOffset).padStart(2, "0")}
                  title="Renewal and continuation"
                  id="renewal-title"
                />
                <p className="mt-5 text-base leading-relaxed text-[#52645a]">
                  {scholarship.detail.renewal}
                </p>
              </section>
            )}

            <section
              id="sources"
              className="cb-scroll-reveal rounded-3xl border border-[#dce7df] bg-white p-5 sm:p-7"
              aria-labelledby="sources-title"
            >
              <SectionHeading
                icon={<BookOpen aria-hidden="true" className="h-5 w-5" />}
                number={String(
                  5 +
                    sectionOffset +
                    Number(Boolean(scholarship.detail.renewal)),
                ).padStart(2, "0")}
                title="Official information and sources"
                id="sources-title"
              />
              <p className="mt-3 text-sm leading-relaxed text-[#52645a]">
                Scheme descriptions here are sample content. Current
                eligibility, benefits, dates and application instructions have
                not been independently verified.
              </p>
              <div className="mt-5 rounded-2xl border border-[#dce7df] bg-[#f5f8f5] p-4 sm:p-5">
                <p className="font-semibold text-[#18352d]">
                  {scholarship.detail.sourceTitle}
                </p>
                <p className="mt-1 text-sm text-[#59665e]">
                  {scholarship.provider}
                  {scholarship.detail.sourceYear
                    ? ` · ${scholarship.detail.sourceYear}`
                    : " · Applicable year not confirmed"}
                </p>
                <OfficialLink
                  href={scholarship.officialUrl}
                  className="mt-2"
                >
                  View official information
                </OfficialLink>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-[#718078]">
                {scholarship.detail.lastChecked
                  ? `Last checked: ${scholarship.detail.lastChecked}. `
                  : "Last checked: Not yet verified. "}
                The current-cycle notice and detailed rules have not been
                independently confirmed. Always rely on the latest official
                publication.
              </p>
            </section>
          </div>

          <aside className="h-fit space-y-4 lg:sticky lg:top-6">
            <section className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-6">
              <h2 className="font-serif text-2xl font-semibold tracking-[-.03em]">
                At a glance
              </h2>
              <dl className="mt-4 divide-y divide-[#e7ece8]">
                <div className="py-3 first:pt-0">
                  <dt className="text-xs font-semibold uppercase tracking-[.08em] text-[#718078]">
                    Application period
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-[#18352d]">
                    Current cycle not verified
                  </dd>
                </div>
                <div className="py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[.08em] text-[#718078]">
                    Financial support
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-[#354b40]">
                    {scholarship.support}
                  </dd>
                </div>
                <div className="py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[.08em] text-[#718078]">
                    Study level
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-[#354b40]">
                    {studyLevels.join(" · ")}
                  </dd>
                </div>
                <div className="py-3">
                  <dt className="text-xs font-semibold uppercase tracking-[.08em] text-[#718078]">
                    Eligibility region
                  </dt>
                  <dd className="mt-1 text-sm text-[#354b40]">
                    {scholarship.eligibilityRegions === "all"
                      ? "As specified in scheme"
                      : "Northeast states"}
                  </dd>
                </div>
                <div className="py-3 last:pb-0">
                  <dt className="text-xs font-semibold uppercase tracking-[.08em] text-[#718078]">
                    Provider
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-[#354b40]">
                    {scholarship.provider}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 rounded-xl bg-[#fff8e8] p-3.5">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#765b24]">
                  <CalendarDays aria-hidden="true" className="h-4 w-4" />
                  Dates not confirmed
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#594c32]">
                  Check the latest official notification for the application
                  period and deadline.
                </p>
              </div>

              <OfficialLink
                href={scholarship.officialUrl}
                className="mt-5 inline-flex w-full justify-center rounded-full bg-[#145543] px-4 text-sm text-white transition-colors hover:bg-[#0f4537] focus-visible:outline-offset-4"
              >
                Check official information
              </OfficialLink>
              <p className="mt-3 text-center text-xs leading-relaxed text-[#718078]">
                CareerBridge does not process scholarship applications.
              </p>
            </section>

            <nav
              aria-label="On this page"
              className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-6"
            >
              <h2 className="font-serif text-xl font-semibold">On this page</h2>
              <ol className="mt-3 space-y-1">
                {pageSections.map(([id, label], index) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="group flex min-h-10 items-center gap-3 rounded-lg px-2 text-sm text-[#52645a] transition-colors hover:bg-[#f3f5f1] hover:text-[#145543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                    >
                      <span className="text-xs font-semibold text-[#9aa89e]">
                        {String(index + 1).padStart(2, "0")}
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
                Before you apply
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold">
                Check this cycle
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#e2ebe5]">
                Confirm eligibility, award details and deadlines in the latest
                official notice. Sample information here is not a substitute
                for current scheme rules.
              </p>
            </section>
          </aside>
        </div>

        <Link
          href={listingHref}
          className="mt-8 inline-flex min-h-11 items-center gap-2 font-semibold text-[#145543] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#145543]"
        >
          <ArrowRight aria-hidden="true" className="h-4 w-4 rotate-180" />
          Back to scholarships
        </Link>
      </div>
    </main>
  );
}
