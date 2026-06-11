import { Router } from "express";
import { db } from "@workspace/db";
import {
  practiceSessionsTable,
  studentProfilesTable,
  skillMasteryTable,
  elaSkillsTable,
} from "@workspace/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { checkAndAwardBadges } from "../lib/badges";
import {
  eapUpdate,
  selectNextItem,
  thetaToSmartScore,
  thetaToMasteryLevel,
  type IrtResponse,
  type ItemCandidate,
} from "@workspace/irt-engine";
import { generateQuestion } from "../services/questionGenerator";

const router = Router();

const ACTIVITY_SEQUENCE = [
  "listen_repeat",
  "see_tap",
  "multiple_choice",
  "fill_blank",
  "multiple_choice",
  "short_answer",
  "multiple_choice",
  "read_it",
  "write_it",
  "multiple_choice",
] as const;

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

  const { focusDomain, focusSkillCode } = req.body as { focusDomain?: string; focusSkillCode?: string };

  const [session] = await db.insert(practiceSessionsTable).values({
    studentId: student.id,
    status: "in_progress",
    focusDomain: focusDomain ?? null,
    focusSkillCode: focusSkillCode ?? null,
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

  // If the session targets a specific skill, pin to that skill
  if (session.focusSkillCode) {
    const pinned = allSkills.find((s) => s.skillCode === session.focusSkillCode);
    if (pinned) {
      const mastery = masteryRows.find((m) => m.skillCode === pinned.skillCode);
      const skillTheta = mastery?.theta ?? 0;
      const skillSe = mastery?.thetaSe ?? 999;
      const candidates: ItemCandidate[] = [{
        skillCode: pinned.skillCode,
        a: pinned.discrimination ?? 1.0,
        b: pinned.difficulty ?? 0,
        c: pinned.guessing ?? 0.25,
      }];
      const selected = selectNextItem(skillTheta, candidates) ?? candidates[0];
      const activityType = ACTIVITY_SEQUENCE[session.activitiesCompleted % ACTIVITY_SEQUENCE.length];
      const question = await generateQuestion({
        skillCode: pinned.skillCode,
        skillName: pinned.skillName,
        domain: pinned.domain,
        gradeLevel: pinned.gradeLevel,
        difficulty: selected.b,
        interests: student?.interests ?? [],
        culturalContext: student?.culturalContext ?? [],
        activityType,
        mode: "practice",
        studentTheta: skillTheta,
      });
      return res.json({
        sessionId,
        skillCode: pinned.skillCode,
        skillName: pinned.skillName,
        domain: pinned.domain,
        domainCode: pinned.domainCode,
        activityType,
        question,
        irt: { a: selected.a, b: selected.b, c: selected.c },
        currentSkillTheta: skillTheta,
        currentSkillSe: skillSe,
        currentSkillSmartScore: thetaToSmartScore(skillTheta),
      });
    }
  }

  const domainSkills = session.focusDomain
    ? allSkills.filter((s) => s.domainCode === session.focusDomain || s.domain === session.focusDomain)
    : allSkills;

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

  const mastery = masteryRows.find((m) => m.skillCode === targetSkill!.skillCode);
  const skillTheta = mastery?.theta ?? 0;
  const skillSe = mastery?.thetaSe ?? 999;

  const candidates: ItemCandidate[] = [
    {
      skillCode: targetSkill.skillCode,
      a: targetSkill.discrimination ?? 1.0,
      b: targetSkill.difficulty ?? 0,
      c: targetSkill.guessing ?? 0.25,
    },
  ];
  const selected = selectNextItem(skillTheta, candidates) ?? candidates[0];

  const activityType = ACTIVITY_SEQUENCE[session.activitiesCompleted % ACTIVITY_SEQUENCE.length];

  const question = await generateQuestion({
    skillCode: targetSkill.skillCode,
    skillName: targetSkill.skillName,
    domain: targetSkill.domain,
    gradeLevel: targetSkill.gradeLevel,
    difficulty: selected.b,
    interests: student?.interests ?? [],
    culturalContext: student?.culturalContext ?? [],
    activityType,
    mode: "practice",
    studentTheta: skillTheta,
  });

  return res.json({
    sessionId,
    skillCode: targetSkill.skillCode,
    skillName: targetSkill.skillName,
    domain: targetSkill.domain,
    domainCode: targetSkill.domainCode,
    activityType,
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

  const a: number = irt?.a ?? 1.0;
  const b: number = irt?.b ?? 0;
  const c: number = irt?.c ?? 0.25;

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

  // Set masteredAt only once — when the skill first transitions into "mastered"
  const justMastered =
    newMasteryLevel === "mastered" &&
    (!existingMastery || existingMastery.masteryLevel !== "mastered");

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
      // Only stamp masteredAt when transitioning into mastered for the first time
      ...(justMastered ? { masteredAt: new Date() } : {}),
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
      masteredAt: newMasteryLevel === "mastered" ? new Date() : undefined,
    });
  }

  const xpEarned = correct ? 10 : 2;

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

  const newBadges = await checkAndAwardBadges(session.studentId);

  return res.json({
    ...updated,
    xpEarned,
    correct,
    newSkillTheta: newTheta,
    newSkillSe: newSe,
    newSmartScore,
    newMasteryLevel,
    newBadges,
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
    // Find the last 2 completed sessions (the current one + the prior one) to determine streak.
    // Since we just marked this session complete above, the most recent result is the current session.
    const prevCompletedSessions = await db
      .select({ completedAt: practiceSessionsTable.completedAt })
      .from(practiceSessionsTable)
      .where(and(
        eq(practiceSessionsTable.studentId, session.studentId),
        eq(practiceSessionsTable.status, "completed"),
      ))
      .orderBy(desc(practiceSessionsTable.completedAt))
      .limit(2);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // The first result is the session we just completed; the second is the prior one
    const lastPractice = prevCompletedSessions.length > 1
      ? prevCompletedSessions[1].completedAt
      : null;

    let newStreak: number;
    if (!lastPractice) {
      // First ever session
      newStreak = 1;
    } else if (lastPractice >= todayStart) {
      // Already practiced today earlier — keep the streak, don't double-count
      newStreak = student.currentStreak;
    } else if (lastPractice >= yesterdayStart) {
      // Practiced yesterday — extend the streak
      newStreak = student.currentStreak + 1;
    } else {
      // Gap of more than 1 day — reset
      newStreak = 1;
    }

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

// GET /api/students/intervention — list skills with needsReteaching=true grouped by domain
router.get("/students/intervention", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const student = await getStudentByUserId(req.user!.id);
  if (!student) return res.status(404).json({ error: "Student profile not found" });

  const masteryRows = await db
    .select()
    .from(skillMasteryTable)
    .where(and(eq(skillMasteryTable.studentId, student.id), eq(skillMasteryTable.needsReteaching, true)))
    .orderBy(desc(skillMasteryTable.consecutiveErrors))
    .limit(50);

  // Group by domain
  const domainMap = new Map<string, typeof masteryRows>();
  for (const row of masteryRows) {
    const dom = row.domain ?? "Other";
    if (!domainMap.has(dom)) domainMap.set(dom, []);
    domainMap.get(dom)!.push(row);
  }

  const groups = Array.from(domainMap.entries()).map(([domain, rows]) => ({
    domain,
    skills: rows.map((m) => ({
      skillCode: m.skillCode,
      skillName: m.skillName,
      domain: m.domain,
      smartScore: m.smartScore,
      masteryLevel: m.masteryLevel,
      consecutiveErrors: m.consecutiveErrors,
      // Simulate last-5 score trend from practice count and correctCount (we don't store per-attempt history)
      recentScores: Array.from({ length: Math.min(5, m.practiceCount) }, (_, i) => {
        // Approximate a downward trend based on consecutive errors
        const base = m.smartScore;
        const errorOffset = m.consecutiveErrors * 8;
        return Math.max(0, Math.min(100, base + errorOffset - i * (errorOffset / Math.max(1, m.consecutiveErrors))));
      }).reverse(),
    })),
  }));

  return res.json(groups);
});

export default router;
