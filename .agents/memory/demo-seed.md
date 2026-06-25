---
name: Demo seed script
description: How the funder-demo dataset is seeded and the skill_mastery.domain gotcha
---

# Demo seed (`scripts/src/seed-demo.ts`)

Run: `pnpm --filter @workspace/scripts run seed-demo` (add `-- --clean` to only wipe).
Requires skills seeded first (`seed-skills`) and a reachable DATABASE_URL.

**Idempotent + resettable:** every run first deletes existing demo data, scoped by
the `demo-` users.id prefix and the demo teacher id, then recreates. Re-running is
the reset. `DEMO_TEACHER_ID` env attaches the dataset to a real logged-in account
(won't create/delete that user row).

## Gotcha: skill_mastery.domain holds the domain CODE
`skill_mastery.domain` stores the domain CODE ("RL", "RI", ...) — NOT the human
label ("Reading: Literature"). The teacher routes filter `m.domain === "RL"`, and
practice.ts writes `domainCode` into it. When seeding or querying mastery by domain,
use the code. (`ela_skills` is the opposite: `domain` = label, `domainCode` = code.)

**Why:** mixing these up makes the roster/heatmap/analytics domain averages all
read 0 even though mastery rows exist.
