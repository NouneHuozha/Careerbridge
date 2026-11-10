"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { PossibilityField } from "../../explore/fields/field-data";

type ActivityConnection = {
  label: string;
  reason: string;
};

export function FieldOverviewDialog({
  field,
  activities,
  onClose,
}: {
  field: PossibilityField;
  activities: readonly ActivityConnection[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="discover-field-overview-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto flex max-h-[92dvh] w-[min(900px,calc(100vw-32px))] flex-col overflow-hidden rounded-[28px] bg-[#fbfaf6] p-0 text-left text-[#18352d] shadow-[0_24px_80px_rgba(16,45,36,0.38)] backdrop:bg-[#102d26]/65 backdrop:backdrop-blur-md max-md:m-0 max-md:h-[100dvh] max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none"
    >
      <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-[#dde7df] px-5 sm:px-8">
        <p className="text-sm font-semibold text-[#52645a]">Field overview</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close field overview"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#18352d] transition-colors hover:bg-[#eaf2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-9 sm:py-8">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_250px] sm:items-start">
          <div>
            <h2
              id="discover-field-overview-title"
              className="font-serif text-4xl font-semibold tracking-[-.045em] sm:text-5xl"
            >
              {field.name}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#52645a] sm:text-base">
              {field.overview.shortDescription}
            </p>
            <section className="mt-5" aria-labelledby="discover-field-about">
              <h3 id="discover-field-about" className="font-semibold">
                What is this field about?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#384a3e] sm:text-base">
                {field.overview.introduction}
              </p>
            </section>
          </div>
          <div className="relative h-40 overflow-hidden rounded-2xl bg-[#e6eeea] sm:h-44">
            <Image
              src={field.image}
              alt={field.imageAlt}
              fill
              sizes="250px"
              className="object-cover"
            />
          </div>
        </div>

        <section className="mt-6 rounded-2xl bg-[#eaf2ed] p-4 sm:p-5" aria-labelledby="discover-field-everyday">
          <h3 id="discover-field-everyday" className="font-semibold">
            Where might you see it?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#384a3e] sm:text-base">
            {field.overview.everydayExample}
          </p>
        </section>

        <section className="mt-7" aria-labelledby="discover-field-activities">
          <h3 id="discover-field-activities" className="font-serif text-2xl font-semibold">
            What might people do?
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {field.overview.activities.map((example) => (
              <li
                key={example}
                className="rounded-xl bg-white px-4 py-3 text-sm leading-relaxed text-[#384a3e]"
              >
                {example}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-7" aria-labelledby="discover-field-areas">
          <h3 id="discover-field-areas" className="font-serif text-2xl font-semibold">
            A few areas within this field
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {field.overview.areas.map((area) => (
              <li
                key={area}
                className="rounded-full border border-[#cbd9cf] px-3 py-2 text-sm font-medium text-[#345b49]"
              >
                {area}
              </li>
            ))}
          </ul>
        </section>

        {activities.length > 0 && (
          <section className="mt-7 border-t border-[#dde7df] pt-6" aria-labelledby="discover-field-connection">
            <h3 id="discover-field-connection" className="font-serif text-2xl font-semibold">
              Why are you seeing this field?
            </h3>
            <ul className="mt-3 space-y-3">
              {activities.map(({ label, reason }) => (
                <li key={label} className="text-sm leading-relaxed text-[#384a3e] sm:text-base">
                  <span className="font-semibold">You selected “{label}.”</span>{" "}
                  {reason}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section
          className="mt-8 border-t border-[#dde7df] pt-6"
          aria-labelledby="discover-field-next-step"
        >
          <h3 id="discover-field-next-step" className="font-serif text-2xl font-semibold text-[#18352d]">
            What’s next?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#384a3e]">
            You can explore more fields, then choose how to continue.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[#145543] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0f4537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            Close overview
          </button>
        </section>
      </div>
    </dialog>
  );
}
