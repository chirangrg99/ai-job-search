import { z } from "zod";

export const evidenceText = z.strictObject({
  text: z.string().min(1).max(1500),
  evidence: z.string().min(1).max(3000),
});
export const priorities = [
  "required",
  "preferred",
  "unspecified",
  "ambiguous",
] as const;
export const requirementSchema = evidenceText.extend({
  priority: z.enum(priorities),
});
const requirements = z.array(requirementSchema).max(60);
export const requirementGroups = [
  "responsibilities",
  "requiredQualifications",
  "preferredQualifications",
  "skills",
  "technologies",
  "licences",
  "certifications",
  "educationRequirements",
  "experienceRequirements",
  "physicalRequirements",
  "scheduleRequirements",
] as const;
export const parsedJobSchema = z.strictObject({
  title: evidenceText
    .nullable()
    .describe(
      "Actual advertised occupation copied from the description; null if absent. Never a section heading.",
    ),
  company: evidenceText
    .nullable()
    .describe(
      "Explicit hiring organization name only; null for anonymous employers or business descriptions.",
    ),
  location: evidenceText.nullable(),
  employmentType: evidenceText.nullable(),
  salary: z
    .strictObject({
      minimum: z.number().nonnegative().max(1e9).nullable(),
      maximum: z.number().nonnegative().max(1e9).nullable(),
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .nullable(),
      period: z.enum(["hour", "day", "week", "month", "year"]).nullable(),
      evidence: z.string().min(1).max(3000),
    })
    .nullable(),
  responsibilities: requirements,
  requiredQualifications: z
    .array(requirementSchema.extend({ priority: z.literal("required") }))
    .max(60),
  preferredQualifications: z
    .array(requirementSchema.extend({ priority: z.literal("preferred") }))
    .max(60),
  skills: requirements,
  technologies: requirements,
  licences: requirements,
  certifications: requirements,
  educationRequirements: requirements,
  experienceRequirements: requirements,
  physicalRequirements: requirements,
  scheduleRequirements: requirements.describe(
    "Explicit hours, shifts, days, on-call duties or attendance cadence. Exclude bare Hybrid/Remote/On-site labels; use [] when timing is unstated.",
  ),
  workAuthorizationWording: evidenceText.nullable(),
  ambiguities: z.array(evidenceText).max(60),
});
export type ParsedJob = z.infer<typeof parsedJobSchema>;
export const descriptionSchema = z
  .string()
  .min(1)
  .max(80000)
  .refine((s) => s.trim().length > 0, "Provide a job description.");
const periodPatterns = {
  hour: /\b(hour|hourly|hr)\b/i,
  day: /\b(day|daily)\b/i,
  week: /\b(week|weekly)\b/i,
  month: /\b(month|monthly)\b/i,
  year: /\b(year|yearly|annual|annually|annum)\b/i,
};
/** Reject fabricated quotations and rewritten claims. Classification still requires human review. */
export function validateParsedJob(input: unknown, source: string): ParsedJob {
  descriptionSchema.parse(source);
  const parsed = parsedJobSchema.parse(input);
  function check(item: z.infer<typeof evidenceText>) {
    if (
      !source.includes(item.evidence) ||
      !item.evidence.includes(item.text) ||
      !item.text.trim()
    )
      throw new Error("Unsupported extraction evidence.");
  }
  for (const key of [
    "title",
    "company",
    "location",
    "employmentType",
    "workAuthorizationWording",
  ] as const)
    if (parsed[key]) check(parsed[key]);
  // Narrow rejection rules for observed identity errors. These do not prove identity.
  const heading = (text: string) =>
    text
      .trim()
      .toLowerCase()
      .replace(/[:.!?]+$/u, "")
      .replace(/\s+/gu, " ");
  const sectionHeadings = new Set([
    "role function and purpose",
    "role purpose",
    "job description",
    "job summary",
    "about the role",
    "about this role",
    "the role",
    "responsibilities",
    "key responsibilities",
    "qualifications",
    "requirements",
    "company overview",
    "about us",
  ]);
  if (parsed.title && sectionHeadings.has(heading(parsed.title.text)))
    throw new Error("A section heading is not a job title.");
  if (
    parsed.company &&
    (sectionHeadings.has(heading(parsed.company.text)) ||
      /^(?:(?:the|our)\s+)?(?:hiring (?:organization|organisation|company)|client|employer|company)\s+(?:provides?|offers?|is|are|seeks?|needs?|operates?|speciali[sz]es?)\b/iu.test(
        parsed.company.text.trim(),
      ) ||
      /^(?:(?:the|our)\s+)?(?:hiring (?:organization|organisation|company)|client|employer|company)$/iu.test(
        parsed.company.text.trim(),
      ))
  )
    throw new Error("An anonymous employer description is not a company name.");
  for (const group of requirementGroups)
    for (const item of parsed[group]) check(item);
  for (const item of parsed.ambiguities) check(item);
  const salary = parsed.salary;
  if (salary) {
    if (!source.includes(salary.evidence))
      throw new Error("Unsupported salary evidence.");
    if (
      salary.minimum !== null &&
      salary.maximum !== null &&
      salary.minimum > salary.maximum
    )
      throw new Error("Invalid salary range.");
    const numbers = [...salary.evidence.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map(
      (m) => Number(m[0].replaceAll(",", "")),
    );
    for (const value of [salary.minimum, salary.maximum])
      if (value !== null && !numbers.includes(value))
        throw new Error("Salary amount not present in evidence.");
    if (
      salary.currency &&
      !new RegExp(`\\b${salary.currency}\\b`).test(salary.evidence)
    )
      throw new Error("Salary currency not explicit.");
    if (salary.period && !periodPatterns[salary.period].test(salary.evidence))
      throw new Error("Salary period not explicit.");
  }
  return parsed;
}
export type ParseActionResult =
  { ok: true; cached: boolean } | { ok: false; error: string };
