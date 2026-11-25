"use client";

export default function FieldsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-svh bg-[#fbfaf6] px-5 py-16 text-[#18352d]">
      <div className="mx-auto max-w-xl rounded-2xl border border-[#dce7df] bg-white p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[.12em] text-[#4c6a5a]">Fields unavailable</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold">We could not load the field catalogue.</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#59665e]">
          No cached field descriptions are being shown. Please retry in a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-11 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
