"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BookOpen, MapPin, Search, X } from "lucide-react";
import { Breadcrumbs } from "../../breadcrumbs";
import { SavedItemButton } from "../saved-item-button";
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
const institutionTypes = [...new Set(institutionProfilePages.map((item) => item.type))].sort();
const ownershipTypes = ["Government", "Private", "Public"];
const pageSize = 9;
const sampleInstitutionCount = institutionProfilePages.filter((item) => item.isDemo).length;

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
      <div className="cb-container pb-14 pt-5 sm:pb-20 sm:pt-7">
        <Breadcrumbs
          items={[
            { label: "Explore", href: "/explore" },
            { label: "Institutions" },
          ]}
          className="!px-0"
        />

        <section className="mt-7" aria-labelledby="institution-directory-title">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c8dece] bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.14em] text-[#3d7a5c] shadow-[0_1px_3px_rgba(16,45,36,0.06)]">
              <BookOpen aria-hidden="true" className="h-3 w-3" />
              Places to study
            </div>
            <h1
              id="institution-directory-title"
              className="mt-3 font-serif text-4xl font-semibold leading-[1.08] tracking-[-.045em] sm:text-5xl"
            >
              Explore institutions
            </h1>
            <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-[#59665e] sm:text-lg">
              Discover colleges, universities and other educational institutions
              across Northeast India.
            </p>
          </div>
        </section>

        {sampleInstitutionCount > 0 && (
          <aside
            role="note"
            className="mt-6 flex gap-3 rounded-2xl border border-[#e7d6a8] bg-[#fff8e8] p-4 text-[#594c32] sm:p-5"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#9a752c]" />
            <div>
              <h2 className="text-sm font-semibold">Fictional sample profiles included</h2>
              <p className="mt-1 text-sm leading-6">
                {sampleInstitutionCount} sample institutions are shown to demonstrate the directory. Their names and locations are fictional and are not verified providers; each sample card and profile is labeled.
              </p>
            </div>
          </aside>
        )}

        <section
          aria-label="Search and filter institutions"
          className="mt-7 overflow-hidden rounded-2xl border border-[#d6e0d9] bg-white shadow-[0_4px_24px_rgba(16,45,36,0.06)]"
        >
          <div className="p-4 sm:p-5">
            <label className="group relative block">
              <span className="sr-only">
                Search institution, course or location
              </span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#a5b5ac] transition-colors duration-200 group-focus-within:text-[#2d6e56]"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Search institution or location..."
                className="h-11 w-full rounded-xl border border-[#d4ddd7] bg-[#f8faf8] pl-11 pr-4 text-sm text-[#18352d] outline-none placeholder:text-[#aab8b1] transition-all duration-200 focus:border-[#2d6e56] focus:bg-white focus:shadow-[0_0_0_3px_rgba(45,110,86,0.12)]"
              />
            </label>
          </div>

          <div className="relative mx-4 border-t border-[#e8ece9] sm:mx-5">
            <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1.5 bg-white px-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#8fa899]">
              Refine
            </span>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-5 xl:grid-cols-4">
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
            <p className="self-end text-xs leading-5 text-[#718078] xl:col-span-4">
              District options update with the selected state. With all states
              selected, each district includes its state for clarity.
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 items-center gap-2 self-end rounded-xl border border-[#e0cfc0] bg-[#fdf7f2] px-4 text-sm font-semibold text-[#8a5a28] transition-all duration-200 hover:border-[#d4b696] hover:bg-[#faf0e6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
                Clear filters
              </button>
            )}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="institution-results-title">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
            <div>
              <h2
                id="institution-results-title"
                className="font-serif text-2xl font-semibold tracking-[-.035em] sm:text-3xl"
              >
                Institutions
              </h2>
              <p className="mt-1 text-sm text-[#6b7b71]">
                Explore institution profiles across Northeast India.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[#c8dece] bg-[#eef5f0] px-3.5 py-1.5 text-sm font-semibold text-[#235e47]" aria-live="polite">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
              {filteredInstitutions.length}{" "}
              {filteredInstitutions.length === 1 ? "institution" : "institutions"}
            </span>
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
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    Show more institutions
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
      className="cb-reveal group relative flex h-full min-h-[250px] flex-col overflow-hidden rounded-2xl border border-[#dce7df] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#aad0b8] hover:shadow-[0_16px_40px_-8px_rgba(16,45,36,0.13)] motion-reduce:transform-none"
      style={{ animationDelay: `${(index % pageSize) * 70}ms` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 origin-bottom scale-y-0 rounded-r-sm bg-[#77b996] transition-transform duration-300 group-hover:scale-y-100 motion-reduce:transition-none"
      />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f4ed] px-3 py-1 text-xs font-semibold text-[#145543]">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#2d8a62]" />
            {institution.type}
          </span>
          {institution.ownership && (
            <span className="truncate rounded-full bg-[#f5f6f4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.06em] text-[#7d9285]">
              {institution.ownership}
            </span>
          )}
        </div>

        <h3 className="mt-4 font-serif text-[1.3rem] font-semibold leading-snug tracking-[-.02em] text-[#18352d] transition-colors duration-200 group-hover:text-[#145543]">
          <Link
            href={`/explore/institution-directory/${institution.slug}`}
            className="rounded-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            {institution.name}
          </Link>
        </h3>

        {campusPreviews.length > 0 && (
          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#59665e]">
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

        {institution.isDemo && (
          <p className="mt-3 text-[11px] italic text-[#9a752c]">
            Fictional sample — not a verified institution
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
          <Link
            href={`/explore/institution-directory/${institution.slug}`}
            className="cb-card-action w-fit"
          >
            View institution
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <SavedItemButton type="institution" id={institution.slug} className="ml-auto" />
        </div>
      </div>
    </article>
  );
}
