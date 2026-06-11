import { Router } from "express";
import { db } from "@workspace/db";
import {
  teacherClassesTable,
  classEnrollmentsTable,
  teacherAlertsTable,
  studentProfilesTable,
  skillMasteryTable,
} from "@workspace/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import crypto from "crypto";
import { requireTeacher } from "../middlewares/requireTeacher";

const router = Router();

async function getTeacherStudentIds(teacherId: string): Promise<string[]> {
  const classes = await db.select({ id: teacherClassesTable.id })
    .from(teacherClassesTable)
    .where(eq(teacherClassesTable.teacherId, teacherId));
  if (classes.length === 0) return [];
  const classIds = classes.map((c) => c.id);
  const enrollments = await db.select({ studentId: classEnrollmentsTable.studentId })
    .from(classEnrollmentsTable)
    .where(inArray(classEnrollmentsTable.classId, classIds));
  return enrollments.map((e) => e.studentId);
}

async function verifyClassOwnership(classId: string, teacherId: string) {
  const [cls] = await db.select().from(teacherClassesTable)
    .where(and(eq(teacherClassesTable.id, classId), eq(teacherClassesTable.teacherId, teacherId)))
    .limit(1);
  return cls ?? null;
}

// GET /api/teacher/classes
router.get("/teacher/classes", requireTeacher, async (req, res) => {
  const teacherId = req.user!.id;
  const classes = await db.select().from(teacherClassesTable).where(eq(teacherClassesTable.teacherId, teacherId)).limit(20);
  return res.json(classes);
});

// POST /api/teacher/classes
router.post("/teacher/classes", requireTeacher, async (req, res) => {
  const teacherId = req.user!.id;
  const { className, gradeLevel, schoolName } = req.body;
  if (!className || !gradeLevel) return res.status(400).json({ error: "className and gradeLevel required" });
  const classCode = crypto.randomBytes(3).toString("hex").toUpperCase();
  const [cls] = await db.insert(teacherClassesTable).values({
    teacherId,
    className,
    gradeLevel,
    schoolName: schoolName ?? null,
    classCode,
  }).returning();
  return res.status(201).json(cls);
});

// GET /api/teacher/classes/:classId
router.get("/teacher/classes/:classId", requireTeacher, async (req, res) => {
  const cls = await verifyClassOwnership(req.params.classId as string, req.user!.id);
  if (!cls) return res.status(404).json({ error: "Class not found" });
  return res.json(cls);
});

// GET /api/teacher/classes/:classId/students
router.get("/teacher/classes/:classId/students", requireTeacher, async (req, res) => {
  const cls = await verifyClassOwnership(req.params.classId as string, req.user!.id);
  if (!cls) return res.status(404).json({ error: "Class not found" });

  const enrollments = await db.select({ studentId: classEnrollmentsTable.studentId })
    .from(classEnrollmentsTable)
    .where(eq(classEnrollmentsTable.classId, cls.id));
  const studentIds = enrollments.map((e) => e.studentId);
  if (studentIds.length === 0) return res.json([]);

  const students = await db.select().from(studentProfilesTable)
    .where(inArray(studentProfilesTable.id, studentIds));

  const result = await Promise.all(students.map(async (s) => {
    const mastery = await db.select().from(skillMasteryTable).where(eq(skillMasteryTable.studentId, s.id)).limit(200);
    const domains = ["RL", "RI", "RF", "W", "SL", "L"];
    const domainScores = domains.map((code) => {
      const dm = mastery.filter((m) => m.domain === code);
      return {
        domainCode: code,
        score: dm.length > 0 ? dm.reduce((sum, m) => sum + m.smartScore, 0) / dm.length : 0,
      };
    });
    const avgSmartScore = mastery.length > 0 ? mastery.reduce((sum, m) => sum + m.smartScore, 0) / mastery.length : 0;
    const status = s.preAssessmentCompleted ? (avgSmartScore >= 70 ? "on_track" : "intervention") : "not_tested";
    const gradeOrder = ["K","1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th"];
    const gradeGap = Math.max(0, gradeOrder.indexOf(s.grade) - gradeOrder.indexOf(s.diagnosedGradeLevel ?? s.grade));
    return {
      studentId: s.id,
      displayName: s.displayName,
      grade: s.grade,
      avgSmartScore: Math.round(avgSmartScore),
      gradeGap,
      status,
      domainScores,
    };
  }));

  return res.json(result);
});

