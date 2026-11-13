"use client";

import Image from "next/image";
import { Menu, MessageCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { setCounsellingStatus, type CounsellingSession } from "./counselling/counselling-engine";

const navPill =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/35 bg-[#103f35]/60 px-5 text-sm font-semibold text-white shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-white/70 hover:bg-[#145543]/80 hover:shadow-md active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transform-none motion-reduce:transition-none xl:px-6 xl:text-[15px]";
const disabledNavPill =
  "inline-flex min-h-12 cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/35 bg-[#103f35]/60 px-5 text-sm font-semibold text-white/70 opacity-75 xl:px-6 xl:text-[15px]";

export function SiteHeader({
  home = false,
  dark = false,
  publicPage = false,
  counsellingSession,
}: {
  home?: boolean;
  dark?: boolean;
  publicPage?: boolean;
  counsellingSession?: CounsellingSession;
}) {
  const router = useRouter();
  const [exitOpen, setExitOpen] = useState(false);
  const [exitError, setExitError] = useState("");
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const mobileMenu = mobileMenuRef.current;
    if (!mobileMenu) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        mobileMenu.open &&
        event.target instanceof Node &&
        !mobileMenu.contains(event.target)
      ) {
        mobileMenu.open = false;
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick, true);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick, true);
  }, []);

  const brand = (
    <Link
      href="/"
      aria-label="CareerBridge home"
      className="flex min-w-0 shrink-0 items-center gap-2.5"
    >
      <Image
        src="/logo.png"
        alt=""
        width={57}
        height={42}
        sizes="57px"
        className={`${home ? "h-8 min-[360px]:h-10" : "h-10"} w-auto object-contain`}
      />
      <span
        className={`whitespace-nowrap font-serif font-bold tracking-[-0.02em] ${
          home
            ? "text-[17px] text-white min-[360px]:text-[19px] sm:text-2xl"
            : "text-[19px] text-[#17201b]"
        }`}
      >
        CareerBridge
      </span>
    </Link>
  );

  if (!home) {
    if (publicPage) {
      const publicLinkClass =
        "inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium text-[#354b40] transition-colors hover:text-[#145543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#145543]";

      return (
        <header className="sticky top-0 z-50 bg-[#fbfaf6] text-[#18352d]">
          <div className="cb-container flex min-h-[76px] items-center justify-between gap-4">
            {brand}
            <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
              <Link href="/how-it-works" className={publicLinkClass}>How it works</Link>
              <Link
                href="/about"
                aria-current="page"
                className={`${publicLinkClass} font-semibold text-[#145543]`}
              >
                About
              </Link>
            </nav>
          </div>
          <nav
            aria-label="Main navigation"
            className="cb-container flex items-center justify-end gap-6 overflow-x-auto pb-3 lg:hidden"
          >
            <Link href="/how-it-works" className={publicLinkClass}>How it works</Link>
            <Link
              href="/about"
              aria-current="page"
              className={`${publicLinkClass} font-semibold text-[#145543]`}
            >
              About
            </Link>
          </nav>
        </header>
      );
    }

    return (
      <>
        <header className={`sticky top-0 z-50 border-b shadow-[0_2px_8px_#23453305] ${dark ? "border-white/10 bg-[#080b0a] text-white" : "border-[#dde4df] bg-[#f7f8f5]"}`}>
          <div className="cb-container flex min-h-[76px] items-center justify-between gap-4">
          {brand}
            {counsellingSession && (
              <button
                type="button"
                onClick={() => {
                  setExitError("");
                  setExitOpen(true);
                }}
                className="inline-flex min-h-11 items-center rounded-full border border-[#9aafa0] px-4 text-sm font-semibold text-[#145543] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
              >
                Leave Guided Explorer
              </button>
            )}
          </div>
        </header>
        {counsellingSession && exitOpen && (
          <dialog
            open
            aria-modal="true"
            aria-labelledby="exit-counselling-title"
            className="fixed inset-0 z-[60] m-auto w-[min(30rem,calc(100vw-2rem))] rounded-3xl border border-[#dce4dc] bg-[#fbfaf6] p-0 text-[#18352d] shadow-[0_24px_80px_rgba(16,45,36,0.28)] backdrop:bg-[#102d24]/55 backdrop:backdrop-blur-sm"
            onCancel={(event) => {
              event.preventDefault();
              setExitOpen(false);
            }}
          >
            <div className="p-6 sm:p-7">
              <h2 id="exit-counselling-title" className="font-serif text-2xl font-semibold">
                Leave Guided Explorer?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#354b40]">
                Saved responses stay on this device. A response on the current question is saved
                when you continue or finish.
              </p>
              {exitError && (
                <p className="mt-4 rounded-xl bg-[#f6e8e5] px-4 py-3 text-sm text-[#8a2e24]" role="alert">
                  {exitError}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const result = setCounsellingStatus(counsellingSession, "paused");
                    if (!result.ok) {
                      setExitError(
                        "This browser couldn’t save your progress, so Guided Explorer is still open.",
                      );
                      return;
                    }
                    setExitOpen(false);
                    router.push("/explore");
                  }}
                  className="inline-flex min-h-11 items-center rounded-full bg-[#145543] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  Leave Guided Explorer
                </button>
                <button
                  type="button"
                  onClick={() => setExitOpen(false)}
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-[#145543] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  Continue Guided Explorer
                </button>
              </div>
            </div>
          </dialog>
        )}
      </>
    );
  }

  return (
    <header className="absolute inset-x-0 top-0 z-50 border-0 bg-transparent text-white">
      <div className="cb-container flex h-[84px] items-center justify-between gap-1 pt-2 sm:gap-5">
        {brand}
        <div className="hidden items-center gap-2 xl:flex 2xl:gap-3">
          <Link href="/how-it-works" className={navPill}>How it works</Link>
          <Link href="/about" className={navPill}>About</Link>
          <button type="button" disabled className={disabledNavPill}>
            <MessageCircle aria-hidden="true" className="h-4 w-4" />
            Ask Mentor
          </button>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:gap-3 xl:flex">
          <Link
            href="/sign-in"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/60 bg-[#e7f1e9] px-5 text-sm font-semibold text-[#173e32] shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#f2cf78] hover:bg-[#f2cf78] hover:shadow-md active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transform-none motion-reduce:transition-none xl:text-[15px]"
          >
            Sign in / Sign up
          </Link>
        </div>
        <details ref={mobileMenuRef} className="group relative xl:hidden">
          <summary
            aria-controls="mobile-primary-navigation"
            className="relative z-50 inline-flex min-h-11 list-none cursor-pointer items-center gap-2 rounded-full border border-white/45 bg-[#103f35]/75 px-3 text-sm font-semibold text-white transition-[background-color,border-color] duration-200 hover:border-white/75 hover:bg-[#145543]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [&::-webkit-details-marker]:hidden motion-reduce:transition-none min-[360px]:px-4"
          >
            <Menu aria-hidden="true" className="h-4 w-4 group-open:hidden" />
            <X aria-hidden="true" className="hidden h-4 w-4 group-open:block" />
            <span className="group-open:hidden">Menu</span>
            <span className="hidden group-open:inline">Close</span>
          </summary>
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 bottom-0 top-[84px] z-40 bg-[#102d24]/25 opacity-0 transition-opacity duration-200 group-open:opacity-100 motion-reduce:transition-none"
          />
          <nav
            id="mobile-primary-navigation"
            aria-label="Main navigation"
            className="invisible pointer-events-none absolute right-0 top-[calc(100%+0.625rem)] z-[60] grid max-h-[calc(100dvh-6rem)] w-[min(20rem,calc(100vw-3rem))] -translate-y-2 gap-1 overflow-y-auto rounded-2xl border border-white/80 bg-[#f7f8f5]/95 p-3 text-[#18352d] opacity-0 shadow-[0_20px_56px_rgba(16,45,36,0.22)] backdrop-blur-xl transition-[opacity,transform,visibility] duration-200 ease-out [transition-delay:200ms] group-open:visible group-open:pointer-events-auto group-open:translate-y-0 group-open:opacity-100 group-open:[transition-delay:0ms] motion-reduce:transition-none"
          >
            <Link href="/how-it-works" className="inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold transition-colors hover:bg-[#e3ece5]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] motion-reduce:transition-none">
              How it works
            </Link>
            <Link href="/about" className="inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold transition-colors hover:bg-[#e3ece5]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] motion-reduce:transition-none">
              About
            </Link>
            <button type="button" disabled className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-xl px-4 text-left text-sm font-semibold text-[#77827a]">
              <MessageCircle aria-hidden="true" className="h-4 w-4" />
              Ask Mentor
            </button>
            <Link href="/sign-in" className="inline-flex min-h-11 items-center rounded-xl bg-[#e7f1e9] px-4 text-sm font-semibold text-[#173e32] transition-colors hover:bg-[#f2cf78] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] motion-reduce:transition-none">
              Sign in / Sign up
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
