// @vitest-environment node
import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { normalizeJob } from "./normalize";
import type { DiscoveredJob } from "@/features/discovery/schema";
const db = new PGlite();
const user = "61000000-0000-4000-8000-000000000001",
  profile = "62000000-0000-4000-8000-000000000001",
  other = "62000000-0000-4000-8000-000000000002";
const base: DiscoveredJob = {
  provider: "adzuna",
  externalId: "123",
  title: "Developer",
  company: "Company Inc.",
  location: "Toronto",
  country: "CA",
  description:
    "Build accessible interfaces and maintain reliable delivery systems for customers in a collaborative engineering team.",
  descriptionComplete: true,
  applicationUrl: "https://example.com/jobs/123",
  salaryMin: 50000,
  salaryMax: 70000,
  salaryCurrency: "CAD",
  salaryPeriod: "year",
  salaryEstimated: false,
  employmentType: "full_time",
  remoteType: null,
  postedAt: null,
};
beforeAll(async () => {
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth,public to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;`,
  );
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
}, 30000);
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec(
    `begin; insert into auth.users values('${user}'),('61000000-0000-4000-8000-000000000002'); insert into public.candidate_profiles(id,user_id) values('${profile}','${user}'),('${other}','61000000-0000-4000-8000-000000000002'); set local role authenticated; select set_config('request.jwt.claim.sub','${user}',true);`,
  );
});
afterEach(() => db.exec("rollback"));
async function intake(
  change: Partial<DiscoveredJob> = {},
  date = "2026-09-01T00:00:00Z",
) {
  const dto = { ...base, ...change },
    source = randomUUID(),
    run = randomUUID(),
    id = randomUUID();
  await db.query(
    `insert into public.job_sources(id,profile_id,provider,display_name) values($1,$2,$3,'test') on conflict(profile_id,provider) do nothing`,
    [source, profile, dto.provider],
  );
  await db.query(
    `insert into public.job_sync_runs(id,profile_id,source_id,provider,status) select $1,$2,id,$3,'completed' from public.job_sources where profile_id=$2 and provider=$3`,
    [run, profile, dto.provider],
  );
  await db.query(
    `insert into public.job_discoveries(id,profile_id,run_id,provider,external_id,dto,received_at) values($1,$2,$3,$4,$5,$6,$7)`,
    [id, profile, run, dto.provider, dto.externalId, JSON.stringify(dto), date],
  );
  const process = async () =>
    (
      await db.query<{ result: { jobId: string; state: string } }>(
        "select public.normalize_discovery($1,$2) as result",
        [id, JSON.stringify(normalizeJob(dto))],
      )
    ).rows[0]!.result;
  return { id, dto, process };
}
async function count() {
  return (
    await db.query<{ n: number }>("select count(*)::int n from public.jobs")
  ).rows[0]!.n;
}
it("repeated syncs reuse one job and record explicit exact duplicates", async () => {
  const a = await (await intake()).process();
  const b = await (await intake()).process();
  expect(a.state).toBe("new");
  expect(b).toEqual({ jobId: a.jobId, state: "exact_duplicate" });
  expect(await count()).toBe(1);
});
it("updates salary and description while preserving first discovered and original source", async () => {
  const a = await (await intake()).process();
  const b = await (
    await intake(
      { salaryMin: 60000, description: base.description + " New benefits." },
      "2026-09-10T00:00:00Z",
    )
  ).process();
  expect(b).toEqual({ jobId: a.jobId, state: "updated_existing" });
  const row = (
    await db.query<{
      salary_min: string;
      discovered_at: Date;
      source_metadata: { first_original: DiscoveredJob };
    }>("select * from public.jobs")
  ).rows[0]!;
  expect(Number(row.salary_min)).toBe(60000);
  expect(new Date(row.discovered_at).toISOString()).toBe(
    "2026-09-01T00:00:00.000Z",
  );
  expect(row.source_metadata.first_original.description).toBe(base.description);
});
it("processing a discovery is idempotent", async () => {
  const item = await intake();
  expect(await item.process()).toEqual(await item.process());
  expect(await count()).toBe(1);
});
it("older observations do not overwrite newer mutable values", async () => {
  await (await intake({ salaryMin: 60000 }, "2026-09-10T00:00:00Z")).process();
  expect(
    (await (await intake({}, "2026-09-01T00:00:00Z")).process()).state,
  ).toBe("exact_duplicate");
  expect(
    Number(
      (
        await db.query<{ salary_min: string }>(
          "select salary_min from public.jobs",
        )
      ).rows[0]!.salary_min,
    ),
  ).toBe(60000);
});
it("different reliable IDs are distinct reposts even with identical URL/content", async () => {
  const a = await (await intake()).process();
  const b = await (await intake({ externalId: "456" })).process();
  expect(b.state).toBe("likely_duplicate");
  expect(b.jobId).not.toBe(a.jobId);
  expect(await count()).toBe(2);
  expect((await (await intake({ externalId: "456" })).process()).jobId).toBe(
    b.jobId,
  );
});
it("same company/title at a different location stays separate", async () => {
  await (await intake()).process();
  const b = await (
    await intake({
      externalId: "456",
      location: "Ottawa",
      applicationUrl: "https://example.com/jobs/456",
    })
  ).process();
  expect(b.state).toBe("new");
  expect(await count()).toBe(2);
});
it("similar jobs are retained as likely duplicates rather than merged", async () => {
  await (await intake()).process();
  const b = await (
    await intake({
      externalId: "456",
      applicationUrl: null,
      description:
        "Different team, different responsibilities and different requirements.",
    })
  ).process();
  expect(b.state).toBe("likely_duplicate");
  expect(await count()).toBe(2);
});
it("tracking variants of a posting URL merge for manual imports", async () => {
  const a = await (
    await intake({ provider: "manual", externalId: "a" })
  ).process();
  const b = await (
    await intake({
      provider: "manual",
      externalId: "b",
      applicationUrl: base.applicationUrl + "?utm_source=email",
    })
  ).process();
  expect(b.jobId).toBe(a.jobId);
  expect(b.state).toBe("exact_duplicate");
});
it("complete stable content merges without URLs or reliable IDs", async () => {
  const a = await (
    await intake({ provider: "manual", externalId: "a", applicationUrl: null })
  ).process();
  const b = await (
    await intake({
      provider: "manual",
      externalId: "b",
      applicationUrl: null,
      company: "COMPANY INC",
    })
  ).process();
  expect(b.jobId).toBe(a.jobId);
  expect(b.state).toBe("exact_duplicate");
});
it("matching snippets without stable identity never silently merge", async () => {
  await (
    await intake({
      provider: "manual",
      externalId: "a",
      applicationUrl: null,
      descriptionComplete: false,
    })
  ).process();
  expect(
    (
      await (
        await intake({
          provider: "manual",
          externalId: "b",
          applicationUrl: null,
          descriptionComplete: false,
        })
      ).process()
    ).state,
  ).toBe("likely_duplicate");
  expect(await count()).toBe(2);
});
it("multiple canonical matches are ambiguous and stay separate", async () => {
  await (await intake()).process();
  await (await intake({ externalId: "456" })).process();
  expect(
    (await (await intake({ provider: "manual", externalId: "a" })).process())
      .state,
  ).toBe("likely_duplicate");
  expect(await count()).toBe(3);
});
it("cross-provider matches do not overwrite original source values", async () => {
  const a = await (await intake()).process();
  const b = await (
    await intake({ provider: "manual", externalId: "a", salaryMin: 65000 })
  ).process();
  expect(b.jobId).toBe(a.jobId);
  expect(
    Number(
      (
        await db.query<{ salary_min: string }>(
          "select salary_min from public.jobs",
        )
      ).rows[0]!.salary_min,
    ),
  ).toBe(50000);
});
it("isolates another candidate and denies foreign normalization", async () => {
  const item = await intake();
  await item.process();
  await db.exec(
    `select set_config('request.jwt.claim.sub','61000000-0000-4000-8000-000000000002',true)`,
  );
  expect(await count()).toBe(0);
  await expect(item.process()).rejects.toThrow("Discovery not found");
});
it("denies mismatched normalization payload", async () => {
  const item = await intake();
  await expect(
    db.query("select public.normalize_discovery($1,$2)", [
      item.id,
      JSON.stringify(normalizeJob({ ...item.dto, title: "Tampered" })),
    ]),
  ).rejects.toThrow("Invalid normalization");
});
it("denies anonymous normalization", async () => {
  const item = await intake();
  await db.exec("set local role anon");
  await expect(item.process()).rejects.toThrow(/permission denied/);
});
