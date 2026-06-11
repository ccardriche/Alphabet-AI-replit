import { pgTable, text, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { studentProfilesTable } from "./students";

export const caregiverProfilesTable = pgTable("caregiver_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => usersTable.id),
  studentId: uuid("student_id").references(() => studentProfilesTable.id),
  relationship: text("relationship").notNull().default("parent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCaregiverProfileSchema = createInsertSchema(caregiverProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCaregiverProfile = z.infer<typeof insertCaregiverProfileSchema>;
export type CaregiverProfile = typeof caregiverProfilesTable.$inferSelect;
