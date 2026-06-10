import { Router } from "express";
import { db } from "@workspace/db";
import { elaSkillsTable, skillMasteryTable } from "@workspace/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";

const router = Router();

// GET /api/skills
router.get("/skills", async (req, res) => {
  const { gradeLevel, domain, search, active } = req.query as Record<string, string>;
  const conditions = [];
  if (gradeLevel) conditions.push(eq(elaSkillsTable.gradeLevel, gradeLevel));
  if (domain) conditions.push(eq(elaSkillsTable.domainCode, domain));
  if (search) conditions.push(ilike(elaSkillsTable.skillName, `%${search}%`));
  if (active !== undefined) conditions.push(eq(elaSkillsTable.active, active !== "false"));

  const rows = conditions.length > 0
    ? await db.select().from(elaSkillsTable).where(and(...conditions)).limit(200)
    : await db.select().from(elaSkillsTable).limit(200);

  return res.json(rows);
});

// GET /api/skills/tree — MUST be before /api/skills/:skillCode
router.get("/skills/tree", async (req, res) => {
  const { gradeLevel } = req.query as Record<string, string>;
  const conditions = [eq(elaSkillsTable.active, true)];
  if (gradeLevel) conditions.push(eq(elaSkillsTable.gradeLevel, gradeLevel));

  const skills = await db.select().from(elaSkillsTable).where(and(...conditions)).limit(500);

  const domains = ["RL", "RI", "RF", "W", "SL", "L"];
  const domainLabels: Record<string, string> = {
    RL: "Literature", RI: "Informational", RF: "Foundations",
    W: "Writing", SL: "Speaking & Listening", L: "Language",
  };

  const tree = {
    gradeLevel: gradeLevel ?? "all",
    domains: domains.map((code) => ({
      domainCode: code,
      domain: domainLabels[code] ?? code,
      skills: skills.filter((s) => s.domainCode === code).sort((a, b) => a.subSkillOrder - b.subSkillOrder),
    })).filter((d) => d.skills.length > 0),
  };

  return res.json(tree);
});

// GET /api/skills/:skillCode — MUST be after /api/skills/tree
router.get("/skills/:skillCode", async (req, res) => {
  const { skillCode } = req.params;
  const [skill] = await db.select().from(elaSkillsTable).where(eq(elaSkillsTable.skillCode, skillCode)).limit(1);
  if (!skill) return res.status(404).json({ error: "Skill not found" });
  return res.json(skill);
});

// GET /api/mastery
router.get("/mastery", async (req, res) => {
  const { studentProfilesTable } = await import("@workspace/db/schema");
  const student = (await db.select().from(studentProfilesTable).limit(1))[0];
  if (!student) return res.json([]);

  const { domain, masteryLevel } = req.query as Record<string, string>;
  const conditions = [eq(skillMasteryTable.studentId, student.id)];
  if (domain) conditions.push(eq(skillMasteryTable.domain, domain));
  if (masteryLevel) conditions.push(eq(skillMasteryTable.masteryLevel, masteryLevel));

  const rows = await db.select().from(skillMasteryTable).where(and(...conditions)).limit(500);
  return res.json(rows);
});

