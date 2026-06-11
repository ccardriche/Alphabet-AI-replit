---
name: IRT Engine Architecture
description: 3-PL IRT adaptive engine design — EAP estimation, MFI selection, placement vs practice strategy
---

## Rule
Use `eapEstimate` (full-history) for placement sessions; use `eapUpdate` (single-step Bayesian) for practice sessions. Never use the old gradient-based theta update.

**Why:** Placement stores all responses as JSONB, so full EAP is feasible and gives an exact posterior. Practice updates incrementally (one answer at a time per skill), so the single-step update treats the current θ as a Gaussian prior and runs EAP on just the new response — efficient and principled.

**How to apply:**
- `placement.ts` — build `IrtResponse[]` from `session.answers`, call `eapEstimate(responses)`, replace stored theta/thetaSe.
- `practice.ts` — load `mastery.theta` and `mastery.thetaSe` as prior, call `eapUpdate(currentTheta, currentSe, resp)`, write result back to `skill_mastery`.

## IRT parameters are round-tripped via the client
`/next` endpoints return `irt:{a,b,c}` in the response body. The client must echo them back in the answer POST body. This avoids a second DB lookup on answer submission. If `irt` is absent from the body, fall back to a DB lookup.

## Quadrature grid
41 points on [−4, +4], Gaussian prior N(0,1). Likelihood products can underflow to zero if too many responses are given with a very mismatched prior — handled by returning the prior when total < 1e-300.

## SmartScore formula
`SmartScore = round(clamp(50 + θ × 12.5, 0, 100))`
- θ = 0 → 50 (grade-level mean)
- θ = ±2 → 75 / 25
- θ = ±4 → 100 / 0

## DB columns
- `skill_mastery`: `theta REAL DEFAULT 0`, `theta_se REAL DEFAULT 999`
- `practice_sessions`: `answers JSONB DEFAULT '[]'`
- `placement_sessions`: already had `theta`, `theta_se`, `fisher_info`, `answers`
