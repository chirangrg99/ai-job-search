import { emptyPreference, type Preference } from "./schema";
export const listFields = [
  "target_titles",
  "excluded_titles",
  "keywords",
  "excluded_keywords",
  "target_locations",
] as const;
export const numberFields = [
  "min_salary",
  "max_commute_km",
  "minimum_fit_score",
] as const;
export type SearchForm = Record<string, string | boolean | string[]>;
export function formValues(search: Preference = emptyPreference): SearchForm {
  const values: SearchForm = {
    ...search,
    salary_currency: search.salary_currency ?? "",
    salary_period: search.salary_period ?? "",
    min_salary: "",
    max_commute_km: "",
    minimum_fit_score: "",
  };
  for (const key of listFields) values[key] = search[key].join("\n");
  for (const key of numberFields)
    values[key] = search[key] === null ? "" : String(search[key]);
  return values;
}
export function formInput(values: SearchForm) {
  const result: Record<string, unknown> = { ...values };
  for (const key of listFields)
    result[key] = String(values[key] ?? "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  for (const key of numberFields) {
    const raw = String(values[key] ?? "").trim();
    result[key] = raw === "" ? null : Number(raw);
  }
  result.salary_currency =
    String(values.salary_currency ?? "")
      .trim()
      .toUpperCase() || null;
  result.salary_period = values.salary_period || null;
  return result;
}
