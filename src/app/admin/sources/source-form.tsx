"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Check, FileText } from "lucide-react";
import { AdminStatusBadge } from "../admin-ui";
import type { SourcePreviewRecord } from "./source-preview-data";

type SourceFormValues = {
  name: string;
  url: string;
  description: string;
  sourceType: SourcePreviewRecord["sourceType"];
  authorityCategory: SourcePreviewRecord["authorityCategory"];
  issuingOrganisation: string;
  accessMethod: SourcePreviewRecord["accessMethod"];
  checkingFrequency: SourcePreviewRecord["checkingFrequency"];
  internalNotes: string;
};

const sourceTypeOptions: SourceFormValues["sourceType"][] = [
  "Website",
  "Document",
  "PDF",
  "Other",
];
const authorityOptions: SourceFormValues["authorityCategory"][] = [
  "official",
  "government",
  "institutional",
  "other",
];
const accessOptions: SourceFormValues["accessMethod"][] = [
  "Manual",
  "URL check",
  "Document",
];
const frequencyOptions: SourceFormValues["checkingFrequency"][] = [
  "Not scheduled",
  "Weekly",
  "Monthly",
  "Quarterly",
];
const fields: Array<{ key: keyof SourceFormValues; label: string }> = [
  { key: "name", label: "Source name" },
  { key: "url", label: "Website / document URL" },
  { key: "description", label: "Description" },
  { key: "sourceType", label: "Source type" },
  { key: "authorityCategory", label: "Authority category" },
  { key: "issuingOrganisation", label: "Issuing organisation" },
  { key: "accessMethod", label: "Access method" },
  { key: "checkingFrequency", label: "Checking frequency" },
  { key: "internalNotes", label: "Internal notes" },
];

const inputClassName =
  "min-h-11 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm text-[#405a5e] outline-none transition placeholder:text-[#97a5a1] focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15";

function getInitialValues(source?: SourcePreviewRecord): SourceFormValues {
  return {
    name: source?.name ?? "",
    url: source?.url ?? "",
    description: source?.description ?? "",
    sourceType: source?.sourceType ?? "Website",
    authorityCategory: source?.authorityCategory ?? "official",
    issuingOrganisation: source?.issuingOrganisation ?? "",
    accessMethod: source?.accessMethod ?? "Manual",
    checkingFrequency: source?.checkingFrequency ?? "Not scheduled",
    internalNotes: source?.internalNotes ?? "",
  };
}

