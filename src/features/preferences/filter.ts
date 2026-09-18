import {
  normalize,
  type Preference,
  type remoteModes,
  type employmentTypes,
  type salaryPeriods,
} from "./schema";
/** Provider-neutral facts. Adapters must supply structured, trusted values, not guessed ones. */
export interface FilterJob {
  title?: string | null;
  description?: string | null;
  descriptionComplete?: boolean;
  /** Canonical location labels comparable to target_locations. Free-form provider text is not sufficient. */
  locations?: string[] | null;
  locationsComplete?: boolean;
  remoteType?: (typeof remoteModes)[number] | null;
  employmentTypes?: (typeof employmentTypes)[number][] | null;
  employmentTypesComplete?: boolean;
  salary?: {
    min?: number | null;
    max?: number | null;
    currency?: string | null;
    period?: (typeof salaryPeriods)[number] | null;
  } | null;
  /** Distance in km from the candidate's chosen commute origin, supplied by a future adapter. */
  commuteKm?: number | null;
  fitScore?: number | null;
}
export interface FilterReason {
  code: string;
  outcome: "fail" | "unknown" | "pass";
  message: string;
}
export interface FilterResult {
  pass: boolean;
  fail: boolean;
  reasons: FilterReason[];
}
// Unicode word boundaries avoid “IT” matching “writer”; keep punctuation such as C++ and C# meaningful.
export function containsTerm(text: string, term: string) {
  const escaped = normalize(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?:^|[^\\p{L}\\p{N}_+#])${escaped}(?=$|[^\\p{L}\\p{N}_+#])`,
    "u",
  ).test(normalize(text));
}
const validNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
/** Pass means eligible for further review, never a claim that unknown criteria match. No IO or AI. */
export function filterJob(job: FilterJob, search: Preference): FilterResult {
  const reasons: FilterReason[] = [];
  const add = (
    code: string,
    outcome: FilterReason["outcome"],
    message: string,
  ) => reasons.push({ code, outcome, message });
  if (!search.enabled)
    add("search_paused", "fail", "This saved search is paused.");
  const title = job.title?.trim();
  if (search.target_titles.length || search.excluded_titles.length) {
    if (!title) add("title_unknown", "unknown", "Job title is not provided.");
    else {
      const excluded = search.excluded_titles.filter((t) =>
        containsTerm(title, t),
      );
      if (excluded.length)
        add(
          "title_excluded",
          "fail",
          `Excluded title terms: ${excluded.join(", ")}.`,
        );
      if (
        search.target_titles.length &&
        !search.target_titles.some((t) => containsTerm(title, t))
      )
        add(
          "title_mismatch",
          "fail",
          "Title does not contain any configured target phrase.",
        );
    }
  }
  const matchesKeyword = (term: string) =>
    containsTerm(title ?? "", term) ||
    containsTerm(job.description ?? "", term);
  const excluded = search.excluded_keywords.filter((t) => matchesKeyword(t));
  if (excluded.length)
    add(
      "keyword_excluded",
      "fail",
      `Excluded keywords: ${excluded.join(", ")}.`,
    );
  if (search.excluded_keywords.length && !job.descriptionComplete)
    add(
      "exclusions_incomplete",
      "unknown",
      "Incomplete description: additional excluded terms cannot be ruled out.",
    );
  const missing = search.keywords.filter((t) => !matchesKeyword(t));
  if (missing.length)
    add(
      "required_keywords_missing",
      job.descriptionComplete && job.description?.trim() ? "fail" : "unknown",
      `Required keywords not found: ${missing.join(", ")}.`,
    );
  if (search.remote_preferences.length) {
    if (!job.remoteType)
      add("remote_unknown", "unknown", "Work mode is not provided.");
    else if (!search.remote_preferences.includes(job.remoteType))
      add("remote_mismatch", "fail", "Work mode is outside this search.");
  }
  if (search.employment_types.length) {
    if (
      !job.employmentTypes?.some((t) => search.employment_types.includes(t))
    ) {
      add(
        "employment_mismatch",
        job.employmentTypes?.length && job.employmentTypesComplete
          ? "fail"
          : "unknown",
        "No confirmed acceptable employment type.",
      );
    }
  }
  if (search.target_locations.length) {
    const matches = job.locations?.some((location) =>
      search.target_locations.some((t) => normalize(t) === normalize(location)),
    );
    if (!matches)
      add(
        "location_mismatch",
        job.locations?.length && job.locationsComplete ? "fail" : "unknown",
        "No confirmed target location match. Remote jobs may still have geographic restrictions.",
      );
  }
  if (search.max_commute_km !== null && job.remoteType !== "remote") {
    if (!validNumber(job.commuteKm))
      add("commute_unknown", "unknown", "Commute distance is not available.");
    else if (job.commuteKm > search.max_commute_km)
      add(
        "commute_exceeded",
        "fail",
        "Commute distance exceeds the configured maximum.",
      );
  }
  if (search.min_salary !== null) {
    const salary = job.salary;
    if (
      !salary ||
      !search.salary_currency ||
      !search.salary_period ||
      salary.currency?.toUpperCase() !== search.salary_currency ||
      salary.period !== search.salary_period
    )
      add(
        "salary_incomparable",
        "unknown",
        "Salary currency or period is missing or different; no conversion is assumed.",
      );
    else if (
      (salary.min != null && !validNumber(salary.min)) ||
      (salary.max != null && !validNumber(salary.max)) ||
      (salary.min != null && salary.max != null && salary.min > salary.max)
    )
      add("salary_invalid", "unknown", "Salary range is invalid.");
    else if (validNumber(salary.max) && salary.max < search.min_salary)
      add(
        "salary_below_minimum",
        "fail",
        "Even the advertised salary maximum is below your minimum.",
      );
    else if (!validNumber(salary.min) || salary.min < search.min_salary)
      add(
        "salary_unconfirmed",
        "unknown",
        "The advertised range does not guarantee your minimum salary.",
      );
  }
  if (search.minimum_fit_score !== null) {
    if (!validNumber(job.fitScore) || job.fitScore > 100)
      add(
        "fit_pending",
        "unknown",
        "Fit score is not available before analysis.",
      );
    else if (job.fitScore < search.minimum_fit_score)
      add(
        "fit_below_minimum",
        "fail",
        "Existing fit score is below this search's minimum.",
      );
  }
  if (!reasons.length)
    add("no_rejection", "pass", "No configured rejection rule matched.");
  const fail = reasons.some((r) => r.outcome === "fail");
  return { pass: !fail, fail, reasons };
}
