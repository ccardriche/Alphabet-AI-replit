/**
 * Seed the database with a believable demo dataset so the product looks alive
 * the moment a funder signs in: one demo teacher, two classes, a roster of
 * students, and realistic per-skill mastery / SmartScore / streak / badge data.
 *
 * Idempotent + resettable: every run first deletes any existing demo data
 * (scoped to the demo teacher + demo students), then recreates it fresh.
 *
 *   pnpm --filter @workspace/scripts run seed-demo          # wipe + reseed
 *   pnpm --filter @workspace/scripts run seed-demo -- --clean  # wipe only
 *
 * Env:
 *   DEMO_TEACHER_ID  Attach the demo classes to an existing user id instead of
 *                    the built-in "demo-teacher-001" (e.g. a real funder login).
 */
import { db } from "@workspace/db";
import {
  usersTable,
  studentProfilesTable,
  elaSkillsTable,
  skillMasteryTable,
  masteryLevelHistoryTable,
  practiceSessionsTable,
  placementSessionsTable,
  teacherClassesTable,
  classEnrollmentsTable,
  teacherAlertsTable,
  earnedBadgesTable,
} from "@workspace/db/schema";
import { eq, inArray, like } from "drizzle-orm";

const DEMO_USER_PREFIX = "demo-";
const DEFAULT_TEACHER_ID = "demo-teacher-001";
const TEACHER_ID = process.env.DEMO_TEACHER_ID?.trim() || DEFAULT_TEACHER_ID;
const TEACHER_IS_DEMO = TEACHER_ID.startsWith(DEMO_USER_PREFIX);

const DOMAINS = ["RL", "RI", "RF", "W", "SL", "L"] as const;
type Domain = (typeof DOMAINS)[number];

// ---------------------------------------------------------------------------
// Deterministic RNG so re-runs produce stable, demo-friendly data.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

type Archetype =
  | "advanced"
  | "proficient"
  | "developing"
  | "struggling"
  | "reteach"
  | "inactive"
  | "not_tested";

interface ArchetypeProfile {
  base: number; // center SmartScore
  spread: number; // +/- jitter
  xp: number;
  streak: number;
  sessions: number;
  reteachSkills: number; // # skills flagged needs_reteaching (consecutiveErrors >= 3)
  lastPracticedDays: number; // how long since last practice
  pathway: string;
  gradeGap: number; // diagnosed grade levels below current grade
  identityQuest: boolean;
}

const ARCHETYPES: Record<Exclude<Archetype, "not_tested">, ArchetypeProfile> = {
  advanced:   { base: 89, spread: 8,  xp: 2680, streak: 16, sessions: 22, reteachSkills: 0, lastPracticedDays: 0, pathway: "advanced",   gradeGap: 0, identityQuest: true },
  proficient: { base: 76, spread: 10, xp: 940,  streak: 7,  sessions: 9,  reteachSkills: 0, lastPracticedDays: 1, pathway: "proficient", gradeGap: 0, identityQuest: true },
  developing: { base: 61, spread: 12, xp: 540,  streak: 4,  sessions: 6,  reteachSkills: 0, lastPracticedDays: 1, pathway: "developing", gradeGap: 1, identityQuest: true },
  struggling: { base: 47, spread: 12, xp: 210,  streak: 2,  sessions: 4,  reteachSkills: 2, lastPracticedDays: 2, pathway: "foundation", gradeGap: 2, identityQuest: false },
  reteach:    { base: 66, spread: 10, xp: 460,  streak: 3,  sessions: 5,  reteachSkills: 1, lastPracticedDays: 1, pathway: "developing", gradeGap: 1, identityQuest: true },
  inactive:   { base: 72, spread: 9,  xp: 1120, streak: 0,  sessions: 8,  reteachSkills: 0, lastPracticedDays: 6, pathway: "proficient", gradeGap: 0, identityQuest: true },
};

interface DemoStudent {
  key: string;
  name: string;
  grade: string;
  age: number;
  interests: string[];
  homeLanguage: string;
  archetype: Archetype;
  strongDomain: Domain;
  weakDomain: Domain;
}

interface DemoClass {
  key: string;
  className: string;
  gradeLevel: string;
  classCode: string;
  schoolName: string;
  students: DemoStudent[];
}

