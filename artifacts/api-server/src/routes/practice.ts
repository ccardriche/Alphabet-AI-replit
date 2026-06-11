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
import {
  eapUpdate,
  selectNextItem,
  thetaToSmartScore,
  thetaToMasteryLevel,
  type IrtResponse,
  type ItemCandidate,
} from "@workspace/irt-engine";

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
    answers: [],
  }).returning();

  return res.status(201).json(session);
});

// GET /api/practice/:sessionId/next
router.get("/practice/:sessionId/next", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { sessionId } = req.params;

  const [session] = await db
    .select()
    .from(practiceSessionsTable)
    .where(eq(practiceSessionsTable.id, sessionId))
    .limit(1);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const owner = (await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, req.user!.id))
    .limit(1))[0];
  if (!owner || owner.id !== session.studentId) return res.status(403).json({ error: "Forbidden" });

  const student = await getStudentByUserId(req.user!.id);
  const masteryRows = await db
    .select()
    .from(skillMasteryTable)
    .where(eq(skillMasteryTable.studentId, session.studentId))
    .limit(200);

  const allSkills = await db
    .select()
    .from(elaSkillsTable)
    .where(eq(elaSkillsTable.active, true))
    .limit(200);

  // Filter by focus domain if set
  const domainSkills = session.focusDomain
    ? allSkills.filter((s) => s.domainCode === session.focusDomain || s.domain === session.focusDomain)
    : allSkills;

  // Select target skill: prioritise in-progress skills (not mastered), lowest smartScore first
  let targetSkill: typeof allSkills[0] | undefined;
  const practicing = masteryRows
    .filter((m) => m.masteryLevel !== "mastered")
    .sort((a, b) => a.smartScore - b.smartScore);

  if (practicing.length > 0) {
    const target = practicing[0];
    targetSkill = domainSkills.find((s) => s.skillCode === target.skillCode);
  }

  if (!targetSkill) {
    const practicedCodes = new Set(masteryRows.map((m) => m.skillCode));
    const unstarted = domainSkills.filter((s) => !practicedCodes.has(s.skillCode));
    targetSkill = unstarted[Math.floor(Math.random() * unstarted.length)] ?? domainSkills[0] ?? allSkills[0];
  }

  if (!targetSkill) return res.status(400).json({ error: "No skills available" });

  // Get the current theta for this skill from mastery record (or default 0)
  const mastery = masteryRows.find((m) => m.skillCode === targetSkill!.skillCode);
  const skillTheta = mastery?.theta ?? 0;
  const skillSe = mastery?.thetaSe ?? 999;

  // MFI item selection: find the best item calibration within this skill's difficulty range
  // For a single skill, we select a difficulty close to targetSkill.difficulty but use MFI
  const candidates: ItemCandidate[] = [
    {
      skillCode: targetSkill.skillCode,
      a: targetSkill.discrimination ?? 1.0,
      b: targetSkill.difficulty ?? 0,
      c: targetSkill.guessing ?? 0.25,
    },
  ];
  const selected = selectNextItem(skillTheta, candidates) ?? candidates[0];

  let question;
  try {
    question = await generateQuestion({
      skillCode: targetSkill.skillCode,
      skillName: targetSkill.skillName,
      domain: targetSkill.domain,
      gradeLevel: targetSkill.gradeLevel,
      difficulty: selected.b,
      interests: student?.interests ?? [],
      culturalContext: student?.culturalContext ?? [],
      activityType: "multiple_choice",
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
    activityType: "multiple_choice",
    question,
    irt: { a: selected.a, b: selected.b, c: selected.c },
    currentSkillTheta: skillTheta,
    currentSkillSe: skillSe,
    currentSkillSmartScore: thetaToSmartScore(skillTheta),
  });
});

