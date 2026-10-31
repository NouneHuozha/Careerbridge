import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";

export default function CollegeNotFound() {
  return (
    <main className="min-h-screen bg-[#fbfaf6] text-[#18352d]">
      <header className="bg-[#123f34] py-5 text-white">
        <div className="cb-container">
          <Link href="/" className="font-serif text-xl font-semibold">
            CareerBridge
          </Link>
        </div>
      </header>
      <section className="cb-container flex min-h-[70vh] items-center py-14">
        <div className="w-full rounded-[1.6rem] border border-[#d9ddd5] bg-white p-6 shadow-[0_24px_70px_-55px_rgba(24,53,45,.45)] sm:p-10">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-[#718078]">
            <Building2 aria-hidden="true" className="h-4 w-4" />
            College directory
          </p>
          <h1 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight tracking-[-.04em] text-[#102d26] sm:text-5xl">
            We couldn’t find that college record.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#59665e]">
            The link may be out of date, or this college may not have a reviewed
            public record yet. This is different from a valid study route with
            no verified college listings.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/colleges"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Browse all colleges
            </Link>
            <Link
              href="/discover/results?mode=all"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#b8c8bd] bg-white px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Browse all areas
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
