import { z } from "zod/v4";
import OpenAI from "openai";
import { db } from "@workspace/db";
import { questionCacheTable } from "@workspace/db/schema";
import { and, eq, gt, sql } from "drizzle-orm";
import fallbackQuestionsData from "../data/fallback-questions.json" with { type: "json" };

const openai = new OpenAI({
  baseURL:
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ??
    process.env.OPENAI_API_BASE_URL ??
    "https://api.openai.com/v1",
  apiKey:
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??
    process.env.OPENAI_API_KEY ??
    "sk-placeholder",
});

export const AdaptiveQuestionSchema = z.object({
  id: z.string(),
  skillCode: z.string(),
  skillName: z.string(),
  domain: z.string(),
  questionText: z.string(),
  passage: z.string().nullish(),
  activityType: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })).min(2),
  correctOptionId: z.string(),
  explanation: z.string(),
  difficulty: z.number(),
});

export type AdaptiveQuestion = z.infer<typeof AdaptiveQuestionSchema>;

export type PlacementItemType = "comprehension" | "vocabulary" | "fill_blank";

export interface GenerateParams {
  skillCode: string;
  skillName: string;
  domain: string;
  gradeLevel: string;
  difficulty: number;
  interests: string[];
  culturalContext: string[];
  activityType: string;
  mode: "placement" | "practice";
  studentTheta?: number;
  placementItemType?: PlacementItemType;
}

export interface WorksheetQuestion extends AdaptiveQuestion {
  questionNumber: number;
}

export interface ExerciseWorksheet {
  skillCode: string;
  skillName: string;
  gradeLevel: string;
  questions: WorksheetQuestion[];
  answerKey: Array<{ questionNumber: number; correctOptionId: string; explanation: string }>;
}

export function thetaBand(theta: number): string {
  if (theta < -1.5) return "foundation";
  if (theta < 0) return "developing";
  if (theta < 1.5) return "proficient";
  return "advanced";
}

function culturalContextHash(ctx: string[]): string {
  return [...ctx].sort().join(",");
}

function effectiveThetaBand(params: GenerateParams): string {
  const value =
    params.mode === "placement" && params.studentTheta !== undefined
      ? params.studentTheta
      : params.difficulty;
  return thetaBand(value);
}

function cacheKey(params: GenerateParams) {
  const band = effectiveThetaBand(params);
  const ctxHash = culturalContextHash(params.culturalContext);
  return {
    skillCode: params.skillCode,
    thetaBand: band,
    culturalContextHash: ctxHash,
    activityType:
      params.mode === "placement"
        ? `placement_${params.placementItemType ?? "comprehension"}`
        : params.activityType,
  };
}

const CACHE_TTL_DAYS = 30;

async function getCached(params: GenerateParams): Promise<AdaptiveQuestion | null> {
  const { skillCode, thetaBand: band, culturalContextHash: ctxHash, activityType } = cacheKey(params);
  const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(questionCacheTable)
    .where(
      and(
        eq(questionCacheTable.skillCode, skillCode),
        eq(questionCacheTable.thetaBand, band),
        eq(questionCacheTable.culturalContextHash, ctxHash),
        eq(questionCacheTable.activityType, activityType),
        gt(questionCacheTable.createdAt, cutoff),
      ),
    )
    .limit(5);

  if (rows.length === 0) return null;

  const row = rows[Math.floor(Math.random() * rows.length)];
  const parsed = AdaptiveQuestionSchema.safeParse(row.payload);
  return parsed.success ? parsed.data : null;
}

async function setCached(params: GenerateParams, question: AdaptiveQuestion): Promise<void> {
  if (!question.explanation || question.explanation.trim() === "") {
    return;
  }
  const { skillCode, thetaBand: band, culturalContextHash: ctxHash, activityType } = cacheKey(params);
  try {
    await db.insert(questionCacheTable).values({
      skillCode,
      thetaBand: band,
      culturalContextHash: ctxHash,
      activityType,
      payload: question as any,
    });
  } catch {
  }
}