// POST /api/practice/:sessionId/answer
router.post("/practice/:sessionId/answer", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { sessionId } = req.params;
  const { questionId, selectedOptionId, correct, skillCode, timeSpentSeconds, irt } = req.body;

  const [session] = await db
    .select()
    .from(practiceSessionsTable)
    .where(eq(practiceSessionsTable.id, sessionId))
    .limit(1);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const owner = (await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, req.user!.id))
    .limit(1))[0];
  if (!owner || owner.id !== session.studentId) return res.status(403).json({ error: "Forbidden" });

  // IRT parameters from request (returned by /next endpoint)
  const a: number = irt?.a ?? 1.0;
  const b: number = irt?.b ?? 0;
  const c: number = irt?.c ?? 0.25;

  // Load current skill mastery (for existing theta prior)
  const existingMastery = (await db
    .select()
    .from(skillMasteryTable)
    .where(and(eq(skillMasteryTable.studentId, session.studentId), eq(skillMasteryTable.skillCode, skillCode)))
    .limit(1))[0];

  const skill = (await db
    .select()
    .from(elaSkillsTable)
    .where(eq(elaSkillsTable.skillCode, skillCode))
    .limit(1))[0];

  // Update theta using EAP single-step update (Bayesian posterior update)
  const currentTheta = existingMastery?.theta ?? 0;
  const currentSe = existingMastery?.thetaSe ?? 999;
  const resp: IrtResponse = { a, b, c, correct };
  const { theta: newTheta, se: newSe } = eapUpdate(currentTheta, currentSe, resp);

  const newSmartScore = thetaToSmartScore(newTheta);
  const newMasteryLevel = thetaToMasteryLevel(newTheta);

  const newCount = (existingMastery?.practiceCount ?? 0) + 1;
  const newCorrect = (existingMastery?.correctCount ?? 0) + (correct ? 1 : 0);
  const newConsecutiveErrors = correct ? 0 : (existingMastery?.consecutiveErrors ?? 0) + 1;
  const needsReteaching = !correct && newConsecutiveErrors >= 2;

  if (existingMastery) {
    await db.update(skillMasteryTable).set({
      theta: newTheta,
      thetaSe: newSe,
      smartScore: newSmartScore,
      masteryPercentage: newSmartScore,
      masteryLevel: newMasteryLevel,
      practiceCount: newCount,
      correctCount: newCorrect,
      consecutiveErrors: newConsecutiveErrors,
      needsReteaching,
      lastPracticed: new Date(),
    }).where(eq(skillMasteryTable.id, existingMastery.id));
  } else {
    await db.insert(skillMasteryTable).values({
      studentId: session.studentId,
      skillCode,
      skillName: skill?.skillName ?? skillCode,
      domain: skill?.domainCode ?? "RL",
      theta: newTheta,
      thetaSe: newSe,
      smartScore: newSmartScore,
      masteryPercentage: newSmartScore,
      masteryLevel: newMasteryLevel,
      practiceCount: 1,
      correctCount: correct ? 1 : 0,
      consecutiveErrors: correct ? 0 : 1,
      needsReteaching: !correct,
    });
  }

  const xpEarned = correct ? 10 : 2;

  // Append answer to session history
  const prevAnswers = (session.answers as any[]) ?? [];
  const newAnswer = { questionId, skillCode, correct, timeSpentSeconds, irt: { a, b, c } };

  const [updated] = await db.update(practiceSessionsTable).set({
    activitiesCompleted: session.activitiesCompleted + 1,
    totalQuestions: session.totalQuestions + 1,
    correctAnswers: session.correctAnswers + (correct ? 1 : 0),
    xpEarned: session.xpEarned + xpEarned,
    answers: [...prevAnswers, newAnswer],
  }).where(eq(practiceSessionsTable.id, sessionId)).returning();

  await db.update(studentProfilesTable).set({
    totalXp: sql`${studentProfilesTable.totalXp} + ${xpEarned}`,
  }).where(eq(studentProfilesTable.id, session.studentId));

  return res.json({
    ...updated,
    xpEarned,
    correct,
    newSkillTheta: newTheta,
    newSkillSe: newSe,
    newSmartScore,
    newMasteryLevel,
  });
});

// POST /api/practice/:sessionId/complete
router.post("/practice/:sessionId/complete", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { sessionId } = req.params;
  const { totalQuestions, correctAnswers, durationMin } = req.body;

  const [session] = await db
    .select()
    .from(practiceSessionsTable)
    .where(eq(practiceSessionsTable.id, sessionId))
    .limit(1);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const owner = (await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, req.user!.id))
    .limit(1))[0];
  if (!owner || owner.id !== session.studentId) return res.status(403).json({ error: "Forbidden" });

  const [updated] = await db.update(practiceSessionsTable).set({
    status: "completed",
    totalQuestions: totalQuestions ?? session.totalQuestions,
    correctAnswers: correctAnswers ?? session.correctAnswers,
    durationMin: durationMin ?? null,
    completedAt: new Date(),
  }).where(eq(practiceSessionsTable.id, sessionId)).returning();

  if (!updated) return res.status(404).json({ error: "Session not found" });

  const student = await getStudentByUserId(req.user!.id);
  if (student) {
    const now = new Date();
    const hoursSince = (now.getTime() - student.updatedAt.getTime()) / (1000 * 60 * 60);
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

  const masteryRows = await db
    .select()
    .from(skillMasteryTable)
    .where(eq(skillMasteryTable.studentId, student.id))
    .limit(200);

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
        theta: m.theta,
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
        theta: m.theta,
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
        theta: m.theta,
      })),
    },
  ];

  const currentPhase = phases.find((p) => p.skills.length > 0)?.phaseNumber ?? 1;
  return res.json({ studentId: student.id, gradeGap, currentPhase, phases });
});

export default router;
