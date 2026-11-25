export type EducationStage = "class-10" | "class-12";

export type PathwayEvidence = {
  sourceId: string;
  sourceName: string;
  authority: string | null;
  canonicalUrl: string | null;
  normalizedUrl: string | null;
  claimKey: string;
  checkedAt: string | null;
  verifiedAt: string | null;
  verificationStatus: string | null;
};

export type StudyRoute = {
  id: string;
  stage: EducationStage;
  catalogueGroup: string;
  category: string;
  title: string;
  description: string;
  steps: string[];
  introduction: string;
  progression: {
    title: string;
    description: string;
    nextStage?: string;
  }[];
  qualification: {
    title: string;
    description: string;
  };
  considerations: {
    title: string;
    description: string;
  }[];
  furtherProgression?: string;
  references?: string[];
  courseStage: EducationStage;
  catalogItemId?: string;
  revisionId?: string;
  revisionNumber?: number;
  dataClassification?: "real" | "demo" | "test";
  verificationStatus?: string;
  publicationStatus?: string;
  sources?: PathwayEvidence[];
};
