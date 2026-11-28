import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  MapPin,
} from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Breadcrumbs } from "../../../../breadcrumbs";
import { SavedItemButton } from "../../../saved-item-button";
import { HistoryVisit } from "../../../history-visit";
import { possibilityFields } from "../../../../discover/possibility-fields";
import { listPublicCourseInstitutionOfferings } from "../../../institution-page-data";
import { getPublishedCourse } from "../../../../../db/courses";

type PageProps = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ stage?: string }>;
};

export const instant = false;

export const metadata: Metadata = {
  title: "Course guide | CareerBridge",
  description: "Explore course information and study options.",
};

export default async function CourseDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ courseId }, query] = await Promise.all([params, searchParams]);
  await connection();
  const course = await getPublishedCourse(courseId);
  if (!course) notFound();

  const field = possibilityFields.find((item) => item.id === course.fieldId);
  const stage =
    query.stage === "class-10" || query.stage === "class-12" || query.stage === "all"
      ? query.stage
      : course.stages[0] ?? "all";
  const catalogHref = `/explore/courses?${new URLSearchParams({
    stage,
    field: course.fieldId,
  }).toString()}`;
  const institutionsHref = `/explore/institutions?${new URLSearchParams({
    course: course.id,
    courseName: course.name,
    field: course.fieldId,
    stage,
  }).toString()}`;
  const verifiedInstitutions = (await listPublicCourseInstitutionOfferings(course.id))
    .filter(
      (item) =>
        item.sources.some(
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
      <HistoryVisit
        type="course"
        id={course.id}
        context={{ fieldId: course.fieldId, stage }}
      />
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
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={institutionsHref}
              className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Explore institutions offering this course
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
            <SavedItemButton
              type="course"
              id={course.id}
              context={{ fieldId: course.fieldId, stage }}
            />
          </div>
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
              {course.overview}
            </p>
            {course.simpleExplanation && (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#68766e]">
                <strong className="text-[#354b40]">In simple terms: </strong>
                {course.simpleExplanation}
              </p>
            )}
          </div>

          <aside className="rounded-2xl border border-[#e1e8e1] bg-white p-5 sm:p-6">
            <h2 className="font-serif text-xl font-semibold">At a glance</h2>
            <dl className="mt-4 divide-y divide-[#e8ede8]">
              <Fact label="Qualification" value={course.qualification} />
              <Fact label="Main focus" value={course.description} />
            </dl>
          </aside>
        </section>

        {course.learningExperience && (
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
              {course.learningExperience.map((item) => (
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
            {course.learningAreas.map((area, index) => (
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
          {course.admission && (
            <p className="mt-3 max-w-4xl text-sm leading-6 text-[#59665e]">
              {course.admission}
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
                {course.providerDescription ??
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
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Link
                        href={href}
                        className="cb-card-action"
                      >
                        View institution
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </Link>
                      {institution.prospectus?.url && (
                        <a
                          href={institution.prospectus.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#145543] underline underline-offset-2 hover:text-[#0f4537]"
                        >
                          Prospectus ↗
                        </a>
                      )}
                    </div>
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

        <p className="mt-10 text-sm leading-6 text-[#718078]">
          Course details and entry requirements can vary by programme and provider. Confirm current requirements before applying.
        </p>

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