// GET /api/teacher/classes/:classId/heatmap
router.get("/teacher/classes/:classId/heatmap", requireTeacher, async (req, res) => {
  const cls = await verifyClassOwnership(req.params.classId as string, req.user!.id);
  if (!cls) return res.status(404).json({ error: "Class not found" });

  const enrollments = await db.select({ studentId: classEnrollmentsTable.studentId })
    .from(classEnrollmentsTable)
    .where(eq(classEnrollmentsTable.classId, cls.id));
  const studentIds = enrollments.map((e) => e.studentId);
  if (studentIds.length === 0) return res.json({ domains: [], students: [] });

  const students = await db.select().from(studentProfilesTable)
    .where(inArray(studentProfilesTable.id, studentIds));

  const domains = ["RL", "RI", "RF", "W", "SL", "L"];
  const studentData = await Promise.all(students.map(async (s) => {
    const mastery = await db.select().from(skillMasteryTable).where(eq(skillMasteryTable.studentId, s.id)).limit(200);
    const domainScores = domains.map((code) => {
      const dm = mastery.filter((m) => m.domain === code);
      return { domainCode: code, score: dm.length > 0 ? dm.reduce((sum, m) => sum + m.smartScore, 0) / dm.length : 0 };
    });
    return { studentId: s.id, displayName: s.displayName, domainScores };
  }));

  return res.json({ domains, students: studentData });
});

// GET /api/teacher/dashboard
router.get("/teacher/dashboard", requireTeacher, async (req, res) => {
  const teacherId = req.user!.id;

  const studentIds = await getTeacherStudentIds(teacherId);
  const students = studentIds.length > 0
    ? await db.select().from(studentProfilesTable).where(inArray(studentProfilesTable.id, studentIds))
    : [];

  const allMastery = await Promise.all(students.map((s) =>
    db.select().from(skillMasteryTable).where(eq(skillMasteryTable.studentId, s.id)).limit(200)
  ));

  let onTrack = 0, intervention = 0, notTested = 0;
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const mastery = allMastery[i];
    if (!s.preAssessmentCompleted) { notTested++; continue; }
    const avg = mastery.length > 0 ? mastery.reduce((sum, m) => sum + m.smartScore, 0) / mastery.length : 0;
    if (avg >= 70) onTrack++; else intervention++;
  }

  const alerts = await db.select().from(teacherAlertsTable).where(
    and(eq(teacherAlertsTable.teacherId, teacherId), eq(teacherAlertsTable.resolved, false))
  ).limit(10);

  const totalMasteries = allMastery.flat();
  const avgClassScore = totalMasteries.length > 0
    ? totalMasteries.reduce((sum, m) => sum + m.smartScore, 0) / totalMasteries.length
    : 0;

  // Count total needsReteaching=true records across all class students
  const needsReteachingCount = studentIds.length > 0
    ? (await db
        .select({ count: sql<number>`count(*)::int` })
        .from(skillMasteryTable)
        .where(and(
          inArray(skillMasteryTable.studentId, studentIds),
          eq(skillMasteryTable.needsReteaching, true),
        ))
      )[0]?.count ?? 0
    : 0;

  return res.json({
    totalStudents: students.length,
    onTrackCount: onTrack,
    interventionCount: intervention,
    notTestedCount: notTested,
    needsReteachingCount,
    avgClassScore: Math.round(avgClassScore),
    recentAlerts: alerts,
  });
});

// GET /api/teacher/alerts
router.get("/teacher/alerts", requireTeacher, async (req, res) => {
  const teacherId = req.user!.id;
  const alerts = await db.select().from(teacherAlertsTable).where(
    eq(teacherAlertsTable.teacherId, teacherId)
  ).limit(20);
  return res.json(alerts);
});

