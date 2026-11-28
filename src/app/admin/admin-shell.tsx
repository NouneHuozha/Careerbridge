"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpenCheck,
  ClipboardCheck,
  Database,
  Files,
  History,
  LayoutDashboard,
  Menu,
  Settings,
  Upload,
  X,
} from "lucide-react";
import { AdminWorkspacePreferencesProvider } from "./workspace-preferences-provider";

const navigationSections = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard, enabled: true },
      { label: "Catalogue", href: "/admin/catalogue", icon: Files, enabled: true },
      { label: "Data Intake", href: "/admin/data-intake", icon: Upload, enabled: true, subitems: [
        { label: "Overview", href: "/admin/data-intake" },
        { label: "Automated collection", href: "/admin/data-intake/automated" },
        { label: "Excel / CSV import", href: "/admin/data-intake/import" },
        { label: "Manual entry", href: "/admin/data-intake/manual" },
        { label: "Intake history & jobs", href: "/admin/data-intake/history" },
      ] },
      { label: "Review queue", href: "/admin/review", icon: ClipboardCheck, enabled: true },
      { label: "Sources", href: "/admin/sources", icon: Database, enabled: true },
      { label: "Audit history", href: "/admin/audit", icon: History, enabled: true },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", href: "/admin/settings", icon: Settings, enabled: true }],
  },
];

const catalogueCategoryLabels: Record<string, string> = {
  fields: "Fields",
  courses: "Courses",
  institutions: "Institutions",
  campuses: "Campuses",
  "course-offerings": "Course offerings",
  pathways: "Pathways",
  examinations: "Examinations",
  scholarships: "Scholarships",
};

const cataloguePageLabels: Record<string, string> = {
  edit: "Edit revision",
  review: "Review workspace",
  compare: "Compare revisions",
  activity: "Activity history",
};

type AdminNavProps = {
  pathname: string;
  onNavigate?: () => void;
};

function isReviewRoute(pathname: string) {
  return (
    pathname === "/admin/review" ||
    pathname.startsWith("/admin/review/") ||
    (pathname.startsWith("/admin/catalogue/") && pathname.endsWith("/review"))
  );
}

function isDataIntakeRoute(pathname: string) {
  return pathname === "/admin/data-intake" || pathname.startsWith("/admin/data-intake/");
}

function getDataIntakeCrumbs(pathname: string): Array<{ label: string; href?: string }> {
  const segments = pathname.split("/").filter(Boolean).slice(2);
  if (segments.length === 0) return [];
  if (segments[0] === "automated") {
    const labels: Record<string, string> = {
      new: "New collection",
      discovery: "Source discovery",
      configuration: "Collection configuration",
      schedules: "Schedules",
      fetched: "Fetched content",
      extracted: "Extracted information",
      changes: "Change detection",
      history: "Collection history",
      failures: "Failed fetches",
      rules: "Collection rules",
      runs: "Collection run",
      jobs: "Job details",
    };
    return segments[1]
      ? [{ label: "Automated collection", href: "/admin/data-intake/automated" }, { label: segments[1] === "schedules" && segments[2] === "calendar" ? "Schedule calendar" : labels[segments[1]] ?? formatRouteSegment(segments[1]) }]
      : [{ label: "Automated collection" }];
  }
  if (segments[0] === "import") return [{ label: "Spreadsheet import" }];
  if (segments[0] === "manual") {
    return segments[1]
      ? [{ label: "Manual entry", href: "/admin/data-intake/manual" }, { label: formatRouteSegment(segments[1]) }]
      : [{ label: "Manual entry" }];
  }
  if (segments[0] === "history") {
    return segments[1]
      ? [{ label: "Intake history", href: "/admin/data-intake/history" }, { label: "Job details" }]
      : [{ label: "Intake history" }];
  }
  return [{ label: formatRouteSegment(segments[0]) }];
}

function getDataIntakePageTitle(pathname: string) {
  const crumbs = getDataIntakeCrumbs(pathname);
  return crumbs.length === 0 ? "Data intake" : crumbs[crumbs.length - 1].label;
}