export async function purgeStaleQuestionCache(): Promise<void> {
  try {
    await db
      .delete(questionCacheTable)
      .where(
        sql`(${questionCacheTable.payload}->>'explanation') IS NULL OR trim(${questionCacheTable.payload}->>'explanation') = ''`,
      );
  } catch {
  }
}

function loadFallbackPool(): Record<string, AdaptiveQuestion[]> {
  return fallbackQuestionsData as unknown as Record<string, AdaptiveQuestion[]>;
}

let _fallbackPool: Record<string, AdaptiveQuestion[]> | null = null;

function getFallbackPool(): Record<string, AdaptiveQuestion[]> {
  if (!_fallbackPool) {
    _fallbackPool = loadFallbackPool();
  }
  return _fallbackPool;
}

function deterministicIndex(pool: AdaptiveQuestion[], seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash * 33) ^ seed.charCodeAt(i)) >>> 0;
  }
  return hash % pool.length;
}

export function getFallbackQuestion(params: GenerateParams, seed?: string): AdaptiveQuestion {
  const pool = getFallbackPool();
  const domainCode = params.skillCode.split(".")[0] ?? "RL";

  const effectiveValue =
    params.mode === "placement" && params.studentTheta !== undefined
      ? params.studentTheta
      : params.difficulty;
  const band = thetaBand(effectiveValue);

  const bandMap: Record<string, [number, number]> = {
    foundation: [-4, -1.5],
    developing: [-1.5, 0],
    proficient: [0, 1.5],
    advanced: [1.5, 4],
  };
  const [lo, hi] = bandMap[band] ?? [-4, 4];

  const domainQuestions = pool[domainCode] ?? Object.values(pool).flat();
  let candidates = domainQuestions.filter((q) => q.difficulty >= lo && q.difficulty < hi);

  if (params.mode === "placement") {
    // Placement questions MUST have a 50+ word passage
    const withPassage = candidates.filter(
      (q) => q.passage && q.passage.trim().split(/\s+/).length >= 50,
    );
    if (withPassage.length > 0) {
      candidates = withPassage;
    } else {
      // Fall back to RL/RI pools which always have passages
      const passagePool = [
        ...(pool["RL"] ?? []),
        ...(pool["RI"] ?? []),
      ].filter((q) => q.passage && q.passage.trim().split(/\s+/).length >= 50);
      const bandPassage = passagePool.filter((q) => q.difficulty >= lo && q.difficulty < hi);
      candidates = bandPassage.length > 0 ? bandPassage : passagePool;
    }
  }

  if (candidates.length === 0) candidates = domainQuestions;

  const seedKey = seed ?? `${params.skillCode}|${band}|${params.activityType}`;
  const idx = deterministicIndex(candidates, seedKey);
  return {
    ...candidates[idx],
    id: `fb_${Date.now()}_${band.slice(0, 3)}`,
  };
}

export function makeMockQuestion(params: GenerateParams): AdaptiveQuestion {
  return {
    id: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    skillCode: params.skillCode,
    skillName: params.skillName,
    domain: params.domain,
    questionText: `Read the passage. Which answer best demonstrates understanding of ${params.skillName}?`,
    passage:
      `This passage is about ${params.skillName.toLowerCase()} in ${params.domain.toLowerCase()}. ` +
      `Students who understand this skill can identify key ideas and explain how they connect to the text. ` +
      `Strong readers look for evidence in the text to support their answers.`,
    activityType: params.activityType,
    options: [
      { id: "a", text: "Identify the key idea and support it with two specific details from the text." },
      { id: "b", text: "Retell only the first sentence without connecting it to the rest of the text." },
      { id: "c", text: "Copy words from the text without explaining what they mean." },
      { id: "d", text: "Share a personal opinion that is not supported by the text." },
    ],
    correctOptionId: "a",
    explanation: `Demonstrating ${params.skillName} requires identifying key ideas and supporting them with text evidence — option A is the only one that does both.`,
    difficulty: params.difficulty,
  };
}

