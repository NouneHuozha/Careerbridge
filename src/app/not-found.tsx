import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-[70svh] items-center bg-[#fbfaf6] px-5 py-16 text-[#18352d]">
      <section className="mx-auto w-full max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[.14em] text-[#52715f]">
          Page not found
        </p>
        <h1 className="mt-4 font-serif text-4xl font-semibold tracking-[-.045em] sm:text-5xl">
          We couldn’t find that page.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-[#59665e] sm:text-lg">
          The link may be out of date, or the item may no longer be available.
          Head back to Explore to continue browsing.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/explore"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            Explore CareerBridge <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#cbd9cf] px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Home
          </Link>
        </div>
      </section>
    </main>
  );
}
