import Link from "next/link";
import { ArrowLeft, CircleHelp } from "lucide-react";

export default function SourceNotFound() {
  return (
    <main className="mx-auto flex min-h-[50svh] max-w-2xl flex-col items-start justify-center">
      <span className="grid size-11 place-items-center rounded-full bg-[#edf3f7] text-[#496b85]">
        <CircleHelp aria-hidden="true" className="size-5" />
      </span>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#377b78]">
        Sources
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#17364a]">
        Source not found
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#657976]">
        This source or check attempt is not available in the illustrative preview.
      </p>
      <Link
        href="/admin/sources"
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#cbdcd4] bg-white px-4 text-sm font-semibold text-[#286c60] hover:bg-[#edf6f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to Sources
      </Link>
    </main>
  );
}
