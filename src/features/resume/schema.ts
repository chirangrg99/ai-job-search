import { z } from "zod";
import { sourceKinds, RETRIEVAL_CONFIG } from "@/features/retrieval/model";
export const RESUME_VERSION = "resume-v1";
export const VALIDATION_VERSION = "resume-validation-v1";
const text = z.string().trim().min(1).max(900);
export const referenceSchema = z.strictObject({
  sourceId: z.string().min(1).max(160),
  field: z.string().min(1).max(60),
  quote: text,
});
export const claimSchema = z.strictObject({
  text,
  sources: z.array(referenceSchema).min(1).max(6),
});
export type Claim = z.infer<typeof claimSchema>;
export const resumeDraftSchema = z.strictObject({
  headline: claimSchema,
  professionalSummary: z.array(claimSchema).min(1).max(3),
  skills: z.array(claimSchema).max(16),
  experiences: z
    .array(
      z.strictObject({
        sourceId: z.string(),
        bullets: z.array(claimSchema).min(1).max(8),
      }),
    )
    .max(4),
  projects: z
    .array(
      z.strictObject({
        sourceId: z.string(),
        bullets: z.array(claimSchema).min(1).max(4),
      }),
    )
    .max(3),
  education: z.array(z.string()).max(2),
  licencesCertifications: z.array(z.string()).max(4),
});
export type ResumeDraft = z.infer<typeof resumeDraftSchema>;
export const contextSchema = z.strictObject({
  version: z.literal(RETRIEVAL_CONFIG.version),
  asOf: z.iso.date(),
  items: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        kind: z.enum(sourceKinds),
        revision: z.number().int().positive(),
        parentId: z.string().nullable(),
        verified: z.literal(true),
        values: z.record(z.string(), z.union([z.string(), z.boolean()])),
      }),
    )
    .min(1)
    .max(24),
});
export type ResumeContext = z.infer<typeof contextSchema>;
export const reviewSchema = z.strictObject({
  claims: z
    .array(
      z.strictObject({
        path: z.string().min(1).max(160),
        verdict: z.enum(["supported", "unsupported", "uncertain"]),
        reason: text,
      }),
    )
    .max(80),
});
export type ClaimReview = z.infer<typeof reviewSchema>;
export const validationSchema = z.strictObject({
  version: z.literal(VALIDATION_VERSION),
  passed: z.boolean(),
  issues: z.array(
    z.strictObject({ path: z.string(), code: z.string(), message: z.string() }),
  ),
  unsupportedClaims: z.array(z.string()),
  warnings: z.array(z.string()),
});
export type ResumeValidation = z.infer<typeof validationSchema>;
export function claimsOf(draft: ResumeDraft) {
  return [
    { path: "headline", claim: draft.headline },
    ...draft.professionalSummary.map((claim, i) => ({
      path: `professionalSummary.${i}`,
      claim,
    })),
    ...draft.skills.map((claim, i) => ({ path: `skills.${i}`, claim })),
    ...draft.experiences.flatMap((e, i) =>
      e.bullets.map((claim, j) => ({
        path: `experiences.${i}.bullets.${j}`,
        claim,
      })),
    ),
    ...draft.projects.flatMap((e, i) =>
      e.bullets.map((claim, j) => ({
        path: `projects.${i}.bullets.${j}`,
        claim,
      })),
    ),
  ];
}
