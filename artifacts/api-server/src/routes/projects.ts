import { Router } from "express";
import { db } from "@workspace/db";
import {
  groupProjectsTable,
  projectGroupsTable,
  projectGroupMembersTable,
  projectSubmissionsTable,
  studentProfilesTable,
} from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireTeacher } from "../middlewares/requireTeacher";
import { z } from "zod";

const router = Router();

function requireStudentAuth(req: any, res: any): boolean {
  if (!req.user?.id) { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

async function getStudentByUserId(userId: string) {
  const [p] = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, userId)).limit(1);
  return p ?? null;
}

async function verifyProjectOwner(projectId: string, teacherId: string) {
  const [p] = await db.select().from(groupProjectsTable)
    .where(and(eq(groupProjectsTable.id, projectId), eq(groupProjectsTable.teacherId, teacherId)))
    .limit(1);
  return p ?? null;
}

async function buildGroupsWithMembers(projectId: string) {
  const groups = await db.select().from(projectGroupsTable)
    .where(eq(projectGroupsTable.projectId, projectId));

  if (groups.length === 0) return [];

  const groupIds = groups.map((g) => g.id);

  const [members, submissions] = await Promise.all([
    db.select().from(projectGroupMembersTable).where(inArray(projectGroupMembersTable.groupId, groupIds)),
    db.select().from(projectSubmissionsTable).where(inArray(projectSubmissionsTable.groupId, groupIds)),
  ]);

  return groups.map((g) => ({
    ...g,
    memberIds: members.filter((m) => m.groupId === g.id).map((m) => m.studentId),
    submission: submissions.find((s) => s.groupId === g.id) ?? null,
  }));
}

// ─── TEACHER ROUTES ────────────────────────────────────────────────────────

// GET /api/projects/teacher
router.get("/projects/teacher", requireTeacher, async (req, res) => {
  const projects = await db.select().from(groupProjectsTable)
    .where(eq(groupProjectsTable.teacherId, req.user!.id))
    .orderBy(groupProjectsTable.createdAt);
  return res.json(projects.reverse());
});

// POST /api/projects
const createProjectSchema = z.object({
  classId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["writing", "reading", "research", "discussion"]).default("writing"),
  prompt: z.string().min(1),
  rubric: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["draft", "active", "closed"]).default("active"),
  gradeLevel: z.string().optional(),
});

router.post("/projects", requireTeacher, async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  const { dueDate, ...rest } = parsed.data;
  const [project] = await db.insert(groupProjectsTable)
    .values({ teacherId: req.user!.id, ...rest, dueDate: dueDate ? new Date(dueDate) : null })
    .returning();
  return res.status(201).json(project);
});

// GET /api/projects/teacher/:projectId
router.get("/projects/teacher/:projectId", requireTeacher, async (req, res) => {
  const projectId = String(req.params.projectId);
  const project = await verifyProjectOwner(projectId, req.user!.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  const groups = await buildGroupsWithMembers(project.id);
  return res.json({ project, groups });
});

// PUT /api/projects/teacher/:projectId
router.put("/projects/teacher/:projectId", requireTeacher, async (req, res) => {
  const projectId = String(req.params.projectId);
  const project = await verifyProjectOwner(projectId, req.user!.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  const { title, description, status, prompt, rubric, dueDate } = req.body as Record<string, string | undefined>;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (prompt !== undefined) updates.prompt = prompt;
  if (rubric !== undefined) updates.rubric = rubric;
  if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
  const [updated] = await db.update(groupProjectsTable)
    .set(updates as any)
    .where(eq(groupProjectsTable.id, project.id))
    .returning();
  return res.json(updated);
});

// POST /api/projects/teacher/:projectId/groups
const createGroupSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  studentIds: z.array(z.string()).min(1),
});

router.post("/projects/teacher/:projectId/groups", requireTeacher, async (req, res) => {
  const projectId = String(req.params.projectId);
  const project = await verifyProjectOwner(projectId, req.user!.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  const parsed = createGroupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });

  const [group] = await db.insert(projectGroupsTable)
    .values({ projectId: project.id, name: parsed.data.name, color: parsed.data.color ?? null })
    .returning();

  await db.insert(projectGroupMembersTable)
    .values(parsed.data.studentIds.map((sid) => ({ groupId: group.id, studentId: sid })))
    .onConflictDoNothing();

  const [submission] = await db.insert(projectSubmissionsTable)
    .values({ projectId: project.id, groupId: group.id, content: "" })
    .returning();

  return res.status(201).json({
    ...group,
    memberIds: parsed.data.studentIds,
    submission: submission ?? null,
  });
});

// PUT /api/projects/teacher/:projectId/groups/:groupId/feedback
router.put("/projects/teacher/:projectId/groups/:groupId/feedback", requireTeacher, async (req, res) => {
  const projectId = String(req.params.projectId);
  const groupId = String(req.params.groupId);
  const project = await verifyProjectOwner(projectId, req.user!.id);
  if (!project) return res.status(404).json({ error: "Not found" });
  const { feedback } = req.body as { feedback: string };
  if (!feedback) return res.status(400).json({ error: "feedback required" });

  const existing = await db.select().from(projectSubmissionsTable)
    .where(and(
      eq(projectSubmissionsTable.projectId, project.id),
      eq(projectSubmissionsTable.groupId, groupId)
    )).limit(1);

  if (existing.length === 0) {
    const [s] = await db.insert(projectSubmissionsTable)
      .values({ projectId: project.id, groupId, content: "", feedback, feedbackAt: new Date() })
      .returning();
    return res.json(s);
  }

  const [s] = await db.update(projectSubmissionsTable)
    .set({ feedback, feedbackAt: new Date() })
    .where(eq(projectSubmissionsTable.id, existing[0].id))
    .returning();
  return res.json(s);
});