function isSourcesRoute(pathname: string) {
  return pathname === "/admin/sources" || pathname.startsWith("/admin/sources/");
}

function isAuditRoute(pathname: string) {
  return pathname === "/admin/audit" || pathname.startsWith("/admin/audit/");
}

function isSettingsRoute(pathname: string) {
  return pathname === "/admin/settings" || pathname.startsWith("/admin/settings/");
}

function getSettingsPageTitle(pathname: string) {
  if (pathname.startsWith("/admin/settings/account")) return "Admin Account";
  if (pathname.startsWith("/admin/settings/preferences")) return "Workspace Preferences";
  return "Settings";
}

function getAuditPageTitle(pathname: string) {
  return pathname === "/admin/audit" ? "Audit history" : "Event details";
}

function formatRouteSegment(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSourcePageTitle(pathname: string) {
  const segments = pathname.split("/").filter(Boolean).slice(2);
  if (segments.length === 0) return "Sources";
  if (segments[0] === "new") return "Register source";
  if (segments[0] === "maintenance") return "Source maintenance";
  if (segments[1] === "edit") return "Edit source";
  if (segments[1] === "history") {
    return segments.length > 2 ? "Check attempt details" : "Source check history";
  }
  return formatRouteSegment(segments[0]);
}

function isNavigationItemActive(label: string, href: string, pathname: string) {
  if (label === "Review queue") return isReviewRoute(pathname);
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <Link href="/admin" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-[#377b78]">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white">
        <Image src="/logo.png" alt="" width={32} height={26} className="object-contain" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-semibold tracking-[-0.02em] text-white">
          CareerBridge
        </span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b8d0d1]">
          Admin panel
        </span>
      </span>
    </Link>
  );
}

