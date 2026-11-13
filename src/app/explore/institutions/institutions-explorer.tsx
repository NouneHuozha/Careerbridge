"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, ExternalLink, MapPin, Search, X } from "lucide-react";
import { possibilityFields } from "../../discover/possibility-fields";
import { Breadcrumbs } from "../../breadcrumbs";
import { SavedItemButton } from "../saved-item-button";
import { courseCatalog } from "../courses/catalog/course-catalog-data";
import { resolvedInstitutionCampusOfferings } from "./institution-data";

const pageSize = 8;

function titleFromId(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function shortDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function InstitutionsExplorer() {
  const searchParams = useSearchParams();
  const fieldId = searchParams.get("field") ?? "";
  const courseId = searchParams.get("course") ?? "";
  const courseName = searchParams.get("courseName") || titleFromId(courseId);
  const requestedStage = searchParams.get("stage");
  const stage =
    requestedStage === "class-10" ||
    requestedStage === "class-12" ||
    requestedStage === "all"
      ? requestedStage
      : null;
  const savedCourseName =
    courseCatalog.find((course) => course.id === courseId)?.name ??
    courseName.slice(0, 200);
  const isCategory = searchParams.get("category") === "true";
  const field = possibilityFields.find((item) => item.id === fieldId);
  const stageLabel = stage === "class-10" ? "Class 10" : stage === "class-12" ? "Class 12" : "";
  const coursesParams = new URLSearchParams();
  if (fieldId) coursesParams.set("field", fieldId);
  if (stage === "class-10" || stage === "class-12" || stage === "all") {
    coursesParams.set("stage", stage);
  }
  const coursesHref = `/explore/courses${coursesParams.size ? `?${coursesParams}` : ""}`;
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [state, setState] = useState(searchParams.get("state") ?? "");
  const [district, setDistrict] = useState(searchParams.get("district") ?? "");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [ownership, setOwnership] = useState(searchParams.get("ownership") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") === "za" ? "za" : "az");
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get("page")) || 1));

  const courseOfferings = resolvedInstitutionCampusOfferings.filter((item) => item.courseId === courseId);
  const showingDemoData = courseOfferings.some((item) => item.isDemo);
  const states = [...new Set(courseOfferings.map((item) => item.campus.state).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
  const districts = [...new Set(courseOfferings.filter((item) => !state || item.campus.state === state).map((item) => item.campus.district).filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b));
  const showTypeFilter = courseOfferings.length > 0 && courseOfferings.every((item) => item.institution.type);
  const showOwnershipFilter = courseOfferings.length > 0 && courseOfferings.every((item) => item.institution.ownership);
  const types = [...new Set(courseOfferings.map((item) => item.institution.type))]
    .sort((a, b) => a.localeCompare(b));
  const ownerships = [...new Set(courseOfferings.flatMap((item) => item.institution.ownership ? [item.institution.ownership] : []))]
    .sort((a, b) => a.localeCompare(b));
  const query = search.trim().toLocaleLowerCase();
  const filteredOfferings = courseOfferings
    .filter((item) => !state || item.campus.state === state)
    .filter((item) => !district || item.campus.district === district)
    .filter((item) => !type || item.institution.type === type)
    .filter((item) => !ownership || item.institution.ownership === ownership)
    .filter((item) => !query || [
      item.institution.name,
      item.campus.name,
      item.campus.locality,
      item.campus.city,
      item.campus.district,
      item.campus.state,
    ].some((value) => value?.toLocaleLowerCase().includes(query)))
    .sort((a, b) => a.institution.name.localeCompare(b.institution.name) * (sort === "az" ? 1 : -1));
  const pageCount = Math.ceil(filteredOfferings.length / pageSize);
  const visibleOfferings = filteredOfferings.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = Boolean(search || state || district || type || ownership);

  function detailHref(item: (typeof courseOfferings)[number]) {
    const returnParams = new URLSearchParams(searchParams.toString());
    const filterValues = {
      q: search,
      state,
      district,
      type,
      ownership,
      sort,
      page: String(page),
    };
    for (const [key, value] of Object.entries(filterValues)) {
      if (value) returnParams.set(key, value);
      else returnParams.delete(key);
    }
    const detailParams = new URLSearchParams({
      course: courseId,
      courseName,
      field: fieldId,
      returnTo: `/explore/institutions?${returnParams.toString()}`,
    });
    if (stage) detailParams.set("stage", stage);
    return `/explore/institutions/${item.slug}?${detailParams.toString()}`;
  }

  function clearFilters() {
    setSearch("");
    setState("");
    setDistrict("");
    setType("");
    setOwnership("");
    setPage(1);
  }

  const breadcrumbs = [
    { label: "Explore", href: "/explore" },
    ...(field
      ? [{
          label: field.name,
          href: `/explore/fields/${field.id}${stage === "class-10" || stage === "class-12" ? `?stage=${stage}` : ""}`,
        }]
      : []),
    ...(courseId ? [{ label: courseName, href: coursesHref }] : []),
    { label: "Institutions" },
  ];

  return (
    <main className="cb-page-enter min-h-svh bg-[#fbfaf6] pb-16 text-[#18352d] sm:pb-20">
      <div className="cb-container pb-14 pt-5 sm:pb-20 sm:pt-7">
        <Breadcrumbs items={breadcrumbs} className="!px-0" />

        <section className="mt-7" aria-labelledby="institution-page-title">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c8dece] bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.14em] text-[#3d7a5c] shadow-[0_1px_3px_rgba(16,45,36,0.06)]">
              <BookOpen aria-hidden="true" className="h-3 w-3" />
              Study options
            </div>
            <h1
              id="institution-page-title"
              className="mt-3 font-serif text-4xl font-semibold leading-[1.08] tracking-[-.045em] sm:text-5xl"
            >
              {courseId ? `Where can you study ${courseName}?` : "Explore institutions"}
            </h1>
            <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-[#59665e] sm:text-lg">
              {courseId
                ? showingDemoData
                  ? `Explore a sample catalogue for ${courseName}. Compare institution types and locations, then confirm current offerings directly with each provider.`
                  : `Explore institutions whose published information names ${courseName} at a listed campus. Compare location and provider details, then confirm current availability directly.`
                : "Choose a specific course first to see institutions listed for that programme."}
            </p>
            {stageLabel && (
              <span className="mt-4 inline-flex rounded-full bg-[#eaf2ed] px-3 py-1.5 text-xs font-semibold text-[#315345]">
                After {stageLabel}
              </span>
            )}
          </div>
        </section>

        {showingDemoData ? (
          <aside
            role="note"
            className="mt-6 flex gap-3 rounded-2xl border border-[#e7d6a8] bg-[#fff8e8] p-4 text-[#594c32] sm:p-5"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#9a752c]" />
            <div>
              <h2 className="text-sm font-semibold">Illustrative sample catalogue</h2>
              <p className="mt-1 text-sm leading-6">
                Institution names, locations, types and ownership labels are fictional examples for design review—not real or verified providers. Confirm course availability and admissions directly with institutions.
              </p>
            </div>
          </aside>
        ) : courseId ? (
          <section aria-label="Guidance" className="mt-6 flex gap-3 rounded-2xl border border-[#d6e5db] bg-[#eef5ef] p-4 sm:p-5">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#145543]">
              <BookOpen aria-hidden="true" className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[#214d3d]">A helpful place to start</h2>
              <p className="mt-1 text-sm leading-6 text-[#586b60]">
                Offerings, campus locations and admission rules can change. Check the linked source and contact the institution before applying.
              </p>
            </div>
          </section>
        ) : null}

        {!courseId || isCategory ? (
          <section className="mt-10 rounded-3xl border border-[#e2e8e2] bg-white p-6 sm:p-8">
            <h2 className="font-serif text-2xl font-semibold tracking-[-.025em]">
              {isCategory ? "Choose a specific programme" : "Select a course to find matching institutions"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#637168]">
              {isCategory
                ? "This is a broad exploration category, not one specific programme. Its providers and entry requirements can differ, so choose a named course before comparing institutions."
                : "Institution listings are course-specific. Start from a course so the results do not imply that a provider offers a programme it has not listed."}
            </p>
            <Link href={coursesHref} className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to courses
            </Link>
          </section>
        ) : courseOfferings.length === 0 ? (
          <section className="mt-10 rounded-3xl border border-[#e2e8e2] bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#718078]">No source-checked listings yet</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-.025em]">
              We don’t have institution listings for {courseName} yet.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#637168]">
              We are keeping this catalogue empty rather than guessing which institutions offer the course. You can return to courses or check back as provider information is added.
            </p>
            <Link href={coursesHref} className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to courses
            </Link>
          </section>
        ) : (
          <>
            <section aria-label="Search and filter institutions" className="mt-7 overflow-hidden rounded-2xl border border-[#d6e0d9] bg-white shadow-[0_4px_24px_rgba(16,45,36,0.06)]">
              <div className="p-4 sm:p-5">
              <label htmlFor="institution-search" className="sr-only">Search by institution name or location</label>
              <div className="group relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718078]" />
                <input
                  id="institution-search"
                  type="search"
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                  placeholder="Search by institution name or location..."
                  className="h-11 w-full rounded-xl border border-[#d4ddd7] bg-[#f8faf8] pl-11 pr-4 text-sm text-[#18352d] outline-none placeholder:text-[#8fa899] transition-all duration-200 focus:border-[#2d6e56] focus:bg-white focus:shadow-[0_0_0_3px_rgba(45,110,86,0.12)]"
                />
              </div>
              </div>
              <div className="relative mx-4 border-t border-[#e8ece9] sm:mx-5">
                <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1.5 bg-white px-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#8fa899]">
                  Refine
                </span>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-5 xl:grid-cols-4">
                <FilterSelect id="state-filter" label="State" value={state} onChange={(value) => { setState(value); setDistrict(""); setPage(1); }} options={states} emptyLabel="All Northeast" />
                <FilterSelect id="district-filter" label="District" value={district} onChange={(value) => { setDistrict(value); setPage(1); }} options={districts} emptyLabel="All districts" disabled={districts.length === 0} />
                {showTypeFilter && <FilterSelect id="type-filter" label="Institution type" value={type} onChange={(value) => { setType(value); setPage(1); }} options={types} emptyLabel="All types" />}
                {showOwnershipFilter && <FilterSelect id="ownership-filter" label="Ownership" value={ownership} onChange={(value) => { setOwnership(value); setPage(1); }} options={ownerships} emptyLabel="All ownerships" />}
                <p className="self-end text-xs leading-5 text-[#718078] xl:col-span-4">
                  Filters work together. Type and ownership filters appear only when every listed provider has that information.
                </p>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="inline-flex h-11 items-center gap-2 self-end rounded-xl border border-[#e0cfc0] bg-[#fdf7f2] px-4 text-sm font-semibold text-[#8a5a28] transition-all duration-200 hover:border-[#d4b696] hover:bg-[#faf0e6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                  Clear all
                </button>
              )}
              </div>
            </section>

            <section className="mt-8" aria-labelledby="institution-results-title">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
                <div>
                  <h2 id="institution-results-title" className="font-serif text-2xl font-semibold tracking-[-.035em] sm:text-3xl">
                    Institutions offering {courseName}
                  </h2>
                  <p className="mt-1 text-sm text-[#6b7b71]">Course-specific campus listings.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#c8dece] bg-[#eef5f0] px-3.5 py-1.5 text-sm font-semibold text-[#235e47]" aria-live="polite">
                    <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                    {filteredOfferings.length} {filteredOfferings.length === 1 ? "listing" : "listings"}
                  </span>
                  <label className="flex items-center gap-2 text-sm font-medium text-[#52645a]">
                    Sort
                    <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="min-h-10 cursor-pointer rounded-xl border border-[#dce4dd] bg-white px-3 text-sm text-[#18352d] outline-none focus:border-[#57937a] focus:ring-2 focus:ring-[#57937a]/15">
                    <option value="az">Name A–Z</option>
                    <option value="za">Name Z–A</option>
                    </select>
                  </label>
                </div>
              </div>

              {visibleOfferings.length > 0 ? (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleOfferings.map((item, index) => {
                    const source = item.sources?.[0]?.source;
                    const campusLocation = [
                      item.campus.locality,
                      item.campus.city,
                      item.campus.district,
                      item.campus.state,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <article key={item.id} className="cb-reveal group relative flex h-full min-h-[250px] flex-col overflow-hidden rounded-2xl border border-[#dce7df] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#aad0b8] hover:shadow-[0_16px_40px_-8px_rgba(16,45,36,0.13)] motion-reduce:transform-none" style={{ animationDelay: `${(index % 9) * 70}ms` }}>
                        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 origin-bottom scale-y-0 rounded-r-sm bg-[#77b996] transition-transform duration-300 group-hover:scale-y-100 motion-reduce:transition-none" />
                        <div className="flex flex-1 flex-col p-5 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f4ed] px-3 py-1 text-xs font-semibold text-[#145543]">
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#2d8a62]" />
                            {item.institution.type}
                          </span>
                          {item.institution.ownership && <span className="truncate rounded-full bg-[#f5f6f4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.06em] text-[#7d9285]">{item.institution.ownership}</span>}
                        </div>
                        <h3 className="mt-4 font-serif text-[1.3rem] font-semibold leading-snug tracking-[-.02em] text-[#18352d] transition-colors duration-200 group-hover:text-[#145543]">
                            <Link href={detailHref(item)} className="rounded-sm hover:text-[#145543] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
                              {item.institution.name}
                            </Link>
                          </h3>
                        {campusLocation && (
                          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#59665e]">
                            <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#5b8b73]" />
                            <span>{campusLocation}</span>
                          </p>
                        )}
                        {item.campus.name && <p className="mt-1 text-xs text-[#718078]">{item.campus.name}</p>}
                        <div className="flex flex-wrap items-center gap-3 pt-5">
                          {item.isDemo ? (
                            <p className="text-[11px] italic text-[#9a752c]">Illustrative sample — not a verified listing</p>
                          ) : source ? (
                            <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[#145543] hover:underline">
                              {source.label} <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <p className="text-xs text-[#718078]">Provider source not available</p>
                          )}
                        </div>
                        <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                          <Link href={detailHref(item)} className="cb-card-action">
                            Details <ArrowRight aria-hidden="true" className="h-4 w-4" />
                          </Link>
                          <SavedItemButton
                            type="institution-offering"
                            id={item.slug}
                            className="ml-auto"
                            context={{
                              courseId,
                              courseName: savedCourseName,
                              ...(field ? { fieldId: field.id } : {}),
                              ...(stage ? { stage } : {}),
                            }}
                          />
                        </div>
                        {!item.isDemo && source?.checkedOn && (
                          <p className="pt-3 text-xs text-[#718078]">
                            {source.verificationStatus === "verified"
                              ? `Verified ${shortDate(source.checkedOn)}`
                              : source.verificationStatus === "outdated"
                                ? `Outdated · last checked ${shortDate(source.checkedOn)}`
                                : `Not verified · checked ${shortDate(source.checkedOn)}`}
                          </p>
                        )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-dashed border-[#cbd8ce] bg-white p-8 text-center">
                  <h3 className="font-semibold text-[#29483a]">No institutions match these filters</h3>
                  <p className="mt-1 text-sm text-[#68766e]">Try a different search or clear the selected filters.</p>
                  <button type="button" onClick={clearFilters} className="mt-4 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-[#eaf2ed] px-4 text-sm font-semibold text-[#145543] hover:bg-[#dce9e0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
                    Clear filters <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              )}

              {pageCount > 1 && (
                <nav aria-label="Institution results pages" className="mt-8 flex items-center justify-center gap-2">
                  <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-full border border-[#dce4dd] bg-white px-4 text-sm font-semibold text-[#315345] disabled:cursor-not-allowed disabled:opacity-40">
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Previous
                  </button>
                  <span aria-live="polite" className="min-w-16 text-center text-sm font-medium text-[#52645a]">{page} / {pageCount}</span>
                  <button type="button" aria-label="Next page" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)} className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-full border border-[#dce4dd] bg-white px-4 text-sm font-semibold text-[#315345] disabled:cursor-not-allowed disabled:opacity-40">
                    Next <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </nav>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  emptyLabel,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  emptyLabel: string;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} className="block text-xs font-semibold text-[#52645a]">
      <span>{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 min-h-11 w-full cursor-pointer rounded-xl border border-[#dce4dd] bg-white px-3 text-sm font-normal text-[#18352d] outline-none focus:border-[#57937a] focus:ring-2 focus:ring-[#57937a]/15 disabled:cursor-not-allowed disabled:bg-[#f4f6f3] disabled:text-[#8a958e]"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}