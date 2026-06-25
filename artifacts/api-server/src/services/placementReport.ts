import type { PlacementItemType } from "./questionGenerator";
import { thetaToSmartScore, thetaToMasteryLevel } from "@workspace/irt-engine";

export const DOMAIN_LABELS: Record<string, string> = {
  L: "Language",
  RF: "Reading: Foundations",
  RI: "Reading: Informational",
  RL: "Reading: Literature",
  SL: "Speaking & Listening",
  W: "Writing",
};

export type DomainLevel = "strength" | "on_track" | "gap" | "not_assessed";

export interface PlacementAnswerRecord {
  skillCode?: string;
  correct?: boolean;
}

export interface DomainScore {
  domainCode: string;
  domain: string;
  questionsAnswered: number;
  correct: number;
  accuracyPct: number;
  level: DomainLevel;
}

/** Derive the CCSS domain code (e.g. "RL") from a skill code like "RL.5.1". */
export function domainCodeFromSkill(skillCode: string | undefined): string {
  if (!skillCode) return "L";
  return skillCode.split(".")[0] ?? "L";
}

function classify(accuracyPct: number, answered: number): DomainLevel {
  if (answered === 0) return "not_assessed";
  if (accuracyPct >= 75) return "strength";
  if (accuracyPct < 50) return "gap";
  return "on_track";
}

/** Aggregate per-domain performance from the session's stored answers. */
export function computeDomainBreakdown(answers: PlacementAnswerRecord[]): DomainScore[] {
  const buckets = new Map<string, { answered: number; correct: number }>();

  for (const ans of answers) {
    const code = domainCodeFromSkill(ans.skillCode);
    const bucket = buckets.get(code) ?? { answered: 0, correct: 0 };
    bucket.answered += 1;
    if (ans.correct) bucket.correct += 1;
    buckets.set(code, bucket);
  }

  const scores: DomainScore[] = [];
  for (const [domainCode, { answered, correct }] of buckets) {
    const accuracyPct = answered > 0 ? (correct / answered) * 100 : 0;
    scores.push({
      domainCode,
      domain: DOMAIN_LABELS[domainCode] ?? domainCode,
      questionsAnswered: answered,
      correct,
      accuracyPct: Math.round(accuracyPct),
      level: classify(accuracyPct, answered),
    });
  }

  // Stable, readable order: strengths first, then on_track, then gaps.
  const rank: Record<DomainLevel, number> = { strength: 0, on_track: 1, gap: 2, not_assessed: 3 };
  scores.sort((a, b) => rank[a.level] - rank[b.level] || b.accuracyPct - a.accuracyPct);
  return scores;
}

export interface StrandSummary {
  strandStrengths: string[];
  strandGaps: string[];
}

/** Human-readable strength/gap strand lists from a breakdown. */
export function summarizeStrands(breakdown: DomainScore[]): StrandSummary {
  return {
    strandStrengths: breakdown.filter((d) => d.level === "strength").map((d) => d.domain),
    strandGaps: breakdown.filter((d) => d.level === "gap").map((d) => d.domain),
  };
}

/**
 * Initial per-skill mastery estimate seeded from the placement result.
 *
 * The student's overall placement θ is the prior; we nudge it per-domain using
 * how they actually performed on that strand during the assessment (a strong
 * strand starts a little higher, a weak one a little lower). The result is a
 * starting SmartScore + mastery level for every skill in their learning map.
 *
 * Mastery level is intentionally capped at "approaching" — placement gives a
 * diagnostic starting point, but true mastery is *earned* through practice, so
 * no skill is ever pre-marked "mastered" from the assessment alone.
 */
export interface SkillMasterySeed {
  theta: number;
  thetaSe: number;
  smartScore: number;
  masteryPercentage: number;
  masteryLevel: string;
}

/** How strongly per-domain accuracy shifts a skill's seeded θ off the overall θ. */
const DOMAIN_ADJ_SCALE = 1.5;
/** Seeded θ uncertainty — high, so a few practice items quickly refine it. */
const SEED_THETA_SE = 1.0;

export function computeSkillSeed(
  baseTheta: number,
  domainAccuracyPct: number | null,
): SkillMasterySeed {
  const delta =
    domainAccuracyPct == null ? 0 : (domainAccuracyPct / 100 - 0.5) * DOMAIN_ADJ_SCALE;
  const theta = Math.max(-4, Math.min(4, baseTheta + delta));
  const smartScore = thetaToSmartScore(theta);
  let masteryLevel = thetaToMasteryLevel(theta);
  if (masteryLevel === "mastered") masteryLevel = "approaching";
  return {
    theta,
    thetaSe: SEED_THETA_SE,
    smartScore,
    masteryPercentage: smartScore,
    masteryLevel,
  };
}

/** Concrete, classroom-ready next steps tailored to the student's results. */
export function recommendNextSteps(
  breakdown: DomainScore[],
  pathway: string,
  gradeLevel: string,
): string[] {
  const steps: string[] = [];
  const gaps = breakdown.filter((d) => d.level === "gap");
  const strengths = breakdown.filter((d) => d.level === "strength");

  if (gaps.length > 0) {
    const focus = gaps[0];
    steps.push(
      `Start daily practice in ${focus.domain} — this was the area with the most room to grow (${focus.accuracyPct}% accuracy).`,
    );
    if (gaps.length > 1) {
      steps.push(
        `Layer in targeted review of ${gaps[1].domain} once ${focus.domain} is trending upward.`,
      );
    }
  } else {
    steps.push(
      `No major gaps detected — keep building fluency with a steady mix of practice across all reading strands.`,
    );
  }

  if (strengths.length > 0) {
    steps.push(
      `Stretch existing strength in ${strengths[0].domain} with above-grade enrichment passages to keep ${gradeLevel}-level work engaging.`,
    );
  }

  const pathwayStep: Record<string, string> = {
    foundation:
      "Begin on the Foundation pathway: short, supported passages with read-aloud audio to build decoding and confidence.",
    developing:
      "Begin on the Developing pathway: grade-anchored passages with scaffolds and frequent comprehension checks.",
    proficient:
      "Begin on the Proficient pathway: grade-level analysis tasks that push inference and evidence use.",
    advanced:
      "Begin on the Advanced pathway: complex, above-grade texts emphasizing critical analysis and argument.",
  };
  steps.push(pathwayStep[pathway] ?? pathwayStep.developing);

  return steps;
}

/**
 * Choose which placement item type to present for a given (0-based) item index.
 * Rotates comprehension → vocabulary → fill_blank so the assessment samples
 * multiple item formats rather than plain multiple choice only.
 */
export function placementItemTypeForIndex(index: number): PlacementItemType {
  const cycle: PlacementItemType[] = ["comprehension", "comprehension", "vocabulary", "fill_blank"];
  return cycle[index % cycle.length];
}
