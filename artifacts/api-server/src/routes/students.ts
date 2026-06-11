import { Router } from "express";
import { db } from "@workspace/db";
import {
  studentProfilesTable,
  skillMasteryTable,
  elaSkillsTable,
  practiceSessionsTable,
  earnedBadgesTable,
} from "@workspace/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { ALL_BADGES } from "../lib/badges";
import { z } from "zod";

const router = Router();

function requireAuth(req: any, res: any): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

async function getStudentByUserId(userId: string) {
  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, userId))
    .limit(1);
  return profile ?? null;
}

/** Returns the grade-band default for audioEnabled: K–3 → true, 4+ → false. */
function defaultAudioEnabled(grade: string): boolean {
  const normalized = grade.trim().toUpperCase();
  if (normalized === "K") return true;
  const num = parseInt(normalized, 10);
  return !isNaN(num) && num <= 3;
}

const createStudentSchema = z.object({
  displayName: z.string().min(1),
  grade: z.string(),
  age: z.number().optional(),
  interests: z.array(z.string()).optional(),
  culturalContext: z.array(z.string()).optional(),
  homeLanguage: z.string().optional(),
  musicPreference: z.string().optional(),
});

const updateStudentSchema = z.object({
  displayName: z.string().optional(),
  grade: z.string().optional(),
  interests: z.array(z.string()).optional(),
  culturalContext: z.array(z.string()).optional(),
  homeLanguage: z.string().optional(),
  musicPreference: z.string().optional(),
  readingLevel: z.string().optional(),
  audioEnabled: z.boolean().optional(),
}).partial();

// GET /api/students/profile
router.get("/students/profile", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const profile = await getStudentByUserId(req.user!.id);
  if (!profile) return res.status(404).json({ error: "Student profile not found" });
  return res.json(profile);
});

router.post("/students/profile", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const parsed = createStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const existing = await getStudentByUserId(req.user!.id);
  if (existing) return res.json(existing);

  const [profile] = await db
    .insert(studentProfilesTable)
    .values({
      ...parsed.data,
      userId: req.user!.id,
      audioEnabled: defaultAudioEnabled(parsed.data.grade),
    })
    .returning();
  return res.status(201).json(profile);
});

router.put("/students/profile", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const parsed = updateStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }
  const profile = await getStudentByUserId(req.user!.id);
  if (!profile) return res.status(404).json({ error: "Not found" });
  const [updated] = await db
    .update(studentProfilesTable)
    .set(parsed.data)
    .where(eq(studentProfilesTable.id, profile.id))
    .returning();
  return res.json(updated);
});

// GET /api/students/dashboard
router.get("/students/dashboard", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const student = await getStudentByUserId(req.user!.id);
  if (!student) {
    return res.json({
      profile: null,
      todayStats: { questionsAnswered: 0, correctAnswers: 0, xpEarned: 0, minutesPracticed: 0 },
      recentMastery: [],
      streakDays: 0,
      totalXp: 0,
      completedSessionCount: 0,
      nextSkills: [],
      domainProgress: [],
    });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [masteryRows, skills, todaySessions, allCompletedSessions] = await Promise.all([
    db.select().from(skillMasteryTable).where(eq(skillMasteryTable.studentId, student.id)).limit(200),
    db.select().from(elaSkillsTable).where(eq(elaSkillsTable.active, true)).limit(200),
    db.select().from(practiceSessionsTable).where(
      and(
        eq(practiceSessionsTable.studentId, student.id),
        gte(practiceSessionsTable.createdAt, todayStart),
      )
    ),
    db.select({ id: practiceSessionsTable.id })
      .from(practiceSessionsTable)
      .where(and(
        eq(practiceSessionsTable.studentId, student.id),
        eq(practiceSessionsTable.status, "completed"),
      )),
  ]);

  const todayStats = {
    questionsAnswered: todaySessions.reduce((s, r) => s + r.totalQuestions, 0),
    correctAnswers: todaySessions.reduce((s, r) => s + r.correctAnswers, 0),
    xpEarned: todaySessions.reduce((s, r) => s + r.xpEarned, 0),
    minutesPracticed: Math.round(todaySessions.reduce((s, r) => s + (r.durationMin ?? 0), 0)),
  };

  const domains = ["RL", "RI", "RF", "W", "SL", "L"];
  const domainLabels: Record<string, string> = {
    RL: "Literature", RI: "Informational", RF: "Foundations",
    W: "Writing", SL: "Speaking & Listening", L: "Language",
  };

  const domainProgress = domains.map((code) => {
    const domainMastery = masteryRows.filter((m) => m.domain === code);
    const domainSkills = skills.filter((s) => s.domainCode === code);
    const mastered = domainMastery.filter((m) => m.masteryLevel === "mastered").length;
    const avgScore = domainMastery.length > 0
      ? domainMastery.reduce((sum, m) => sum + m.smartScore, 0) / domainMastery.length
      : 0;
    return {
      domain: domainLabels[code],
      domainCode: code,
      masteredCount: mastered,
      totalCount: Math.max(domainSkills.length, domainMastery.length, 10),
      avgScore: Math.round(avgScore),
    };
  });

  const recentMastery = [...masteryRows]
    .sort((a, b) => (b.lastPracticed?.getTime() ?? 0) - (a.lastPracticed?.getTime() ?? 0))
    .slice(0, 5);

  const nextSkills = skills
    .filter((s) => !masteryRows.find((m) => m.skillCode === s.skillCode && m.masteryLevel === "mastered"))
    .slice(0, 6)
    .map((s) => ({ skillCode: s.skillCode, skillName: s.skillName, domainCode: s.domainCode, gradeLevel: s.gradeLevel }));

  return res.json({
    profile: student,
    todayStats,
    recentMastery,
    streakDays: student.currentStreak,
    totalXp: student.totalXp,
    completedSessionCount: allCompletedSessions.length,
    nextSkills,
    domainProgress,
  });
});

