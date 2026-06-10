import { pgTable, text, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const teacherClassesTable = pgTable("teacher_classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id").notNull(),
  className: text("class_name").notNull(),
  gradeLevel: text("grade_level").notNull(),
  classCode: text("class_code").notNull().unique(),
  schoolName: text("school_name"),
  studentCount: integer("student_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  workTimeRotation: text("work_time_rotation").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const classEnrollmentsTable = pgTable("class_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id").notNull(),
  studentId: uuid("student_id").notNull(),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teacherAlertsTable = pgTable("teacher_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id").notNull(),
  studentId: uuid("student_id").notNull(),
  studentName: text("student_name").notNull(),
  alertType: text("alert_type").notNull(),
  message: text("message").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTeacherClassSchema = createInsertSchema(teacherClassesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClassEnrollmentSchema = createInsertSchema(classEnrollmentsTable).omit({ id: true, enrolledAt: true });
export const insertTeacherAlertSchema = createInsertSchema(teacherAlertsTable).omit({ id: true, createdAt: true });

export type InsertTeacherClass = z.infer<typeof insertTeacherClassSchema>;
export type TeacherClass = typeof teacherClassesTable.$inferSelect;
export type ClassEnrollment = typeof classEnrollmentsTable.$inferSelect;
export type TeacherAlert = typeof teacherAlertsTable.$inferSelect;
