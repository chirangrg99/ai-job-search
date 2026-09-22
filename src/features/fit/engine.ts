import type { ParsedJob } from "@/features/job-parser/schema";
import type { SavedSearch } from "@/features/preferences/schema";
import {
  categories,
  FIT_CONFIG,
  fitResultSchema,
  type CandidateEvidence,
  type FitResult,
  type Match,
} from "./model";
import { buildRequirements } from "./requirements";
import { deterministicMatch } from "./match";
import { compatibility } from "./compatibility";
import type { SourceConflict } from "./source-audit";
export type FitInput = {
  sourceConflicts?: SourceConflict[];
  parsed: ParsedJob;
  candidates: CandidateEvidence[];
  search: SavedSearch | null;
  remoteType: string | null;
  asOf: string;
  sourceComplete: boolean;
};
export function initialMatches(input: FitInput): Match[] {
  return [
    ...buildRequirements(input.parsed, input.sourceConflicts).map((r) =>
      deterministicMatch(r, input.candidates, input.asOf),
    ),
    ...compatibility(input.parsed, input.search, input.remoteType),
  ];
}
export function scoreMatches(input: FitInput, matches: Match[]): FitResult {
  const breakdown = categories.map((category) => {
    const rows = matches.filter((m) => m.category === category);
    const available = rows.reduce(
      (n, m) => n + FIT_CONFIG.priority[m.priority],
      0,
    );
    const earned = rows.reduce(
      (n, m) =>
        n + FIT_CONFIG.priority[m.priority] * FIT_CONFIG.credit[m.status],
      0,
    );
    return {
      category,
      weight: rows.length
        ? (FIT_CONFIG.weights[category] * available) / rows.length
        : FIT_CONFIG.weights[category],
      available,
      earned,
      points: 0,
    };
  });
  const activeWeight = breakdown
    .filter((b) => b.available > 0)
    .reduce((n, b) => n + b.weight, 0);
  for (const b of breakdown)
    b.points =
      b.available && activeWeight
        ? (((100 * b.weight) / activeWeight) * b.earned) / b.available
        : 0;
  const uncappedScore = Math.round(breakdown.reduce((n, b) => n + b.points, 0));
  let fitScore = uncappedScore;
  const caps: string[] = [];
  const required = matches.filter(
    (m) => m.priority === "required" || m.priority === "ambiguous",
  );
  if (
    required.some((m) => m.category === "credentials" && m.status !== "exact")
  ) {
    fitScore = Math.min(fitScore, FIT_CONFIG.mandatoryCredentialCap);
    caps.push(
      "A mandatory licence/certification is not fully supported: score capped at 39.",
    );
  }
  if (required.some((m) => m.status !== "exact")) {
    fitScore = Math.min(fitScore, FIT_CONFIG.unresolvedRequiredCap);
    caps.push(
      "Unresolved required qualifications prevent a strong-apply recommendation (maximum 79).",
    );
  }
  const sufficientEvidence =
    input.candidates.length > 0 &&
    buildRequirements(input.parsed, input.sourceConflicts).length > 0;
  if (!sufficientEvidence) {
    fitScore = 0;
    caps.push(
      "Insufficient verified profile information or parsed requirements. No meaningful assessment is available.",
    );
  }
  const thresholds = FIT_CONFIG.thresholds;
  const recommendation = !sufficientEvidence
    ? "maybe"
    : fitScore >= thresholds.strong_apply
      ? "strong_apply"
      : fitScore >= thresholds.apply
        ? "apply"
        : fitScore >= thresholds.maybe
          ? "maybe"
          : "skip";
  const matchedRequirements = matches.filter((m) => m.status === "exact"),
    partialRequirements = matches.filter(
      (m) => m.status === "partial" || m.status === "transferable",
    );
  const missingRequiredRequirements = required.filter(
    (m) => m.status !== "exact",
  );
  const missingPreferredRequirements = matches.filter(
    (m) => m.priority === "preferred" && m.status !== "exact",
  );
  const concerns = [
    ...caps,
    ...(input.sourceConflicts?.length
      ? [
          "English/French experience thresholds disagree. Both source variants are preserved for review; neither threshold is assumed correct.",
        ]
      : []),
    ...(!input.sourceComplete
      ? [
          "Posting completeness is not confirmed; omitted requirements cannot be scored.",
        ]
      : []),
    ...(input.parsed.ambiguities.length
      ? [
          "The parsed posting contains ambiguities. Review the original wording.",
        ]
      : []),
    ...matches
      .filter((m) => m.status !== "exact")
      .map((m) => `${m.text}: ${m.reason}`),
  ];
  if (
    input.search?.minimum_fit_score !== null &&
    input.search?.minimum_fit_score !== undefined &&
    fitScore < input.search.minimum_fit_score
  )
    concerns.unshift(
      `Below this saved search's minimum fit score of ${input.search.minimum_fit_score}.`,
    );
  return fitResultSchema.parse({
    fitScore,
    recommendation,
    sufficientEvidence,
    matchedRequirements,
    partialRequirements,
    missingRequiredRequirements,
    missingPreferredRequirements,
    matches,
    breakdown,
    uncappedScore,
    caps,
    strengths: matchedRequirements.map(
      (m) => `${m.text}: explicit supporting evidence.`,
    ),
    concerns,
    reasoningSummary: `${matchedRequirements.length} of ${matches.length} criteria fully supported; ${partialRequirements.length} partial or transferable. Required items carry 3× the item weight of preferred items within each category. Only applicable categories are weighted. Unknowns earn no credit; this is evidence coverage, not a hiring probability.`,
    engineVersion: FIT_CONFIG.version,
    asOf: input.asOf,
  });
}
export function matchJobToProfile(input: FitInput) {
  return scoreMatches(input, initialMatches(input));
}
