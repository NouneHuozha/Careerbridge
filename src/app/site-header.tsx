"use client";

import Image from "next/image";
import { Menu, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setCounsellingStatus, type CounsellingSession } from "./counselling/counselling-engine";

const navPill =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/35 bg-[#103f35]/60 px-5 text-sm font-semibold text-white shadow-sm xl:px-6 xl:text-[15px]";

export function SiteHeader({
  home = false,
  dark = false,
  counsellingSession,
}: {
  home?: boolean;
  dark?: boolean;
  counsellingSession?: CounsellingSession;
}) {
  const router = useRouter();
  const [exitOpen, setExitOpen] = useState(false);
  const [exitError, setExitError] = useState("");
  const brand = (
    <div className="flex min-w-0 shrink-0 items-center gap-2.5">
      <Image
        src="/logo.png"
        alt=""
        width={57}
        height={42}
        sizes="57px"
        className="h-10 w-auto object-contain"
      />
      <span
        className={`whitespace-nowrap font-serif text-[19px] font-bold tracking-[-0.02em] ${
          home ? "text-white sm:text-2xl" : "text-[#17201b]"
        }`}
      >
        CareerBridge
      </span>
    </div>
  );

  if (!home) {
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
      <div className="cb-container flex h-[84px] items-center justify-between gap-5 pt-2">
        {brand}
        <div className="hidden items-center gap-2 xl:flex 2xl:gap-3">
          <span className={navPill}>How it works</span>
          <span className={navPill}>About</span>
          <span className={navPill}>
            <MessageCircle aria-hidden="true" className="h-4 w-4" />
            Ask Mentor
          </span>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:gap-3 xl:flex">
          <span className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/60 bg-[#e7f1e9] px-5 text-sm font-semibold text-[#173e32] shadow-sm xl:text-[15px]">
            Sign in / Sign up
          </span>
        </div>
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/40 bg-[#103f35]/60 text-white xl:hidden"
        >
          <Menu className="h-5 w-5" />
        </span>
      </div>
    </header>
  );
}
