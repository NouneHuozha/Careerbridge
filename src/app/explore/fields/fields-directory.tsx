"use client";

import Image from "next/image";
import { ArrowRight, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Breadcrumbs } from "../../breadcrumbs";
import { useEducationStage } from "../../education-stage";
import { SavedItemButton } from "../saved-item-button";
import { possibilityFields, type PossibilityFieldId } from "./field-data";
import { FieldOverviewDialog } from "./field-overview-dialog";

export default function FieldsDirectoryPage() {
  const education = useEducationStage();
  const [query, setQuery] = useState("");
  const [selectedFieldId, setSelectedFieldId] = useState<PossibilityFieldId | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredFields = useMemo(() => {
    if (!normalizedQuery) return possibilityFields;
    return possibilityFields.filter((field) =>
      [
        field.name,
        field.description,
        ...field.introduction,
        ...field.areas.flatMap((area) => [area.name, area.description]),
        ...field.workExamples,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [normalizedQuery]);
  const selectedField = selectedFieldId
    ? possibilityFields.find((field) => field.id === selectedFieldId)
    : undefined;
  const stage = education.status === "saved" ? education.stage : undefined;

  function closePreview() {
    setSelectedFieldId(null);
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  }

  return (
    <main className="min-h-svh bg-[#fbfaf6] text-[#18352d]">
      <div className="cb-container py-10 sm:py-14">
        <Breadcrumbs items={[{ label: "Explore", href: "/explore" }, { label: "Fields" }]} className="!px-0" />
        <div className="mt-6 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[.14em] text-[#4c6a5a]">
            Places to begin
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-.045em] sm:text-5xl">
            Explore different fields.
          </h1>
          <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-[#59665e] sm:text-lg">
            Discover areas of study and work. You don&apos;t need to know what you want to do yet;
            start with anything that makes you curious.
          </p>
        </div>

        <label className="relative mt-8 block max-w-2xl">
          <span className="sr-only">Search fields</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b7b71]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a field or area, such as design or patient care"
            className="min-h-12 w-full rounded-xl border border-[#cbd9cf] bg-white pl-12 pr-4 text-base outline-none placeholder:text-[#829087] focus:border-[#145543] focus:ring-2 focus:ring-[#b8e3c9]"
          />
        </label>

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-[#6b7b71]" aria-live="polite">
            {filteredFields.length} {filteredFields.length === 1 ? "field" : "fields"}
          </p>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="min-h-11 rounded-full px-3 text-sm font-semibold text-[#145543] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
            >
              Clear search
            </button>
          )}
        </div>

        {filteredFields.length > 0 ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFields.map((field) => (
              <article
                key={field.id}
                className="group flex min-h-32 items-center gap-4 rounded-2xl border border-[#dce7df] bg-white p-3 transition-colors hover:border-[#9fc5ad] sm:min-h-40 sm:p-4"
              >
                <button
                  type="button"
                  onClick={(event) => {
                    triggerRef.current = event.currentTarget;
                    setSelectedFieldId(field.id);
                  }}
                  aria-label={`Preview ${field.name}`}
                  className="flex min-w-0 flex-1 items-center gap-4 rounded-sm text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
                >
                  <Image
                    src={field.image}
                    alt=""
                    width={112}
                    height={112}
                    className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-28 sm:w-28"
                  />
                  <span className="flex min-w-0 flex-1 flex-col self-stretch py-1">
                    <span className="font-serif text-xl font-semibold tracking-[-.025em] sm:text-2xl">
                      {field.name}
                    </span>
                    <span className="mt-2 text-sm leading-relaxed text-[#59665e]">
                      {field.description}
                    </span>
                    <span className="cb-card-action mt-auto pt-3">
                      Preview field <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </span>
                  </span>
                </button>
                <SavedItemButton
                  type="field"
                  id={field.id}
                  context={stage ? { stage } : undefined}
                  className="self-start"
                />
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-[#eaf2ed] p-5 sm:p-7">
            <h2 className="font-serif text-2xl font-semibold">No fields found</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#59665e]">
              Try a broader term or clear your search to browse all 13 fields.
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="cb-card-action mt-4"
            >
              Show all fields <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {selectedField && (
        <FieldOverviewDialog field={selectedField} stage={stage} onClose={closePreview} />
      )}
    </main>
  );
}
