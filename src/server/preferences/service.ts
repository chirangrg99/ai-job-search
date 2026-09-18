import "server-only";
import { z } from "zod";
import {
  preferenceSchema,
  targetSchema,
  type SearchResult,
} from "@/features/preferences/schema";
import type { PreferencesRepository } from "./repository";
export async function saveSearch(
  repo: PreferencesRepository,
  input: unknown,
  target?: unknown,
): Promise<SearchResult> {
  const parsed = preferenceSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fields: Object.fromEntries(
        parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
      ),
    };
  if (target !== undefined) {
    const checked = targetSchema.safeParse(target);
    if (!checked.success)
      return { ok: false, error: "Invalid search. Reload and try again." };
    await repo.update(checked.data, parsed.data);
  } else await repo.create(parsed.data);
  return { ok: true };
}
const operationSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("delete"), target: targetSchema }).strict(),
  z
    .object({ operation: z.literal("duplicate"), target: targetSchema })
    .strict(),
  z
    .object({
      operation: z.literal("set_enabled"),
      target: targetSchema,
      enabled: z.boolean(),
    })
    .strict(),
]);
export async function changeSearch(
  repo: PreferencesRepository,
  input: unknown,
): Promise<SearchResult> {
  const parsed = operationSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Invalid search action. Reload and try again." };
  const action = parsed.data;
  if (action.operation === "set_enabled")
    await repo.update(action.target, { enabled: action.enabled });
  else if (action.operation === "duplicate")
    await repo.duplicate(action.target);
  else await repo.remove(action.target);
  return { ok: true };
}
