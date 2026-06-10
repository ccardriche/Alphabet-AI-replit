import { Router } from "express";
import { db } from "@workspace/db";
import {
  placementSessionsTable,
  elaSkillsTable,
  studentProfilesTable,
  skillMasteryTable,
} from "@workspace/db/schema";
import { eq, and, ne } from "drizzle-orm";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY ?? "sk-placeholder",
});

// POST /api/placement/start
router.post("/placement/start", async (req, res) => {
  const { studentId } = req.body as { studentId: string };
  if (!studentId) return res.status(400).json({ error: "studentId required" });

  const [session] = await db.insert(placementSessionsTable).values({
    studentId,
    status: "in_progress",
    theta: 0,
    thetaSe: 999,
    answers: [],
  }).returning();

  return res.status(201).json(session);
});

// GET /api/placement/:sessionId/next
router.get("/placement/:sessionId/next", async (req, res) => {
  const { sessionId } = req.params;
  const [session] = await db.select().from(placementSessionsTable).where(eq(placementSessionsTable.id, sessionId)).limit(1);
  if (!session) return res.status(404).json({ error: "Session not found" });

  if (session.status === "completed") {
    return res.status(400).json({ error: "Session already completed" });
  }

  // Pick a skill near the current theta (difficulty ≈ theta)
  const answers = (session.answers as any[]) ?? [];
  const usedCodes = answers.map((a: any) => a.skillCode).filter(Boolean);

  const skills = await db.select().from(elaSkillsTable).where(eq(elaSkillsTable.active, true)).limit(200);
  const available = skills.filter((s) => !usedCodes.includes(s.skillCode));

  // Sort by difficulty closest to theta
  available.sort((a, b) => Math.abs(a.difficulty - session.theta) - Math.abs(b.difficulty - session.theta));
  const targetSkill = available[0];

  if (!targetSkill) {
    return res.status(400).json({ error: "No more skills available" });
  }

  // Generate question via OpenAI
  const student = (await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.id, session.studentId)).limit(1))[0];

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
      activityType: "multiple_choice",
    });
  } catch (e) {
    // Fallback mock question
    question = makeMockQuestion(targetSkill);
  }

  return res.json(question);
});

// POST /api/placement/:sessionId/answer
router.post("/placement/:sessionId/answer", async (req, res) => {
  const { sessionId } = req.params;
  const { questionId, selectedOptionId, skillCode, correct, timeSpentSeconds } = req.body;

  const [session] = await db.select().from(placementSessionsTable).where(eq(placementSessionsTable.id, sessionId)).limit(1);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const skill = (await db.select().from(elaSkillsTable).where(eq(elaSkillsTable.skillCode, skillCode)).limit(1))[0];
  const b = skill?.difficulty ?? 0;
  const a = skill?.discrimination ?? 1.0;
  const c = skill?.guessing ?? 0.25;

  // 3-PL IRT theta update (simplified EM)
  let theta = session.theta;
  const p = c + (1 - c) / (1 + Math.exp(-a * (theta - b)));
  const w = p * (1 - p);
  const newFisherInfo = session.fisherInfo + a * a * w;
  const gradient = correct ? (1 - p) : -p;
  theta = theta + (a * gradient) / Math.max(0.1, newFisherInfo);
  theta = Math.max(-4, Math.min(4, theta)); // clamp

  const newSe = newFisherInfo > 0 ? 1 / Math.sqrt(newFisherInfo) : 999;

  const answers = [...((session.answers as any[]) ?? []), { questionId, skillCode, correct, timeSpentSeconds }];
  const questionCount = session.questionCount + 1;

  // Stop conditions: 20 questions OR SE < 0.35
  const complete = questionCount >= 20 || newSe < 0.35;

  let updates: any = {
    theta,
    thetaSe: newSe,
    fisherInfo: newFisherInfo,
    questionCount,
    answers,
  };

  if (complete) {
    const diagnosedGrade = thetaToGrade(theta);
    const pathway = thetaToPathway(theta);
    const correctCount = answers.filter((a: any) => a.correct).length;
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

  const [updated] = await db.update(placementSessionsTable).set(updates).where(eq(placementSessionsTable.id, sessionId)).returning();
  return res.json({ ...updated, complete });
});

// GET /api/placement/:sessionId/result
router.get("/placement/:sessionId/result", async (req, res) => {
  const [session] = await db.select().from(placementSessionsTable).where(eq(placementSessionsTable.id, req.params.sessionId)).limit(1);
  if (!session) return res.status(404).json({ error: "Session not found" });
  return res.json(session);
});

function thetaToGrade(theta: number): string {
  if (theta < -2.5) return "K";
  if (theta < -2.0) return "1st";
  if (theta < -1.5) return "2nd";
  if (theta < -1.0) return "3rd";
  if (theta < -0.5) return "4th";
  if (theta < 0.0) return "5th";
  if (theta < 0.5) return "6th";
  if (theta < 1.0) return "7th";
  if (theta < 1.5) return "8th";
  if (theta < 2.0) return "9th";
  if (theta < 2.5) return "10th";
  if (theta < 3.0) return "11th";
  return "12th";
}

function thetaToPathway(theta: number): string {
  if (theta < -1.5) return "foundation";
  if (theta < 0) return "developing";
  if (theta < 1.5) return "proficient";
  return "advanced";
}

async function generateQuestion(params: {
  skillCode: string;
  skillName: string;
  domain: string;
  gradeLevel: string;
  difficulty: number;
  interests: string[];
  culturalContext: string[];
  activityType: string;
}) {
  const { skillCode, skillName, domain, gradeLevel, difficulty, interests, culturalContext } = params;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert ELA question writer. Create a single multiple-choice question for a ${gradeLevel} student on the skill "${skillName}" (${domain}). The question difficulty is ${difficulty.toFixed(2)} (IRT b-parameter, range -3 to 3). Student interests: ${interests.join(", ") || "general"}. Cultural context: ${culturalContext.join(", ") || "diverse"}. Return valid JSON only.`,
      },
      {
        role: "user",
        content: `Generate a multiple-choice question. JSON format:
{
  "id": "q_${Date.now()}",
  "skillCode": "${skillCode}",
  "skillName": "${skillName}",
  "domain": "${domain}",
  "questionText": "...",
  "passage": "... (optional, include for reading comprehension)",
  "activityType": "multiple_choice",
  "options": [
    {"id": "a", "text": "..."},
    {"id": "b", "text": "..."},
    {"id": "c", "text": "..."},
    {"id": "d", "text": "..."}
  ],
  "correctOptionId": "a",
  "explanation": "Brief explanation of the correct answer",
  "difficulty": ${difficulty}
}
Only include "passage" if relevant to the question. Make the question culturally relevant to student interests.`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 600,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  return JSON.parse(raw);
}

function makeMockQuestion(skill: { skillCode: string; skillName: string; domain: string; domainCode: string; gradeLevel: string; difficulty: number }) {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    skillCode: skill.skillCode,
    skillName: skill.skillName,
    domain: skill.domain,
    questionText: `Which best demonstrates understanding of ${skill.skillName}?`,
    activityType: "multiple_choice",
    options: [
      { id: "a", text: "Option A — the correct answer" },
      { id: "b", text: "Option B — plausible distractor" },
      { id: "c", text: "Option C — plausible distractor" },
      { id: "d", text: "Option D — plausible distractor" },
    ],
    correctOptionId: "a",
    explanation: `This tests ${skill.skillName} at the ${skill.gradeLevel} level.`,
    difficulty: skill.difficulty,
  };
}

export { generateQuestion, makeMockQuestion };
export default router;
