import { db } from "@workspace/db";
import {
  earnedBadgesTable,
  studentProfilesTable,
  practiceSessionsTable,
  skillMasteryTable,
} from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";

export interface BadgeContext {
  practiceSessionCount: number;
  totalXp: number;
  currentStreak: number;
  masteredSkillCount: number;
  placementCompleted: boolean;
  identityQuestCompleted: boolean;
}

export interface BadgeDef {
  code: string;
  icon: string;
  title: string;
  desc: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
}

type CheckFn = (ctx: BadgeContext) => boolean;

const BADGE_CHECKS: Array<BadgeDef & { check: CheckFn }> = [
  { code: "identity_quest",   icon: "🌍", title: "Identity Explorer", desc: "Complete your Identity Quest",           rarity: "common",    check: (c) => c.identityQuestCompleted },
  { code: "first_practice",   icon: "🌟", title: "First Steps",      desc: "Complete your first practice session",   rarity: "common",    check: (c) => c.practiceSessionCount >= 1 },
  { code: "placement_done",   icon: "🎯", title: "Placed!",           desc: "Complete your placement assessment",     rarity: "common",    check: (c) => c.placementCompleted },
  { code: "streak_3",         icon: "🔥", title: "On Fire",           desc: "Reach a 3-day streak",                  rarity: "common",    check: (c) => c.currentStreak >= 3 },
  { code: "xp_100",           icon: "⚡", title: "Powered Up",        desc: "Earn 100 XP",                           rarity: "common",    check: (c) => c.totalXp >= 100 },
  { code: "first_mastery",    icon: "🏆", title: "Skill Unlocked",    desc: "Master your first skill",               rarity: "uncommon",  check: (c) => c.masteredSkillCount >= 1 },
  { code: "sessions_5",       icon: "📚", title: "Bookworm",          desc: "Complete 5 practice sessions",          rarity: "uncommon",  check: (c) => c.practiceSessionCount >= 5 },
  { code: "streak_7",         icon: "💎", title: "Week Warrior",      desc: "Reach a 7-day streak",                  rarity: "uncommon",  check: (c) => c.currentStreak >= 7 },
  { code: "xp_500",           icon: "🚀", title: "XP Rocket",         desc: "Earn 500 XP",                           rarity: "uncommon",  check: (c) => c.totalXp >= 500 },
  { code: "mastery_5",        icon: "🌈", title: "Skill Master",      desc: "Master 5 skills",                       rarity: "rare",      check: (c) => c.masteredSkillCount >= 5 },
  { code: "sessions_20",      icon: "🦁", title: "Dedicated Learner", desc: "Complete 20 practice sessions",         rarity: "rare",      check: (c) => c.practiceSessionCount >= 20 },
  { code: "xp_1000",          icon: "💫", title: "XP Legend",         desc: "Earn 1,000 XP",                         rarity: "rare",      check: (c) => c.totalXp >= 1000 },
  { code: "streak_14",        icon: "🌟", title: "Streak Superstar",  desc: "Reach a 14-day streak",                 rarity: "legendary", check: (c) => c.currentStreak >= 14 },
  { code: "mastery_10",       icon: "👑", title: "ELA Champion",      desc: "Master 10 skills",                      rarity: "legendary", check: (c) => c.masteredSkillCount >= 10 },
  { code: "xp_2500",          icon: "🎓", title: "Scholar",           desc: "Earn 2,500 XP",                         rarity: "legendary", check: (c) => c.totalXp >= 2500 },
  { code: "mastery_20",       icon: "🦋", title: "Transformation",    desc: "Master 20 skills",                      rarity: "legendary", check: (c) => c.masteredSkillCount >= 20 },
];

export const ALL_BADGES: BadgeDef[] = BADGE_CHECKS.map(({ check: _check, ...rest }) => rest);

export async function checkAndAwardBadges(studentId: string): Promise<BadgeDef[]> {
  const [student] = await db
    .select({
      totalXp: studentProfilesTable.totalXp,
      currentStreak: studentProfilesTable.currentStreak,
      preAssessmentCompleted: studentProfilesTable.preAssessmentCompleted,
      identityQuestCompleted: studentProfilesTable.identityQuestCompleted,
    })
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.id, studentId))
    .limit(1);

  if (!student) return [];

  const [{ sessionCount }] = await db
    .select({ sessionCount: count() })
    .from(practiceSessionsTable)
    .where(eq(practiceSessionsTable.studentId, studentId));

  const [{ masteredCount }] = await db
    .select({ masteredCount: count() })
    .from(skillMasteryTable)
    .where(eq(skillMasteryTable.studentId, studentId));

  const alreadyEarned = await db
    .select({ badgeCode: earnedBadgesTable.badgeCode })
    .from(earnedBadgesTable)
    .where(eq(earnedBadgesTable.studentId, studentId));

  const earnedCodes = new Set(alreadyEarned.map((r) => r.badgeCode));

  const ctx: BadgeContext = {
    practiceSessionCount: Number(sessionCount),
    totalXp: student.totalXp,
    currentStreak: student.currentStreak,
    masteredSkillCount: Number(masteredCount),
    placementCompleted: student.preAssessmentCompleted,
    identityQuestCompleted: (student as any).identityQuestCompleted ?? false,
  };

  const newBadgeDefs: BadgeDef[] = [];
  const toInsert: { studentId: string; badgeCode: string }[] = [];

  for (const { check, ...def } of BADGE_CHECKS) {
    if (!earnedCodes.has(def.code) && check(ctx)) {
      newBadgeDefs.push(def);
      toInsert.push({ studentId, badgeCode: def.code });
    }
  }

  if (toInsert.length > 0) {
    await db.insert(earnedBadgesTable).values(toInsert).onConflictDoNothing();
  }

  return newBadgeDefs;
}
