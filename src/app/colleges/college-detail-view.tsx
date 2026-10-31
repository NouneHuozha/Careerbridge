import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, ExternalLink, MapPin } from "lucide-react";
import type { CollegeRecord } from "./college-data";
import CollegeRecoveryActions from "./college-recovery-actions";

export default function CollegeDetailView({
  college,
  backHref,
}: {
  college: CollegeRecord;
  backHref: string;
}) {
  return (
    <main className="min-h-screen bg-[#fbfaf6] text-[#18352d]">
      <header className="relative overflow-hidden bg-[#123f34] pb-10 text-white sm:pb-14">
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
            <Link
              href={backHref}
              className="inline-flex min-h-9 items-center gap-2 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2cf78]"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Back to College List
            </Link>
          </nav>

          <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-end lg:gap-12">
            <div className="max-w-4xl">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-[#f2cf78] sm:text-sm">
                <Building2 aria-hidden="true" className="h-4 w-4" />
                {college.type} · {college.district}
              </p>
              <h1 className="mt-4 max-w-[18ch] font-serif text-[clamp(2.8rem,7vw,5.4rem)] font-semibold leading-[.98] tracking-[-.055em] text-white">
                {college.name}
              </h1>
              <p className="mt-5 flex max-w-[58ch] items-start gap-2 text-base leading-relaxed text-white/80 sm:text-lg">
                <MapPin aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-[#f2cf78]" />
                {college.address}
              </p>
            </div>

            <aside className="rounded-[1.4rem] border border-white/15 bg-[#0c332b]/70 p-5 backdrop-blur-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#f2cf78]">
                Published programme record
              </p>
              <p className="mt-3 font-serif text-xl font-semibold leading-snug text-white">
                {college.programmeCycle}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Programme details below are from the linked official page. The
                2026 admission cycle is past; future availability and entry
                requirements are not confirmed here.
              </p>
            </aside>
          </div>
        </div>
      </header>

      <div className="cb-container pb-16 pt-8 sm:pb-20 sm:pt-11">
        <section aria-labelledby="programmes-title">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
              Official page · 2026 cycle
            </p>
            <h2
              id="programmes-title"
              className="mt-2 font-serif text-2xl font-semibold tracking-[-.035em] text-[#102d26] sm:text-3xl"
            >
              Programmes and subject names published
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#59665e] sm:text-base">
              These are the programme or subject names listed on the linked
              2026 page. The list is not a promise that the same options will be
              available in a later cycle.
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {college.programmes.map((programme, index) => (
              <article
                key={programme.name}
                className="rounded-[1.4rem] border border-[#d9ddd5] bg-white p-5 shadow-[0_18px_55px_-45px_rgba(24,53,45,.4)] sm:p-7"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[.14em] text-[#718078]">
                    Programme {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="rounded-full bg-[#f4f1e7] px-3 py-1 text-xs font-medium text-[#725b2f]">
                    {programme.sourceLabel}
                  </span>
                </div>
                <h3 className="mt-3 font-serif text-xl font-semibold leading-snug text-[#18372e] sm:text-2xl">
                  {programme.name}
                </h3>
                {programme.subjects && programme.subjects.length > 0 ? (
                  <>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[.13em] text-[#718078]">
                      Names listed by the college
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {programme.subjects.map((subject) => (
                        <li
                          key={subject}
                          className="rounded-lg border border-[#e4e5df] bg-[#fbfaf6] px-3 py-2 text-sm text-[#385347]"
                        >
                          {subject}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-4 rounded-xl bg-[#f7f6f0] px-4 py-3 text-sm leading-relaxed text-[#59665e]">
                    The 2026 programme page lists this programme but does not
                    provide a further subject list here.
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="admission-title"
          className="mt-9 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.72fr)] sm:mt-12"
        >
          <article className="rounded-[1.4rem] border border-[#e4cfac] bg-[#fff9eb] p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#725b2f]">
              Check before acting
            </p>
            <h2
              id="admission-title"
              className="mt-2 font-serif text-2xl font-semibold tracking-[-.035em] text-[#102d26] sm:text-3xl"
            >
              Admission and eligibility
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#59665e] sm:text-base">
              {college.admissionNote}
            </p>
            <a
              href={college.sources[0]?.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${college.name} official 2026 admission page in a new tab`}
              className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#145543] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Read the past 2026 official notice
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
          </article>

          <aside className="rounded-[1.4rem] border border-[#d9ddd5] bg-white p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#718078]">
              Cost information
            </p>
            <h2 className="mt-2 font-serif text-xl font-semibold text-[#18372e] sm:text-2xl">
              Fees and charges
            </h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#725b2f]">
              {college.feesNote}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
              Ask the college for the current prospectus and the fee schedule
              for the exact programme and academic year.
            </p>
          </aside>
        </section>

        <section aria-labelledby="contact-title" className="mt-9 sm:mt-12">
          <article className="rounded-[1.4rem] border border-[#d9ddd5] bg-white p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#718078]">
              Location and contact
            </p>
            <h2
              id="contact-title"
              className="mt-2 font-serif text-xl font-semibold text-[#18372e] sm:text-2xl"
            >
              Ask the college directly
            </h2>
            <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-[#59665e]">
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#145543]" />
              {college.address}
            </p>
            <div className="mt-4 space-y-2">
              {college.phones.map((phone) => {
                const digits = phone.replace(/\D/g, "");
                const href =
                  !phone.includes("/") && digits.length >= 7
                    ? `tel:${digits}`
                    : null;

                return (
                  <p key={phone} className="text-sm text-[#385347]">
                    <span className="font-medium text-[#718078]">Phone: </span>
                    {href ? (
                      <a
                        href={href}
                        aria-label={`Call ${college.name} at ${phone}`}
                        className="underline underline-offset-4 hover:text-[#145543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                      >
                        {phone}
                      </a>
                    ) : (
                      phone
                    )}
                  </p>
                );
              })}
              <p className="break-all text-sm text-[#385347]">
                <span className="font-medium text-[#718078]">Email: </span>
                <a
                  href={`mailto:${college.email}`}
                  className="underline underline-offset-4 hover:text-[#145543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  {college.email}
                </a>
              </p>
            </div>
            <a
              href={college.officialWebsite}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${college.name} official website in a new tab`}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#145543] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Official college website
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
          </article>

        </section>

        <section
          aria-labelledby="hostel-title"
          className="mt-4 rounded-[1.4rem] border border-[#d9ddd5] bg-[#f7f6f0] sm:mt-5"
        >
          <details className="group">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-[1.4rem] p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] sm:p-7">
              <span>
                <span className="block text-xs font-semibold uppercase tracking-[.15em] text-[#718078]">
                  Optional details
                </span>
                <h2
                  id="hostel-title"
                  className="mt-1 font-serif text-xl font-semibold text-[#18372e] sm:text-2xl"
                >
                  Hostel and facilities
                </h2>
                <span className="mt-1 block text-sm text-[#59665e]">
                  {college.hostelSummary}
                </span>
              </span>
              <ArrowRight
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-[#145543] transition-transform group-open:rotate-90"
              />
            </summary>
            <div className="border-t border-[#d9ddd5] px-5 py-4 sm:px-7 sm:py-5">
              <p className="max-w-3xl text-sm leading-relaxed text-[#59665e]">
                {college.hostelNote}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-[#718078]">
                Contact the college to confirm current availability,
                conditions, and any cost for the exact academic year.
              </p>
            </div>
          </details>
        </section>

        <section aria-labelledby="sources-title" className="mt-9 sm:mt-12">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#718078]">
              Traceable information
            </p>
            <h2
              id="sources-title"
              className="mt-2 font-serif text-2xl font-semibold tracking-[-.035em] text-[#102d26] sm:text-3xl"
            >
              Official sources
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#59665e]">
              Pages were checked on 31 October 2026. College information can
              change; use the official source for current details.
            </p>
          </div>
          <ul className="mt-5 grid gap-3 lg:grid-cols-2">
            {college.sources.map((source) => (
              <li
                key={source.url}
                className="rounded-[1.25rem] border border-[#d9ddd5] bg-white p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#718078]">
                  Checked {source.checkedOn}
                </p>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open source: ${source.label} in a new tab`}
                  className="mt-2 inline-flex items-start gap-2 font-semibold leading-relaxed text-[#145543] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  {source.label}
                  <ExternalLink aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
                </a>
                <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
                  {source.note}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 flex flex-col gap-4 rounded-[1.4rem] border border-[#d9ddd5] bg-[#eaf2ed] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#557064]">
              Keep browsing
            </p>
            <h2 className="mt-2 font-serif text-xl font-semibold text-[#18372e] sm:text-2xl">
              A college listing isn’t a decision.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#52635a]">
              Compare the published programme names, then confirm current
              details with the institution before acting.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <a
              href={college.sources[0]?.url ?? college.officialWebsite}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${college.name} official programme source in a new tab`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#b8c8bd] bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#f7f7f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Check official source
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
            <Link
              href="/colleges"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Browse college list
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </section>

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