// GET /api/teacher/analytics/:classId
router.get("/teacher/analytics/:classId", requireTeacher, async (req, res) => {
  const cls = await verifyClassOwnership(req.params.classId as string, req.user!.id);
  if (!cls) return res.status(404).json({ error: "Class not found" });

  const enrollments = await db.select({ studentId: classEnrollmentsTable.studentId })
    .from(classEnrollmentsTable).where(eq(classEnrollmentsTable.classId, cls.id));
  const studentIds = enrollments.map((e) => e.studentId);

  const empty = {
    classId: cls.id, totalStudents: 0, avgScore: 0,
    onTrackPct: 0, interventionPct: 0, notTestedPct: 100,
    domainAverages: [], masteryDistribution: [], skillsNeedingAttention: [], scoreDistribution: [],
  };
  if (studentIds.length === 0) return res.json(empty);

  const students = await db.select().from(studentProfilesTable)
    .where(inArray(studentProfilesTable.id, studentIds));

  const allMastery = await Promise.all(students.map((s) =>
    db.select().from(skillMasteryTable).where(eq(skillMasteryTable.studentId, s.id)).limit(200)
  ));

  const domains = ["RL", "RI", "RF", "W", "SL", "L"];
  let onTrack = 0, intervention = 0, notTested = 0;
  const studentAvgs: number[] = [];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const mastery = allMastery[i];
    if (!s.preAssessmentCompleted) { notTested++; continue; }
    const avg = mastery.length > 0 ? mastery.reduce((sum, m) => sum + m.smartScore, 0) / mastery.length : 0;
    studentAvgs.push(avg);
    if (avg >= 70) onTrack++; else intervention++;
  }

  const total = students.length;
  const avgScore = studentAvgs.length > 0 ? studentAvgs.reduce((s, a) => s + a, 0) / studentAvgs.length : 0;
  const flatMastery = allMastery.flat();

  const domainAverages = domains.map((code) => {
    const dm = flatMastery.filter((m) => m.domain === code);
    return { domainCode: code, score: dm.length > 0 ? Math.round(dm.reduce((s, m) => s + m.smartScore, 0) / dm.length) : 0 };
  });

  const masteryDistribution = [
    { level: "Advanced",   min: 87,  max: 101 },
    { level: "Proficient", min: 70,  max: 87  },
    { level: "Developing", min: 50,  max: 70  },
    { level: "Foundation", min: 0,   max: 50  },
  ].map(({ level, min, max }) => {
    const count = studentAvgs.filter((a) => a >= min && a < max).length;
    return { level, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
  });

  const scoreDistribution = [
    { bucket: "0–40",   min: 0,  max: 40  },
    { bucket: "40–60",  min: 40, max: 60  },
    { bucket: "60–75",  min: 60, max: 75  },
    { bucket: "75–87",  min: 75, max: 87  },
    { bucket: "87–100", min: 87, max: 101 },
  ].map(({ bucket, min, max }) => ({
    bucket,
    count: studentAvgs.filter((a) => a >= min && a < max).length,
  }));

  const skillMap = new Map<string, { scores: number[]; name: string; domain: string }>();
  for (const m of flatMastery) {
    if (!skillMap.has(m.skillCode)) skillMap.set(m.skillCode, { scores: [], name: (m as any).skillName ?? m.skillCode, domain: m.domain ?? "" });
    skillMap.get(m.skillCode)!.scores.push(m.smartScore);
  }
  const skillsNeedingAttention = Array.from(skillMap.entries())
    .map(([skillCode, v]) => ({
      skillCode,
      skillName: v.name,
      domain: v.domain,
      avgScore: Math.round(v.scores.reduce((s, a) => s + a, 0) / v.scores.length),
      studentCount: v.scores.length,
    }))
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 6);

  return res.json({
    classId: cls.id,
    totalStudents: total,
    avgScore: Math.round(avgScore),
    onTrackPct: total > 0 ? Math.round((onTrack / total) * 100) : 0,
    interventionPct: total > 0 ? Math.round((intervention / total) * 100) : 0,
    notTestedPct: total > 0 ? Math.round((notTested / total) * 100) : 0,
    domainAverages,
    masteryDistribution,
    skillsNeedingAttention,
    scoreDistribution,
  });
});

export default router;
