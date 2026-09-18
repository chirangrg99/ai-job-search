import { expect, it } from "vitest";
import { emptyPreference, preferenceSchema } from "./schema";
import { formInput, formValues } from "./form";
const valid = { ...emptyPreference, name: "Search" };
it("requires a name and strips browser-supplied ownership", () => {
  expect(preferenceSchema.safeParse(emptyPreference).success).toBe(false);
  expect(
    preferenceSchema.parse({
      ...valid,
      profile_id: "foreign",
      user_id: "foreign",
    }),
  ).toEqual(valid);
});
it("preserves multiple titles, deduplicates normalized terms", () =>
  expect(
    preferenceSchema.parse({
      ...valid,
      target_titles: ["Developer", " developer ", "Driver"],
    }).target_titles,
  ).toEqual(["developer", "Driver"]));
it.each([
  { min_salary: -1 },
  { min_salary: NaN },
  { minimum_fit_score: 101 },
  { minimum_fit_score: 1.5 },
  { max_commute_km: -1 },
  { remote_preferences: ["anywhere"] },
  { salary_currency: "dollars" },
  { salary_period: "fortnight" },
])("rejects invalid input %o", (changes) =>
  expect(preferenceSchema.safeParse({ ...valid, ...changes }).success).toBe(
    false,
  ),
);
it("requires salary units without assuming currency", () =>
  expect(preferenceSchema.safeParse({ ...valid, min_salary: 0 }).success).toBe(
    false,
  ));
it("accepts zero and all salary periods", () => {
  for (const salary_period of ["hour", "day", "week", "month", "year"])
    expect(
      preferenceSchema.safeParse({
        ...valid,
        min_salary: 0,
        salary_currency: "CAD",
        salary_period,
      }).success,
    ).toBe(true);
});
it("rejects contradictory keywords", () =>
  expect(
    preferenceSchema.safeParse({
      ...valid,
      keywords: ["SQL"],
      excluded_keywords: ["sql"],
    }).success,
  ).toBe(false));
it("round trips all fields and preserves commas inside locations", () => {
  const input = {
    ...valid,
    target_locations: ["Toronto, ON", "Ottawa, ON"],
    target_titles: ["Driver", "Developer"],
    min_salary: 0,
    salary_currency: "CAD",
    salary_period: "hour" as const,
    max_commute_km: 0,
    minimum_fit_score: 0,
  };
  expect(preferenceSchema.parse(formInput(formValues(input)))).toEqual(input);
});
it("blank numbers remain null, not zero", () =>
  expect(formInput(formValues(valid))).toEqual(valid));
