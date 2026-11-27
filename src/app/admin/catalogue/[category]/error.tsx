"use client";

import { AlertTriangle } from "lucide-react";
import { AdminPageHeader } from "../../admin-ui";

export default function CatalogueCategoryError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Unable to load this record"
        description="The information could not be retrieved. Retry without losing your current navigation context."
      />
      <section role="alert" className="flex items-start gap-3 rounded-xl border border-[#dce5e0] bg-white p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#fbf6e8] text-[#80652e]">
          <AlertTriangle aria-hidden="true" className="size-[18px]" />
        </span>
        <div>
          <h2 className="font-semibold text-[#17364a]">Catalogue data is temporarily unavailable</h2>
          <p className="mt-1 text-sm leading-5 text-[#657976]">
            No record details or internal error information are shown here.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 min-h-10 rounded-lg border border-[#cbdcd4] px-3 text-sm font-semibold text-[#377b78] hover:bg-[#f1f6f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
          >
            Retry
          </button>
        </div>
      </section>
    </div>
  );
}
