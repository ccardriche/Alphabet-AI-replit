import { Router } from "express";
import { db } from "@workspace/db";
import {
  teacherClassesTable,
  classEnrollmentsTable,
  teacherAlertsTable,
  studentProfilesTable,
  skillMasteryTable,
  practiceSessionsTable,
} from "@workspace/db/schema";
import { eq, and, inArray, sql, gte, or, lt, isNotNull, desc } from "drizzle-orm";
import crypto from "crypto";
import { clerkClient } from "@clerk/express";
import { requireTeacher } from "../middlewares/requireTeacher";

const router = Router();

// Reset a student's password (email-free accounts have no self-service recovery).
router.post("/teacher/students/:studentId/reset-password", requireTeacher, async (req, res) => {
  const { studentId } = req.params;
  const newPassword = String((req.body ?? {}).newPassword ?? "");
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }
  const [student] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.id, studentId as string))
    .limit(1);
  if (!student) return res.status(404).json({ error: "Student not found." });
  try {
    await clerkClient.users.updateUser(student.userId, { password: newPassword });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(400).json({ error: err?.errors?.[0]?.message || "Could not reset password." });
  }
});

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

// POST /api/teacher/classes/join  (student joins a class by code)
router.post("/teacher/classes/join", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { classCode } = req.body;
  if (!classCode) return res.status(400).json({ error: "classCode is required" });

  const [cls] = await db.select().from(teacherClassesTable)
    .where(eq(teacherClassesTable.classCode, (classCode as string).toUpperCase().trim()))
    .limit(1);
  if (!cls) return res.status(404).json({ error: "Class not found. Check the join code and try again." });

  // Look up student profile for this user
  const [student] = await db.select().from(studentProfilesTable)
    .where(eq(studentProfilesTable.userId, req.user!.id))
    .limit(1);
  if (!student) return res.status(404).json({ error: "Student profile not found. Complete onboarding first." });

  // Check if already enrolled
  const [existing] = await db.select().from(classEnrollmentsTable)
    .where(and(eq(classEnrollmentsTable.classId, cls.id), eq(classEnrollmentsTable.studentId, student.id)))
    .limit(1);
  if (existing) return res.json(cls); // idempotent

  await db.insert(classEnrollmentsTable).values({ classId: cls.id, studentId: student.id });

  // Increment studentCount
  await db.update(teacherClassesTable)
    .set({ studentCount: sql`${teacherClassesTable.studentCount} + 1` })
    .where(eq(teacherClassesTable.id, cls.id));

  return res.json(cls);
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
    const hasNeedsReteaching = mastery.some((m) => m.needsReteaching);
    // Spec: On Track = avg >= 70 AND no needsReteaching; Intervention = needsReteaching > 0 OR avg < 70
    const status = !s.preAssessmentCompleted
      ? "not_tested"
      : (hasNeedsReteaching || avgSmartScore < 70 ? "intervention" : "on_track");
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
      lastActive: null,
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
  if (studentIds.length === 0) return res.json({ classId: cls.id, domains: [], students: [] });

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

  return res.json({ classId: cls.id, domains, students: studentData });
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

  const totalMasteries = allMastery.flat();
  const avgClassScore = totalMasteries.length > 0
    ? totalMasteries.reduce((sum, m) => sum + m.smartScore, 0) / totalMasteries.length
    : 0;

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

  // Compute live alerts for dashboard preview
  const recentAlerts = await computeLiveAlerts(teacherId, studentIds, students, 5);

  return res.json({
    totalStudents: students.length,
    onTrackCount: onTrack,
    interventionCount: intervention,
    notTestedCount: notTested,
    needsReteachingCount,
    avgClassScore: Math.round(avgClassScore),
    recentAlerts,
  });
});

