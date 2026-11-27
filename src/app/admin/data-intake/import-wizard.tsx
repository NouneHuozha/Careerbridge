"use client";

import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Download,
  FileSpreadsheet,
  FileUp,
  Info,
  ShieldCheck,
  X,
} from "lucide-react";
import { AdminPageHeader, AdminStatusBadge, AdminSectionCard } from "../admin-ui";
import {
  getCatalogueCategory,
  type CatalogueCategorySlug,
} from "../catalogue/catalogue-preview-data";
import {
  getMissingIntakeFields,
  getImportPreviewSummary,
  isSupportedSpreadsheetFileName,
  type DuplicateResolution,
} from "./data-intake-utils";

const categorySlugs: CatalogueCategorySlug[] = [
  "courses",
  "institutions",
  "campuses",
  "course-offerings",
  "pathways",
  "examinations",
  "scholarships",
];

const institutionIssues = [
  {
    id: "row-4",
    row: 4,
    title: "Missing institution name",
    field: "Record name",
    severity: "error" as const,
    value: "",
    explanation: "Every row needs a record name before it can become a draft candidate.",
  },
  {
    id: "row-9",
    row: 9,
    title: "Possible existing record",
    field: "Record name",
    severity: "warning" as const,
    value: "Assam Down Town University",
    explanation: "This row resembles an existing institution. Choose how to handle it in duplicate review.",
  },
  {
    id: "row-12",
    row: 12,
    title: "Invalid institution type",
    field: "Institution type",
    severity: "error" as const,
    value: "College / university",
    explanation: "Use one of the institution types currently accepted by the Catalogue form.",
  },
  {
    id: "row-18",
    row: 18,
    title: "Missing stable slug",
    field: "Stable slug",
    severity: "error" as const,
    value: "",
    explanation: "A stable slug is required to identify an institution record.",
  },
];

type ValidationIssue = {
  id: string;
  row: number;
  title: string;
  field: string;
  severity: "error" | "warning";
  value: string;
  explanation: string;
};

function getCategoryIssues(categorySlug: CatalogueCategorySlug): ValidationIssue[] {
  const category = getCatalogueCategory(categorySlug);
  const requiredFields = category?.editorFields.filter((field) => field.required) ?? [];
  const firstRequiredField = requiredFields[0]?.label ?? "Record name";
  const secondRequiredField = requiredFields[1]?.label ?? "Record name";
  const recordLabel = category?.singularLabel ?? "record";
  return [
    {
      id: "row-4",
      row: 4,
      title: `Missing ${recordLabel.toLowerCase()} name`,
      field: "Record name",
      severity: "error",
      value: "",
      explanation: "Every row needs a record name before it can become a draft candidate.",
    },
    {
      id: "row-9",
      row: 9,
      title: "Possible existing record",
      field: "Record name",
      severity: "warning",
      value: `Sample ${recordLabel}`,
      explanation: "This row resembles an existing catalogue record. Choose how to handle it in duplicate review.",
    },
    {
      id: "row-12",
      row: 12,
      title: `Invalid ${firstRequiredField.toLowerCase()}`,
      field: firstRequiredField,
      severity: "error",
      value: "Sample invalid value",
      explanation: `Use a value accepted by the current ${recordLabel} Catalogue form.`,
    },
    {
      id: "row-18",
      row: 18,
      title: `Missing ${secondRequiredField.toLowerCase()}`,
      field: secondRequiredField,
      severity: "error",
      value: "",
      explanation: `This required ${secondRequiredField.toLowerCase()} must be present in the row.`,
    },
  ];
}

type ImportColumn = { header: string; target: string };
type WizardStep = 1 | 2 | 3 | 4 | 5;

function getColumns(categorySlug: CatalogueCategorySlug): ImportColumn[] {
  const category = getCatalogueCategory(categorySlug);
  if (!category) return [];
  const optionalFields = category.editorFields.filter((field) => !field.required).slice(0, 2);

  return [
    {
      header: categorySlug === "institutions" ? "College name" : `${category.singularLabel} name`,
      target: "title",
    },
    ...category.editorFields
      .filter((field) => field.required)
      .map((field) => ({ header: field.label, target: field.key })),
    ...optionalFields.map((field) => ({ header: field.label, target: field.key })),
    { header: "Official source URL", target: "sourceReference" },
  ];
}

