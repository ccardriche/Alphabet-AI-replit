---
name: Post-placement individual skill mapping
description: How/why placement completion seeds the student's per-skill mastery map
---

# Placement completion seeds the individual skill map

When the placement CAT completes, the answer route seeds a `skill_mastery` row for every active skill at the student's diagnosed grade (catalog is K–8th; 9th–12th clamp to 8th). Without this, the dashboard and skill tree read `skill_mastery` and stay on empty "complete your placement" states even after placement is done (rows were otherwise only created just-in-time during practice).

**Seed math (computeSkillSeed in placementReport.ts):** overall placement θ is the prior, nudged per-domain by that strand's placement accuracy (`delta=(acc/100-0.5)*1.5`, so ±0.75 max), θ clamped [-4,4]. `thetaSe` seeded high (1.0) so a few practice items quickly refine it. Mastery level is **capped at "approaching"** — never pre-mark "mastered" from placement alone; mastery must be earned through practice.

**Why idempotent:** seeding uses `INSERT ... ON CONFLICT (studentId, skillCode) DO NOTHING`, so re-takes and existing practice progress are never overwritten.

**Why non-fatal:** seeding is wrapped in try/catch + `logger.warn`; a kid who finished the test must not get a 500 because the map insert failed. Trade-off: under a DB failure the profile can be marked `preAssessmentCompleted` while the map is empty (reintroduces empty-dashboard symptom). Watch the "Failed to seed skill mastery from placement" warning.

**How to apply:** any new way to "finish onboarding into practice" should ensure `skill_mastery` is populated, since dashboard `domainProgress`/`nextSkills` and the skill tree are driven entirely off it. `skill_mastery.domain` stores the CCSS domain CODE (RL/RI/RF/W/SL/L), not the label.