// GET /api/mastery/summary
router.get("/mastery/summary", async (req, res) => {
  const { studentProfilesTable } = await import("@workspace/db/schema");
  const student = (await db.select().from(studentProfilesTable).limit(1))[0];
  if (!student) {
    return res.json({ masteredSkills: 0, totalSkills: 0, overallSmartScore: 0, domains: [] });
  }

  const rows = await db.select().from(skillMasteryTable).where(eq(skillMasteryTable.studentId, student.id)).limit(500);
  const domains = ["RL", "RI", "RF", "W", "SL", "L"];
  const domainLabels: Record<string, string> = {
    RL: "Literature", RI: "Informational", RF: "Foundations",
    W: "Writing", SL: "Speaking & Listening", L: "Language",
  };

  const domainSummaries = domains.map((code) => {
    const dr = rows.filter((r) => r.domain === code);
    return {
      domainCode: code,
      domain: domainLabels[code],
      masteredSkills: dr.filter((r) => r.masteryLevel === "mastered").length,
      totalSkills: dr.length,
      avgSmartScore: dr.length > 0 ? dr.reduce((s, r) => s + r.smartScore, 0) / dr.length : 0,
    };
  });

  const mastered = rows.filter((r) => r.masteryLevel === "mastered").length;
  const avg = rows.length > 0 ? rows.reduce((s, r) => s + r.smartScore, 0) / rows.length : 0;

  return res.json({
    masteredSkills: mastered,
    totalSkills: rows.length,
    overallSmartScore: Math.round(avg),
    domains: domainSummaries,
  });
});

// GET /api/mastery/:skillCode
router.get("/mastery/:skillCode", async (req, res) => {
  const { studentProfilesTable } = await import("@workspace/db/schema");
  const student = (await db.select().from(studentProfilesTable).limit(1))[0];
  if (!student) return res.status(404).json({ error: "No student" });

  const [mastery] = await db
    .select()
    .from(skillMasteryTable)
    .where(and(eq(skillMasteryTable.studentId, student.id), eq(skillMasteryTable.skillCode, req.params.skillCode)))
    .limit(1);

  if (!mastery) return res.status(404).json({ error: "Mastery record not found" });
  return res.json(mastery);
});

// POST /api/mastery/:skillCode/record
router.post("/mastery/:skillCode/record", async (req, res) => {
  const { studentProfilesTable } = await import("@workspace/db/schema");
  const student = (await db.select().from(studentProfilesTable).limit(1))[0];
  if (!student) return res.status(404).json({ error: "No student" });

  const { correct, questionDifficulty = 0 } = req.body as { correct: boolean; questionDifficulty?: number };
  const skillCode = req.params.skillCode;

  const [existing] = await db
    .select()
    .from(skillMasteryTable)
    .where(and(eq(skillMasteryTable.studentId, student.id), eq(skillMasteryTable.skillCode, skillCode)))
    .limit(1);

  const skillRow = (await db.select().from(elaSkillsTable).where(eq(elaSkillsTable.skillCode, skillCode)).limit(1))[0];

  if (existing) {
    const newPracticeCount = existing.practiceCount + 1;
    const newCorrectCount = existing.correctCount + (correct ? 1 : 0);
    const newSmartScore = Math.min(100, Math.max(0, (newCorrectCount / newPracticeCount) * 100));
    const newMasteryPct = newSmartScore;
    const masteryLevel =
      newSmartScore >= 90 ? "mastered"
      : newSmartScore >= 75 ? "approaching"
      : newSmartScore >= 50 ? "practicing"
      : newSmartScore > 0 ? "introduced"
      : "not_started";

    const [updated] = await db
      .update(skillMasteryTable)
      .set({
        practiceCount: newPracticeCount,
        correctCount: newCorrectCount,
        smartScore: newSmartScore,
        masteryPercentage: newMasteryPct,
        masteryLevel,
        lastPracticed: new Date(),
        needsReteaching: !correct && existing.consecutiveErrors >= 2,
        consecutiveErrors: correct ? 0 : (existing.consecutiveErrors + 1),
      })
      .where(eq(skillMasteryTable.id, existing.id))
      .returning();
    return res.json(updated);
  } else {
    const [created] = await db.insert(skillMasteryTable).values({
      studentId: student.id,
      skillCode,
      skillName: skillRow?.skillName ?? skillCode,
      domain: skillRow?.domainCode ?? "RL",
      masteryLevel: correct ? "introduced" : "not_started",
      masteryPercentage: correct ? 25 : 0,
      smartScore: correct ? 25 : 0,
      practiceCount: 1,
      correctCount: correct ? 1 : 0,
    }).returning();
    return res.status(201).json(created);
  }
});

export default router;
