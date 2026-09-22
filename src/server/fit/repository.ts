import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { candidateRepository } from "@/server/candidate/repository";
import { preferencesRepository } from "@/server/preferences/repository";
import { jobParserRepository } from "@/server/job-parser/repository";
import { auditExperienceConflicts } from "@/features/fit/source-audit";
import { verifiedEvidence } from "@/features/fit/evidence";
import {
  FIT_CONFIG,
  fitResultSchema,
  type FitResult,
} from "@/features/fit/model";
import type { FitInput } from "@/features/fit/engine";
import { SEMANTIC_VERSION, SEMANTIC_MODEL } from "./semantic";
export type FitMode = "rules" | "semantic";
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export const fingerprint = (value: unknown) =>
  createHash("sha256").update(stableStringify(value)).digest("hex");
export type FitSnapshot = {
  profileId: string;
  jobId: string;
  input: FitInput;
  hash: string;
  mode: FitMode;
  sourceHash: string;
};
export function fitRepository(
  client: SupabaseClient<Database>,
  userId: string,
  parserModel: string,
) {
  const parser = jobParserRepository(client, userId, parserModel);
  async function load(
    jobId: string,
    preferenceId: string | null,
    mode: FitMode,
    asOf: string,
  ): Promise<FitSnapshot> {
    const job = await parser.job(jobId);
    if (!job) throw new Error("Job unavailable.");
    const parsed = await parser.current(jobId, job.source, job.complete);
    if (!parsed?.parsed_output)
      throw new Error("Parse the current posting before assessing fit.");
    const [profile, searches, details] = await Promise.all([
      candidateRepository(client, userId).load(),
      preferencesRepository(client, userId).list(),
      client
        .from("jobs")
        .select("remote_type")
        .eq("id", jobId)
        .eq("owner_profile_id", job.profileId)
        .single(),
    ]);
    if (details.error) throw new Error("Job unavailable.");
    const search = preferenceId
      ? searches.find((s) => s.id === preferenceId)
      : null;
    if (preferenceId && !search) throw new Error("Saved search unavailable.");
    const input: FitInput = {
      parsed: parsed.parsed_output,
      sourceConflicts: auditExperienceConflicts(job.source),
      candidates: verifiedEvidence(profile, asOf),
      search: search ?? null,
      remoteType: details.data.remote_type,
      asOf,
      sourceComplete: job.complete,
    };
    const sourceHash = fingerprint(job.source);
    const hash = fingerprint({
      input,
      sourceHash,
      parserModel,
      parserVersion: parsed.prompt_version,
      config: FIT_CONFIG,
      mode,
      semanticVersion: mode === "semantic" ? SEMANTIC_VERSION : null,
      semanticModel: mode === "semantic" ? SEMANTIC_MODEL : null,
    });
    return { profileId: job.profileId, jobId, input, hash, mode, sourceHash };
  }
  async function current(snapshot: FitSnapshot) {
    const { data, error } = await client
      .from("job_analysis")
      .select("result,analyzed_at")
      .eq("job_id", snapshot.jobId)
      .eq("profile_id", snapshot.profileId)
      .eq("input_hash", snapshot.hash)
      .eq("engine_version", FIT_CONFIG.version)
      .maybeSingle();
    if (error) throw new Error("Could not load saved assessment.");
    return data?.result
      ? {
          result: fitResultSchema.parse(data.result),
          analyzedAt: data.analyzed_at,
        }
      : null;
  }
  async function save(
    snapshot: FitSnapshot,
    result: FitResult,
    semanticOutput: unknown,
  ) {
    const safe = fitResultSchema.parse(result);
    const { error } = await client.from("job_analysis").upsert(
      {
        job_id: snapshot.jobId,
        profile_id: snapshot.profileId,
        preference_id: snapshot.input.search?.id ?? null,
        input_hash: snapshot.hash,
        engine_version: FIT_CONFIG.version,
        input_snapshot: JSON.parse(JSON.stringify(snapshot.input)) as Json,
        result: JSON.parse(JSON.stringify(safe)) as Json,
        semantic_output: JSON.parse(JSON.stringify(semanticOutput)) as Json,
        fit_score: safe.fitScore,
        recommendation: safe.recommendation,
        matched_requirements: JSON.parse(
          JSON.stringify(safe.matchedRequirements),
        ) as Json,
        partial_requirements: JSON.parse(
          JSON.stringify(safe.partialRequirements),
        ) as Json,
        missing_required_requirements: JSON.parse(
          JSON.stringify(safe.missingRequiredRequirements),
        ) as Json,
        missing_preferred_requirements: JSON.parse(
          JSON.stringify(safe.missingPreferredRequirements),
        ) as Json,
        strengths: safe.strengths,
        concerns: safe.concerns,
        reasoning_summary: safe.reasoningSummary,
        model: snapshot.mode === "semantic" ? SEMANTIC_MODEL : "deterministic",
        prompt_version:
          snapshot.mode === "semantic" ? SEMANTIC_VERSION : FIT_CONFIG.version,
      },
      {
        onConflict:
          "job_id,profile_id,preference_id,model,prompt_version,engine_version,input_hash",
        ignoreDuplicates: true,
      },
    );
    if (error) throw new Error("Could not save assessment.");
  }
  return { load, current, save };
}
export type FitRepository = ReturnType<typeof fitRepository>;
