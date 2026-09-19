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

export async function savePostingSource(
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const { client, user } = await requireUser();
  const { z } = await import("zod");
  const request = z
    .discriminatedUnion("mode", [
      z.strictObject({ jobId: z.uuid(), mode: z.literal("fetch") }),
      z.strictObject({
        jobId: z.uuid(),
        mode: z.literal("paste"),
        text: z.string().trim().min(1).max(50000),
      }),
    ])
    .safeParse(input);
  if (!request.success)
    return { ok: false, error: "Provide posting text of 1–50,000 characters." };
  try {
    const repo = jobParserRepository(client, user.id, DEFAULT_PARSER_MODEL);
    const job = await repo.job(request.data.jobId);
    if (!job) return { ok: false, error: "Job not found." };
    const text =
      request.data.mode === "paste"
        ? request.data.text
        : await (
            await import("@/server/job-parser/posting-reader")
          ).readPublicPosting(job.applicationUrl ?? "");
    await repo.savePosting(
      job.id,
      text,
      request.data.mode === "paste" ? "pasted" : "public_page",
    );
    revalidatePath(`/jobs/${job.id}`);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "Could not read or save this posting. Paste its full job text instead; blocked, login-only or JavaScript-only pages cannot be read.",
    };
  }
}
