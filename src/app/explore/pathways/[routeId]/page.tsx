import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "../../../breadcrumbs";
import { SavedItemButton } from "../../saved-item-button";
import { HistoryVisit } from "../../history-visit";
import { possibilityFields } from "../../../discover/possibility-fields";
import {
  getStageLabel,
  getStudyRoute,
  studyRoutes,
} from "../route-data";

export const instant = false;

type RoutePageProps = {
  params: Promise<{ routeId: string }>;
  searchParams: Promise<{ field?: string }>;
};

export function generateStaticParams() {
  return studyRoutes.map(({ id }) => ({ routeId: id }));
}

export async function generateMetadata({
  params,
}: RoutePageProps): Promise<Metadata> {
  const { routeId } = await params;
  const route = getStudyRoute(routeId);

  return route
    ? {
        title: `${route.title} | Study Routes | CareerBridge`,
        description: route.introduction,
      }
    : { title: "Study route | CareerBridge" };
}

export default async function StudyRouteDetailsPage({
  params,
  searchParams,
}: RoutePageProps) {
  const [{ routeId }, query] = await Promise.all([params, searchParams]);
  const route = getStudyRoute(routeId);
  if (!route) notFound();

  const field = possibilityFields.find((item) => item.id === query.field);
  const stageLabel = getStageLabel(route.stage);
  const routesHref = `/explore/pathways?${new URLSearchParams({
    stage: route.stage,
    ...(field ? { field: field.id } : {}),
  }).toString()}`;
  const coursesHref = `/explore/courses?${new URLSearchParams({
    stage: route.courseStage,
    ...(field ? { field: field.id } : {}),
  }).toString()}`;

  return (
    <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <HistoryVisit
        type="pathway"
        id={route.id}
        context={{
          stage: route.stage,
          ...(field ? { fieldId: field.id } : {}),
        }}
      />
      <div className="cb-container pb-14 pt-6 sm:pb-20 sm:pt-8">
        <Breadcrumbs
          items={[
            { label: "Explore", href: "/explore" },
            { label: "Pathways", href: routesHref },
            { label: route.title },
          ]}
          className="!px-0"
        />

        <section className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#eaf2ed] px-4 py-2 text-sm font-semibold text-[#145543]">
              <span className="h-2 w-2 rounded-full bg-[#2b765c]" aria-hidden="true" />
              After {stageLabel} <span aria-hidden="true">·</span> {route.category}
            </p>
            <h1 className="mt-5 max-w-[18ch] font-serif text-[clamp(2.75rem,6vw,5rem)] font-semibold leading-[.98] tracking-[-.05em]">
              {route.title}
            </h1>
            <p className="mt-5 max-w-[64ch] text-lg leading-relaxed text-[#354b40] sm:text-xl">
              {route.introduction}
            </p>
            <div className="mt-5">
              <SavedItemButton
                type="pathway"
                id={route.id}
                context={{
                  stage: route.stage,
                  ...(field ? { fieldId: field.id } : {}),
                }}
              />
            </div>
          </div>
          <aside className="rounded-2xl bg-[#eaf2ed] p-5 sm:p-6">
            <p className="text-sm font-semibold text-[#145543]">A route overview</p>
            <p className="mt-2 text-sm leading-relaxed text-[#354b40]">
              This explains a broad study route. Exact entry, assessment and
              progression conditions depend on the specific programme.
            </p>
          </aside>
        </section>

        <section className="mt-12 sm:mt-16" aria-labelledby="progression-title">
          <div className="max-w-3xl">
            <h2
              id="progression-title"
              className="font-serif text-3xl font-semibold tracking-[-.04em] sm:text-4xl"
            >
              How this route works
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#59665e] sm:text-lg">
              Follow the stages from your starting point through the programme.
              The number and order of steps vary by route.
            </p>
          </div>

          <ol className="mt-7 space-y-3">
            {route.progression.map((step, index) => (
              <li
                key={step.title}
                className="grid gap-4 rounded-2xl border border-[#dce7df] bg-white p-5 sm:grid-cols-[7.5rem_minmax(0,1fr)_minmax(10rem,.45fr)] sm:items-center sm:gap-6 sm:p-6"
              >
                <p className="text-sm font-semibold text-[#718078]">
                  STEP {String(index + 1).padStart(2, "0")}
                </p>
                <div>
                  <h3 className="font-serif text-xl font-semibold tracking-[-.02em] sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-[#52645a]">
                    {step.description}
                  </p>
                </div>
                {step.nextStage && (
                  <div className="flex items-center gap-2 rounded-xl bg-[#f3f5f1] px-4 py-3 text-sm text-[#52645a] sm:block sm:text-right">
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-[#145543] sm:hidden"
                    />
                    <span className="block text-xs font-semibold">NEXT STAGE</span>
                    <span className="mt-0.5 block font-semibold text-[#18352d]">
                      {step.nextStage}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12 sm:mt-16" aria-labelledby="qualification-title">
          <div className="grid gap-5 rounded-2xl bg-[#eaf2ed] p-5 sm:p-7 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)] lg:items-center">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#145543]">
                <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#52645a]">QUALIFICATION</p>
                <h2
                  id="qualification-title"
                  className="mt-1 font-serif text-2xl font-semibold tracking-[-.03em]"
                >
                  {route.qualification.title}
                </h2>
              </div>
            </div>
            <p className="text-base leading-relaxed text-[#354b40]">
              {route.qualification.description}
            </p>
          </div>
        </section>

        <section className="mt-12 sm:mt-16" aria-labelledby="conditions-title">
          <div className="max-w-3xl">
            <h2
              id="conditions-title"
              className="font-serif text-3xl font-semibold tracking-[-.04em] sm:text-4xl"
            >
              Things to understand about this route
            </h2>
          </div>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {route.considerations.map((item) => (
              <li key={item.title} className="rounded-2xl bg-white p-5 sm:p-6">
                <h3 className="font-semibold text-[#18352d]">{item.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-[#52645a]">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {route.furtherProgression && (
          <section className="mt-12 sm:mt-16" aria-labelledby="further-progression-title">
            <h2
              id="further-progression-title"
              className="font-serif text-3xl font-semibold tracking-[-.04em] sm:text-4xl"
            >
              What may come next
            </h2>
            <p className="mt-3 max-w-[68ch] text-base leading-relaxed text-[#354b40] sm:text-lg">
              {route.furtherProgression}
            </p>
          </section>
        )}

        <section
          className="mt-12 rounded-2xl bg-[#18352d] p-6 text-white sm:mt-16 sm:p-9"
          aria-labelledby="courses-title"
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-[#c8ddd0]">
                A next step when you&apos;re ready
              </p>
              <h2
                id="courses-title"
                className="mt-2 font-serif text-3xl font-semibold tracking-[-.04em] sm:text-4xl"
              >
                Explore courses through this route
              </h2>
              <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-[#e2ebe5]">
                {route.courseStage === "class-12"
                  ? "After Class 12, explore degree programmes, diplomas and other study options based on your subjects and each programme’s admission requirements."
                  : `Explore course options connected to study routes after ${stageLabel}. Requirements depend on the named programme and provider.`}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#c8ddd0]">
                Courses after {getStageLabel(route.courseStage)}
              </p>
              <Link
                href={coursesHref}
                className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Explore courses
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section
          className="mt-8 rounded-2xl border border-[#dce7df] p-5 sm:p-6"
          aria-labelledby="sources-title"
        >
          <div className="flex items-start gap-3">
            <BookOpen
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-[#145543]"
            />
            <div>
              <h2 id="sources-title" className="font-semibold">
                Sources and verification
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#52645a]">
                This is a general illustrative overview, not checked against a
                specific programme, institution or current admission notice.
                {route.references?.length
                  ? " The following references were named in the supplied content; their links and relevance have not been independently verified."
                  : " No named reference or last-checked date is available for this overview."}
              </p>
              {route.references && route.references.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {route.references.map((reference) => (
                    <li
                      key={reference}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#52645a]"
                    >
                      {reference}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <Link
          href={routesHref}
          className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full font-semibold text-[#145543] transition-colors hover:text-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#145543]"
        >
          <ArrowRight aria-hidden="true" className="h-4 w-4 rotate-180" />
          Back to study routes
        </Link>
      </div>
    </main>
  );
}
