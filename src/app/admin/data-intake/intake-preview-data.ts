import type { CatalogueCategorySlug } from "../catalogue/catalogue-preview-data";

export type IntakeJobKind = "import" | "manual" | "research";

export type IntakeJobPreview = {
  id: string;
  title: string;
  kind: IntakeJobKind;
  status: "preview_completed" | "preview_pending";
  createdAt: string;
  categorySlug?: CatalogueCategorySlug;
  recordTypeLabel: string;
  recordsLabel: string;
  detail: string;
};

export const intakeJobPreviews: IntakeJobPreview[] = [
  {
    id: "preview-job-0001",
    title: "institutions.xlsx",
    kind: "import",
    status: "preview_completed",
    createdAt: "2026-11-27T10:42:00.000Z",
    categorySlug: "institutions",
    recordTypeLabel: "Institutions",
    recordsLabel: "25 example rows",
    detail: "Example spreadsheet validation and duplicate-reconciliation summary.",
  },
  {
    id: "preview-job-0002",
    title: "University programme research",
    kind: "research",
    status: "preview_pending",
    createdAt: "2026-11-27T09:18:00.000Z",
    categorySlug: "courses",
    recordTypeLabel: "Course",
    recordsLabel: "Not started",
    detail: "Illustrative research request. No source was fetched and no job was created.",
  },
];

export const manualEntryTypes = [
  {
    id: "field",
    label: "Field",
    description: "A subject or area of study.",
    categorySlug: null,
  },
  {
    id: "course",
    label: "Course",
    description: "A programme or course of study.",
    categorySlug: "courses",
  },
  {
    id: "institution",
    label: "Institution",
    description: "A university, college or education provider.",
    categorySlug: "institutions",
  },
  {
    id: "pathway",
    label: "Pathway",
    description: "A route from study to a further opportunity.",
    categorySlug: "pathways",
  },
  {
    id: "examination",
    label: "Examination",
    description: "An entrance or qualifying examination.",
    categorySlug: "examinations",
  },
  {
    id: "scholarship",
    label: "Scholarship",
    description: "A scholarship or other education support.",
    categorySlug: "scholarships",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  description: string;
  categorySlug: CatalogueCategorySlug | null;
}>;

export type ManualEntryTypeKey = (typeof manualEntryTypes)[number]["id"];

export function getIntakeJobPreview(id: string) {
  return intakeJobPreviews.find((job) => job.id === id);
}

export function getManualEntryType(id: string) {
  return manualEntryTypes.find((type) => type.id === id);
}
