export type CatalogueClassification = "real" | "demo" | "test";

export type CatalogueEvidence = {
  sourceId: string;
  sourceName: string;
  authority: string | null;
  canonicalUrl: string | null;
  normalizedUrl: string | null;
  sourceType: string;
  sourceStatus: string;
  claimKey: string;
  checkedAt: string | null;
  verifiedAt: string | null;
  verificationStatus: string | null;
};

export type CatalogueRecordMetadata = {
  catalogItemId?: string;
  revisionId?: string;
  revisionNumber?: number;
  dataClassification?: CatalogueClassification;
  verificationStatus?: string;
  publicationStatus?: string;
  sources?: CatalogueEvidence[];
};
