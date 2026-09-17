import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CandidateProfile, ProfileItem } from "@/features/profile/model";
import type {
  ProfileEntry,
  ProfileTarget,
  ProfileKind,
} from "@/features/profile/schema";
import { displayProfileDate, parseProfileDate } from "@/features/profile/dates";
const tables = {
  personal: "candidate_profiles",
  summary: "candidate_profiles",
  experience: "experiences",
  bullet: "experience_bullets",
  education: "education",
  fact: "candidate_facts",
  credential: "candidate_facts",
  project: "projects",
} as const;
const failure =
  "The item is unavailable or changed in another window. Reload the profile and try again.";
function item(kind: ProfileKind, row: Record<string, unknown>): ProfileItem {
  const values: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "boolean" || typeof value === "string")
      values[key] = value;
    else if (Array.isArray(value))
      values[key] = value.join(key === "achievements" ? "\n" : ", ");
    else if (value === null) values[key] = "";
  }
  for (const key of ["start_date", "end_date", "valid_from", "valid_to"])
    if (key in row)
      values[key] = displayProfileDate(
        row[key] as string | null,
        String(row[`${key}_precision`]),
      );
  if (kind === "personal" || kind === "summary")
    values.source_reference = String(row[`${kind}_source_reference`] ?? "");
  return {
    kind,
    id: String(row.id),
    revision: Number(row.revision),
    verified: Boolean(
      row[
        kind === "personal"
          ? "personal_verified"
          : kind === "summary"
            ? "summary_verified"
            : "verified"
      ],
    ),
    verifiedAt: row[
      kind === "personal"
        ? "personal_verified_at"
        : kind === "summary"
          ? "summary_verified_at"
          : "verified_at"
    ] as string | null,
    values,
  };
}
function dateFields(
  start: string,
  end: string,
  startKey = "start_date",
  endKey = "end_date",
) {
  const a = parseProfileDate(start),
    b = parseProfileDate(end, true);
  return {
    [startKey]: a.date,
    [endKey]: b.date,
    [`${startKey}_precision`]: a.precision,
    [`${endKey}_precision`]: b.precision,
  };
}
export function candidateRepository(
  client: SupabaseClient<Database>,
  userId: string,
) {
  async function profileId() {
    const { data, error } = await client
      .from("candidate_profiles")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (error || !data)
      throw new Error(
        "Your profile could not be loaded. Sign in again or retry.",
      );
    return data.id;
  }
  async function ownedExperience(id: string, profile: string) {
    const { data, error } = await client
      .from("experiences")
      .select("id")
      .eq("id", id)
      .eq("profile_id", profile)
      .single();
    if (error || !data) throw new Error(failure);
  }
  async function load(): Promise<CandidateProfile> {
    const id = await profileId();
    const results = await Promise.all([
      client.from("candidate_profiles").select("*").eq("id", id).single(),
      client
        .from("experiences")
        .select("*")
        .eq("profile_id", id)
        .order("created_at"),
      client
        .from("education")
        .select("*")
        .eq("profile_id", id)
        .order("created_at"),
      client
        .from("candidate_facts")
        .select("*")
        .eq("profile_id", id)
        .order("created_at"),
      client
        .from("projects")
        .select("*")
        .eq("profile_id", id)
        .order("created_at"),
    ]);
    if (results.some((r) => r.error))
      throw new Error("Could not load all profile sections. Please retry.");
    const [p, e, ed, f, pr] = results;
    if (!p.data) throw new Error(failure);
    const exps = e.data ?? [];
    const bullets = exps.length
      ? await client
          .from("experience_bullets")
          .select("*")
          .in(
            "experience_id",
            exps.map((x) => x.id),
          )
          .order("created_at")
      : { data: [], error: null };
    if (bullets.error)
      throw new Error("Could not load experience bullets. Please retry.");
    return {
      items: [
        item("personal", p.data),
        item("summary", p.data),
        ...exps.map((r) => item("experience", r)),
        ...(ed.data ?? []).map((r) => item("education", r)),
        ...(f.data ?? []).map((r) =>
          item(
            r.fact_type === "licence" || r.fact_type === "certification"
              ? "credential"
              : "fact",
            r,
          ),
        ),
        ...(pr.data ?? []).map((r) => item("project", r)),
        ...(bullets.data ?? []).map((r) => item("bullet", r)),
      ],
    };
  }
  async function mutate(
    target: ProfileTarget,
    values: Record<string, unknown> | null,
  ) {
    const profile = await profileId();
    const table = tables[target.kind];
    let result;
    switch (table) {
      case "candidate_profiles": {
        const q = values
          ? client
              .from("candidate_profiles")
              .update(
                values as Database["public"]["Tables"]["candidate_profiles"]["Update"],
              )
          : client.from("candidate_profiles").delete();
        result = await q
          .eq("id", target.id)
          .eq("revision", target.revision)
          .eq("user_id", userId)
          .select("id");
        break;
      }
      case "experiences": {
        const q = values
          ? client
              .from("experiences")
              .update(
                values as Database["public"]["Tables"]["experiences"]["Update"],
              )
          : client.from("experiences").delete();
        result = await q
          .eq("id", target.id)
          .eq("revision", target.revision)
          .eq("profile_id", profile)
          .select("id");
        break;
      }
      case "education": {
        const q = values
          ? client
              .from("education")
              .update(
                values as Database["public"]["Tables"]["education"]["Update"],
              )
          : client.from("education").delete();
        result = await q
          .eq("id", target.id)
          .eq("revision", target.revision)
          .eq("profile_id", profile)
          .select("id");
        break;
      }
      case "candidate_facts": {
        const q = values
          ? client
              .from("candidate_facts")
              .update(
                values as Database["public"]["Tables"]["candidate_facts"]["Update"],
              )
          : client.from("candidate_facts").delete();
        result = await q
          .eq("id", target.id)
          .eq("revision", target.revision)
          .eq("profile_id", profile)
          .select("id");
        break;
      }
      case "projects": {
        const q = values
          ? client
              .from("projects")
              .update(
                values as Database["public"]["Tables"]["projects"]["Update"],
              )
          : client.from("projects").delete();
        result = await q
          .eq("id", target.id)
          .eq("revision", target.revision)
          .eq("profile_id", profile)
          .select("id");
        break;
      }
      case "experience_bullets": {
        const { data, error } = await client
          .from("experiences")
          .select("id")
          .eq("profile_id", profile);
        if (error || !data?.length) throw new Error(failure);
        const q = values
          ? client
              .from("experience_bullets")
              .update(
                values as Database["public"]["Tables"]["experience_bullets"]["Update"],
              )
          : client.from("experience_bullets").delete();
        result = await q
          .eq("id", target.id)
          .eq("revision", target.revision)
          .in(
            "experience_id",
            data.map((x) => x.id),
          )
          .select("id");
        break;
      }
    }
    if (result.error || result.data?.length !== 1) throw new Error(failure);
  }
  async function save(entry: ProfileEntry, target?: ProfileTarget) {
    const profile = await profileId();
    const { kind, ...fields } = entry;
    let values: Record<string, unknown> = { ...fields };
    if (entry.kind === "personal" || entry.kind === "summary") {
      delete values.source_reference;
      values[`${kind}_source_reference`] = entry.source_reference;
      if (!target || target.id !== profile) throw new Error(failure);
    } else if (entry.kind === "experience" || entry.kind === "education")
      values = { ...fields, ...dateFields(entry.start_date, entry.end_date) };
    else if (entry.kind === "credential")
      values = {
        ...fields,
        ...dateFields(
          entry.valid_from,
          entry.valid_to,
          "valid_from",
          "valid_to",
        ),
      };
    else if (entry.kind === "project")
      values = {
        ...fields,
        achievements: entry.achievements
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
      };
    if (entry.kind === "bullet")
      await ownedExperience(entry.experience_id, profile);
    if (target) {
      if (target.kind !== kind) throw new Error(failure);
      await mutate(target, values);
      return;
    }
    let result;
    switch (entry.kind) {
      case "experience":
        result = await client.from("experiences").insert({
          ...values,
          profile_id: profile,
          company: entry.company,
          title: entry.title,
        });
        break;
      case "education":
        result = await client.from("education").insert({
          ...values,
          profile_id: profile,
          institution: entry.institution,
        });
        break;
      case "fact":
      case "credential":
        result = await client.from("candidate_facts").insert({
          ...values,
          profile_id: profile,
          fact_type: entry.fact_type,
        });
        break;
      case "project":
        result = await client
          .from("projects")
          .insert({ ...values, profile_id: profile, name: entry.name });
        break;
      case "bullet":
        result = await client.from("experience_bullets").insert({
          ...values,
          experience_id: entry.experience_id,
          original_text: entry.original_text,
        });
        break;
      default:
        throw new Error(failure);
    }
    if (result.error)
      throw new Error("The entry could not be saved. Please retry.");
  }
  async function verify(target: ProfileTarget) {
    const profile = await load();
    const current = profile.items.find(
      (i) => i.id === target.id && i.kind === target.kind,
    );
    if (!current || current.revision !== target.revision)
      throw new Error(failure);
    if (
      (target.kind === "personal" && !current.values.full_name) ||
      (target.kind === "summary" && !current.values.professional_summary)
    )
      throw new Error("Add information before verifying this section.");
    await mutate(target, {
      [target.kind === "personal"
        ? "personal_verified"
        : target.kind === "summary"
          ? "summary_verified"
          : "verified"]: true,
    });
  }
  async function remove(target: ProfileTarget) {
    if (target.kind === "personal" || target.kind === "summary")
      throw new Error("Edit this section instead of deleting your profile.");
    await mutate(target, null);
  }
  return { load, save, verify, remove };
}
export type CandidateRepository = ReturnType<typeof candidateRepository>;
