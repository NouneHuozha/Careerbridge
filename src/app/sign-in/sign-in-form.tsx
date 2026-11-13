"use client";

import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";

export default function SignInForm({
  next,
  onSwitch,
}: {
  next: string;
  onSwitch: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <h2 className="text-3xl font-semibold tracking-[-0.035em] text-[#073c32] sm:text-4xl">Welcome back.</h2>
      <p className="mt-1.5 text-base text-[#64756d]">Pick up where you left off.</p>
      <form action="/api/auth/sign-in" method="post" className="mt-5 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="sign-in-email" className="mb-1.5 block text-sm font-semibold text-[#273d34]">Email</label>
          <div className="relative">
            <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#87958d]" />
            <input id="sign-in-email" name="email" type="email" required maxLength={191} autoComplete="email" placeholder="you@example.com" className="h-12 w-full rounded-xl border border-[#d5dfd8] bg-white pl-12 pr-4 text-base outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="sign-in-password" className="block text-sm font-semibold text-[#273d34]">Password</label>
          </div>
          <div className="relative">
            <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#87958d]" />
            <input id="sign-in-password" name="password" type={showPassword ? "text" : "password"} required maxLength={128} autoComplete="current-password" placeholder="Enter your password" className="h-12 w-full rounded-xl border border-[#d5dfd8] bg-white pl-12 pr-14 text-base outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md text-[#59675f] transition-colors hover:bg-[#f3f6f3] hover:text-[#18352d]" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <button type="submit" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#145543] px-5 text-base font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72]">
          Sign in <span aria-hidden="true" className="text-xl">→</span>
        </button>
      </form>
      <div className="my-4 flex items-center gap-4 text-sm text-[#87958d]"><span className="h-px flex-1 bg-[#d5dfd8]" />or<span className="h-px flex-1 bg-[#d5dfd8]" /></div>
      <p className="mt-4 text-center text-sm text-[#64756d]">
        New to CareerBridge?{" "}
        <button type="button" onClick={onSwitch} className="font-medium text-[#17664e] underline underline-offset-2 hover:text-[#0f4537]">Create an account.</button>
      </p>
    </>
  );
}
