import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { teacherClassesTable } from "./teacher";
import { studentProfilesTable } from "./students";

export const groupProjectsTable = pgTable("group_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: varchar("teacher_id").notNull(),
  classId: uuid("class_id").references(() => teacherClassesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("writing"),
  prompt: text("prompt").notNull(),
  rubric: text("rubric"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  gradeLevel: text("grade_level"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const projectGroupsTable = pgTable("project_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => groupProjectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectGroupMembersTable = pgTable("project_group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull().references(() => projectGroupsTable.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => studentProfilesTable.id, { onDelete: "cascade" }),
});

export const projectSubmissionsTable = pgTable("project_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => groupProjectsTable.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").notNull().references(() => projectGroupsTable.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  submittedByStudentId: uuid("submitted_by_student_id").references(() => studentProfilesTable.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  feedback: text("feedback"),
  feedbackAt: timestamp("feedback_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type GroupProject = typeof groupProjectsTable.$inferSelect;
export type ProjectGroup = typeof projectGroupsTable.$inferSelect;
export type ProjectGroupMember = typeof projectGroupMembersTable.$inferSelect;
export type ProjectSubmission = typeof projectSubmissionsTable.$inferSelect;
