import { z } from "zod";
import type { ParsedJob } from "@/features/job-parser/schema";
export const RETRIEVAL_CONFIG = {
  version: "retrieval-v1",
  maxItems: 24,
  maxCharacters: 12000,
  maxSourceCharacters: 2000,
  maxShortlist: 60,
  maxRankerCharacters: 16000,
  limits: {
    fact: 8,
    credential: 4,
    experience: 4,
    bullet: 8,
    project: 3,
    education: 2,
  },
} as const;
export const sourceKinds = [
  "fact",
  "credential",
  "experience",
  "bullet",
  "project",
  "education",
] as const;
export type SourceKind = (typeof sourceKinds)[number];
export type RetrievalJob = {
  parsed: ParsedJob;
  asOf: string;
  categories?: string[];
};
export const reasonSchema = z.strictObject({
  requirementId: z.string().nullable(),
  signal: z.enum(["explicit_terms", "keywords", "category", "parent_context"]),
  terms: z.array(z.string()).max(12),
});
export const selectionSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.enum(sourceKinds),
  revision: z.number().int().positive(),
  parentId: z.string().nullable(),
  priority: z.enum([
    "required",
    "preferred",
    "achievement",
    "transferable",
    "context",
  ]),
  relevanceScore: z.number().int().min(0).max(100),
  reasons: z.array(reasonSchema).min(1).max(12),
});
export type Selection = z.infer<typeof selectionSchema>;
export const retrievalResultSchema = z.strictObject({
  version: z.literal(RETRIEVAL_CONFIG.version),
  asOf: z.string(),
  jobFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  selectedCandidateFactIds: z.array(z.string()).max(12),
  selectedExperienceIds: z.array(z.string()).max(4),
  selectedExperienceBulletIds: z.array(z.string()).max(8),
  selectedProjectIds: z.array(z.string()).max(3),
  selectedEducationIds: z.array(z.string()).max(2),
  selections: z.array(selectionSchema).max(RETRIEVAL_CONFIG.maxItems),
  sourceCharacters: z
    .number()
    .int()
    .nonnegative()
    .max(RETRIEVAL_CONFIG.maxCharacters),
  omittedRelevantCount: z.number().int().nonnegative(),
  ranking: z.enum(["deterministic", "reranked", "fallback"]),
});
export type RetrievalResult = z.infer<typeof retrievalResultSchema>;
export type ResumeSource = {
  id: string;
  kind: SourceKind;
  revision: number;
  parentId: string | null;
  verified: true;
  values: Record<string, string | boolean>;
};
/** Optional local/embedding ranking seam. Only this bounded shortlist is available.
 * Scores may break ties within priority tiers; they cannot add sources or rewrite facts.
 * No provider implementation or outbound request exists in Phase 10.
 */
export interface CandidateRelevanceRanker {
  rank(
    input: Readonly<{
      requirements: readonly { id: string; text: string; priority: string }[];
      candidates: readonly { id: string; kind: SourceKind; excerpt: string }[];
    }>,
  ): Promise<unknown>;
}
export type RetrievalOptions = { ranker?: CandidateRelevanceRanker };
