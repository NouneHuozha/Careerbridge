"use client";

type SkeletonVariant =
  | "landing"
  | "welcome"
  | "conversation"
  | "summary"
  | "form"
  | "results"
  | "explore"
  | "collection"
  | "detail";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#e4e9e5] motion-reduce:animate-none ${className}`} />;
}

function HeaderSkeleton() {
  return (
    <div aria-hidden="true" className="border-b border-[#e5e9e5] bg-white">
      <div className="mx-auto flex h-[68px] max-w-[1680px] items-center justify-between gap-6 px-[clamp(1.1rem,4vw,5rem)] lg:h-[76px]">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-12 rounded-full bg-[#dfe9e2]" />
          <SkeletonBlock className="h-5 w-32 bg-[#dfe9e2]" />
        </div>
        <SkeletonBlock className="hidden h-12 w-[390px] rounded-full lg:block" />
        <SkeletonBlock className="h-10 w-24 rounded-full" />
      </div>
    </div>
  );
}

function BreadcrumbSkeleton() {
  return (
    <div aria-hidden="true" className="mb-8 flex items-center gap-3">
      <SkeletonBlock className="h-8 w-8 rounded-full" />
      <SkeletonBlock className="h-4 w-4 rounded-full" />
      <SkeletonBlock className="h-8 w-20 rounded-full" />
    </div>
  );
}

function CardGrid({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-[#e7e9e2] bg-white p-4">
          <SkeletonBlock className="aspect-[3/2] w-full rounded-xl" />
          <SkeletonBlock className="mt-5 h-5 w-2/3" />
          <SkeletonBlock className="mt-3 h-4 w-full" />
          <SkeletonBlock className="mt-2 h-4 w-4/5" />
          <SkeletonBlock className="mt-5 h-10 w-32 rounded-full bg-[#dfe9e2]" />
        </div>
      ))}
    </div>
  );
}

