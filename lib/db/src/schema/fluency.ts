import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { studentProfilesTable } from "./students";

export const fluencySessionsTable = pgTable("fluency_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => studentProfilesTable.id, { onDelete: "cascade" }),
  passageKey: text("passage_key").notNull(),
  passageTitle: text("passage_title").notNull(),
  gradeLevel: text("grade_level").notNull(),
  totalWords: integer("total_words").notNull(),
  wordsRead: integer("words_read").notNull(),
  errors: integer("errors").notNull().default(0),
  durationSeconds: integer("duration_seconds").notNull(),
  wpm: integer("wpm").notNull(),
  wcpm: integer("wcpm").notNull(),
  accuracyPercent: integer("accuracy_percent").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FluencySession = typeof fluencySessionsTable.$inferSelect;
export type InsertFluencySession = typeof fluencySessionsTable.$inferInsert;
