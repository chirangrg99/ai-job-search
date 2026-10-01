"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/guard";
import { getServerEnv } from "@/server/env";
import { DEFAULT_PARSER_MODEL } from "@/server/job-parser/prompt";
import { resumeRepository } from "@/server/resume/repository";
import { OpenAIResumeClient } from "@/server/resume/ai";
import {
  generateTailoredResume,
  generationRequestSchema,
} from "@/server/resume/service";
export async function generateResumeAction(
  raw: unknown,
): Promise<
  { ok: true; id: string; passed: boolean } | { ok: false; error: string }
> {
  const { client, user } = await requireUser();
  const request = generationRequestSchema.safeParse(raw);
  if (!request.success)
    return {
      ok: false,
      error:
        "Select an application and confirm sending its selected verified facts to OpenAI.",
    };
  try {
    const env = getServerEnv();
    const result = await generateTailoredResume(
      resumeRepository(
        client,
        user.id,
        env.OPENAI_JOB_PARSER_MODEL ?? DEFAULT_PARSER_MODEL,
      ),
      env.OPENAI_API_KEY
        ? new OpenAIResumeClient(env.OPENAI_API_KEY, env.OPENAI_RESUME_MODEL)
        : null,
      request.data,
    );
    revalidatePath(`/applications/${request.data.applicationId}`);
    revalidatePath("/applications");
    return { ok: true, id: result.id, passed: result.passed };
  } catch {
    return {
      ok: false,
      error:
        "Could not generate a resume. Check that the current posting is parsed, relevant profile facts are verified, and OpenAI is configured. If generation is already running, wait three minutes and reload. Earlier versions are preserved.",
    };
  }
}
