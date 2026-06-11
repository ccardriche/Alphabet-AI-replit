import { pgTable, text, real, integer, boolean, timestamp, uuid, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const skillMasteryTable = pgTable("skill_mastery", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull(),
  skillCode: text("skill_code").notNull(),
  skillName: text("skill_name").notNull(),
  domain: text("domain"),
  masteryLevel: text("mastery_level").notNull().default("not_started"),
  masteryPercentage: real("mastery_percentage").notNull().default(0),
  smartScore: real("smart_score").notNull().default(0),
  theta: real("theta").notNull().default(0),
  thetaSe: real("theta_se").notNull().default(999),
  practiceCount: integer("practice_count").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  consecutiveErrors: integer("consecutive_errors").notNull().default(0),
  needsReteaching: boolean("needs_reteaching").notNull().default(false),
  isUnlocked: boolean("is_unlocked").notNull().default(true),
  sequenceOrder: integer("sequence_order").notNull().default(0),
  lastPracticed: timestamp("last_practiced", { withTimezone: true }),
  masteredAt: timestamp("mastered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  uniqueStudentSkill: unique().on(table.studentId, table.skillCode),
}));

export const insertSkillMasterySchema = createInsertSchema(skillMasteryTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertSkillMastery = z.infer<typeof insertSkillMasterySchema>;
export type SkillMastery = typeof skillMasteryTable.$inferSelect;

export const masteryLevelHistoryTable = pgTable("mastery_level_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull(),
  skillCode: text("skill_code").notNull(),
  skillName: text("skill_name").notNull(),
  domain: text("domain"),
  fromLevel: text("from_level").notNull(),
  toLevel: text("to_level").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  studentSkillIdx: index("mlh_student_skill_idx").on(table.studentId, table.skillCode),
  recordedAtIdx: index("mlh_recorded_at_idx").on(table.recordedAt),
}));

export const insertMasteryLevelHistorySchema = createInsertSchema(masteryLevelHistoryTable).omit({
  id: true, recordedAt: true,
});
export type InsertMasteryLevelHistory = z.infer<typeof insertMasteryLevelHistorySchema>;
export type MasteryLevelHistory = typeof masteryLevelHistoryTable.$inferSelect;
