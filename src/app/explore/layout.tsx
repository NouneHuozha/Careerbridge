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
            className="h-[68px] border-b border-[#e5e9e5] bg-white lg:h-[76px]"
          />
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