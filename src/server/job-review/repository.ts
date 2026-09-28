import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { z } from "zod";
import { candidateRepository } from "@/server/candidate/repository";
import { preferencesRepository } from "@/server/preferences/repository";
import { verifiedEvidence } from "@/features/fit/evidence";
import { FIT_CONFIG, fitResultSchema } from "@/features/fit/model";
import { auditExperienceConflicts } from "@/features/fit/source-audit";
import { validateParsedJob } from "@/features/job-parser/schema";
import {
  PARSER_PROMPT_VERSION,
  PARSER_SCHEMA_VERSION,
} from "@/server/job-parser/prompt";
import { descriptionHash } from "@/server/job-parser/identity";
import { assessmentHash, fingerprint } from "@/server/fit/repository";
import type { ReviewFit, ReviewJob } from "@/features/job-review/model";

// Read every page, rather than silently inheriting PostgREST's row cap.
export async function allRows<T>(
  read: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += 200) {
    const { data, error } = await read(from, from + 199);
    if (error || !data)
      throw new Error("Could not load job review data. Please retry.");
    rows.push(...data);
    if (data.length < 200) return rows;
  }
}
const rawMetadata = z.object({
  raw: z.object({
    salaryPeriod: z.string().nullable().optional(),
    salaryEstimated: z.boolean().nullable().optional(),
    descriptionComplete: z.boolean().optional(),
  }),
});
export function jobReviewRepository(
  client: SupabaseClient<Database>,
  userId: string,
  parserModel: string,
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
  async function load(preferenceId: string | null = null) {
    const profileId = await owner(),
      asOf = new Date().toISOString().slice(0, 10);
    const [
      jobs,
      analyses,
      parses,
      applications,
      discoveries,
      runs,
      profile,
      searches,
      sources,
    ] = await Promise.all([
      allRows((a, b) =>
        client
          .from("jobs")
          .select(
            "id,title,company,location,remote_type,employment_type,provider,salary_min,salary_max,salary_currency,posted_at,discovered_at,normalized_data,likely_duplicate_of",
          )
          .eq("owner_profile_id", profileId)
          .order("id")
          .range(a, b),
      ),
      allRows((a, b) =>
        client
          .from("job_analysis")
          .select(
            "id,job_id,preference_id,result,input_hash,engine_version,model,analyzed_at",
          )
          .eq("profile_id", profileId)
          .order("id")
          .range(a, b),
      ),
      allRows((a, b) =>
        client
          .from("job_description_parses")
          .select("id,job_id,description_hash,parsed_output,prompt_version")
          .eq("profile_id", profileId)
          .eq("model", parserModel)
          .eq("prompt_version", PARSER_PROMPT_VERSION)
          .eq("schema_version", PARSER_SCHEMA_VERSION)
          .eq("status", "completed")
          .order("id")
          .range(a, b),
      ),
      allRows((a, b) =>
        client
          .from("applications")
          .select("id,job_id,status,submitted_at")
          .eq("profile_id", profileId)
          .order("id")
          .range(a, b),
      ),
      allRows((a, b) =>
        client
          .from("job_discoveries")
          .select("id,job_id,run_id")
          .eq("profile_id", profileId)
          .eq("status", "processed")
          .order("id")
          .range(a, b),
      ),
      allRows((a, b) =>
        client
          .from("job_sync_runs")
          .select(
            "id,preference_id,provider,status,started_at,finished_at,received_count,error_message",
          )
          .eq("profile_id", profileId)
          .order("id")
          .range(a, b),
      ),
      candidateRepository(client, userId).load(),
      preferencesRepository(client, userId).list(),
      allRows((a, b) =>
        client
          .from("job_sources")
          .select("id,provider,last_synced_at")
          .eq("profile_id", profileId)
          .order("id")
          .range(a, b),
      ),
    ]);
    const candidates = verifiedEvidence(profile, asOf),
      appByJob = new Map(applications.map((a) => [a.job_id, a]));
    const runById = new Map(runs.map((r) => [r.id, r])),
      membership = new Map<string, Set<string>>();
    for (const d of discoveries) {
      const search = runById.get(d.run_id)?.preference_id;
      if (d.job_id && search) {
        const s = membership.get(d.job_id) ?? new Set<string>();
        s.add(search);
        membership.set(d.job_id, s);
      }
    }
    const output: ReviewJob[] = jobs.map((j) => {
      const raw = rawMetadata.safeParse(j.normalized_data),
        app = appByJob.get(j.id);
      return {
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        remoteType: j.remote_type,
        employmentType: j.employment_type,
        provider: j.provider,
        salaryMin: j.salary_min,
        salaryMax: j.salary_max,
        salaryCurrency: j.salary_currency,
        salaryPeriod: raw.success ? (raw.data.raw.salaryPeriod ?? null) : null,
        salaryEstimated: raw.success && raw.data.raw.salaryEstimated === true,
        postedAt: j.posted_at,
        discoveredAt: j.discovered_at,
        status: app?.status ?? "new",
        submittedAt: app?.submitted_at ?? null,
        searchIds: [...(membership.get(j.id) ?? [])],
        fit: { state: "unassessed" },
        likelyDuplicateOf: j.likely_duplicate_of,
      };
    });
    // Profile and search data are loaded once. Only assessed jobs need the exact
    // database-built parser source; bound concurrency to avoid a request burst.
    let index = 0;
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        for (;;) {
          const position = index++,
            job = output[position],
            stored = jobs[position];
          if (!job || !stored) return;
          const history = analyses
            .filter(
              (a) =>
                a.job_id === job.id &&
                (!preferenceId || a.preference_id === preferenceId),
            )
            .sort(
              (a, b) =>
                b.analyzed_at.localeCompare(a.analyzed_at) ||
                a.id.localeCompare(b.id),
            );
          if (!history.length) continue;
          job.fit = { state: "stale" };
          const { data: source, error } = await client.rpc("job_parse_source", {
            target_job: job.id,
          });
          if (error || !source)
            throw new Error(
              "Could not verify current fit results. Please retry.",
            );
          const raw = rawMetadata.safeParse(stored.normalized_data),
            complete = raw.success && raw.data.raw.descriptionComplete === true;
          const parsed = parses.find(
            (p) =>
              p.job_id === job.id &&
              p.description_hash === descriptionHash(source, complete),
          );
          if (!parsed) continue;
          let extracted;
          try {
            extracted = validateParsedJob(parsed.parsed_output, source);
          } catch {
            continue;
          }
          for (const a of history) {
            if (a.engine_version !== FIT_CONFIG.version) continue;
            const search = a.preference_id
              ? searches.find((s) => s.id === a.preference_id)
              : null;
            if (a.preference_id && !search) continue;
            const mode = a.model === "deterministic" ? "rules" : "semantic";
            const input = {
              parsed: extracted,
              sourceConflicts: auditExperienceConflicts(source),
              candidates,
              search: search ?? null,
              remoteType: job.remoteType,
              asOf,
              sourceComplete: complete,
            };
            if (
              a.input_hash !==
              assessmentHash(
                input,
                fingerprint(source),
                parserModel,
                parsed.prompt_version,
                mode,
              )
            )
              continue;
            const result = fitResultSchema.safeParse(a.result);
            if (!result.success) continue;
            job.fit = {
              state: "current",
              result: result.data,
              preferenceId: a.preference_id,
              searchName: search?.name ?? "Profile only",
              mode,
              analyzedAt: a.analyzed_at,
            } satisfies ReviewFit;
            break;
          }
        }
      }),
    );
    return {
      jobs: output,
      searches: searches.map((s) => ({
        id: s.id,
        name: s.name,
        enabled: s.enabled,
      })),
      sources,
      runs: runs
        .sort((a, b) => b.started_at.localeCompare(a.started_at))
        .slice(0, 10),
    };
  }
  async function prepare(jobId: string) {
    const profileId = await owner();
    const { data: job, error } = await client
      .from("jobs")
      .select("id")
      .eq("owner_profile_id", profileId)
      .eq("id", jobId)
      .maybeSingle();
    if (error || !job) throw new Error("Job unavailable.");
    // Ignore conflicts so repeated clicks never reset an existing application.
    const inserted = await client.from("applications").upsert(
      {
        profile_id: profileId,
        job_id: jobId,
        status: "preparing",
        started_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,job_id", ignoreDuplicates: true },
    );
    if (inserted.error) throw new Error("Could not start preparation.");
    const existing = await client
      .from("applications")
      .select("status")
      .eq("profile_id", profileId)
      .eq("job_id", jobId)
      .single();
    if (existing.error || !existing.data)
      throw new Error("Could not load application.");
    if (existing.data.status === "interested") {
      const promoted = await client
        .from("applications")
        .update({ status: "preparing", started_at: new Date().toISOString() })
        .eq("profile_id", profileId)
        .eq("job_id", jobId)
        .eq("status", "interested");
      if (promoted.error) throw new Error("Could not start preparation.");
    }
  }
  return { load, prepare };
}
