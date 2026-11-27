"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { AlertTriangle, ArrowLeft, FilePenLine, ShieldAlert } from "lucide-react";
import { AdminPageHeader, AdminStatusBadge } from "../admin-ui";
import type {
  CatalogueCategoryDefinition,
  CatalogueEditorField,
  CataloguePreviewDetail,
} from "./catalogue-preview-data";
import type { CatalogueListingRecord } from "./listing-utils";

const commonFields: CatalogueEditorField[] = [
  {
    key: "title",
    label: "Record name",
    type: "text" as const,
    required: true,
    placeholder: "Enter the record name",
  },
  {
    key: "summary",
    label: "Summary",
    type: "textarea" as const,
    placeholder: "A short summary for catalogue listings",
  },
  {
    key: "description",
    label: "Description",
    type: "textarea" as const,
    placeholder: "Add relevant information",
  },
];

export function RevisionEditor({
  category,
  record,
  detail,
}: {
  category: CatalogueCategoryDefinition;
  record: CatalogueListingRecord;
  detail: CataloguePreviewDetail;
}) {
  const router = useRouter();
  const recordHref = `/admin/catalogue/${category.slug}/${record.id}`;
  const initialValues = useMemo<Record<string, string>>(
    () => ({
      title: record.title,
      summary: record.summary ?? "",
      description: detail.description,
      ...record.formValues,
    }),
    [detail.description, record],
  );
  const [values, setValues] = useState(initialValues);
  const [notice, setNotice] = useState("");
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const discardButtonRef = useRef<HTMLButtonElement>(null);
  const currentHrefRef = useRef("");

  const allFields = [...commonFields, ...category.editorFields];
  const changedFields = allFields.filter(
    (field) => (values[field.key] ?? "") !== (initialValues[field.key] ?? ""),
  );
  const dirty = changedFields.length > 0;
  const canEdit = ["published", "archived", "rejected", "draft"].includes(
    record.publicationStatus,
  );

  useEffect(() => {
    currentHrefRef.current =
      window.location.pathname + window.location.search + window.location.hash;
  }, []);

  useEffect(() => {
    if (!dirty) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target || anchor.download) return;

      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname + destination.search + destination.hash === currentHrefRef.current
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(destination.pathname + destination.search + destination.hash);
      setShowUnsavedDialog(true);
    };

    const handlePopState = () => {
      const destination =
        window.location.pathname + window.location.search + window.location.hash;
      window.history.pushState({}, "", currentHrefRef.current);
      setPendingHref(destination);
      setShowUnsavedDialog(true);
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty]);

  useEffect(() => {
    if (showUnsavedDialog) discardButtonRef.current?.focus();
  }, [showUnsavedDialog]);

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setNotice("");
  }

  function requestLeave(href = recordHref) {
    if (dirty) {
      setPendingHref(href);
      setShowUnsavedDialog(true);
      return;
    }
    router.push(href);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(
      dirty
        ? "This UI preview does not save catalogue changes. Your edits are still on this page."
        : "No changes have been made to save.",
    );
  }

  function discardAndLeave() {
    setShowUnsavedDialog(false);
    if (pendingHref) router.push(pendingHref);
  }

  if (!canEdit) {
    return (
      <div className="space-y-5">
        <AdminPageHeader
          eyebrow={`Catalogue / ${category.label} / ${record.aliases[0] ?? record.id}`}
          title="Revision editing unavailable"
          description="The current lifecycle state does not allow changes from this workspace."
        />
        <section role="status" className="rounded-xl border border-[#dce5e0] bg-white p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f7f9f7] text-[#657976]">
              <ShieldAlert aria-hidden="true" className="size-[18px]" />
            </span>
            <div>
              <h2 className="font-semibold text-[#17364a]">This action is not available</h2>
              <p className="mt-1 text-sm leading-5 text-[#657976]">
                Revision status: {record.publicationStatus.replace("_", " ")}. Use the existing review or lifecycle flow for this state.
              </p>
            </div>
          </div>
          <Link
            href={recordHref}
            className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-[#cbdcd4] px-3 text-sm font-semibold text-[#377b78] hover:bg-[#f1f6f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
          >
            Return to record
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow={`Catalogue / ${category.label} / ${record.aliases[0] ?? record.id}`}
          title={record.publicationStatus === "draft" ? "Edit draft revision" : "Edit information"}
          description="Create a new draft revision. Published history remains unchanged."
        />
        <AdminStatusBadge tone="muted">Preview only</AdminStatusBadge>
      </div>

      <div className="flex flex-wrap items-start gap-3 rounded-xl border border-[#d4e0ea] bg-[#f2f6f9] p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[#496b85]">
          <FilePenLine aria-hidden="true" className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#17364a]">
            {record.publicationStatus === "published"
              ? `Current revision ${record.currentRevision ?? "—"} · Published`
              : `Current revision ${record.currentRevision ?? "—"} · ${record.publicationStatus.replace("_", " ")}`}
          </p>
          <p className="mt-1 text-sm leading-5 text-[#526b72]">
            This page demonstrates the new-revision workflow. No edits are persisted in this phase.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf1ee] pb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#17364a]">{category.singularLabel} information</h2>
              <p className="mt-1 text-sm text-[#657976]">
                Fields follow the current catalogue revision schema.
              </p>
            </div>
            <span className="text-xs font-medium text-[#71817d]">Required fields are marked *</span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {allFields.map((field) => {
              const value = values[field.key] ?? "";
              const fullWidth = field.type === "textarea" || field.type === "multiselect";
              return (
                <label
                  key={field.key}
                  className={`block min-w-0 ${fullWidth ? "md:col-span-2" : ""}`}
                >
                  <span className="text-sm font-semibold text-[#405a5e]">
                    {field.label}
                    {field.required && <span className="ml-1 text-[#a34c3f]">*</span>}
                  </span>
                  {field.type === "textarea" ? (
                    <textarea
                      required={field.required}
                      value={value}
                      onChange={(event) => updateValue(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      rows={field.key === "description" ? 5 : 3}
                      className="mt-2 w-full resize-y rounded-lg border border-[#d7e1dc] bg-white px-3 py-2.5 text-sm leading-5 text-[#17364a] outline-none transition placeholder:text-[#97a39f] focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
                    />
                  ) : field.type === "select" ? (
                    <select
                      required={field.required}
                      value={value}
                      onChange={(event) => updateValue(field.key, event.target.value)}
                      className="mt-2 h-11 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm text-[#405a5e] outline-none transition focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
                    >
                      <option value="">Select {field.label.toLowerCase()}</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : field.type === "multiselect" ? (
                    <select
                      multiple
                      value={value.split("\n").filter(Boolean)}
                      onChange={(event) =>
                        updateValue(
                          field.key,
                          Array.from(event.currentTarget.selectedOptions, (option) => option.value).join("\n"),
                        )
                      }
                      className="mt-2 min-h-28 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 py-2 text-sm text-[#405a5e] outline-none transition focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
                    >
                      {field.options?.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required={field.required}
                      type={field.type}
                      value={value}
                      onChange={(event) => updateValue(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      className="mt-2 h-11 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 text-sm text-[#17364a] outline-none transition placeholder:text-[#97a39f] focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15"
                    />
                  )}
                  {field.helpText && (
                    <span className="mt-1 block text-xs leading-5 text-[#71817d]">{field.helpText}</span>
                  )}
                </label>
              );
            })}
          </div>
          {category.itemType === "pathway" && (
            <p className="mt-4 rounded-lg border border-[#e5e9e6] bg-[#f7f9f7] p-3 text-xs leading-5 text-[#657976]">
              Structured route steps and progression details are intentionally not editable in this preview; they require the existing pathway contract.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#17364a]">Sources and evidence</h2>
              <p className="mt-1 text-sm text-[#657976]">Existing source associations are read-only here.</p>
            </div>
            <button
              type="button"
              disabled
              title="The Sources registry is not connected in this preview."
              className="min-h-10 cursor-not-allowed rounded-lg border border-[#dce5e0] px-3 text-sm font-semibold text-[#87938f]"
            >
              Associate another source
            </button>
          </div>
          {detail.sources.length > 0 ? (
            <ul className="mt-4 divide-y divide-[#edf1ee]">
              {detail.sources.map((source) => (
                <li key={source.name} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#405a5e]">{source.name}</p>
                    <p className="mt-1 text-xs text-[#71817d]">
                      {source.publisher} · {source.authority} · checked {source.checkedAt}
                    </p>
                  </div>
                  <AdminStatusBadge tone="accent">Associated</AdminStatusBadge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-[#d6e1dc] bg-[#f8faf8] p-4 text-sm text-[#657976]">
              No supporting sources are associated in this preview.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-[#dce5e0] bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#17364a]">Change summary</h2>
              <p className="mt-1 text-sm text-[#657976]">
                {changedFields.length === 0
                  ? "No fields have changed."
                  : `${changedFields.length} ${changedFields.length === 1 ? "field has" : "fields have"} changed in this local preview.`}
              </p>
            </div>
            <AdminStatusBadge tone={changedFields.length > 0 ? "accent" : "muted"}>
              {changedFields.length > 0 ? "Unsaved edits" : "No changes"}
            </AdminStatusBadge>
          </div>
          {changedFields.length > 0 && (
            <ul className="mt-4 divide-y divide-[#edf1ee]">
              {changedFields.map((field) => (
                <li key={field.key} className="grid gap-2 py-3 text-sm sm:grid-cols-[minmax(8rem,0.35fr)_1fr]">
                  <span className="font-semibold text-[#405a5e]">{field.label}</span>
                  <span className="break-words text-[#657976]">
                    <span className="line-through decoration-[#a34c3f]/60">
                      {initialValues[field.key] || "Empty"}
                    </span>
                    <span aria-hidden="true" className="mx-2 text-[#9aa9a5]">→</span>
                    <span className="font-medium text-[#286c60]">{values[field.key] || "Empty"}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {notice && (
          <p role="status" className="rounded-lg border border-[#d4e0ea] bg-[#f2f6f9] px-4 py-3 text-sm text-[#496b85]">
            {notice}
          </p>
        )}

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce5e0] bg-white/95 p-3 shadow-[0_6px_20px_rgba(23,54,74,0.08)] backdrop-blur sm:px-4">
          <button
            type="button"
            onClick={() => requestLeave()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#526b72] hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Cancel
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-[#71817d]">Preview only · no revision will be saved</span>
            <button
              type="submit"
              className="min-h-11 rounded-lg bg-[#286c60] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#205a50] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#286c60]"
            >
              Save draft revision
            </button>
          </div>
        </div>
      </form>

      {showUnsavedDialog && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#102c37]/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowUnsavedDialog(false);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="unsaved-dialog-title"
            aria-describedby="unsaved-dialog-description"
            className="w-full max-w-md rounded-xl border border-[#dce5e0] bg-white p-5 shadow-xl sm:p-6"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-[#fbf6e8] text-[#80652e]">
              <AlertTriangle aria-hidden="true" className="size-5" />
            </span>
            <h2 id="unsaved-dialog-title" className="mt-4 text-lg font-semibold text-[#17364a]">
              You have unsaved changes
            </h2>
            <p id="unsaved-dialog-description" className="mt-2 text-sm leading-6 text-[#657976]">
              Leave this page without saving your changes?
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUnsavedDialog(false)}
                className="min-h-10 rounded-lg border border-[#d7e1dc] px-3 text-sm font-semibold text-[#405a5e] hover:bg-[#f7f9f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#377b78]"
              >
                Continue editing
              </button>
              <button
                ref={discardButtonRef}
                type="button"
                onClick={discardAndLeave}
                className="min-h-10 rounded-lg bg-[#8b5147] px-3 text-sm font-semibold text-white hover:bg-[#75443c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5147]"
              >
                Discard changes
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
