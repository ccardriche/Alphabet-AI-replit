import { pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const earnedBadgesTable = pgTable("earned_badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull(),
  badgeCode: text("badge_code").notNull(),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueStudentBadge: unique().on(table.studentId, table.badgeCode),
}));

export const insertEarnedBadgeSchema = createInsertSchema(earnedBadgesTable).omit({ id: true, earnedAt: true });
export type InsertEarnedBadge = z.infer<typeof insertEarnedBadgeSchema>;
export type EarnedBadge = typeof earnedBadgesTable.$inferSelect;
