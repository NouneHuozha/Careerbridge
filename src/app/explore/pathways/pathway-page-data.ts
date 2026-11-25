import "server-only";
import { connection } from "next/server";

import {
  getDemoPathwayForDevelopment,
  getPublishedPathway,
  listDemoPathwaysForDevelopment,
  listPublishedPathways,
} from "../../../db/pathways";
import type { StudyRoute } from "../../../db/pathway-types";
import { studyRoutes } from "./route-data";

function localDemoRoutes(): StudyRoute[] {
  return studyRoutes.map((route) => ({
    ...route,
    dataClassification: "demo",
    verificationStatus: "unverified",
    publicationStatus: "draft",
    sources: [],
  }));
}

function developmentFallbackAllowed() {
  return process.env.NODE_ENV === "development" && !process.env.DATABASE_URL;
}

export async function listPathwaysForUi(): Promise<StudyRoute[]> {
  await connection();
  if (developmentFallbackAllowed()) return localDemoRoutes();

  const published = await listPublishedPathways();
  if (process.env.NODE_ENV !== "development") return published;

  const demos = await listDemoPathwaysForDevelopment();
  const databaseRoutes = [...published, ...demos];
  const databaseIds = new Set(databaseRoutes.map((route) => route.id));
  return [...databaseRoutes, ...localDemoRoutes().filter((route) => !databaseIds.has(route.id))];
}

export async function getPathwayForUi(identifier: string): Promise<StudyRoute | null> {
  await connection();
  if (developmentFallbackAllowed()) {
    return localDemoRoutes().find((route) => route.id === identifier) ?? null;
  }

  const published = await getPublishedPathway(identifier);
  if (published || process.env.NODE_ENV !== "development") return published;
  const databaseDemo = await getDemoPathwayForDevelopment(identifier);
  if (databaseDemo) return databaseDemo;
  return localDemoRoutes().find((route) => route.id === identifier) ?? null;
}
