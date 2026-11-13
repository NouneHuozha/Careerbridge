import type { ReactNode } from "react";
import { Suspense } from "react";
import { StudentNavigation } from "./student-navigation";

export default function ExploreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense
        fallback={
          <div
            aria-hidden="true"
            className="border-b border-[#e5e9e5] bg-white"
          >
            <div className="mx-auto flex h-[68px] max-w-[1680px] items-center justify-between gap-6 px-[clamp(1.1rem,4vw,5rem)] lg:h-[76px]">
              <span className="h-5 w-36 animate-pulse rounded bg-[#dfe9e2] motion-reduce:animate-none" />
              <div className="hidden items-center gap-8 lg:flex">
                <span className="h-4 w-16 animate-pulse rounded bg-[#e4e9e5] motion-reduce:animate-none" />
                <span className="h-4 w-14 animate-pulse rounded bg-[#e4e9e5] motion-reduce:animate-none" />
                <span className="h-4 w-24 animate-pulse rounded bg-[#e4e9e5] motion-reduce:animate-none" />
              </div>
              <span className="h-10 w-10 animate-pulse rounded-full bg-[#dfe9e2] motion-reduce:animate-none" />
            </div>
          </div>
        }
      >
        <StudentNavigation />
      </Suspense>
      <div id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </div>
    </>
  );
}