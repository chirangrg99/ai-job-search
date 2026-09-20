// @vitest-environment node
import { beforeAll, afterAll, beforeEach, afterEach, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import {
  frontendDescription,
  frontendParsedJob,
} from "../../../tests/fixtures/job-descriptions";
const db = new PGlite();
const user = "81000000-0000-4000-8000-000000000001",
  profile = "82000000-0000-4000-8000-000000000001",
  job = "83000000-0000-4000-8000-000000000001";
beforeAll(async () => {
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`,
  );
  for (const f of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
}, 30000);
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec(
    `begin;insert into auth.users values('${user}'),('81000000-0000-4000-8000-000000000002');insert into public.candidate_profiles(id,user_id) values('${profile}','${user}'),('82000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000002');`,
  );
  await db.query(
    `insert into public.jobs(id,owner_profile_id,provider,title,description,normalized_data) values($1,$2,'manual','Example',$3,'{"raw":{"descriptionComplete":true}}')`,
    [job, profile, frontendDescription],
  );
  await db.exec(
    `set local role authenticated;select set_config('request.jwt.claim.sub','${user}',true)`,
  );
});
afterEach(() => db.exec("rollback"));
async function claim(
  retry = false,
  hash = "a".repeat(64),
  description = frontendDescription,
) {
  return (
    await db.query<{
      r: { state: string; id: string; token: string; output: unknown };
    }>(
      `select public.claim_job_parse($1,$2,$3,true,'test-model','v1','1',$4) r`,
      [job, hash, description, retry],
    )
  ).rows[0]!.r;
}
async function finish(id: string, output: unknown = frontendParsedJob()) {
  return db.query(
    `update public.job_description_parses set status='completed',parsed_output=$2,analyzed_at=now(),response_model='test-model' where id=$1`,
    [id, JSON.stringify(output)],
  );
}
it("claims once and serves the completed cache", async () => {
  const a = await claim();
  expect(a.state).toBe("claimed");
  expect((await claim()).state).toBe("busy");
  await finish(a.id);
  const c = await claim();
  expect(c.state).toBe("cached");
  expect(c.output).toEqual(frontendParsedJob());
});
it("failed/expired requests require explicit bounded retry", async () => {
  const a = await claim();
  await db.query(
    `update public.job_description_parses set status='failed',retry_after=now()-interval '1 second' where id=$1`,
    [a.id],
  );
  expect((await claim()).state).toBe("retry_required");
  expect((await claim(true)).state).toBe("claimed");
  await db.query(
    `update public.job_description_parses set status='failed',attempts=3,retry_after=now()-interval '1 second' where id=$1`,
    [a.id],
  );
  expect((await claim(true)).state).toBe("retry_required");
});
it("does not replace an unexpired lease even on explicit retry", async () => {
  await claim();
  expect((await claim(true)).state).toBe("busy");
});
it("expired lease rotates its token", async () => {
  const a = await claim();
  await db.query(
    `update public.job_description_parses set lease_expires_at=now()-interval '1 second' where id=$1`,
    [a.id],
  );
  expect((await claim()).state).toBe("retry_required");
  const b = await claim(true);
  expect(b.state).toBe("claimed");
  expect(b.token).not.toBe(a.token);
});
it("changed description hash gets an independent cache record", async () => {
  const a = await claim();
  const b = await claim(false, "b".repeat(64));
  expect(b.id).not.toBe(a.id);
});
it("rejects stale source before claiming", async () => {
  await expect(claim(false, "a".repeat(64), "Changed source")).rejects.toThrow(
    "Job changed",
  );
});
it.each([
  {},
  { bad: true },
  { ...frontendParsedJob(), title: { text: "Invented", evidence: "Invented" } },
  {
    ...frontendParsedJob(),
    skills: [{ text: "React", evidence: "React", priority: "false" }],
  },
  {
    ...frontendParsedJob(),
    salary: {
      minimum: 90000,
      maximum: null,
      currency: "CAD",
      period: "year",
      evidence: "Salary: CAD 50,000 to 70,000 per year.",
    },
  },
])("database rejects malformed or ungrounded output %#", async (output) => {
  const a = await claim();
  await expect(finish(a.id, output)).rejects.toThrow(/check constraint/);
});
it("denies another owner access and claim", async () => {
  await claim();
  await db.exec(
    `select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000002',true)`,
  );
  expect(
    (await db.query("select * from public.job_description_parses")).rows,
  ).toHaveLength(0);
  await expect(claim()).rejects.toThrow("Job not found");
});
it("denies anonymous claims", async () => {
  await db.exec("set local role anon");
  await expect(claim()).rejects.toThrow(/permission denied/);
});

