"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Award,
  CircleCheck,
  Clock,
  Filter,
  GraduationCap,
  MapPin,
  Search,
  ShieldQuestion,
  X,
  XCircle,
} from "lucide-react";
import { Breadcrumbs } from "../../breadcrumbs";
import { SavedItemButton } from "../saved-item-button";
import {
  northeastStates,
  scholarships,
  scholarshipStudyLevels,
  type ScholarshipStatus,
  type ScholarshipStudyLevel,
} from "./scholarship-data";

const statusValues = ["all", "open", "upcoming", "closed", "unknown"] as const;
type StatusFilter = (typeof statusValues)[number];

function isStudyLevel(value: string | null): value is ScholarshipStudyLevel {
  return scholarshipStudyLevels.some((level) => level.value === value);
}

function isStatus(value: string | null): value is StatusFilter {
  return value !== null && statusValues.some((status) => status === value);
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

/* ── Status presentation ── */

const statusConfig: Record<
  ScholarshipStatus,
  { label: string; icon: typeof CircleCheck; bg: string; text: string; border: string }
> = {
  open: {
    label: "Open",
    icon: CircleCheck,
    bg: "bg-[#e5f5ec]",
    text: "text-[#1a6e42]",
    border: "border-[#b5dfc8]",
  },
  upcoming: {
    label: "Not announced",
    icon: Clock,
    bg: "bg-[#fef6e6]",
    text: "text-[#7a5a12]",
    border: "border-[#edd9a8]",
  },
  closed: {
    label: "Closed",
    icon: XCircle,
    bg: "bg-[#fce9ec]",
    text: "text-[#8a2838]",
    border: "border-[#ecc3ca]",
  },
  unknown: {
    label: "Not verified",
    icon: ShieldQuestion,
    bg: "bg-[#f3f0f6]",
    text: "text-[#5e4a7a]",
    border: "border-[#d8cfe5]",
  },
};

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
  const filterParams = new URLSearchParams(searchParams.toString());
  filterParams.delete("sort");

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(filterParams);
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
  const filteredScholarships = scholarships.filter((scholarship) => {
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
  });

  const providers = [
    ...new Set(scholarships.map((item) => item.provider)),
  ].sort((a, b) => a.localeCompare(b));

  const hasFilters =
    query.trim().length > 0 ||
    level !== "all" ||
    provider !== "all" ||
    region !== "all" ||
    status !== "all";

  return (
    <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <Breadcrumbs
        items={[
          { label: "Explore", href: "/explore" },
          { label: "Scholarships" },
        ]}
        className="pt-6 sm:pt-8"
      />

      {/* ── Hero ── */}
      <section className="cb-page-enter border-b border-[#e0e6e2] bg-[#fbfaf6]">
        <div className="cb-container pb-8 pt-6 sm:pb-10 sm:pt-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d6cdb5] bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.14em] text-[#7a6a3e]">
                <Award aria-hidden="true" className="h-3 w-3" />
                Financial support
              </div>
              <h1 className="mt-3 font-serif text-4xl font-semibold leading-[1.05] tracking-[-.045em] sm:text-5xl">
                Find support for your education.
              </h1>
              <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-[#4a5a50] sm:text-lg">
                Discover scholarships and financial assistance that may help you
                continue your studies.
              </p>
            </div>

            {/* Quick stats */}
            <div className="flex shrink-0 gap-5">
              <div className="text-center">
                <p className="font-serif text-3xl font-semibold text-[#145543]">
                  {scholarships.length}
                </p>
                <p className="mt-0.5 text-xs font-medium text-[#6b7b71]">
                  Schemes listed
                </p>
              </div>
              <div className="w-px bg-[#d6ddd9]" />
              <div className="text-center">
                <p className="font-serif text-3xl font-semibold text-[#145543]">
                  {providers.length}
                </p>
                <p className="mt-0.5 text-xs font-medium text-[#6b7b71]">
                  Providers
                </p>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-6">
            <label className="group flex h-13 items-center gap-3 rounded-xl border border-[#c5cfc8] bg-white px-4 shadow-[0_2px_12px_rgba(16,45,36,0.05)] transition-all duration-200 focus-within:border-[#2d6e56] focus-within:shadow-[0_0_0_3px_rgba(45,110,86,0.12)]">
              <Search
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-[#9eada5] transition-colors duration-200 group-focus-within:text-[#2d6e56]"
              />
              <span className="sr-only">
                Search scholarships, providers, courses or fields
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => updateParams({ q: event.target.value })}
                placeholder="Search scholarships, providers, courses or fields…"
                className="min-w-0 flex-1 bg-transparent text-base text-[#18352d] outline-none placeholder:text-[#aab8b1]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => updateParams({ q: "" })}
                  aria-label="Clear search"
                  className="rounded-full p-1 text-[#9eada5] transition-colors hover:bg-[#f0f3f0] hover:text-[#52645a]"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </label>
          </div>
        </div>
      </section>

      {/* ── Filters + Results ── */}
      <section
        className="cb-container pb-10 sm:pb-14"
        aria-labelledby="scholarships-title"
      >
        <div className="pt-6 sm:pt-8">
          {/* Section heading */}
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
            <span
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[#c8dece] bg-[#eef5f0] px-3.5 py-1 text-sm font-semibold text-[#235e47]"
              aria-live="polite"
            >
              <Award aria-hidden="true" className="h-3.5 w-3.5" />
              {filteredScholarships.length}{" "}
              {filteredScholarships.length === 1 ? "result" : "results"}
            </span>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-[#d6e0d9] bg-white shadow-[0_4px_24px_rgba(16,45,36,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ece9] px-4 py-3 sm:px-5">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-[#60766a]">
                <Filter aria-hidden="true" className="h-3.5 w-3.5" />
                Refine scholarships
              </span>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => router.replace("/explore/scholarships")}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#e0cfc0] bg-[#fdf7f2] px-3.5 text-sm font-semibold text-[#8a5a28] transition-colors hover:bg-[#faf0e6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                  Clear filters
                </button>
              )}
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-5 xl:grid-cols-4">
              <label className="flex min-w-0 flex-col gap-1.5" htmlFor="scholarship-level-filter">
                <span className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#7a8f83]">
                  Study level
                </span>
                <select
                  id="scholarship-level-filter"
                  value={level}
                  onChange={(event) => updateParams({ level: event.target.value })}
                  className="h-11 w-full rounded-xl border border-[#d4ddd7] bg-[#f8faf8] px-3.5 text-sm text-[#29483a] outline-none transition-all duration-200 focus:border-[#2d6e56] focus:bg-white focus:shadow-[0_0_0_3px_rgba(45,110,86,0.12)]"
                >
                  <option value="all">All levels</option>
                  {scholarshipStudyLevels.map((studyLevel) => (
                    <option key={studyLevel.value} value={studyLevel.value}>
                      {studyLevel.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1.5" htmlFor="scholarship-provider-filter">
                <span className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#7a8f83]">
                  Provider
                </span>
                <select
                  id="scholarship-provider-filter"
                  value={provider}
                  onChange={(event) => updateParams({ provider: event.target.value })}
                  className="h-11 w-full rounded-xl border border-[#d4ddd7] bg-[#f8faf8] px-3.5 text-sm text-[#29483a] outline-none transition-all duration-200 focus:border-[#2d6e56] focus:bg-white focus:shadow-[0_0_0_3px_rgba(45,110,86,0.12)]"
                >
                  <option value="all">All providers</option>
                  {providers.map((providerName) => (
                    <option key={providerName} value={providerName}>
                      {providerName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1.5" htmlFor="scholarship-region-filter">
                <span className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#7a8f83]">
                  Eligibility region
                </span>
                <select
                  id="scholarship-region-filter"
                  value={region}
                  onChange={(event) => updateParams({ region: event.target.value })}
                  className="h-11 w-full rounded-xl border border-[#d4ddd7] bg-[#f8faf8] px-3.5 text-sm text-[#29483a] outline-none transition-all duration-200 focus:border-[#2d6e56] focus:bg-white focus:shadow-[0_0_0_3px_rgba(45,110,86,0.12)]"
                >
                  <option value="all">All regions</option>
                  <option value="northeast">Northeast</option>
                  {northeastStates.map((stateName) => (
                    <option key={stateName} value={stateName}>
                      {stateName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-0 flex-col gap-1.5" htmlFor="scholarship-status-filter">
                <span className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#7a8f83]">
                  Application status
                </span>
                <select
                  id="scholarship-status-filter"
                  value={status}
                  onChange={(event) => updateParams({ status: event.target.value })}
                  className="h-11 w-full rounded-xl border border-[#d4ddd7] bg-[#f8faf8] px-3.5 text-sm text-[#29483a] outline-none transition-all duration-200 focus:border-[#2d6e56] focus:bg-white focus:shadow-[0_0_0_3px_rgba(45,110,86,0.12)]"
                >
                  <option value="all">All statuses</option>
                  <option value="open">Open</option>
                  <option value="upcoming">Not announced</option>
                  <option value="closed">Closed</option>
                  <option value="unknown">Not verified</option>
                </select>
              </label>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-[#9eada5]">
            These are real scheme examples, but application status and
            eligibility are not live verified. Check each official source for
            current details before applying.
          </p>

          {/* Cards */}
          {filteredScholarships.length ? (
            <div className="mt-5 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredScholarships.map((scholarship, index) => {
                const sc = statusConfig[scholarship.status];
                const StatusIcon = sc.icon;
                return (
                  <article
                    key={scholarship.id}
                    className="cb-reveal group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce7df] bg-white transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-[#9fc5ad] hover:shadow-[0_16px_40px_-8px_rgba(16,45,36,0.12)] motion-reduce:transform-none motion-reduce:transition-none"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    {/* Left accent */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-1 origin-bottom scale-y-0 rounded-r-sm bg-[#77b996] transition-transform duration-300 group-hover:scale-y-100 group-focus-within:scale-y-100 motion-reduce:transition-none"
                    />

                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      {/* Top row: category + status */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-[#f3eed9] px-3 py-1 text-xs font-semibold text-[#6d5a1e]">
                          {scholarship.category}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${sc.bg} ${sc.text} ${sc.border}`}
                        >
                          <StatusIcon
                            aria-hidden="true"
                            className="h-3 w-3"
                          />
                          {sc.label}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="mt-4 font-serif text-[1.3rem] font-semibold leading-snug tracking-[-.02em] transition-colors duration-200 group-hover:text-[#145543]">
                        {scholarship.name}
                      </h3>

                      {/* Provider */}
                      <p className="mt-1.5 text-sm font-medium text-[#52645a]">
                        {scholarship.provider}
                      </p>

                      {/* Purpose */}
                      <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-[#59665e]">
                        {scholarship.purpose}
                      </p>

                      {/* Info grid */}
                      <dl className="mt-5 flex-1 divide-y divide-[#e4ece7] border-y border-[#e4ece7] text-sm">
                        <div className="flex items-start gap-3 py-3">
                          <Award
                            aria-hidden="true"
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b5956e]"
                          />
                          <div>
                            <dt className="font-semibold text-[#18352d]">
                              Support
                            </dt>
                            <dd className="mt-0.5 leading-relaxed text-[#52645a]">
                              {scholarship.support}
                            </dd>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 py-3">
                          <GraduationCap
                            aria-hidden="true"
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9eada5]"
                          />
                          <div className="min-w-0">
                            <dt className="font-semibold text-[#18352d]">
                              Study level
                            </dt>
                            <dd className="mt-0.5 leading-relaxed text-[#52645a]">
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
                        </div>
                        <div className="flex items-start gap-3 py-3">
                          <MapPin
                            aria-hidden="true"
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9eada5]"
                          />
                          <div>
                            <dt className="font-semibold text-[#18352d]">
                              Region
                            </dt>
                            <dd className="mt-0.5 leading-relaxed text-[#52645a]">
                              {scholarship.eligibilityRegions === "all"
                                ? "Across India; scheme conditions apply"
                                : "Northeast states; scheme conditions apply"}
                            </dd>
                          </div>
                        </div>
                      </dl>

                      {/* CTA row */}
                      <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
                        <Link
                          href={`/explore/scholarships/${scholarship.id}?${filterParams.toString()}`}
                          className="cb-card-action"
                        >
                          View details
                          <ArrowRight
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </Link>
                        <SavedItemButton
                          type="scholarship"
                          id={scholarship.id}
                          className="ml-auto"
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[#c5d5cc] bg-white p-6 text-center sm:p-10">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3eed9]">
                <Search
                  aria-hidden="true"
                  className="h-5 w-5 text-[#b5956e]"
                />
              </div>
              <h3 className="mt-4 font-serif text-2xl font-semibold tracking-[-.03em]">
                No matching scholarships
              </h3>
              <p className="mx-auto mt-2 max-w-[60ch] text-base leading-relaxed text-[#59665e]">
                Try a different search or adjust your filters. Application
                windows and eligibility depend on each scheme and may change.
              </p>
              <button
                type="button"
                onClick={() => router.replace("/explore/scholarships")}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#145543] px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Clear filters
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Closing footer ── */}
      <footer className="border-t border-[#2a4a3e] bg-[#18352d] px-5 py-10 text-center text-[#f7f8f5]">
        <p className="font-serif text-2xl tracking-[-.03em] sm:text-3xl">
          Take your time. Check every opportunity carefully.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#a8c9b5]">
          Scholarship eligibility and application periods can change. Always
          confirm details with the official provider.
        </p>
      </footer>
    </main>
  );
}
