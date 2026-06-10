import { Router } from "express";
import { db } from "@workspace/db";
import {
  practiceSessionsTable,
  studentProfilesTable,
  skillMasteryTable,
  elaSkillsTable,
} from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateQuestion, makeMockQuestion } from "./placement";

const router = Router();

const ACTIVITY_TYPES = ["listen_repeat", "see_tap", "say_it", "write_it", "read_it"];

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

// POST /api/practice/start
router.post("/practice/start", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const student = await getStudentByUserId(req.user!.id);
  if (!student) return res.status(404).json({ error: "Student profile not found. Complete onboarding first." });

  const { focusDomain } = req.body as { focusDomain?: string };

  const [session] = await db.insert(practiceSessionsTable).values({
    studentId: student.id,
    status: "in_progress",
    focusDomain: focusDomain ?? null,
  }).returning();

  return res.status(201).json(session);
});

// GET /api/practice/:sessionId/next
router.get("/practice/:sessionId/next", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { sessionId } = req.params;
  const [session] = await db.select().from(practiceSessionsTable).where(eq(practiceSessionsTable.id, sessionId)).limit(1);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const student = await getStudentByUserId(req.user!.id);

  const masteryRows = await db
    .select()
    .from(skillMasteryTable)
    .where(eq(skillMasteryTable.studentId, session.studentId))
    .limit(200);

  const skills = await db.select().from(elaSkillsTable).where(eq(elaSkillsTable.active, true)).limit(200);

  let targetSkill;
  const practicing = masteryRows
    .filter((m) => m.masteryLevel !== "mastered")
    .sort((a, b) => a.smartScore - b.smartScore);

  if (practicing.length > 0) {
    const target = practicing[0];
    targetSkill = skills.find((s) => s.skillCode === target.skillCode);
  }

  if (!targetSkill) {
    const practicedCodes = new Set(masteryRows.map((m) => m.skillCode));
    const unstartedSkills = skills.filter((s) => !practicedCodes.has(s.skillCode));
    targetSkill = unstartedSkills[Math.floor(Math.random() * unstartedSkills.length)] ?? skills[0];
  }

  if (!targetSkill) {
    return res.status(400).json({ error: "No skills available" });
  }

  const activityType = ACTIVITY_TYPES[session.activitiesCompleted % ACTIVITY_TYPES.length];

  let question;
  try {
    question = await generateQuestion({
      skillCode: targetSkill.skillCode,
      skillName: targetSkill.skillName,
      domain: targetSkill.domain,
      gradeLevel: targetSkill.gradeLevel,
      difficulty: targetSkill.difficulty,
      interests: student?.interests ?? [],
      culturalContext: student?.culturalContext ?? [],
      activityType,
    });
  } catch {
    question = makeMockQuestion(targetSkill);
  }

  return res.json({
    sessionId,
    skillCode: targetSkill.skillCode,
    skillName: targetSkill.skillName,
    domain: targetSkill.domain,
    domainCode: targetSkill.domainCode,
    activityType,
    question,
  });
});

// POST /api/practice/:sessionId/answer
router.post("/practice/:sessionId/answer", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { sessionId } = req.params;
  const { questionId, selectedOptionId, correct, skillCode, timeSpentSeconds } = req.body;

  const [session] = await db.select().from(practiceSessionsTable).where(eq(practiceSessionsTable.id, sessionId)).limit(1);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const existingMastery = (await db.select().from(skillMasteryTable).where(
    and(eq(skillMasteryTable.studentId, session.studentId), eq(skillMasteryTable.skillCode, skillCode))
  ).limit(1))[0];

  const skill = (await db.select().from(elaSkillsTable).where(eq(elaSkillsTable.skillCode, skillCode)).limit(1))[0];

  const xpEarned = correct ? 10 : 2;

  if (existingMastery) {
    const newCount = existingMastery.practiceCount + 1;
    const newCorrect = existingMastery.correctCount + (correct ? 1 : 0);
    const newScore = Math.min(100, (newCorrect / newCount) * 100);
    const masteryLevel =
      newScore >= 90 ? "mastered"
      : newScore >= 75 ? "approaching"
      : newScore >= 50 ? "practicing"
      : "introduced";

    await db.update(skillMasteryTable).set({
      practiceCount: newCount,
      correctCount: newCorrect,
      smartScore: newScore,
      masteryPercentage: newScore,
      masteryLevel,
      lastPracticed: new Date(),
      consecutiveErrors: correct ? 0 : (existingMastery.consecutiveErrors + 1),
      needsReteaching: !correct && existingMastery.consecutiveErrors >= 2,
    }).where(eq(skillMasteryTable.id, existingMastery.id));
  } else {
    await db.insert(skillMasteryTable).values({
      studentId: session.studentId,
      skillCode,
      skillName: skill?.skillName ?? skillCode,
      domain: skill?.domainCode ?? "RL",
      masteryLevel: correct ? "introduced" : "not_started",
      smartScore: correct ? 25 : 0,
      masteryPercentage: correct ? 25 : 0,
      practiceCount: 1,
      correctCount: correct ? 1 : 0,
    });
  }

  // Update session
  const [updated] = await db.update(practiceSessionsTable).set({
    activitiesCompleted: session.activitiesCompleted + 1,
    totalQuestions: session.totalQuestions + 1,
    correctAnswers: session.correctAnswers + (correct ? 1 : 0),
    xpEarned: session.xpEarned + xpEarned,
  }).where(eq(practiceSessionsTable.id, sessionId)).returning();

  // Update student XP
  await db.update(studentProfilesTable).set({
    totalXp: sql`${studentProfilesTable.totalXp} + ${xpEarned}`,
  }).where(eq(studentProfilesTable.id, session.studentId));

  return res.json({ ...updated, xpEarned, correct });
});

