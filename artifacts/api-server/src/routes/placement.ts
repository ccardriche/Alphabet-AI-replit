import { Router } from "express";
import { db } from "@workspace/db";
import {
  placementSessionsTable,
  elaSkillsTable,
  studentProfilesTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  eapEstimate,
  selectNextItem,
  thetaToGrade,
  thetaToPathway,
  shouldStopPlacement,
  type IrtResponse,
  type ItemCandidate,
} from "@workspace/irt-engine";
import { generateQuestion, getFallbackQuestion, makeMockQuestion } from "../services/questionGenerator";

export type { AdaptiveQuestion } from "../services/questionGenerator";
export { generateQuestion, getFallbackQuestion, makeMockQuestion };

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

// POST /api/placement/start
router.post("/placement/start", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const student = await getStudentByUserId(req.user!.id);
  if (!student) return res.status(404).json({ error: "Student profile not found. Complete onboarding first." });

  const [session] = await db.insert(placementSessionsTable).values({
    studentId: student.id,
    status: "in_progress",
    theta: 0,
    thetaSe: 999,
    fisherInfo: 0,
    answers: [],
  }).returning();

  return res.status(201).json(session);
});

// GET /api/placement/:sessionId/next
router.get("/placement/:sessionId/next", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { sessionId } = req.params;

  const [session] = await db
    .select()
    .from(placementSessionsTable)
    .where(eq(placementSessionsTable.id, sessionId))
    .limit(1);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const owner = (await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, req.user!.id))
    .limit(1))[0];
  if (!owner || owner.id !== session.studentId) return res.status(403).json({ error: "Forbidden" });

  if (session.status === "completed") {
    return res.status(400).json({ error: "Session already completed" });
  }

  const answers = (session.answers as any[]) ?? [];
  const usedCodes = new Set(answers.map((a: any) => a.skillCode).filter(Boolean));

  const allSkills = await db
    .select()
    .from(elaSkillsTable)
    .where(eq(elaSkillsTable.active, true))
    .limit(200);

  // Build candidate list for MFI selection
  const candidates: ItemCandidate[] = allSkills
    .filter((s) => !usedCodes.has(s.skillCode))
    .map((s) => ({
      skillCode: s.skillCode,
      a: s.discrimination ?? 1.0,
      b: s.difficulty ?? 0,
      c: s.guessing ?? 0.25,
    }));

  const targetCandidate = selectNextItem(session.theta, candidates);
  if (!targetCandidate) {
    return res.status(400).json({ error: "No more skills available" });
  }

  const targetSkill = allSkills.find((s) => s.skillCode === targetCandidate.skillCode)!;
  const student = await getStudentByUserId(req.user!.id);

  const question = await generateQuestion({
    skillCode: targetSkill.skillCode,
    skillName: targetSkill.skillName,
    domain: targetSkill.domain,
    gradeLevel: targetSkill.gradeLevel,
    difficulty: targetSkill.difficulty,
    interests: student?.interests ?? [],
    culturalContext: student?.culturalContext ?? [],
    activityType: "multiple_choice",
    mode: "placement",
    studentTheta: session.theta,
  });

  return res.json({
    ...question,
    irt: { a: targetCandidate.a, b: targetCandidate.b, c: targetCandidate.c },
    currentTheta: session.theta,
    currentSe: session.thetaSe,
    questionNumber: answers.length + 1,
  });
});

// POST /api/placement/:sessionId/answer
router.post("/placement/:sessionId/answer", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { sessionId } = req.params;
  const { questionId, selectedOptionId, skillCode, correct, timeSpentSeconds, irt } = req.body;

  const [session] = await db
    .select()
    .from(placementSessionsTable)
    .where(eq(placementSessionsTable.id, sessionId))
    .limit(1);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const owner = (await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, req.user!.id))
    .limit(1))[0];
  if (!owner || owner.id !== session.studentId) return res.status(403).json({ error: "Forbidden" });

  // Retrieve IRT parameters from client payload (returned by /next) or fall back to DB
  let a: number, b: number, c: number;
  if (irt && typeof irt.a === "number") {
    a = irt.a; b = irt.b; c = irt.c;
  } else {
    const skill = (await db.select().from(elaSkillsTable).where(eq(elaSkillsTable.skillCode, skillCode)).limit(1))[0];
    a = skill?.discrimination ?? 1.0;
    b = skill?.difficulty ?? 0;
    c = skill?.guessing ?? 0.25;
  }

  // Append this response and recompute EAP over all responses in the session
  const prevAnswers = (session.answers as any[]) ?? [];
  const newAnswer = { questionId, skillCode, correct, timeSpentSeconds, irt: { a, b, c } };
  const allAnswers = [...prevAnswers, newAnswer];

  const irtResponses: IrtResponse[] = allAnswers.map((ans: any) => ({
    a: ans.irt?.a ?? 1.0,
    b: ans.irt?.b ?? 0,
    c: ans.irt?.c ?? 0.25,
    correct: ans.correct,
  }));

  const { theta, se } = eapEstimate(irtResponses);
  const questionCount = allAnswers.length;
  const complete = shouldStopPlacement(questionCount, se);

  let updates: any = {
    theta,
    thetaSe: se,
    questionCount,
    answers: allAnswers,
  };

  if (complete) {
    const diagnosedGrade = thetaToGrade(theta);
    const pathway = thetaToPathway(theta);
    const correctCount = allAnswers.filter((a: any) => a.correct).length;
    updates = {
      ...updates,
      status: "completed",
      diagnosedGradeLevel: diagnosedGrade,
      placementPathway: pathway,
      accuracyPct: (correctCount / questionCount) * 100,
      completedAt: new Date(),
    };

    await db.update(studentProfilesTable).set({
      preAssessmentCompleted: true,
      diagnosedGradeLevel: diagnosedGrade,
      placementPathway: pathway,
    }).where(eq(studentProfilesTable.id, session.studentId));
  }

  const [updated] = await db
    .update(placementSessionsTable)
    .set(updates)
    .where(eq(placementSessionsTable.id, sessionId))
    .returning();

  return res.json({
    ...updated,
    complete,
    newTheta: theta,
    newSe: se,
  });
});

// GET /api/placement/:sessionId/result
router.get("/placement/:sessionId/result", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const [session] = await db
    .select()
    .from(placementSessionsTable)
    .where(eq(placementSessionsTable.id, req.params.sessionId))
    .limit(1);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const owner = (await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, req.user!.id))
    .limit(1))[0];
  if (!owner || owner.id !== session.studentId) return res.status(403).json({ error: "Forbidden" });

  return res.json(session);
});

export default router;