function placementPassageWordRange(band: string): string {
  return band === "foundation" ? "50–70" : band === "developing" ? "70–100" : band === "proficient" ? "90–120" : "110–150";
}

function buildPlacementPrompt(params: GenerateParams): { system: string; user: string } {
  const { skillCode, skillName, domain, gradeLevel, difficulty, interests, culturalContext, studentTheta } = params;
  const effectiveTheta = studentTheta ?? difficulty;
  const band = thetaBand(effectiveTheta);
  const itemType: PlacementItemType = params.placementItemType ?? "comprehension";

  const difficultyGuidance: Record<string, string> = {
    foundation:
      "Use simple, short sentences (6–10 words each). Everyday vocabulary only. The passage MUST be 50–70 words with a single clear idea.",
    developing:
      "Use moderately complex sentences. Include some academic vocabulary with context clues. The passage MUST be 70–100 words with one embedded inference opportunity.",
    proficient:
      "Use varied sentence structures including compound and complex sentences. Include domain-specific vocabulary. The passage MUST be 90–120 words with at least one inference or analysis opportunity.",
    advanced:
      "Use sophisticated syntax including subordinate clauses and varied rhetorical structures. Include nuanced vocabulary and figurative language. The passage MUST be 110–150 words requiring inference and critical analysis.",
  };

  const interestHint = interests.length
    ? `Make the passage topic relevant to these student interests: ${interests.join(", ")}.`
    : "Choose an engaging topic relevant to the grade level.";
  const culturalHint = culturalContext.length
    ? `Reflect these cultural contexts authentically in the passage content: ${culturalContext.join(", ")}.`
    : "Use culturally inclusive, diverse representations.";

  const wordRange = placementPassageWordRange(band);

  const itemGuidance: Record<PlacementItemType, { activityType: string; task: string; requirements: string }> = {
    comprehension: {
      activityType: "multiple_choice",
      task: "Generate a single passage-based reading-comprehension question. The question should require the student to identify the main idea, make an inference, or analyze a key detail from the passage.",
      requirements: `- "passage" field MUST be present and contain ${wordRange} words\n- The question must depend on the passage (a student who did not read it should not be able to answer)`,
    },
    vocabulary: {
      activityType: "vocabulary",
      task: "Generate a vocabulary-in-context question. Embed one grade-appropriate target word inside the passage, then ask what that word means AS USED in the passage. Surround the word with context clues. Wrap the target word in **double asterisks** the first time it appears in the passage.",
      requirements: `- "passage" field MUST be present and contain ${wordRange} words and include the target word in context\n- "questionText" must quote the target word, e.g. What does the word "____" most likely mean as used in the passage?\n- Distractors should include a plausible-but-wrong common meaning of the word`,
    },
    fill_blank: {
      activityType: "fill_blank",
      task: "Generate a fill-in-the-blank question. Provide a short passage for context, then a single sentence (placed in questionText) with exactly one missing word shown as ___. The 4 options are candidate words that could fill the blank.",
      requirements: `- "passage" field MUST be present and contain ${wordRange} words of supporting context\n- "questionText" MUST contain exactly one blank shown as ___\n- Only one option correctly completes the sentence given grammar and meaning`,
    },
  };

  const guide = itemGuidance[itemType];

  return {
    system: `You are an expert ELA assessment writer creating passage-based placement questions. Student grade: ${gradeLevel}. Skill: "${skillName}" (${domain}, code: ${skillCode}). Student theta: ${effectiveTheta.toFixed(2)} (difficulty band: ${band}). ${difficultyGuidance[band] ?? ""} ${interestHint} ${culturalHint} Every placement question MUST include a reading passage. Return only valid JSON.`,
    user: `${guide.task}

REQUIRED:
${guide.requirements}
- All 4 options must be plausible and specific — never use placeholder text like "Option A" or "Distractor"
- The correct answer must NOT always be "a" — vary the position
- The explanation must address why the correct option is right AND why each wrong option is incorrect

Return exactly this JSON shape (no extra keys):
{
  "id": "q_${Date.now()}",
  "skillCode": "${skillCode}",
  "skillName": "${skillName}",
  "domain": "${domain}",
  "passage": "...",
  "questionText": "...",
  "activityType": "${guide.activityType}",
  "options": [
    {"id": "a", "text": "..."},
    {"id": "b", "text": "..."},
    {"id": "c", "text": "..."},
    {"id": "d", "text": "..."}
  ],
  "correctOptionId": "...",
  "explanation": "...",
  "difficulty": ${difficulty}
}`,
  };
}

