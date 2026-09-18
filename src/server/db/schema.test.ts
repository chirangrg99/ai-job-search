// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, test } from "vitest";

test("migrations apply from empty PostgreSQL and enforce ownership and constraints", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated, service_role;
      grant execute on function auth.uid() to anon, authenticated, service_role;`);
    for (const name of readdirSync("supabase/migrations")
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await db.exec(readFileSync(`supabase/migrations/${name}`, "utf8"));
    }
    await db.exec(readFileSync("supabase/tests/ownership.sql", "utf8"));
    await db.exec(
      readFileSync("supabase/tests/profile_verification.sql", "utf8"),
    );
    await db.exec(readFileSync("supabase/tests/saved_searches.sql", "utf8"));
    const result = await db.query<{ count: number }>(
      "select count(*)::int as count from public.candidate_profiles",
    );
    expect(result.rows[0]?.count).toBe(0);
  } finally {
    await db.close();
  }
}, 30000);
