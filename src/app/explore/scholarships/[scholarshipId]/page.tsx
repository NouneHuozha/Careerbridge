import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Breadcrumbs } from "../../../breadcrumbs";
import { HistoryVisit } from "../../history-visit";
import { SavedItemButton } from "../../saved-item-button";
import CatalogueEvidence from "../../catalogue-evidence";
import { getScholarshipForUi } from "../scholarship-page-data";
import { scholarshipStudyLevels } from "../scholarship-data";

type PageProps = {
  params: Promise<{ scholarshipId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const instant = false;

function listingHref(query: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") params.set(key, value);
    else value?.forEach((item) => params.append(key, item));
  }
  const suffix = params.toString();
  return `/explore/scholarships${suffix ? `?${suffix}` : ""}`;
}

function labelsForLevels(values: string[]) {
  return values.map((value) => scholarshipStudyLevels.find((level) => level.value === value)?.label ?? value);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { scholarshipId } = await params;
  const scholarship = await getScholarshipForUi(scholarshipId);
  return scholarship
    ? { title: `${scholarship.name} | Scholarships | CareerBridge`, description: scholarship.purpose }
    : { title: "Scholarship details | CareerBridge" };
}

export default async function ScholarshipDetailsPage({ params, searchParams }: PageProps) {
  const [{ scholarshipId }, query] = await Promise.all([params, searchParams]);
  const scholarship = await getScholarshipForUi(scholarshipId);
  if (!scholarship) notFound();

  const backHref = listingHref(query);
  const stage = typeof query.stage === "string" && ["class-10", "class-12", "all"].includes(query.stage) ? query.stage : undefined;
  const fieldId = typeof query.field === "string" ? query.field : undefined;
  const context = {
    ...(stage ? { stage } : {}),
    ...(fieldId ? { fieldId } : {}),
  };
  const studyLevels = labelsForLevels(scholarship.studyLevels);
  const classification = scholarship.dataClassification ?? "demo";
  const detail = scholarship.detail;
  const regions = scholarship.eligibilityRegions === "all"
    ? "All India (scheme-specific conditions still apply)"
    : scholarship.eligibilityRegions.length
      ? scholarship.eligibilityRegions.join(" · ")
      : "No region recorded";

  return (
    <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <HistoryVisit type="scholarship" id={scholarship.id} context={context} />
      <div className="cb-container pb-14 pt-6 sm:pb-20 sm:pt-8">
        <Breadcrumbs
          items={[
            { label: "Explore", href: "/explore" },
            { label: "Scholarships", href: backHref },
            { label: scholarship.name },
          ]}
          className="!px-0"
        />

        <header className="mt-8 rounded-[2rem] bg-[#18352d] px-6 py-8 text-white sm:px-10 sm:py-11">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#e2ebe5]">{scholarship.category}</span>
            <span className="rounded-full border border-[#d2b778]/40 bg-[#d2b778]/10 px-3 py-1.5 text-xs font-semibold text-[#f0dfb6]">Status as recorded: {scholarship.status.replaceAll("_", " ")}</span>
          </div>
          <h1 className="mt-5 max-w-4xl font-serif text-[clamp(2.6rem,5vw,4.6rem)] font-semibold leading-[.96] tracking-[-.055em]">{scholarship.name}</h1>
          <p className="mt-3 font-serif text-xl text-[#c8ddd0] sm:text-2xl">Provider recorded: {scholarship.provider}</p>
          <p className="mt-4 max-w-[64ch] text-lg leading-relaxed text-[#f3f5f1] sm:text-xl">{scholarship.purpose}</p>
          {classification === "demo" && (
            <p className="mt-5 max-w-3xl rounded-xl border border-[#d2b778]/40 bg-[#d2b778]/10 px-4 py-3 text-sm leading-relaxed text-[#f0dfb6]">
              Development demo content: illustrative only, unverified, and not a published real scholarship opportunity. No cycle-specific information here should be relied upon.
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <SavedItemButton type="scholarship" id={scholarship.id} context={context} />
            {scholarship.officialUrl && (
              <a href={scholarship.officialUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#145543] hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                Check official information <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            )}
          </div>
        </header>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="space-y-5">
            <section className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7" aria-labelledby="scholarship-overview">
              <h2 id="scholarship-overview" className="font-serif text-2xl font-semibold tracking-[-.03em]">Opportunity overview</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#52645a]">
                The following values are what the catalogue record contains. Study level and region are not a determination that a particular student is eligible.
              </p>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#f7f8f5] p-4"><dt className="text-xs font-semibold uppercase tracking-[.08em] text-[#718078]">Support recorded</dt><dd className="mt-1 text-sm leading-relaxed text-[#354b40]">{scholarship.support}</dd></div>
                <div className="rounded-xl bg-[#f7f8f5] p-4"><dt className="text-xs font-semibold uppercase tracking-[.08em] text-[#718078]">Study level recorded</dt><dd className="mt-1 text-sm leading-relaxed text-[#354b40]">{studyLevels.length ? studyLevels.join(" · ") : "Not recorded"}</dd></div>
                <div className="rounded-xl bg-[#f7f8f5] p-4 sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-[.08em] text-[#718078]">Eligibility region recorded</dt><dd className="mt-1 text-sm leading-relaxed text-[#354b40]">{regions}</dd></div>
              </dl>
              {stage && stage !== "all" && (
                <p className="mt-4 rounded-xl bg-[#eaf2ed] px-4 py-3 text-sm leading-relaxed text-[#354b40]">
                  You opened this record while browsing after {stage === "class-10" ? "Class 10" : "Class 12"}. That context is not an eligibility assessment; check the current official scheme rules.
                </p>
              )}
            </section>

            {detail.benefitNotes?.length ? (
              <section className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7" aria-labelledby="benefits-title">
                <h2 id="benefits-title" className="font-serif text-2xl font-semibold tracking-[-.03em]">Benefits and support details</h2>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#52645a]">{detail.benefitNotes.map((item) => <li key={item} className="rounded-xl bg-[#f7f8f5] px-4 py-3">{item}</li>)}</ul>
              </section>
            ) : null}

            {detail.eligibility?.length ? (
              <section className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7" aria-labelledby="eligibility-title">
                <h2 id="eligibility-title" className="font-serif text-2xl font-semibold tracking-[-.03em]">Eligibility information recorded</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#52645a]">This information does not confirm your eligibility. Confirm all conditions with the official provider.</p>
                <ul className="mt-4 space-y-4">{detail.eligibility.map(({ title, description }) => <li key={title} className="border-t border-[#e7ece8] pt-4 first:border-0 first:pt-0"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-[#52645a]">{description}</p></li>)}</ul>
              </section>
            ) : null}

            {(detail.applicationMethod || detail.applicationSteps?.length) && (
              <section className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7" aria-labelledby="application-title">
                <h2 id="application-title" className="font-serif text-2xl font-semibold tracking-[-.03em]">Application information</h2>
                {detail.applicationMethod && <p className="mt-3 text-sm leading-relaxed text-[#52645a]">{detail.applicationMethod}</p>}
                {detail.applicationSteps?.length ? <ol className="mt-4 space-y-3">{detail.applicationSteps.map((step, index) => <li key={step} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eaf2ed] text-xs font-bold text-[#145543]">{index + 1}</span><p className="pt-1 text-sm leading-relaxed text-[#52645a]">{step}</p></li>)}</ol> : null}
                <p className="mt-4 text-xs leading-relaxed text-[#718078]">CareerBridge does not accept applications. Deadline details are not displayed unless explicitly present in reviewed data; follow the latest official notice.</p>
              </section>
            )}

            {detail.documents?.length ? (
              <section className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7" aria-labelledby="documents-title">
                <h2 id="documents-title" className="font-serif text-2xl font-semibold tracking-[-.03em]">Documents recorded</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#52645a]">The official application notice determines what is required.</p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">{detail.documents.map((item) => <li key={item} className="rounded-xl border border-[#e4eae5] bg-[#f8faf8] px-4 py-3 text-sm text-[#354b40]">{item}</li>)}</ul>
              </section>
            ) : null}

            {detail.afterApplication && <section className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7"><h2 className="font-serif text-2xl font-semibold">After applying</h2><p className="mt-3 text-sm leading-relaxed text-[#52645a]">{detail.afterApplication}</p></section>}
            {detail.renewal && <section className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7"><h2 className="font-serif text-2xl font-semibold">Renewal and continuation</h2><p className="mt-3 text-sm leading-relaxed text-[#52645a]">{detail.renewal}</p></section>}
            {detail.relatedCourses?.length ? <section className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7"><h2 className="font-serif text-2xl font-semibold">Related courses</h2><ul className="mt-4 space-y-2">{detail.relatedCourses.map((course) => <li key={course.href}><Link href={course.href} className="font-semibold text-[#145543] underline underline-offset-2">{course.name}</Link></li>)}</ul></section> : null}
            {detail.relatedInstitutions?.length ? <section className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7"><h2 className="font-serif text-2xl font-semibold">Related institutions</h2><ul className="mt-4 space-y-2">{detail.relatedInstitutions.map((institution) => <li key={institution.href}><Link href={institution.href} className="font-semibold text-[#145543] underline underline-offset-2">{institution.name}</Link></li>)}</ul></section> : null}

            {!detail.benefitNotes?.length && !detail.eligibility?.length && !detail.applicationMethod && !detail.applicationSteps?.length && !detail.documents?.length && !detail.afterApplication && !detail.renewal && !detail.relatedCourses?.length && !detail.relatedInstitutions?.length && (
              <section className="rounded-2xl border border-dashed border-[#cbd9cf] bg-white p-5 sm:p-7">
                <h2 className="font-serif text-2xl font-semibold">More details not recorded</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#52645a]">The catalogue does not contain detailed eligibility, benefit, document or application-step information for this record. Please use the official provider’s information.</p>
              </section>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-[#dce7df] bg-white p-5 sm:sticky sm:top-6 sm:p-6">
            <h2 className="font-serif text-xl font-semibold">Check the current cycle</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-xs font-semibold uppercase tracking-[.08em] text-[#718078]">Status in record</dt><dd className="mt-1 font-semibold text-[#18352d]">{scholarship.status === "unknown" ? "Not verified" : `${scholarship.status} (as recorded)`}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-[.08em] text-[#718078]">Deadline</dt><dd className="mt-1 text-[#52645a]">Not recorded</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-[.08em] text-[#718078]">Provider</dt><dd className="mt-1 text-[#52645a]">{scholarship.provider}</dd></div>
            </dl>
            {scholarship.officialUrl ? (
              <a href={scholarship.officialUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#145543] px-4 text-sm font-semibold text-white hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]">Official scheme information <ExternalLink aria-hidden="true" className="h-4 w-4" /></a>
            ) : <p className="mt-5 text-sm text-[#718078]">No official URL is recorded for this entry.</p>}
            <p className="mt-3 text-xs leading-relaxed text-[#718078]">Do not rely on a past opening or closing date. Confirm current availability and instructions with the provider.</p>
          </aside>
        </div>

        <CatalogueEvidence sources={scholarship.sources} demo={classification === "demo"} />
        <Link href={backHref} className="mt-8 inline-flex min-h-11 items-center gap-2 font-semibold text-[#145543] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#145543]">
          <ArrowRight aria-hidden="true" className="h-4 w-4 rotate-180" /> Back to scholarships
        </Link>
      </div>
    </main>
  );
}