function buildPracticePrompt(params: GenerateParams): { system: string; user: string } {
  const { skillCode, skillName, domain, gradeLevel, difficulty, interests, culturalContext, activityType } = params;
  const band = thetaBand(difficulty);

  const interestHint = interests.length ? `Student interests: ${interests.join(", ")}.` : "";
  const culturalHint = culturalContext.length ? `Cultural context: ${culturalContext.join(", ")}.` : "";

  const activityInstructions: Record<string, string> = {
    multiple_choice: `Create a multiple-choice question with a short passage (30–80 words) and 4 plausible options. Include a clear explanation.`,
    fill_blank: `Create a fill-in-the-blank question. Provide a sentence with one key term missing (shown as ___). Give 4 options as possible answers. The passage field should contain a short context paragraph (30–60 words) to help the student reason through the blank.`,
    short_answer: `Create a sentence-frame completion question: provide a partial sentence the student must complete. The "options" should be 4 possible completions of varying quality. The passage should give relevant context (30–60 words).`,
    say_it: `Create a multiple-choice comprehension question with a short passage (30–60 words). Keep vocabulary appropriate for oral response.`,
    see_tap: `Create a multiple-choice question where the student identifies the correct answer from options. Use a short passage (20–50 words) with a concrete detail to identify.`,
    listen_repeat: `Create a multiple-choice question based on a short passage (20–40 words). Frame the question so it can be read aloud.`,
    read_it: `Create a multiple-choice reading comprehension question with a passage (40–80 words). Focus on literal comprehension with one inference stretch.`,
    write_it: `Create a sentence-completion question with a clear sentence frame. Options should be completions varying in quality and correctness.`,
  };

  const instruction = activityInstructions[activityType] ?? activityInstructions.multiple_choice;

  return {
    system: `You are an expert ELA teacher creating adaptive practice activities. Student grade: ${gradeLevel}. Skill: "${skillName}" (${domain}). Difficulty band: ${band} (IRT b: ${difficulty.toFixed(2)}). Activity type: ${activityType}. ${interestHint} ${culturalHint} Return only valid JSON.`,
    user: `${instruction}

All 4 options must be meaningful and plausible — no placeholder text. Vary the correct answer position.

Return exactly this JSON shape:
{
  "id": "q_${Date.now()}",
  "skillCode": "${skillCode}",
  "skillName": "${skillName}",
  "domain": "${domain}",
  "passage": "...",
  "questionText": "...",
  "activityType": "${activityType}",
  "options": [
    {"id": "a", "text": "..."},
    {"id": "b", "text": "..."},
    {"id": "c", "text": "..."},
    {"id": "d", "text": "..."}
  ],
  "correctOptionId": "...",
  "explanation": "...",
  "difficulty": ${difficulty}
}`,
  };
}

export async function generateQuestion(params: GenerateParams): Promise<AdaptiveQuestion> {
  const cached = await getCached(params);
  if (cached) return cached;

  const { system, user } =
    params.mode === "placement"
      ? buildPlacementPrompt(params)
      : buildPracticePrompt(params);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.8,
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const parsed = AdaptiveQuestionSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      return getFallbackQuestion(params);
    }

    if (params.mode === "placement") {
      const wordCount = parsed.data.passage?.trim().split(/\s+/).length ?? 0;
      if (wordCount < 50) {
        return getFallbackQuestion(params);
      }
    }

    await setCached(params, parsed.data);
    return parsed.data;
  } catch {
    return getFallbackQuestion(params);
  }
}

