import "server-only";
import { connection } from "next/server";
import {
  getDemoExaminationForDevelopment,
  getPublishedExamination,
  listDemoExaminationsForDevelopment,
  listPublishedExaminations,
} from "../../../db/examinations";
import type { Examination } from "../../../db/examination-types";
import { examinations as localExamples } from "./examination-data";

function localDemos(): Examination[] {
  return localExamples.map((item) => ({
    ...item,
    dataClassification: "demo",
    verificationStatus: "unverified",
    publicationStatus: "draft",
    sources: [],
  }));
}
function isLocalFallback() {
  return process.env.NODE_ENV === "development" && !process.env.DATABASE_URL;
}
function addMissingLocalDemos(records: Examination[]) {
  const ids = new Set(records.map((record) => record.id));
  return [...records, ...localDemos().filter((record) => !ids.has(record.id))];
}

export async function listExaminationsForUi(): Promise<Examination[]> {
  await connection();
  if (isLocalFallback()) return localDemos();
  const published = await listPublishedExaminations();
  if (process.env.NODE_ENV !== "development") return published;
  return addMissingLocalDemos([...published, ...await listDemoExaminationsForDevelopment()]);
}

export async function getExaminationForUi(identifier: string): Promise<Examination | null> {
  await connection();
  if (isLocalFallback()) return localDemos().find((item) => item.id === identifier) ?? null;
  const published = await getPublishedExamination(identifier);
  if (published || process.env.NODE_ENV !== "development") return published;
  const databaseDemo = await getDemoExaminationForDevelopment(identifier);
  return databaseDemo ?? localDemos().find((item) => item.id === identifier) ?? null;
}
