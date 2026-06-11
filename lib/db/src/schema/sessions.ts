import { pgTable, text, real, integer, boolean, timestamp, uuid, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const placementSessionsTable = pgTable("placement_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull(),
  status: text("status").notNull().default("in_progress"),
  questionCount: integer("question_count").notNull().default(0),
  theta: real("theta").notNull().default(0),
  thetaSe: real("theta_se").notNull().default(999),
  fisherInfo: real("fisher_info").notNull().default(0),
  diagnosedGradeLevel: text("diagnosed_grade_level"),
  placementPathway: text("placement_pathway"),
  accuracyPct: real("accuracy_pct"),
  strandStrengths: text("strand_strengths").array().default([]),
  strandGaps: text("strand_gaps").array().default([]),
  answers: jsonb("answers").default([]),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceSessionsTable = pgTable("practice_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull(),
  status: text("status").notNull().default("in_progress"),
  activitiesCompleted: integer("activities_completed").notNull().default(0),
  totalQuestions: integer("total_questions").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  xpEarned: integer("xp_earned").notNull().default(0),
  durationMin: real("duration_min"),
  focusDomain: text("focus_domain"),
  focusSkillCode: text("focus_skill_code"),
  answers: jsonb("answers").default([]),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lessonSessionsTable = pgTable("lesson_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: varchar("teacher_id").notNull(),
  title: text("title").notNull(),
  gradeLevel: text("grade_level").notNull(),
  domain: text("domain").notNull(),
  standardCode: text("standard_code"),
  sourceText: text("source_text"),
  framingLesson: text("framing_lesson"),
  discussionQuestions: text("discussion_questions").array().default([]),
  writingPrompts: text("writing_prompts").array().default([]),
  vocabularyList: text("vocabulary_list").array().default([]),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlacementSessionSchema = createInsertSchema(placementSessionsTable).omit({ id: true, createdAt: true });
export const insertPracticeSessionSchema = createInsertSchema(practiceSessionsTable).omit({ id: true, createdAt: true });
export const insertLessonSessionSchema = createInsertSchema(lessonSessionsTable).omit({ id: true, createdAt: true });

export type InsertPlacementSession = z.infer<typeof insertPlacementSessionSchema>;
export type InsertPracticeSession = z.infer<typeof insertPracticeSessionSchema>;
export type InsertLessonSession = z.infer<typeof insertLessonSessionSchema>;
export type PlacementSession = typeof placementSessionsTable.$inferSelect;
export type PracticeSession = typeof practiceSessionsTable.$inferSelect;
export type LessonSession = typeof lessonSessionsTable.$inferSelect;
