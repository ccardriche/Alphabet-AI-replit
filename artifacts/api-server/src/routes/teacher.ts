import { Router } from "express";
import { db } from "@workspace/db";
import {
  teacherClassesTable,
  classEnrollmentsTable,
  teacherAlertsTable,
  studentProfilesTable,
  skillMasteryTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /api/teacher/classes
router.get("/teacher/classes", async (req, res) => {
  const demoTeacherId = "00000000-0000-0000-0000-000000000002";
  const classes = await db.select().from(teacherClassesTable).where(eq(teacherClassesTable.teacherId, demoTeacherId)).limit(20);
  return res.json(classes);
});

// POST /api/teacher/classes
router.post("/teacher/classes", async (req, res) => {
  const { className, gradeLevel, schoolName } = req.body;
  if (!className || !gradeLevel) return res.status(400).json({ error: "className and gradeLevel required" });

  const demoTeacherId = "00000000-0000-0000-0000-000000000002";
  const classCode = crypto.randomBytes(3).toString("hex").toUpperCase();

  const [cls] = await db.insert(teacherClassesTable).values({
    teacherId: demoTeacherId,
    className,
    gradeLevel,
    schoolName: schoolName ?? null,
    classCode,
  }).returning();

  return res.status(201).json(cls);
});

// GET /api/teacher/classes/:classId
router.get("/teacher/classes/:classId", async (req, res) => {
  const [cls] = await db.select().from(teacherClassesTable).where(eq(teacherClassesTable.id, req.params.classId)).limit(1);
  if (!cls) return res.status(404).json({ error: "Class not found" });
  return res.json(cls);
});

// GET /api/teacher/classes/:classId/students
router.get("/teacher/classes/:classId/students", async (req, res) => {
  const students = await db.select().from(studentProfilesTable).limit(50);

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
router.get("/teacher/classes/:classId/heatmap", async (req, res) => {
  const domains = ["RL", "RI", "RF", "W", "SL", "L"];
  const students = await db.select().from(studentProfilesTable).limit(50);

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
router.get("/teacher/dashboard", async (req, res) => {
  const students = await db.select().from(studentProfilesTable).limit(200);
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

  const demoTeacherId = "00000000-0000-0000-0000-000000000002";
  const alerts = await db.select().from(teacherAlertsTable).where(
    and(eq(teacherAlertsTable.teacherId, demoTeacherId), eq(teacherAlertsTable.resolved, false))
  ).limit(10);

  const totalMasteries = allMastery.flat();
  const avgClassScore = totalMasteries.length > 0
    ? totalMasteries.reduce((sum, m) => sum + m.smartScore, 0) / totalMasteries.length
    : 0;

  return res.json({
    totalStudents: students.length,
    onTrackCount: onTrack,
    interventionCount: intervention,
    notTestedCount: notTested,
    avgClassScore: Math.round(avgClassScore),
    recentAlerts: alerts,
  });
});

// GET /api/teacher/alerts
router.get("/teacher/alerts", async (req, res) => {
  const demoTeacherId = "00000000-0000-0000-0000-000000000002";
  const alerts = await db.select().from(teacherAlertsTable).where(
    eq(teacherAlertsTable.teacherId, demoTeacherId)
  ).limit(20);
  return res.json(alerts);
});

// GET /api/teacher/analytics/:classId
router.get("/teacher/analytics/:classId", async (req, res) => {
  const students = await db.select().from(studentProfilesTable).limit(50);
  return res.json({
    classId: req.params.classId,
    totalStudents: students.length,
    avgSmartScore: 0,
    growthRate: 0,
  });
});

export default router;
