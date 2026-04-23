import { pgTable, uuid, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { authUsers } from "./auth.js";

/**
 * Override result + note cho dòng HỆ THỐNG (heartbeat_runs, issues, cc_social_posts, ...).
 * Không đụng bảng source — BE left-join khi build timetable.
 * Key: (companyId, sourceTable, sourceId).
 */
export const timetableRowNotes = pgTable(
  "timetable_row_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    sourceTable: text("source_table").notNull(),
    sourceId: text("source_id").notNull(),
    resultOverride: text("result_override"),
    note: text("note"),
    updatedByUserId: text("updated_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    updatedByAgentId: uuid("updated_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("idx_timetable_row_notes_company").on(table.companyId, table.updatedAt),
    sourceIdx: index("idx_timetable_row_notes_source").on(table.sourceTable, table.sourceId),
    uniqSource: unique("uq_timetable_row_notes").on(table.companyId, table.sourceTable, table.sourceId),
  }),
);

export type TimetableRowNote = typeof timetableRowNotes.$inferSelect;
export type NewTimetableRowNote = typeof timetableRowNotes.$inferInsert;

export const TIMETABLE_SOURCE_TABLES = [
  "heartbeat_runs",
  "issues",
  "agent_task_sessions",
  "cc_scripts",
  "cc_social_posts",
  "cc_email_campaigns",
  "routine_runs",
  "routine_triggers",
] as const;

export type TimetableSourceTable = (typeof TIMETABLE_SOURCE_TABLES)[number];
