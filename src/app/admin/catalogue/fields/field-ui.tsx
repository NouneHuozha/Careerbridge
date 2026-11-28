import type { ReactNode } from "react";
import type { AdminFieldVerificationStatus } from "../../../../db/admin-fields";

export const fieldVerificationLabels: Record<AdminFieldVerificationStatus, string> = {
  not_collected: "Not collected",
  unverified: "Unverified",
  pending_review: "Pending verification",
  verified: "Verified",
  partially_verified: "Partially verified",
  disputed: "Disputed",
  unavailable: "Unavailable",
  stale: "Stale",
  expired: "Expired",
  superseded: "Superseded",
};

export function FieldStatusBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "published" | "review" | "draft" | "archived" | "pending" | "muted";
}) {
  const toneClass = {
    published: "border-[#86efac] bg-[#dcfce7] text-[#166534]",
    review: "border-[#fcd34d] bg-[#fef3c7] text-[#92400e]",
    draft: "border-[#cbd5e1] bg-[#e2e8f0] text-[#334155]",
    archived: "border-[#fca5a5] bg-[#fee2e2] text-[#991b1b]",
    pending: "border-[#fcd34d] bg-[#fef3c7] text-[#92400e]",
    muted: "border-[#dce5e0] bg-[#f5f8f6] text-[#637572]",
  }[tone];
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-semibold leading-none ${toneClass}`}>
      {children}
    </span>
  );
}