function SelectField<T extends string>({
  label,
  value,
  options,
  required = false,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  required?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">
        {label} {required && <span className="text-[#a34c3d]">*</span>}
      </span>
      <select
        value={value}
        required={required}
        onChange={(event) => {
          const nextValue = options.find((option) => option === event.target.value);
          if (nextValue) onChange(nextValue);
        }}
        className={inputClassName}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SourceForm({
  source,
  cancelHref,
}: {
  source?: SourcePreviewRecord;
  cancelHref: string;
}) {
  const [values, setValues] = useState(() => getInitialValues(source));
  const [previewMessage, setPreviewMessage] = useState("");
  const changedFields = useMemo(
    () =>
      source
        ? fields
            .filter(({ key }) => values[key] !== getInitialValues(source)[key])
            .map(({ label }) => label)
        : [],
    [source, values],
  );

  function update<K extends keyof SourceFormValues>(
    key: K,
    value: SourceFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setPreviewMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviewMessage(
      source
        ? "Preview only — changes were not saved, no source metadata was updated, and linked claim assessments remain unchanged."
        : "Preview only — this source was not saved or sent anywhere.",
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminStatusBadge tone="muted">
          <FileText aria-hidden="true" className="size-3.5" />
          Preview only · nothing is saved
        </AdminStatusBadge>
        <Link
          href={cancelHref}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#526b72] transition-colors hover:bg-[#edf2ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Cancel
        </Link>
      </div>

      <fieldset className="rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-5">
        <legend className="px-1 text-base font-semibold text-[#17364a]">A. Basic information</legend>
        <p className="mb-5 text-sm text-[#657976]">
          Add a reusable source identity and the information it may support.
        </p>
        <div className="grid gap-4">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">
              Source name <span className="text-[#a34c3d]">*</span>
            </span>
            <input
              required
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="Enter source name"
              className={inputClassName}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">
              Website / document URL <span className="text-[#a34c3d]">*</span>
            </span>
            <input
              required
              type="url"
              value={values.url}
              onChange={(event) => update("url", event.target.value)}
              placeholder="https://..."
              className={`${inputClassName} font-mono text-[13px]`}
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Description</span>
            <textarea
              rows={3}
              value={values.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="What information does this source provide?"
              className={`${inputClassName} min-h-24 py-3`}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-5">
        <legend className="px-1 text-base font-semibold text-[#17364a]">B. Source classification</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Source type"
            value={values.sourceType}
            options={sourceTypeOptions}
            required
            onChange={(value) => update("sourceType", value)}
          />
          <SelectField
            label="Authority category"
            value={values.authorityCategory}
            options={authorityOptions}
            required
            onChange={(value) => update("authorityCategory", value)}
          />
          <label className="block min-w-0 sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Issuing organisation</span>
            <input
              value={values.issuingOrganisation}
              onChange={(event) => update("issuingOrganisation", event.target.value)}
              placeholder="Organisation name"
              className={inputClassName}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-5">
        <legend className="px-1 text-base font-semibold text-[#17364a]">C. Access and checking</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Access method"
            value={values.accessMethod}
            options={accessOptions}
            onChange={(value) => update("accessMethod", value)}
          />
          <SelectField
            label="Checking frequency"
            value={values.checkingFrequency}
            options={frequencyOptions}
            onChange={(value) => update("checkingFrequency", value)}
          />
        </div>
        <div className="mt-4 flex gap-3 rounded-lg border border-[#eadfbd] bg-[#fbf6e8] p-3.5 text-sm leading-5 text-[#6f5c35]">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            Respect source terms, access restrictions and rate limits. Registration does not imply
            permission to scrape or fetch content.
          </p>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-5">
        <legend className="px-1 text-base font-semibold text-[#17364a]">D. Internal notes</legend>
        <label className="block min-w-0">
          <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Administrative notes</span>
          <textarea
            rows={3}
            value={values.internalNotes}
            onChange={(event) => update("internalNotes", event.target.value)}
            placeholder="Add administrative notes..."
            className={`${inputClassName} min-h-24 py-3`}
          />
        </label>
      </fieldset>

      {source && (
        <section
          aria-live="polite"
          className="rounded-xl border border-[#dce5e0] bg-[#f7f9f7] p-4"
        >
          <h2 className="text-sm font-semibold text-[#17364a]">Change preview</h2>
          {changedFields.length === 0 ? (
            <p className="mt-1 text-sm text-[#657976]">No source details changed.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {changedFields.map((field) => (
                <li
                  key={field}
                  className="rounded-full border border-[#dce5e0] bg-white px-2.5 py-1 text-xs font-medium text-[#526b72]"
                >
                  {field}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs leading-5 text-[#657976]">
            Editing source metadata does not change historical references or automatically alter
            claim verification.
          </p>
        </section>
      )}

      {previewMessage && (
        <p role="status" className="rounded-lg border border-[#cfe3da] bg-[#edf6f1] p-3 text-sm text-[#286c60]">
          <Check aria-hidden="true" className="mr-2 inline size-4" />
          {previewMessage}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-3 border-t border-[#dbe4df] pt-5">
        <Link
          href={cancelHref}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#cfdcd5] bg-white px-4 text-sm font-semibold text-[#526b72] transition-colors hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#20594f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
        >
          {source ? "Save changes" : "Save source"}
        </button>
      </div>
    </form>
  );
}