export function PageLoadingSkeleton({
  variant = "collection",
  showHeader = true,
}: {
  variant?: SkeletonVariant;
  showHeader?: boolean;
}) {
  return (
    <div role="status" aria-busy="true" className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <span className="sr-only">Loading page</span>
      {showHeader && <HeaderSkeleton />}
      <div aria-hidden="true" className="mx-auto max-w-[1680px] px-[clamp(1.1rem,4vw,5rem)] pb-20 pt-6 sm:pt-8">
        {variant !== "landing" && variant !== "welcome" && <BreadcrumbSkeleton />}

        {variant === "landing" && (
          <>
            <section className="grid min-h-[360px] items-center gap-8 rounded-3xl bg-[#123f34] p-8 sm:p-12 lg:min-h-[470px] lg:grid-cols-2">
              <div>
                <SkeletonBlock className="h-5 w-40 bg-white/20" />
                <SkeletonBlock className="mt-6 h-14 w-full max-w-xl bg-white/25 sm:h-20" />
                <SkeletonBlock className="mt-3 h-14 w-4/5 max-w-lg bg-white/20 sm:h-20" />
                <SkeletonBlock className="mt-6 h-5 w-4/5 max-w-md bg-white/15" />
              </div>
              <SkeletonBlock className="hidden aspect-[4/3] w-full rounded-2xl bg-white/10 lg:block" />
            </section>
            <div className="mt-8"><CardGrid /></div>
          </>
        )}

        {variant === "welcome" && (
          <section className="mx-auto max-w-5xl py-8 sm:py-14">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="mt-5 h-12 w-full max-w-2xl sm:h-16" />
            <SkeletonBlock className="mt-4 h-5 w-full max-w-xl" />
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <SkeletonBlock className="h-52 rounded-3xl" />
              <SkeletonBlock className="h-52 rounded-3xl" />
            </div>
          </section>
        )}

        {variant === "conversation" && (
          <section className="mx-auto max-w-3xl py-4 sm:py-8">
            <SkeletonBlock className="h-2 w-full rounded-full" />
            <div className="mt-8 rounded-3xl border border-[#e4e9e4] bg-white p-6 sm:p-10">
              <SkeletonBlock className="h-4 w-36" />
              <SkeletonBlock className="mt-5 h-10 w-full max-w-2xl sm:h-12" />
              <SkeletonBlock className="mt-3 h-4 w-4/5 max-w-xl" />
              <div className="mt-8 grid gap-3">
                <SkeletonBlock className="h-14 w-full rounded-xl" />
                <SkeletonBlock className="h-14 w-full rounded-xl" />
                <SkeletonBlock className="h-14 w-full rounded-xl" />
              </div>
              <div className="mt-8 flex justify-between">
                <SkeletonBlock className="h-11 w-24 rounded-full" />
                <SkeletonBlock className="h-11 w-32 rounded-full bg-[#dfe9e2]" />
              </div>
            </div>
          </section>
        )}

        {variant === "summary" && (
          <section className="mx-auto max-w-4xl py-4 sm:py-8">
            <SkeletonBlock className="h-12 w-full max-w-lg sm:h-14" />
            <SkeletonBlock className="mt-4 h-5 w-full max-w-2xl" />
            <div className="mt-8 grid gap-4">
              <SkeletonBlock className="h-32 rounded-2xl" />
              <SkeletonBlock className="h-32 rounded-2xl" />
              <SkeletonBlock className="h-32 rounded-2xl" />
            </div>
          </section>
        )}

        {variant === "form" && (
          <section className="mx-auto max-w-6xl py-4 sm:py-8">
            <SkeletonBlock className="h-12 w-full max-w-2xl sm:h-16" />
            <SkeletonBlock className="mt-4 h-5 w-full max-w-xl" />
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <SkeletonBlock className="h-64 rounded-2xl" />
              <SkeletonBlock className="h-64 rounded-2xl" />
            </div>
            <SkeletonBlock className="mt-6 h-12 w-40 rounded-full bg-[#dfe9e2]" />
          </section>
        )}

        {variant === "results" && (
          <>
            <section className="rounded-3xl bg-[#123f34] p-7 sm:p-10">
              <SkeletonBlock className="h-12 w-full max-w-2xl bg-white/20 sm:h-16" />
              <SkeletonBlock className="mt-4 h-5 w-full max-w-xl bg-white/15" />
              <SkeletonBlock className="mt-6 h-10 w-56 rounded-full bg-white/15" />
            </section>
            <div className="mt-8"><CardGrid count={4} /></div>
          </>
        )}

        {variant === "explore" && (
          <>
            <section className="grid gap-8 pb-10 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
              <div>
                <SkeletonBlock className="h-14 w-full max-w-xl sm:h-20" />
                <SkeletonBlock className="mt-4 h-5 w-full max-w-lg" />
              </div>
              <SkeletonBlock className="h-28 rounded-2xl" />
            </section>
            <section className="rounded-3xl bg-[#eaf2ed] p-6 sm:p-8">
              <SkeletonBlock className="h-4 w-40 bg-[#d7e5dc]" />
              <SkeletonBlock className="mt-4 h-9 w-2/3 max-w-md bg-[#d7e5dc]" />
              <SkeletonBlock className="mt-4 h-4 w-full max-w-2xl bg-[#d7e5dc]" />
              <div className="mt-6"><CardGrid /></div>
            </section>
          </>
        )}

        {variant === "collection" && (
          <>
            <section className="pb-8">
              <SkeletonBlock className="h-12 w-full max-w-2xl sm:h-16" />
              <SkeletonBlock className="mt-4 h-5 w-full max-w-xl" />
            </section>
            <SkeletonBlock className="mb-6 h-14 w-full rounded-2xl" />
            <CardGrid count={6} />
          </>
        )}

        {variant === "detail" && (
          <>
            <section className="grid gap-8 pb-10 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
              <div>
                <SkeletonBlock className="h-12 w-full max-w-2xl sm:h-16" />
                <SkeletonBlock className="mt-4 h-5 w-full max-w-lg" />
              </div>
              <SkeletonBlock className="h-48 rounded-2xl" />
            </section>
            <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
              <SkeletonBlock className="h-72 rounded-2xl" />
              <SkeletonBlock className="h-72 rounded-2xl" />
            </div>
          </>
        )}

      </div>
    </div>
  );
}
