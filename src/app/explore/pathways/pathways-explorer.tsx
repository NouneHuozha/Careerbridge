"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  GraduationCap,
  type LucideIcon,
  School,
  Wrench,
} from "lucide-react";
import { Breadcrumbs } from "../../breadcrumbs";
import { possibilityFields } from "../../discover/possibility-fields";
import { useEducationStage } from "../../education-stage";
import {
  getStageLabel,
  getStudyRoutes,
  type EducationStage,
} from "./route-data";

const routeIcons: Record<string, LucideIcon> = {
  "higher-secondary": School,
  "open-schooling": BookOpen,
  "polytechnic-diploma": Wrench,
  "trade-training": BriefcaseBusiness,
  "vocational-skills-class-10": BriefcaseBusiness,
  "apprenticeship-class-10": BriefcaseBusiness,
  undergraduate: GraduationCap,
  "professional-degree": GraduationCap,
  diploma: Wrench,
  "vocational-skills": BriefcaseBusiness,
  "apprenticeship-class-12": BriefcaseBusiness,
};

function isEducationStage(value: string | null): value is EducationStage {
  return value === "class-10" || value === "class-12";
}

export default function PathwaysExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const savedEducation = useEducationStage();
  const queryStage = searchParams.get("stage");
  const savedStage =
    savedEducation.status === "saved"
      ? savedEducation.stage
      : null;
  const stage = isEducationStage(queryStage) ? queryStage : savedStage;
  const isViewingDifferentStage =
    isEducationStage(queryStage) && queryStage !== savedStage;
  const field = possibilityFields.find(
    (item) => item.id === searchParams.get("field"),
  );

  function viewStage(nextStage: EducationStage) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("stage", nextStage);
    router.replace(`/explore/pathways?${params.toString()}`, { scroll: false });
  }

  const courseHref = stage
    ? `/explore/courses?${new URLSearchParams({
        ...(field ? { field: field.id } : {}),
        stage,
      }).toString()}`
    : "/explore/courses";
  const stageLabel = stage ? getStageLabel(stage) : "";
  const routes = stage
    ? getStudyRoutes(stage).map((route) => ({
        ...route,
        Icon: routeIcons[route.id] ?? BookOpen,
        href: `/explore/pathways/${route.id}?${new URLSearchParams({
          stage,
          ...(field ? { field: field.id } : {}),
        }).toString()}`,
      }))
    : [];
  const routeGroups = routes.reduce<
    { title: string; routes: typeof routes }[]
  >((groups, route) => {
    const group = groups.find((item) => item.title === route.catalogueGroup);
    if (group) {
      group.routes.push(route);
    } else {
      groups.push({ title: route.catalogueGroup, routes: [route] });
    }
    return groups;
  }, []);

  return (
    <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <Breadcrumbs
        items={[{ label: "Explore", href: "/explore" }, { label: "Pathways" }]}
        className="pt-6 sm:pt-8"
      />

      <section className="cb-container pb-8 pt-7 sm:pb-10 sm:pt-9">
        {stage && (
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eaf2ed] px-4 py-2 text-sm font-semibold text-[#145543]">
            <span className="h-2 w-2 rounded-full bg-[#2b765c]" aria-hidden="true" />
            {isViewingDifferentStage
              ? `Currently viewing routes after ${stageLabel}`
              : `Your education stage: ${stageLabel}`}
          </p>
        )}
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.68fr)] lg:items-end lg:gap-12">
          <div>
            <h1 className="max-w-[13ch] font-serif text-[clamp(2.75rem,6vw,5rem)] font-semibold leading-[.98] tracking-[-.05em]">
              Understand your study routes.
            </h1>
            <p className="mt-5 max-w-[57ch] text-lg leading-relaxed text-[#354b40] sm:text-xl">
              There is more than one way to continue your education. Explore
              different routes, understand how they work and see where they may
              lead.
            </p>
          </div>

          <section
            aria-labelledby="stage-selector-title"
            className="rounded-2xl bg-[#eaf2ed] p-5 sm:p-6"
          >
            <h2 id="stage-selector-title" className="font-serif text-2xl font-semibold tracking-[-.03em]">
              Explore routes after
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#52645a]">
              {stage
                ? "Choose a starting stage to view its education routes."
                : "Choose whether you want to explore routes from Class 10 or Class 12."}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {(["class-10", "class-12"] as const).map((option) => {
                const label = option === "class-10" ? "Class 10" : "Class 12";
                const active = stage === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => viewStage(option)}
                    className={`min-h-[54px] rounded-xl px-4 text-left text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] ${
                      active
                        ? "bg-[#145543] text-white"
                        : "bg-white text-[#18352d] hover:bg-[#f7f8f5]"
                    }`}
                  >
                    <span className="block text-xs font-medium opacity-80">
                      {active ? "Currently showing" : "View routes from"}
                    </span>
                    <span className="mt-0.5 block">{label}</span>
                  </button>
                );
              })}
            </div>
            {stage && (
              <p className="mt-3 text-xs leading-relaxed text-[#52645a]">
                Changing this view won&apos;t change your saved education stage.
              </p>
            )}
          </section>
        </div>
      </section>

      {stage ? (
        <section className="cb-container pb-10 sm:pb-14" aria-labelledby="routes-title">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 id="routes-title" className="font-serif text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
                Ways to continue after {stageLabel}
              </h2>
              <p className="mt-2 max-w-[58ch] text-base leading-relaxed text-[#59665e]">
                Here are some broad education routes you can explore. Each one works differently.
              </p>
            </div>
            <span className="text-sm font-medium text-[#59665e]">Explore in any order</span>
          </div>

          <div className="mt-7 space-y-9">
            {routeGroups.map((group, groupIndex) => (
              <section
                key={group.title}
                aria-labelledby={`route-group-${groupIndex}`}
              >
                <h3
                  id={`route-group-${groupIndex}`}
                  className="font-serif text-2xl font-semibold tracking-[-.03em] sm:text-3xl"
                >
                  {group.title}
                </h3>
                <div className="mt-4 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.routes.map(
                    ({ id, category, title, description, steps, Icon, href }) => {
                      const routeTitleId = `route-${id}`;
                      return (
                        <article
                          key={id}
                          aria-labelledby={routeTitleId}
                          className="flex h-full flex-col rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-6"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf2ed] text-[#145543]">
                              <Icon aria-hidden="true" className="h-5 w-5" />
                            </div>
                            <span className="rounded-full bg-[#f3f5f1] px-3 py-1.5 text-xs font-semibold text-[#52645a]">
                              {category}
                            </span>
                          </div>
                          <h4
                            id={routeTitleId}
                            className="mt-5 font-serif text-2xl font-semibold leading-tight tracking-[-.03em]"
                          >
                            {title}
                          </h4>
                          <p className="mt-3 min-h-[4.5rem] text-base leading-relaxed text-[#52645a]">
                            {description}
                          </p>

                          <div className="mt-6 rounded-xl bg-[#f7f8f5] p-4">
                            <p className="text-xs font-semibold text-[#59665e]">
                              The route
                            </p>
                            <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
                              {steps.map((step, stepIndex) => (
                                <li key={step} className="flex items-center gap-1.5">
                                  <span className="inline-flex min-h-9 min-w-0 items-center justify-center rounded-lg bg-white px-2.5 text-center text-xs font-semibold text-[#18352d] sm:text-sm">
                                    {step}
                                  </span>
                                  {stepIndex < steps.length - 1 && (
                                    <ArrowRight
                                      aria-hidden="true"
                                      className="h-4 w-4 shrink-0 text-[#789083]"
                                    />
                                  )}
                                </li>
                              ))}
                            </ol>
                          </div>

                          <Link
                            href={href}
                            className="cb-card-action mt-5 w-fit"
                          >
                            Understand this route{" "}
                            <ArrowRight aria-hidden="true" className="h-4 w-4" />
                          </Link>
                        </article>
                      );
                    },
                  )}
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : (
        <section className="cb-container pb-12 sm:pb-16" aria-labelledby="choose-route-stage">
          <div className="rounded-2xl border border-[#dce7df] bg-white p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eaf2ed] text-[#145543]">
                <BookOpen aria-hidden="true" className="h-6 w-6" />
              </span>
              <div>
                <h2 id="choose-route-stage" className="font-serif text-2xl font-semibold tracking-[-.03em]">
                  Choose a starting point to see routes
                </h2>
                <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-[#59665e]">
                  If you&apos;re still exploring, that&apos;s okay. Choose Class 10 or Class 12 above to view those routes. This only changes what you&apos;re browsing.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-[#eaf2ed]">
        <div className="cb-container grid gap-8 py-9 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
              You don&apos;t have to choose a route now.
            </h2>
            <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-[#354b40]">
              Explore the options at your own pace. Entry requirements and further-study opportunities vary by programme and institution.
            </p>
          </div>
          <div className="lg:text-right">
            <p className="text-sm font-semibold text-[#52645a]">Looking for a specific programme?</p>
            <Link
              href={courseHref}
              className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Explore courses <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#18352d] px-5 py-9 text-center text-[#f7f8f5]">
        <p className="font-serif text-2xl tracking-[-.03em] sm:text-3xl">
          Take your time. Curiosity is a good place to start.
        </p>
      </footer>
    </main>
  );
}