function getTargetOptions(categorySlug: CatalogueCategorySlug) {
  const category = getCatalogueCategory(categorySlug);
  return [
    { value: "__skip__", label: "Do not import" },
    { value: "title", label: "Record name" },
    ...(category?.editorFields ?? []).map(({ key, label }) => ({ value: key, label })),
    { value: "sourceReference", label: "Supporting source / evidence URL" },
  ];
}

function getRequiredTargets(categorySlug: CatalogueCategorySlug) {
  const category = getCatalogueCategory(categorySlug);
  return ["title", ...(category?.editorFields.filter((field) => field.required).map((field) => field.key) ?? [])];
}

function getRecordName(categorySlug: CatalogueCategorySlug) {
  return getCatalogueCategory(categorySlug)?.singularLabel ?? "record";
}

function saveCsvTemplate(categorySlug: CatalogueCategorySlug) {
  const headers = getColumns(categorySlug).map(({ header }) => `"${header.replace(/"/g, '""')}"`);
  const blob = new Blob([`${headers.join(",")}\r\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${categorySlug}-template.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const actionClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#205b51] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78] disabled:cursor-not-allowed disabled:opacity-45";
const secondaryClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#d6e1dc] bg-white px-4 text-sm font-semibold text-[#405a5e] transition-colors hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]";
const inputClass =
  "min-h-11 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm text-[#405a5e] outline-none focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15";

function StepIndicator({ step }: { step: WizardStep }) {
  const labels = ["Upload", "Map columns", "Validate", "Duplicates", "Summary"];
  return (
    <ol aria-label="Spreadsheet import progress" className="grid grid-cols-5 gap-2">
      {labels.map((label, index) => {
        const number = index + 1;
        const complete = number < step;
        const active = number === step;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="min-w-0">
            <div className={`h-1.5 rounded-full ${complete || active ? "bg-[#377b78]" : "bg-[#e2e9e5]"}`} />
            <div className={`mt-2 truncate text-[11px] font-semibold sm:text-xs ${active ? "text-[#17364a]" : "text-[#71817d]"}`}>
              <span className="mr-1">{number}.</span>{label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ImportWizard() {
  const [step, setStep] = useState<WizardStep>(1);
  const [categorySlug, setCategorySlug] = useState<CatalogueCategorySlug>("institutions");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>(() =>
    Object.fromEntries(getColumns("institutions").map(({ header, target }) => [header, target])),
  );
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [resolvedValues, setResolvedValues] = useState<Record<string, string>>({});
  const [correctionValue, setCorrectionValue] = useState("");
  const [duplicateResolution, setDuplicateResolution] = useState<DuplicateResolution | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const columns = useMemo(() => getColumns(categorySlug), [categorySlug]);
  const targets = useMemo(() => getTargetOptions(categorySlug), [categorySlug]);
  const requiredTargets = useMemo(() => getRequiredTargets(categorySlug), [categorySlug]);
  const issues = useMemo(
    () => categorySlug === "institutions" ? institutionIssues : getCategoryIssues(categorySlug),
    [categorySlug],
  );
  const mappedTargets = new Set(Object.values(mapping).filter((value) => value !== "__skip__"));
  const missingTargets = getMissingIntakeFields(requiredTargets, mapping);
  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId);
  const resolvedErrorCount = Object.keys(resolvedValues).filter(
    (id) => issues.find((issue) => issue.id === id)?.severity === "error",
  ).length;
  const summary = duplicateResolution ? getImportPreviewSummary(duplicateResolution) : null;
  const category = getCatalogueCategory(categorySlug);

  function initializeMapping(nextCategory: CatalogueCategorySlug) {
    setMapping(
      Object.fromEntries(getColumns(nextCategory).map(({ header, target }) => [header, target])),
    );
    setDuplicateResolution(null);
    setResolvedValues({});
    setSelectedIssueId(null);
  }

  function selectFile(fileName: string) {
    if (!isSupportedSpreadsheetFileName(fileName)) {
      setFileError("Choose a CSV, XLS or XLSX file. File contents are not read or uploaded in this preview.");
      return;
    }
    setSelectedFileName(fileName);
    setFileError("");
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) selectFile(file.name);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) selectFile(file.name);
    event.target.value = "";
  }

  function markIssueResolved() {
    if (!selectedIssue || !correctionValue.trim()) return;
    setResolvedValues((current) => ({ ...current, [selectedIssue.id]: correctionValue.trim() }));
    setSelectedIssueId(null);
    setCorrectionValue("");
  }

  function continueTo(nextStep: WizardStep) {
    setStep(nextStep);
    setSelectedIssueId(null);
    setCorrectionValue("");
  }

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6">
      <AdminPageHeader
        eyebrow="Data intake / Spreadsheet import"
        title="Import a spreadsheet"
        description="A guided five-step preview: upload, map, validate, reconcile duplicates and review the proposed outcome."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d6e4dd] bg-[#edf6f1] px-4 py-3">
        <p className="text-sm leading-5 text-[#526c67]">
          <strong className="font-semibold text-[#286c60]">Preview only.</strong>{" "}
          The selected file stays in your browser. This flow does not read its contents, upload it or create records.
        </p>
        <AdminStatusBadge tone="accent">Step {step} of 5</AdminStatusBadge>
      </div>

      <div className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
        <StepIndicator step={step} />
      </div>

      {step === 1 && (
        <AdminSectionCard
          id="spreadsheet-upload"
          title="1. Choose a record type and spreadsheet"
          description="Start with the catalogue type, then select a file or load the example workbook preview."
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)]">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Record type</span>
              <span className="relative block">
                <select
                  value={categorySlug}
                  onChange={(event) => {
                    const nextCategory = event.target.value as CatalogueCategorySlug;
                    setCategorySlug(nextCategory);
                    initializeMapping(nextCategory);
                  }}
                  className={`${inputClass} appearance-none pr-10`}
                >
                  {categorySlugs.map((slug) => (
                    <option key={slug} value={slug}>{getCatalogueCategory(slug)?.label ?? slug}</option>
                  ))}
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3 size-4 text-[#71817d]" />
              </span>
              <span className="mt-2 block text-xs leading-5 text-[#71817d]">
                Related records such as campuses and course offerings can be imported separately.
              </span>
            </label>

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
              className="flex min-h-56 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#cbd9d2] bg-[#f8faf8] px-5 py-7 text-center"
            >
              <span className="grid size-12 place-items-center rounded-full bg-white text-[#377b78] shadow-sm">
                <FileUp aria-hidden="true" className="size-6" />
              </span>
              <p className="mt-3 text-sm font-semibold text-[#17364a]">Drop a spreadsheet here or choose a file</p>
              <p className="mt-1 text-xs text-[#71817d]">CSV, XLS or XLSX · file contents will not be read</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                className="sr-only"
                aria-label="Choose a spreadsheet file"
                onChange={handleFileChange}
              />
              <button type="button" onClick={() => fileInputRef.current?.click()} className={`${secondaryClass} mt-4 min-h-10`}>
                Browse files
              </button>
              {selectedFileName && (
                <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#286c60]">
                  <FileSpreadsheet aria-hidden="true" className="size-4" />
                  {selectedFileName}
                  <button
                    type="button"
                    aria-label="Clear selected file"
                    onClick={() => setSelectedFileName("")}
                    className="rounded p-1 text-[#71817d] hover:bg-[#e8efeb]"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </p>
              )}
              {fileError && <p role="alert" className="mt-3 text-sm text-[#a34c3d]">{fileError}</p>}
              <button
                type="button"
                onClick={() => {
                  setSelectedFileName(`${categorySlug}.xlsx`);
                  setFileError("");
                }}
                className="mt-3 text-xs font-semibold text-[#286c60] underline underline-offset-2"
              >
                Use example workbook instead
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7ede9] pt-4">
            <button type="button" onClick={() => saveCsvTemplate(categorySlug)} className={secondaryClass}>
              <Download aria-hidden="true" className="size-4" />
              Download CSV template
            </button>
            <button
              type="button"
              onClick={() => continueTo(2)}
              disabled={!selectedFileName}
              className={actionClass}
            >
              Continue to mapping
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        </AdminSectionCard>
      )}

      {step === 2 && (
        <AdminSectionCard
          id="spreadsheet-mapping"
          title="2. Map spreadsheet columns"
          description="Match each example column to a field accepted by the selected Catalogue form. Unmapped columns are skipped."
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f8faf8] px-4 py-3">
            <span className="text-sm text-[#526b72]">
              File selected: <strong className="font-semibold text-[#17364a]">{selectedFileName || "Example workbook"}</strong>
            </span>
            <span className="text-xs text-[#71817d]">Displayed columns are a schema preview, not parsed file data.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e3eae6] text-xs uppercase tracking-wide text-[#71817d]">
                  <th scope="col" className="pb-3 pr-4 font-semibold">Spreadsheet column</th>
                  <th scope="col" className="pb-3 pr-4 font-semibold">Example value</th>
                  <th scope="col" className="pb-3 font-semibold">CareerBridge field</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ee]">
                {columns.map(({ header, target }, index) => (
                  <tr key={header}>
                    <td className="py-3 pr-4 font-medium text-[#17364a]">{header}</td>
                    <td className="py-3 pr-4 text-[#71817d]">
                      {index === 0 ? "Example value" : target === "sourceReference" ? "https://example.org/..." : "Sample"}
                    </td>
                    <td className="py-2">
                      <select
                        aria-label={`Map ${header} to a Catalogue field`}
                        value={mapping[header] ?? target}
                        onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value }))}
                        className={`${inputClass} min-h-10`}
                      >
                        {targets.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#e5e9d8] bg-[#fbfaf3] px-4 py-3 text-sm leading-5 text-[#6e6742]">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              Required Catalogue fields must each be mapped. A source URL is provenance only; it does not verify every claim in a row.
            </p>
          </div>
          <p aria-live="polite" className="mt-3 text-sm text-[#526b72]">
            {mappedTargets.size} mapped field{mappedTargets.size === 1 ? "" : "s"} ·{" "}
            {columns.length - Object.values(mapping).filter((value) => value !== "__skip__").length} skipped columns
            {missingTargets.length > 0 && (
              <span className="ml-2 font-semibold text-[#a34c3d]">
                Required mapping missing: {missingTargets.map((key) => targets.find((option) => option.value === key)?.label ?? key).join(", ")}
              </span>
            )}
          </p>
          <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-[#e7ede9] pt-4">
            <button type="button" onClick={() => continueTo(1)} className={secondaryClass}>
              <ArrowLeft aria-hidden="true" className="size-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => continueTo(3)}
              disabled={missingTargets.length > 0}
              className={actionClass}
            >
              Validate rows <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        </AdminSectionCard>
      )}

      {step === 3 && (
        <AdminSectionCard
          id="spreadsheet-validation"
          title="3. Validation results"
          description="Review required-field errors and warnings before choosing how possible duplicates should be handled."
        >
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Valid rows", value: 18 + resolvedErrorCount, icon: Check, color: "text-[#286c60] bg-[#edf6f1]" },
              { label: "Warnings", value: 4, icon: Info, color: "text-[#856d25] bg-[#fbf6e8]" },
              { label: "Errors", value: 3 - resolvedErrorCount, icon: CircleAlert, color: "text-[#a34c3d] bg-[#fbefed]" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border border-[#e1e9e4] p-4">
                <span className={`grid size-10 place-items-center rounded-lg ${color}`}><Icon aria-hidden="true" className="size-5" /></span>
                <div>
                  <p className="text-2xl font-semibold leading-none text-[#17364a]">{value}</p>
                  <p className="mt-1 text-sm text-[#657976]">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e3eae6] text-xs uppercase tracking-wide text-[#71817d]">
                  <th scope="col" className="pb-3 pr-4 font-semibold">Row</th>
                  <th scope="col" className="pb-3 pr-4 font-semibold">Issue</th>
                  <th scope="col" className="pb-3 pr-4 font-semibold">Field</th>
                  <th scope="col" className="pb-3 pr-4 font-semibold">Preview correction</th>
                  <th scope="col" className="pb-3 pr-4 font-semibold">Severity</th>
                  <th scope="col" className="pb-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ee]">
                {issues.map((issue) => {
                  const resolved = resolvedValues[issue.id] !== undefined;
                  return (
                    <tr key={issue.id} className={resolved ? "opacity-60" : ""}>
                      <td className="py-3 pr-4 text-[#526b72]">{issue.row}</td>
                      <td className="py-3 pr-4 font-medium text-[#17364a]">{issue.title}</td>
                      <td className="py-3 pr-4 text-[#526b72]">{issue.field}</td>
                      <td className="py-3 pr-4 text-[#526b72]">{resolvedValues[issue.id] ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <AdminStatusBadge tone={resolved ? "accent" : "muted"}>
                          {resolved ? "Resolved in preview" : issue.severity}
                        </AdminStatusBadge>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          disabled={resolved}
                          onClick={() => {
                            setSelectedIssueId(issue.id);
                            setCorrectionValue(issue.value);
                          }}
                          className="font-semibold text-[#286c60] hover:underline disabled:text-[#71817d]"
                        >
                          {issue.severity === "warning" ? "Review duplicate" : resolved ? "Resolved" : "Inspect row"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedIssue && (
            <div className="mt-5 rounded-xl border border-[#dce5e0] bg-[#f8faf8] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">Row {selectedIssue.row} · {selectedIssue.field}</p>
                  <h3 className="mt-1 text-base font-semibold text-[#17364a]">{selectedIssue.title}</h3>
                  <p className="mt-1 text-sm text-[#657976]">{selectedIssue.explanation}</p>
                </div>
                <button type="button" onClick={() => setSelectedIssueId(null)} aria-label="Close row details" className="rounded p-1 text-[#71817d] hover:bg-white">
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>
              {selectedIssue.severity === "warning" ? (
                <button type="button" onClick={() => continueTo(4)} className={`${secondaryClass} mt-4`}>
                  Continue to duplicate review <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-[#405a5e]">Corrected value in this preview</span>
                    <input
                      autoFocus
                      value={correctionValue}
                      onChange={(event) => setCorrectionValue(event.target.value)}
                      placeholder={`Enter ${selectedIssue.field.toLowerCase()}`}
                      className={inputClass}
                    />
                  </label>
                  <button type="button" onClick={markIssueResolved} disabled={!correctionValue.trim()} className={`${actionClass} self-end`}>
                    Mark corrected
                  </button>
                </div>
              )}
              <p className="mt-3 text-xs text-[#71817d]">This correction changes only the displayed sample state; no selected file is modified.</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-[#e7ede9] pt-4">
            <button type="button" onClick={() => continueTo(2)} className={secondaryClass}>
              <ArrowLeft aria-hidden="true" className="size-4" /> Back to mapping
            </button>
            <button type="button" onClick={() => continueTo(4)} className={actionClass}>
              Review duplicates <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        </AdminSectionCard>
      )}

      {step === 4 && (
        <AdminSectionCard
          id="spreadsheet-duplicates"
          title="4. Reconcile duplicates and preview"
          description="Compare a possible match and choose one explicit outcome. No record or revision is written."
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div className="rounded-xl border border-[#e1e9e4] bg-[#f8faf8] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">Spreadsheet row 9</p>
                  <h3 className="mt-1 text-lg font-semibold text-[#17364a]">
                    {categorySlug === "institutions" ? "Assam Down Town University" : `Sample ${getRecordName(categorySlug)}`}
                  </h3>
                </div>
                <AdminStatusBadge tone="muted">Possible match</AdminStatusBadge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[#e3eae6] bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">Existing catalogue preview</p>
                  <p className="mt-2 text-sm font-semibold text-[#17364a]">
                    {categorySlug === "institutions" ? "Assam Down Town University" : `Sample ${getRecordName(categorySlug)}`}
                  </p>
                  <p className="mt-1 text-xs text-[#657976]">{category?.singularLabel} · current revision preview</p>
                </div>
                <div className="rounded-lg border border-[#e3eae6] bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#71817d]">Spreadsheet row</p>
                  <p className="mt-2 text-sm font-semibold text-[#17364a]">
                    {categorySlug === "institutions" ? "Assam Down Town University" : `Sample ${getRecordName(categorySlug)}`}
                  </p>
                  <p className="mt-1 text-xs text-[#657976]">Example row · details not read from file</p>
                </div>
              </div>
              <fieldset className="mt-5">
                <legend className="text-sm font-semibold text-[#17364a]">Choose how to handle this possible duplicate</legend>
                <div className="mt-3 grid gap-2">
                  {[
                    ["use-existing", "Use existing record", "Prepare a revision candidate for reviewer comparison."],
                    ["create-new", "Create a new record", "Prepare a new draft candidate despite the possible match."],
                    ["skip", "Skip this row", "Exclude this row from the illustrative outcome."],
                  ].map(([value, label, description]) => (
                    <label key={value} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${duplicateResolution === value ? "border-[#57958a] bg-[#edf6f1]" : "border-[#dfe8e3] bg-white"}`}>
                      <input
                        type="radio"
                        name="duplicateResolution"
                        value={value}
                        checked={duplicateResolution === value}
                        onChange={() => setDuplicateResolution(value as DuplicateResolution)}
                        className="mt-1 accent-[#286c60]"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-[#17364a]">{label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-[#657976]">{description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck aria-hidden="true" className="size-5 text-[#377b78]" />
                <h3 className="text-base font-semibold text-[#17364a]">Illustrative import outcome</h3>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#71817d]">Example counts only; not calculated from the selected file.</p>
              <dl className="mt-4 divide-y divide-[#edf1ee]">
                {[
                  ["New draft candidates", summary?.newDraftCandidates ?? 12],
                  ["Revision candidates", summary?.revisionCandidates ?? 4],
                  ["Skipped rows", summary?.skippedRows ?? 2],
                  ["Failed rows", summary?.failedRows ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 py-3">
                    <dt className="text-sm text-[#526b72]">{label}</dt>
                    <dd className="text-lg font-semibold tabular-nums text-[#17364a]">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 rounded-lg bg-[#f8faf8] p-3 text-xs leading-5 text-[#657976]">
                Unresolved validation errors remain excluded from a real import. This preview does not create draft candidates.
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-[#e7ede9] pt-4">
            <button type="button" onClick={() => continueTo(3)} className={secondaryClass}>
              <ArrowLeft aria-hidden="true" className="size-4" /> Back to validation
            </button>
            <button type="button" onClick={() => continueTo(5)} disabled={!duplicateResolution} className={actionClass}>
              Prepare summary preview <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        </AdminSectionCard>
      )}

      {step === 5 && summary && (
        <AdminSectionCard
          id="spreadsheet-summary"
          title="5. Import summary preview"
          description="Review the example outcome. Finishing this wizard does not save a job or send any data."
        >
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[#cfe3da] bg-[#edf6f1] p-4 sm:p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#377b68]">Preview scenario prepared</p>
              <h3 className="mt-1 text-lg font-semibold text-[#17364a]">{selectedFileName}</h3>
              <p className="mt-1 text-sm text-[#526c67]">
                {category?.label ?? "Catalogue"} · {duplicateResolution === "use-existing" ? "possible match becomes a revision candidate" : duplicateResolution === "create-new" ? "possible match becomes a new draft candidate" : "possible match is skipped"}
              </p>
            </div>
            <AdminStatusBadge tone="accent">Example only · not saved</AdminStatusBadge>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Draft candidates", summary.newDraftCandidates],
              ["Revision candidates", summary.revisionCandidates],
              ["Skipped rows", summary.skippedRows],
              ["Failed rows", summary.failedRows],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[#e1e9e4] p-4">
                <p className="text-sm text-[#657976]">{label}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-[#17364a]">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#e1e9e4] bg-[#f8faf8] p-4">
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#377b78]" />
            <p className="text-sm leading-6 text-[#526b72]">
              <strong className="font-semibold text-[#17364a]">Nothing has been imported.</strong>{" "}
              The selected file was not read or uploaded. These counts are illustrative and no catalogue records, revisions or intake history entries were created.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-[#e7ede9] pt-4">
            <button type="button" onClick={() => continueTo(4)} className={secondaryClass}>
              <ArrowLeft aria-hidden="true" className="size-4" /> Back to duplicate review
            </button>
            <div className="flex flex-wrap gap-3">
              {category && (
                <Link href={`/admin/catalogue/${categorySlug}`} className={secondaryClass}>
                  View Catalogue preview
                </Link>
              )}
              <Link href="/admin/data-intake" className={actionClass}>
                Finish preview <Check aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </AdminSectionCard>
      )}
    </div>
  );
}
