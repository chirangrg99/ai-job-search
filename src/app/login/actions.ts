"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/server/supabase/client";
import { getSupabaseConfig } from "@/server/supabase/config";
import { getServerEnv } from "@/server/env";
import { ensureCandidateProfile } from "@/server/auth/guard";
import { authInputSchema, type AuthState } from "@/features/auth/schema";

export async function authenticate(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const result = authInputSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    intent: formData.get("intent"),
  });
  if (!result.success) {
    const fields: AuthState["fields"] = {};
    for (const issue of result.error.issues) {
      if (issue.path[0] === "email" || issue.path[0] === "password")
        fields[issue.path[0]] = issue.message;
    }
    return { error: "Check the highlighted fields.", fields };
  }
  if (!getSupabaseConfig())
    return {
      error: "Sign-in is not configured yet. Contact the workspace owner.",
    };
  const { email, password, intent } = result.data;
  let signedIn = false;
  try {
    const client = await createSupabaseServerClient();
    if (intent === "signup") {
      const { APP_URL } = getServerEnv();
      if (!APP_URL)
        return {
          error:
            "Account creation is not configured yet. Contact the workspace owner.",
        };
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: new URL("/auth/callback", APP_URL).href },
      });
      if (error)
        return {
          error: "Unable to create an account. Please try again later.",
        };
      signedIn = !!data.session;
      if (!signedIn)
        return {
          message:
            "Check your email for a confirmation link. If an account already exists, sign in instead.",
        };
    } else {
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error)
        return {
          error:
            "Unable to sign in. Check your email and password, and confirm your email if needed.",
        };
      signedIn = true;
    }
  } catch {
    return {
      error: "Authentication is temporarily unavailable. Please try again.",
    };
  }
  if (signedIn) {
    try {
      await ensureCandidateProfile();
    } catch {
      return {
        error:
          "Signed in, but your profile could not be initialized. Please try signing in again.",
      };
    }
  }
  redirect("/");
}

export async function signOut(): Promise<void> {
  if (!getSupabaseConfig()) redirect("/login");
  const client = await createSupabaseServerClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) redirect("/login?error=signout");
  redirect("/login");
}
