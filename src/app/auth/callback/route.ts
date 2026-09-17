import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/server/supabase/client";
import { getSupabaseConfig } from "@/server/supabase/config";
import { ensureCandidateProfile } from "@/server/auth/guard";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  let path = "/login?error=confirmation";
  if (code && getSupabaseConfig()) {
    try {
      const client = await createSupabaseServerClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) {
        await ensureCandidateProfile();
        path = "/";
      }
    } catch {
      /* Never reflect provider errors, codes or tokens into a response. */
    }
  }
  const response = NextResponse.redirect(new URL(path, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
