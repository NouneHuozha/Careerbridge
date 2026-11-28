"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Link2, Plus, Trash2, X } from "lucide-react";
import type { FieldContent } from "../../../../db/fields";

const fieldSections = [
  { key: "introduction", label: "Introduction" },
  { key: "broadlyInvolves", label: "What does this field involve?" },
  { key: "activitiesAndWorkAreas", label: "Activities and work areas" },
  { key: "learningAndSubjectConnections", label: "Learning and subject connections" },
  { key: "courseFamiliesToExplore", label: "Courses to explore" },
  { key: "furtherExploration", label: "Further exploration" },
] as const satisfies readonly { key: keyof FieldContent; label: string }[];

type FieldSectionKey = (typeof fieldSections)[number]["key"];
type SourceDraft = {
  id: string;
  sourceName: string;
  authority: string;
  canonicalUrl: string;
  claimField: FieldSectionKey;
};
type ExistingField = {
  id: string;
  latestRevisionId: string;
  hasImage: boolean;
  title: string;
  summary: string | null;
  description: string | null;
  content: Partial<FieldContent>;
  sources: Array<{
    id: string;
    name: string;
    authority: string | null;
    url: string | null;
    claimKey: string;
  }>;
};

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-[#d7e1dc] bg-white px-3 py-2 text-sm text-[#17364a] outline-none placeholder:text-[#879590] focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15";
const textAreaClass =
  "mt-1.5 min-h-24 w-full resize-y rounded-lg border border-[#d7e1dc] bg-white px-3 py-2.5 text-sm leading-6 text-[#17364a] outline-none placeholder:text-[#879590] focus:border-[#4c8980] focus:ring-2 focus:ring-[#4c8980]/15";

export function CreateFieldForm({ existingField }: { existingField?: ExistingField }) {
  const router = useRouter();
  const [name, setName] = useState(existingField?.title ?? "");
  const [summary, setSummary] = useState(existingField?.summary ?? "");
  const [description, setDescription] = useState(existingField?.description ?? "");
  const [content, setContent] = useState<Partial<FieldContent>>(existingField?.content ?? {});
  const [sources, setSources] = useState<SourceDraft[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageAction, setImageAction] = useState<"keep" | "replace" | "remove">("keep");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [savingStatus, setSavingStatus] = useState<"draft" | "in_review" | null>(null);
  const initialValues = {
    name: existingField?.title ?? "",
    summary: existingField?.summary ?? "",
    description: existingField?.description ?? "",
    content: existingField?.content ?? {},
    sources: [] as SourceDraft[],
    imageAction: "keep",
    imageFileName: null,
  };
  const isDirty = JSON.stringify({
    name,
    summary,
    description,
    content,
    sources,
    imageAction,
    imageFileName: imageFile?.name ?? null,
  }) !==
    JSON.stringify(initialValues);

  useEffect(
    () => () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    },
    [imagePreviewUrl],
  );

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isDirty]);

  function chooseImage(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB.");
      return;
    }
    setError("");
    setImageFile(file);
    setImageAction("replace");
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  const currentImageUrl = imagePreviewUrl ?? (
    imageAction === "keep" && existingField?.hasImage
      ? `/api/admin/catalogue/fields/${encodeURIComponent(existingField.id)}/image`
      : null
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null;
    const publicationStatus =
      submitter instanceof HTMLButtonElement && submitter.value === "in_review"
        ? "in_review"
        : "draft";
    if (publicationStatus === "in_review") {
      const missing = fieldSections
        .filter(({ key }) => !content[key]?.trim())
        .map(({ label }) => label);
      if (missing.length > 0) {
        setError(`Complete these sections before marking the Field ready for review: ${missing.join(", ")}.`);
        return;
      }
    }
    setError("");
    setSavingStatus(publicationStatus);
    try {
      const formData = new FormData();
      formData.append("draft", JSON.stringify({
        name,
        summary,
        description,
        content,
        publicationStatus,
        ...(existingField ? { expectedRevisionId: existingField.latestRevisionId } : {}),
        sources: sources.map(({ sourceName, authority, canonicalUrl, claimField }) => ({
          sourceName,
          authority,
          canonicalUrl,
          claimField,
        })),
      }));
      formData.append("imageAction", imageAction);
      if (imageFile) formData.append("image", imageFile);
      const response = await fetch(
        existingField
          ? `/api/admin/catalogue/fields/${encodeURIComponent(existingField.id)}`
          : "/api/admin/catalogue/fields",
        {
          method: existingField ? "PUT" : "POST",
          body: formData,
        },
      );
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "The Field draft could not be saved.";
        throw new Error(message);
      }

      if (
        typeof result !== "object" ||
        result === null ||
        !("id" in result) ||
        typeof result.id !== "string"
      ) {
        throw new Error("The Field was saved, but its record link could not be loaded.");
      }
      router.push(`/admin/catalogue/fields/${encodeURIComponent(result.id)}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The Field draft could not be saved. Please try again.",
      );
    } finally {
      setSavingStatus(null);
    }
  }

  function addSource() {
    setSources((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        sourceName: "",
        authority: "",
        canonicalUrl: "",
        claimField: "introduction",
      },
    ]);
  }

  function updateSource<K extends keyof Omit<SourceDraft, "id">>(
    id: string,
    key: K,
    value: SourceDraft[K],
  ) {
    setSources((current) =>
      current.map((source) => (source.id === id ? { ...source, [key]: value } : source)),
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section
        aria-labelledby="field-basic-information"
        className="rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-6"
      >
        <h2 id="field-basic-information" className="text-base font-semibold text-[#17364a]">
          Basic information
        </h2>
        <div className="mt-5 grid gap-5">
          <label className="block text-sm font-medium text-[#405a5e]">
            Field name <span className="text-[#a34c3f]">*</span>
            <input
              autoFocus
              required
              maxLength={160}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Agriculture and Environment"
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium text-[#405a5e]">
            Short summary
            <textarea
              maxLength={500}
              rows={2}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="A brief explanation of this field..."
              className={textAreaClass}
            />
          </label>
          <label className="block text-sm font-medium text-[#405a5e]">
            Description
            <textarea
              maxLength={4000}
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Additional context about this field..."
              className={textAreaClass}
            />
          </label>
        </div>
      </section>

      <section
        aria-labelledby="field-image-heading"
        className="rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-6"
      >
        <h2 id="field-image-heading" className="text-base font-semibold text-[#17364a]">
          Field image
        </h2>
        <p className="mt-1 text-sm leading-5 text-[#657976]">
          JPEG, PNG or WebP, up to 5 MB. Changes appear to students only after this revision is published.
        </p>
        {currentImageUrl ? (
          <div className="mt-4 flex flex-wrap items-start gap-4">
            <div className="relative aspect-[3/2] w-48 overflow-hidden rounded-lg bg-[#eaf2ed]">
              <Image
                src={currentImageUrl}
                alt={`Image for ${name || "this Field"}`}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setImageFile(null);
                setImagePreviewUrl(null);
                setImageAction("remove");
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#e5c4bf] px-3 text-sm font-semibold text-[#8a3f35] hover:bg-[#fff7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a3f35]"
            >
              <X aria-hidden="true" className="size-4" />
              Remove image
            </button>
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-[#d6e1dc] bg-[#f8faf8] px-4 py-3 text-sm text-[#657976]">
            No image selected.
          </p>
        )}
        <label className="mt-4 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#d7e1dc] px-3 text-sm font-semibold text-[#286c60] transition-colors hover:bg-[#f4f7f5] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#377b78]">
          <ImagePlus aria-hidden="true" className="size-4" />
          {currentImageUrl ? "Replace image" : "Choose image"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              chooseImage(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </section>

      <section
        aria-labelledby="field-content-heading"
        className="rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-6"
      >
        <h2 id="field-content-heading" className="text-base font-semibold text-[#17364a]">
          Field content
        </h2>
        <p className="mt-1 text-sm leading-5 text-[#657976]">
          Add the explanation now or save a draft and complete it later.
        </p>
        <div className="mt-5 space-y-4">
          {fieldSections.map(({ key, label }, index) => (
            <label key={key} className="block text-sm font-medium text-[#405a5e]">
              {index + 1}. {label}
              <textarea
                maxLength={4000}
                rows={3}
                value={content[key] ?? ""}
                onChange={(event) =>
                  setContent((current) => ({ ...current, [key]: event.target.value }))
                }
                placeholder="Add content..."
                className={textAreaClass}
              />
            </label>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="field-sources-heading"
        className="rounded-xl border border-[#dce5e0] bg-white p-4 shadow-[0_1px_2px_rgba(23,54,74,0.04)] sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="field-sources-heading" className="text-base font-semibold text-[#17364a]">
              Sources and evidence
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-[#657976]">
              Sources can be linked to Field content now or added during later review.
            </p>
          </div>
          <button
            type="button"
            onClick={addSource}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d7e1dc] px-3 text-sm font-semibold text-[#286c60] transition-colors hover:bg-[#f4f7f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add source
          </button>
        </div>

        {existingField && existingField.sources.length > 0 && (
          <div className="mt-4 rounded-lg border border-[#e2e9e5] bg-[#f8faf8] p-4">
            <h3 className="text-sm font-semibold text-[#17364a]">Existing source links</h3>
            <p className="mt-1 text-xs leading-5 text-[#657976]">
              These links will carry into the new revision as unverified evidence.
            </p>
            <ul className="mt-3 divide-y divide-[#e2e9e5]">
              {existingField.sources.map((source, index) => (
                <li key={`${source.id}:${source.claimKey}:${index}`} className="py-2 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-[#405a5e]">{source.name}</p>
                  <p className="mt-0.5 break-all text-xs text-[#657976]">
                    {source.claimKey}{source.authority ? ` · ${source.authority}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {sources.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-[#d6e1dc] bg-[#f8faf8] px-4 py-3 text-sm text-[#657976]">
            No sources added yet.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {sources.map((source, index) => (
              <fieldset key={source.id} className="rounded-lg border border-[#e2e9e5] p-4">
                <legend className="px-1 text-sm font-semibold text-[#17364a]">
                  Source {index + 1}
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-[#405a5e]">
                    Source name <span className="text-[#a34c3f]">*</span>
                    <input
                      required
                      maxLength={200}
                      value={source.sourceName}
                      onChange={(event) => updateSource(source.id, "sourceName", event.target.value)}
                      placeholder="Official source name"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm font-medium text-[#405a5e]">
                    Authority
                    <input
                      maxLength={200}
                      value={source.authority}
                      onChange={(event) => updateSource(source.id, "authority", event.target.value)}
                      placeholder="Publishing organisation"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm font-medium text-[#405a5e] sm:col-span-2">
                    HTTPS source URL <span className="text-[#a34c3f]">*</span>
                    <input
                      required
                      type="url"
                      maxLength={2048}
                      value={source.canonicalUrl}
                      onChange={(event) => updateSource(source.id, "canonicalUrl", event.target.value)}
                      placeholder="https://example.org/source"
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm font-medium text-[#405a5e] sm:col-span-2">
                    Supports
                    <select
                      value={source.claimField}
                      onChange={(event) => {
                        const selected = fieldSections.find(
                          (section) => section.key === event.target.value,
                        )?.key;
                        if (selected) updateSource(source.id, "claimField", selected);
                      }}
                      className={inputClass}
                    >
                      {fieldSections.map(({ key, label }) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setSources((current) => current.filter((entry) => entry.id !== source.id))}
                  className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[#8a5148] hover:bg-[#fbf4f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a5148]"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Remove source
                </button>
              </fieldset>
            ))}
          </div>
        )}
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#657976]">
          <Link2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Added sources are recorded as unverified evidence and never publish this Field.
        </p>
      </section>

      {error && (
        <p role="alert" className="rounded-lg border border-[#e9c9c4] bg-[#fff7f5] px-4 py-3 text-sm text-[#8a3f35]">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-[#dbe4df] pt-5 sm:flex-row sm:justify-end">
        <Link
          href={existingField
            ? `/admin/catalogue/fields/${encodeURIComponent(existingField.id)}`
            : "/admin/catalogue/fields"}
          onClick={(event) => {
            if (isDirty && !window.confirm("Discard your unsaved changes?")) event.preventDefault();
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d7e1dc] px-4 text-sm font-semibold text-[#526b72] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#377b78]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          name="publicationStatus"
          value="draft"
          disabled={savingStatus !== null}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#d7e1dc] bg-white px-5 text-sm font-semibold text-[#286c60] transition-colors hover:bg-[#f4f7f5] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#286c60]"
        >
          {savingStatus === "draft"
            ? "Saving draft..."
            : existingField
              ? "Save Draft"
              : "Save as Draft"}
        </button>
        <button
          type="submit"
          name="publicationStatus"
          value="in_review"
          disabled={savingStatus !== null}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#b45309] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#92400e] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b45309]"
        >
          {savingStatus === "in_review" ? "Saving for review..." : "Mark Ready for Review"}
        </button>
      </div>
    </form>
  );
}
