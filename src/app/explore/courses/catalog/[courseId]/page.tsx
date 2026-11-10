import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "../../../../breadcrumbs";
import { possibilityFields } from "../../../../discover/possibility-fields";
import { courseCatalog } from "../course-catalog-data";
import { courseDetails } from "../course-detail-data";
import { resolvedInstitutionCampusOfferings } from "../../../institutions/institution-data";

type PageProps = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ stage?: string }>;
};

export const instant = false;

export function generateStaticParams() {
  return courseCatalog.map((course) => ({ courseId: course.id }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { courseId } = await params;
  const course = courseCatalog.find((item) => item.id === courseId);

  return {
    title: course ? `${course.name} | CareerBridge` : "Course guide | CareerBridge",
    description: course?.description ?? "Explore course information and study options.",
  };
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ courseId }, query] = await Promise.all([params, searchParams]);
  const course = courseCatalog.find((item) => item.id === courseId);
  if (!course) notFound();

  const details = courseDetails[course.id];
  if (!details) notFound();

  const field = possibilityFields.find((item) => item.id === course.fieldId);
  const stage =
    query.stage === "class-10" || query.stage === "class-12" || query.stage === "all"
      ? query.stage
      : course.stages[0];
  const catalogHref = `/explore/courses?${new URLSearchParams({
    stage,
    field: course.fieldId,
  }).toString()}`;
  const institutionsHref = `/explore/institutions?${new URLSearchParams({
    course: course.id,
    courseName: course.name,
    field: course.fieldId,
  }).toString()}`;
  const verifiedInstitutions = resolvedInstitutionCampusOfferings
    .filter(
      (item) =>
        item.courseId === course.id &&
        !item.isDemo &&
        item.sources?.some(
          ({ source }) =>
            source.url &&
            source.checkedOn &&
            source.verificationStatus === "verified",
        ),
    )
    .slice(0, 3);
  const entryRoutes = course.stages.map((routeStage) => ({
    stage: routeStage,
    label: routeStage === "class-10" ? "After Class 10" : "After Class 12",
    note:
      routeStage === "class-10"
        ? course.entryAfterClass10
        : course.entryAfterClass12,
  }));

  return (
    <main className="cb-page-enter min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <div className="cb-container pb-16 pt-5 sm:pb-20 sm:pt-7">
        <Breadcrumbs
          items={[
            { label: "Explore", href: "/explore" },
            { label: "Courses", href: catalogHref },
            { label: course.name },
          ]}
          className="!px-0"
        />

        <section className="mt-7 max-w-4xl">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[.11em] text-[#52715f]">
            {field && (
              <span className="rounded-full bg-[#eaf2ed] px-3 py-1.5">
                {field.name}
              </span>
            )}
            <span className="rounded-full border border-[#dce5dd] bg-white px-3 py-1.5">
              {course.qualification}
            </span>
            {course.isExplorationCategory && (
              <span className="rounded-full border border-[#ead39a] bg-[#fff8e8] px-3 py-1.5 text-[#765b24]">
                Exploration category
              </span>
            )}
          </div>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.08] tracking-[-.045em] sm:text-5xl lg:text-[3.5rem]">
            {course.name}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#59665e] sm:text-lg sm:leading-8">
            {course.description}
          </p>
          {course.isExplorationCategory && (
            <p className="mt-4 max-w-3xl rounded-xl border border-[#ead39a] bg-[#fff8e8] p-4 text-sm leading-6 text-[#594c32]">
              This is a broad exploration category, not one confirmed course or
              qualification. Compare named programmes and providers before
              making a decision.
            </p>
          )}
          <Link
            href={institutionsHref}
            className="group mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            Explore institutions offering this course
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
            />
          </Link>
        </section>

        <section
          className="cb-reveal mt-10 grid gap-7 border-y border-[#dce5dd] py-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10 lg:py-10"
          aria-labelledby="course-overview-title"
        >
          <div>
            <SectionEyebrow>About this course</SectionEyebrow>
            <h2
              id="course-overview-title"
              className="sr-only"
            >
              About this course
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#53645a]">
              {details.overview}
            </p>
            {details.simpleExplanation && (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#68766e]">
                <strong className="text-[#354b40]">In simple terms: </strong>
                {details.simpleExplanation}
              </p>
            )}
          </div>

          <aside className="rounded-2xl border border-[#e1e8e1] bg-white p-5 sm:p-6">
            <h2 className="font-serif text-xl font-semibold">At a glance</h2>
            <dl className="mt-4 divide-y divide-[#e8ede8]">
              <Fact label="Qualification" value={course.qualification} />
              <Fact label="Typical duration" value="Not verified; check with the provider" />
              <Fact label="Main focus" value={course.description} />
            </dl>
          </aside>
        </section>

        {details.learningExperience && (
          <section
            className="cb-reveal mt-11"
            style={{ animationDelay: "100ms" }}
            aria-labelledby="learning-experience-title"
          >
            <SectionEyebrow>Learning experience</SectionEyebrow>
            <h2
              id="learning-experience-title"
              className="mt-2 font-serif text-3xl font-semibold tracking-[-.035em] sm:text-4xl"
            >
              How you may learn
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {details.learningExperience.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-6"
                >
                  <h3 className="font-serif text-xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#59665e]">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section
          className="cb-reveal mt-11"
          style={{ animationDelay: "70ms" }}
          aria-labelledby="learning-areas-title"
        >
          <SectionEyebrow>What will you learn?</SectionEyebrow>
          <div className="mt-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2
                id="learning-areas-title"
                className="font-serif text-3xl font-semibold tracking-[-.035em] sm:text-4xl"
              >
                Learning areas
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#68766e]">
                The main learning areas or subjects covered in this course.
              </p>
            </div>
            <BookOpen aria-hidden="true" className="hidden h-6 w-6 text-[#6b9b7a] sm:block" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {details.learningAreas.map((area, index) => (
              <article
                key={area.title}
                className="rounded-2xl border border-[#dce7df] bg-white p-5 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[#9fc5ad] hover:shadow-[0_12px_28px_rgba(16,45,36,0.07)] motion-reduce:transform-none sm:p-6"
              >
                <span className="text-xs font-semibold uppercase tracking-[.14em] text-[#6b8a76]">
                  0{index + 1}
                </span>
                <h3 className="mt-3 font-serif text-xl font-semibold tracking-[-.02em]">
                  {area.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#59665e]">
                  {area.description}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-[#68766e]">
            Subjects and practical components may vary by institution.
          </p>
        </section>

        <section
          className="cb-reveal mt-11"
          style={{ animationDelay: "120ms" }}
          aria-labelledby="entry-routes-title"
        >
          <SectionEyebrow>Entry routes &amp; requirements</SectionEyebrow>
          <h2
            id="entry-routes-title"
            className="sr-only"
          >
            Entry routes and requirements
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#68766e]">
            Understand the different education routes through which you may enter this course. The stage options below are illustrative and need confirmation from official admission criteria.
          </p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-[#dce7df] bg-white">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="bg-[#f4f8f4] text-[10px] font-semibold uppercase tracking-[.08em] text-[#718078] sm:text-xs">
                <tr>
                  <th scope="col" className="w-[28%] px-3 py-3 sm:px-5">Entry route</th>
                  <th scope="col" className="w-[32%] px-3 py-3 sm:px-5">General requirement</th>
                  <th scope="col" className="w-[40%] px-3 py-3 sm:px-5">Additional information</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ed] text-sm">
                {entryRoutes.length ? entryRoutes.map((route) => (
                  <tr key={route.stage}>
                    <th scope="row" className="px-3 py-4 align-top font-semibold leading-5 text-[#29483a] sm:px-5">
                      {route.label}
                    </th>
                    <td className="px-3 py-4 align-top leading-5 text-[#59665e] sm:px-5">
                      {route.note || "Entry requirements need official verification."}
                    </td>
                    <td className="px-3 py-4 align-top leading-5 text-[#59665e] sm:px-5">
                      Confirm subjects and conditions with the institution.
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-5 text-sm leading-6 text-[#59665e] sm:px-5">
                      Entry routes are not listed yet; the course catalogue does not include verified routes for this course.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-[#68766e]">
            Requirements can differ between institutions. Check the institution&apos;s admission criteria before applying.
          </p>
          {details.admission && (
            <p className="mt-3 max-w-4xl text-sm leading-6 text-[#59665e]">
              {details.admission}
            </p>
          )}
        </section>

        <section
          className="cb-reveal mt-11"
          style={{ animationDelay: "170ms" }}
          aria-labelledby="institutions-title"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <SectionEyebrow>Where can you study this course?</SectionEyebrow>
              <h2
                id="institutions-title"
                className="sr-only"
              >
                Institutions offering this course
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68766e]">
                {details.providerDescription ??
                  "Explore institutions across Northeast India that offer this course."}
              </p>
            </div>
            <Link
              href={institutionsHref}
              className="group inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#145543] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#145543]"
            >
              View institution listings
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>

          {verifiedInstitutions.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {verifiedInstitutions.map((institution) => {
                const institutionParams = new URLSearchParams({
                  course: course.id,
                  courseName: course.name,
                  field: course.fieldId,
                  returnTo: institutionsHref,
                });
                const href = `/explore/institutions/${institution.slug}?${institutionParams.toString()}`;

                return (
                  <article
                    key={institution.id}
                    className="rounded-2xl border border-[#dce7df] bg-white p-5 transition-colors hover:border-[#9fc5ad] sm:p-6"
                  >
                    <h3 className="font-serif text-xl font-semibold">{institution.institution.name}</h3>
                    {(institution.campus.city || institution.campus.state) && (
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-[#59665e]">
                        <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-[#6b8a76]" />
                        {[institution.campus.city, institution.campus.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {institution.institution.type && (
                      <p className="mt-1 text-sm text-[#718078]">{institution.institution.type}</p>
                    )}
                    <Link
                      href={href}
                      className="cb-card-action mt-4 w-fit"
                    >
                      View institution
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 max-w-4xl rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-6">
              <p className="font-semibold text-[#29483a]">
                Institution listings are not ready to display yet.
              </p>
              <p className="mt-2 text-sm leading-6 text-[#59665e]">
                We need to verify the institution, campus, course offering and official links first. This does not mean the course is unavailable.
              </p>
              <Link
                href={institutionsHref}
                className="group mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#145543] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#145543]"
              >
                View institution catalogue
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>
          )}
        </section>

        <section
          className="cb-reveal mt-11 border-y border-[#dce5dd] py-8 sm:py-10"
          style={{ animationDelay: "220ms" }}
          aria-labelledby="further-study-title"
        >
          <SectionEyebrow>What can you study next?</SectionEyebrow>
          <h2
            id="further-study-title"
            className="mt-2 font-serif text-2xl font-semibold tracking-[-.03em] sm:text-3xl"
          >
            Possible further-study options
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#59665e]">
              No verified progression options are listed yet. A course can be added here only after its qualification and the next programme&apos;s official entry requirements are checked.
          </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[1, 2].map((item) => (
                <div key={item} className="rounded-xl border border-dashed border-[#cbd9cf] bg-white/70 px-4 py-4 text-sm text-[#68766e]">
                  Further-study course link pending verification
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-[#68766e]">
              These options depend on the qualification and the next course&apos;s requirements.
            </p>
        </section>

        <section
            className="cb-reveal border-b border-[#dce5dd] py-8 sm:py-10"
            style={{ animationDelay: "270ms" }}
            aria-labelledby="related-opportunities-title"
        >
            <SectionEyebrow>Related examinations &amp; scholarships</SectionEyebrow>
            <h2 id="related-opportunities-title" className="sr-only">
              Related examinations and scholarships
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#68766e]">
              Relevant opportunities connected to this course, when applicable.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                {
                  label: "Examinations",
                  text: "No course-specific exam link is verified yet. A direct relationship and current official exam information need confirmation.",
                },
                {
                  label: "Scholarships",
                  text: "No course-specific scholarship link is verified yet. Eligibility for this course and the current application source need confirmation.",
                },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-[#dce7df] bg-white p-5">
                  <p className="font-serif text-lg font-semibold text-[#29483a]">
                    {item.label} links pending verification
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#59665e]">{item.text}</p>
                </div>
              ))}
            </div>
        </section>

        <section
            className="mt-8"
          aria-labelledby="information-sources-title"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#718078]" />
            <div>
              <h2
                id="information-sources-title"
                className="text-sm font-semibold text-[#354b40]"
              >
                Information sources
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#718078]">
                Course facts still need official source links, publisher and publication date, and a last-checked date. The current catalogue is illustrative; do not use it as an admissions source.
              </p>
            </div>
          </div>
        </section>

        <Link
          href={catalogHref}
          className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#cbd9cf] bg-white px-4 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eef5ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to courses
        </Link>
      </div>
    </main>
  );
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#6b8a76]">
      {children}
    </p>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <dt className="text-xs font-semibold uppercase tracking-[.1em] text-[#718078]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium leading-5 text-[#29483a]">{value}</dd>
    </div>
  );
}