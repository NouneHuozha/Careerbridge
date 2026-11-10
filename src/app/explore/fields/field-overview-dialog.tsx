"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Map,
  type LucideIcon,
  X,
} from "lucide-react";
import type { PossibilityField, StudyStage } from "./field-data";

export function FieldOverviewDialog({
  field,
  stage,
  onClose,
}: {
  field: PossibilityField;
  stage?: StudyStage;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const guideHref = `/explore/fields/${field.id}${stage ? `?stage=${stage}` : ""}`;
  const fieldParams = new URLSearchParams({ field: field.id });
  if (stage) fieldParams.set("stage", stage);
  const destinations: {
    title: string;
    description: string;
    action: string;
    href: string;
    icon: LucideIcon;
    featured?: boolean;
  }[] = [
    {
      title: `Explore ${field.name} deeper`,
      description: "See what people do, areas to explore, study routes and possible work.",
      action: "Open the full field guide",
      href: guideHref,
      icon: ArrowRight,
      featured: true,
    },
    {
      title: "Browse related courses",
      description: "Open the course catalogue with this field selected.",
      action: "Go to courses",
      href: `/explore/courses?${fieldParams.toString()}`,
      icon: BookOpen,
    },
    {
      title: "Find institutions",
      description: "See institutions and offerings connected to this field.",
      action: "Go to institutions",
      href: `/explore/institutions?${fieldParams.toString()}`,
      icon: Building2,
    },
    {
      title: "Explore study pathways",
      description: "Compare possible study routes for this field and stage.",
      action: "Go to pathways",
      href: `/explore/pathways?${fieldParams.toString()}`,
      icon: Map,
    },
  ];

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
      aria-labelledby="field-overview-title"
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
            <p className="text-sm font-semibold uppercase tracking-[.12em] text-[#6b7b71]">
              A place to start exploring
            </p>
            <h2
              id="field-overview-title"
              className="mt-2 font-serif text-4xl font-semibold tracking-[-.045em] sm:text-5xl"
            >
              {field.name}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#354b40] sm:text-lg">
              {field.introduction[0]}
            </p>
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

        <section className="mt-7" aria-labelledby="field-preview-activities">
          <h3 id="field-preview-activities" className="font-serif text-2xl font-semibold">
            What might people do?
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {field.workExamples.slice(0, 3).map((activity) => (
              <li key={activity} className="rounded-xl bg-[#eaf2ed] px-4 py-3 text-sm leading-relaxed text-[#384a3e]">
                {activity}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-7" aria-labelledby="field-preview-areas">
          <h3 id="field-preview-areas" className="font-serif text-2xl font-semibold">
            A few areas within {field.name}
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {field.areas.slice(0, 4).map((area) => (
              <li key={area.name} className="rounded-full border border-[#cbd9cf] px-3 py-2 text-sm font-medium text-[#345b49]">
                {area.name}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 border-t border-[#dde7df] pt-6" aria-labelledby="field-next-steps">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[.12em] text-[#6b7b71]">
                Choose your next step
              </p>
              <h3 id="field-next-steps" className="mt-1 font-serif text-2xl font-semibold">
                How would you like to explore?
              </h3>
            </div>
            <p className="text-sm text-[#59665e]">Choose a card to go there directly.</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {destinations.map(({ title, description, action, href, icon: Icon, featured }) => (
              <Link
                key={title}
                href={href}
                className={`group flex min-h-32 items-start gap-4 rounded-2xl border p-4 transition-[border-color,background-color,transform] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543] motion-reduce:transform-none ${
                  featured
                    ? "border-[#145543] bg-[#145543] text-white hover:bg-[#0f4537]"
                    : "border-[#dce7df] bg-white text-[#18352d] hover:border-[#9fc5ad] hover:bg-[#f4f7f3]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    featured ? "bg-white/15" : "bg-[#eaf2ed]"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${featured ? "text-white" : "text-[#145543]"}`} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col self-stretch">
                  <span className="font-semibold leading-snug">{title}</span>
                  <span className={`mt-1.5 text-sm leading-relaxed ${featured ? "text-white/85" : "text-[#59665e]"}`}>
                    {description}
                  </span>
                  <span className={`mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-semibold ${
                    featured ? "text-white" : "text-[#145543]"
                  }`}>
                    {action}
                    <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#6b7b71]">
            Field guides and study routes are general starting points, not eligibility or career
            guarantees. Institution listings may include sample data.
          </p>
        </section>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-[#345b49] underline underline-offset-4 transition-colors hover:text-[#145543] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#145543]"
          >
            Back to all fields
          </button>
        </div>
      </div>
    </dialog>
  );
}
