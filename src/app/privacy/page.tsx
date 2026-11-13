import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../site-header";

export const metadata: Metadata = {
  title: "Privacy Notice | CareerBridge",
  description: "How CareerBridge handles guest and account exploration data.",
};

const sections = [
  {
    title: "Explore as a guest",
    paragraphs: [
      "You can browse public CareerBridge pages without an account. When you use features that remember your choices, such as Guided Explorer, your study stage, Saved items and meaningful detail-page history, guest data is kept in this tab's session storage.",
      "Session storage is scoped to a browser tab and is normally cleared when that tab is closed. Browser session restore or clearing site data can change how long it remains. Search filters and ordinary browsing clicks are not saved as exploration history.",
    ],
  },
  {
    title: "When you sign in",
    paragraphs: [
      "An account stores the name and email address you provide, a password hash (not your plain-text password), saved items, meaningful exploration history, your study stage, Discovery choices and Guided Explorer progress. This supports sign-in and lets you access supported progress across visits and devices.",
      "Your sign-in session is held in a secure, HTTP-only browser cookie and expires after 30 days. Account information remains in the configured CareerBridge database until you delete your account.",
    ],
  },
  {
    title: "Guest-to-account transfer",
    paragraphs: [
      "After you sign in or create an account in a tab containing guest exploration data, CareerBridge asks whether to add that data to your account. Nothing is transferred until you choose to keep it. Choosing not to transfer leaves existing account information unchanged.",
      "If you started signing in while saving an item, CareerBridge completes that requested save after successful authentication.",
    ],
  },
  {
    title: "Your choices and deletion",
    paragraphs: [
      "You can remove saved items and history entries, clear your history, and delete Guided Explorer progress. Use Delete account in your profile menu to permanently delete your account, its saved items, history, progress and active sign-in sessions. Account deletion requires your password and cannot be undone.",
      "Deletion removes the live account records managed by CareerBridge. Any retention in infrastructure backups is governed by the database and hosting operator's backup practices.",
    ],
  },
  {
    title: "Students under 18",
    paragraphs: [
      "If you are under 18, a parent or guardian should review this notice and agree before you create an account. The sign-up checkbox records a self-reported confirmation; CareerBridge does not independently verify guardian approval. This implementation does not provide verified parental-consent or age-verification services.",
    ],
  },
  {
    title: "Important information",
    paragraphs: [
      "CareerBridge provides education exploration information, not admission, scholarship or employment decisions. Verify current eligibility, dates, fees and requirements with the relevant official institution or authority.",
      "Account storage depends on the PostgreSQL database configured by the CareerBridge operator. If account services are unavailable, changes may remain temporarily in the current tab and will be clearly identified as not yet synced.",
      "Email verification and password recovery are not currently available. Use an email address you can access and keep your password safe.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
        <div className="cb-container pb-20 pt-10 sm:pt-16">
          <nav aria-label="Breadcrumb" className="text-sm text-[#718078]">
            <Link href="/" className="hover:text-[#145543] hover:underline">Home</Link>
            <span aria-hidden="true" className="px-2">/</span>
            <span aria-current="page" className="text-[#18352d]">Privacy Notice</span>
          </nav>
          <header className="mt-10 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#28614f]">
              Your information
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight tracking-[-.045em] sm:text-6xl">
              Privacy Notice
            </h1>
            <p className="mt-4 text-base leading-7 text-[#59665e] sm:text-lg">
              This notice explains what CareerBridge keeps while you explore as a guest and what changes when you create an account.
            </p>
            <p className="mt-3 text-xs text-[#718078]">Last updated: 13 November 2026</p>
          </header>

          <div className="mt-10 grid gap-5">
            {sections.map((section, index) => (
              <section key={section.title} className="rounded-3xl border border-[#dce7df] bg-white p-5 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#52715f]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-semibold tracking-[-.03em]">
                  {section.title}
                </h2>
                <div className="mt-3 max-w-3xl space-y-3 text-sm leading-6 text-[#52645a] sm:text-base">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="inline-flex min-h-11 items-center rounded-full bg-[#145543] px-5 text-sm font-semibold text-white hover:bg-[#0f4537]"
            >
              Create an account
            </Link>
            <Link
              href="/explore"
              className="inline-flex min-h-11 items-center rounded-full border border-[#cbd9cf] px-5 text-sm font-semibold text-[#315345] hover:bg-[#eaf2ed]"
            >
              Continue as a guest
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
