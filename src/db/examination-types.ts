import type { CatalogueRecordMetadata } from "./catalogue-types";

export type ExaminationStage = "class-10" | "class-12";
export type ExaminationLevel = "national" | "state" | "institution";

export type Examination = CatalogueRecordMetadata & {
  id: string;
  name: string;
  level: ExaminationLevel;
  stages: ExaminationStage[];
  purpose: string;
  programmes: string[];
  authority: string;
  regions: string[];
  fields: string[];
  officialUrl?: string;
};
