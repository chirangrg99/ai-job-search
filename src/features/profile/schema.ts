import { z } from "zod";
import { parseProfileDate } from "./dates";
export const kinds = [
  "personal",
  "summary",
  "experience",
  "bullet",
  "education",
  "fact",
  "credential",
  "project",
] as const;
export type ProfileKind = (typeof kinds)[number];
const text = z.string().trim().max(5000);
const short = z.string().trim().max(200);
const required = short.min(1, "This field is required.");
const url = short.refine(
  (v) => !v || (/^https?:\/\//.test(v) && URL.canParse(v)),
  "Use a full http:// or https:// URL.",
);
const date = short.superRefine((v, c) => {
  try {
    parseProfileDate(v);
  } catch (e) {
    c.addIssue({
      code: "custom",
      message: e instanceof Error ? e.message : "Invalid date.",
    });
  }
});
const tags = z
  .string()
  .max(2000)
  .transform((v) => [
    ...new Set(
      v
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
    ),
  ])
  .refine(
    (v) => v.length <= 30 && v.every((x) => x.length <= 60),
    "Use up to 30 tags, each no longer than 60 characters.",
  );
const common = { source_reference: text, categories: tags };
export const entrySchema = z
  .discriminatedUnion("kind", [
    z.object({
      kind: z.literal("personal"),
      full_name: required,
      preferred_name: short,
      email: short.refine(
        (v) => !v || z.email().safeParse(v).success,
        "Enter a valid email.",
      ),
      phone: short,
      city: short,
      province: short,
      country: short,
      linkedin_url: url,
      portfolio_url: url,
      github_url: url,
      source_reference: text,
    }),
    z.object({
      kind: z.literal("summary"),
      professional_summary: text,
      source_reference: text,
    }),
    z.object({
      kind: z.literal("experience"),
      company: required,
      title: required,
      location: short,
      start_date: date,
      end_date: date,
      currently_employed: z.boolean(),
      employment_type: short,
      ...common,
    }),
    z.object({
      kind: z.literal("bullet"),
      experience_id: z.uuid(),
      original_text: text.min(1, "Write a factual bullet."),
      skills: tags,
      keywords: tags,
      ...common,
    }),
    z.object({
      kind: z.literal("education"),
      institution: required,
      credential: short,
      field_of_study: short,
      location: short,
      start_date: date,
      end_date: date,
      ...common,
    }),
    z.object({
      kind: z.literal("fact"),
      title: required,
      description: text,
      fact_type: z.enum(["skill", "fact"]),
      value_text: text,
      keywords: tags,
      sensitivity: z.enum(["public", "private", "sensitive"]),
      ...common,
    }),
    z.object({
      kind: z.literal("credential"),
      title: required,
      description: text,
      fact_type: z.enum(["licence", "certification"]),
      value_text: text,
      valid_from: date,
      valid_to: date,
      keywords: tags,
      sensitivity: z.enum(["public", "private", "sensitive"]),
      ...common,
    }),
    z.object({
      kind: z.literal("project"),
      name: required,
      description: text,
      technologies: tags,
      achievements: text,
      url,
      ...common,
    }),
  ])
  .superRefine((v, ctx) => {
    if (v.kind === "experience" && v.currently_employed && v.end_date)
      ctx.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "A current role cannot have an end date.",
      });
    const pair =
      v.kind === "experience" || v.kind === "education"
        ? [v.start_date, v.end_date, "end_date"]
        : v.kind === "credential"
          ? [v.valid_from, v.valid_to, "valid_to"]
          : null;
    if (pair) {
      try {
        const start = parseProfileDate(pair[0]!).date;
        const end = parseProfileDate(pair[1]!, true).date;
        if (start && end && end < start)
          ctx.addIssue({
            code: "custom",
            path: [pair[2]!],
            message: "End date must not precede start date.",
          });
      } catch {
        /* Field validation supplies the error. */
      }
    }
  });
export type ProfileEntry = z.infer<typeof entrySchema>;
export const targetSchema = z
  .object({
    kind: z.enum(kinds),
    id: z.uuid(),
    revision: z.number().int().positive(),
  })
  .strict();
export type ProfileTarget = z.infer<typeof targetSchema>;
export type MutationResult =
  { ok: true } | { ok: false; error: string; fields?: Record<string, string> };
