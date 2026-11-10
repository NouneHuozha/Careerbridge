"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "../../site-header";
import { Breadcrumbs } from "../../breadcrumbs";
import { useCounsellingSession } from "../counselling-engine";

export default function CounsellingCompletePage() {
  const router = useRouter();
  const stored = useCounsellingSession();
  const session = stored.status === "saved" ? stored.session : null;

  useEffect(() => {
    if (stored.status === "empty") router.replace("/counselling");
    if (stored.status === "saved" && stored.session.status !== "completed") {
      router.replace("/counselling/conversation");
    }
  }, [router, stored]);

  if (!session || session.status !== "completed") {
    const unavailable = stored.status === "unavailable" || stored.status === "invalid";
    return (
      <>
      <SiteHeader />
      <Breadcrumbs items={[{ label: "Guided Explorer", href: "/counselling" }, { label: "Complete" }]} className="pt-4" />
      <main className="min-h-svh bg-[#fbfaf6] px-5 pb-20 pt-5 text-[#18352d]">
        <div className="mx-auto max-w-2xl bg-[#eaf2ed] p-7 sm:p-10">
          <h1 className="font-serif text-3xl font-semibold tracking-[-.03em] sm:text-4xl">
            {unavailable ? "Your saved progress isn’t available." : "Finishing up…"}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#354b40]">
            {unavailable
              ? "The saved progress could not be read. It has not been erased."
              : "Your answers are kept in this browser session."}
          </p>
          <Link
            href="/counselling"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[#145543] px-5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            Back to introduction
          </Link>
        </div>
      </main>
      </>
    );
  }

  return (
    <>
    <SiteHeader />
    <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <Breadcrumbs items={[{ label: "Guided Explorer", href: "/counselling" }, { label: "Complete" }]} className="pt-4" />
      <section className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-5xl flex-col justify-center px-5 pb-16 pt-5 sm:px-8 lg:px-12">
        <p className="text-sm font-semibold uppercase tracking-[.14em] text-[#59665e]">
          Guided Explorer
        </p>
        <h1 className="mt-5 max-w-[16ch] font-serif text-5xl font-semibold leading-[1.02] tracking-[-.05em] sm:text-7xl">
          You’re ready to explore.
        </h1>
        <p className="mt-6 max-w-[55ch] text-lg leading-relaxed text-[#354b40] sm:text-xl">
          You can explore any field now. Your notes are here if you want to review or change them.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/explore"
            className="inline-flex min-h-13 items-center gap-2 rounded-full bg-[#145543] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            Start exploring <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            href="/counselling/summary"
            className="inline-flex min-h-12 items-center rounded-full px-5 text-sm font-semibold text-[#145543] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            Review my notes
          </Link>
        </div>
        <p className="mt-7 max-w-[60ch] text-sm leading-relaxed text-[#59665e]">
          Your answers stay in this browser session. They don’t restrict which fields you can explore.
        </p>
      </section>
    </main>
    </>
  );
}
