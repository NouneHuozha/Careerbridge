"use client";

export default function SourcesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[50svh] max-w-2xl flex-col items-start justify-center">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#377b78]">
        Sources workspace
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#17364a]">
        We couldn’t load this Sources page
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#657976]">
        Try again. No source checks or registry changes were submitted.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#20594f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
      >
        Try again
      </button>
    </main>
  );
}