export async function generateExerciseWorksheet(params: {
  skillCode: string;
  skillName: string;
  domain: string;
  gradeLevel: string;
  difficulty: number;
  count: number;
  interests: string[];
  culturalContext: string[];
}): Promise<ExerciseWorksheet> {
  const { skillCode, skillName, domain, gradeLevel, difficulty, count, interests, culturalContext } = params;
  const safeCount = Math.min(10, Math.max(5, count));
  const band = thetaBand(difficulty);
  const interestHint = interests.length ? `Student interests: ${interests.join(", ")}.` : "";
  const culturalHint = culturalContext.length ? `Cultural context: ${culturalContext.join(", ")}.` : "";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert ELA teacher creating a ${safeCount}-question practice worksheet for ${gradeLevel} students. Skill: "${skillName}" (${domain}, code: ${skillCode}). Difficulty band: ${band}. ${interestHint} ${culturalHint} Vary question types across multiple_choice, fill_blank, and short_answer. Each question must have a unique passage or context. Return only valid JSON.`,
        },
        {
          role: "user",
          content: `Generate ${safeCount} practice questions for a worksheet with answer key.

Requirements:
- Each question targets "${skillName}" from a different angle
- Include at least one passage-based question (60–100 words)
- Correct option must vary position (not always "a")
- Explanations must be detailed enough for a student to learn from
- No placeholder text in options — all options must be meaningful

Return exactly this JSON shape:
{
  "questions": [
    {
      "id": "q1",
      "skillCode": "${skillCode}",
      "skillName": "${skillName}",
      "domain": "${domain}",
      "passage": "...",
      "questionText": "...",
      "activityType": "multiple_choice",
      "options": [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}, {"id": "c", "text": "..."}, {"id": "d", "text": "..."}],
      "correctOptionId": "...",
      "explanation": "...",
      "difficulty": ${difficulty}
    }
  ]
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000,
      temperature: 0.7,
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(raw);
    const rawQuestions: unknown[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.questions)
        ? parsed.questions
        : parsed.exercises ?? [];

    const validated: AdaptiveQuestion[] = rawQuestions
      .map((q) => AdaptiveQuestionSchema.safeParse(q))
      .filter((r): r is { success: true; data: AdaptiveQuestion } => r.success)
      .map((r) => r.data);

    if (validated.length < 3) {
      return buildFallbackWorksheet(params, safeCount);
    }

    return {
      skillCode,
      skillName,
      gradeLevel,
      questions: validated.map((q, i) => ({ ...q, questionNumber: i + 1 })),
      answerKey: validated.map((q, i) => ({
        questionNumber: i + 1,
        correctOptionId: q.correctOptionId,
        explanation: q.explanation,
      })),
    };
  } catch {
    return buildFallbackWorksheet(params, safeCount);
  }
}

function buildFallbackWorksheet(
  params: {
    skillCode: string;
    skillName: string;
    domain: string;
    gradeLevel: string;
    difficulty: number;
    interests: string[];
    culturalContext: string[];
  },
  count: number,
): ExerciseWorksheet {
  const pool = getFallbackPool();
  const domainCode = params.skillCode.split(".")[0] ?? "RL";
  const domainPool = pool[domainCode] ?? Object.values(pool).flat();
  const questions: WorksheetQuestion[] = [];

  for (let i = 0; i < count; i++) {
    const q = domainPool[i % domainPool.length];
    questions.push({ ...q, id: `fb_ws_${Date.now()}_${i}`, questionNumber: i + 1 });
  }

  return {
    skillCode: params.skillCode,
    skillName: params.skillName,
    gradeLevel: params.gradeLevel,
    questions,
    answerKey: questions.map((q) => ({
      questionNumber: q.questionNumber,
      correctOptionId: q.correctOptionId,
      explanation: q.explanation,
    })),
  };
}
