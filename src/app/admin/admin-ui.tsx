import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dbe4df] pb-6">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#377b78]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#17364a] sm:text-[2.1rem]">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#586f70] sm:text-base">
          {description}
        </p>
      </div>
    </header>
  );
}

export function AdminMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accentClass,
}: {
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  accentClass: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <dt className="pt-1 text-sm font-semibold text-[#526b72]">{label}</dt>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${accentClass}`}>
          <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
        </span>
      </div>
      <dd className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-[#17364a] sm:text-4xl">
        {value.toLocaleString("en-IN")}
      </dd>
      <p className="mt-2 text-xs leading-5 text-[#657976] sm:text-sm">{detail}</p>
    </div>
  );
}

export function AdminSectionCard({
  id,
  title,
  description,
  action,
  children,
  className = "",
}: {
  id: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={`min-w-0 rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-5 ${className}`}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${id}-heading`} className="text-base font-semibold tracking-[-0.01em] text-[#17364a]">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-5 text-[#657976]">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AdminEmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div role="status" className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-[#d6e1dc] bg-[#f8faf8] px-5 py-7 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-[#e8f1ed] text-[#377b78]">
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
      </span>
      <p className="mt-3 text-sm font-semibold text-[#17364a]">{title}</p>
      <p className="mt-1 max-w-md text-sm leading-5 text-[#657976]">{description}</p>
    </div>
  );
}

export function AdminStatusBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "accent" | "inverse" | "muted";
}) {
  const toneClass = {
    accent: "border-[#cfe3da] bg-[#edf6f1] text-[#286c60]",
    inverse: "border-white/15 bg-white/8 text-[#dce9e8]",
    muted: "border-[#dce5e0] bg-[#f5f8f6] text-[#637572]",
  }[tone];

  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold leading-none ${toneClass}`}>
      {children}
    </span>
  );
}
