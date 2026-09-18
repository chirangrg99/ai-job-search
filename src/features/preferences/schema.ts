import { z } from "zod";
export const remoteModes = ["remote", "hybrid", "onsite"] as const;
export const employmentTypes = [
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "internship",
  "volunteer",
  "other",
] as const;
export const salaryPeriods = ["hour", "day", "week", "month", "year"] as const;
export const normalize = (value: string) =>
  value.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
const terms = z
  .array(z.string().trim().min(1).max(120))
  .max(50)
  .transform((items) => [
    ...new Map(items.map((item) => [normalize(item), item])).values(),
  ]);
const optionalNumber = z
  .number()
  .finite()
  .nonnegative()
  .max(1_000_000_000)
  .nullable();
export const preferenceSchema = z
  .object({
    name: z.string().trim().min(1, "Name your saved search.").max(120),
    enabled: z.boolean(),
    target_titles: terms,
    excluded_titles: terms,
    keywords: terms,
    excluded_keywords: terms,
    target_locations: terms,
    remote_preferences: z.array(z.enum(remoteModes)).max(3),
    employment_types: z.array(z.enum(employmentTypes)).max(7),
    min_salary: optionalNumber,
    salary_currency: z
      .string()
      .regex(/^[A-Z]{3}$/, "Use a three-letter currency code.")
      .nullable(),
    salary_period: z.enum(salaryPeriods).nullable(),
    max_commute_km: z.number().finite().nonnegative().max(2000).nullable(),
    minimum_fit_score: z.number().int().min(0).max(100).nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.min_salary !== null) {
      if (!value.salary_currency)
        ctx.addIssue({
          code: "custom",
          path: ["salary_currency"],
          message: "Choose a currency for the salary minimum.",
        });
      if (!value.salary_period)
        ctx.addIssue({
          code: "custom",
          path: ["salary_period"],
          message: "Choose a salary period.",
        });
    }
    for (const [include, exclude] of [
      ["target_titles", "excluded_titles"],
      ["keywords", "excluded_keywords"],
    ] as const) {
      const conflicts = value[include].some((x) =>
        value[exclude].some((y) => normalize(x) === normalize(y)),
      );
      if (conflicts)
        ctx.addIssue({
          code: "custom",
          path: [exclude],
          message: "The same term cannot be both included and excluded.",
        });
    }
  });
export type Preference = z.infer<typeof preferenceSchema>;
export type SavedSearch = Preference & { id: string; updated_at: string };
export const targetSchema = z
  .object({ id: z.uuid(), updated_at: z.string().datetime({ offset: true }) })
  .strict();
export type SearchTarget = z.infer<typeof targetSchema>;
export type SearchResult =
  { ok: true } | { ok: false; error: string; fields?: Record<string, string> };
export const emptyPreference: Preference = {
  name: "",
  enabled: true,
  target_titles: [],
  excluded_titles: [],
  keywords: [],
  excluded_keywords: [],
  target_locations: [],
  remote_preferences: [],
  employment_types: [],
  min_salary: null,
  salary_currency: null,
  salary_period: null,
  max_commute_km: null,
  minimum_fit_score: null,
};
export const label = (value: string) => value.replaceAll("_", " ");