// POST /api/practice/:sessionId/complete
router.post("/practice/:sessionId/complete", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { sessionId } = req.params;
  const { totalQuestions, correctAnswers, durationMin } = req.body;

  const [updated] = await db.update(practiceSessionsTable).set({
    status: "completed",
    totalQuestions: totalQuestions ?? 0,
    correctAnswers: correctAnswers ?? 0,
    durationMin: durationMin ?? null,
    completedAt: new Date(),
  }).where(eq(practiceSessionsTable.id, sessionId)).returning();

  if (!updated) return res.status(404).json({ error: "Session not found" });

  // Update streak on session complete
  const student = await getStudentByUserId(req.user!.id);
  if (student) {
    const now = new Date();
    const lastPracticed = student.updatedAt;
    const hoursSince = (now.getTime() - lastPracticed.getTime()) / (1000 * 60 * 60);
    const newStreak = hoursSince < 48 ? student.currentStreak + 1 : 1;
    await db.update(studentProfilesTable).set({
      currentStreak: newStreak,
    }).where(eq(studentProfilesTable.id, student.id));
  }

  return res.json(updated);
});

// GET /api/practice/history
router.get("/practice/history", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const student = await getStudentByUserId(req.user!.id);
  if (!student) return res.json([]);

  const sessions = await db
    .select()
    .from(practiceSessionsTable)
    .where(and(
      eq(practiceSessionsTable.studentId, student.id),
      eq(practiceSessionsTable.status, "completed"),
    ))
    .limit(20);

  return res.json(sessions);
});

// GET /api/students/intervention
router.get("/students/intervention", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const student = await getStudentByUserId(req.user!.id);
  if (!student) return res.status(404).json({ error: "Student profile not found" });

  const masteryRows = await db.select().from(skillMasteryTable).where(eq(skillMasteryTable.studentId, student.id)).limit(200);
  const allSkills = await db.select().from(elaSkillsTable).where(eq(elaSkillsTable.active, true)).limit(200);

  const gradeOrder = ["K","1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th"];
  const enrolledIdx = gradeOrder.indexOf(student.grade ?? "5th");
  const diagnosedIdx = gradeOrder.indexOf(student.diagnosedGradeLevel ?? student.grade ?? "5th");
  const gradeGap = Math.max(0, enrolledIdx - diagnosedIdx);

  const weakSkills = masteryRows
    .filter((m) => m.masteryLevel !== "mastered")
    .sort((a, b) => a.smartScore - b.smartScore);

  const phases = [
    {
      phaseNumber: 1,
      name: "Foundation Repair",
      description: "Build essential skills from diagnosed reading level",
      skills: weakSkills.slice(0, 5).map((m) => ({
        skillCode: m.skillCode,
        skillName: m.skillName,
        masteryLevel: m.masteryLevel,
        smartScore: m.smartScore,
        masteryPercentage: m.masteryPercentage,
      })),
    },
    {
      phaseNumber: 2,
      name: "Bridge Building",
      description: "Close the gap toward enrolled grade level",
      skills: weakSkills.slice(5, 10).map((m) => ({
        skillCode: m.skillCode,
        skillName: m.skillName,
        masteryLevel: m.masteryLevel,
        smartScore: m.smartScore,
        masteryPercentage: m.masteryPercentage,
      })),
    },
    {
      phaseNumber: 3,
      name: "Grade-Level Mastery",
      description: "Achieve mastery at enrolled grade level standards",
      skills: weakSkills.slice(10, 15).map((m) => ({
        skillCode: m.skillCode,
        skillName: m.skillName,
        masteryLevel: m.masteryLevel,
        smartScore: m.smartScore,
        masteryPercentage: m.masteryPercentage,
      })),
    },
  ];

  const currentPhase = phases.find((p) => p.skills.length > 0)?.phaseNumber ?? 1;

  return res.json({ studentId: student.id, gradeGap, currentPhase, phases });
});

export default router;
