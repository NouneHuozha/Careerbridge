"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Breadcrumbs } from "../../breadcrumbs";
import {
  northeastStates,
  scholarships,
  scholarshipStudyLevels,
  type ScholarshipStatus,
  type ScholarshipStudyLevel,
} from "./scholarship-data";

const statusValues = ["all", "open", "upcoming", "closed", "unknown"] as const;
type StatusFilter = (typeof statusValues)[number];
const sortValues = ["relevance", "az", "za"] as const;
type SortOrder = (typeof sortValues)[number];

function isStudyLevel(value: string | null): value is ScholarshipStudyLevel {
  return scholarshipStudyLevels.some((level) => level.value === value);
}

function isStatus(value: string | null): value is StatusFilter {
  return value !== null && statusValues.some((status) => status === value);
}

function isSortOrder(value: string | null): value is SortOrder {
  return value !== null && sortValues.some((sort) => sort === value);
}

function isNortheastRegion(value: string) {
  return value === "northeast";
}

function matchesEligibilityRegion(
  eligibilityRegions: "all" | string[],
  selectedRegion: string,
) {
  if (selectedRegion === "all" || eligibilityRegions === "all") return true;
  if (isNortheastRegion(selectedRegion)) {
    return northeastStates.some((state) => eligibilityRegions.includes(state));
  }
  return eligibilityRegions.includes(selectedRegion);
}

function statusLabel(status: ScholarshipStatus) {
  if (status === "unknown") return "Status not verified";
  if (status === "open") return "Application open";
  if (status === "upcoming") return "Not announced";
  return "Application closed";
}

