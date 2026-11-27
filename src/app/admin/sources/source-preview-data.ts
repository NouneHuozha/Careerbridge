export type SourceAuthorityCategory =
  | "official"
  | "government"
  | "institutional"
  | "other";

export type SourceStatus = "active" | "inactive";
export type SourceCheckOutcome = "successful" | "failed" | "changes_detected";

export type SourceLinkedClaim = {
  id: string;
  label: string;
  value: string;
  recordLabel: string;
  recordHref: string;
  assessment: "verified" | "needs_review" | "unavailable";
};

export type SourceLinkedRecord = {
  id: string;
  title: string;
  category: string;
  href: string;
  claimCount: number;
};

export type SourceCheckAttempt = {
  id: string;
  method: "Manual check" | "URL check" | "Document check";
  checkedAt: string;
  outcome: SourceCheckOutcome;
  summary: string;
  url: string;
  detectedChanges?: string[];
  errorDetails?: string;
};

export type SourcePreviewRecord = {
  id: string;
  name: string;
  url: string;
  description: string;
  authorityCategory: SourceAuthorityCategory;
  isOfficial: boolean;
  sourceType: "Website" | "Document" | "PDF" | "Other";
  issuingOrganisation: string;
  registeredAt: string;
  lastCheckedAt: string | null;
  status: SourceStatus;
  accessMethod: "Manual" | "URL check" | "Document";
  checkingFrequency: "Not scheduled" | "Weekly" | "Monthly" | "Quarterly";
  internalNotes: string;
  claims: SourceLinkedClaim[];
  records: SourceLinkedRecord[];
  attempts: SourceCheckAttempt[];
};

export const SOURCE_PREVIEW_AS_OF = "2026-11-27";

export const sourcePreviewRecords: SourcePreviewRecord[] = [
  {
    id: "assam-down-town-university",
    name: "Assam Down Town University",
    url: "https://adtu.in/",
    description:
      "Official institutional website used to verify information about the university.",
    authorityCategory: "institutional",
    isOfficial: true,
    sourceType: "Website",
    issuingOrganisation: "Assam Down Town University",
    registeredAt: "2026-10-12",
    lastCheckedAt: "2026-10-15",
    status: "active",
    accessMethod: "Manual",
    checkingFrequency: "Monthly",
    internalNotes: "Review the relevant page before relying on time-sensitive details.",
    claims: [
      {
        id: "institution-name",
        label: "Institution name",
        value: "Assam Down Town University",
        recordLabel: "Institution · CB-INST-001",
        recordHref: "/admin/catalogue/institutions/CB-INST-001",
        assessment: "verified",
      },
    ],
    records: [
      {
        id: "CB-INST-001",
        title: "Assam Down Town University",
        category: "Institution",
        href: "/admin/catalogue/institutions/CB-INST-001",
        claimCount: 1,
      },
      {
        id: "CB-OFFER-003",
        title: "BCA offering — Assam Down Town University",
        category: "Course offering",
        href: "/admin/catalogue/course-offerings/CB-OFFER-003",
        claimCount: 2,
      },
    ],
    attempts: [
      {
        id: "adtu-manual-2026-10-15",
        method: "Manual check",
        checkedAt: "2026-10-15T09:30:00.000Z",
        outcome: "successful",
        summary: "Source page checked; no change assessment recorded.",
        url: "https://adtu.in/",
      },
    ],
  },
  {
    id: "national-testing-agency",
    name: "National Testing Agency",
    url: "https://nta.ac.in/",
    description:
      "Government source registered for examination information in the catalogue preview.",
    authorityCategory: "government",
    isOfficial: true,
    sourceType: "Website",
    issuingOrganisation: "National Testing Agency",
    registeredAt: "2026-10-20",
    lastCheckedAt: "2026-11-24",
    status: "active",
    accessMethod: "URL check",
    checkingFrequency: "Monthly",
    internalNotes: "",
    claims: [
      {
        id: "neet-name",
        label: "Examination name",
        value: "National Eligibility cum Entrance Test (NEET)",
        recordLabel: "Examination · CB-EXAM-003",
        recordHref: "/admin/catalogue/examinations/CB-EXAM-003",
        assessment: "verified",
      },
    ],
    records: [
      {
        id: "CB-EXAM-003",
        title: "National Eligibility cum Entrance Test (NEET)",
        category: "Examination",
        href: "/admin/catalogue/examinations/CB-EXAM-003",
        claimCount: 1,
      },
    ],
    attempts: [
      {
        id: "nta-url-2026-11-24",
        method: "URL check",
        checkedAt: "2026-11-24T07:15:00.000Z",
        outcome: "failed",
        summary: "The illustrative check could not confirm the source page.",
        url: "https://nta.ac.in/",
        errorDetails:
          "Preview-only failure detail. No request was made to the source during this UI preview.",
      },
      {
        id: "nta-manual-2026-10-22",
        method: "Manual check",
        checkedAt: "2026-10-22T11:00:00.000Z",
        outcome: "successful",
        summary: "A previous sample check was recorded for this source.",
        url: "https://nta.ac.in/",
      },
    ],
  },
  {
    id: "sample-official-document",
    name: "Sample official guidance document",
    url: "https://example.org/guidance.pdf",
    description:
      "Illustrative PDF entry showing how a reusable document source appears in the registry.",
    authorityCategory: "official",
    isOfficial: true,
    sourceType: "PDF",
    issuingOrganisation: "Sample issuing organisation",
    registeredAt: "2026-09-10",
    lastCheckedAt: "2026-11-20",
    status: "active",
    accessMethod: "Document",
    checkingFrequency: "Quarterly",
    internalNotes: "",
    claims: [],
    records: [],
    attempts: [
      {
        id: "sample-changes-2026-11-20",
        method: "Document check",
        checkedAt: "2026-11-20T08:20:00.000Z",
        outcome: "changes_detected",
        summary: "A sample change was flagged for human review.",
        url: "https://example.org/guidance.pdf",
        detectedChanges: ["Document revision metadata differs from the previous sample."],
      },
    ],
  },
  {
    id: "archived-directory-snapshot",
    name: "Archived directory snapshot",
    url: "https://example.org/archive",
    description:
      "Illustrative inactive source retained to demonstrate the maintenance and history views.",
    authorityCategory: "other",
    isOfficial: false,
    sourceType: "Other",
    issuingOrganisation: "Preview source",
    registeredAt: "2026-08-01",
    lastCheckedAt: null,
    status: "inactive",
    accessMethod: "Manual",
    checkingFrequency: "Not scheduled",
    internalNotes: "Inactive preview record; not used as current evidence.",
    claims: [],
    records: [],
    attempts: [],
  },
];

export function getSourcePreviewById(sourceId: string) {
  return sourcePreviewRecords.find((source) => source.id === sourceId);
}

export function getSourceLabel(sourceId: string) {
  return getSourcePreviewById(sourceId)?.name ??
    sourceId.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getSourceCheckAttempt(sourceId: string, attemptId: string) {
  return getSourcePreviewById(sourceId)?.attempts.find(
    (attempt) => attempt.id === attemptId,
  );
}
