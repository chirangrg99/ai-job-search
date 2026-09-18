"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/guard";
import { preferencesRepository } from "@/server/preferences/repository";
import { saveSearch, changeSearch } from "@/server/preferences/service";
import type { SearchResult } from "@/features/preferences/schema";
export async function savePreference(
  input: unknown,
  target?: unknown,
): Promise<SearchResult> {
  const { client, user } = await requireUser();
  try {
    const result = await saveSearch(
      preferencesRepository(client, user.id),
      input,
      target,
    );
    if (result.ok) revalidatePath("/preferences");
    return result;
  } catch {
    return {
      ok: false,
      error:
        "Could not save. The search may have changed. Your edits remain here; reload in another window to check, then retry.",
    };
  }
}
export async function changePreference(input: unknown): Promise<SearchResult> {
  const { client, user } = await requireUser();
  try {
    const result = await changeSearch(
      preferencesRepository(client, user.id),
      input,
    );
    if (result.ok) revalidatePath("/preferences");
    return result;
  } catch {
    return {
      ok: false,
      error:
        "Could not change this search. Reload and retry. Searches linked to existing analyses can be paused instead of deleted.",
    };
  }
}
