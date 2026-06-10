import { Router } from "express";
import { db } from "@workspace/db";
import { lessonSessionsTable, elaSkillsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY ?? "sk-placeholder",
});

function requireAuth(req: any, res: any): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// POST /api/llm/lesson
router.post("/llm/lesson", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { text, title, gradeLevel, domain, standardCode } = req.body;
  if (!text || !gradeLevel || !domain) {
    return res.status(400).json({ error: "text, gradeLevel, and domain are required" });
  }

  let framingLesson = "";
  let discussionQuestions: string[] = [];
  let writingPrompts: string[] = [];
  let vocabularyList: string[] = [];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert ELA teacher creating culturally-responsive lesson materials for grade ${gradeLevel} students. Domain: ${domain}. ${standardCode ? `Standard: ${standardCode}.` : ""} Return valid JSON only.`,
        },
        {
          role: "user",
          content: `Based on this text, generate: a framing lesson (2-3 sentences to introduce it), 5 discussion questions, 3 writing prompts, and 10 vocabulary words.

TEXT: ${text.slice(0, 2000)}

Return JSON:
{
  "framingLesson": "...",
  "discussionQuestions": ["...", "...", "...", "...", "..."],
  "writingPrompts": ["...", "...", "..."],
  "vocabularyList": ["word1", "word2", ...]
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
    framingLesson = parsed.framingLesson ?? "";
    discussionQuestions = parsed.discussionQuestions ?? [];
    writingPrompts = parsed.writingPrompts ?? [];
    vocabularyList = parsed.vocabularyList ?? [];
  } catch {
    framingLesson = `This ${gradeLevel} ${domain} lesson explores the provided text through critical reading and analytical writing.`;
    discussionQuestions = [
      "What is the main idea of this text?",
      "How does the author support their argument?",
      "What connections can you make between this text and your own life?",
      "What questions does this text raise for you?",
      "How might different readers interpret this text differently?",
    ];
    writingPrompts = [
      "Summarize the main idea of this text in your own words.",
      "Write a response that agrees or disagrees with the author's perspective.",
      "Create a sequel or continuation of this text.",
    ];
    vocabularyList = ["analyze", "synthesize", "evidence", "perspective", "argument", "context", "inference", "theme", "structure", "purpose"];
  }

  const [session] = await db.insert(lessonSessionsTable).values({
    teacherId: req.user!.id,
    title: title ?? "Untitled Lesson",
    gradeLevel,
    domain,
    standardCode: standardCode ?? null,
    sourceText: text,
    framingLesson,
    discussionQuestions,
    writingPrompts,
    vocabularyList,
    status: "completed",
  }).returning();

  return res.status(201).json(session);
});

// GET /api/lessons
router.get("/lessons", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const lessons = await db.select().from(lessonSessionsTable).limit(20);
  return res.json(lessons);
});

// POST /api/llm/question
router.post("/llm/question", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { skillCode, gradeLevel, activityType, interests, culturalContext, homeLanguage, theta } = req.body;
  if (!skillCode || !gradeLevel || !activityType) {
    return res.status(400).json({ error: "skillCode, gradeLevel, and activityType are required" });
  }

  const [skill] = await db.select().from(elaSkillsTable).where(
    (await import("drizzle-orm")).eq(elaSkillsTable.skillCode, skillCode)
  ).limit(1);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert ELA question writer creating ${activityType} activities for grade ${gradeLevel} students. Skill: ${skill?.skillName ?? skillCode}. Interests: ${(interests ?? []).join(", ") || "general"}. Return valid JSON only.`,
        },
        {
          role: "user",
          content: `Generate a single ${activityType} question. JSON:
{
  "id": "q_${Date.now()}",
  "skillCode": "${skillCode}",
  "skillName": "${skill?.skillName ?? skillCode}",
  "domain": "${skill?.domain ?? "ELA"}",
  "questionText": "...",
  "activityType": "${activityType}",
  "options": [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}, {"id": "c", "text": "..."}, {"id": "d", "text": "..."}],
  "correctOptionId": "a",
  "explanation": "...",
  "difficulty": ${theta ?? 0}
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });
    return res.json(JSON.parse(completion.choices[0].message.content ?? "{}"));
  } catch {
    return res.json({
      id: `q_${Date.now()}`,
      skillCode,
      skillName: skill?.skillName ?? skillCode,
      domain: skill?.domain ?? "ELA",
      questionText: `What best demonstrates ${skill?.skillName ?? skillCode}?`,
      activityType,
      options: [
        { id: "a", text: "Correct answer" },
        { id: "b", text: "Distractor B" },
        { id: "c", text: "Distractor C" },
        { id: "d", text: "Distractor D" },
      ],
      correctOptionId: "a",
      explanation: `This tests ${skill?.skillName ?? skillCode}.`,
      difficulty: theta ?? 0,
    });
  }
});

