"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/guard";
import { jobReviewRepository } from "@/server/job-review/repository";
import { DEFAULT_PARSER_MODEL } from "@/server/job-parser/prompt";
export async function prepareApplication(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { client, user } = await requireUser();
  const id = z.uuid().safeParse(raw);
  if (!id.success) return { ok: false, error: "Choose a valid job." };
  try {
    await jobReviewRepository(client, user.id, DEFAULT_PARSER_MODEL).prepare(
      id.data,
    );
  } catch {
    return {
      ok: false,
      error:
        "Could not start preparation. Reload to check the application status, then retry.",
    };
  }
  revalidatePath(`/jobs/${id.data}`);
  revalidatePath("/jobs");
  revalidatePath("/");
  revalidatePath("/applications");
  return { ok: true };
}
