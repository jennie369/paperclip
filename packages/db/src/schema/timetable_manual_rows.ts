import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { issues } from "./issues.js";
import { authUsers } from "./auth.js";

export const timetableManualRows = pgTable(
  "timetable_manual_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    kind: text("kind").notNull().default("manual_task"),
    title: text("title").notNull(),
    description: text("description"),
    note: text("note"),
    issueId: uuid("issue_id").references(() => issues.id, { onDelete: "set null" }),
    createdByUserId: text("created_by_user_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyStartsIdx: index("idx_timetable_manual_company_starts").on(table.companyId, table.startsAt),
    agentIdx: index("idx_timetable_manual_agent").on(table.agentId),
    issueIdx: index("idx_timetable_manual_issue").on(table.issueId),
  }),
);

export type TimetableManualRow = typeof timetableManualRows.$inferSelect;
export type NewTimetableManualRow = typeof timetableManualRows.$inferInsert;
