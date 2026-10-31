import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ExternalLink,
  MapPin,
} from "lucide-react";
import CollegeRecoveryActions from "./college-recovery-actions";
import {
  collegeRecords,
  getCollegeRouteOption,
  getCollegeRouteLabels,
  getCollegesForRoute,
  type CollegeRecord,
  type CollegeRouteOption,
} from "./college-data";

type FilterState =
  | { kind: "all" }
  | { kind: "route"; option: CollegeRouteOption }
  | { kind: "invalid" };

function resolveFilter(routeParam: string | string[] | undefined): FilterState {
  if (routeParam === undefined) return { kind: "all" };
  if (Array.isArray(routeParam)) return { kind: "invalid" };

  const option = getCollegeRouteOption(routeParam);
  return option ? { kind: "route", option } : { kind: "invalid" };
}

export default function CollegeListView({
  routeParam,
}: {
  routeParam: string | string[] | undefined;
}) {
  const filter = resolveFilter(routeParam);
  const matchingColleges =
    filter.kind === "all"
      ? collegeRecords
      : filter.kind === "route"
        ? getCollegesForRoute(filter.option.slug)
        : [];
  const backHref =
    filter.kind === "route"
      ? filter.option.parentHref
      : "/discover/results?mode=all";
  const backLabel =
    filter.kind === "route"
      ? filter.option.parentLabel
      : "Areas to Explore";

  return (
    <main className="min-h-screen bg-[#fbfaf6] text-[#18352d]">
      <header className="border-b border-white/10 bg-[#123f34] text-white">
        <div className="cb-container flex min-h-16 items-center justify-between gap-4 py-2">
          <Link
            href="/"
            className="font-serif text-xl font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f2cf78] sm:text-2xl"
          >
            CareerBridge
          </Link>
          <Link
            href="/colleges"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/35 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2cf78]"
          >
            Browse all colleges
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#123f34] pb-10 text-white sm:pb-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-40 h-[34rem] w-[34rem] rounded-full border border-white/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-24 h-[24rem] w-[24rem] rounded-full border border-[#f2cf78]/25"
        />
        <div className="cb-container relative pt-5 sm:pt-8">
          <nav aria-label="Breadcrumb" className="text-sm text-white/75">
            <Link href={backHref} className="inline-flex items-center gap-2 underline-offset-4 hover:underline">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back to {backLabel}
            </Link>
          </nav>

          <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-end lg:gap-12">
            <div className="max-w-4xl">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-[#f2cf78] sm:text-sm">
                <Building2 aria-hidden="true" className="h-4 w-4" />
                College directory · source-checked records
              </p>
              <h1 className="mt-4 max-w-[17ch] font-serif text-[clamp(2.8rem,7vw,5.4rem)] font-semibold leading-[.98] tracking-[-.055em] text-white">
                {filter.kind === "route"
                  ? `Colleges for ${filter.option.label.toLowerCase()}`
                  : filter.kind === "invalid"
                    ? "College listings"
                    : "Browse all colleges"}
              </h1>
              <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-white/80 sm:text-lg">
                Browse the institution records we can currently support with
                official sources. A listing is a place to investigate—not a
                recommendation, admission decision, or guarantee of availability.
              </p>
            </div>

            <aside className="rounded-[1.4rem] border border-white/15 bg-[#0c332b]/70 p-5 backdrop-blur-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#f2cf78]">
                What is verified
              </p>
              <p className="mt-3 font-serif text-xl font-semibold leading-snug text-white">
                Programme pages for the 2026 cycle
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                The admission dates in those pages have passed. Next-cycle
                admissions, current fees, and places must be checked with each
                college.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <div className="cb-container pb-16 pt-8 sm:pb-20 sm:pt-11">
        {filter.kind === "invalid" ? (
          <InvalidRouteState />
        ) : matchingColleges.length === 0 ? (
          <EmptyRouteState option={filter.kind === "route" ? filter.option : null} />
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
                  {filter.kind === "route"
                    ? `${filter.option.stageLabel} · study route`
                    : "A small, non-exhaustive directory"}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-.035em] text-[#102d26] sm:text-3xl">
                  {filter.kind === "route"
                    ? `Source-checked institutions (${matchingColleges.length})`
                    : `Current records (${matchingColleges.length})`}
                </h2>
              </div>
              {filter.kind === "route" ? (
                <Link
                  href="/colleges"
                  className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-[#b8c8bd] bg-white px-4 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] sm:self-auto"
                >
                  Clear route filter
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href="/colleges?route=university-degree"
                  className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-[#b8c8bd] bg-white px-4 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] sm:self-auto"
                >
                  Filter: University degree
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              )}
            </div>

            <div className="space-y-5">
              {matchingColleges.map((college) => (
                <CollegeCard
                  key={college.code}
                  college={college}
                  routeSlug={filter.kind === "route" ? filter.option.slug : undefined}
                />
              ))}
            </div>
          </>
        )}

        <CollegeRecoveryActions />
      </div>

      <footer className="bg-[#123f34] text-white">
        <div className="cb-container flex flex-col gap-3 py-7 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="font-serif text-lg font-semibold">
            CareerBridge
          </Link>
          <p className="text-sm text-white/75">
            Explore options. Your interests don’t decide your future.
          </p>
        </div>
      </footer>
    </main>
  );
}

function CollegeCard({
  college,
  routeSlug,
}: {
  college: CollegeRecord;
  routeSlug?: string;
}) {
  const detailHref = routeSlug
    ? `/college/${college.code}?route=${encodeURIComponent(routeSlug)}`
    : `/college/${college.code}`;
  const routeLabels = getCollegeRouteLabels(college);

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-[#d9ddd5] bg-white shadow-[0_18px_55px_-45px_rgba(24,53,45,.42)]">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="p-5 sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-7 items-center rounded-full bg-[#eaf2ed] px-3 text-xs font-semibold text-[#145543]">
              {college.type}
            </span>
            <span className="inline-flex min-h-7 items-center gap-1 rounded-full bg-[#f4f1e7] px-3 text-xs font-medium text-[#725b2f]">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
              {college.district}
            </span>
          </div>

          <h3 className="mt-4 font-serif text-[clamp(1.6rem,3vw,2.35rem)] font-semibold leading-tight tracking-[-.04em] text-[#102d26]">
            <Link
              href={detailHref}
              aria-label={`View details for ${college.name}`}
              className="rounded-sm underline decoration-[#c2d5c8] decoration-2 underline-offset-4 transition-colors hover:text-[#145543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#145543]"
            >
              {college.name}
            </Link>
          </h3>

          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-[#59665e]">
            <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#718078]" />
            {college.address}
          </p>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#718078]">
              Study route in published programme records
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {routeLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex min-h-8 items-center rounded-full border border-[#d9ddd5] bg-[#fbfaf6] px-3 text-xs font-medium text-[#385347]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-[#e6e8e2] pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-semibold text-[#18372e]">Programmes listed</h4>
              <span className="text-xs text-[#718078]">{college.programmeCycle}</span>
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {college.programmes.map((programme) => (
                <li
                  key={programme.name}
                  className="min-w-0 rounded-lg border border-[#e4e5df] bg-white px-3 py-2"
                >
                  <span className="block text-sm font-semibold text-[#385347]">
                    {programme.name}
                  </span>
                  {programme.subjects && programme.subjects.length > 0 ? (
                    <ul
                      aria-label={`Subjects listed under ${programme.name}`}
                      className="mt-2 flex flex-wrap gap-1.5"
                    >
                      {programme.subjects.map((subject) => (
                        <li
                          key={subject}
                          className="rounded-md bg-[#f4f6f1] px-2 py-1 text-xs text-[#59665e]"
                        >
                          {subject}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="mt-1 block text-xs leading-relaxed text-[#718078]">
                      The source does not provide a subject-specific list here.
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="border-t border-[#e6e8e2] bg-[#f7f6f0] p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-6">
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#718078]">
            Details to confirm
          </p>
          <dl className="mt-4 divide-y divide-[#e2e3dc]">
            <StatusRow label="Next intake" value="Not verified for the next cycle" />
            <StatusRow label="Fees" value={college.feesNote} />
            <StatusRow label="Hostel / facilities" value={college.hostelSummary} />
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-[#68736d]">
            Dates and conditions in the linked 2026 pages are not current
            admission guidance.
          </p>
        </aside>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#e6e8e2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-8">
        <p className="text-xs text-[#718078]">
          Official course page checked {college.sources[0]?.checkedOn}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          <a
            href={college.sources[0]?.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open official programme source for ${college.name} in a new tab`}
            className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[#145543] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            Official 2026 source
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
          <a
            href={college.officialWebsite}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${college.name} official website in a new tab`}
            className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[#145543] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            Official website
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
          <Link
            href={detailHref}
            aria-label={`Open the full college profile for ${college.name}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#145543] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            View college details
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <dt className="text-xs font-medium text-[#718078]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-relaxed text-[#385347]">
        {value}
      </dd>
    </div>
  );
}

function EmptyRouteState({ option }: { option: CollegeRouteOption | null }) {
  return (
    <section className="rounded-[1.5rem] border border-[#d9ddd5] bg-white p-6 shadow-[0_18px_55px_-45px_rgba(24,53,45,.35)] sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
        {option ? `${option.stageLabel} · ${option.label}` : "College directory"}
      </p>
      <h2 className="mt-3 max-w-2xl font-serif text-3xl font-semibold leading-tight tracking-[-.04em] text-[#102d26] sm:text-4xl">
        {option
          ? `We don’t have verified college listings for ${option.label.toLowerCase()} yet.`
          : "No reviewed college records are published yet."}
      </h2>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#59665e]">
        This directory only shows a college when an official source supports its
        connection to a study route. An empty result here does not mean that no
        college offers this option or that you cannot pursue it.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="/colleges"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
        >
          Browse all colleges
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        <Link
          href="/discover/results?mode=all"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#b8c8bd] bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
        >
          Browse all areas
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function InvalidRouteState() {
  return (
    <section className="rounded-[1.5rem] border border-[#e4cfac] bg-[#fff9eb] p-6 sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#725b2f]">
        Route filter not recognized
      </p>
      <h2 className="mt-3 max-w-2xl font-serif text-3xl font-semibold leading-tight tracking-[-.04em] text-[#102d26] sm:text-4xl">
        We couldn’t identify that study option.
      </h2>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#59665e]">
        The filter in this link isn’t one of the published Class 10 or Class 12
        study categories. Browse the full directory or return to the study areas
        to choose a valid route.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href="/colleges"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
        >
          Browse all colleges
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        <Link
          href="/discover/results?mode=all"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#b8c8bd] bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
        >
          Choose another study area
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