// ─── STUDENT ROUTES ─────────────────────────────────────────────────────────

// GET /api/projects/student
router.get("/projects/student", async (req, res) => {
  if (!requireStudentAuth(req, res)) return;
  const student = await getStudentByUserId(req.user!.id);
  if (!student) return res.status(404).json({ error: "No profile" });

  const memberships = await db.select().from(projectGroupMembersTable)
    .where(eq(projectGroupMembersTable.studentId, student.id));
  if (memberships.length === 0) return res.json([]);

  const groupIds = memberships.map((m) => m.groupId);
  const groups = await db.select().from(projectGroupsTable)
    .where(inArray(projectGroupsTable.id, groupIds));
  if (groups.length === 0) return res.json([]);

  const projectIds = [...new Set(groups.map((g) => g.projectId))];
  const [projects, submissions] = await Promise.all([
    db.select().from(groupProjectsTable).where(inArray(groupProjectsTable.id, projectIds)),
    db.select().from(projectSubmissionsTable).where(inArray(projectSubmissionsTable.groupId, groupIds)),
  ]);

  const allMembers = await db.select().from(projectGroupMembersTable)
    .where(inArray(projectGroupMembersTable.groupId, groupIds));

  const result = projects.map((project) => {
    const myGroup = groups.find((g) => g.projectId === project.id)!;
    const submission = submissions.find((s) => s.groupId === myGroup.id) ?? null;
    const memberIds = allMembers.filter((m) => m.groupId === myGroup.id).map((m) => m.studentId);
    return {
      project,
      group: { ...myGroup, memberIds, submission },
      hasFeedback: !!(submission?.feedback),
    };
  });

  return res.json(result.sort((a, b) =>
    new Date(b.project.createdAt).getTime() - new Date(a.project.createdAt).getTime()
  ));
});

// GET /api/projects/student/:projectId
router.get("/projects/student/:projectId", async (req, res) => {
  if (!requireStudentAuth(req, res)) return;
  const projectId = String(req.params.projectId);
  const student = await getStudentByUserId(req.user!.id);
  if (!student) return res.status(404).json({ error: "No profile" });

  const [membership] = await db.select({
    groupId: projectGroupMembersTable.groupId,
  }).from(projectGroupMembersTable)
    .innerJoin(projectGroupsTable, eq(projectGroupMembersTable.groupId, projectGroupsTable.id))
    .where(and(
      eq(projectGroupMembersTable.studentId, student.id),
      eq(projectGroupsTable.projectId, projectId)
    )).limit(1);

  if (!membership) return res.status(404).json({ error: "Not assigned to this project" });

  const [projectRows, groupRows] = await Promise.all([
    db.select().from(groupProjectsTable).where(eq(groupProjectsTable.id, projectId)).limit(1),
    db.select().from(projectGroupsTable).where(eq(projectGroupsTable.id, membership.groupId)).limit(1),
  ]);

  if (!projectRows[0] || !groupRows[0]) return res.status(404).json({ error: "Not found" });

  const [members, submissionRows] = await Promise.all([
    db.select().from(projectGroupMembersTable).where(eq(projectGroupMembersTable.groupId, groupRows[0].id)),
    db.select().from(projectSubmissionsTable).where(eq(projectSubmissionsTable.groupId, groupRows[0].id)).limit(1),
  ]);

  const memberIds = members.map((m) => m.studentId);
  const memberProfiles = memberIds.length > 0
    ? await db.select({ id: studentProfilesTable.id, displayName: studentProfilesTable.displayName })
        .from(studentProfilesTable).where(inArray(studentProfilesTable.id, memberIds))
    : [];

  return res.json({
    project: projectRows[0],
    group: { ...groupRows[0], memberIds, submission: submissionRows[0] ?? null },
    groupMemberNames: memberProfiles.map((p) => p.displayName),
  });
});

// PUT /api/projects/student/:projectId/submission
router.put("/projects/student/:projectId/submission", async (req, res) => {
  if (!requireStudentAuth(req, res)) return;
  const projectId = String(req.params.projectId);
  const student = await getStudentByUserId(req.user!.id);
  if (!student) return res.status(404).json({ error: "No profile" });

  const { content, submitted } = req.body as { content: string; submitted?: boolean };
  if (content === undefined) return res.status(400).json({ error: "content required" });

  const [membership] = await db.select({
    groupId: projectGroupMembersTable.groupId,
  }).from(projectGroupMembersTable)
    .innerJoin(projectGroupsTable, eq(projectGroupMembersTable.groupId, projectGroupsTable.id))
    .where(and(
      eq(projectGroupMembersTable.studentId, student.id),
      eq(projectGroupsTable.projectId, projectId)
    )).limit(1);

  if (!membership) return res.status(403).json({ error: "Not assigned to this project" });

  const existing = await db.select().from(projectSubmissionsTable)
    .where(eq(projectSubmissionsTable.groupId, membership.groupId)).limit(1);

  const submittedAt = submitted ? new Date() : undefined;
  const setFields = {
    content,
    submittedByStudentId: student.id,
    ...(submittedAt ? { submittedAt } : {}),
  };

  if (existing.length === 0) {
    const [s] = await db.insert(projectSubmissionsTable)
      .values({ projectId, groupId: membership.groupId, ...setFields })
      .returning();
    return res.json(s);
  }

  const [s] = await db.update(projectSubmissionsTable)
    .set(setFields)
    .where(eq(projectSubmissionsTable.id, existing[0].id))
    .returning();
  return res.json(s);
});

export default router;
