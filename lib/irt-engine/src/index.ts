/**
 * 3-Parameter Logistic IRT engine for Alphabet AI.
 *
 * Model: P(θ) = c + (1–c) / (1 + exp(–1.7·a·(θ–b)))
 *   θ — latent ability (logit scale, ~N(0,1) in the population)
 *   a — discrimination  (typical range 0.5–2.5)
 *   b — difficulty      (typical range –3 to +3, same scale as θ)
 *   c — guessing        (pseudo-chance; 0.25 for 4-choice MC)
 *
 * All public functions are pure (no side-effects).
 */

const D = 1.7; // standard scaling constant

/** Quadrature grid: 41 evenly-spaced points on [–4, +4] */
const QUAD_N = 41;
const QUAD_MIN = -4;
const QUAD_MAX = 4;
const QUAD_STEP = (QUAD_MAX - QUAD_MIN) / (QUAD_N - 1);
const QUAD_THETAS: number[] = Array.from(
  { length: QUAD_N },
  (_, i) => QUAD_MIN + i * QUAD_STEP,
);

// ---------------------------------------------------------------------------
// Core model
// ---------------------------------------------------------------------------

/** 3-PL probability of a correct response. */
export function irtP(theta: number, a: number, b: number, c: number): number {
  return c + (1 - c) / (1 + Math.exp(-D * a * (theta - b)));
}

/**
 * Item Fisher information at θ for a 3-PL item.
 * I(θ) = (D·a)² · (P–c)² / ((1–c)² · P·(1–P))
 */
export function fisherInfo(
  theta: number,
  a: number,
  b: number,
  c: number,
): number {
  const p = irtP(theta, a, b, c);
  const pMinusC = p - c;
  const denom = (1 - c) ** 2 * p * (1 - p);
  if (denom < 1e-12) return 0;
  return (D * a) ** 2 * (pMinusC ** 2) / denom;
}

// ---------------------------------------------------------------------------
// EAP ability estimation
// ---------------------------------------------------------------------------

export interface IrtResponse {
  a: number;
  b: number;
  c: number;
  correct: boolean;
}

/**
 * Expected A Posteriori (EAP) ability estimate.
 *
 * Uses a quadrature grid with a Gaussian prior N(priorMean, priorSd).
 * Returns { theta, se } where se is the posterior standard deviation.
 */
export function eapEstimate(
  responses: IrtResponse[],
  priorMean = 0,
  priorSd = 1,
): { theta: number; se: number } {
  // Build prior weights (unnormalized Gaussian density at each grid point)
  let weights = QUAD_THETAS.map((t) => {
    const z = (t - priorMean) / priorSd;
    return Math.exp(-0.5 * z * z);
  });

  // Multiply by likelihood for each observed response
  for (const resp of responses) {
    weights = weights.map((w, i) => {
      const p = irtP(QUAD_THETAS[i], resp.a, resp.b, resp.c);
      return w * (resp.correct ? p : 1 - p);
    });
  }

  // Normalise
  const total = weights.reduce((s, v) => s + v, 0);
  if (total < 1e-300) {
    return { theta: priorMean, se: priorSd };
  }
  const norm = weights.map((w) => w / total);

  // Posterior mean (EAP)
  const theta = QUAD_THETAS.reduce((acc, t, i) => acc + t * norm[i], 0);

  // Posterior variance → SE
  const variance = QUAD_THETAS.reduce(
    (acc, t, i) => acc + norm[i] * (t - theta) ** 2,
    0,
  );
  const se = Math.sqrt(Math.max(0, variance));

  return { theta, se };
}

/**
 * Single-step EAP update: treat the current theta estimate as a Gaussian
 * prior N(currentTheta, priorSd) and update with one new response.
 * Useful for streaming practice updates where full history is unavailable.
 */
export function eapUpdate(
  currentTheta: number,
  currentSe: number,
  resp: IrtResponse,
): { theta: number; se: number } {
  const priorSd = Math.max(0.3, Math.min(currentSe, 2));
  return eapEstimate([resp], currentTheta, priorSd);
}

// ---------------------------------------------------------------------------
// Item selection
// ---------------------------------------------------------------------------

export interface ItemCandidate {
  skillCode: string;
  a: number;
  b: number;
  c: number;
}

/**
 * Maximum Fisher Information (MFI) item selection.
 * Returns the candidate that maximises I(θ) at the current ability estimate.
 */
export function selectNextItem(
  theta: number,
  candidates: ItemCandidate[],
): ItemCandidate | null {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestInfo = fisherInfo(theta, best.a, best.b, best.c);
  for (let i = 1; i < candidates.length; i++) {
    const info = fisherInfo(theta, candidates[i].a, candidates[i].b, candidates[i].c);
    if (info > bestInfo) {
      best = candidates[i];
      bestInfo = info;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Score & mastery conversions
// ---------------------------------------------------------------------------

/**
 * Linear mapping: θ ∈ [–4, +4] → SmartScore ∈ [0, 100].
 * θ = 0 (grade-level mean) → 50; each logit = 12.5 points.
 */
export function thetaToSmartScore(theta: number): number {
  return Math.round(Math.max(0, Math.min(100, 50 + theta * 12.5)));
}

/** Mastery level derived from ability. */
export function thetaToMasteryLevel(theta: number): string {
  if (theta >= 1.5) return "mastered";
  if (theta >= 0.5) return "approaching";
  if (theta >= -0.5) return "practicing";
  return "introduced";
}

/**
 * Map θ to a diagnosed grade level string (K–12).
 * Each grade ≈ 0.5 logits; anchored so θ = 0 ≈ middle of 5th grade.
 */
export function thetaToGrade(theta: number): string {
  if (theta < -2.5) return "K";
  if (theta < -2.0) return "1st";
  if (theta < -1.5) return "2nd";
  if (theta < -1.0) return "3rd";
  if (theta < -0.5) return "4th";
  if (theta < 0.0) return "5th";
  if (theta < 0.5) return "6th";
  if (theta < 1.0) return "7th";
  if (theta < 1.5) return "8th";
  if (theta < 2.0) return "9th";
  if (theta < 2.5) return "10th";
  if (theta < 3.0) return "11th";
  return "12th";
}

/** Pathway label from θ. */
export function thetaToPathway(theta: number): string {
  if (theta < -1.5) return "foundation";
  if (theta < 0) return "developing";
  if (theta < 1.5) return "proficient";
  return "advanced";
}

// ---------------------------------------------------------------------------
// CAT stopping criteria
// ---------------------------------------------------------------------------

/**
 * Decide whether a CAT placement session should stop.
 * Minimum 8 items; hard cap at 25; stop early when SE < 0.35.
 */
export function shouldStopPlacement(count: number, se: number): boolean {
  if (count < 8) return false;
  if (count >= 25) return true;
  return se < 0.35;
}
