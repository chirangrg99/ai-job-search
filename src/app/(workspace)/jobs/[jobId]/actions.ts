"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/guard";
import { getServerEnv } from "@/server/env";
import { OpenAIClient } from "@/server/ai/client";
import { DEFAULT_PARSER_MODEL } from "@/server/job-parser/prompt";
import { jobParserRepository } from "@/server/job-parser/repository";
import {
  parseJobDescription,
  parseRequestSchema,
} from "@/server/job-parser/service";
import type { ParseActionResult } from "@/features/job-parser/schema";
export async function parseSavedJob(
  input: unknown,
): Promise<ParseActionResult> {
  const { client, user } = await requireUser();
  const request = parseRequestSchema.safeParse(input);
  if (!request.success)
    return { ok: false, error: "Choose a valid saved job." };
  try {
    const env = getServerEnv();
    const model = env.OPENAI_JOB_PARSER_MODEL ?? DEFAULT_PARSER_MODEL;
    return await parseJobDescription(
      jobParserRepository(client, user.id, model),
      env.OPENAI_API_KEY ? new OpenAIClient(env.OPENAI_API_KEY) : null,
      model,
      request.data,
    );
  } catch {
    return {
      ok: false,
      error:
        "Could not parse this job. Reload to check its source and parsing status.",
    };
  } finally {
    revalidatePath(`/jobs/${request.data.jobId}`);
  }
}
