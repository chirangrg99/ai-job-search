import "server-only";
import { z } from "zod";
import {
  contextSchema,
  resumeDraftSchema,
  RESUME_VERSION,
  type ResumeDraft,
  type ResumeValidation,
} from "@/features/resume/schema";
import { validateGeneratedApplication } from "@/features/resume/validate";
import type { ResumeAI } from "./ai";
import type { ResumeSnapshot } from "./repository";
export const generationRequestSchema = z.strictObject({
  applicationId: z.uuid(),
  consent: z.literal(true),
});
export interface ResumeRepository {
  load(id: string, asOf: string): Promise<ResumeSnapshot>;
  claim(id: string): Promise<string | null>;
  release(id: string, token: string): Promise<void>;
  save(
    snapshot: ResumeSnapshot,
    draft: ResumeDraft,
    validation: ResumeValidation,
    model: string,
    token: string,
  ): Promise<string>;
}
export async function generateTailoredResume(
  repo: ResumeRepository,
  ai: ResumeAI | null,
  raw: unknown,
  asOf = new Date().toISOString().slice(0, 10),
) {
  const request = generationRequestSchema.parse(raw);
  if (!ai)
    throw new Error(
      "Configure OPENAI_API_KEY on the server before generating a resume.",
    );
  const snapshot = await repo.load(request.applicationId, asOf);
  const context = contextSchema.parse(snapshot.context);
  const token = await repo.claim(request.applicationId);
  if (!token)
    throw new Error(
      "Resume generation is already running. Wait a few minutes and reload before retrying.",
    );
  try {
    const response = await ai.generate(snapshot.job.parsed, context);
    const draft = resumeDraftSchema.parse(response.output);
    let validation = validateGeneratedApplication(draft, context);
    // Never spend a second request reviewing already-invalid references or lexical claims.
    if (validation.issues.every((i) => i.code === "review_required")) {
      try {
        validation = validateGeneratedApplication(
          draft,
          context,
          await ai.review(draft, context),
        );
      } catch {
        validation.warnings.push(
          "Independent review was unavailable. This version remains blocked; regenerate to retry.",
        );
      }
    }
    const fresh = await repo.load(request.applicationId, asOf);
    if (fresh.hash !== snapshot.hash)
      throw new Error(
        "Verified profile or job inputs changed during generation. Regenerate using current information.",
      );
    const id = await repo.save(
      snapshot,
      draft,
      validation,
      response.model,
      token,
    );
    return { id, passed: validation.passed, version: RESUME_VERSION };
  } finally {
    await repo.release(request.applicationId, token);
  }
}
