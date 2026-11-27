"use client";

import { useRouter } from "next/navigation";

export function CatalogueRetryButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="mt-4 min-h-10 rounded-lg border border-[#cbdcd4] px-3 text-sm font-semibold text-[#377b78] transition-colors hover:bg-[#f1f6f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
    >
      Retry
    </button>
  );
}