// POST /api/llm/exercise
router.post("/llm/exercise", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { skillCode, gradeLevel, count = 5, interests } = req.body;
  if (!skillCode || !gradeLevel) return res.status(400).json({ error: "skillCode and gradeLevel required" });

  const [skill] = await db.select().from(elaSkillsTable).where(
    (await import("drizzle-orm")).eq(elaSkillsTable.skillCode, skillCode)
  ).limit(1);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert ELA teacher. Create ${count} practice questions for grade ${gradeLevel} on skill: ${skill?.skillName ?? skillCode}. Return a JSON array.`,
        },
        {
          role: "user",
          content: `Generate ${count} multiple-choice questions. Interests: ${(interests ?? []).join(", ") || "general"}. Return JSON array where each item has: id, skillCode, skillName, domain, questionText, passage (optional), activityType, options [{id, text}], correctOptionId, explanation, difficulty (number).`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });
    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
    const questions = Array.isArray(parsed) ? parsed : (parsed.questions ?? parsed.exercises ?? []);
    return res.json(questions);
  } catch {
    const questions = Array.from({ length: count }, (_, i) => ({
      id: `q_${Date.now()}_${i}`,
      skillCode,
      skillName: skill?.skillName ?? skillCode,
      domain: skill?.domain ?? "ELA",
      questionText: `Question ${i + 1} testing ${skill?.skillName ?? skillCode}`,
      activityType: "multiple_choice",
      options: [
        { id: "a", text: "Correct answer" },
        { id: "b", text: "Distractor B" },
        { id: "c", text: "Distractor C" },
        { id: "d", text: "Distractor D" },
      ],
      correctOptionId: "a",
      explanation: `This tests ${skill?.skillName ?? skillCode}.`,
      difficulty: 0,
    }));
    return res.json(questions);
  }
});

// POST /api/tts
router.post("/tts", async (req, res) => {
  const { text, voiceId } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });

  try {
    const { ReplitConnectors } = await import("@replit/connectors-sdk");
    const sdk = new ReplitConnectors();
    const conns = await sdk.listConnections({ connector_names: "elevenlabs" });
    const settings = conns?.[0]?.settings as Record<string, string> | undefined;
    const apiKey = settings?.api_key;
    if (!apiKey) {
      return res.status(503).json({ error: "ElevenLabs not configured" });
    }

    const voice = voiceId ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      return res.status(502).json({ error: "TTS upstream error", details: errText });
    }

    const audioBuffer = await ttsRes.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    return res.send(Buffer.from(audioBuffer));
  } catch (err) {
    req.log.error({ err }, "TTS error");
    return res.status(500).json({ error: "TTS failed", details: String(err) });
  }
});

// GET /api/me — current user profile
router.get("/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.id))
    .limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(user);
});

// PUT /api/me — update display name / role
router.put("/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { displayName, role } = req.body;
  const [updated] = await db
    .update(usersTable)
    .set({ displayName, role, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user!.id))
    .returning();
  return res.json(updated);
});

export default router;
