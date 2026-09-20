import { z } from "zod";
import {
  descriptionSchema,
  priorities,
  requirementGroups,
  parsedJobSchema,
  validateParsedJob,
  type ParsedJob,
} from "@/features/job-parser/schema";
export type SourcePassage = { id: number; text: string };
/** Every passage is an exact contiguous span; splitting never rewrites source characters. */
export function sourcePassages(source: string): SourcePassage[] {
  descriptionSchema.parse(source);
  const parts = source
    .split(/(?=[•−])|\n+|(?<=[.!?])\s+(?=[A-ZÀ-Ý])/u)
    .flatMap((line) => {
      const result: string[] = [];
      let rest = line.trim();
      while (rest.length > 1200) {
        let end = rest.lastIndexOf(" ", 1200);
        if (end < 1) end = 1200;
        result.push(rest.slice(0, end));
        rest = rest.slice(end).trim();
      }
      if (rest) result.push(rest);
      return result;
    });
  return parts.map((text, id) => ({ id, text }));
}
const id = z.number().int().nonnegative();
const scalar = z
  .strictObject({ text: z.string().min(1).max(1500), sourceId: id })
  .nullable();
const requirement = z.strictObject({
  sourceId: id,
  priority: z.enum(priorities),
});
export const referenceOutputSchema = z.strictObject({
  title: scalar,
  company: scalar,
  location: scalar,
  employmentType: scalar,
  salary: z
    .strictObject({
      minimum: z.number().nonnegative().max(1e9).nullable(),
      maximum: z.number().nonnegative().max(1e9).nullable(),
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .nullable(),
      period: z.enum(["hour", "day", "week", "month", "year"]).nullable(),
      sourceId: id,
    })
    .nullable(),
  responsibilities: z.array(requirement).max(60),
  requiredQualifications: z
    .array(requirement.extend({ priority: z.literal("required") }))
    .max(60),
  preferredQualifications: z
    .array(requirement.extend({ priority: z.literal("preferred") }))
    .max(60),
  skills: z.array(requirement).max(60),
  technologies: z.array(requirement).max(60),
  licences: z.array(requirement).max(60),
  certifications: z.array(requirement).max(60),
  educationRequirements: z.array(requirement).max(60),
  experienceRequirements: z.array(requirement).max(60),
  physicalRequirements: z.array(requirement).max(60),
  scheduleRequirements: z.array(requirement).max(60),
  workAuthorizationWording: scalar,
  ambiguities: z.array(id).max(60),
});
export function resolveReferences(input: unknown, source: string): ParsedJob {
  const parsed = referenceOutputSchema.parse(input),
    passages = sourcePassages(source);
  function evidence(index: number) {
    const p = passages[index];
    if (!p) throw new Error("Unknown source passage.");
    return p.text;
  }
  function field(value: z.infer<typeof scalar>) {
    return value
      ? { text: value.text, evidence: evidence(value.sourceId) }
      : null;
  }
  const output: Record<string, unknown> = {
    title: field(parsed.title),
    company: field(parsed.company),
    location: field(parsed.location),
    employmentType: field(parsed.employmentType),
    workAuthorizationWording: field(parsed.workAuthorizationWording),
    salary: parsed.salary
      ? {
          minimum: parsed.salary.minimum,
          maximum: parsed.salary.maximum,
          currency: parsed.salary.currency,
          period: parsed.salary.period,
          evidence: evidence(parsed.salary.sourceId),
        }
      : null,
    ambiguities: [...new Set(parsed.ambiguities)].map((index) => ({
      text: evidence(index),
      evidence: evidence(index),
    })),
  };
  for (const group of requirementGroups) {
    const seen = new Set<number>();
    output[group] = parsed[group]
      .filter((item) => {
        if (seen.has(item.sourceId)) return false;
        seen.add(item.sourceId);
        return true;
      })
      .map((item) => ({
        text: evidence(item.sourceId),
        evidence: evidence(item.sourceId),
        priority: item.priority,
      }));
  }
  return validateParsedJob(parsedJobSchema.parse(output), source);
}
