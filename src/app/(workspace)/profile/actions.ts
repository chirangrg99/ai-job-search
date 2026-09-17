"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/guard";
import { candidateRepository } from "@/server/candidate/repository";
import {
  saveCandidateEntry,
  changeCandidateEntry,
} from "@/server/candidate/service";
import type { MutationResult } from "@/features/profile/schema";
export async function saveProfileEntry(
  input: unknown,
  target?: unknown,
): Promise<MutationResult> {
  const { client, user } = await requireUser();
  try {
    const result = await saveCandidateEntry(
      candidateRepository(client, user.id),
      input,
      target,
    );
    if (result.ok) revalidatePath("/profile");
    return result;
  } catch {
    return {
      ok: false,
      error:
        "Could not save. The item may have changed or be unavailable. Reload and retry; your changes remain in this form.",
    };
  }
}
export async function changeProfileEntry(
  operation: "verify" | "delete",
  target: unknown,
): Promise<MutationResult> {
  const { client, user } = await requireUser();
  if (operation !== "verify" && operation !== "delete")
    return { ok: false, error: "Invalid action." };
  try {
    const result = await changeCandidateEntry(
      candidateRepository(client, user.id),
      operation,
      target,
    );
    if (result.ok) revalidatePath("/profile");
    return result;
  } catch {
    return {
      ok: false,
      error:
        "The item is unavailable or changed. Reload your profile and try again.",
    };
  }
}
