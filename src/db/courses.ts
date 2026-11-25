import "server-only";

import {
  aliasedTable,
  and,
  arrayContains,
  asc,
  desc,
  eq,
  isNotNull,
  or,
} from "drizzle-orm";
import { getDb } from "./client";
import {
  catalogItemAliases,
  catalogItemRevisions,
  catalogItems,
  courseRevisions,
} from "./schema/catalog";

const courseAliasTable = catalogItemAliases;
const fieldAliasTable = aliasedTable(catalogItemAliases, "course_field_alias");
const courseQualifications = [
  "Higher secondary",
  "Degree",
  "Diploma",
  "Certificate",
  "Vocational",
  "Professional",
  "Skill training",
] as const;
const courseStages = ["class-10", "class-12"] as const;

export type CourseStage = (typeof courseStages)[number];
export type CourseQualification = (typeof courseQualifications)[number];

export type CourseAlias = {
  sourceSystem: string;
  externalType: string;
  externalKey: string;
  externalContextKey: string;
};

export type CourseLearningArea = {
  title: string;
  description: string;
  [key: string]: unknown;
};

export type CourseContent = {
  learningAreas: CourseLearningArea[];
  simpleExplanation?: string;
  learningExperience?: CourseLearningArea[];
  admission?: string;
  providerDescription?: string;
  [key: string]: unknown;
};

export type CourseContext = {
  fieldId?: string;
  stage?: CourseStage | "all";
};

export type Course = {
  id: string;
  catalogItemId: string;
  name: string;
  description: string;
  fieldId: string;
  qualification: CourseQualification;
  stages: CourseStage[];
  entryAfterClass10: string;
  entryAfterClass12: string;
  isExplorationCategory: boolean;
  overview: string;
  learningAreas: CourseLearningArea[];
  simpleExplanation?: string;
  learningExperience?: CourseLearningArea[];
  admission?: string;
  providerDescription?: string;
  courseContent: CourseContent;
  aliases: CourseAlias[];
};

type CourseQueryMode = "published" | "demo";

type CourseQueryRow = {
  catalogItemId: string;
  revisionId: string;
  revisionNumber: number;
  title: string;
  summary: string | null;
  overview: string | null;
  qualification: string;
  stages: string[];
  entryAfterClass10: string;
  entryAfterClass12: string;
  isExplorationCategory: boolean;
  courseContent: unknown;
  aliasSourceSystem: string | null;
  aliasExternalType: string | null;
  aliasExternalKey: string | null;
  aliasExternalContextKey: string | null;
  fieldAliasExternalKey: string | null;
};

