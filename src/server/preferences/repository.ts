import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  preferenceSchema,
  type Preference,
  type SavedSearch,
  type SearchTarget,
} from "@/features/preferences/schema";
const failure =
  "The search is unavailable or has changed. Reload and try again.";
export function preferencesRepository(
  client: SupabaseClient<Database>,
  userId: string,
) {
  async function owner() {
    const { data, error } = await client
      .from("candidate_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (error || !data)
      throw new Error("Could not load your candidate profile.");
    return data.id;
  }
  async function list(): Promise<SavedSearch[]> {
    const { data, error } = await client
      .from("job_preferences")
      .select("*")
      .eq("profile_id", await owner())
      .order("created_at");
    if (error) throw new Error("Could not load saved searches.");
    return (data ?? []).map((row) => ({
      ...preferenceSchema.parse(row),
      id: row.id,
      updated_at: row.updated_at,
    }));
  }
  async function create(preference: Preference) {
    const { error } = await client
      .from("job_preferences")
      .insert({ ...preference, profile_id: await owner() });
    if (error) throw new Error("Could not create saved search.");
  }
  async function update(
    target: SearchTarget,
    changes: Preference | { enabled: boolean },
  ) {
    const { data, error } = await client
      .from("job_preferences")
      .update(changes)
      .eq("profile_id", await owner())
      .eq("id", target.id)
      .eq("updated_at", target.updated_at)
      .select("id");
    if (error || data?.length !== 1) throw new Error(failure);
  }
  async function remove(target: SearchTarget) {
    const { data, error } = await client
      .from("job_preferences")
      .delete()
      .eq("profile_id", await owner())
      .eq("id", target.id)
      .eq("updated_at", target.updated_at)
      .select("id");
    if (error || data?.length !== 1) throw new Error(failure);
  }
  async function duplicate(target: SearchTarget) {
    const { data, error } = await client
      .from("job_preferences")
      .select("*")
      .eq("profile_id", await owner())
      .eq("id", target.id)
      .eq("updated_at", target.updated_at)
      .single();
    if (error || !data) throw new Error(failure);
    const preference = preferenceSchema.parse(data);
    await create({
      ...preference,
      name: `${preference.name.slice(0, 113)} (copy)`,
      enabled: false,
    });
  }
  return { list, create, update, remove, duplicate };
}
export type PreferencesRepository = ReturnType<typeof preferencesRepository>;
