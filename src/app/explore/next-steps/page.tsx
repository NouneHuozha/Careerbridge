import type { Metadata } from "next";
import { Breadcrumbs } from "../../breadcrumbs";

export const metadata: Metadata = {
  title: "My Next Steps | CareerBridge",
  description: "View the actions and follow-ups you want to keep moving on.",
};

export default function NextStepsPage() {
  return (
    <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <Breadcrumbs
        items={[{ label: "Explore", href: "/explore" }, { label: "My Next Steps" }]}
        className="pt-5 sm:pt-7"
      />
      <div className="cb-container py-8 sm:py-10">
        <section className="rounded-3xl border border-[#dce7df] bg-white p-6 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[.12em] text-[#52715f]">
            My Next Steps
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-.045em] sm:text-5xl">
            Your follow-up list
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#59665e] sm:text-lg">
            Keep track of the actions, applications and plans you want to revisit.
          </p>
        </section>
      </div>
    </main>
  );
}
