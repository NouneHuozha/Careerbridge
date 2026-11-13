import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageLoadingSkeleton } from "../../../page-loading-skeleton";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CircleHelp,
  ExternalLink,
  GraduationCap,
  MapPin,
  Wallet,
} from "lucide-react";
import { Breadcrumbs } from "../../../breadcrumbs";
import { SavedItemButton } from "../../saved-item-button";
import { HistoryVisit } from "../../history-visit";
import { possibilityFields } from "../../../discover/possibility-fields";
import { courseCatalog } from "../../courses/catalog/course-catalog-data";
import {
  resolvedInstitutionCampusOfferings,
  type InformationFact,
} from "../institution-data";
import type {
  InformationSource,
  VerificationStatus,
} from "../../institution-directory/institution-registry";

type SearchParams = Record<string, string | string[] | undefined>;

export const metadata: Metadata = {
  title: "Institution details | CareerBridge",
  description: "Explore course information and institution details.",
};

function verificationLabel(status?: VerificationStatus, checkedOn?: string) {
  if (status === "verified") {
    return checkedOn ? `Verified ${formatDate(checkedOn)}` : "Verification date missing";
  }
  if (status === "outdated") {
    return checkedOn
      ? `Outdated · last checked ${formatDate(checkedOn)}`
      : "Outdated · re-check needed";
  }
  if (status === "unverified") return "Not independently verified";
  return "Verification status not recorded";
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function SourceLink({ source }: { source: InformationSource }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-sm font-semibold text-[#145543] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
    >
      {source.label}
      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
    </a>
  );
}

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#e1e8e1] bg-white p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#eaf2ed] text-[#145543]">
          {icon}
        </span>
        <h2 className="font-serif text-xl font-semibold tracking-[-.025em] sm:text-2xl">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Fact({
  label,
  fact,
  source,
}: {
  label: string;
  fact: InformationFact;
  source?: InformationSource;
}) {
  const factSource = source ?? fact.source;

  return (
    <div className="min-w-0 rounded-2xl bg-[#f7f8f5] p-4">
      <p className="text-xs font-semibold uppercase tracking-[.1em] text-[#718078]">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-[#29483a]">{fact.value}</p>
      {factSource && <div className="mt-2"><SourceLink source={factSource} /></div>}
      <p className="mt-1 text-xs text-[#718078]">
        {verificationLabel(
          fact.verificationStatus ?? factSource?.verificationStatus,
          factSource?.checkedOn,
        )}
      </p>
    </div>
  );
}

export default function InstitutionDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="detail" showHeader={false} />}>
      <InstitutionDetails params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function InstitutionDetails({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const institution = resolvedInstitutionCampusOfferings.find((item) => item.slug === slug);
  if (!institution) notFound();

  const courseId = firstParam(query.course) ?? institution.courseId;
  if (courseId !== institution.courseId) notFound();
  const courseName = firstParam(query.courseName) ?? (courseId === "bca" ? "Bachelor of Computer Applications (BCA)" : courseId);
  const savedCourseName =
    courseCatalog.find((course) => course.id === courseId)?.name ??
    courseName.slice(0, 200);
  const requestedStage = firstParam(query.stage);
  const stage =
    requestedStage === "class-10" ||
    requestedStage === "class-12" ||
    requestedStage === "all"
      ? requestedStage
      : undefined;
  const fieldId = firstParam(query.field) ?? "";
  const field = possibilityFields.find((item) => item.id === fieldId);
  const returnParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const scalar = firstParam(value);
    if (scalar && key !== "returnTo") returnParams.set(key, scalar);
  }
  const fallbackReturn = `/explore/institutions?${returnParams.toString()}`;
  const requestedReturn = firstParam(query.returnTo);
  const returnTo = requestedReturn?.startsWith("/explore/institutions?") ? requestedReturn : fallbackReturn;
  const stageLabel = stage === "class-10" ? "Class 10" : stage === "class-12" ? "Class 12" : undefined;
  const offering = institution.offering;
  const hasAdmissionInfo = Boolean(
    offering?.admissionCycles?.some(
      (cycle) =>
        cycle.eligibility || cycle.admissionProcess || cycle.entranceExam || cycle.admissionUrl,
    ),
  );
  const hasFeeInfo = Boolean(offering?.fees || offering?.scholarships?.length);
  const campus = institution.campus;
  const cityLine = [campus.locality, campus.city, campus.state].filter(Boolean).join(", ");
  const fullLocation = [campus.locality, campus.city, campus.district, campus.state].filter(Boolean).join(", ");
  const hasCampusLocation = Boolean(
    campus.locality || campus.city || campus.district || campus.state || campus.address,
  );
  const directionsHref =
    campus.directionsUrl ??
    (campus.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(campus.address)}`
      : undefined);
  const breadcrumbs = [
    { label: "Explore", href: "/explore" },
    ...(field
      ? [{
          label: field.name,
          href: `/explore/fields/${field.id}${stage === "class-10" || stage === "class-12" ? `?stage=${stage}` : ""}`,
        }]
      : []),
    { label: courseName, href: returnTo },
    { label: "Institutions", href: returnTo },
    { label: institution.institution.name },
  ];

  return (
    <main className="min-h-svh bg-[#fbfaf6] pb-20 text-[#18352d]">
      <HistoryVisit
        type="institution-offering"
        id={institution.slug}
        context={{
          courseId,
          courseName: savedCourseName,
          ...(field ? { fieldId: field.id } : {}),
          ...(stage ? { stage } : {}),
        }}
      />
      <Breadcrumbs items={breadcrumbs} className="pt-6 sm:pt-8" />
      <div className="w-full px-5 pt-7 sm:px-8 lg:px-12 lg:pt-10 2xl:px-16">
        {institution.isDemo && (
          <aside role="note" className="mb-6 flex gap-3 rounded-2xl border border-[#e7d6a8] bg-[#fff8e8] p-4 text-[#594c32]">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#9a752c]" />
            <p className="text-sm leading-6">
              <strong>Fictional preview profile:</strong> the institution, course, location, source links, dates and all other details on this page are sample data for UI review only. They are not verified real-world information.
            </p>
          </aside>
        )}

        <header className="border-b border-[#e1e8e1] pb-7 sm:pb-9">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">Institution details</p>
          <h1 className="mt-3 max-w-6xl font-serif text-4xl font-semibold leading-[1.05] tracking-[-.04em] sm:text-5xl lg:text-6xl">
            {institution.institution.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#59675f]">
            <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" className="h-4 w-4 text-[#5b8b73]" />{cityLine}</span>
            {institution.institution.type && (
              <>
                <span aria-hidden="true" className="hidden text-[#9aa59e] sm:inline">·</span>
                <span>{[institution.institution.ownership, institution.institution.type].filter(Boolean).join(" ")}</span>
              </>
            )}
            {stageLabel && <span className="rounded-full bg-[#eaf2ed] px-3 py-1 text-xs font-semibold text-[#315345]">{stageLabel}</span>}
          </div>
          <div className="mt-5">
            <SavedItemButton
              type="institution-offering"
              id={institution.slug}
              context={{
                courseId,
                courseName: savedCourseName,
                ...(field ? { fieldId: field.id } : {}),
                ...(stage ? { stage } : {}),
              }}
            />
          </div>
        </header>

        <div className="mt-7 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_360px] 2xl:items-start 2xl:gap-8">
          <div className="grid min-w-0 gap-5 xl:grid-cols-2">
            <section className="overflow-hidden rounded-3xl border border-[#cddfd2] bg-[#edf5ef] xl:col-span-2">
              <div className="p-5 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#557163]">Course you’re exploring</p>
                <h2 className="mt-3 font-serif text-2xl font-semibold leading-tight tracking-[-.025em] sm:text-3xl">{courseName}</h2>
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#725b2d]">
                  <CircleHelp aria-hidden="true" className="h-4 w-4" />
                  {institution.isDemo ? "Sample offering · not verified" : "Course offering recorded"}
                </p>
                <h3 className="mt-6 text-sm font-semibold text-[#214d3d]">About this course at this institution</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52645a]">
                  {offering?.description?.value ?? `This sample listing connects ${institution.institution.name} with ${courseName}. Additional course details are shown only when they are available in the record.`}
                </p>
                {offering?.description && (
                  <p className="mt-1 text-xs text-[#718078]">
                    {verificationLabel(
                      offering.description.verificationStatus ??
                        offering.description.source?.verificationStatus,
                      offering.description.source?.checkedOn,
                    )}
                  </p>
                )}
              </div>
              {offering?.duration || offering?.studyMode ? (
                <div className="border-t border-[#cddfd2] px-5 pb-5 sm:px-7 sm:pb-7">
                  <h3 className="mb-3 pt-4 text-xs font-semibold uppercase tracking-[.12em] text-[#557163]">Course information</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {offering.duration && <Fact label="Duration" fact={offering.duration} />}
                    {offering.studyMode && <Fact label="Study mode" fact={offering.studyMode} />}
                  </div>
                </div>
              ) : null}
            </section>

            {hasAdmissionInfo && (
              <DetailSection icon={<GraduationCap aria-hidden="true" className="h-5 w-5" />} title="Admission information">
                <div className="grid gap-4">
                  {offering?.admissionCycles?.map((cycle) => {
                    const cycleSource = cycle.admissionUrl ?? cycle.source;
                    return (
                    <article key={cycle.academicYear} className="rounded-2xl bg-[#f7f8f5] p-4">
                      <h3 className="text-sm font-semibold text-[#29483a]">
                        Academic year {cycle.academicYear}
                      </h3>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {cycle.eligibility && <Fact label="Eligibility" fact={cycle.eligibility} />}
                        {cycle.admissionProcess && <Fact label="Admission process" fact={cycle.admissionProcess} />}
                        {cycle.entranceExam && <Fact label="Entrance examination" fact={cycle.entranceExam} />}
                      </div>
                      {cycleSource && (
                        <div className="mt-3">
                          <SourceLink source={cycleSource} />
                          <p className="text-xs text-[#718078]">
                            {verificationLabel(
                              cycleSource.verificationStatus,
                              cycleSource.checkedOn,
                            )}
                          </p>
                        </div>
                      )}
                    </article>
                    );
                  })}
                </div>
              </DetailSection>
            )}

            {hasFeeInfo && (
              <DetailSection icon={<Wallet aria-hidden="true" className="h-5 w-5" />} title="Fees & financial support">
                {offering?.fees && (
                  <div className="rounded-2xl bg-[#f7f8f5] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[.1em] text-[#718078]">Course fees</p>
                    <p className="mt-2 text-xl font-semibold text-[#29483a]">{offering.fees.value}</p>
                    <p className="mt-1 text-sm text-[#637168]">
                      {offering.fees.paymentPeriod} · academic year {offering.fees.academicYear}
                    </p>
                    {offering.fees.source && <div className="mt-2"><SourceLink source={offering.fees.source} /></div>}
                    <p className="mt-1 text-xs text-[#718078]">
                      {verificationLabel(
                        offering.fees.verificationStatus ??
                          offering.fees.source?.verificationStatus,
                        offering.fees.source?.checkedOn,
                      )}
                    </p>
                  </div>
                )}
                {!!offering?.scholarships?.length && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-[#29483a]">Scholarships to explore</h3>
                    <ul className="mt-2 space-y-3">
                      {offering.scholarships.map((scholarship) => (
                        <li key={scholarship.description} className="rounded-2xl bg-[#f7f8f5] p-4 text-sm leading-6 text-[#52645a]">
                          {scholarship.description}
                          {scholarship.url && <div className="mt-1"><SourceLink source={scholarship.url} /></div>}
                          <p className="mt-1 text-xs text-[#718078]">
                            {verificationLabel(
                              scholarship.verificationStatus ??
                                scholarship.url?.verificationStatus,
                              scholarship.url?.checkedOn,
                            )}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </DetailSection>
            )}

            {hasCampusLocation && (
              <DetailSection icon={<MapPin aria-hidden="true" className="h-5 w-5" />} title="Location">
                <div className="flex flex-col gap-4 rounded-2xl bg-[#f7f8f5] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[.1em] text-[#718078]">
                      {institution.isDemo ? "Sample campus location" : "Campus location"}
                    </p>
                    <p className="mt-2 font-semibold text-[#29483a]">{campus.name ?? institution.institution.name}</p>
                    {fullLocation && <p className="mt-1 text-sm text-[#637168]">{fullLocation}</p>}
                    {campus.address && <p className="mt-2 text-sm text-[#637168]">{campus.address}</p>}
                  </div>
                  {directionsHref && (
                    <a href={directionsHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-full border border-[#cddfd2] bg-white px-4 text-sm font-semibold text-[#145543] hover:bg-[#eef5ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
                      Get directions <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                    </a>
                  )}
                </div>
                {campus.locationSource && (
                  <p className="mt-2 text-xs text-[#718078]">
                    Location source: {campus.locationSource.label} ·{" "}
                    {verificationLabel(
                      campus.locationSource.verificationStatus,
                      campus.locationSource.checkedOn,
                    )}
                  </p>
                )}
                {institution.isDemo && <p className="mt-3 text-xs leading-5 text-[#718078]">Location shown is fictional sample data; no precise map pin is provided.</p>}
              </DetailSection>
            )}

            <DetailSection icon={<ExternalLink aria-hidden="true" className="h-5 w-5" />} title="Official information">
              <div className="divide-y divide-[#edf0ec]">
                <div className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#29483a]">Institution website</h3>
                    <p className="mt-1 text-sm text-[#637168]">Visit the institution’s website for further information.</p>
                  </div>
                  {institution.institution.website ? <SourceLink source={institution.institution.website} /> : <span className="text-sm text-[#718078]">Not available in this record</span>}
                </div>
                {institution.prospectus && (
                  <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[#29483a]">Official prospectus / admission notice</h3>
                      <p className="mt-1 text-sm text-[#637168]">A course-specific document for this offering.</p>
                    </div>
                    <SourceLink source={institution.prospectus} />
                  </div>
                )}
                {campus.email && (
                  <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[#29483a]">Contact information</h3>
                      <p className="mt-1 text-sm text-[#637168]">{campus.email.value}</p>
                    </div>
                    <SourceLink source={campus.email.source} />
                  </div>
                )}
              </div>
            </DetailSection>

            {!!institution.sources?.length && (
              <div className="xl:col-span-2">
                <DetailSection icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />} title="Information sources">
                <ul className="divide-y divide-[#edf0ec]">
                  {institution.sources.map(({ fact, source }) => (
                    <li key={`${fact}-${source.url}`} className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#29483a]">{fact}</p>
                        <p className="mt-1 text-xs text-[#718078]">
                          {source.checkedOn
                            ? `${verificationLabel(source.verificationStatus)} · checked ${formatDate(source.checkedOn)}`
                            : verificationLabel(source.verificationStatus)}
                        </p>
                      </div>
                      <SourceLink source={source} />
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-5 text-[#718078]">Each fact has its own source and check date. A source for one fact does not verify the others.</p>
                </DetailSection>
              </div>
            )}
          </div>

          <aside className="space-y-4 2xl:sticky 2xl:top-8">
            <section className="rounded-3xl border border-[#e1e8e1] bg-white p-5">
              <h2 className="text-sm font-semibold text-[#29483a]">Want to compare other institutions?</h2>
              <p className="mt-2 text-sm leading-6 text-[#637168]">Return to the institutions offering {courseName}. Your search and filters are carried with you.</p>
              <Link href={returnTo} scroll={false} className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#145543] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to {courseName} institutions
              </Link>
            </section>
            {institution.isDemo && (
              <p className="rounded-2xl border border-[#e7d6a8] bg-[#fff8e8] p-4 text-xs leading-5 text-[#725b2d]">
                Every fact and source on this preview profile is fictional. Replace with verified, fact-level sources before using institution data publicly.
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}