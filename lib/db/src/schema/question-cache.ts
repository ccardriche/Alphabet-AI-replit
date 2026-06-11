import { pgTable, text, jsonb, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const questionCacheTable = pgTable(
  "question_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    skillCode: text("skill_code").notNull(),
    thetaBand: text("theta_band").notNull(),
    culturalContextHash: text("cultural_context_hash").notNull().default(""),
    activityType: text("activity_type").notNull().default("multiple_choice"),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    lookupIdx: index("question_cache_lookup_idx").on(
      table.skillCode,
      table.thetaBand,
      table.culturalContextHash,
      table.activityType,
    ),
  }),
);

export const insertQuestionCacheSchema = createInsertSchema(questionCacheTable).omit({
  id: true,
  createdAt: true,
});
export type InsertQuestionCache = z.infer<typeof insertQuestionCacheSchema>;
export type QuestionCache = typeof questionCacheTable.$inferSelect;
