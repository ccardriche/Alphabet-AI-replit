import { Router } from "express";
import { db } from "@workspace/db";
import {
  caregiverProfilesTable,
  studentProfilesTable,
  skillMasteryTable,
  practiceSessionsTable,
  elaSkillsTable,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireCaregiver } from "../middlewares/requireCaregiver";

const router = Router();

// GET /api/caregiver/profile — fetch or 404 if not set up yet
router.get("/caregiver/profile", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const [profile] = await db
    .select()
    .from(caregiverProfilesTable)
    .where(eq(caregiverProfilesTable.userId, req.user.id))
    .limit(1);

  if (!profile) return res.status(404).json({ error: "No caregiver profile" });

  let student = null;
  if (profile.studentId) {
    const [s] = await db
      .select({
        id: studentProfilesTable.id,
        displayName: studentProfilesTable.displayName,
        grade: studentProfilesTable.grade,
        readingLevel: studentProfilesTable.readingLevel,
        placementPathway: studentProfilesTable.placementPathway,
        preAssessmentCompleted: studentProfilesTable.preAssessmentCompleted,
      })
      .from(studentProfilesTable)
      .where(eq(studentProfilesTable.id, profile.studentId))
      .limit(1);
    student = s ?? null;
  }

  return res.json({ ...profile, student });
});

// PUT /api/caregiver/profile — upsert profile, optionally link student via studentCode (first 8 chars of UUID)
router.put("/caregiver/profile", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const { relationship = "parent", studentCode } = req.body as { relationship?: string; studentCode?: string };
  const userId = req.user.id;

  let studentId: string | null = null;

  if (studentCode) {
    const code = studentCode.trim().toLowerCase();
    const allStudents = await db
      .select({ id: studentProfilesTable.id })
      .from(studentProfilesTable);
    const match = allStudents.find((s) => s.id.replace(/-/g, "").toLowerCase().startsWith(code));
    if (!match) {
      return res.status(404).json({ error: "Student code not found. Check the code and try again." });
    }
    studentId = match.id;
  }

  const [existing] = await db
    .select()
    .from(caregiverProfilesTable)
    .where(eq(caregiverProfilesTable.userId, userId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(caregiverProfilesTable)
      .set({
        relationship,
        ...(studentId ? { studentId } : {}),
      })
      .where(eq(caregiverProfilesTable.userId, userId))
      .returning();
    return res.json(updated);
  }

  const [created] = await db
    .insert(caregiverProfilesTable)
    .values({ userId, relationship, studentId: studentId ?? undefined })
    .returning();

  return res.status(201).json(created);
});

// GET /api/caregiver/student — full student overview for the linked student
router.get("/caregiver/student", requireCaregiver, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  const [profile] = await db
    .select()
    .from(caregiverProfilesTable)
    .where(eq(caregiverProfilesTable.userId, req.user.id))
    .limit(1);

  if (!profile?.studentId) {
    return res.status(404).json({ error: "No linked student" });
  }

  const studentId = profile.studentId;

  const [student] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.id, studentId))
    .limit(1);

  if (!student) return res.status(404).json({ error: "Student not found" });

  // Mastery data
  const mastery = await db
    .select()
    .from(skillMasteryTable)
    .where(eq(skillMasteryTable.studentId, studentId));

  // Domain summary — group skill mastery by domain using ela_skills lookup
  const skills = await db.select({
    skillCode: elaSkillsTable.skillCode,
    domain: elaSkillsTable.domain,
    domainCode: elaSkillsTable.domainCode,
  }).from(elaSkillsTable).where(eq(elaSkillsTable.active, true));

  const domainMap = new Map<string, { domain: string; domainCode: string; total: number; practiced: number; mastered: number; scoreSum: number; scoreCount: number }>();
  for (const s of skills) {
    if (!domainMap.has(s.domainCode)) {
      domainMap.set(s.domainCode, { domain: s.domain, domainCode: s.domainCode, total: 0, practiced: 0, mastered: 0, scoreSum: 0, scoreCount: 0 });
    }
    domainMap.get(s.domainCode)!.total++;
  }
  for (const m of mastery) {
    const skill = skills.find((s) => s.skillCode === m.skillCode);
    if (!skill) continue;
    const entry = domainMap.get(skill.domainCode);
    if (!entry) continue;
    entry.practiced++;
    if (m.masteryLevel === "mastered") entry.mastered++;
    if (m.smartScore) { entry.scoreSum += m.smartScore; entry.scoreCount++; }
  }
  const domainMastery = [...domainMap.values()].map((d) => ({
    ...d,
    avgScore: d.scoreCount > 0 ? Math.round(d.scoreSum / d.scoreCount) : 0,
  }));

  // Recent practice sessions (last 5)
  const recentSessions = await db
    .select({
      id: practiceSessionsTable.id,
      startedAt: practiceSessionsTable.createdAt,
      completedAt: practiceSessionsTable.completedAt,
      activitiesCompleted: practiceSessionsTable.activitiesCompleted,
      correctCount: practiceSessionsTable.correctAnswers,
      xpEarned: practiceSessionsTable.xpEarned,
    })
    .from(practiceSessionsTable)
    .where(eq(practiceSessionsTable.studentId, studentId))
    .orderBy(desc(practiceSessionsTable.createdAt))
    .limit(5);

  // Strong and weak skills (only from practiced skills)
  const practicedMastery = mastery
    .filter((m) => m.practiceCount > 0)
    .sort((a, b) => (b.smartScore ?? 0) - (a.smartScore ?? 0));

  const strongSkills = practicedMastery.slice(0, 3).map((m) => {
    const sk = skills.find((s) => s.skillCode === m.skillCode);
    return { skillCode: m.skillCode, domain: sk?.domain ?? "", smartScore: Math.round(m.smartScore ?? 0), masteryLevel: m.masteryLevel };
  });

  const weakSkills = [...practicedMastery]
    .reverse()
    .filter((m) => m.masteryLevel !== "mastered")
    .slice(0, 3)
    .map((m) => {
      const sk = skills.find((s) => s.skillCode === m.skillCode);
      return { skillCode: m.skillCode, domain: sk?.domain ?? "", smartScore: Math.round(m.smartScore ?? 0), masteryLevel: m.masteryLevel };
    });

  return res.json({
    student: {
      id: student.id,
      displayName: student.displayName,
      grade: student.grade,
      readingLevel: student.readingLevel,
      placementPathway: student.placementPathway,
      preAssessmentCompleted: student.preAssessmentCompleted,
      totalXp: student.totalXp,
      currentStreak: student.currentStreak,
      studentCode: student.id.replace(/-/g, "").slice(0, 8).toUpperCase(),
    },
    domainMastery,
    recentSessions,
    strongSkills,
    weakSkills,
    totalPracticed: mastery.length,
    totalMastered: mastery.filter((m) => m.masteryLevel === "mastered").length,
    overallAvgScore: mastery.length > 0
      ? Math.round(mastery.reduce((s, m) => s + (m.smartScore ?? 0), 0) / mastery.length)
      : 0,
  });
});

export default router;