// GET /api/students/progress
router.get("/students/progress", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const student = await getStudentByUserId(req.user!.id);

  if (!student) {
    return res.json({
      gradeProgress: { enrolledGrade: "—", diagnosedGrade: null, currentEstimatedGrade: null },
      weeklyXp: [],
      masteryTimeline: [],
    });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [recentSessions, masteryRows] = await Promise.all([
    db.select().from(practiceSessionsTable).where(
      and(
        eq(practiceSessionsTable.studentId, student.id),
        gte(practiceSessionsTable.createdAt, sevenDaysAgo),
      )
    ),
    db.select().from(skillMasteryTable).where(eq(skillMasteryTable.studentId, student.id)).limit(200),
  ]);

  // Build ordered 7-day map
  const dayKeys: string[] = [];
  const dayXpMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-US", { weekday: "short" });
    if (!dayXpMap[key]) {
      dayKeys.push(key);
      dayXpMap[key] = 0;
    }
  }
  for (const session of recentSessions) {
    const key = session.createdAt.toLocaleDateString("en-US", { weekday: "short" });
    if (key in dayXpMap) {
      dayXpMap[key] += session.xpEarned;
    }
  }
  const weeklyXp = dayKeys.map((week) => ({ week, xp: dayXpMap[week] ?? 0 }));

  // Mastery timeline: skills that have a masteredAt timestamp (set once at transition)
  // Fall back to updatedAt for skills mastered before the masteredAt column existed
  const masteredRows = masteryRows
    .filter((m) => m.masteryLevel === "mastered")
    .sort((a, b) => {
      const aTs = (a.masteredAt ?? a.updatedAt)?.getTime() ?? 0;
      const bTs = (b.masteredAt ?? b.updatedAt)?.getTime() ?? 0;
      return aTs - bTs;
    });

  const dateMap: Record<string, number> = {};
  const dateOrder: string[] = [];
  for (const row of masteredRows) {
    const ts = row.masteredAt ?? row.updatedAt;
    const date = ts?.toLocaleDateString("en-US", { month: "short", day: "numeric" }) ?? "";
    if (!date) continue;
    if (!(date in dateMap)) {
      dateOrder.push(date);
      dateMap[date] = 0;
    }
    dateMap[date]++;
  }
  let cumulative = 0;
  const masteryTimeline = dateOrder.map((date) => {
    cumulative += dateMap[date];
    return { date, masteredCount: cumulative };
  });

  return res.json({
    gradeProgress: {
      enrolledGrade: student.grade ?? "—",
      diagnosedGrade: student.diagnosedGradeLevel ?? null,
      currentEstimatedGrade: student.diagnosedGradeLevel ?? null,
    },
    weeklyXp,
    masteryTimeline,
  });
});

