import { Router } from "express";
import { db } from "@workspace/db";
import { studentProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
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
      nextSkills: [],
      domainProgress: [],
    });
  }

  const { skillMasteryTable, elaSkillsTable } = await import("@workspace/db/schema");
  const masteryRows = await db
    .select()
    .from(skillMasteryTable)
    .where(eq(skillMasteryTable.studentId, student.id))
    .limit(50);

  const skills = await db
    .select()
    .from(elaSkillsTable)
    .where(eq(elaSkillsTable.active, true))
    .limit(200);

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
  if (!requireAuth(req, res)) return;
  const student = await getStudentByUserId(req.user!.id);
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
  if (!requireAuth(req, res)) return;
  const { skillMasteryTable } = await import("@workspace/db/schema");
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

export default router;