// Helper: compute live alerts from skill_mastery
async function computeLiveAlerts(
  teacherId: string,
  studentIds: string[],
  students: { id: string; displayName: string }[],
  limit = 20,
) {
  if (studentIds.length === 0) return [];

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  // Students with 3+ consecutive errors on any skill
  const consecutiveErrorRows = await db
    .select({ studentId: skillMasteryTable.studentId })
    .from(skillMasteryTable)
    .where(and(
      inArray(skillMasteryTable.studentId, studentIds),
      gte(skillMasteryTable.consecutiveErrors, 3),
    ));

  // Students whose MOST RECENT practice (max across all skills) is older than 3 days
  // Group by studentId and compare max(lastPracticed) — avoids false positives from stale skills
  const inactiveRows = await db
    .select({
      studentId: skillMasteryTable.studentId,
      maxLastPracticed: sql<Date | null>`max(${skillMasteryTable.lastPracticed})`,
    })
    .from(skillMasteryTable)
    .where(inArray(skillMasteryTable.studentId, studentIds))
    .groupBy(skillMasteryTable.studentId)
    .having(sql`max(${skillMasteryTable.lastPracticed}) < ${threeDaysAgo} OR max(${skillMasteryTable.lastPracticed}) IS NULL`);

  // Students with zero mastery rows (enrolled but have never practiced any skill)
  const masteryStudentIds = new Set(inactiveRows.map((r) => r.studentId));
  const allMasteryStudentRows = await db
    .select({ studentId: skillMasteryTable.studentId })
    .from(skillMasteryTable)
    .where(inArray(skillMasteryTable.studentId, studentIds))
    .groupBy(skillMasteryTable.studentId);
  const studentsWithAnyMastery = new Set(allMasteryStudentRows.map((r) => r.studentId));
  const neverPracticedIds = studentIds.filter((id) => !studentsWithAnyMastery.has(id));

  const studentMap = new Map(students.map((s) => [s.id, s.displayName]));

  const consecutiveStudentIds = [...new Set(consecutiveErrorRows.map((r) => r.studentId))];
  // Combine stale-practice students + never-practiced students
  const inactiveStudentIds = [...new Set([
    ...inactiveRows.map((r) => r.studentId),
    ...neverPracticedIds,
  ])];

  // Load dismissed alert IDs from teacherAlertsTable
  const dismissed = await db.select({ studentId: teacherAlertsTable.studentId, alertType: teacherAlertsTable.alertType })
    .from(teacherAlertsTable)
    .where(and(eq(teacherAlertsTable.teacherId, teacherId), eq(teacherAlertsTable.resolved, true)));
  const dismissedSet = new Set(dismissed.map((d) => `${d.studentId}-${d.alertType}`));

  const alerts: {
    id: string;
    studentId: string;
    studentName: string;
    alertType: string;
    message: string;
    resolved: boolean;
    createdAt: string;
  }[] = [];

  for (const sid of consecutiveStudentIds) {
    const key = `${sid}-needs_reteaching`;
    if (dismissedSet.has(key)) continue;
    const name = studentMap.get(sid) ?? "Unknown Student";
    alerts.push({
      id: `${sid}-consecutive`,
      studentId: sid,
      studentName: name,
      alertType: "needs_reteaching",
      message: `${name} has made 3 or more consecutive errors on a skill and may need reteaching.`,
      resolved: false,
      createdAt: new Date().toISOString(),
    });
  }

  for (const sid of inactiveStudentIds) {
    const key = `${sid}-low_engagement`;
    if (dismissedSet.has(key) || alerts.some((a) => a.studentId === sid && a.alertType === "low_engagement")) continue;
    const name = studentMap.get(sid) ?? "Unknown Student";
    alerts.push({
      id: `${sid}-inactive`,
      studentId: sid,
      studentName: name,
      alertType: "low_engagement",
      message: `${name} hasn't practiced in 3 or more days.`,
      resolved: false,
      createdAt: new Date().toISOString(),
    });
  }

  return alerts.slice(0, limit);
}

// GET /api/teacher/alerts
router.get("/teacher/alerts", requireTeacher, async (req, res) => {
  const teacherId = req.user!.id;
  const studentIds = await getTeacherStudentIds(teacherId);
  const students = studentIds.length > 0
    ? await db.select({ id: studentProfilesTable.id, displayName: studentProfilesTable.displayName })
        .from(studentProfilesTable).where(inArray(studentProfilesTable.id, studentIds))
    : [];

  const alerts = await computeLiveAlerts(teacherId, studentIds, students, 20);
  return res.json(alerts);
});

