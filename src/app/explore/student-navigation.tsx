"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, ChevronDown, ChevronRight, CircleHelp, Compass, ListChecks, Menu, UserRound, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useEducationStage } from "../education-stage";

const navigationItems: {
  label: string;
  href?: string;
  section: string;
  icon: LucideIcon;
}[] = [
  { label: "Explore", href: "/explore", section: "guidance", icon: Compass },
  { label: "Saved", section: "explorations", icon: Bookmark },
  { label: "My Next Steps", section: "library", icon: ListChecks },
];

export function StudentNavigation() {
  const pathname = usePathname();
  const education = useEducationStage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const currentSection = pathname === "/explore"
    ? "guidance"
    : pathname.startsWith("/counselling/summary")
      ? "explorations"
      : "library";
  const stageLabel =
    education.status === "saved"
      ? education.stage === "class-10"
        ? "Class 10"
        : "Class 12"
      : "Study stage not set";

  useEffect(() => {
    if (!mobileOpen && !profileOpen && !helpOpen) return;

    function closeOutside(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMobileOpen(false);
        setProfileOpen(false);
        setHelpOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setProfileOpen(false);
        setHelpOpen(false);
        (mobileOpen ? menuButtonRef : profileButtonRef).current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [helpOpen, mobileOpen, profileOpen]);

  function closeMenus() {
    setMobileOpen(false);
    setProfileOpen(false);
    setHelpOpen(false);
  }

  function renderNavigationItems(mobile = false) {
    return navigationItems.map((item) => {
      const active = Boolean(item.href) && item.section === currentSection;
      const Icon = item.icon;
      const className = `relative inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-[color,background-color,box-shadow] duration-150 ${
        mobile ? "w-full justify-start" : "justify-center"
      } ${
        active
          ? "bg-white text-[#175b48] shadow-[0_1px_4px_rgba(27,65,52,0.12)] ring-1 ring-[#e6ece7]"
          : item.href
            ? mobile
              ? "text-[#4c5e55] hover:bg-[#f0f4f1] hover:text-[#173f32]"
              : "text-[#59675f] hover:bg-white/80 hover:text-[#173f32]"
            : "cursor-not-allowed text-[#77857d]"
      }`;

      if (!item.href) {
        return (
          <span
            key={item.label}
            aria-disabled="true"
            title={`${item.label} is not available yet`}
            className={className}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {item.label}
            <span className="ml-auto text-[11px] font-medium text-[#7b8981]">Soon</span>
          </span>
        );
      }

      return (
        <Link
          key={item.label}
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={closeMenus}
          className={`${className} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72]`}
        >
          {Icon && <Icon aria-hidden="true" className="h-4 w-4" />}
          {item.label}
        </Link>
      );
    });
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-[#e5e9e5] bg-white text-[#244438]"
    >
      <a
        href="#main-content"
        className="sr-only rounded-md bg-white px-4 py-2 font-semibold text-[#173f32] focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-[60]"
      >
        Skip to content
      </a>
      <div className="mx-auto grid min-h-[68px] w-full grid-cols-[1fr_auto] items-center gap-3 px-[clamp(1.1rem,4vw,5rem)] lg:min-h-[76px] lg:grid-cols-[1fr_auto_1fr]">
        <Link
          href="/explore"
          aria-label="CareerBridge Explore home"
          onClick={closeMenus}
          className="flex shrink-0 items-center gap-2.5 justify-self-start rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3d8b72]"
        >
          <Image
            src="/logo.png"
            alt=""
            width={57}
            height={42}
            priority
            className="h-10 w-auto object-contain"
          />
          <span className="whitespace-nowrap font-serif text-[21px] font-extrabold tracking-[-0.02em] text-[#145543]">
            CareerBridge
          </span>
        </Link>

        <nav
          aria-label="Student navigation"
          className="hidden items-center rounded-full border border-[#e9ede9] bg-[#f6f8f6] p-1 lg:flex"
        >
          {renderNavigationItems()}
          <div className="relative">
            <button
              type="button"
              aria-expanded={helpOpen}
              aria-controls="student-help-menu"
              onClick={() => {
                setHelpOpen((open) => !open);
                setProfileOpen(false);
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[#46584e] transition-colors duration-150 hover:bg-white/80 hover:text-[#173f32] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72] sm:px-4"
            >
              <CircleHelp aria-hidden="true" className="h-4 w-4" />
              Help
            </button>
            {helpOpen && <HelpMenu id="student-help-menu" />}
          </div>
        </nav>

        <div className="relative hidden justify-self-end lg:block">
          <button
            ref={profileButtonRef}
            type="button"
            aria-label="Open student profile"
            aria-expanded={profileOpen}
            aria-controls="student-profile-menu"
            onClick={() => {
              setProfileOpen((open) => !open);
              setHelpOpen(false);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-transparent px-3 text-sm font-semibold text-[#40564b] transition-colors duration-150 hover:border-[#e7ece8] hover:bg-[#f7f9f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e7f2eb] text-[#34765f]">
              <UserRound aria-hidden="true" className="h-4 w-4" />
            </span>
            Profile
            <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
          {profileOpen && (
            <ProfileMenu id="student-profile-menu" stageLabel={stageLabel} />
          )}
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="student-mobile-menu"
          onClick={() => {
            setMobileOpen((open) => !open);
            setProfileOpen(false);
            setHelpOpen(false);
          }}
          className="inline-flex min-h-11 items-center gap-2 justify-self-end rounded-full px-3 text-sm font-semibold text-[#40564b] transition-colors hover:bg-[#f3f6f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72] lg:hidden"
        >
          {mobileOpen ? (
            <X aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Menu aria-hidden="true" className="h-4 w-4" />
          )}
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      {mobileOpen && (
        <nav
          id="student-mobile-menu"
          aria-label="Student navigation"
          className="absolute left-0 right-0 top-full z-50 border-t border-[#e9ede9] bg-white px-4 py-3 shadow-[0_16px_32px_rgba(27,65,52,0.12)] lg:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {renderNavigationItems(true)}
            <button
              type="button"
              aria-expanded={helpOpen}
              aria-controls="student-mobile-help-menu"
              onClick={() => {
                setHelpOpen((open) => !open);
                setProfileOpen(false);
              }}
              className="flex min-h-10 w-full items-center gap-2 rounded-full px-3 text-left text-sm font-medium text-[#59675f] hover:bg-[#f0f4f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72]"
            >
              <CircleHelp aria-hidden="true" className="h-4 w-4" />
              Help
            </button>
            {helpOpen && <HelpMenu id="student-mobile-help-menu" mobile />}
            <div className="relative">
              <button
                type="button"
                aria-expanded={profileOpen}
                aria-controls="student-mobile-profile-menu"
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setHelpOpen(false);
                }}
                className="flex min-h-10 w-full items-center gap-2 rounded-full px-3 text-left text-sm font-medium text-[#59675f] hover:bg-[#f0f4f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72]"
              >
                <UserRound aria-hidden="true" className="h-4 w-4" />
                Profile
              </button>
              {profileOpen && (
                <ProfileMenu
                  id="student-mobile-profile-menu"
                  stageLabel={stageLabel}
                  mobile
                />
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

function HelpMenu({ id, mobile = false }: { id: string; mobile?: boolean }) {
  return (
    <div
      id={id}
      className={`z-50 rounded-xl border border-[#e3e9e4] bg-white p-4 text-[#254638] shadow-[0_12px_32px_rgba(27,65,52,0.14)] ${
        mobile ? "mx-3" : "absolute left-1/2 top-full mt-2 w-72 -translate-x-1/2"
      }`}
    >
      <p className="text-sm font-semibold">Need a place to start?</p>
      <p className="mt-1 text-xs leading-5 text-[#59675f]">
        Guided Explorer can help you reflect on what interests you and review your answers later.
      </p>
      <Link
        href="/counselling"
        className="mt-3 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-[#17664e] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72]"
      >
        Open Guided Explorer <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}

function ProfileMenu({
  id,
  stageLabel,
  mobile = false,
}: {
  id: string;
  stageLabel: string;
  mobile?: boolean;
}) {
  return (
    <div
      id={id}
      className={`z-50 rounded-xl border border-[#e3e9e4] bg-white p-2 text-[#254638] shadow-[0_12px_32px_rgba(27,65,52,0.14)] ${
        mobile
          ? "absolute left-0 top-full mt-2 max-h-[calc(100dvh-7rem)] w-full overflow-y-auto"
          : "absolute right-0 top-full mt-2 w-64"
      }`}
    >
      <div className="rounded-lg bg-[#f3f7f3] px-3 py-3">
        <p className="text-sm font-semibold">Student profile</p>
        <p className="mt-1 text-xs text-[#59675f]">{stageLabel}</p>
      </div>
      <div className="mt-1 grid">
        <ProfileMenuItem label="My Profile" />
        <ProfileMenuItem label="Exploration History" />
        <ProfileMenuItem label="Manage My Exploration" />
        <ProfileMenuItem label="Settings" />
      </div>
      <div className="mt-1 border-t border-[#e7ece8] pt-1">
        <ProfileMenuItem label="Sign out" />
      </div>
    </div>
  );
}

function ProfileMenuItem({ label }: { label: string }) {
  return (
    <span
      aria-disabled="true"
      title={`${label} is not available yet`}
      className="flex min-h-10 items-center justify-between rounded-lg px-3 text-sm font-medium text-[#718078]"
    >
      {label}
      <span className="text-xs font-normal text-[#8a9790]">Soon</span>
    </span>
  );
}