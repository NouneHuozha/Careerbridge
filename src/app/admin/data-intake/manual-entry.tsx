"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileCheck2,
  Info,
  Plus,
} from "lucide-react";
import { AdminPageHeader, AdminSectionCard, AdminStatusBadge } from "../admin-ui";
import {
  getCatalogueCategory,
  type CatalogueEditorField,
} from "../catalogue/catalogue-preview-data";
import { sourcePreviewRecords } from "../sources/source-preview-data";
import {
  getManualEntryType,
  manualEntryTypes,
  type ManualEntryTypeKey,
} from "./intake-preview-data";

const inputClass =
  "min-h-11 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15";

function ManualTypeChooser() {
  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6">
      <AdminPageHeader
        eyebrow="Data intake / Manual entry"
        title="Create a record preview"
        description="Choose a record type to open its structured form. Each entry remains a draft preview until connected to the existing review lifecycle."
      />
      <div className="flex items-start gap-3 rounded-xl border border-[#d6e4dd] bg-[#edf6f1] p-4">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#377b78]" />
        <p className="text-sm leading-6 text-[#526c67]">
          <strong className="font-semibold text-[#286c60]">Preview only.</strong>{" "}
          No catalogue record or revision is created. Campuses and course offerings are handled as related records from their parent institution or course.
        </p>
      </div>
      <section aria-label="Select a record type" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {manualEntryTypes.map((type) => (
          <Link
            key={type.id}
            href={`/admin/data-intake/manual/${type.id}`}
            className="group flex min-h-48 flex-col rounded-xl border border-[#dce5e0] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#9abbb0] hover:shadow-[0_10px_28px_rgba(23,54,74,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-[#edf6f1] text-[#377b78]">
              <BookOpen aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-[#17364a]">{type.label}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-[#657976]">{type.description}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#286c60]">
              Open form <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: CatalogueEditorField;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}) {
  const commonProps = {
    required: field.required,
    placeholder: field.placeholder,
    className: inputClass,
  };
  return (
    <label key={field.key} className="block min-w-0">
      <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">
        {field.label} {field.required && <span className="text-[#a34c3d]">*</span>}
      </span>
      {field.type === "textarea" ? (
        <textarea
          {...commonProps}
          rows={3}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClass} min-h-24 py-3`}
        />
      ) : field.type === "select" || field.type === "multiselect" ? (
        <select
          {...commonProps}
          multiple={field.type === "multiselect"}
          value={field.type === "multiselect" ? (Array.isArray(value) ? value : []) : (typeof value === "string" ? value : "")}
          onChange={(event) => onChange(
            field.type === "multiselect"
              ? Array.from(event.target.selectedOptions, (option) => option.value)
              : event.target.value,
          )}
          className={`${inputClass} ${field.type === "multiselect" ? "min-h-28 py-2" : ""}`}
        >
          {field.type === "select" && <option value="">Select {field.label.toLowerCase()}</option>}
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{option.replace(/-/g, " ")}</option>
          ))}
        </select>
      ) : (
        <input
          {...commonProps}
          type={field.type === "url" ? "url" : "text"}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.helpText && <span className="mt-1 block text-xs text-[#71817d]">{field.helpText}</span>}
    </label>
  );
}

function ManualRecordForm({ recordType }: { recordType: ManualEntryTypeKey }) {
  const config = getManualEntryType(recordType);
  const category = config?.categorySlug ? getCatalogueCategory(config.categorySlug) : undefined;
  const editorFields = (category?.editorFields ?? []).filter(
    (field) => !["title", "summary", "description"].includes(field.key),
  );
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [sourceId, setSourceId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [message, setMessage] = useState("");
  const selectedSource = sourcePreviewRecords.find((source) => source.id === sourceId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Entry preview is ready. No record, revision or source link was saved.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminStatusBadge tone="muted">
          <FileCheck2 aria-hidden="true" className="size-3.5" />
          Preview only · nothing is saved
        </AdminStatusBadge>
        <Link href="/admin/data-intake/manual" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#526b72] hover:bg-[#edf2ef]">
          <ArrowLeft aria-hidden="true" className="size-4" /> Change record type
        </Link>
      </div>

      <AdminSectionCard
        id="manual-record-identity"
        title="A. Record information"
        description="Add the record identity and a concise description. Required fields follow the existing Catalogue form where available."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block min-w-0 sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">
              {recordType === "field" ? "Field name" : `${config?.label ?? "Record"} name`} <span className="text-[#a34c3d]">*</span>
            </span>
            <input
              required
              value={typeof values.title === "string" ? values.title : ""}
              onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
              placeholder={`Enter ${recordType === "field" ? "field" : (config?.label ?? "record").toLowerCase()} name`}
              className={inputClass}
            />
          </label>
          <label className="block min-w-0 sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Summary</span>
            <textarea
              rows={2}
              value={typeof values.summary === "string" ? values.summary : ""}
              onChange={(event) => setValues((current) => ({ ...current, summary: event.target.value }))}
              placeholder="A short overview for catalogue reviewers"
              className={`${inputClass} min-h-20 py-3`}
            />
          </label>
          <label className="block min-w-0 sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Description</span>
            <textarea
              rows={4}
              value={typeof values.description === "string" ? values.description : ""}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
              placeholder="Add the details reviewers will need to assess this record"
              className={`${inputClass} min-h-28 py-3`}
            />
          </label>
          {editorFields.map((field) => (
            <FieldControl
              key={field.key}
              field={field}
              value={values[field.key] ?? (field.type === "multiselect" ? [] : "")}
              onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
            />
          ))}
        </div>
        {!category && (
          <p className="mt-4 rounded-lg bg-[#f8faf8] px-3 py-2 text-xs leading-5 text-[#657976]">
            Field entries use a minimal name and description preview; a field-specific Catalogue schema is not connected here.
          </p>
        )}
      </AdminSectionCard>

      <AdminSectionCard
        id="manual-record-evidence"
        title="B. Sources and evidence"
        description="Associate a registered source and a specific page or note. A source does not automatically verify every claim."
        action={
          <Link href="/admin/sources" className="text-sm font-semibold text-[#286c60] hover:underline">
            Manage sources
          </Link>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Registered source</span>
            <select
              value={sourceId}
              onChange={(event) => {
                const nextId = event.target.value;
                const nextSource = sourcePreviewRecords.find((source) => source.id === nextId);
                setSourceId(nextId);
                setSourceUrl(nextSource?.url ?? "");
              }}
              className={inputClass}
            >
              <option value="">Choose a source (optional)</option>
              {sourcePreviewRecords.filter((source) => source.status === "active").map((source) => (
                <option key={source.id} value={source.id}>{source.name}</option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Evidence page URL</span>
            <input
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </label>
          <label className="block min-w-0 sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Claim or evidence note</span>
            <textarea
              rows={3}
              value={evidenceNote}
              onChange={(event) => setEvidenceNote(event.target.value)}
              placeholder="What specific claim does this source support? Include a page or section reference."
              className={`${inputClass} min-h-24 py-3`}
            />
          </label>
        </div>
        {selectedSource && (
          <p className="mt-3 text-xs leading-5 text-[#657976]">
            Selected source: <strong className="font-semibold text-[#17364a]">{selectedSource.name}</strong>. It will be attached as supporting evidence.
          </p>
        )}
      </AdminSectionCard>

      {message && (
        <p role="status" className="rounded-lg border border-[#cfe3da] bg-[#edf6f1] px-4 py-3 text-sm text-[#286c60]">
          {message}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Link href="/admin/data-intake" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d6e1dc] bg-white px-4 text-sm font-semibold text-[#405a5e] hover:bg-[#f4f7f5]">
          Cancel
        </Link>
        <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white hover:bg-[#205b51]">
          Prepare entry preview <Plus aria-hidden="true" className="size-4" />
        </button>
      </div>
      <p className="text-right text-xs text-[#71817d]">Preparing this preview never submits it to the Review Queue.</p>
    </form>
  );
}

export function ManualEntryPage({ recordType }: { recordType?: string }) {
  if (!recordType) return <ManualTypeChooser />;
  const config = getManualEntryType(recordType);
  if (!config) {
    return (
      <div className="mx-auto w-full max-w-[1320px] space-y-6">
        <AdminPageHeader eyebrow="Data intake / Manual entry" title="Record type not found" description="Choose one of the supported preview record types." />
        <Link href="/admin/data-intake/manual" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#d6e1dc] bg-white px-4 text-sm font-semibold text-[#405a5e]">
          <ArrowLeft aria-hidden="true" className="size-4" /> Choose a record type
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6">
      <AdminPageHeader
        eyebrow={`Data intake / Manual entry / ${config.label}`}
        title={`New ${config.label.toLowerCase()} preview`}
        description={config.description}
      />
      <ManualRecordForm recordType={config.id} />
      <div className="flex items-center gap-2 text-xs text-[#71817d]">
        <ArrowRight aria-hidden="true" className="size-3.5" />
        Draft preparation is separate from review, approval and publication.
      </div>
    </div>
  );
}
