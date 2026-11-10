"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  MapPin,
  Search,
} from "lucide-react";
import { Breadcrumbs } from "../../../breadcrumbs";
import { courseCatalog } from "../../courses/catalog/course-catalog-data";
import type {
  InstitutionFinancialRecord,
  InstitutionProfilePageRecord,
} from "../institution-profile-data";
import type { InformationSource, VerificationStatus } from "../institution-registry";
import {
  getProgrammeCounts,
  isVerifiedProgramme,
} from "../institution-profile-data";

const courseDetails = new Map(courseCatalog.map((course) => [course.id, course]));
const emptyProgrammeRecords: NonNullable<
  InstitutionProfilePageRecord["programmes"]
> = [];

export default function InstitutionProfile({
  institution,
}: {
  institution: InstitutionProfilePageRecord;
}) {
  const campusRecords = institution.campuses;
  const programmeRecords = institution.programmes ?? emptyProgrammeRecords;
  const [query, setQuery] = useState("");
  const [qualification, setQualification] = useState("");
  const qualifications = useMemo(
    () => [...new Set(programmeRecords.map((item) => item.qualification))],
    [programmeRecords],
  );
  const programmeCounts = getProgrammeCounts(institution);
  const programmes = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase();
    return programmeRecords.filter((item) => {
      const matchesQualification =
        !qualification || item.qualification === qualification;
      const matchesSearch =
        !searchTerm ||
        `${item.name} ${item.qualification}`
          .toLocaleLowerCase()
          .includes(searchTerm);
      return matchesQualification && matchesSearch;
    });
  }, [programmeRecords, qualification, query]);
  const campusHasDetails = campusRecords.some(
    (campus) =>
      campus.locality ||
      campus.city ||
      campus.district ||
      campus.state ||
      campus.address ||
      campus.phone ||
      campus.email ||
      campus.facilities?.length,
  );
  const primaryCampus = campusRecords[0];
  const primaryLocation = primaryCampus
    ? [
        primaryCampus.locality,
        primaryCampus.city,
        primaryCampus.district,
        primaryCampus.state,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <main className="cb-page-enter min-h-svh bg-[#fbfaf6] pb-14 text-[#18352d] sm:pb-20">
      <Breadcrumbs
        items={[
          { label: "Explore", href: "/explore" },
          { label: "Institutions", href: "/explore/institution-directory" },
          { label: institution.name },
        ]}
        className="pt-5 sm:pt-7"
      />

      <div className="cb-container">
        <section className="border-b border-[#dce5dd] pb-6 pt-5 sm:pb-7 sm:pt-6">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#eaf2ed] px-3 py-1.5 text-xs font-semibold text-[#315345]">
              {institution.type}
            </span>
            {institution.ownership && (
              <span className="rounded-full border border-[#dce5dd] px-3 py-1.5 text-xs font-semibold text-[#52645a]">
                {institution.ownership}
              </span>
            )}
          </div>
          <h1 className="mt-3 max-w-5xl font-serif text-3xl font-semibold leading-tight tracking-[-.035em] sm:text-4xl lg:text-5xl">
            {institution.name}
          </h1>
          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#59665e] sm:text-base">
            <MapPin
              aria-hidden="true"
              className="mt-1 h-4 w-4 shrink-0 text-[#5b8b73]"
            />
            <span>
              {primaryLocation
                ? `${primaryLocation} · Northeast India`
                : "Location details are not available"}
            </span>
          </p>
          {institution.introduction && (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#52645a] sm:text-base">
              {institution.introduction}
            </p>
          )}
          {institution.website && (
            <>
              <SourceLink
                source={institution.website}
                className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#145543] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              />
              <p className="mt-0.5 text-xs text-[#718078]">
                Official website · {verificationLabel(
                  institution.website.verificationStatus,
                  institution.website.checkedOn,
                )}
              </p>
            </>
          )}
        </section>

        {(institution.description || institution.facts?.length) && (
          <section
            aria-labelledby="about-title"
            className="grid gap-5 border-b border-[#dce5dd] py-6 sm:py-7 lg:grid-cols-2 lg:gap-10"
          >
            {institution.description && (
              <div>
                <SectionHeading id="about-title">
                  About the institution
                </SectionHeading>
                <p className="mt-3 max-w-prose text-sm leading-6 text-[#59665e]">
                  {institution.description}
                </p>
              </div>
            )}
            {institution.facts && institution.facts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#29483a]">
                  Institution information
                </h3>
                <dl className="mt-2 grid gap-x-8 sm:grid-cols-2">
                  {institution.facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex min-h-14 items-center justify-between gap-4 border-b border-[#e5ebe6] py-3"
                  >
                    <dt className="text-sm text-[#68766e]">{fact.label}</dt>
                    <dd className="text-right text-sm font-semibold text-[#29483a]">
                      {fact.value}
                      <a
                        href=                        {fact.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1 inline-flex min-h-7 items-center text-[#145543] hover:underline"
                        aria-label={`Source for ${fact.label}: ${fact.source.label}`}
                      >
                        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </a>
                      <span className="block text-xs font-normal text-[#718078]">
                        {verificationLabel(
                          fact.verificationStatus,
                          fact.verifiedDate,
                        )}
                      </span>
                    </dd>
                  </div>
                  ))}
                </dl>
              </div>
            )}
          </section>
        )}

        {programmeRecords.length > 0 && (
        <section
          aria-labelledby="programmes-title"
          className="border-b border-[#dce5dd] py-6 sm:py-7"
        >
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <SectionHeading id="programmes-title">
                Courses &amp; programmes
              </SectionHeading>
              <p className="mt-2 text-sm leading-6 text-[#68766e]">
                These records link to general course information and do not
                confirm institution-specific eligibility or admission rules.
              </p>
              <p
                className="mt-2 text-sm font-semibold text-[#52715f]"
                aria-live="polite"
              >
                Showing {programmes.length} of {programmeRecords.length} records
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#68766e]">
                <span>
                  CareerBridge records:{" "}
                  <strong className="text-[#29483a]">
                    {programmeCounts.recorded}
                  </strong>
                </span>
                <span>
                  Individually verified:{" "}
                  <strong className="text-[#29483a]">
                    {programmeCounts.verified}
                  </strong>
                </span>
                {institution.reportedProgrammeCount && (
                  <span>
                    Reported by institution:{" "}
                    <strong className="text-[#29483a]">
                      {institution.reportedProgrammeCount.count}{" "}
                      {institution.reportedProgrammeCount.label}
                    </strong>
                  </span>
                )}
              </div>
            </div>
            {programmeRecords.length > 3 && (
              <div className="grid gap-2 sm:grid-cols-[minmax(230px,1fr)_220px] lg:w-[520px]">
                <label className="relative block">
                  <span className="sr-only">Search programmes</span>
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718078]"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search programmes..."
                    className="min-h-11 w-full rounded-xl border border-[#cbd9cf] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#b8e3c9]"
                  />
                </label>
                <label className="sr-only" htmlFor="programme-qualification">
                  Qualification type
                </label>
                <select
                  id="programme-qualification"
                  value={qualification}
                  onChange={(event) => setQualification(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-[#cbd9cf] bg-white px-3 text-sm text-[#354b40] outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#b8e3c9]"
                >
                  <option value="">All qualification types</option>
                  {qualifications.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {programmes.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {programmes.map((programme) => {
                const course = programme.courseId
                  ? courseDetails.get(programme.courseId)
                  : undefined;
                const verified = isVerifiedProgramme(programme);
                return (
                  <article
                    key={programme.name}
                    className="group relative flex min-h-[282px] flex-col overflow-hidden rounded-[20px] border border-[#d5e2d9] bg-white p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-[#8fc4a2] hover:shadow-[0_16px_34px_rgba(16,45,36,0.09)] focus-within:border-[#8fc4a2] motion-reduce:transform-none sm:p-6"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-1 origin-bottom scale-y-0 bg-[#77b996] transition-transform duration-300 group-hover:scale-y-100 group-focus-within:scale-y-100"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-[#eaf2ed] px-3 py-1.5 text-xs font-semibold text-[#315345]">
                        {programme.qualification}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f7f3] px-2.5 py-1.5 text-[11px] font-semibold text-[#52715f]">
                        {verified && (
                          <CircleCheck aria-hidden="true" className="h-3.5 w-3.5" />
                        )}
                        {verificationLabel(
                          programme.verificationStatus,
                          programme.verifiedDate,
                        )}
                      </span>
                    </div>

                    <h3 className="mt-4 font-serif text-xl font-semibold leading-tight tracking-[-.025em] text-[#18352d]">
                      {programme.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#59665e]">
                      {course?.description ??
                        "This programme is listed in the institution’s official information."}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                      {course ? (
                        <Link
                          href={`/explore/courses/catalog/${programme.courseId}`}
                          className="cb-card-action"
                        >
                          Explore course
                          <ArrowRight aria-hidden="true" className="h-4 w-4" />
                        </Link>
                      ) : (
                        <a
                          href={programme.source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="cb-card-action"
                        >
                          Official programme
                          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                        </a>
                      )}
                      <a
                        href={programme.source.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Official source for ${programme.name}`}
                        className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-[#718078] underline-offset-2 hover:text-[#145543] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                      >
                        Source
                        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#59665e]">
              No confirmed programmes are listed yet. Check the institution’s
              official website for its current catalogue.
            </p>
          )}
          {institution.reportedProgrammeCount && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs leading-5 text-[#718078]">
              <a
                href={institution.reportedProgrammeCount.source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-8 items-center gap-1 font-semibold text-[#145543] hover:underline"
              >
                Source for institution-reported count{" "}
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </section>
        )}

        {(institution.admission || (institution.admissionNotices?.length ?? 0) > 0) && (
          <section
            aria-labelledby="admission-title"
            className="border-b border-[#dce5dd] py-6 sm:py-7"
          >
            <SectionHeading id="admission-title">
              Admission information
            </SectionHeading>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {institution.admission && (
                <article className="rounded-xl border border-[#dce7df] bg-white p-4">
                  <h3 className="font-serif text-lg font-semibold">Admission process</h3>
                  <p className="mt-2 text-sm leading-6 text-[#59665e]">
                    {institution.admission.description}
                  </p>
                  <SourceLink
                    source={institution.admission.source}
                    className="cb-card-action mt-3 w-fit"
                  />
                </article>
              )}
              {institution.admissionNotices?.map((notice) => (
                <article
                  key={notice.source.url}
                  className="rounded-xl border border-[#dce7df] bg-white p-4"
                >
                  <h3 className="font-serif text-lg font-semibold">
                    Official admission notice
                  </h3>
                  <p className="mt-2 font-semibold">{notice.title}</p>
                  <p className="mt-1 text-sm text-[#68766e]">
                    {notice.academicYear}
                    {notice.publishedDate && ` · Published ${notice.publishedDate}`}
                  </p>
                  {notice.deadline && (
                    <p className="mt-1 text-sm text-[#68766e]">
                      Application deadline: {notice.deadline}
                    </p>
                  )}
                  <SourceLink
                    source={notice.source}
                    className="cb-card-action mt-3 w-fit"
                  />
                  <p className="text-xs text-[#718078]">
                    Official source ·{" "}
                    {verificationLabel(
                      notice.verificationStatus ?? notice.source.verificationStatus,
                      notice.verifiedDate ?? notice.source.checkedOn,
                    )}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {institution.documents && institution.documents.length > 0 && (
          <section
            aria-labelledby="documents-title"
            className="border-b border-[#dce5dd] py-6 sm:py-7"
          >
            <SectionHeading id="documents-title">
              Prospectus &amp; other documents
            </SectionHeading>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {institution.documents.map((document) => (
                <article
                  key={document.source.url}
                  className="flex min-h-[120px] flex-col rounded-xl border border-[#dce7df] bg-white p-4"
                >
                  <h3 className="font-serif text-base font-semibold">
                    {document.title}
                  </h3>
                  {document.academicYear && (
                    <p className="mt-1 text-sm text-[#68766e]">
                      Academic year {document.academicYear}
                    </p>
                  )}
                  <div className="mt-auto pt-2">
                    <SourceLink
                      source={{
                        ...document.source,
                        label: "View document",
                      }}
                      className="cb-card-action w-fit"
                    />
                    <p className="text-xs text-[#718078]">
                      Official source
                      {" · "}
                      {verificationLabel(
                        document.verificationStatus ??
                          document.source.verificationStatus,
                        document.verifiedDate ?? document.source.checkedOn,
                      )}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {(institution.fees ||
          institution.scholarships?.length ||
          institution.relatedScholarships) && (
          <section
            aria-labelledby="financial-title"
            className="border-b border-[#dce5dd] py-6 sm:py-7"
          >
            <SectionHeading id="financial-title">
              Fees &amp; financial support
            </SectionHeading>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {institution.fees && (
                <FinancialCard title="Fee information" record={institution.fees} />
              )}
              {institution.scholarships?.map((item) => (
                <FinancialCard
                  key={item.title}
                  title="Scholarships & financial support"
                  record={item}
                />
              ))}
              {institution.relatedScholarships && (
                <article className="rounded-xl border border-[#dce7df] bg-white p-4">
                  <h3 className="font-serif text-base font-semibold">
                    Other relevant scholarships
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#59665e]">
                    Explore external opportunities confirmed as relevant to
                    students at this institution.
                  </p>
                  <SourceLink
                    source={institution.relatedScholarships}
                    className="cb-card-action mt-3 w-fit"
                  />
                </article>
              )}
            </div>
            <p className="mt-3 text-xs leading-5 text-[#718078]">
              Only useful verified information is shown. Programme-specific fees
              remain in the course–institution details experience.
            </p>
          </section>
        )}

        {campusHasDetails && (
          <section
            aria-labelledby="location-title"
            className="border-b border-[#dce5dd] py-6 sm:py-7"
          >
            <SectionHeading id="location-title">Campus &amp; location</SectionHeading>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {campusRecords.map((campus) => {
                const mapsHref = campus.address
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(campus.address)}`
                  : undefined;
                const mapsEmbedHref = campus.address
                  ? `https://maps.google.com/maps?q=${encodeURIComponent(campus.address)}&output=embed`
                  : undefined;
                const campusLocation = [
                  campus.locality,
                  campus.city,
                  campus.district,
                  campus.state,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <details
                    key={campus.id}
                    open={campusRecords.length === 1}
                    className="rounded-2xl border border-[#dce7df] bg-white p-4"
                  >
                    <summary className="cursor-pointer font-serif text-lg font-semibold text-[#18352d]">
                      {campus.name ?? campusLocation ?? "Campus"}
                    </summary>
                    <div className="mt-3">
                      {campusLocation && (
                        <p className="text-sm leading-6 text-[#52645a]">
                          {campusLocation}
                        </p>
                      )}
                      {campus.address && (
                        <p className="mt-2 text-sm font-medium leading-6 text-[#29483a]">
                          {campus.address}
                        </p>
                      )}
                      {campus.locationSource && (
                        <div className="mt-2">
                          <SourceLink source={campus.locationSource} />
                          <p className="text-xs text-[#718078]">
                            {verificationLabel(
                              campus.locationSource.verificationStatus,
                              campus.locationSource.checkedOn,
                            )}
                          </p>
                        </div>
                      )}
                      {mapsEmbedHref && mapsHref && (
                        <div className="mt-4 overflow-hidden rounded-xl bg-[#f7f8f5]">
                          <iframe
                            title={`Map showing ${campus.name ?? institution.name}`}
                            src={mapsEmbedHref}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            className="h-64 w-full border-0"
                          />
                          <a
                            href={mapsHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-10 items-center gap-2 px-4 text-sm font-semibold text-[#145543] hover:underline"
                          >
                            Get directions
                            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                          </a>
                        </div>
                      )}
                      {(campus.phone || campus.email) && (
                        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                          {campus.phone && (
                            <ContactItem
                              label="Phone"
                              value={campus.phone.value}
                              source={campus.phone.source}
                            />
                          )}
                          {campus.email && (
                            <ContactItem
                              label="Email"
                              value={campus.email.value}
                              source={campus.email.source}
                            />
                          )}
                        </dl>
                      )}
                      {!!campus.facilities?.length && (
                        <div className="mt-4">
                          <h3 className="text-sm font-semibold text-[#29483a]">
                            Facilities &amp; student support
                          </h3>
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {campus.facilities.map((facility) => (
                              <li key={facility.label}>
                                <SourceLink
                                  source={{
                                    ...facility.source,
                                    label: facility.label,
                                  }}
                                  className="inline-flex min-h-9 items-center rounded-full border border-[#dce5dd] bg-white px-3 text-sm font-medium text-[#315345] hover:border-[#9fc5ad] hover:underline"
                                />
                                <span className="ml-2 text-xs text-[#718078]">
                                  {verificationLabel(
                                    facility.verificationStatus,
                                    facility.verifiedDate,
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        )}

        {institution.limitedInfo && (
          <section
            aria-labelledby="more-info-title"
            className="border-b border-[#dce5dd] py-7 sm:py-8"
          >
            <h2
              id="more-info-title"
              className="font-serif text-xl font-semibold tracking-[-.025em]"
            >
              More information
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#59665e]">
              {institution.limitedInfo}
            </p>
            {institution.website && (
              <SourceLink
                source={institution.website}
                className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#145543] hover:underline"
              />
            )}
          </section>
        )}

        <section
          aria-labelledby="sources-title"
          className="flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-center"
        >
          <div>
            <h2
              id="sources-title"
              className="text-sm font-semibold text-[#29483a]"
            >
              Sources &amp; information updates
            </h2>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {institution.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-8 items-center text-xs text-[#145543] underline-offset-2 hover:underline"
                >
                  {source.label}
                  <ArrowUpRight aria-hidden="true" className="ml-1 h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
          <p className="shrink-0 text-xs text-[#718078]">
            CareerBridge record reviewed · {institution.lastReviewed}
          </p>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      className="font-serif text-xl font-semibold tracking-[-.025em] sm:text-2xl"
    >
      {children}
    </h2>
  );
}

function FinancialCard({
  title,
  record,
}: {
  title: string;
  record: InstitutionFinancialRecord;
}) {
  return (
    <article className="rounded-xl border border-[#dce7df] bg-white p-4">
      <h3 className="font-serif text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#59665e]">{record.description}</p>
      <SourceLink
        source={record.source}
        className="cb-card-action mt-3 w-fit"
      />
      <p className="text-xs text-[#718078]">
        {[
          record.provider,
          record.academicYear,
          verificationLabel(record.verificationStatus, record.verifiedDate),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </article>
  );
}

function ContactItem({
  label,
  value,
  source,
}: {
  label: string;
  value?: string;
  source: InformationSource;
}) {
  return (
    <div className="border-b border-[#e5ebe6] py-2">
      <dt className="text-xs text-[#718078]">{label}</dt>
      {value && (
        <dd className="mt-0.5 text-sm font-semibold text-[#29483a]">{value}</dd>
      )}
      <dd><SourceLink source={source} /></dd>
      <dd className="text-xs text-[#718078]">
        {verificationLabel(source.verificationStatus, source.checkedOn)}
      </dd>
    </div>
  );
}

function SourceLink({
  source,
  className,
}: {
  source: InformationSource;
  className?: string;
}) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className={
        className ??
        "inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-[#145543] hover:underline"
      }
    >
      {source.label}
      <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
    </a>
  );
}

function verificationLabel(
  status?: VerificationStatus,
  checkedOn?: string,
) {
  if (status === "outdated") {
    return checkedOn ? `Outdated · last checked ${checkedOn}` : "Outdated";
  }
  if (status === "unverified") return "Not independently verified";
  if (status === "verified") {
    return checkedOn ? `Verified ${checkedOn}` : "Verification date missing";
  }
  return "Verification not recorded";
}
