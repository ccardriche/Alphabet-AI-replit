// Seed the Georgia K-12 ELA Standards skills map into ela_skills (additive).
// Reads data/ga-k12-ela-skills-map.json. Inserts with ON CONFLICT DO NOTHING
// so it is safe to re-run and never clobbers existing rows.
import pg from "pg";
import { readFileSync } from "node:fs";

const DATA_PATH =
  process.env.GA_SKILLS_JSON ??
  "/Users/chinacardriche/Documents/Claude/deploy-analysis/Alphabet-AI-replit/data/ga-k12-ela-skills-map.json";
const rows = JSON.parse(readFileSync(DATA_PATH, "utf8"));

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

const gradeNum = (g) => (g === "K" ? 0 : Number(g));
// App IRT scale: theta in [-4,4], theta 0 ~= grade 5. Baseline b by grade.
const difficultyForGrade = (g) => {
  const b = (gradeNum(g) - 5) * 0.5;
  return Math.max(-3.5, Math.min(3.5, Math.round(b * 100) / 100));
};

const orderCounters = new Map();

const records = rows.map((r) => {
  const parts = r.code.split(".");
  const strandLetter = parts[1] ?? r.strand[0];
  const substrand = r.substrand ?? parts[2] ?? "";
  const domainCode = `${strandLetter}.${substrand}`;
  const grade = r.primaryGrade ?? r.grades[0];
  const key = `${grade}|${domainCode}`;
  const order = (orderCounters.get(key) ?? 0) + 1;
  orderCounters.set(key, order);
  return {
    skillCode: r.code,
    skillName: r.skillName,
    description: r.desc,
    gradeLevel: grade,
    gradeBand: r.band,
    domainCode,
    domain: r.domain,
    substrand,
    standardLeafCode: r.code,
    difficulty: difficultyForGrade(grade),
    subSkillOrder: order,
  };
});

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const cols = [
  "skill_code", "skill_name", "description", "grade_level", "grade_band",
  "domain_code", "domain", "substrand", "standard_leaf_code",
  "difficulty", "sub_skill_order", "active",
];

let inserted = 0;
const CHUNK = 100;
for (let i = 0; i < records.length; i += CHUNK) {
  const chunk = records.slice(i, i + CHUNK);
  const values = [];
  const placeholders = chunk.map((rec, idx) => {
    const base = idx * cols.length;
    values.push(
      rec.skillCode, rec.skillName, rec.description, rec.gradeLevel, rec.gradeBand,
      rec.domainCode, rec.domain, rec.substrand, rec.standardLeafCode,
      rec.difficulty, rec.subSkillOrder, true,
    );
    return `(${cols.map((_, c) => `$${base + c + 1}`).join(",")})`;
  });
  const sql =
    `INSERT INTO ela_skills (${cols.join(",")}) VALUES ${placeholders.join(",")} ` +
    `ON CONFLICT (skill_code) DO NOTHING`;
  const res = await pool.query(sql, values);
  inserted += res.rowCount;
}

const total = await pool.query("SELECT count(*) FROM ela_skills");
console.log(`Inserted ${inserted} GA skills. ela_skills total now: ${total.rows[0].count}`);
await pool.end();
