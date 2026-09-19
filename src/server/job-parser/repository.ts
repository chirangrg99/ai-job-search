import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { z } from "zod";
import {
  validateParsedJob,
  type ParsedJob,
} from "@/features/job-parser/schema";
import { descriptionHash } from "./identity";
import { PARSER_PROMPT_VERSION, PARSER_SCHEMA_VERSION } from "./prompt";
const claimSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("claimed"), id: z.uuid(), token: z.uuid() }),
  z.object({ state: z.literal("cached"), id: z.uuid(), output: z.unknown() }),
  z.object({ state: z.literal("busy") }),
  z.object({ state: z.literal("retry_required") }),
]);
export function jobParserRepository(
  client: SupabaseClient<Database>,
  userId: string,
  model: string,
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
  async function job(id: string) {
    const { data, error } = await client
      .from("jobs")
      .select(
        "id,owner_profile_id,title,company,location,description,application_url,normalized_data,posting_text,posting_text_origin",
      )
      .eq("id", id)
      .eq("owner_profile_id", await owner())
      .maybeSingle();
    if (error) throw new Error("Could not load the job.");
    if (!data) return null;
    const metadata = z
      .object({ raw: z.object({ descriptionComplete: z.boolean() }) })
      .safeParse(data.normalized_data);
    const snapshot = await client.rpc("job_parse_source", { target_job: id });
    if (snapshot.error || !snapshot.data)
      throw new Error("Could not load posting source.");
    return {
      source: snapshot.data,
      postingText: data.posting_text,
      postingOrigin: data.posting_text_origin,
      id: data.id,
      profileId: data.owner_profile_id!,
      title: data.title,
      company: data.company,
      location: data.location,
      description: data.description,
      applicationUrl: data.application_url,
      complete: metadata.success
        ? metadata.data.raw.descriptionComplete
        : false,
    };
  }
  async function current(id: string, description: string, complete: boolean) {
    const { data, error } = await client
      .from("job_description_parses")
      .select(
        "status,parsed_output,analyzed_at,model,response_model,prompt_version,attempts,error_code,lease_expires_at,retry_after",
      )
      .eq("profile_id", await owner())
      .eq("job_id", id)
      .eq("description_hash", descriptionHash(description, complete))
      .eq("model", model)
      .eq("prompt_version", PARSER_PROMPT_VERSION)
      .eq("schema_version", PARSER_SCHEMA_VERSION)
      .maybeSingle();
    if (error) throw new Error("Could not load parsed requirements.");
    if (!data) return null;
    return {
      ...data,
      parsed_output:
        data.status === "completed"
          ? validateParsedJob(data.parsed_output, description)
          : null,
    };
  }
  async function claim(
    jobId: string,
    description: string,
    complete: boolean,
    retry: boolean,
  ) {
    const { data, error } = await client.rpc("claim_job_parse", {
      target_job: jobId,
      source_hash: descriptionHash(description, complete),
      expected_description: description,
      expected_complete: complete,
      requested_model: model,
      requested_prompt: PARSER_PROMPT_VERSION,
      requested_schema: PARSER_SCHEMA_VERSION,
      retry,
    });
    if (error)
      throw new Error(
        "Could not reserve parsing. Reload to check whether the source changed.",
      );
    return claimSchema.parse(data);
  }
  async function complete(
    id: string,
    token: string,
    output: ParsedJob,
    source: string,
    responseModel: string,
  ) {
    // Revalidate at the persistence boundary even if a caller bypasses the service.
    const validated = validateParsedJob(output, source);
    const { data, error } = await client
      .from("job_description_parses")
      .update({
        status: "completed",
        parsed_output: validated,
        response_model: responseModel,
        analyzed_at: new Date().toISOString(),
        error_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("profile_id", await owner())
      .eq("lease_token", token)
      .eq("status", "processing")
      .select("id")
      .maybeSingle();
    if (error || !data)
      throw new Error(
        "Could not save the validated extraction. Reload before retrying.",
      );
  }
  async function fail(id: string, token: string, code: string) {
    const { error } = await client
      .from("job_description_parses")
      .update({
        status: "failed",
        error_code: code,
        retry_after: new Date(Date.now() + 30000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("profile_id", await owner())
      .eq("lease_token", token)
      .eq("status", "processing");
    if (error) throw new Error("Could not record parser failure.");
  }
  async function savePosting(
    id: string,
    text: string,
    origin: "pasted" | "public_page",
  ) {
    const { data, error } = await client
      .from("jobs")
      .update({
        posting_text: text,
        posting_text_origin: origin,
        posting_text_saved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("owner_profile_id", await owner())
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error("Could not save posting text.");
  }
  return { job, current, claim, complete, fail, savePosting };
}
export type JobParserRepository = ReturnType<typeof jobParserRepository>;