type CourseQueryState = {
  revisionId: string;
  revisionNumber: number;
  course: Omit<Course, "aliases" | "fieldId" | "id"> & {
    aliases: Map<string, CourseAlias>;
    fieldId: string;
    id: string | null;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCourseQualification(value: string): value is CourseQualification {
  return courseQualifications.some((qualification) => qualification === value);
}

function isCourseStage(value: string): value is CourseStage {
  return courseStages.some((stage) => stage === value);
}

function mapCourseStages(value: string[]): CourseStage[] {
  const stages: CourseStage[] = [];
  for (const stage of value) {
    if (!isCourseStage(stage)) {
      throw new Error(`Unsupported course stage "${stage}".`);
    }
    stages.push(stage);
  }
  return stages;
}

function mapLearningAreas(value: unknown, property: string): CourseLearningArea[] {
  if (!Array.isArray(value)) {
    throw new Error(`Course content property "${property}" must be an array.`);
  }

  return value.map((entry, index) => {
    if (
      !isRecord(entry) ||
      typeof entry.title !== "string" ||
      typeof entry.description !== "string"
    ) {
      throw new Error(`Course content property "${property}[${index}]" is invalid.`);
    }
    return { ...entry, title: entry.title, description: entry.description };
  });
}

function mapCourseContent(value: unknown): CourseContent {
  if (!isRecord(value)) {
    throw new Error("Course content must be a JSON object.");
  }

  const content: CourseContent = {
    ...value,
    learningAreas: mapLearningAreas(value.learningAreas, "learningAreas"),
  };

  if (Object.prototype.hasOwnProperty.call(value, "simpleExplanation")) {
    if (typeof value.simpleExplanation !== "string") {
      throw new Error('Course content property "simpleExplanation" must be a string.');
    }
    content.simpleExplanation = value.simpleExplanation;
  }
  if (Object.prototype.hasOwnProperty.call(value, "learningExperience")) {
    content.learningExperience = mapLearningAreas(
      value.learningExperience,
      "learningExperience",
    );
  }
  if (Object.prototype.hasOwnProperty.call(value, "admission")) {
    if (typeof value.admission !== "string") {
      throw new Error('Course content property "admission" must be a string.');
    }
    content.admission = value.admission;
  }
  if (Object.prototype.hasOwnProperty.call(value, "providerDescription")) {
    if (typeof value.providerDescription !== "string") {
      throw new Error('Course content property "providerDescription" must be a string.');
    }
    content.providerDescription = value.providerDescription;
  }

  return content;
}

function mapCourseRows(rows: CourseQueryRow[], latestDemoRevision = false): Course[] {
  const courses = new Map<string, CourseQueryState>();

  for (const row of rows) {
    let state = courses.get(row.catalogItemId);
    if (state && state.revisionId !== row.revisionId) {
      if (latestDemoRevision && row.revisionNumber < state.revisionNumber) continue;
      if (!latestDemoRevision || row.revisionNumber === state.revisionNumber) {
        throw new Error(`Course ${row.catalogItemId} has conflicting selected revisions.`);
      }
      state = undefined;
    }

    if (!state) {
      if (
        typeof row.summary !== "string" ||
        typeof row.overview !== "string" ||
        !isCourseQualification(row.qualification) ||
        !Array.isArray(row.stages) ||
        typeof row.entryAfterClass10 !== "string" ||
        typeof row.entryAfterClass12 !== "string" ||
        typeof row.isExplorationCategory !== "boolean"
      ) {
        throw new Error(`Course ${row.catalogItemId} has invalid typed revision data.`);
      }

      const stages = mapCourseStages(row.stages);
      const content = mapCourseContent(row.courseContent);
      state = {
        revisionId: row.revisionId,
        revisionNumber: row.revisionNumber,
        course: {
          id: null,
          catalogItemId: row.catalogItemId,
          name: row.title,
          description: row.summary,
          fieldId: "",
          qualification: row.qualification,
          stages,
          entryAfterClass10: row.entryAfterClass10,
          entryAfterClass12: row.entryAfterClass12,
          isExplorationCategory: row.isExplorationCategory,
          overview: row.overview,
          learningAreas: content.learningAreas,
          ...(content.simpleExplanation === undefined
            ? {}
            : { simpleExplanation: content.simpleExplanation }),
          ...(content.learningExperience === undefined
            ? {}
            : { learningExperience: content.learningExperience }),
          ...(content.admission === undefined ? {} : { admission: content.admission }),
          ...(content.providerDescription === undefined
            ? {}
            : { providerDescription: content.providerDescription }),
          courseContent: content,
          aliases: new Map(),
        },
      };
      courses.set(row.catalogItemId, state);
    }

    if (row.fieldAliasExternalKey !== null) {
      if (
        state.course.fieldId &&
        state.course.fieldId !== row.fieldAliasExternalKey
      ) {
        throw new Error(`Course ${row.catalogItemId} resolves to multiple field IDs.`);
      }
      state.course.fieldId = row.fieldAliasExternalKey;
    }

    if (
      row.aliasSourceSystem !== null &&
      row.aliasExternalType !== null &&
      row.aliasExternalKey !== null &&
      row.aliasExternalContextKey !== null
    ) {
      const alias: CourseAlias = {
        sourceSystem: row.aliasSourceSystem,
        externalType: row.aliasExternalType,
        externalKey: row.aliasExternalKey,
        externalContextKey: row.aliasExternalContextKey,
      };
      state.course.aliases.set(JSON.stringify(alias), alias);

      if (
        alias.sourceSystem === "careerbridge" &&
        alias.externalType === "course" &&
        !alias.externalContextKey
      ) {
        if (state.course.id !== null && state.course.id !== alias.externalKey) {
          throw new Error(`Course ${row.catalogItemId} has multiple canonical CareerBridge IDs.`);
        }
        state.course.id = alias.externalKey;
      }
    }
  }

  return [...courses.values()]
    .map(({ course }) => {
      const id = course.id;
      const fieldId = course.fieldId;
      if (!id) {
        throw new Error(`Course ${course.catalogItemId} has no canonical CareerBridge course ID.`);
      }
      if (!fieldId) {
        throw new Error(`Course ${course.catalogItemId} has no canonical CareerBridge field ID.`);
      }
      return { ...course, id, fieldId, aliases: [...course.aliases.values()] };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function contextConditions(context: CourseContext) {
  if (
    context.stage !== undefined &&
    context.stage !== "all" &&
    !courseStages.includes(context.stage)
  ) {
    throw new Error(`Unsupported course stage "${context.stage}".`);
  }

  return [
    context.fieldId && context.fieldId !== "all"
      ? eq(fieldAliasTable.externalKey, context.fieldId)
      : undefined,
    context.stage && context.stage !== "all"
      ? arrayContains(courseRevisions.stages, [context.stage])
      : undefined,
  ];
}

async function selectCourseRows(
  database: ReturnType<typeof getDb>,
  mode: CourseQueryMode,
  catalogItemId?: string,
  context: CourseContext = {},
) {
  const revisionJoin =
    mode === "published"
      ? and(
          eq(catalogItemRevisions.id, catalogItems.publishedRevisionId),
          eq(catalogItemRevisions.catalogItemId, catalogItems.id),
        )
      : eq(catalogItemRevisions.catalogItemId, catalogItems.id);

  return database
    .select({
      catalogItemId: catalogItems.id,
      revisionId: catalogItemRevisions.id,
      revisionNumber: catalogItemRevisions.revisionNumber,
      title: catalogItemRevisions.title,
      summary: catalogItemRevisions.summary,
      overview: catalogItemRevisions.description,
      qualification: courseRevisions.qualification,
      stages: courseRevisions.stages,
      entryAfterClass10: courseRevisions.entryAfterClass10,
      entryAfterClass12: courseRevisions.entryAfterClass12,
      isExplorationCategory: courseRevisions.isExplorationCategory,
      courseContent: courseRevisions.courseContent,
      aliasSourceSystem: courseAliasTable.sourceSystem,
      aliasExternalType: courseAliasTable.externalType,
      aliasExternalKey: courseAliasTable.externalKey,
      aliasExternalContextKey: courseAliasTable.externalContextKey,
      fieldAliasExternalKey: fieldAliasTable.externalKey,
    })
    .from(catalogItems)
    .innerJoin(catalogItemRevisions, revisionJoin)
    .innerJoin(courseRevisions, eq(courseRevisions.revisionId, catalogItemRevisions.id))
    .leftJoin(
      courseAliasTable,
      and(
        eq(courseAliasTable.catalogItemId, catalogItems.id),
        eq(courseAliasTable.externalType, "course"),
        eq(courseAliasTable.externalContextKey, ""),
      ),
    )
    .leftJoin(
      fieldAliasTable,
      and(
        eq(fieldAliasTable.catalogItemId, courseRevisions.fieldItemId),
        eq(fieldAliasTable.sourceSystem, "careerbridge"),
        eq(fieldAliasTable.externalType, "field"),
        eq(fieldAliasTable.externalContextKey, ""),
      ),
    )
    .where(
      and(
        eq(catalogItems.itemType, "course"),
        mode === "published" ? isNotNull(catalogItems.publishedRevisionId) : undefined,
        eq(
          catalogItemRevisions.publicationStatus,
          mode === "published" ? "published" : "draft",
        ),
        eq(
          catalogItemRevisions.dataClassification,
          mode === "published" ? "real" : "demo",
        ),
        catalogItemId ? eq(catalogItems.id, catalogItemId) : undefined,
        ...contextConditions(context),
      ),
    )
    .orderBy(
      asc(catalogItems.id),
      desc(catalogItemRevisions.revisionNumber),
      asc(courseAliasTable.externalKey),
    );
}

async function resolveCourseItemId(
  database: ReturnType<typeof getDb>,
  identifier: string,
): Promise<string | null> {
  const identifierMatches = [eq(courseAliasTable.externalKey, identifier)];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)) {
    identifierMatches.push(eq(catalogItems.id, identifier));
  }

  const matches = await database
    .select({ catalogItemId: catalogItems.id })
    .from(catalogItems)
    .leftJoin(
      courseAliasTable,
      and(
        eq(courseAliasTable.catalogItemId, catalogItems.id),
        eq(courseAliasTable.externalType, "course"),
        eq(courseAliasTable.externalContextKey, ""),
      ),
    )
    .where(and(eq(catalogItems.itemType, "course"), or(...identifierMatches)));
  const itemIds = [...new Set(matches.map((match) => match.catalogItemId))];
  if (itemIds.length > 1) {
    throw new Error(`Course identifier "${identifier}" resolves to multiple catalogue items.`);
  }
  return itemIds[0] ?? null;
}

export async function listPublishedCourses(
  context: CourseContext = {},
): Promise<Course[]> {
  const rows = await selectCourseRows(getDb(), "published", undefined, context);
  return mapCourseRows(rows);
}

export async function getPublishedCourse(
  identifier: string,
  context: CourseContext = {},
): Promise<Course | null> {
  if (!identifier) return null;

  const database = getDb();
  const catalogItemId = await resolveCourseItemId(database, identifier);
  if (!catalogItemId) return null;

  const rows = await selectCourseRows(database, "published", catalogItemId, context);
  return mapCourseRows(rows)[0] ?? null;
}

function assertDevelopmentPreviewEnvironment() {
  const vercelEnvironment = process.env.VERCEL_ENV;
  const hosted = Boolean(process.env.VERCEL);
  if (
    process.env.NODE_ENV !== "development" ||
    (vercelEnvironment !== undefined && vercelEnvironment !== "development") ||
    (hosted && vercelEnvironment !== "development")
  ) {
    throw new Error("Course demo preview is available only in a development environment.");
  }
}

export async function listDemoCoursesForDevelopment(
  context: CourseContext = {},
): Promise<Course[]> {
  assertDevelopmentPreviewEnvironment();
  const rows = await selectCourseRows(getDb(), "demo", undefined, context);
  return mapCourseRows(rows, true);
}

export async function getDemoCourseForDevelopment(
  identifier: string,
  context: CourseContext = {},
): Promise<Course | null> {
  assertDevelopmentPreviewEnvironment();
  if (!identifier) return null;

  const database = getDb();
  const catalogItemId = await resolveCourseItemId(database, identifier);
  if (!catalogItemId) return null;

  const rows = await selectCourseRows(database, "demo", catalogItemId, context);
  return mapCourseRows(rows, true)[0] ?? null;
}
