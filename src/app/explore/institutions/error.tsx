"use client";

export default function InstitutionsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-svh place-items-center bg-[#fbfaf6] px-5 text-[#18352d]">
      <section className="w-full max-w-lg rounded-3xl border border-[#e1e8e1] bg-white p-8 text-center">
        <h1 className="font-serif text-2xl font-semibold tracking-[-.025em]">
          We couldn’t load institutions
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#637168]">
          Please try again. If the problem continues, come back a little later.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-11 cursor-pointer rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
        >
          Try again
        </button>
      </section>
    </main>
  );
}