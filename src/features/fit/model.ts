import { z } from "zod";
import { kinds } from "@/features/profile/schema";
export const categories = [
  "required",
  "preferred",
  "experience",
  "skills",
  "credentials",
  "education",
  "location",
  "compensation",
] as const;
export type Category = (typeof categories)[number];
export const categoryLabels: Record<Category, string> = {
  required: "Required qualifications",
  preferred: "Preferred qualifications",
  experience: "Relevant experience",
  skills: "Skills / technology",
  credentials: "Licences / certifications",
  education: "Education",
  location: "Location / work arrangement",
  compensation: "Compensation",
};
export const FIT_CONFIG = {
  version: "fit-v1",
  weights: {
    required: 30,
    preferred: 10,
    experience: 20,
    skills: 15,
    credentials: 10,
    education: 5,
    location: 5,
    compensation: 5,
  },
  priority: { required: 3, preferred: 1, unspecified: 1, ambiguous: 3 },
  credit: {
    exact: 1,
    partial: 0.5,
    transferable: 0.25,
    missing: 0,
    unknown: 0,
  },
  thresholds: { strong_apply: 80, apply: 65, maybe: 40 },
  mandatoryCredentialCap: 39,
  unresolvedRequiredCap: 79,
} as const;
export const evidenceSchema = z.object({
  id: z.string(),
  kind: z.enum([...kinds, "preference"]),
  revision: z.string(),
  label: z.string(),
  quote: z.string(),
});
export type Evidence = z.infer<typeof evidenceSchema>;
export type CandidateEvidence = Evidence & {
  claims: string[];
  start: string | null;
  end: string | null;
  parentId: string | null;
  sensitive: boolean;
};
export const requirementSchema = z.object({
  id: z.string(),
  text: z.string(),
  evidence: z.string(),
  category: z.enum(categories),
  priority: z.enum(["required", "preferred", "unspecified", "ambiguous"]),
});
export type FitRequirement = z.infer<typeof requirementSchema>;
export const matchSchema = requirementSchema.extend({
  status: z.enum(["exact", "partial", "transferable", "missing", "unknown"]),
  reason: z.string(),
  sources: z.array(evidenceSchema),
  method: z.enum(["deterministic", "semantic"]),
});
export type Match = z.infer<typeof matchSchema>;
export const fitResultSchema = z.object({
  fitScore: z.number().int().min(0).max(100),
  recommendation: z.enum(["strong_apply", "apply", "maybe", "skip"]),
  sufficientEvidence: z.boolean(),
  matchedRequirements: z.array(matchSchema),
  partialRequirements: z.array(matchSchema),
  missingRequiredRequirements: z.array(matchSchema),
  missingPreferredRequirements: z.array(matchSchema),
  matches: z.array(matchSchema),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  reasoningSummary: z.string(),
  breakdown: z.array(
    z.object({
      category: z.enum(categories),
      weight: z.number(),
      available: z.number(),
      earned: z.number(),
      points: z.number(),
    }),
  ),
  uncappedScore: z.number(),
  caps: z.array(z.string()),
  engineVersion: z.string(),
  asOf: z.string(),
});
export type FitResult = z.infer<typeof fitResultSchema>;
export type FitActionResult =
  { ok: true; cached: boolean } | { ok: false; error: string };
