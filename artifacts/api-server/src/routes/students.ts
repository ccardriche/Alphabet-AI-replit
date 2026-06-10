import { Router } from "express";
import { db } from "@workspace/db";
import { studentProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

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
}).partial();

// GET /api/students/profile — get the "current" student profile
// For demo: use first student (no real auth yet)
router.get("/students/profile", async (req, res) => {
  const rows = await db.select().from(studentProfilesTable).limit(1);
  if (!rows[0]) {
    return res.status(404).json({ error: "Student profile not found" });
  }
  return res.json(rows[0]);
});

router.post("/students/profile", async (req, res) => {
  const parsed = createStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const existing = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, DEMO_USER_ID))
    .limit(1);

  if (existing[0]) {
    return res.json(existing[0]);
  }

  const [profile] = await db.insert(studentProfilesTable).values({ ...parsed.data, userId: DEMO_USER_ID }).returning();
  return res.status(201).json(profile);
});

router.put("/students/profile", async (req, res) => {
  const parsed = updateStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }
  const rows = await db.select().from(studentProfilesTable).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  const [updated] = await db
    .update(studentProfilesTable)
    .set(parsed.data)
    .where(eq(studentProfilesTable.id, rows[0].id))
    .returning();
  return res.json(updated);
});

// GET /api/students/dashboard
router.get("/students/dashboard", async (req, res) => {
  const student = (await db.select().from(studentProfilesTable).limit(1))[0];
  if (!student) {
    return res.json({
      profile: null,
      todayStats: { questionsAnswered: 0, correctAnswers: 0, xpEarned: 0, minutesPracticed: 0 },
      recentMastery: [],
      streakDays: 0,
      totalXp: 0,
      nextSkills: [],
      domainProgress: [],
    });
  }
  // Build dashboard from DB data
  const { skillMasteryTable, elaSkillsTable } = await import("@workspace/db/schema");
  const masteryRows = await db
    .select()
    .from(skillMasteryTable)
    .where(eq(skillMasteryTable.studentId, student.id))
    .limit(50);

  const skills = await db.select().from(elaSkillsTable).where(eq(elaSkillsTable.active, true)).limit(200);

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

  const recentMastery = masteryRows
    .sort((a, b) => (b.lastPracticed?.getTime() ?? 0) - (a.lastPracticed?.getTime() ?? 0))
    .slice(0, 5);

  const nextSkills = skills
    .filter((s) => !masteryRows.find((m) => m.skillCode === s.skillCode && m.masteryLevel === "mastered"))
    .slice(0, 6)
    .map((s) => ({ skillCode: s.skillCode, skillName: s.skillName, domainCode: s.domainCode, gradeLevel: s.gradeLevel }));

  return res.json({
    profile: student,
    todayStats: { questionsAnswered: 0, correctAnswers: 0, xpEarned: 0, minutesPracticed: 0 },
    recentMastery,
    streakDays: student.currentStreak,
    totalXp: student.totalXp,
    nextSkills,
    domainProgress,
  });
});

// GET /api/students/progress
router.get("/students/progress", async (req, res) => {
  const student = (await db.select().from(studentProfilesTable).limit(1))[0];
  return res.json({
    gradeProgress: {
      enrolledGrade: student?.grade ?? "—",
      diagnosedGrade: student?.diagnosedGradeLevel ?? null,
      currentEstimatedGrade: student?.diagnosedGradeLevel ?? null,
    },
    weeklyXp: [],
    masteryTimeline: [],
  });
});

// GET /api/students/analytics
router.get("/students/analytics", async (req, res) => {
  const { skillMasteryTable } = await import("@workspace/db/schema");
  const student = (await db.select().from(studentProfilesTable).limit(1))[0];
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

export default router;
