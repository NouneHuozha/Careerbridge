import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Breadcrumbs } from "../../../breadcrumbs";
import { possibilityFields } from "../../../discover/possibility-fields";
import { HistoryVisit } from "../../history-visit";
import { SavedItemButton } from "../../saved-item-button";
import CatalogueEvidence from "../../catalogue-evidence";
import { getExaminationForUi } from "../examination-page-data";
import { examinationLevels } from "../examination-data";

type PageProps = {
  params: Promise<{ examId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const instant = false;

function getQueryString(query: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") params.set(key, value);
    else value?.forEach((item) => params.append(key, item));
  }
  return params.toString();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examId } = await params;
  const examination = await getExaminationForUi(examId);
  return examination
    ? { title: `${examination.name} | Examinations | CareerBridge`, description: examination.purpose }
    : { title: "Examination details | CareerBridge" };
}

export default async function ExaminationDetailsPage({ params, searchParams }: PageProps) {
  const [{ examId }, query] = await Promise.all([params, searchParams]);
  const examination = await getExaminationForUi(examId);
  if (!examination) notFound();

  const listingQuery = getQueryString(query);
  const listingHref = `/explore/examinations${listingQuery ? `?${listingQuery}` : ""}`;
  const stage = typeof query.stage === "string" && ["class-10", "class-12", "all"].includes(query.stage)
    ? query.stage
    : undefined;
  const fieldId = typeof query.field === "string" && possibilityFields.some((field) => field.id === query.field)
    ? query.field
    : undefined;
  const context = {
    ...(stage ? { stage } : {}),
    ...(fieldId ? { fieldId } : {}),
  };
  const stages = examination.stages.map((value) => value === "class-10" ? "Class 10" : "Class 12");
  const classification = examination.dataClassification ?? "demo";

  return (
    <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <HistoryVisit type="examination" id={examination.id} context={context} />
      <div className="cb-container pb-14 pt-6 sm:pb-20 sm:pt-8">
        <Breadcrumbs
          items={[
            { label: "Explore", href: "/explore" },
            { label: "Examinations", href: listingHref },
            { label: examination.name },
          ]}
          className="!px-0"
        />

        <header className="mt-8 rounded-[2rem] bg-[#18352d] px-6 py-8 text-white sm:px-10 sm:py-11">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#e2ebe5]">
              {examinationLevels[examination.level]}
            </span>
            {stages.length ? stages.map((value) => (
              <span key={value} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#e2ebe5]">{value}</span>
            )) : <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#e2ebe5]">Stage not recorded</span>}
          </div>
          <h1 className="mt-5 max-w-4xl font-serif text-[clamp(2.75rem,6vw,5rem)] font-semibold leading-[.96] tracking-[-.055em]">{examination.name}</h1>
          <p className="mt-4 max-w-[64ch] text-lg leading-relaxed text-[#f3f5f1] sm:text-xl">{examination.purpose}</p>
          <p className="mt-4 text-sm font-semibold text-[#c8ddd0]">Authority recorded: {examination.authority}</p>
          {classification === "demo" && (
            <p className="mt-5 max-w-3xl rounded-xl border border-[#d2b778]/40 bg-[#d2b778]/10 px-4 py-3 text-sm leading-relaxed text-[#f0dfb6]">
              Development demo content: illustrative only, unverified, and not a published real examination record.
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <SavedItemButton type="examination" id={examination.id} context={context} />
            {examination.officialUrl && (
              <a href={examination.officialUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#145543] hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                Check official information <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            )}
          </div>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-2xl border border-[#dce7df] bg-white p-5 sm:p-7">
            <h2 className="font-serif text-2xl font-semibold tracking-[-.03em]">What this record says</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#52645a]">
              These fields are catalogue facts for this examination record. They do not determine an individual student’s eligibility or admission outcome.
            </p>
            {examination.programmes.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-[#18352d]">Programmes associated with the examination</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {examination.programmes.map((programme) => <li key={programme} className="rounded-full bg-[#eaf2ed] px-3 py-1.5 text-sm text-[#315345]">{programme}</li>)}
                </ul>
              </div>
            )}
            {examination.regions.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-[#18352d]">Regions recorded</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#52645a]">{examination.regions.join(" · ")}</p>
              </div>
            )}
            {examination.fields.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-[#18352d]">Related fields</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#52645a]">{examination.fields.join(" · ")}</p>
              </div>
            )}
            {stage && stage !== "all" && (
              <p className="mt-5 rounded-xl bg-[#f5f8f5] px-4 py-3 text-sm leading-relaxed text-[#52645a]">
                You opened this record while browsing after {stage === "class-10" ? "Class 10" : "Class 12"}. This browsing context does not confirm that this examination is available or appropriate for you.
              </p>
            )}
          </div>
          <aside className="h-fit rounded-2xl bg-[#eaf2ed] p-5 sm:p-6">
            <h2 className="font-serif text-xl font-semibold">Details to confirm</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#354b40]">
              This catalogue schema does not record cycle-specific eligibility, application steps, exam pattern, fees or dates for examinations. Those details are not inferred here; use the official authority’s latest notice.
            </p>
            {examination.officialUrl ? (
              <a href={examination.officialUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#145543] underline underline-offset-2">
                Open official site <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            ) : <p className="mt-4 text-sm text-[#718078]">An official link has not been recorded for this entry.</p>}
          </aside>
        </section>

        <CatalogueEvidence sources={examination.sources} demo={classification === "demo"} />
        <Link href={listingHref} className="mt-8 inline-flex min-h-11 items-center gap-2 font-semibold text-[#145543] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#145543]">
          <ArrowRight aria-hidden="true" className="h-4 w-4 rotate-180" /> Back to examinations
        </Link>
      </div>
    </main>
  );
}
