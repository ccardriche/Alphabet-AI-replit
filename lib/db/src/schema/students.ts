import { pgTable, text, integer, boolean, jsonb, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentProfilesTable = pgTable("student_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  grade: text("grade").notNull(),
  age: integer("age"),
  interests: text("interests").array().default([]),
  musicPreference: text("music_preference"),
  culturalContext: text("cultural_context").array().default([]),
  homeLanguage: text("home_language"),
  accessibilityNeeds: jsonb("accessibility_needs"),
  readingLevel: text("reading_level"),
  diagnosedGradeLevel: text("diagnosed_grade_level"),
  interventionTargetGrade: text("intervention_target_grade"),
  placementPathway: text("placement_pathway"),
  preAssessmentCompleted: boolean("pre_assessment_completed").notNull().default(false),
  totalXp: integer("total_xp").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStudentProfileSchema = createInsertSchema(studentProfilesTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertStudentProfile = z.infer<typeof insertStudentProfileSchema>;
export type StudentProfile = typeof studentProfilesTable.$inferSelect;
