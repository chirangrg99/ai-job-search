import "server-only";
import type { DiscoveryOverview } from "@/features/discovery/model";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import {
  discoveredJobSchema,
  type DiscoveredJob,
} from "@/features/discovery/schema";
import { preferenceSchema } from "@/features/preferences/schema";
export function discoveryRepository(
  client: SupabaseClient<Database>,
  userId: string,
) {
  async function owner() {
    const { data, error } = await client
      .from("candidate_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (error || !data) throw new Error("Could not load your profile.");
    return data.id;
  }
  async function enabledSearch(id: string) {
    const { data, error } = await client
      .from("job_preferences")
      .select("*")
      .eq("profile_id", await owner())
      .eq("id", id)
      .eq("enabled", true)
      .single();
    if (error || !data)
      throw new Error(
        "Choose an enabled saved search that belongs to your profile.",
      );
    return preferenceSchema.parse(data);
  }
  async function start(provider: string, preferenceId: string | null) {
    const profile = await owner();
    const expired = await client
      .from("job_sync_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_code: "interrupted",
        error_message:
          "The previous sync was interrupted. Any received records are preserved.",
      })
      .eq("profile_id", profile)
      .eq("provider", provider)
      .eq("status", "running")
      .lt("started_at", new Date(Date.now() - 360000).toISOString());
    if (expired.error) throw new Error("Could not recover interrupted sync.");
    const source = await client
      .from("job_sources")
      .upsert(
        {
          profile_id: profile,
          provider,
          display_name:
            provider === "adzuna" ? "Adzuna Canada" : "Manual entry",
          enabled: true,
        },
        { onConflict: "profile_id,provider" },
      )
      .select("id")
      .single();
    if (source.error || !source.data)
      throw new Error("Could not initialize job source.");
    const { data, error } = await client
      .from("job_sync_runs")
      .insert({
        profile_id: profile,
        source_id: source.data.id,
        provider,
        preference_id: preferenceId,
      })
      .select("id")
      .single();
    if (error || !data)
      throw new Error(
        "A sync may already be running. Wait for it to finish, or retry after six minutes if it was interrupted.",
      );
    return data.id;
  }
  /** Normalization pipeline intake. Receives validated DTOs, never provider response objects. */
  async function accept(runId: string, jobs: DiscoveredJob[]) {
    if (!jobs.length) return;
    const profile = await owner();
    const unique = new Map(
      jobs.map((job) => {
        const dto = discoveredJobSchema.parse(job);
        return [`${dto.provider}:${dto.externalId}`, dto] as const;
      }),
    );
    const { error } = await client.from("job_discoveries").upsert(
      [...unique.values()].map((dto) => ({
        profile_id: profile,
        run_id: runId,
        provider: dto.provider,
        external_id: dto.externalId,
        dto,
      })),
      { onConflict: "run_id,provider,external_id" },
    );
    if (error)
      throw new Error(
        "Could not store discoveries. Previously received records are preserved.",
      );
  }
  async function finish(
    runId: string,
    summary: {
      status: "completed" | "partial" | "failed";
      rejected: number;
      code: string | null;
      message: string | null;
      pagination: Json;
    },
  ) {
    const profile = await owner();
    const count = await client
      .from("job_discoveries")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile)
      .eq("run_id", runId);
    if (count.error) throw new Error("Could not confirm saved discoveries.");
    const { data, error } = await client
      .from("job_sync_runs")
      .update({
        status: summary.status,
        finished_at: new Date().toISOString(),
        received_count: count.count ?? 0,
        rejected_count: summary.rejected,
        error_code: summary.code,
        error_message: summary.message,
        pagination: summary.pagination,
      })
      .eq("profile_id", profile)
      .eq("id", runId)
      .eq("status", "running")
      .select("source_id,finished_at")
      .single();
    if (error || !data)
      throw new Error(
        "Could not record sync outcome. Reload to check received records.",
      );
    if (summary.status === "completed") {
      const source = await client
        .from("job_sources")
        .update({ last_synced_at: data.finished_at })
        .eq("profile_id", profile)
        .eq("id", data.source_id);
      if (source.error)
        throw new Error(
          "Discoveries were saved, but the source timestamp could not be updated.",
        );
    }
    return count.count ?? 0;
  }
  async function overview(): Promise<DiscoveryOverview> {
    const profile = await owner();
    const [searches, runs, items, sources] = await Promise.all([
      client
        .from("job_preferences")
        .select("id,name")
        .eq("profile_id", profile)
        .eq("enabled", true)
        .order("created_at"),
      client
        .from("job_sync_runs")
        .select(
          "id,provider,status,started_at,finished_at,received_count,rejected_count,error_message,pagination",
        )
        .eq("profile_id", profile)
        .order("started_at", { ascending: false })
        .limit(10),
      client
        .from("job_discoveries")
        .select("id,dto,received_at", { count: "exact" })
        .eq("profile_id", profile)
        .order("received_at", { ascending: false })
        .limit(50),
      client
        .from("job_sources")
        .select("provider,last_synced_at")
        .eq("profile_id", profile),
    ]);
    if ([searches, runs, items, sources].some((x) => x.error))
      throw new Error("Could not load job discovery.");
    return {
      searches: searches.data ?? [],
      runs: runs.data ?? [],
      sources: sources.data ?? [],
      total: items.count ?? 0,
      items: (items.data ?? []).map((row) => ({
        id: row.id,
        receivedAt: row.received_at,
        job: discoveredJobSchema.parse(row.dto),
      })),
    };
  }
  return { owner, enabledSearch, start, accept, finish, overview };
}
export type DiscoveryRepository = ReturnType<typeof discoveryRepository>;