function AdminNavigation({ pathname, onNavigate }: AdminNavProps) {
  return (
    <nav aria-label="Admin navigation" className="space-y-7">
      {navigationSections.map((section) => (
        <div key={section.label}>
          <h2 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#a9c2c6]">
            {section.label}
          </h2>
          <ul className="space-y-1">
            {section.items.map(({ label, href, icon: Icon, enabled, subitems }) => {
              const active = isNavigationItemActive(label, href, pathname);
              const disabled = !enabled;
              const itemClassName = `flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors duration-150 ${
                active
                  ? "bg-white/12 text-white ring-1 ring-inset ring-white/10"
                  : disabled
                    ? "text-[#c0d0d2]/75"
                    : "text-[#dce7e7] hover:bg-white/8 hover:text-white"
              }`;

              return (
                <li key={href}>
                  {disabled ? (
                    <button
                      type="button"
                      disabled
                      title={`${label} will be available in a later phase`}
                      className={itemClassName}
                    >
                      <Icon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.8} />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-[#a9c2c6]">
                        Soon
                      </span>
                    </button>
                  ) : (
                    <>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        onClick={onNavigate}
                        className={itemClassName}
                      >
                        <Icon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.8} />
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                      </Link>
                      {subitems && pathname.startsWith(href) ? (
                        <ul className="mt-1 space-y-1 border-l border-white/10 pl-3">
                          {subitems.map((subitem) => {
                            const subActive =
                              subitem.href === "/admin/data-intake"
                                ? pathname === subitem.href
                                : pathname === subitem.href || pathname.startsWith(`${subitem.href}/`);
                            return (
                              <li key={subitem.href}>
                                <Link
                                  href={subitem.href}
                                  aria-current={subActive ? "page" : undefined}
                                  onClick={onNavigate}
                                  className={`block rounded-md px-3 py-2 text-sm ${
                                    subActive
                                      ? "bg-white/10 text-white"
                                      : "text-[#c7d7d8] hover:bg-white/6 hover:text-white"
                                  }`}
                                >
                                  {subitem.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ShellBadge({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold leading-none ${className}`}>
      {children}
    </span>
  );
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const activeItem = navigationSections
    .flatMap((section) => section.items)
    .find(({ label, href }) => isNavigationItemActive(label, href, pathname));
  const routeSegments = pathname.split("/").filter(Boolean);
  const isCatalogueRoute = routeSegments[1] === "catalogue";
  const isReviewPage = isReviewRoute(pathname);
  const isDataIntakePage = isDataIntakeRoute(pathname);
  const isSourcesPage = isSourcesRoute(pathname);
  const isAuditPage = isAuditRoute(pathname);
  const isSettingsPage = isSettingsRoute(pathname);
  const categorySlug = isCatalogueRoute ? routeSegments[2] : undefined;
  const categoryLabel = categorySlug
    ? catalogueCategoryLabels[categorySlug] ?? "Catalogue"
    : undefined;
  const recordId = categoryLabel ? routeSegments[3] : undefined;
  const subPage = recordId ? routeSegments[4] : undefined;
  const pageTitle = isReviewPage
    ? pathname === "/admin/review"
      ? "Review queue"
      : "Claim review"
    : isDataIntakePage
      ? getDataIntakePageTitle(pathname)
      : isAuditPage
      ? getAuditPageTitle(pathname)
      : isSourcesPage
      ? getSourcePageTitle(pathname)
      : isSettingsPage
      ? getSettingsPageTitle(pathname)
      : (subPage ? cataloguePageLabels[subPage] : undefined) ??
      (recordId ? recordId : categoryLabel) ??
      activeItem?.label ??
      "Overview";

  return (
    <AdminWorkspacePreferencesProvider>
      <div className="min-h-svh bg-[#f3f6f4] text-[#17364a]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col border-r border-white/10 bg-[#153647] text-white lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <Brand />
        </div>
        <div className="px-4 pt-6">
          <ShellBadge className="border-white/15 bg-white/8 text-[#dce9e8]">
            Administrator workspace
          </ShellBadge>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-7">
          <AdminNavigation pathname={pathname} />
        </div>
        <div className="border-t border-white/10 p-4">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#dce7e7] transition-colors hover:bg-white/8 hover:text-white"
          >
            <ArrowUpRight aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
            Back to CareerBridge
          </Link>
        </div>
      </aside>

      <div className="lg:pl-[17rem]">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#153647] text-white lg:hidden">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <Brand />
            <button
              type="button"
              aria-controls="admin-mobile-navigation"
              aria-expanded={mobileNavigationOpen}
              aria-label={mobileNavigationOpen ? "Close admin navigation" : "Open admin navigation"}
              onClick={() => setMobileNavigationOpen((open) => !open)}
              className="grid size-11 shrink-0 place-items-center rounded-lg border border-white/20 text-white transition-colors hover:bg-white/10 focus-visible:outline-[#9ac7bb]"
            >
              {mobileNavigationOpen ? (
                <X aria-hidden="true" className="size-5" />
              ) : (
                <Menu aria-hidden="true" className="size-5" />
              )}
            </button>
          </div>
          <div
            id="admin-mobile-navigation"
            hidden={!mobileNavigationOpen}
            className="max-h-[calc(100svh-4rem)] overflow-y-auto border-t border-[#e4eae6] bg-[#153647] px-4 py-5 text-white sm:px-6"
          >
            <div className="mb-5">
              <ShellBadge className="border-white/15 bg-white/8 text-[#dce9e8]">
                Administrator workspace
              </ShellBadge>
            </div>
            <AdminNavigation
              pathname={pathname}
              onNavigate={() => setMobileNavigationOpen(false)}
            />
            <Link
              href="/"
              onClick={() => setMobileNavigationOpen(false)}
              className="mt-6 flex min-h-11 items-center gap-3 border-t border-white/10 px-3 pt-4 text-sm font-medium text-[#dce7e7]"
            >
              <ArrowUpRight aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
              Back to CareerBridge
            </Link>
          </div>
        </header>

        <header className="sticky top-0 z-30 hidden h-[4.25rem] items-center justify-between border-b border-[#dfe7e3] bg-white/95 px-7 backdrop-blur lg:flex xl:px-9">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
            <span className="text-[#71817d]">Workspace</span>
            <span aria-hidden="true" className="text-[#9aa9a5]">/</span>
            {isReviewPage ? (
              <>
                <Link
                  href="/admin/review"
                  aria-current={pathname === "/admin/review" ? "page" : undefined}
                  className={pathname === "/admin/review" ? "font-semibold text-[#17364a]" : "text-[#71817d] transition-colors hover:text-[#17364a]"}
                >
                  Review queue
                </Link>
                {pathname !== "/admin/review" && (
                  <>
                    <span aria-hidden="true" className="text-[#9aa9a5]">/</span>
                    <span aria-current="page" className="font-semibold text-[#17364a]">
                      Claim review
                    </span>
                  </>
                )}
              </>
            ) : isDataIntakePage ? (
              <>
                <Link
                  href="/admin/data-intake"
                  aria-current={pathname === "/admin/data-intake" ? "page" : undefined}
                  className={pathname === "/admin/data-intake" ? "font-semibold text-[#17364a]" : "text-[#71817d] transition-colors hover:text-[#17364a]"}
                >
                  Data intake
                </Link>
                {getDataIntakeCrumbs(pathname).map((crumb, index) => (
                  <span key={`${crumb.label}-${index}`} className="contents">
                    <span aria-hidden="true" className="text-[#9aa9a5]">/</span>
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="text-[#71817d] transition-colors hover:text-[#17364a]"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current="page" className="font-semibold text-[#17364a]">
                        {crumb.label}
                      </span>
                    )}
                  </span>
                ))}
              </>
            ) : isAuditPage ? (
              <>
                <Link
                  href="/admin/audit"
                  aria-current={pathname === "/admin/audit" ? "page" : undefined}
                  className={pathname === "/admin/audit" ? "font-semibold text-[#17364a]" : "text-[#71817d] transition-colors hover:text-[#17364a]"}
                >
                  Audit History
                </Link>
                {pathname !== "/admin/audit" && (
                  <>
                    <span aria-hidden="true" className="text-[#9aa9a5]">/</span>
                    <span aria-current="page" className="font-semibold text-[#17364a]">
                      Event details
                    </span>
                  </>
                )}
              </>
            ) : isSourcesPage ? (
              <>
                <Link
                  href="/admin/sources"
                  aria-current={pathname === "/admin/sources" ? "page" : undefined}
                  className={pathname === "/admin/sources" ? "font-semibold text-[#17364a]" : "text-[#71817d] transition-colors hover:text-[#17364a]"}
                >
                  Sources
                </Link>
                {pathname !== "/admin/sources" && routeSegments[2] === "new" && (
                  <>
                    <span aria-hidden="true" className="text-[#9aa9a5]">/</span>
                    <span aria-current="page" className="font-semibold text-[#17364a]">
                      Register source
                    </span>
                  </>
                )}
                {pathname !== "/admin/sources" && routeSegments[2] === "maintenance" && (
                  <>
                    <span aria-hidden="true" className="text-[#9aa9a5]">/</span>
                    <span aria-current="page" className="font-semibold text-[#17364a]">
                      Maintenance
                    </span>
                  </>
                )}
                {routeSegments[2] &&
                  routeSegments[2] !== "new" &&
                  routeSegments[2] !== "maintenance" && (
                    <>
                      <span aria-hidden="true" className="text-[#9aa9a5]">/</span>
                      {routeSegments.length === 3 ? (
                        <span aria-current="page" className="max-w-56 truncate font-semibold text-[#17364a]">
                          {formatRouteSegment(routeSegments[2])}
                        </span>
                      ) : (
                        <Link
                          href={`/admin/sources/${routeSegments[2]}`}
                          className="max-w-56 truncate text-[#71817d] transition-colors hover:text-[#17364a]"
                        >
                          {formatRouteSegment(routeSegments[2])}
                        </Link>
                      )}
                      {routeSegments[3] && (
                        <>
                          <span aria-hidden="true" className="text-[#9aa9a5]">/</span>
                          {routeSegments[3] === "history" ? (
                            routeSegments[4] ? (
                              <>
                                <Link
                                  href={`/admin/sources/${routeSegments[2]}/history`}
                                  className="text-[#71817d] transition-colors hover:text-[#17364a]"
                                >
                                  Check history
                                </Link>
                                <span aria-hidden="true" className="text-[#9aa9a5]">/</span>
                                <span aria-current="page" className="font-semibold text-[#17364a]">
                                  Attempt
                                </span>
                              </>
                            ) : (
                              <span aria-current="page" className="font-semibold text-[#17364a]">
                                Check history
                              </span>
                            )
                          ) : (
                            <span aria-current="page" className="font-semibold text-[#17364a]">
                              Edit source
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
              </>
            ) : isSettingsPage ? (
              <>
                <Link
                  href="/admin/settings"
                  aria-current={pathname === "/admin/settings" ? "page" : undefined}
                  className={pathname === "/admin/settings" ? "font-semibold text-[#17364a]" : "text-[#71817d] transition-colors hover:text-[#17364a]"}
                >
                  Settings
                </Link>
                {pathname !== "/admin/settings" && (
                  <>
                    <span aria-hidden="true" className="text-[#9aa9a5]">/</span>
                    <span aria-current="page" className="font-semibold text-[#17364a]">
                      {getSettingsPageTitle(pathname)}
                    </span>
                  </>
                )}
              </>
            ) : isCatalogueRoute ? (
              <>
                <Link
                  href="/admin/catalogue"
                  className="text-[#71817d] transition-colors hover:text-[#17364a]"
                >
                  Catalogue
                </Link>
                {categoryLabel && (
                  <>
                    <span aria-hidden="true" className="text-[#9aa9a5]">/</span>
                    {recordId ? (
                      <Link
                        href={`/admin/catalogue/${categorySlug}`}
                        className="text-[#71817d] transition-colors hover:text-[#17364a]"
                      >
                        {categoryLabel}
                      </Link>
                    ) : (
                      <span aria-current="page" className="font-semibold text-[#17364a]">
                        {categoryLabel}
                      </span>
                    )}
                  </>
                )}
                {recordId && (
                  <>
                    <span aria-hidden="true" className="text-[#9aa9a5]">/</span>
                    {subPage ? (
                      <Link
                        href={`/admin/catalogue/${categorySlug}/${recordId}`}
                        className="max-w-48 truncate text-[#71817d] transition-colors hover:text-[#17364a]"
                      >
                        {recordId}
                      </Link>
                    ) : (
                      <span aria-current="page" className="max-w-48 truncate font-semibold text-[#17364a]">
                        {recordId}
                      </span>
                    )}
                  </>
                )}
                {subPage && (
                  <>
                    <span aria-hidden="true" className="text-[#9aa9a5]">/</span>
                    <span aria-current="page" className="font-semibold text-[#17364a]">
                      {cataloguePageLabels[subPage] ?? pageTitle}
                    </span>
                  </>
                )}
                {!categoryLabel && (
                  <>
                    <span aria-hidden="true" className="text-[#9aa9a5]">/</span>
                    <span aria-current="page" className="font-semibold text-[#17364a]">
                      Catalogue
                    </span>
                  </>
                )}
              </>
            ) : (
              <span aria-current="page" className="font-semibold text-[#17364a]">
                {pageTitle}
              </span>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[#627571] sm:inline">CareerBridge Admin</span>
            <ShellBadge className="border-[#cfe3da] bg-[#edf6f1] text-[#286c60]">
              <BookOpenCheck aria-hidden="true" className="size-3.5" />
              Admin
            </ShellBadge>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="w-full px-4 py-6 outline-none sm:px-6 sm:py-7 lg:px-7 lg:py-8 xl:px-9 2xl:px-11"
        >
          {children}
        </main>
      </div>
      </div>
    </AdminWorkspacePreferencesProvider>
  );
}
