import { durationYears } from "./evidence";
import type {
  CandidateEvidence,
  Evidence,
  FitRequirement,
  Match,
} from "./model";
export const sourceReference = (e: CandidateEvidence): Evidence => ({
  id: e.id,
  kind: e.kind,
  revision: e.revision,
  label: e.label,
  quote: e.quote,
});
import {
  qualification,
  conditions,
  negativeClaim,
  type Conditions,
} from "./qualification";
export function deterministicMatch(
  r: FitRequirement,
  candidates: CandidateEvidence[],
  asOf: string,
): Match {
  const base: Match = {
    ...r,
    status: "unknown",
    reason:
      "No sufficient verified evidence. This is not proof that you lack the qualification.",
    sources: [],
    method: "deterministic",
  };
  if (r.priority === "ambiguous" || r.needsReview)
    return {
      ...base,
      reason:
        "The posting is ambiguous; resolve it before crediting this requirement.",
    };
  if (
    /\b(work authori[sz]|legally|visa|sponsor|citizen|criminal|clearance|physical|lift\b)/i.test(
      r.text,
    )
  )
    return {
      ...base,
      reason:
        "Requires explicit personal confirmation; no eligibility is inferred.",
    };
  const pool = candidates
    .filter((c) => !negativeClaim.test(c.quote))
    .filter((c) =>
      r.category === "credentials"
        ? c.kind === "credential"
        : r.category === "education"
          ? c.kind === "education"
          : c.kind !== "credential",
    );
  const years = qualification(r.text).match(
    /^(?:at least |minimum (?:of )?)?(\d+(?:\.\d+)?)\+?\s*(years?|months?)(?:['’])?\s*(?:of\s+)?experience\s+(?:with|in|as (?:an? )?)\s*(.+)$/u,
  );
  if (years) {
    const subject = qualification(years[3]!);
    const supported = pool.filter(
      (c) =>
        c.kind === "experience" &&
        c.claims.some((s) => qualification(s) === subject),
    );
    const duration = durationYears(supported, asOf),
      target = Number(years[1]) / (years[2]!.startsWith("month") ? 12 : 1);
    if (!supported.length || !duration)
      return {
        ...base,
        reason:
          "Verified role dates and a matching occupation are needed; a skill or bullet does not prove how long that activity was practiced.",
      };
    return {
      ...base,
      status: duration >= target ? "exact" : "partial",
      sources: supported.map(sourceReference),
      reason: `At least ${duration.toFixed(1)} verified years for this activity; ${target.toFixed(1)} requested. Overlapping roles are counted once.`,
    };
  }
  const find = (atom: string) =>
    pool.find((c) =>
      c.claims.some(
        (claim) => !negativeClaim.test(claim) && qualification(claim) === atom,
      ),
    );
  const whole = find(qualification(r.text));
  const tree = conditions(qualification(r.text));
  // A literal verified compound claim can support the exact same complete wording.
  function evaluate(node: Conditions): {
    complete: boolean;
    sources: CandidateEvidence[];
  } {
    if ("atom" in node) {
      const source = find(node.atom);
      return { complete: Boolean(source), sources: source ? [source] : [] };
    }
    const children = node.children.map(evaluate);
    if (node.operator === "or")
      return (
        children.find((c) => c.complete) ??
        children.sort((a, b) => b.sources.length - a.sources.length)[0]!
      );
    return {
      complete: children.every((c) => c.complete),
      sources: children.flatMap((c) => c.sources),
    };
  }
  if (!tree && !whole)
    return {
      ...base,
      reason:
        "Mixed or unbalanced qualification conditions need review; no AND/OR precedence was assumed.",
    };
  const result = whole ? { complete: true, sources: [whole] } : evaluate(tree!);
  if (result.sources.length)
    return {
      ...base,
      status: result.complete ? "exact" : "partial",
      sources: [
        ...new Map(
          result.sources.map((c) => [c.id, sourceReference(c)]),
        ).values(),
      ],
      reason: result.complete
        ? "Every condition in an explicitly grouped alternative has verified evidence."
        : "Only part of this qualification has explicit verified evidence.",
    };
  return {
    ...base,
    status: r.category === "credentials" ? "missing" : "unknown",
  };
}
