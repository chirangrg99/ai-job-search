import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { candidateRepository } from "@/server/candidate/repository";
import { jobParserRepository } from "@/server/job-parser/repository";
import { fingerprint } from "@/server/fit/repository";
import { buildRelevantCandidateContext } from "@/features/retrieval";
import {
  contextSchema,
  resumeDraftSchema,
  validationSchema,
  RESUME_VERSION,
  type ResumeContext,
  type ResumeDraft,
  type ResumeValidation,
} from "@/features/resume/schema";
import {
  resumeEnvelopeSchema,
  type SavedResume,
} from "@/features/resume/version";
import {
  type RetrievalResult,
  type RetrievalJob,
} from "@/features/retrieval/model";
import { RESUME_PROMPT_VERSION } from "./ai";
export type ResumeSnapshot = {
  applicationId: string;
  profileId: string;
  jobId: string;
  job: RetrievalJob;
  hash: string;
  context: ResumeContext;
  selection: RetrievalResult;
};
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Json;
export function resumeRepository(
  client: SupabaseClient<Database>,
  userId: string,
  parserModel: string,
) {
  const parser = jobParserRepository(client, userId, parserModel);
  async function owner() {
    const { data, error } = await client
      .from("candidate_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (error || !data) throw new Error("Profile unavailable.");
    return data.id;
  }
  async function application(id: string) {
    const { data, error } = await client
      .from("applications")
      .select("id,profile_id,job_id,status")
      .eq("id", id)
      .eq("profile_id", await owner())
      .maybeSingle();
    if (error) throw new Error("Application unavailable.");
    return data;
  }
  async function list() {
    const { data, error } = await client
      .from("applications")
      .select("id,job_id,status,updated_at,jobs(title,company)")
      .eq("profile_id", await owner())
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Could not load applications.");
    return data ?? [];
  }
  async function load(id: string, asOf: string): Promise<ResumeSnapshot> {
    const app = await application(id);
    if (!app) throw new Error("Application unavailable.");
    const savedJob = await parser.job(app.job_id);
    if (!savedJob || savedJob.profileId !== app.profile_id)
      throw new Error("Job unavailable.");
    const current = await parser.current(
      savedJob.id,
      savedJob.source,
      savedJob.complete,
    );
    if (!current?.parsed_output)
      throw new Error(
        "Parse the current job posting before generating a resume.",
      );
    const profile = await candidateRepository(client, userId).load();
    const job: RetrievalJob = { parsed: current.parsed_output, asOf };
    const { selection, context: rawContext } =
      await buildRelevantCandidateContext(job, profile);
    if (!rawContext.items.length)
      throw new Error(
        "No relevant verified facts were found. Add and verify supporting information in your profile.",
      );
    const context = contextSchema.parse(rawContext);
    const hash = fingerprint({
      job,
      context,
      source: savedJob.source,
      complete: savedJob.complete,
      prompt: RESUME_PROMPT_VERSION,
    });
    return {
      applicationId: id,
      profileId: app.profile_id,
      jobId: app.job_id,
      job,
      context,
      selection,
      hash,
    };
  }
  async function versions(id: string): Promise<SavedResume[]> {
    const app = await application(id);
    if (!app) throw new Error("Application unavailable.");
    const { data, error } = await client
      .from("resume_versions")
      .select(
        "id,created_at,structured_content,validation_result,model,prompt_version",
      )
      .eq("profile_id", app.profile_id)
      .eq("job_id", app.job_id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(50);
    if (error) throw new Error("Could not load resume history.");
    return (data ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      model: row.model,
      promptVersion: row.prompt_version,
      content: resumeEnvelopeSchema.parse(row.structured_content),
      validation: validationSchema.parse(row.validation_result),
    }));
  }
  async function claim(id: string) {
    const { data, error } = await client.rpc("claim_resume_generation", {
      target_application: id,
    });
    if (error) throw new Error("Could not reserve generation.");
    return data;
  }
  async function release(id: string, token: string) {
    // A failed cleanup leaves a short expiring lease, never erases a saved version.
    await client.rpc("release_resume_generation", {
      target_application: id,
      lease_token: token,
    });
  }
  async function save(
    snapshot: ResumeSnapshot,
    draft: ResumeDraft,
    validation: ResumeValidation,
    model: string,
    token: string,
  ) {
    const envelope = resumeEnvelopeSchema.parse({
      version: RESUME_VERSION,
      inputHash: snapshot.hash,
      context: snapshot.context,
      selection: snapshot.selection,
      draft: resumeDraftSchema.parse(draft),
    });
    const { data, error } = await client.rpc("save_resume_generation", {
      target_application: snapshot.applicationId,
      lease_token: token,
      content: json(envelope),
      validation: json(validationSchema.parse(validation)),
      response_model: model,
      prompt: RESUME_PROMPT_VERSION,
    });
    if (error || !data)
      throw new Error("Could not save this version. Reload before retrying.");
    return data;
  }
  return { application, list, load, versions, claim, release, save };
}
