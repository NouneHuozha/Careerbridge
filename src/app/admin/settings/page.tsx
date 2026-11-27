import Link from "next/link";
import { ArrowRight, SlidersHorizontal, UserRound } from "lucide-react";
import { AdminPageHeader } from "../admin-ui";

const settingsSections = [
  {
    href: "/admin/settings/account",
    title: "Admin Account",
    description: "Your account details and access information.",
    icon: UserRound,
  },
  {
    href: "/admin/settings/preferences",
    title: "Workspace Preferences",
    description: "Personal preferences for using the Admin panel.",
    icon: SlidersHorizontal,
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-6">
      <AdminPageHeader
        eyebrow="Admin / Settings"
        title="Settings"
        description="Manage your account and personal workspace preferences."
      />

      <section
        aria-label="Settings sections"
        className="overflow-hidden rounded-xl border border-[#dce5e0] bg-white shadow-[0_1px_2px_rgba(23,54,74,0.04)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7ede9] px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-[#17364a]">Settings</h2>
            <p className="mt-1 text-sm text-[#657976]">
              Choose the part of your Admin workspace to manage.
            </p>
          </div>
          <span className="inline-flex min-h-7 items-center rounded-full border border-[#cfe3da] bg-[#edf6f1] px-2.5 text-[11px] font-semibold text-[#286c60]">
            Admin
          </span>
        </div>
        <ul className="divide-y divide-[#e7ede9]">
          {settingsSections.map(({ href, title, description, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex min-h-20 items-center gap-4 px-5 py-4 transition-colors hover:bg-[#f8faf8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#377b78] sm:px-6"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#edf3f7] text-[#496b85]">
                  <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[#17364a]">{title}</span>
                  <span className="mt-1 block text-sm leading-5 text-[#657976]">{description}</span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-[#71817d] transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
