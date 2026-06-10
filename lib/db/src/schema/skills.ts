import { pgTable, text, real, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const elaSkillsTable = pgTable("ela_skills", {
  skillCode: text("skill_code").primaryKey(),
  skillName: text("skill_name").notNull(),
  description: text("description"),
  gradeLevel: text("grade_level").notNull(),
  gradeBand: text("grade_band"),
  domainCode: text("domain_code").notNull(),
  domain: text("domain").notNull(),
  substrand: text("substrand"),
  standardLeafCode: text("standard_leaf_code"),
  parentGseCode: text("parent_gse_code"),
  parentCcssCode: text("parent_ccss_code"),
  difficulty: real("difficulty").notNull().default(0),
  discrimination: real("discrimination").notNull().default(1.0),
  guessing: real("guessing").notNull().default(0.25),
  subSkillOrder: integer("sub_skill_order").notNull().default(0),
  prerequisiteSkillCodes: text("prerequisite_skill_codes").array().default([]),
  nextSkillCodes: text("next_skill_codes").array().default([]),
  culturallyRelevantThemes: text("culturally_relevant_themes").array().default([]),
  durableSkillCodes: text("durable_skill_codes").array().default([]),
  activityTypes: text("activity_types").array().default([]),
  sorPillar: text("sor_pillar"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertElaSkillSchema = createInsertSchema(elaSkillsTable).omit({ createdAt: true });
export type InsertElaSkill = z.infer<typeof insertElaSkillSchema>;
export type ElaSkill = typeof elaSkillsTable.$inferSelect;