it("source snapshot includes all job fields and pasted full text", async () => {
  await db.query(
    "update public.jobs set company='Example Corp',salary_min=50000,posting_text='Full posting: Rust required.',posting_text_origin='pasted' where id=$1",
    [job],
  );
  const result = await db.query<{ source: string }>(
    "select public.job_parse_source($1) source",
    [job],
  );
  const source = result.rows[0]!.source;
  expect(source).toContain("Example Corp");
  expect(source).toContain("50000");
  expect(source).toContain("Rust required");
  expect(source).toContain(frontendDescription.split("\n")[0]);
  const claim = await db.query<{ r: { state: string } }>(
    "select public.claim_job_parse($1,$2,$3,true,'model','v5','2') r",
    [job, "c".repeat(64), source],
  );
  expect(claim.rows[0]!.r.state).toBe("claimed");
  await db.query(
    "update public.jobs set company='Changed company' where id=$1",
    [job],
  );
  await expect(
    db.query("select public.claim_job_parse($1,$2,$3,true,'model','v5','2')", [
      job,
      "c".repeat(64),
      source,
    ]),
  ).rejects.toThrow("Job changed");
});
it("source RPC does not disclose another user's posting", async () => {
  await db.exec(
    "select set_config('request.jwt.claim.sub','81000000-0000-4000-8000-000000000002',true)",
  );
  await expect(
    db.query("select public.job_parse_source($1)", [job]),
  ).rejects.toThrow("Job not found");
});

it("renders imported JSON as literal text usable by both evidence validators", async () => {
  const description =
    'Required skills:\nUse "Python" and C:\\tools.\nFrench: expérience requise.';
  await db.query("update public.jobs set posting_text=$2 where id=$1", [
    job,
    JSON.stringify({ "@type": "JobPosting", description }),
  ]);
  const source = (
    await db.query<{ s: string }>("select public.job_parse_source($1) s", [job])
  ).rows[0]!.s;
  expect(source).toContain(description);
  expect(source).not.toContain("\\nUse");
  const output = {
    ...frontendParsedJob(),
    title: null,
    company: null,
    location: null,
    salary: null,
    employmentType: null,
    responsibilities: [],
    requiredQualifications: [],
    preferredQualifications: [],
    skills: [
      {
        text: 'Use "Python" and C:\\tools.',
        evidence: description,
        priority: "required",
      },
    ],
    technologies: [],
    educationRequirements: [],
    experienceRequirements: [],
    scheduleRequirements: [],
    workAuthorizationWording: null,
  };
  const { validateParsedJob } = await import("@/features/job-parser/schema");
  expect(() => validateParsedJob(output, source)).not.toThrow();
  const result = await db.query<{ valid: boolean }>(
    "select private.valid_job_parse($1,$2) valid",
    [JSON.stringify(output), source],
  );
  expect(result.rows[0]!.valid).toBe(true);
});
it("readable snapshot retains metadata and original conflicting titles", async () => {
  await db.query(
    "update public.jobs set title='Provider title', posting_text=$2 where id=$1",
    [
      job,
      JSON.stringify({
        title: "Original title",
        description: "A complete role description.",
      }),
    ],
  );
  const source = (
    await db.query<{ s: string }>("select public.job_parse_source($1) s", [job])
  ).rows[0]!.s;
  expect(source).toContain("provider_metadata.title:\nProvider title");
  expect(source).toContain("original_posting_text.title:\nOriginal title");
});
