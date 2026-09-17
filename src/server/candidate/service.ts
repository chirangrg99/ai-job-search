import "server-only";
import {
  entrySchema,
  targetSchema,
  type MutationResult,
} from "@/features/profile/schema";
import type { CandidateRepository } from "./repository";
export async function saveCandidateEntry(
  repository: CandidateRepository,
  input: unknown,
  target?: unknown,
): Promise<MutationResult> {
  const parsed = entrySchema.safeParse(input);
  const identity =
    target === undefined ? undefined : targetSchema.safeParse(target);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] = i.message;
    return { ok: false, error: "Check the highlighted fields.", fields };
  }
  if (identity && !identity.success)
    return { ok: false, error: "Invalid item. Reload the profile." };
  await repository.save(parsed.data, identity?.data);
  return { ok: true };
}
export async function changeCandidateEntry(
  repository: CandidateRepository,
  operation: "verify" | "delete",
  input: unknown,
): Promise<MutationResult> {
  const target = targetSchema.safeParse(input);
  if (!target.success)
    return { ok: false, error: "Invalid item. Reload the profile." };
  if (operation === "verify") await repository.verify(target.data);
  else await repository.remove(target.data);
  return { ok: true };
}