// POST /api/teacher/alerts/:alertId/resolve
router.post("/teacher/alerts/:alertId/resolve", requireTeacher, async (req, res) => {
  const teacherId = req.user!.id;
  const alertId = req.params.alertId as string;

  // alertId format: "{studentId}-{consecutive|inactive}"
  const parts = alertId.split("-");
  if (parts.length < 2) return res.status(400).json({ error: "Invalid alertId" });

  // Determine alertType from suffix
  const suffix = parts[parts.length - 1];
  const studentId = parts.slice(0, -1).join("-");
  const alertType = suffix === "consecutive" ? "needs_reteaching" : "low_engagement";

  // Upsert a "dismissed" record into teacherAlertsTable
  const existing = await db.select().from(teacherAlertsTable)
    .where(and(
      eq(teacherAlertsTable.teacherId, teacherId),
      eq(teacherAlertsTable.studentId, studentId as any),
      eq(teacherAlertsTable.alertType, alertType),
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.update(teacherAlertsTable)
      .set({ resolved: true })
      .where(eq(teacherAlertsTable.id, existing[0].id));
  } else {
    await db.insert(teacherAlertsTable).values({
      teacherId,
      studentId: studentId as any,
      studentName: "Unknown",
      alertType,
      message: "Dismissed",
      resolved: true,
    });
  }

  return res.json({ ok: true });
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

// GET /api/teacher/students/:studentId/progress
router.get("/teacher/students/:studentId/progress", requireTeacher, async (req, res) => {
  const teacherId = req.user!.id;
  const studentId = req.params.studentId as string;

  // Verify this student is in at least one of the teacher's classes
  const teacherStudentIds = await getTeacherStudentIds(teacherId);
  if (!teacherStudentIds.includes(studentId)) {
    return res.status(403).json({ error: "Student is not enrolled in any of your classes" });
  }

  // Load student profile
  const [student] = await db.select().from(studentProfilesTable)
    .where(eq(studentProfilesTable.id, studentId))
    .limit(1);
  if (!student) return res.status(404).json({ error: "Student not found" });

  // Load all skill mastery
  const mastery = await db.select().from(skillMasteryTable)
    .where(eq(skillMasteryTable.studentId, studentId))
    .limit(300);

  // Compute domain scores
  const domains = ["RL", "RI", "RF", "W", "SL", "L"];
  const domainScores = domains.map((code) => {
    const dm = mastery.filter((m) => m.domain === code);
    return {
      domainCode: code,
      score: dm.length > 0 ? dm.reduce((sum, m) => sum + m.smartScore, 0) / dm.length : 0,
    };
  });

  const avgSmartScore = mastery.length > 0
    ? mastery.reduce((sum, m) => sum + m.smartScore, 0) / mastery.length
    : 0;
  const hasNeedsReteaching = mastery.some((m) => m.needsReteaching);
  const status = !student.preAssessmentCompleted
    ? "not_tested"
    : (hasNeedsReteaching || avgSmartScore < 70 ? "intervention" : "on_track");

  // Build skill list with approachingMastery flag
  const skills = mastery.map((m) => ({
    skillCode: m.skillCode,
    skillName: m.skillName,
    domain: m.domain ?? "",
    smartScore: m.smartScore,
    masteryLevel: m.masteryLevel,
    practiceCount: m.practiceCount,
    correctCount: m.correctCount,
    consecutiveErrors: m.consecutiveErrors,
    needsReteaching: m.needsReteaching,
    thetaSe: m.thetaSe,
    approachingMastery: m.smartScore >= 65 && m.smartScore < 87,
    lastPracticed: m.lastPracticed?.toISOString() ?? null,
    masteredAt: m.masteredAt?.toISOString() ?? null,
  })).sort((a, b) => (a.domain ?? "").localeCompare(b.domain ?? "") || a.skillCode.localeCompare(b.skillCode));

  // Load recent completed practice sessions (last 10)
  const practiceSessions = await db.select().from(practiceSessionsTable)
    .where(and(
      eq(practiceSessionsTable.studentId, studentId),
      eq(practiceSessionsTable.status, "completed"),
    ))
    .orderBy(desc(practiceSessionsTable.completedAt))
    .limit(10);

  const recentSessions = practiceSessions.map((ps) => ({
    id: ps.id,
    type: "practice" as const,
    focusDomain: ps.focusDomain ?? null,
    focusSkillCode: ps.focusSkillCode ?? null,
    correctAnswers: ps.correctAnswers,
    totalQuestions: ps.totalQuestions,
    xpEarned: ps.xpEarned,
    durationMin: ps.durationMin ?? null,
    completedAt: ps.completedAt!.toISOString(),
  }));

  return res.json({
    studentId: student.id,
    displayName: student.displayName,
    grade: student.grade,
    diagnosedGradeLevel: student.diagnosedGradeLevel ?? null,
    placementPathway: student.placementPathway ?? null,
    totalXp: student.totalXp,
    currentStreak: student.currentStreak,
    avgSmartScore: Math.round(avgSmartScore),
    status,
    domainScores,
    skills,
    recentSessions,
  });
});

export default router;
