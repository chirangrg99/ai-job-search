import { canonical, durationYears } from "./evidence";
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
const clean = (s: string) =>
  canonical(s)
    .replace(
      /^(?:must have |required: |proficiency in |proficient in |experience (?:with|in) |knowledge of |valid )/u,
      "",
    )
    .replace(/ (?:is required|required|preferred|is preferred)$/u, "");
const aliases: Record<string, string> = {
  javascript: "javascript",
  js: "javascript",
  "react.js": "react",
  reactjs: "react",
  "node.js": "node.js",
  nodejs: "node.js",
  typescript: "typescript",
  ts: "typescript",
};
const term = (s: string) => aliases[clean(s)] ?? clean(s);
const negative =
  /\b(no|not|without|never|lack|lacks|learning|beginner|expired)\b/i;
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
  if (r.priority === "ambiguous")
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
  const pool = candidates.filter((c) =>
    r.category === "credentials"
      ? c.kind === "credential"
      : r.category === "education"
        ? c.kind === "education"
        : c.kind !== "credential",
  );
  const years = clean(r.text).match(
    /^(\d+(?:\.\d+)?)\+?\s*(years?|months?)(?:['’])?\s*(?:of\s+)?experience\s+(?:with|in|as (?:an? )?)\s*(.+)$/u,
  );
  if (years) {
    const subject = term(years[3]!);
    const supported = pool.filter(
      (c) =>
        c.kind === "experience" && c.claims.some((s) => term(s) === subject),
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
  // No substring matching: complex qualifications must not become exact from one mentioned skill.
  const alternatives = clean(r.text).split(/\s+or\s+/u);
  for (const option of alternatives) {
    const atoms = option
      .split(/\s+and\s+|,\s*/u)
      .map(term)
      .filter(Boolean);
    const sources = atoms.map((atom) =>
      pool.find((c) =>
        c.claims.some((s) => !negative.test(s) && term(s) === atom),
      ),
    );
    if (sources.length && sources.every(Boolean))
      return {
        ...base,
        status: "exact",
        sources: [
          ...new Map(sources.map((s) => [s!.id, sourceReference(s!)])).values(),
        ],
        reason:
          "Every condition in this alternative has an explicit verified source.",
      };
  }
  // An incomplete conjunction earns partial credit only for explicitly supported atoms.
  const atoms = clean(r.text)
    .split(/\s+and\s+|,\s*/u)
    .map(term);
  const partial = pool.filter((c) =>
    c.claims.some((s) => !negative.test(s) && atoms.includes(term(s))),
  );
  if (atoms.length > 1 && partial.length && !/\bor\b/.test(r.text))
    return {
      ...base,
      status: "partial",
      sources: partial.map(sourceReference),
      reason: "Only some listed conditions have explicit verified evidence.",
    };
  return {
    ...base,
    status: r.category === "credentials" ? "missing" : "unknown",
  };
}