export default function ScholarshipExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const queryLevel = searchParams.get("level");
  const level = isStudyLevel(queryLevel) ? queryLevel : "all";
  const provider = searchParams.get("provider") ?? "all";
  const region = searchParams.get("region") ?? "all";
  const queryStatus = searchParams.get("status");
  const status: StatusFilter = isStatus(queryStatus) ? queryStatus : "all";
  const querySort = searchParams.get("sort");
  const sort: SortOrder = isSortOrder(querySort) ? querySort : "relevance";

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
    }
    const queryString = params.toString();
    router.replace(
      `/explore/scholarships${queryString ? `?${queryString}` : ""}`,
      { scroll: false },
    );
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredScholarships = scholarships
    .filter((scholarship) => {
      const matchesLevel =
        level === "all" || scholarship.studyLevels.includes(level);
      const matchesProvider =
        provider === "all" || scholarship.provider === provider;
      const matchesRegion = matchesEligibilityRegion(
        scholarship.eligibilityRegions,
        region,
      );
      const matchesStatus =
        status === "all" || scholarship.status === status;
      const searchableText = [
        scholarship.name,
        scholarship.provider,
        scholarship.category,
        scholarship.purpose,
        scholarship.support,
        ...scholarship.studyLevels,
        ...(scholarship.eligibilityRegions === "all"
          ? ["all regions"]
          : scholarship.eligibilityRegions),
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesLevel &&
        matchesProvider &&
        matchesRegion &&
        matchesStatus &&
        (!normalizedQuery || searchableText.includes(normalizedQuery))
      );
    })
    .sort((a, b) => {
      if (sort === "relevance") return 0;
      const order = a.name.localeCompare(b.name);
      return sort === "az" ? order : -order;
    });

  const providers = [...new Set(scholarships.map((item) => item.provider))].sort(
    (a, b) => a.localeCompare(b),
  );

  return (
    <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <Breadcrumbs
        items={[
          { label: "Explore", href: "/explore" },
          { label: "Scholarships" },
        ]}
        className="pt-6 sm:pt-8"
      />

      <section className="bg-[#f5f7f2]">
        <div className="cb-container py-8 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#52715f] sm:text-sm">
            Financial support for your education
          </p>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl font-semibold leading-[1.05] tracking-[-.045em] sm:text-5xl">
            Find support for your education.
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#354b40] sm:text-lg">
            Discover scholarships and financial assistance that may help you
            continue your studies.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,48rem)_auto] md:items-center md:justify-start">
            <label className="flex min-h-13 items-center gap-3 rounded-xl border border-[#cbd8d0] bg-white px-4 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#145543]">
              <Search
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-[#59665e]"
              />
              <span className="sr-only">
                Search scholarships, providers, courses or fields
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => updateParams({ q: event.target.value })}
                placeholder="Search scholarships, providers, courses or fields..."
                className="min-w-0 flex-1 bg-transparent text-base text-[#18352d] outline-none placeholder:text-[#718078]"
              />
            </label>

            <label className="flex min-h-13 items-center gap-3 rounded-xl border border-[#cbd8d0] bg-white px-3 text-sm font-medium text-[#59665e] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#145543]">
              <span className="shrink-0">Study level</span>
              <select
                aria-label="Study level"
                value={level}
                onChange={(event) => updateParams({ level: event.target.value })}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#18352d] outline-none"
              >
                <option value="all">All levels</option>
                {scholarshipStudyLevels.map((studyLevel) => (
                  <option key={studyLevel.value} value={studyLevel.value}>
                    {studyLevel.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section
        className="cb-container pb-10 sm:pb-14"
        aria-labelledby="scholarships-title"
      >
        <div className="border-t border-[#dce7df] pt-6 sm:pt-8">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2
                id="scholarships-title"
                className="font-serif text-2xl font-semibold tracking-[-.035em] sm:text-3xl"
              >
                Scholarships and financial assistance
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[#59665e]">
                Explore opportunities from different providers.
              </p>
            </div>
            <span className="text-sm font-medium text-[#52645a]">
              {filteredScholarships.length}{" "}
              {filteredScholarships.length === 1 ? "result" : "results"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#e5ebe7] pb-4">
            <span className="text-sm font-medium text-[#59665e]">Filter:</span>
            <label className="sr-only" htmlFor="scholarship-provider-filter">
              Provider
            </label>
            <select
              id="scholarship-provider-filter"
              value={provider}
              onChange={(event) =>
                updateParams({ provider: event.target.value })
              }
              className="min-h-10 max-w-full rounded-xl border border-[#cbd9cf] bg-white px-3 text-sm text-[#18352d] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              <option value="all">All providers</option>
              {providers.map((providerName) => (
                <option key={providerName} value={providerName}>
                  {providerName}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="scholarship-region-filter">
              Eligibility region
            </label>
            <select
              id="scholarship-region-filter"
              value={region}
              onChange={(event) => updateParams({ region: event.target.value })}
              className="min-h-10 rounded-xl border border-[#cbd9cf] bg-white px-3 text-sm text-[#18352d] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              <option value="all">All regions</option>
              <option value="northeast">Northeast</option>
              {northeastStates.map((stateName) => (
                <option key={stateName} value={stateName}>
                  {stateName}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="scholarship-status-filter">
              Application status
            </label>
            <select
              id="scholarship-status-filter"
              value={status}
              onChange={(event) => updateParams({ status: event.target.value })}
              className="min-h-10 rounded-xl border border-[#cbd9cf] bg-white px-3 text-sm text-[#18352d] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              <option value="all">All statuses</option>
              <option value="open">Application open</option>
              <option value="upcoming">Not announced</option>
              <option value="closed">Application closed</option>
              <option value="unknown">Status not verified</option>
            </select>

            <label className="ml-0 flex min-h-10 items-center gap-2 text-sm font-medium text-[#59665e] sm:ml-auto">
              Sort
              <select
                value={sort}
                onChange={(event) => updateParams({ sort: event.target.value })}
                className="min-h-10 rounded-xl border border-[#cbd9cf] bg-white px-3 text-sm text-[#18352d] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                <option value="relevance">Relevance</option>
                <option value="az">Name A–Z</option>
                <option value="za">Name Z–A</option>
              </select>
            </label>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-[#59665e]">
            These are real scheme examples, but application status and
            eligibility are not live verified. Check each official source for
            current details before applying.
          </p>

          {filteredScholarships.length ? (
            <div className="mt-5 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredScholarships.map((scholarship, index) => (
                <article
                  key={scholarship.id}
                  className="cb-reveal group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce7df] bg-white p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-[#9fc5ad] hover:shadow-[0_16px_34px_rgba(16,45,36,0.1)] motion-reduce:transform-none sm:p-6"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-1 origin-bottom scale-y-0 bg-[#77b996] transition-transform duration-300 group-hover:scale-y-100"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-[#eaf2ed] px-3 py-1 text-xs font-semibold text-[#145543]">
                      {scholarship.category}
                    </span>
                    <span className="rounded-full border border-[#e7d9b8] bg-[#fff9eb] px-3 py-1 text-xs font-medium text-[#765b24]">
                      {statusLabel(scholarship.status)}
                    </span>
                  </div>

                  <h3 className="mt-4 font-serif text-[1.35rem] font-semibold leading-tight tracking-[-.025em]">
                    {scholarship.name}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-[#52645a]">
                    {scholarship.provider}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[#52645a]">
                    {scholarship.purpose}
                  </p>

                  <dl className="mt-4 flex-1 space-y-3 rounded-xl border border-[#dce7df] bg-[#f5f8f5] px-3.5 py-3 text-sm leading-relaxed text-[#52645a]">
                    <div>
                      <dt className="font-semibold text-[#18352d]">
                        Support provided
                      </dt>
                      <dd className="mt-1">{scholarship.support}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#18352d]">
                        Study level
                      </dt>
                      <dd className="mt-1">
                        {scholarship.studyLevels
                          .map(
                            (value) =>
                              scholarshipStudyLevels.find(
                                (item) => item.value === value,
                              )?.label,
                          )
                          .filter(Boolean)
                          .join(" · ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#18352d]">
                        Eligibility region
                      </dt>
                      <dd className="mt-1">
                        {scholarship.eligibilityRegions === "all"
                          ? "Across India; scheme conditions apply"
                          : "Northeast states; scheme conditions apply"}
                      </dd>
                    </div>
                  </dl>

                  <Link
                    href={`/explore/scholarships/${scholarship.id}?${searchParams.toString()}`}
                    className="cb-card-action mt-5 w-fit"
                  >
                    View details
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-[#dce7df] bg-white p-6 sm:p-8">
              <h3 className="font-serif text-2xl font-semibold tracking-[-.03em]">
                No matching scholarships
              </h3>
              <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-[#59665e]">
                Try a different search or adjust your filters. Application
                windows and eligibility depend on each scheme and may change.
              </p>
              <button
                type="button"
                onClick={() => router.replace("/explore/scholarships")}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#145543] px-4 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Clear filters
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className="bg-[#18352d] px-5 py-9 text-center text-[#f7f8f5]">
        <p className="font-serif text-2xl tracking-[-.03em] sm:text-3xl">
          Take your time. Check every opportunity carefully.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#c8ddd0]">
          Scholarship eligibility and application periods can change. Always
          confirm details with the official provider.
        </p>
      </footer>
    </main>
  );
}
