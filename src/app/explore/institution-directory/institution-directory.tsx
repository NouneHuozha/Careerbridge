"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { Breadcrumbs } from "../../breadcrumbs";
import { institutionProfilePages } from "./institution-profile-data";

const states = [
  "Arunachal Pradesh",
  "Assam",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Sikkim",
  "Tripura",
];
const institutionTypes = [
  "College",
  "University",
  "Polytechnic",
  "ITI",
  "Training institute",
];
const ownershipTypes = ["Government", "Private", "Public"];
const pageSize = 6;

function districtValue(state: string, district: string) {
  return `${state}::${district}`;
}

export default function InstitutionDirectory() {
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [type, setType] = useState("");
  const [ownership, setOwnership] = useState("");
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const districtOptions = useMemo(() => {
    const options = institutionProfilePages.flatMap((item) =>
      item.campuses.flatMap((campus) => {
        const { district, state: campusState } = campus;
        if (!district || !campusState || (state && campusState !== state)) {
          return [];
        }

        return [
          {
            value: districtValue(campusState, district),
            district,
            state: campusState,
            label: state ? district : `${district} · ${campusState}`,
          },
        ];
      }),
    );

    return [...new Map(options.map((option) => [option.value, option])).values()]
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [state]);

  const filteredInstitutions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return institutionProfilePages
      .filter(
        (item) =>
          !state || item.campuses.some((campus) => campus.state === state),
      )
      .filter(
        (item) =>
          !district ||
          item.campuses.some(
            (campus) =>
              campus.state &&
              campus.district &&
              districtValue(campus.state, campus.district) === district,
          ),
      )
      .filter((item) => !type || item.type === type)
      .filter((item) => !ownership || item.ownership === ownership)
      .filter((item) => {
        if (!query) return true;
        return [
          item.name,
          ...item.campuses.flatMap((campus) => [
            campus.name ?? "",
            campus.locality ?? "",
            campus.city ?? "",
            campus.district ?? "",
            campus.state ?? "",
          ]),
          ...(item.programmes ?? []).map((programme) => programme.name),
        ].some((value) => value?.toLocaleLowerCase().includes(query));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [district, ownership, search, state, type]);

  const visibleInstitutions = filteredInstitutions.slice(0, visibleCount);
  const hasFilters = Boolean(search.trim() || state || district || type || ownership);

  function clearFilters() {
    setSearch("");
    setState("");
    setDistrict("");
    setType("");
    setOwnership("");
    setVisibleCount(pageSize);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setVisibleCount(pageSize);
  }

  function updateState(value: string) {
    setState(value);
    setDistrict("");
    setVisibleCount(pageSize);
  }

  function updateDistrict(value: string) {
    setDistrict(value);
    setVisibleCount(pageSize);
  }

  function updateType(value: string) {
    setType(value);
    setVisibleCount(pageSize);
  }

  function updateOwnership(value: string) {
    setOwnership(value);
    setVisibleCount(pageSize);
  }

  return (
    <main className="cb-page-enter min-h-svh bg-[#fbfaf6] pb-16 text-[#18352d] sm:pb-20">
      <Breadcrumbs
        items={[
          { label: "Explore", href: "/explore" },
          { label: "Institutions" },
        ]}
        className="pt-5 sm:pt-7"
      />

      <div className="cb-container pt-7 sm:pt-9">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[.13em] text-[#52715f]">
            Places to study
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-[1.08] tracking-[-.045em] sm:text-5xl">
            Explore institutions
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#59665e] sm:text-lg">
            Discover colleges, universities and other educational institutions
            across Northeast India.
          </p>
        </header>

        <aside
          role="note"
          className="mt-6 flex max-w-5xl gap-3 rounded-2xl border border-[#e7d6a8] bg-[#fff8e8] p-4 text-[#594c32] sm:p-5"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#9a752c] text-xs font-bold"
          >
            i
          </span>
          <p className="text-sm leading-6">
            <strong>Institution profiles.</strong> This directory currently
            includes two institution profiles. Each profile shows the
            information currently available for that institution; sections are
            omitted when details have not been confirmed.
          </p>
        </aside>

        <section
          aria-label="Search and filter institutions"
          className="mt-7 rounded-2xl border border-[#e1e8e1] bg-white p-4 shadow-[0_8px_28px_rgba(27,54,43,.035)] sm:p-6"
        >
          <label className="relative block">
            <span className="sr-only">
              Search institution, course or location
            </span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#718078]"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search institution, course or location..."
              className="min-h-12 w-full rounded-xl border border-[#cbd9cf] bg-[#fbfcfa] pl-12 pr-4 text-sm outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#b8e3c9]"
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              id="directory-state"
              label="State"
              value={state}
              options={states.map((value) => ({ value, label: value }))}
              emptyLabel="All states"
              onChange={updateState}
            />
            <FilterSelect
              id="directory-district"
              label="District"
              value={district}
              options={districtOptions}
              emptyLabel="All districts"
              disabled={districtOptions.length === 0}
              onChange={updateDistrict}
            />
            <FilterSelect
              id="directory-type"
              label="Institution type"
              value={type}
              options={institutionTypes.map((value) => ({ value, label: value }))}
              emptyLabel="All types"
              onChange={updateType}
            />
            <FilterSelect
              id="directory-ownership"
              label="Ownership"
              value={ownership}
              options={ownershipTypes.map((value) => ({ value, label: value }))}
              emptyLabel="All ownerships"
              onChange={updateOwnership}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-[#718078]">
            District options update with the selected state. With all states
            selected, each district includes its state for clarity.
          </p>
        </section>

        <section className="mt-9" aria-labelledby="institution-results-title">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2
                id="institution-results-title"
                className="font-serif text-2xl font-semibold tracking-[-.035em] sm:text-3xl"
              >
                Institutions
              </h2>
              <p className="mt-1 text-sm text-[#68766e]">
                Explore institutions across all Northeast states.
              </p>
              <p className="mt-2 text-sm font-semibold text-[#52715f]" aria-live="polite">
                {filteredInstitutions.length}{" "}
                {filteredInstitutions.length === 1 ? "institution" : "institutions"}
              </p>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-10 items-center self-start rounded-full px-3 text-sm font-semibold text-[#145543] underline-offset-4 transition-colors hover:bg-[#eef5ef] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] sm:self-auto"
              >
                Clear filters
              </button>
            )}
          </div>

          {filteredInstitutions.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-[#dce7df] bg-white p-6 sm:p-8">
              <h3 className="font-serif text-xl font-semibold">
                No institutions match those filters.
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#59665e]">
                Try a different name, programme or location, or clear the
                filters to see all available institutions.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex min-h-11 items-center rounded-full border border-[#b8d5c2] bg-[#f7fbf8] px-4 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {visibleInstitutions.map((institution, index) => (
                  <InstitutionCard
                    key={institution.slug}
                    institution={institution}
                    index={index}
                  />
                ))}
              </div>
              <div className="mt-7 flex flex-col items-center gap-2">
                <p className="text-sm text-[#6b7b71]" aria-live="polite">
                  Showing {visibleInstitutions.length} of {filteredInstitutions.length} institutions
                </p>
                {visibleCount < filteredInstitutions.length && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + pageSize)}
                    className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-[#b8d5c2] bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                  >
                    Load more institutions
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    />
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function FilterSelect({
  id,
  label,
  value,
  options,
  emptyLabel,
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  emptyLabel: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-semibold text-[#718078]">{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-[#cbd9cf] bg-white px-3 text-sm text-[#354b40] outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#b8e3c9] disabled:cursor-not-allowed disabled:bg-[#f5f7f5] disabled:text-[#8b9790]"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InstitutionCard({
  institution,
  index,
}: {
  institution: (typeof institutionProfilePages)[number];
  index: number;
}) {
  const campusPreviews = institution.campuses
    .slice(0, 2)
    .map((campus) =>
      [campus.locality ?? campus.city, campus.district, campus.state]
        .filter(Boolean)
        .join(", "),
    )
    .filter(Boolean);

  return (
    <article
      className="cb-reveal group relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-[#dce7df] bg-white p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-[#9fc5ad] hover:shadow-[0_14px_30px_rgba(16,45,36,0.08)] motion-reduce:transform-none sm:p-6"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 origin-bottom scale-y-0 bg-[#77b996] transition-transform duration-300 group-hover:scale-y-100"
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="max-w-[34ch] font-serif text-xl font-semibold leading-tight tracking-[-.025em] sm:text-2xl">
          {institution.name}
        </h3>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#52645a]">
        {institution.type && (
          <span className="rounded-full bg-[#eaf2ed] px-3 py-1.5">
            {institution.type}
          </span>
        )}
        {institution.ownership && (
          <span className="rounded-full border border-[#dce5dd] px-3 py-1.5">
            {institution.ownership}
          </span>
        )}
      </div>

      {campusPreviews.length > 0 && (
        <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-[#59665e]">
          <MapPin
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-[#5b8b73]"
          />
          <span>
            {campusPreviews.join(" · ")}
            {institution.campuses.length > 2 &&
              ` · ${institution.campuses.length - 2} more campuses`}
          </span>
        </p>
      )}

      <Link
        href={`/explore/institution-directory/${institution.slug}`}
        className="cb-card-action mt-auto w-fit"
      >
        View institution
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </article>
  );
}
