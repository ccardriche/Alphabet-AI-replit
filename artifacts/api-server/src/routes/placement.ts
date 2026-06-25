import { Router } from "express";
import { db } from "@workspace/db";
import {
  placementSessionsTable,
  elaSkillsTable,
  studentProfilesTable,
  questionCacheTable,
  skillMasteryTable,
} from "@workspace/db/schema";
import { eq, and as drizzleAnd, sql as drizzleSql } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  eapEstimate,
  selectNextItem,
  thetaToGrade,
  thetaToPathway,
  shouldStopPlacement,
  type IrtResponse,
  type ItemCandidate,
} from "@workspace/irt-engine";
import { generateQuestion, getFallbackQuestion, makeMockQuestion, AdaptiveQuestionSchema } from "../services/questionGenerator";
import {
  computeDomainBreakdown,
  summarizeStrands,
  recommendNextSteps,
  computeSkillSeed,
  placementItemTypeForIndex,
  type PlacementAnswerRecord,
  type DomainScore,
} from "../services/placementReport";

export type { AdaptiveQuestion } from "../services/questionGenerator";
export { generateQuestion, getFallbackQuestion, makeMockQuestion };

const router = Router();

async function getQuestionFromCache(questionId: string) {
  const rows = await db
    .select()
    .from(questionCacheTable)
    .where(drizzleSql`${questionCacheTable.payload}->>'id' = ${questionId}`)
    .limit(1);
  if (rows.length === 0) return null;
  const parsed = AdaptiveQuestionSchema.safeParse(rows[0].payload);
  return parsed.success ? parsed.data : null;
}

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

// Grades present in the ela_skills catalog, lowest → highest.
const SEED_GRADE_ORDER = ["K", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

/** Resolve a diagnosed grade to a grade that actually has skills (clamp 9th–12th → 8th). */
function resolveSeedGrade(diagnosedGrade: string): string {
  return SEED_GRADE_ORDER.includes(diagnosedGrade)
    ? diagnosedGrade
    : SEED_GRADE_ORDER[SEED_GRADE_ORDER.length - 1];
}

/**
 * Build the student's individual skill map from their placement result.
 *
 * Seeds a skill_mastery row for every active skill at the diagnosed grade, each
 * with a starting θ / SmartScore / mastery level derived from the overall
 * placement θ and how the student performed on that strand. Idempotent: existing
 * rows (e.g. from prior practice or a re-take) are preserved via ON CONFLICT DO
 * NOTHING, so earned progress is never overwritten. Returns the number of newly
 * mapped skills.
 */
async function seedSkillMasteryFromPlacement(
  studentId: string,
  baseTheta: number,
  breakdown: DomainScore[],
  diagnosedGrade: string,
): Promise<number> {
  const grade = resolveSeedGrade(diagnosedGrade);
  const skills = await db
    .select()
    .from(elaSkillsTable)
    .where(drizzleAnd(eq(elaSkillsTable.active, true), eq(elaSkillsTable.gradeLevel, grade)))
    .limit(500);
  if (skills.length === 0) return 0;

  const accuracyByDomain = new Map(breakdown.map((d) => [d.domainCode, d.accuracyPct]));

  const rows = skills.map((s) => {
    const seed = computeSkillSeed(baseTheta, accuracyByDomain.get(s.domainCode) ?? null);
    return {
      studentId,
      skillCode: s.skillCode,
      skillName: s.skillName,
      domain: s.domainCode,
      masteryLevel: seed.masteryLevel,
      masteryPercentage: seed.masteryPercentage,
      smartScore: seed.smartScore,
      theta: seed.theta,
      thetaSe: seed.thetaSe,
      sequenceOrder: s.subSkillOrder,
      isUnlocked: true,
    };
  });

  const inserted = await db
    .insert(skillMasteryTable)
    .values(rows)
    .onConflictDoNothing({ target: [skillMasteryTable.studentId, skillMasteryTable.skillCode] })
    .returning({ id: skillMasteryTable.id });

  return inserted.length;
}

/** Count how many skills are mapped for a student (their full learning map size). */
async function countMappedSkills(studentId: string): Promise<number> {
  const [row] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(skillMasteryTable)
    .where(eq(skillMasteryTable.studentId, studentId));
  return row?.count ?? 0;
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

// GET /api/placement/:sessionId/question
router.get("/placement/:sessionId/question", async (req, res) => {
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

  const placementItemType = placementItemTypeForIndex(answers.length);

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
    placementItemType,
  });

  // Strip correctOptionId — never sent to client; server evaluates correctness on submit
  const { correctOptionId: _coid, ...questionSafe } = question;
  return res.json({
    ...questionSafe,
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
  const { questionId, selectedOptionId, skillCode, timeSpentSeconds, irt } = req.body;

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

  // Evaluate correctness server-side — never trust client-submitted correct field
  const cachedQ = await getQuestionFromCache(questionId);
  if (!cachedQ) {
    return res.status(400).json({ error: "Question not found in cache; cannot evaluate answer." });
  }
  const correct = selectedOptionId === cachedQ.correctOptionId;
  const correctOptionId = cachedQ.correctOptionId;

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
  let skillsMapped = 0;

  if (complete) {
    const diagnosedGrade = thetaToGrade(theta);
    const pathway = thetaToPathway(theta);
    const correctCount = allAnswers.filter((a: any) => a.correct).length;
    const breakdown = computeDomainBreakdown(allAnswers as PlacementAnswerRecord[]);
    const { strandStrengths, strandGaps } = summarizeStrands(breakdown);
    updates = {
      ...updates,
      status: "completed",
      diagnosedGradeLevel: diagnosedGrade,
      placementPathway: pathway,
      accuracyPct: (correctCount / questionCount) * 100,
      strandStrengths,
      strandGaps,
      completedAt: new Date(),
    };

    await db.update(studentProfilesTable).set({
      preAssessmentCompleted: true,
      diagnosedGradeLevel: diagnosedGrade,
      placementPathway: pathway,
    }).where(eq(studentProfilesTable.id, session.studentId));

    // Build the student's individual skill map from the placement result so the
    // dashboard / skill tree have a personalized starting point. Non-fatal: a
    // failure here must not block placement completion.
    try {
      skillsMapped = await seedSkillMasteryFromPlacement(
        session.studentId,
        theta,
        breakdown,
        diagnosedGrade,
      );
    } catch (err) {
      logger.warn({ err, sessionId }, "Failed to seed skill mastery from placement");
    }
  }

  const [updated] = await db
    .update(placementSessionsTable)
    .set(updates)
    .where(eq(placementSessionsTable.id, sessionId))
    .returning();

  return res.json({
    ...updated,
    complete,
    correct,
    correctOptionId,
    newTheta: theta,
    thetaSe: se,
    newSe: se,
    skillsMapped,
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

  const answers = (session.answers as any[]) ?? [];
  const domainBreakdown = computeDomainBreakdown(answers as PlacementAnswerRecord[]);
  const pathway = session.placementPathway ?? "developing";
  const gradeLevel = session.diagnosedGradeLevel ?? "grade";
  const recommendedNextSteps =
    session.status === "completed" ? recommendNextSteps(domainBreakdown, pathway, gradeLevel) : [];
  const skillsMapped =
    session.status === "completed" ? await countMappedSkills(session.studentId) : 0;

  return res.json({
    ...session,
    sessionId: session.id,
    thetaFinal: session.theta,
    domainBreakdown,
    recommendedNextSteps,
    skillsMapped,
  });
});

export default router;
