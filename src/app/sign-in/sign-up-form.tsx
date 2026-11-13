"use client";

import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState } from "react";

export default function SignUpForm({
  next,
  onSwitch,
}: {
  next: string;
  onSwitch: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <h2 className="text-3xl font-semibold tracking-[-0.035em] text-[#073c32] sm:text-4xl">Create your account.</h2>
      <p className="mt-1 text-sm leading-relaxed text-[#64756d]">Save your answers, possibilities and next steps in one place.</p>
      <form action="/api/auth/sign-up" method="post" className="mt-4 space-y-2.5">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="sign-up-name" className="mb-1 block text-sm font-semibold text-[#273d34]">First name</label>
          <div className="relative">
            <UserRound aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#87958d]" />
            <input id="sign-up-name" name="fullName" type="text" required maxLength={120} autoComplete="name" placeholder="Enter your first name" className="h-11 w-full rounded-xl border border-[#d5dfd8] bg-white pl-12 pr-4 text-base outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
          </div>
        </div>
        <div>
          <label htmlFor="sign-up-email" className="mb-1 block text-sm font-semibold text-[#273d34]">Email</label>
          <div className="relative">
            <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#87958d]" />
            <input id="sign-up-email" name="email" type="email" required maxLength={191} autoComplete="email" placeholder="Enter your email" className="h-11 w-full rounded-xl border border-[#d5dfd8] bg-white pl-12 pr-4 text-base outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
          </div>
        </div>
        <div>
          <label htmlFor="sign-up-password" className="mb-1 block text-sm font-semibold text-[#273d34]">Password</label>
          <div className="relative">
            <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#87958d]" />
            <input id="sign-up-password" name="password" type={showPassword ? "text" : "password"} required minLength={8} maxLength={128} autoComplete="new-password" placeholder="Create a password" className="h-11 w-full rounded-xl border border-[#d5dfd8] bg-white pl-12 pr-14 text-base outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md text-[#59675f] transition-colors hover:bg-[#f3f6f3] hover:text-[#18352d]" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-[#64756d]">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="sign-up-confirm" className="mb-1 block text-sm font-semibold text-[#273d34]">Confirm password</label>
          <div className="relative">
            <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#87958d]" />
            <input id="sign-up-confirm" name="confirm" type={showConfirm ? "text" : "password"} required minLength={8} maxLength={128} autoComplete="new-password" placeholder="Confirm your password" className="h-11 w-full rounded-xl border border-[#d5dfd8] bg-white pl-12 pr-14 text-base outline-none transition focus:border-[#145543] focus:ring-2 focus:ring-[#e2f0e7]" />
            <button type="button" aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"} title={showConfirm ? "Hide confirmation password" : "Show confirmation password"} aria-pressed={showConfirm} className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md text-[#59675f] transition-colors hover:bg-[#f3f6f3] hover:text-[#18352d]" onClick={() => setShowConfirm((value) => !value)}>
              {showConfirm ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#145543] px-5 text-base font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d8b72]">
          Create my account <span aria-hidden="true" className="text-xl">→</span>
        </button>
      </form>
      <div className="my-3 flex items-center gap-3 text-sm text-[#87958d]"><span className="h-px flex-1 bg-[#d5dfd8]" />or<span className="h-px flex-1 bg-[#d5dfd8]" /></div>
      <p className="mt-3 text-center text-sm text-[#64756d]">
        Already have an account?{" "}
        <button type="button" onClick={onSwitch} className="font-medium text-[#17664e] underline underline-offset-2 hover:text-[#0f4537]">Sign in</button>
      </p>
    </>
  );
}