// GET /api/students/progress/weekly-xp
router.get("/students/progress/weekly-xp", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const student = await getStudentByUserId(req.user!.id);
  if (!student) return res.json([]);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const sessions = await db
    .select()
    .from(practiceSessionsTable)
    .where(and(
      eq(practiceSessionsTable.studentId, student.id),
      gte(practiceSessionsTable.createdAt, sevenDaysAgo),
    ));

  const result: { day: string; date: string; xp: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = d.toLocaleDateString("en-US", { weekday: "short" });
    const date = d.toISOString().split("T")[0];
    const xp = sessions
      .filter((s) => s.createdAt.toISOString().split("T")[0] === date)
      .reduce((sum, s) => sum + s.xpEarned, 0);
    result.push({ day, date, xp });
  }

  return res.json(result);
});

// GET /api/students/progress/timeline
// Returns ALL practiced skills as level-transition events ordered by lastUpdated.
// Each event carries the skill's current mastery level, first_seen, and last_updated timestamps.
// For mastered-level events, masteredCount is a running cumulative of skills mastered so far.
router.get("/students/progress/timeline", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const student = await getStudentByUserId(req.user!.id);
  if (!student) return res.json([]);

  const masteryRows = await db
    .select()
    .from(skillMasteryTable)
    .where(eq(skillMasteryTable.studentId, student.id))
    .limit(200);

  // Sort all practiced skills by when they were last updated (most recent first)
  const sorted = [...masteryRows]
    .filter((m) => m.masteryLevel !== "not_started")
    .sort((a, b) => {
      const aTs = (a.masteredAt ?? a.updatedAt)?.getTime() ?? 0;
      const bTs = (b.masteredAt ?? b.updatedAt)?.getTime() ?? 0;
      return aTs - bTs;
    });

  // Compute running cumulative mastered count as we traverse oldest → newest
  let cumulativeMastered = 0;
  const result = sorted.map((row) => {
    const ts = row.masteredAt ?? row.updatedAt;
    const isMastered = row.masteryLevel === "mastered";
    if (isMastered) cumulativeMastered++;
    return {
      date: ts?.toLocaleDateString("en-US", { month: "short", day: "numeric" }) ?? "—",
      isoDate: ts?.toISOString().split("T")[0] ?? "",
      skillCode: row.skillCode,
      skillName: row.skillName,
      domain: row.domain,
      level: row.masteryLevel,
      firstSeen: row.createdAt?.toISOString().split("T")[0] ?? "",
      lastUpdated: (row.masteredAt ?? row.updatedAt)?.toISOString().split("T")[0] ?? "",
      ...(isMastered ? { masteredCount: cumulativeMastered } : {}),
    };
  });

  return res.json(result);
});

// GET /api/students/analytics
router.get("/students/analytics", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const student = await getStudentByUserId(req.user!.id);
  const masteryRows = student
    ? await db.select().from(skillMasteryTable).where(eq(skillMasteryTable.studentId, student.id)).limit(200)
    : [];
  const mastered = masteryRows.filter((m) => m.masteryLevel === "mastered").length;
  const avgScore = masteryRows.length > 0
    ? masteryRows.reduce((sum, m) => sum + m.smartScore, 0) / masteryRows.length
    : 0;
  return res.json({
    totalSkillsPracticed: masteryRows.length,
    masteredSkills: mastered,
    avgSmartScore: Math.round(avgScore),
    onTrack: avgScore >= 70,
    gradeGap: 0,
  });
});

router.get("/students/me/badges", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const student = await getStudentByUserId(req.user!.id);

  const earned = student
    ? await db
        .select({ badgeCode: earnedBadgesTable.badgeCode, earnedAt: earnedBadgesTable.earnedAt })
        .from(earnedBadgesTable)
        .where(eq(earnedBadgesTable.studentId, student.id))
    : [];

  const earnedMap = new Map(earned.map((r) => [r.badgeCode, r.earnedAt]));

  const result = ALL_BADGES.map((b) => ({
    ...b,
    earned: earnedMap.has(b.code),
    earnedAt: earnedMap.get(b.code)?.toISOString() ?? null,
  }));

  return res.json(result);
});

export default router;
