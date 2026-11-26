import "server-only";
import { connection } from "next/server";
import {
  getDemoScholarshipForDevelopment,
  getPublishedScholarship,
  listDemoScholarshipsForDevelopment,
  listPublishedScholarships,
} from "../../../db/scholarships";
import type { Scholarship } from "../../../db/scholarship-types";
import { scholarships as localExamples } from "./scholarship-data";

function localDemos(): Scholarship[] {
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
function addMissingLocalDemos(records: Scholarship[]) {
  const ids = new Set(records.map((record) => record.id));
  return [...records, ...localDemos().filter((record) => !ids.has(record.id))];
}

export async function listScholarshipsForUi(): Promise<Scholarship[]> {
  await connection();
  if (isLocalFallback()) return localDemos();
  const published = await listPublishedScholarships();
  if (process.env.NODE_ENV !== "development") return published;
  return addMissingLocalDemos([...published, ...await listDemoScholarshipsForDevelopment()]);
}

export async function getScholarshipForUi(identifier: string): Promise<Scholarship | null> {
  await connection();
  if (isLocalFallback()) return localDemos().find((item) => item.id === identifier) ?? null;
  const published = await getPublishedScholarship(identifier);
  if (published || process.env.NODE_ENV !== "development") return published;
  const databaseDemo = await getDemoScholarshipForDevelopment(identifier);
  return databaseDemo ?? localDemos().find((item) => item.id === identifier) ?? null;
}
