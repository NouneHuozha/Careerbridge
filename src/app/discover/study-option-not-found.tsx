import Link from "next/link";
import { ArrowLeft, ArrowRight, Compass } from "lucide-react";

export default function StudyOptionNotFound({
  parentHref,
  parentLabel,
}: {
  parentHref: string;
  parentLabel: string;
}) {
  return (
    <main className="min-h-screen bg-[#fbfaf6] text-[#18352d]">
      <header className="bg-[#123f34] text-white">
        <div className="cb-container flex min-h-16 items-center py-2">
          <Link href="/" className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
            CareerBridge
          </Link>
        </div>
      </header>

      <section className="cb-container grid min-h-[65vh] place-items-center py-12 sm:py-16">
        <div className="w-full max-w-2xl rounded-[1.75rem] border border-[#d9ddd5] bg-white p-6 shadow-[0_24px_65px_-48px_rgba(24,53,45,.55)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[.17em] text-[#7b6335]">
            Public guide
          </p>
          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-[-.04em] text-[#102d26] sm:text-4xl">
            We couldn’t find that page.
          </h1>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-[#59665e]">
            That study-option link may be incomplete or no longer available. This
            is different from a valid guide that has no verified listings.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={parentHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Browse {parentLabel}
            </Link>
            <Link
              href="/discover/results?mode=all"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#b8c8bd] bg-[#fbfaf6] px-5 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              <Compass aria-hidden="true" className="h-4 w-4" />
              Browse every area
            </Link>
            <Link
              href="/discover"
              className="inline-flex min-h-12 items-center justify-center gap-2 px-3 text-sm font-semibold text-[#59665e] underline underline-offset-4 transition-colors hover:text-[#145543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Start at Discovery
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#123f34] text-white">
        <div className="cb-container py-7">
          <p className="font-serif text-lg font-semibold">CareerBridge</p>
        </div>
      </footer>
    </main>
  );
}
