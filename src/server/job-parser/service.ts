import "server-only";
import { z } from "zod";
import {
  descriptionSchema,
  validateParsedJob,
  type ParseActionResult,
} from "@/features/job-parser/schema";
import { AIError, type AIClient } from "@/server/ai/client";
import type { JobParserRepository } from "./repository";
export const parseRequestSchema = z.strictObject({
  jobId: z.uuid(),
  retry: z.boolean().default(false),
});
export async function parseJobDescription(
  repo: JobParserRepository,
  ai: AIClient | null,
  model: string,
  input: unknown,
): Promise<ParseActionResult> {
  const parsed = parseRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a valid saved job." };
  const job = await repo.job(parsed.data.jobId);
  if (!job) return { ok: false, error: "Job not found." };
  const description = descriptionSchema.safeParse(job.description);
  if (!description.success)
    return {
      ok: false,
      error:
        "Parsing needs a nonempty description of at most 30,000 characters. No text is silently truncated.",
    };
  const cached = await repo.current(job.id, description.data, job.complete);
  if (cached?.status === "completed") {
    validateParsedJob(cached.parsed_output, description.data);
    return { ok: true, cached: true };
  }
  if (!ai) return { ok: false, error: new AIError("configuration").message };
  const claim = await repo.claim(
    job.id,
    description.data,
    job.complete,
    parsed.data.retry,
  );
  if (claim.state === "cached") {
    validateParsedJob(claim.output, description.data);
    return { ok: true, cached: true };
  }
  if (claim.state === "busy")
    return {
      ok: false,
      error:
        "This description is already being parsed. Reload shortly; no extra AI request was sent.",
    };
  if (claim.state === "retry_required")
    return {
      ok: false,
      error:
        "The prior attempt did not complete. Explicit retry is available after 30 seconds (or two minutes for an interrupted request), with at most three attempts per version.",
    };
  try {
    const response = await ai.parseJobDescription(description.data, model);
    let output;
    try {
      output = validateParsedJob(response.output, description.data);
    } catch {
      throw new AIError("invalid_output");
    }
    await repo.complete(
      claim.id,
      claim.token,
      output,
      description.data,
      response.model,
    );
    return { ok: true, cached: false };
  } catch (error) {
    const code = error instanceof AIError ? error.code : "persistence";
    try {
      await repo.fail(claim.id, claim.token, code);
    } catch {
      /* Expired claim remains recoverable through explicit retry. */
    }
    return {
      ok: false,
      error:
        error instanceof AIError
          ? error.message
          : "Could not finish saving the extraction. Reload before explicitly retrying.",
    };
  }
}
