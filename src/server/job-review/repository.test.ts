import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ profile: vi.fn(), searches: vi.fn() }));
vi.mock("@/server/candidate/repository", () => ({
  candidateRepository: () => ({ load: m.profile }),
}));
vi.mock("@/server/preferences/repository", () => ({
  preferencesRepository: () => ({ list: m.searches }),
}));
import { allRows, jobReviewRepository } from "./repository";
import { assessmentHash, fingerprint } from "@/server/fit/repository";
import { descriptionHash } from "@/server/job-parser/identity";
import {
  PARSER_PROMPT_VERSION,
  PARSER_SCHEMA_VERSION,
} from "@/server/job-parser/prompt";
import { FIT_CONFIG } from "@/features/fit/model";
import { matchJobToProfile } from "@/features/fit/engine";
import { strongInput, strongProfile } from "../../../tests/fixtures/fit";
const source =
  "React and TypeScript\n2+ years experience as a Frontend Developer\nBSc Computer Science\nPreferred: React";
const now = "2026-09-21T12:00:00Z";
type Row = Record<string, unknown>;
let rows: Record<string, Row[]>,
  calls: { table: string; key: string; value: unknown }[],
  currentSource: string;
function client() {
  return {
    from: (table: string) => {
      const filters: [string, unknown][] = [];
      let patch: Row | undefined;
      const result = () => {
        const data = (rows[table] ?? []).filter((r) =>
          filters.every(([k, v]) => r[k] === v),
        );
        if (patch) data.forEach((r) => Object.assign(r, patch));
        return { data, error: null };
      };
      const q = {
        select: () => q,
        eq: (key: string, value: unknown) => {
          filters.push([key, value]);
          calls.push({ table, key, value });
          return q;
        },
        order: () => q,
        range: async (a: number, b: number) => ({
          ...result(),
          data: result().data.slice(a, b + 1),
        }),
        single: async () => ({
          data: result().data[0] ?? null,
          error: result().data.length ? null : { message: "missing" },
        }),
        maybeSingle: async () => ({
          data: result().data[0] ?? null,
          error: null,
        }),
        upsert: (data: Row, options: { ignoreDuplicates: boolean }) => {
          expect(options.ignoreDuplicates).toBe(true);
          rows[table] ??= [];
          if (
            !rows[table].some(
              (r) =>
                r.profile_id === data.profile_id && r.job_id === data.job_id,
            )
          )
            rows[table].push(data);
          return Promise.resolve({ error: null });
        },
        update: (data: Row) => {
          patch = data;
          return q;
        },
        then: (resolve: (r: ReturnType<typeof result>) => unknown) =>
          Promise.resolve(result()).then(resolve),
      };
      return q;
    },
    rpc: vi.fn(async () => ({ data: currentSource, error: null })),
  } as unknown as SupabaseClient<Database>;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(now));
  calls = [];
  currentSource = source;
  m.profile.mockResolvedValue(structuredClone(strongProfile));
  m.searches.mockResolvedValue([]);
  const input = { ...strongInput(), sourceConflicts: [] };
  rows = {
    candidate_profiles: [{ id: "owner", user_id: "user" }],
    jobs: [
      {
        id: "job",
        owner_profile_id: "owner",
        title: "Frontend",
        company: "Acme",
        location: null,
        remote_type: null,
        employment_type: null,
        provider: "manual",
        salary_min: null,
        salary_max: null,
        salary_currency: null,
        posted_at: null,
        discovered_at: now,
        normalized_data: { raw: { descriptionComplete: true } },
        likely_duplicate_of: null,
      },
    ],
    job_analysis: [
      {
        id: "analysis",
        profile_id: "owner",
        job_id: "job",
        preference_id: null,
        result: matchJobToProfile(input),
        input_hash: assessmentHash(
          input,
          fingerprint(source),
          "parser",
          PARSER_PROMPT_VERSION,
          "rules",
        ),
        engine_version: FIT_CONFIG.version,
        model: "deterministic",
        analyzed_at: now,
      },
    ],
    job_description_parses: [
      {
        id: "parse",
        job_id: "job",
        profile_id: "owner",
        description_hash: descriptionHash(source, true),
        parsed_output: input.parsed,
        prompt_version: PARSER_PROMPT_VERSION,
        schema_version: PARSER_SCHEMA_VERSION,
        model: "parser",
        status: "completed",
      },
    ],
    applications: [],
    job_discoveries: [],
    job_sync_runs: [],
    job_sources: [],
  };
});
afterEach(() => vi.useRealTimers());
it("reads all database pages and rejects partial results on errors", async () => {
  const read = vi.fn(async (a: number, b: number) => ({
    data: Array.from({ length: 450 }, (_, i) => i).slice(a, b + 1),
    error: null,
  }));
  expect(await allRows(read)).toHaveLength(450);
  expect(read).toHaveBeenCalledTimes(3);
  await expect(
    allRows(async () => ({ data: null, error: new Error("failure") })),
  ).rejects.toThrow("Could not load");
});
it("loads only authenticated ownership and current exact assessments", async () => {
  const data = await jobReviewRepository(client(), "user", "parser").load();
  expect(data.jobs[0]?.fit.state).toBe("current");
  expect(calls).toContainEqual({
    table: "candidate_profiles",
    key: "user_id",
    value: "user",
  });
  for (const table of [
    "job_analysis",
    "job_description_parses",
    "applications",
    "job_discoveries",
    "job_sync_runs",
    "job_sources",
  ])
    expect(calls).toContainEqual({ table, key: "profile_id", value: "owner" });
  expect(calls).toContainEqual({
    table: "jobs",
    key: "owner_profile_id",
    value: "owner",
  });
});
it.each(["profile", "source", "day", "engine", "malformed"])(
  "marks %s changes stale instead of showing old strong score",
  async (kind) => {
    if (kind === "profile") m.profile.mockResolvedValue({ items: [] });
    if (kind === "source") currentSource += "\nNew required licence.";
    if (kind === "day") vi.setSystemTime(new Date("2026-09-22T12:00:00Z"));
    if (kind === "engine") rows.job_analysis![0]!.engine_version = "old";
    if (kind === "malformed") rows.job_analysis![0]!.result = { fitScore: 100 };
    const data = await jobReviewRepository(client(), "user", "parser").load();
    expect(data.jobs[0]?.fit).toEqual({ state: "stale" });
  },
);
it("uses actual discovery memberships, deduplicates links, and does not borrow another search score", async () => {
  rows.job_sync_runs = [
    {
      id: "run",
      profile_id: "owner",
      preference_id: "search",
      started_at: now,
    },
  ];
  rows.job_discoveries = [
    {
      id: "d1",
      profile_id: "owner",
      job_id: "job",
      run_id: "run",
      status: "processed",
    },
    {
      id: "d2",
      profile_id: "owner",
      job_id: "job",
      run_id: "run",
      status: "processed",
    },
  ];
  const data = await jobReviewRepository(client(), "user", "parser").load(
    "search",
  );
  expect(data.jobs[0]?.searchIds).toEqual(["search"]);
  expect(data.jobs[0]?.fit.state).toBe("unassessed");
});
it("prepares once without resetting an applied application", async () => {
  const repo = jobReviewRepository(client(), "user", "parser");
  await repo.prepare("job");
  await repo.prepare("job");
  expect(rows.applications).toHaveLength(1);
  expect(rows.applications![0]!.status).toBe("preparing");
  rows.applications![0]!.status = "applied";
  await repo.prepare("job");
  expect(rows.applications![0]!.status).toBe("applied");
});
it("promotes interested only and rejects foreign job IDs", async () => {
  rows.applications = [
    { job_id: "job", profile_id: "owner", status: "interested" },
  ];
  const repo = jobReviewRepository(client(), "user", "parser");
  await repo.prepare("job");
  expect(rows.applications[0]!.status).toBe("preparing");
  await expect(repo.prepare("foreign")).rejects.toThrow("Job unavailable");
  expect(rows.applications).toHaveLength(1);
});
it("fails closed without an owned profile", async () => {
  await expect(
    jobReviewRepository(client(), "someone-else", "parser").load(),
  ).rejects.toThrow("profile");
  expect(calls.some((c) => c.table === "jobs")).toBe(false);
});
