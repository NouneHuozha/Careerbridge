"use client";

export default function CoursesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-svh bg-[#fbfaf6] px-5 py-16 text-[#18352d]">
      <section
        role="alert"
        className="mx-auto max-w-xl rounded-2xl border border-[#dce7df] bg-white p-6 sm:p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[.12em] text-[#4c6a5a]">
          Courses unavailable
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold">
          We could not load course information.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#59665e]">
          Please try again in a moment. No demo course listings are being shown.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-11 rounded-full bg-[#145543] px-5 text-sm font-semibold text-white"
        >
          Retry
        </button>
      </section>
    </main>
  );
}
