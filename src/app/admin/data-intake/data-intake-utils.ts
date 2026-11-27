import type { IntakeJobKind, IntakeJobPreview } from "./intake-preview-data";

export type DuplicateResolution = "use-existing" | "create-new" | "skip";

export function isSupportedSpreadsheetFileName(fileName: string) {
  return /\.(csv|xls|xlsx)$/i.test(fileName.trim());
}

export function getMissingIntakeFields(
  requiredFields: readonly string[],
  mapping: Readonly<Record<string, string>>,
) {
  const mappedFields = new Set(Object.values(mapping).filter((value) => value !== "__skip__"));
  return requiredFields.filter((field) => !mappedFields.has(field));
}

export function filterIntakeJobs(
  jobs: readonly IntakeJobPreview[],
  query: string,
  kind: IntakeJobKind | "all",
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return jobs
    .filter((job) => kind === "all" || job.kind === kind)
    .filter(
      (job) =>
        !normalizedQuery ||
        [job.title, job.recordTypeLabel, job.detail, job.id]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedQuery),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getImportPreviewSummary(resolution: DuplicateResolution) {
  return {
    newDraftCandidates: resolution === "create-new" ? 13 : 12,
    revisionCandidates: resolution === "use-existing" ? 4 : 3,
    skippedRows: resolution === "skip" ? 3 : 2,
    failedRows: 0,
  };
}
