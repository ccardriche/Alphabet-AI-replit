import { Router } from "express";
import { db } from "@workspace/db";
import { lessonSessionsTable, elaSkillsTable } from "@workspace/db/schema";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY ?? "sk-placeholder",
});

// POST /api/llm/lesson
router.post("/llm/lesson", async (req, res) => {
  const { text, title, gradeLevel, domain, standardCode } = req.body;
  if (!text || !gradeLevel || !domain) {
    return res.status(400).json({ error: "text, gradeLevel, and domain are required" });
  }

  const demoTeacherId = "00000000-0000-0000-0000-000000000002";

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
  } catch (err) {
    // Fallback content
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
    teacherId: demoTeacherId,
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
  const demoTeacherId = "00000000-0000-0000-0000-000000000002";
  const lessons = await db.select().from(lessonSessionsTable)
    .limit(20);
  return res.json(lessons);
});

// POST /api/llm/question
router.post("/llm/question", async (req, res) => {
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

  // ElevenLabs TTS via connector proxy
  try {
    const { default: connectors } = await import("@replit/connectors-sdk");
    const voice = voiceId ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel
    const ttsRes = await connectors.proxy("elevenlabs", `/v1/text-to-speech/${voice}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    const audioBuffer = await ttsRes.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    return res.send(Buffer.from(audioBuffer));
  } catch (err) {
    return res.status(500).json({ error: "TTS failed", details: String(err) });
  }
});

// GET /api/me
router.get("/me", async (req, res) => {
  return res.json({
    id: "00000000-0000-0000-0000-000000000001",
    email: "demo@alphabetai.com",
    displayName: "Demo User",
    role: "student",
    createdAt: new Date().toISOString(),
  });
});

// PUT /api/me
router.put("/me", async (req, res) => {
  return res.json({
    id: "00000000-0000-0000-0000-000000000001",
    email: "demo@alphabetai.com",
    displayName: req.body.displayName ?? "Demo User",
    role: req.body.role ?? "student",
    createdAt: new Date().toISOString(),
  });
});

export default router;
