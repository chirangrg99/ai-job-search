import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabaseConfig } from "./config";

export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let authenticated = false;
  const config = getSupabaseConfig();
  if (config) {
    const client = createServerClient<Database>(
      config.url,
      config.publishableKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (values) => {
            for (const { name, value } of values)
              request.cookies.set(name, value);
            response = NextResponse.next({ request });
            for (const { name, value, options } of values)
              response.cookies.set(name, value, options);
          },
        },
      },
    );
    // Validates identity and refreshes cookies. Layout/data guards independently authenticate.
    const { data, error } = await client.auth.getUser();
    authenticated = !error && !!data.user && !data.user.is_anonymous;
  }
  const publicRoute =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/auth/callback";
  if (!authenticated && !publicRoute) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    destination.search = "";
    const redirect = NextResponse.redirect(destination);
    for (const cookie of response.cookies.getAll())
      redirect.cookies.set(cookie);
    response = redirect;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
