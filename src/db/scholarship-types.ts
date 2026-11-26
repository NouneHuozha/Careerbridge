import type { CatalogueRecordMetadata } from "./catalogue-types";

export const scholarshipStudyLevels = [
  { value: "school", label: "School" },
  { value: "higher-secondary", label: "Higher secondary" },
  { value: "diploma-iti", label: "Diploma / ITI" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "postgraduate", label: "Postgraduate" },
  { value: "research-other", label: "Research / Other" },
] as const;

export type ScholarshipStudyLevel =
  (typeof scholarshipStudyLevels)[number]["value"];
export type ScholarshipStatus = "open" | "upcoming" | "closed" | "unknown";
export type ScholarshipEligibility = { title: string; description: string };
export type ScholarshipDetail = {
  benefitNotes?: string[];
  eligibility?: ScholarshipEligibility[];
  applicationMethod?: string;
  applicationSteps?: string[];
  afterApplication?: string;
  documents?: string[];
  renewal?: string;
  /** Labels retained only for legacy development examples; not source evidence. */
  sourceTitle?: string;
  sourceYear?: string;
  lastChecked?: string;
  relatedCourses?: { name: string; href: string }[];
  relatedInstitutions?: { name: string; href: string }[];
};

export type Scholarship = CatalogueRecordMetadata & {
  id: string;
  name: string;
  category: string;
  provider: string;
  purpose: string;
  support: string;
  studyLevels: ScholarshipStudyLevel[];
  eligibilityRegions: "all" | string[];
  status: ScholarshipStatus;
  officialUrl?: string;
  detail: ScholarshipDetail;
};
