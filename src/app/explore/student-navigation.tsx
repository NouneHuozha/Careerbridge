"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Check, ChevronDown, ChevronRight, CircleHelp, Compass, GraduationCap, ListChecks, LogOut, Mail, Menu, Pencil, UserRound, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  saveEducationStage,
  useEducationStage,
  type EducationStage,
} from "../education-stage";
import type { AuthUser } from "../auth-types";

const navigationItems: {
  label: string;
  href?: string;
  section: string;
  icon: LucideIcon;
}[] = [
  { label: "Explore", href: "/explore", section: "guidance", icon: Compass },
  { label: "Saved", href: "/explore/saved", section: "explorations", icon: Bookmark },
  { label: "My Next Steps", section: "library", icon: ListChecks },
];

type ProfilePreview = {
  name: string;
  email: string;
};

const defaultProfile: ProfilePreview = {
  name: "Student Name",
  email: "student@example.com",
};

export function StudentNavigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profilePreview, setProfilePreview] = useState<ProfilePreview>(defaultProfile);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authStatus, setAuthStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const headerRef = useRef<HTMLElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const currentSection = pathname === "/explore"
    ? "guidance"
    : pathname.startsWith("/explore/saved") || pathname.startsWith("/explore/history") || pathname.startsWith("/counselling/summary")
      ? "explorations"
      : "library";

  useEffect(() => {
    let active = true;
    async function syncProfile() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) throw new Error("Account service is unavailable.");
        const result = await response.json() as { user: AuthUser | null };
        if (!active) return;
        setAuthUser(result.user);
        if (result.user) {
          setProfilePreview({ name: result.user.name ?? "Student", email: result.user.email });
        } else {
          setProfilePreview(defaultProfile);
        }
        setAuthStatus("ready");
      } catch {
        if (active) setAuthStatus("unavailable");
      }
    }

    void syncProfile();
    window.addEventListener("focus", syncProfile);
    return () => {
      active = false;
      window.removeEventListener("focus", syncProfile);
    };
  }, []);

  async function signOutAccount() {
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST" });
      if (!response.ok) return false;
      setAuthUser(null);
      setProfilePreview(defaultProfile);
      setAuthStatus("ready");
      return true;
    } catch {
      return false;
    }
  }
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
            <ProfileMenu
              id="student-profile-menu"
              profile={profilePreview}
              onProfileChange={setProfilePreview}
              isAuthenticated={authUser !== null}
              authUnavailable={authStatus === "unavailable"}
              onSignOut={signOutAccount}
            />
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
                  profile={profilePreview}
                  onProfileChange={setProfilePreview}
                  isAuthenticated={authUser !== null}
                  authUnavailable={authStatus === "unavailable"}
                  onSignOut={signOutAccount}
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
  profile,
  onProfileChange,
  isAuthenticated,
  authUnavailable,
  onSignOut,
  mobile = false,
}: {
  id: string;
  profile: ProfilePreview;
  onProfileChange: (profile: ProfilePreview) => void;
  isAuthenticated: boolean;
  authUnavailable: boolean;
  onSignOut: () => Promise<boolean>;
  mobile?: boolean;
}) {
  const education = useEducationStage();
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [emailDraft, setEmailDraft] = useState(profile.email);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingStage, setEditingStage] = useState(false);
  const [stageDraft, setStageDraft] = useState<EducationStage | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const signOutDialogRef = useRef<HTMLDialogElement>(null);
  const stageLabel =
    education.status === "saved"
      ? education.stage === "class-10" ? "Class 10" : "Class 12"
      : education.status === "empty"
        ? "Not set yet"
        : education.status === "loading"
          ? "Loading..."
          : education.status === "invalid"
            ? "Couldn’t read stage"
            : "Unavailable";

  function openPersonalEditor() {
    setNameDraft(profile.name);
    setEmailDraft(profile.email);
    setError("");
    setMessage("");
    setEditingPersonal(true);
    setEditingStage(false);
  }

  function openStageEditor() {
    setStageDraft(education.status === "saved" ? education.stage : null);
    setError("");
    setMessage("");
    setEditingPersonal(false);
    setEditingStage(true);
  }

  function savePersonalPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onProfileChange({ name: nameDraft.trim(), email: emailDraft.trim() });
    setEditingPersonal(false);
    setMessage("Preview updated for this visit only; it isn’t saved to an account.");
  }

  function saveStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stageDraft) {
      setError("Choose a study stage to continue.");
      return;
    }
    if (!saveEducationStage(stageDraft)) {
      setError("Your study stage couldn’t be updated in this browser. Check your storage settings and try again.");
      return;
    }
    setEditingStage(false);
    setError("");
    setMessage("Study stage updated. Your other exploration information is unchanged.");
  }

  return (
    <div
      id={id}
      className={`z-50 rounded-xl border border-[#e3e9e4] bg-white p-2 text-[#254638] shadow-[0_12px_32px_rgba(27,65,52,0.14)] ${
        mobile
          ? "absolute left-0 top-full mt-2 max-h-[calc(100dvh-20rem)] w-full overflow-y-auto"
          : "absolute right-0 top-full mt-2 max-h-[calc(100dvh-6rem)] w-80 overflow-y-auto"
      }`}
    >
      <div className="rounded-lg bg-[#f3f7f3] p-3">
        <p className="text-sm font-semibold">My Profile</p>
        <div className="mt-3 flex items-center gap-3">
          <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#dcebe1] font-serif text-lg font-semibold text-[#145543]">
            {profile.name.trim().charAt(0).toUpperCase() || "S"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile.name}</p>
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs text-[#59675f]">
              <Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{profile.email}</span>
            </p>
          </div>
        </div>
        <p className="mt-2 text-[11px] font-medium text-[#735b23]">
          {isAuthenticated ? "CareerBridge account" : "Sample details · Not connected to an account"}
        </p>
        {!isAuthenticated && <button
          type="button"
          onClick={openPersonalEditor}
          className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-[#315345] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72]"
        >
          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
          Edit details
        </button>}
        {!isAuthenticated && editingPersonal && (
          <form onSubmit={savePersonalPreview} className="mt-3 space-y-3 border-t border-[#dce7df] pt-3">
            <label className="block text-xs font-semibold">
              Name
              <input
                type="text"
                required
                maxLength={100}
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-[#cbd9cf] bg-white px-3 text-sm font-normal outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#b8e3c9]"
              />
            </label>
            <label className="block text-xs font-semibold">
              Email address
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={emailDraft}
                onChange={(event) => setEmailDraft(event.target.value)}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-[#cbd9cf] bg-white px-3 text-sm font-normal outline-none focus:border-[#145543] focus:ring-2 focus:ring-[#b8e3c9]"
              />
            </label>
            <p className="text-xs leading-5 text-[#735b23]">Preview only. These details won’t be saved.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingPersonal(false)} className="min-h-9 rounded-lg px-3 text-xs font-semibold text-[#59675f] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72]">
                Cancel
              </button>
              <button type="submit" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#145543] px-3 text-xs font-semibold text-white hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72]">
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                Save preview
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-2 rounded-lg border border-[#e7ece8] px-3 py-3">
        <div className="flex items-start gap-2.5">
          <GraduationCap aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#34765f]" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#59675f]">Current study stage</p>
            <p className="mt-0.5 text-sm font-semibold">{stageLabel}</p>
          </div>
          <button
            type="button"
            onClick={openStageEditor}
            disabled={education.status === "loading" || education.status === "unavailable"}
            className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#315345] transition-colors hover:bg-[#f3f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil aria-hidden="true" className="h-3 w-3" />
            Edit
          </button>
        </div>
        {editingStage && (
          <form onSubmit={saveStage} className="mt-3 border-t border-[#edf1ed] pt-3">
            <fieldset>
              <legend className="sr-only">Choose your current study stage</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["class-10", "Class 10"],
                  ["class-12", "Class 12"],
                ] as const).map(([value, label]) => (
                  <label key={value} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-2 text-xs font-semibold ${
                    stageDraft === value ? "border-[#145543] bg-[#edf5ef]" : "border-[#dce7df] bg-white"
                  }`}>
                    <input
                      type="radio"
                      name="profile-study-stage"
                      value={value}
                      required
                      checked={stageDraft === value}
                      onChange={() => setStageDraft(value)}
                      className="h-3.5 w-3.5 accent-[#145543]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {error && <p role="alert" className="mt-2 text-xs leading-5 text-[#8b3529]">{error}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingStage(false)} className="min-h-9 rounded-lg px-3 text-xs font-semibold text-[#59675f] hover:bg-[#f3f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72]">
                Cancel
              </button>
              <button type="submit" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#145543] px-3 text-xs font-semibold text-white hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72]">
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                Save changes
              </button>
            </div>
          </form>
        )}
        {education.status === "invalid" && (
          <p role="alert" className="mt-2 text-xs leading-5 text-[#8b5a1f]">
            The saved stage couldn’t be read. Choose a new stage to replace it.
          </p>
        )}
        {education.status === "unavailable" && (
          <p role="alert" className="mt-2 text-xs leading-5 text-[#8b5a1f]">
            Browser storage is unavailable, so the stage can’t be updated.
          </p>
        )}
      </div>
      {message && <p role="status" className="px-2 py-2 text-xs leading-5 text-[#315345]">{message}</p>}
      {error && !editingStage && (
        <p role="alert" className="px-2 py-2 text-xs leading-5 text-[#8b3529]">{error}</p>
      )}
      {authUnavailable && <p role="status" className="px-2 py-2 text-xs leading-5 text-[#8b5a1f]">Account services are unavailable.</p>}

      <div className="mt-1 grid">
        <ProfileMenuItem label="Exploration History" href="/explore/history" />
        <ProfileMenuItem label="Settings" />
      </div>
      <div className="mt-1 border-t border-[#e7ece8] pt-1">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => {
              setError("");
              signOutDialogRef.current?.showModal();
            }}
            className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-[#9b3f36] transition-colors hover:bg-[#fff1ef] hover:text-[#84352f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b5148]"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sign out
          </button>
        ) : (
          <ProfileMenuItem label="Sign in" href="/sign-in" />
        )}
      </div>
      <dialog
        ref={signOutDialogRef}
        aria-labelledby={`${id}-signout-title`}
        aria-describedby={`${id}-signout-description`}
        onClick={(event) => {
          if (event.target === event.currentTarget && !signingOut) {
            signOutDialogRef.current?.close();
          }
        }}
        className="fixed inset-0 m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-md rounded-3xl border border-[#eadbd8] bg-white p-0 text-[#18352d] shadow-[0_24px_80px_rgba(16,45,36,0.3)] backdrop:bg-[#102d26]/50 backdrop:backdrop-blur-sm"
      >
        <div className="p-6 sm:p-7">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#fff0ed] text-[#9b5148]">
            <LogOut aria-hidden="true" className="h-5 w-5" />
          </span>
          <h2 id={`${id}-signout-title`} className="mt-5 font-serif text-2xl font-semibold">
            Sign out of CareerBridge?
          </h2>
          <p id={`${id}-signout-description`} className="mt-2 text-sm leading-relaxed text-[#59665e]">
            You’ll need to sign in again to access your account. Your saved explorations on this device will remain.
          </p>
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-[#fff0ed] p-3 text-sm text-[#8b3529]">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              autoFocus
              disabled={signingOut}
              onClick={() => signOutDialogRef.current?.close()}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#dce7df] bg-white px-5 text-sm font-semibold text-[#52645a] transition-colors hover:bg-[#f4f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Stay signed in
            </button>
            <button
              type="button"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                setError("");
                try {
                  if (await onSignOut()) {
                    signOutDialogRef.current?.close();
                  } else {
                    setError("We couldn’t sign you out just now. Please try again.");
                  }
                } finally {
                  setSigningOut(false);
                }
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#9b5148] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#843d35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9b5148] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

function ProfileMenuItem({ label, href }: { label: string; href?: string }) {
  if (href) {
    return (
      <Link
        href={href}
        className="flex min-h-10 items-center justify-between rounded-lg px-3 text-sm font-medium text-[#18352d] transition-colors hover:bg-[#f3f7f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
      >
        {label}
      </Link>
    );
  }

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