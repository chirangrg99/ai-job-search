// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
const m = vi.hoisted(() => ({
  job: vi.fn(),
  current: vi.fn(),
  profile: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/job-parser/repository", () => ({
  jobParserRepository: () => ({ job: m.job, current: m.current }),
}));
vi.mock("@/server/candidate/repository", () => ({
  candidateRepository: () => ({ load: m.profile }),
}));
import { resumeRepository } from "./repository";
import { mixedProfile, developerJob } from "../../../tests/fixtures/retrieval";
import { resumeFixture, approvedReview } from "../../../tests/fixtures/resume";
import { validateGeneratedApplication } from "@/features/resume/validate";
function fixture() {
  const q = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: { id: "profile" }, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        id: "app",
        profile_id: "profile",
        job_id: "job",
        status: "preparing",
      },
      error: null,
    }),
  };
  const client = {
    from: vi.fn().mockReturnValue(q),
    rpc: vi.fn().mockResolvedValue({ data: "version", error: null }),
  };
  return {
    q,
    client,
    repo: resumeRepository(
      client as unknown as SupabaseClient<Database>,
      "authenticated-user",
      "parser",
    ),
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  m.job.mockResolvedValue({
    id: "job",
    profileId: "profile",
    source: "fixture posting",
    complete: true,
  });
  m.current.mockResolvedValue({ parsed_output: developerJob().parsed });
  m.profile.mockResolvedValue(mixedProfile());
});
it("loads owned current job and compact verified context", async () => {
  const { repo, q } = fixture();
  const s = await repo.load("app", "2026-09-29");
  expect(q.eq).toHaveBeenCalledWith("user_id", "authenticated-user");
  expect(q.eq).toHaveBeenCalledWith("profile_id", "profile");
  expect(s.context.items.every((i) => i.verified)).toBe(true);
  expect(JSON.stringify(s.context)).not.toContain("Example Logistics");
  expect(s.hash).toHaveLength(64);
});
it("cannot load a foreign application or mismatched job owner", async () => {
  const { repo, q } = fixture();
  q.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
  await expect(repo.load("foreign", "2026-09-29")).rejects.toThrow(
    "unavailable",
  );
  expect(m.job).not.toHaveBeenCalled();
  m.job.mockResolvedValue({ profileId: "foreign" });
  await expect(repo.load("app", "2026-09-29")).rejects.toThrow("unavailable");
});
it("requires a current validated parse", async () => {
  const { repo } = fixture();
  m.current.mockResolvedValue(null);
  await expect(repo.load("app", "2026-09-29")).rejects.toThrow(
    "Parse the current",
  );
  expect(m.profile).not.toHaveBeenCalled();
});
it("hash detects changed verified source content", async () => {
  const { repo } = fixture();
  const a = await repo.load("app", "2026-09-29");
  const profile = mixedProfile();
  profile.items.find((i) => i.id === "react-bullet")!.values.original_text =
    "Delivered React interfaces.";
  m.profile.mockResolvedValue(profile);
  const b = await repo.load("app", "2026-09-29");
  expect(a.hash).not.toBe(b.hash);
});
it("history reads are scoped to owned profile and job", async () => {
  const { repo, q } = fixture();
  expect(await repo.versions("app")).toEqual([]);
  expect(q.eq).toHaveBeenCalledWith("job_id", "job");
  expect(q.eq).toHaveBeenCalledWith("profile_id", "profile");
});
it("saves new history through the lease RPC without updating applications to ready", async () => {
  const { repo, client } = fixture();
  const f = await resumeFixture(),
    snapshot = await repo.load("app", "2026-09-29");
  await repo.save(
    snapshot,
    f.draft,
    validateGeneratedApplication(f.draft, f.context, approvedReview(f.draft)),
    "fixture-model",
    "lease",
  );
  expect(client.rpc).toHaveBeenCalledWith(
    "save_resume_generation",
    expect.objectContaining({
      target_application: "app",
      lease_token: "lease",
      prompt: "tailored-resume-v2",
    }),
  );
  expect(JSON.stringify(client.rpc.mock.calls)).not.toContain("ready_to_apply");
});
