import Link from "next/link";
import { ChevronRight, House } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({
  items,
  dark = false,
  className = "",
}: {
  items: BreadcrumbItem[];
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={`cb-container ${className}`}>
      <nav aria-label="Breadcrumb">
        <ol className={`flex min-w-0 flex-wrap items-center gap-1.5 text-sm ${dark ? "text-white/75" : "text-[#718078]"}`}>
          <li className="flex items-center gap-1.5">
            <Link
              href="/"
              aria-label="Home"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${dark ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#eaf2ed] text-[#145543] hover:bg-[#dce9e0]"}`}
            >
              <House aria-hidden="true" className="h-4 w-4" />
            </Link>
            <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 opacity-60" />
          </li>
          {items.map((item, index) => {
            const current = index === items.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                {current || !item.href ? (
                  <span
                    aria-current={current ? "page" : undefined}
                    className={`max-w-[min(60vw,20rem)] truncate rounded-full px-3 py-1.5 font-semibold ${dark ? "bg-white/10 text-white" : "bg-white text-[#18352d] shadow-[0_2px_8px_rgba(24,53,45,.06)]"}`}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className={`max-w-[min(45vw,16rem)] truncate rounded-full px-3 py-1.5 font-medium transition-colors ${dark ? "text-white/75 hover:bg-white/10 hover:text-white" : "text-[#52645a] hover:bg-white hover:text-[#145543]"}`}
                  >
                    {item.label}
                  </Link>
                )}
                {!current && <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 opacity-60" />}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
