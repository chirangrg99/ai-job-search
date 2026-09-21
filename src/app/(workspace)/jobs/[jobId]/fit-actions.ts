"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/guard";
import { getServerEnv } from "@/server/env";
import { DEFAULT_PARSER_MODEL } from "@/server/job-parser/prompt";
import { fitRepository } from "@/server/fit/repository";
import { assessFit, fitRequestSchema } from "@/server/fit/service";
import { OpenAISemanticClient } from "@/server/fit/semantic";
import type { FitActionResult } from "@/features/fit/model";
export async function assessSavedJob(raw: unknown): Promise<FitActionResult> {
  const { client, user } = await requireUser();
  const request = fitRequestSchema.safeParse(raw);
  if (!request.success)
    return { ok: false, error: "Choose a valid job and saved search." };
  try {
    const env = getServerEnv();
    return await assessFit(
      fitRepository(
        client,
        user.id,
        env.OPENAI_JOB_PARSER_MODEL ?? DEFAULT_PARSER_MODEL,
      ),
      request.data.mode === "semantic" && env.OPENAI_API_KEY
        ? new OpenAISemanticClient(env.OPENAI_API_KEY)
        : null,
      request.data,
    );
  } catch {
    return {
      ok: false,
      error:
        "Could not assess fit. Check that the current posting is parsed and the saved search is available. You can try rules-only assessment if semantic comparison failed.",
    };
  } finally {
    revalidatePath(`/jobs/${request.data.jobId}`);
  }
}
