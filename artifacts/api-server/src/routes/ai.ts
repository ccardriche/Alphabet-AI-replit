import { Router } from "express";
import { db } from "@workspace/db";
import { lessonSessionsTable, elaSkillsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { requireTeacher } from "../middlewares/requireTeacher";
import { getSession, getSessionId, updateSession } from "../lib/auth";
import { generateQuestion, generateExerciseWorksheet } from "../services/questionGenerator";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY ?? "sk-placeholder",
});

// POST /api/llm/lesson
router.post("/llm/lesson", requireTeacher, async (req, res) => {
  const teacherId = req.user!.id;

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
    teacherId,
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
router.get("/lessons", requireTeacher, async (req, res) => {
  const teacherId = req.user!.id;
  const lessons = await db.select().from(lessonSessionsTable)
    .where(eq(lessonSessionsTable.teacherId, teacherId))
    .limit(20);
  return res.json(lessons);
});

// POST /api/llm/question
router.post("/llm/question", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { skillCode, gradeLevel, activityType, interests, culturalContext, theta } = req.body;
  if (!skillCode || !gradeLevel || !activityType) {
    return res.status(400).json({ error: "skillCode, gradeLevel, and activityType are required" });
  }

  const [skill] = await db.select().from(elaSkillsTable).where(eq(elaSkillsTable.skillCode, skillCode)).limit(1);

  const question = await generateQuestion({
    skillCode,
    skillName: skill?.skillName ?? skillCode,
    domain: skill?.domain ?? "ELA",
    gradeLevel,
    difficulty: skill?.difficulty ?? (theta ?? 0),
    interests: interests ?? [],
    culturalContext: culturalContext ?? [],
    activityType,
    mode: "practice",
    studentTheta: theta ?? undefined,
  });

  return res.json(question);
});

// POST /api/llm/exercise — generates a structured worksheet with answer key
router.post("/llm/exercise", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { skillCode, gradeLevel, count = 5, interests, culturalContext } = req.body;
  if (!skillCode || !gradeLevel) return res.status(400).json({ error: "skillCode and gradeLevel required" });

  const [skill] = await db.select().from(elaSkillsTable).where(eq(elaSkillsTable.skillCode, skillCode)).limit(1);

  const worksheet = await generateExerciseWorksheet({
    skillCode,
    skillName: skill?.skillName ?? skillCode,
    domain: skill?.domain ?? "ELA",
    gradeLevel,
    difficulty: skill?.difficulty ?? 0,
    count: Number(count),
    interests: interests ?? [],
    culturalContext: culturalContext ?? [],
  });

  return res.json(worksheet.questions);
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
  return res.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    createdAt: user.createdAt,
  });
});

// PUT /api/me — update role (persists to DB and refreshes session immediately)
router.put("/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { role } = req.body;
  if (!role || (role !== "student" && role !== "teacher")) {
    return res.status(400).json({ error: "role must be 'student' or 'teacher'" });
  }

  const [updated] = await db
    .update(usersTable)
    .set({ role, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user!.id))
    .returning();
  if (!updated) {
    return res.status(404).json({ error: "User not found" });
  }

  const sid = getSessionId(req);
  if (sid) {
    const session = await getSession(sid);
    if (session) {
      await updateSession(sid, {
        ...session,
        user: { ...session.user, role: updated.role },
      });
    }
  }

  return res.json({
    id: updated.id,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    profileImageUrl: updated.profileImageUrl,
    role: updated.role,
    createdAt: updated.createdAt,
  });
});

export default router;
