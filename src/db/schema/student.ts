import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { catalogItems } from "./catalog";

export const studentProfiles = pgTable(
  "student_profiles",
  {
    userId: integer("user_id").primaryKey(),
    educationStage: text("education_stage"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "student_profiles_education_stage_check",
      sql`${table.educationStage} IS NULL OR ${table.educationStage} IN ('class-10', 'class-12')`,
    ),
  ],
);

export const discoverAnswers = pgTable(
  "discover_answers",
  {
    userId: integer("user_id").primaryKey(),
    answers: jsonb("answers")
      .$type<Record<string, unknown> & { activityIds: string[] }>()
      .notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("discover_answers_schema_version_check", sql`${table.schemaVersion} >= 1`),
    check(
      "discover_answers_shape_check",
      sql`jsonb_typeof(${table.answers}) = 'object'
          AND ${table.answers} ? 'activityIds'
          AND jsonb_typeof(${table.answers}->'activityIds') = 'array'
          AND jsonb_array_length(${table.answers}->'activityIds') <= 3`,
    ),
  ],
);

export const guidedExplorerSessions = pgTable(
  "guided_explorer_sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull(),
    version: integer("version").notNull().default(1),
    questionBankVersion: integer("question_bank_version").notNull(),
    status: text("status").notNull(),
    completionReason: text("completion_reason"),
    currentQuestionId: text("current_question_id"),
    resumeQuestionId: text("resume_question_id"),
    pathIndex: integer("path_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("guided_explorer_sessions_user_idx").on(table.userId),
    index("guided_explorer_sessions_status_idx").on(table.status),
    uniqueIndex("guided_explorer_sessions_one_current_per_user")
      .on(table.userId)
      .where(sql`${table.status} IN ('active', 'paused')`),
    check("guided_explorer_sessions_id_check", sql`${table.id} <> ''`),
    check("guided_explorer_sessions_version_check", sql`${table.version} = 1`),
    check(
      "guided_explorer_sessions_question_bank_version_check",
      sql`${table.questionBankVersion} >= 1`,
    ),
    check(
      "guided_explorer_sessions_status_check",
      sql`${table.status} IN ('active', 'paused', 'completed')`,
    ),
    check(
      "guided_explorer_sessions_completion_reason_check",
      sql`${table.completionReason} IS NULL OR (${table.status} = 'completed' AND ${table.completionReason} = 'finished_early')`,
    ),
    check("guided_explorer_sessions_path_index_check", sql`${table.pathIndex} >= 0`),
    check(
      "guided_explorer_sessions_question_pointer_check",
      sql`(
            ${table.status} IN ('active', 'paused')
            AND ${table.currentQuestionId} IS NOT NULL
            AND ${table.resumeQuestionId} IS NULL
          ) OR (
            ${table.status} = 'completed'
            AND ${table.currentQuestionId} IS NULL
            AND (
              (${table.completionReason} = 'finished_early' AND ${table.resumeQuestionId} IS NOT NULL)
              OR (${table.completionReason} IS NULL AND ${table.resumeQuestionId} IS NULL)
            )
          )`,
    ),
  ],
);

export const guidedExplorerSessionQuestions = pgTable(
  "guided_explorer_session_questions",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => guidedExplorerSessions.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    pathPosition: integer("path_position").notNull(),
    state: text("state").notNull().default("pending"),
  },
  (table) => [
    primaryKey({
      name: "guided_explorer_session_questions_pk",
      columns: [table.sessionId, table.questionId],
    }),
    unique("guided_explorer_session_questions_position_unique").on(
      table.sessionId,
      table.pathPosition,
    ),
    unique("guided_explorer_session_questions_position_question_unique").on(
      table.sessionId,
      table.pathPosition,
      table.questionId,
    ),
    index("guided_explorer_session_questions_position_idx").on(
      table.sessionId,
      table.pathPosition,
    ),
    check("guided_explorer_session_questions_question_check", sql`${table.questionId} <> ''`),
    check("guided_explorer_session_questions_path_position_check", sql`${table.pathPosition} >= 0`),
    check(
      "guided_explorer_session_questions_state_check",
      sql`${table.state} IN ('pending', 'asked', 'skipped')`,
    ),
  ],
);

export const guidedExplorerAnswers = pgTable(
  "guided_explorer_answers",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    questionId: text("question_id").notNull(),
    optionIds: text("option_ids").array().notNull().default(sql`ARRAY[]::text[]`),
    originalText: text("original_text").notNull().default(""),
    interpretationStatus: text("interpretation_status").notNull(),
    responseState: text("response_state").notNull(),
    contextOptionId: text("context_option_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (table) => [
    index("guided_explorer_answers_session_question_idx").on(table.sessionId, table.questionId),
    check("guided_explorer_answers_id_check", sql`${table.id} <> ''`),
    check(
      "guided_explorer_answers_option_ids_check",
      sql`cardinality(${table.optionIds}) <= 20`,
    ),
    check(
      "guided_explorer_answers_interpretation_check",
      sql`${table.interpretationStatus} IN ('clear', 'probable', 'ambiguous', 'unrecognised')`,
    ),
    check(
      "guided_explorer_answers_response_state_check",
      sql`${table.responseState} IN ('answered', 'unsure', 'none', 'declined')`,
    ),
  ],
);

export const savedItems = pgTable(
  "saved_items",
  {
    userId: integer("user_id").notNull(),
    catalogItemId: uuid("catalog_item_id")
      .notNull()
      .references(() => catalogItems.id, { onDelete: "restrict" }),
    context: jsonb("context").$type<Record<string, string> | null>(),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("saved_items_identity_unique").on(table.userId, table.catalogItemId),
    index("saved_items_catalog_item_idx").on(table.catalogItemId),
    check(
      "saved_items_context_object_check",
      sql`${table.context} IS NULL OR jsonb_typeof(${table.context}) = 'object'`,
    ),
  ],
);

export const explorationHistory = pgTable(
  "exploration_history",
  {
    userId: integer("user_id").notNull(),
    catalogItemId: uuid("catalog_item_id")
      .notNull()
      .references(() => catalogItems.id, { onDelete: "restrict" }),
    context: jsonb("context").$type<Record<string, string> | null>(),
    lastVisitedAt: timestamp("last_visited_at", { withTimezone: true }).notNull(),
    visitCount: integer("visit_count").notNull().default(1),
  },
  (table) => [
    unique("exploration_history_identity_unique").on(table.userId, table.catalogItemId),
    index("exploration_history_catalog_item_idx").on(table.catalogItemId),
    index("exploration_history_last_visited_idx").on(table.userId, table.lastVisitedAt),
    check("exploration_history_visit_count_check", sql`${table.visitCount} >= 1`),
    check(
      "exploration_history_context_object_check",
      sql`${table.context} IS NULL OR jsonb_typeof(${table.context}) = 'object'`,
    ),
  ],
);