const GRADE_ORDER = ["K", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
function gradeBelow(grade: string, by: number): string {
  const idx = GRADE_ORDER.indexOf(grade);
  return GRADE_ORDER[clamp(idx - by, 0, GRADE_ORDER.length - 1)];
}

const CLASSES: DemoClass[] = [
  {
    key: "class-5a",
    className: "Ms. Rivera — 5th Grade ELA",
    gradeLevel: "5th",
    classCode: "DEMO5A",
    schoolName: "Lincoln Community School",
    students: [
      { key: "aaliyah", name: "Aaliyah Johnson",  grade: "5th", age: 10, interests: ["basketball", "music", "graphic novels"], homeLanguage: "English", archetype: "advanced",   strongDomain: "RL", weakDomain: "L"  },
      { key: "diego",   name: "Diego Martinez",    grade: "5th", age: 11, interests: ["soccer", "video games", "space"],        homeLanguage: "Spanish", archetype: "proficient", strongDomain: "RI", weakDomain: "W"  },
      { key: "mei",     name: "Mei Chen",          grade: "5th", age: 10, interests: ["art", "coding", "animals"],              homeLanguage: "Mandarin", archetype: "developing", strongDomain: "RF", weakDomain: "RL" },
      { key: "jamal",   name: "Jamal Washington",  grade: "5th", age: 11, interests: ["football", "comics", "cars"],            homeLanguage: "English", archetype: "reteach",    strongDomain: "SL", weakDomain: "RI" },
      { key: "fatima",  name: "Fatima Al-Sayed",   grade: "5th", age: 10, interests: ["reading", "drawing", "cooking"],         homeLanguage: "Arabic",  archetype: "struggling", strongDomain: "SL", weakDomain: "W"  },
      { key: "tyler",   name: "Tyler Nguyen",      grade: "5th", age: 11, interests: ["skateboarding", "music", "robots"],      homeLanguage: "Vietnamese", archetype: "inactive", strongDomain: "RI", weakDomain: "RF" },
      { key: "sofia",   name: "Sofia Reyes",       grade: "5th", age: 10, interests: ["dance", "animals", "movies"],            homeLanguage: "Spanish", archetype: "not_tested", strongDomain: "RL", weakDomain: "L"  },
    ],
  },
  {
    key: "class-3b",
    className: "Mr. Okafor — 3rd Grade Readers",
    gradeLevel: "3rd",
    classCode: "DEMO3B",
    schoolName: "Lincoln Community School",
    students: [
      { key: "noah",    name: "Noah Williams",     grade: "3rd", age: 8,  interests: ["dinosaurs", "trains", "soccer"],         homeLanguage: "English", archetype: "advanced",   strongDomain: "RF", weakDomain: "W"  },
      { key: "isabella",name: "Isabella Garcia",   grade: "3rd", age: 9,  interests: ["ballet", "horses", "painting"],          homeLanguage: "Spanish", archetype: "proficient", strongDomain: "RL", weakDomain: "L"  },
      { key: "kofi",    name: "Kofi Mensah",       grade: "3rd", age: 8,  interests: ["drums", "lego", "superheroes"],          homeLanguage: "Twi",     archetype: "developing", strongDomain: "RI", weakDomain: "RL" },
      { key: "lily",    name: "Lily Tran",         grade: "3rd", age: 9,  interests: ["gymnastics", "crafts", "cats"],          homeLanguage: "Vietnamese", archetype: "struggling", strongDomain: "SL", weakDomain: "RF" },
      { key: "marcus",  name: "Marcus Brown",      grade: "3rd", age: 8,  interests: ["basketball", "rapping", "sharks"],       homeLanguage: "English", archetype: "reteach",    strongDomain: "RF", weakDomain: "RI" },
      { key: "amara",   name: "Amara Okoye",       grade: "3rd", age: 9,  interests: ["singing", "fashion", "science"],         homeLanguage: "Igbo",    archetype: "not_tested", strongDomain: "RL", weakDomain: "W"  },
    ],
  },
];

const ALL_STUDENTS = CLASSES.flatMap((c) => c.students);

// ---------------------------------------------------------------------------
// Badge definitions (mirrors api-server/src/lib/badges.ts thresholds).
// ---------------------------------------------------------------------------
interface BadgeCtx {
  practiceSessionCount: number;
  totalXp: number;
  currentStreak: number;
  masteredSkillCount: number;
  placementCompleted: boolean;
  identityQuestCompleted: boolean;
}
const BADGE_CHECKS: Array<{ code: string; check: (c: BadgeCtx) => boolean }> = [
  { code: "identity_quest", check: (c) => c.identityQuestCompleted },
  { code: "first_practice", check: (c) => c.practiceSessionCount >= 1 },
  { code: "placement_done", check: (c) => c.placementCompleted },
  { code: "streak_3",       check: (c) => c.currentStreak >= 3 },
  { code: "xp_100",         check: (c) => c.totalXp >= 100 },
  { code: "first_mastery",  check: (c) => c.masteredSkillCount >= 1 },
  { code: "sessions_5",     check: (c) => c.practiceSessionCount >= 5 },
  { code: "streak_7",       check: (c) => c.currentStreak >= 7 },
  { code: "xp_500",         check: (c) => c.totalXp >= 500 },
  { code: "mastery_5",      check: (c) => c.masteredSkillCount >= 5 },
  { code: "sessions_20",    check: (c) => c.practiceSessionCount >= 20 },
  { code: "xp_1000",        check: (c) => c.totalXp >= 1000 },
  { code: "streak_14",      check: (c) => c.currentStreak >= 14 },
  { code: "mastery_10",     check: (c) => c.masteredSkillCount >= 10 },
  { code: "xp_2500",        check: (c) => c.totalXp >= 2500 },
  { code: "mastery_20",     check: (c) => c.masteredSkillCount >= 20 },
];

// ---------------------------------------------------------------------------
// Cleanup: remove any existing demo data so the seed is idempotent.
// ---------------------------------------------------------------------------
async function cleanup() {
  // Demo student profiles are identified by their userId prefix.
  const demoStudents = await db
    .select({ id: studentProfilesTable.id })
    .from(studentProfilesTable)
    .where(like(studentProfilesTable.userId, `${DEMO_USER_PREFIX}%`));
  const studentIds = demoStudents.map((s) => s.id);

  if (studentIds.length > 0) {
    await db.delete(earnedBadgesTable).where(inArray(earnedBadgesTable.studentId, studentIds));
    await db.delete(masteryLevelHistoryTable).where(inArray(masteryLevelHistoryTable.studentId, studentIds));
    await db.delete(skillMasteryTable).where(inArray(skillMasteryTable.studentId, studentIds));
    await db.delete(practiceSessionsTable).where(inArray(practiceSessionsTable.studentId, studentIds));
    await db.delete(placementSessionsTable).where(inArray(placementSessionsTable.studentId, studentIds));
    await db.delete(classEnrollmentsTable).where(inArray(classEnrollmentsTable.studentId, studentIds));
    await db.delete(studentProfilesTable).where(inArray(studentProfilesTable.id, studentIds));
  }

  // Classes + alerts belong to the demo teacher (works for an override id too).
  await db.delete(teacherClassesTable).where(eq(teacherClassesTable.teacherId, TEACHER_ID));
  await db.delete(teacherAlertsTable).where(eq(teacherAlertsTable.teacherId, TEACHER_ID));

  // Demo user rows (teacher + students). Never delete a real override account.
  await db.delete(usersTable).where(like(usersTable.id, `${DEMO_USER_PREFIX}%`));
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function seed() {
  // Demo teacher (skip if attaching to a real, pre-existing account).
  if (TEACHER_IS_DEMO) {
    await db.insert(usersTable).values({
      id: TEACHER_ID,
      email: "demo.teacher@alphabetai.demo",
      firstName: "Jordan",
      lastName: "Rivera",
      displayName: "Ms. Rivera",
      role: "teacher",
    }).onConflictDoNothing();
  }

  // Load the skill catalog grouped by grade -> domain.
  const skills = await db.select().from(elaSkillsTable).where(eq(elaSkillsTable.active, true));
  if (skills.length === 0) {
    throw new Error("No skills found. Run `pnpm --filter @workspace/scripts run seed-skills` first.");
  }
  const skillsByGradeDomain = new Map<string, Map<Domain, typeof skills>>();
  for (const s of skills) {
    if (!skillsByGradeDomain.has(s.gradeLevel)) skillsByGradeDomain.set(s.gradeLevel, new Map());
    const byDomain = skillsByGradeDomain.get(s.gradeLevel)!;
    const dc = s.domainCode as Domain;
    if (!DOMAINS.includes(dc)) continue;
    if (!byDomain.has(dc)) byDomain.set(dc, [] as unknown as typeof skills);
    byDomain.get(dc)!.push(s);
  }

  let studentIdx = 0;
  for (const cls of CLASSES) {
    const [classRow] = await db.insert(teacherClassesTable).values({
      teacherId: TEACHER_ID,
      className: cls.className,
      gradeLevel: cls.gradeLevel,
      classCode: cls.classCode,
      schoolName: cls.schoolName,
      studentCount: cls.students.length,
    }).returning();

    for (const student of cls.students) {
      studentIdx++;
      const rng = mulberry32(0x9e37 + studentIdx * 2654435761);
      const userId = `${DEMO_USER_PREFIX}student-${student.key}`;
      const tested = student.archetype !== "not_tested";
      const arch = tested ? ARCHETYPES[student.archetype as Exclude<Archetype, "not_tested">] : null;
      const diagnosedGradeLevel = tested ? gradeBelow(student.grade, arch!.gradeGap) : null;

      // User row
      const [first, ...rest] = student.name.split(" ");
      await db.insert(usersTable).values({
        id: userId,
        email: `${student.key}@alphabetai.demo`,
        firstName: first,
        lastName: rest.join(" "),
        displayName: student.name,
        role: "student",
      }).onConflictDoNothing();

      // Profile
      const [profile] = await db.insert(studentProfilesTable).values({
        userId,
        displayName: student.name,
        grade: student.grade,
        age: student.age,
        interests: student.interests,
        homeLanguage: student.homeLanguage,
        readingLevel: diagnosedGradeLevel,
        diagnosedGradeLevel,
        placementPathway: tested ? arch!.pathway : null,
        preAssessmentCompleted: tested,
        identityQuestCompleted: tested ? arch!.identityQuest : false,
        totalXp: tested ? arch!.xp : 0,
        currentStreak: tested ? arch!.streak : 0,
      }).returning();

      // Enroll in class
      await db.insert(classEnrollmentsTable).values({
        classId: classRow.id,
        studentId: profile.id,
      });

      if (!tested) continue; // not_tested students have no mastery/sessions/badges

      // --- Skill mastery ---
      const gradeDomains = skillsByGradeDomain.get(student.grade) ?? new Map<Domain, typeof skills>();
      let masteredCount = 0;
      let reteachAssigned = 0;
      const masteryRows: (typeof skillMasteryTable.$inferInsert)[] = [];
      const historyRows: (typeof masteryLevelHistoryTable.$inferInsert)[] = [];

      for (const domain of DOMAINS) {
        const domainSkills = (gradeDomains.get(domain) ?? [])
          .slice()
          .sort((a, b) => a.subSkillOrder - b.subSkillOrder)
          .slice(0, 4);

        // Per-student domain tilt: stronger in strongDomain, weaker in weakDomain.
        const domainOffset =
          domain === student.strongDomain ? 11 :
          domain === student.weakDomain ? -13 : 0;

        for (let i = 0; i < domainSkills.length; i++) {
          const skill = domainSkills[i];
          const jitter = (rng() - 0.5) * 2 * arch!.spread;
          let score = clamp(round(arch!.base + domainOffset + jitter), 8, 99);

          let consecutiveErrors = 0;
          let needsReteaching = false;
          // Concentrate reteach flags in the student's weak domain.
          if (reteachAssigned < arch!.reteachSkills && domain === student.weakDomain) {
            consecutiveErrors = 3 + Math.floor(rng() * 2);
            needsReteaching = true;
            score = clamp(score, 18, 52);
            reteachAssigned++;
          }

          const masteryLevel = score >= 87 ? "mastered" : "practicing";
          if (masteryLevel === "mastered") masteredCount++;
          const theta = clamp((score - 50) / 12.5, -4, 4);
          const practiceCount = 4 + Math.floor(rng() * 12);
          const correctCount = clamp(round(practiceCount * (score / 100)), 0, practiceCount);
          const lastPracticed = hoursAgo(arch!.lastPracticedDays * 24 + Math.floor(rng() * 18));
          const masteredAt = masteryLevel === "mastered" ? daysAgo(2 + Math.floor(rng() * 20)) : null;

          masteryRows.push({
            studentId: profile.id,
            skillCode: skill.skillCode,
            skillName: skill.skillName,
            domain: skill.domainCode, // store the CODE — dashboards compare against "RL" etc.
            masteryLevel,
            masteryPercentage: score,
            smartScore: score,
            theta,
            thetaSe: masteryLevel === "mastered" ? 0.3 : 0.45 + rng() * 0.25,
            practiceCount,
            correctCount,
            consecutiveErrors,
            needsReteaching,
            isUnlocked: true,
            sequenceOrder: skill.subSkillOrder,
            lastPracticed,
            masteredAt,
          });

          historyRows.push({
            studentId: profile.id,
            skillCode: skill.skillCode,
            skillName: skill.skillName,
            domain: skill.domainCode,
            fromLevel: "not_started",
            toLevel: masteryLevel,
            recordedAt: masteredAt ?? lastPracticed,
          });
        }
      }

      if (masteryRows.length > 0) {
        await db.insert(skillMasteryTable).values(masteryRows);
        await db.insert(masteryLevelHistoryTable).values(historyRows);
      }

      // --- Practice sessions ---
      const sessionRows: (typeof practiceSessionsTable.$inferInsert)[] = [];
      const sessionDomains = DOMAINS;
      for (let s = 0; s < arch!.sessions; s++) {
        // Spread sessions across the last ~14 days; active students practiced today.
        const dayOffset = arch!.lastPracticedDays + Math.floor((s / arch!.sessions) * 13);
        const completedAt = hoursAgo(dayOffset * 24 + Math.floor(rng() * 12));
        const totalQuestions = 5 + Math.floor(rng() * 8);
        const accuracy = clamp(arch!.base / 100 + (rng() - 0.5) * 0.2, 0.2, 0.98);
        const correctAnswers = clamp(round(totalQuestions * accuracy), 0, totalQuestions);
        const focusDomain = sessionDomains[Math.floor(rng() * sessionDomains.length)];
        sessionRows.push({
          studentId: profile.id,
          status: "completed",
          activitiesCompleted: totalQuestions,
          totalQuestions,
          correctAnswers,
          xpEarned: 10 + correctAnswers * 5,
          durationMin: round((6 + rng() * 10) * 10) / 10,
          focusDomain,
          completedAt,
          createdAt: completedAt,
        });
      }
      if (sessionRows.length > 0) {
        await db.insert(practiceSessionsTable).values(sessionRows);
      }

      // --- Placement session (one completed) ---
      await db.insert(placementSessionsTable).values({
        studentId: profile.id,
        status: "completed",
        questionCount: 12 + Math.floor(rng() * 8),
        theta: clamp((arch!.base - 50) / 12.5, -4, 4),
        thetaSe: 0.32,
        diagnosedGradeLevel,
        placementPathway: arch!.pathway,
        accuracyPct: round(arch!.base),
        completedAt: daysAgo(14 + Math.floor(rng() * 7)),
        createdAt: daysAgo(14 + Math.floor(rng() * 7)),
      });

      // --- Badges ---
      const ctx: BadgeCtx = {
        practiceSessionCount: arch!.sessions,
        totalXp: arch!.xp,
        currentStreak: arch!.streak,
        masteredSkillCount: masteredCount,
        placementCompleted: true,
        identityQuestCompleted: arch!.identityQuest,
      };
      const badgeRows = BADGE_CHECKS.filter((b) => b.check(ctx)).map((b) => ({
        studentId: profile.id,
        badgeCode: b.code,
        earnedAt: daysAgo(1 + Math.floor(rng() * 12)),
      }));
      if (badgeRows.length > 0) {
        await db.insert(earnedBadgesTable).values(badgeRows).onConflictDoNothing();
      }
    }
  }
}

async function main() {
  const cleanOnly = process.argv.includes("--clean");

  console.log(`Cleaning existing demo data (teacher: ${TEACHER_ID})...`);
  await cleanup();

  if (cleanOnly) {
    console.log("Demo data removed. (--clean)");
    return;
  }

  console.log("Seeding demo teacher, classes, students, mastery, sessions, badges...");
  await seed();

  const classCodes = CLASSES.map((c) => `${c.className} [${c.classCode}]`).join("\n  - ");
  console.log("\nDone. Demo dataset ready.");
  console.log(`Teacher id: ${TEACHER_ID}${TEACHER_IS_DEMO ? " (demo account)" : " (attached to existing account)"}`);
  console.log(`Students:   ${ALL_STUDENTS.length} across ${CLASSES.length} classes`);
  console.log(`Classes:\n  - ${classCodes}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
