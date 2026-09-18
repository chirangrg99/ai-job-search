import { label, type Preference } from "./schema";
export function preferenceSummary(search: Preference) {
  return `${search.target_titles.join(" or ") || "Any title"} · ${search.target_locations.join(" or ") || "Any location"} · ${search.remote_preferences.join(" / ") || "Any work mode"}. ${search.min_salary === null ? "No salary minimum." : `Minimum ${search.salary_currency ?? "unknown currency"} ${search.min_salary} per ${search.salary_period ?? "unknown period"}.`} ${search.minimum_fit_score === null ? "No minimum fit score." : `Minimum fit ${search.minimum_fit_score}/100 when available.`}`;
}
export function SearchCriteria({ search }: { search: Preference }) {
  const rows: [string, string][] = [
    ["Target titles", search.target_titles.join("; ") || "Any title"],
    ["Excluded titles", search.excluded_titles.join("; ") || "None"],
    ["Required keywords (all)", search.keywords.join("; ") || "None"],
    ["Excluded keywords", search.excluded_keywords.join("; ") || "None"],
    ["Locations (any)", search.target_locations.join("; ") || "Any location"],
    ["Work modes", search.remote_preferences.map(label).join(", ") || "Any"],
    [
      "Employment types",
      search.employment_types.map(label).join(", ") || "Any",
    ],
    [
      "Minimum salary",
      search.min_salary === null
        ? "Not set"
        : `${search.salary_currency ?? "Unknown currency"} ${search.min_salary} / ${search.salary_period ?? "unknown period"}`,
    ],
    [
      "Maximum commute",
      search.max_commute_km === null
        ? "Not set"
        : `${search.max_commute_km} km (non-remote roles)`,
    ],
    [
      "Minimum fit score",
      search.minimum_fit_score === null
        ? "Not set"
        : `${search.minimum_fit_score}/100`,
    ],
  ];
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {rows.map(([title, value]) => (
        <div key={title} className="min-w-0">
          <dt className="text-text-secondary">{title}</dt>
          <dd className="mt-1 [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
