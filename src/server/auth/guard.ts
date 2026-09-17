import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/server/supabase/client";
import { getSupabaseConfig } from "@/server/supabase/config";

/** Call at every protected data entry point, including future server actions. */
export async function requireUser() {
  if (!getSupabaseConfig()) redirect("/login");
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) redirect("/login");
  return { user: data.user, client };
}

/** No browser-supplied owner identifier is accepted. RLS remains the final boundary. */
export async function ensureCandidateProfile() {
  const { user, client } = await requireUser();
  const { error } = await client
    .from("candidate_profiles")
    .upsert(
      { user_id: user.id },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (error)
    throw new Error(
      "Could not initialize your profile. Please try signing in again.",
    );
}
