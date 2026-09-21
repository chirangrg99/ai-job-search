import type { ParsedJob } from "@/features/job-parser/schema";
import type { SavedSearch } from "@/features/preferences/schema";
import type { Match, Evidence } from "./model";
import { canonical } from "./evidence";
export function compatibility(
  parsed: ParsedJob,
  search: SavedSearch | null,
  remoteType: string | null,
): Match[] {
  if (!search) return [];
  const matches: Match[] = [];
  const source: Evidence = {
    id: search.id,
    kind: "preference",
    revision: search.updated_at,
    label: search.name,
    quote: "Candidate-selected saved search",
  };
  const add = (
    id: string,
    text: string,
    evidence: string,
    category: "location" | "compensation",
    status: Match["status"],
    reason: string,
    quote: string,
  ) =>
    matches.push({
      id,
      text,
      evidence,
      category,
      priority: "preferred",
      status,
      reason,
      sources: [{ ...source, quote }],
      method: "deterministic",
    });
  if (search.target_locations.length) {
    const location = parsed.location?.text;
    const exact =
      location &&
      search.target_locations.some((x) => canonical(x) === canonical(location));
    add(
      "location",
      "Target location",
      location ?? "Not supplied",
      "location",
      exact ? "exact" : "unknown",
      exact
        ? "Posting location exactly matches a saved target."
        : "Free-form locations are not enough to infer commute or geographic equivalence.",
      search.target_locations.join(", "),
    );
  }
  if (search.remote_preferences.length)
    add(
      "work-mode",
      "Work arrangement",
      remoteType ?? "Not supplied",
      "location",
      remoteType
        ? search.remote_preferences.some((x) => x === remoteType)
          ? "exact"
          : "missing"
        : "unknown",
      remoteType
        ? "Compared with saved work arrangements."
        : "No explicit work arrangement supplied.",
      search.remote_preferences.join(", "),
    );
  if (search.max_commute_km !== null)
    add(
      "commute",
      "Commute distance",
      "Not measured",
      "location",
      "unknown",
      "Commute distance has not been measured.",
      `${search.max_commute_km} km maximum`,
    );
  if (search.min_salary !== null) {
    const salary = parsed.salary;
    const comparable =
      salary &&
      salary.currency === search.salary_currency &&
      salary.period === search.salary_period;
    const status = !comparable
      ? "unknown"
      : salary.minimum !== null && salary.minimum >= search.min_salary
        ? "exact"
        : salary.maximum !== null && salary.maximum < search.min_salary
          ? "missing"
          : salary.maximum !== null && salary.maximum >= search.min_salary
            ? "partial"
            : "unknown";
    add(
      "compensation",
      "Salary minimum",
      salary?.evidence ?? "Not supplied",
      "compensation",
      status,
      "Compare only explicitly stated pay in the same currency and period. Overlapping ranges are partial; no currency or annualization assumptions.",
      `${search.min_salary} ${search.salary_currency} / ${search.salary_period}`,
    );
  }
  return matches;
}
