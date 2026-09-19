import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  guard: vi.fn(),
  repo: vi.fn(),
  env: vi.fn(),
  run: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/server/auth/guard", () => ({ requireUser: m.guard }));
vi.mock("@/server/env", () => ({ getServerEnv: m.env }));
vi.mock("@/server/job-parser/repository", () => ({
  jobParserRepository: m.repo,
}));
vi.mock("@/server/job-parser/service", async (original) => ({
  ...(await original<typeof import("./service")>()),
  parseJobDescription: m.run,
}));
vi.mock("next/cache", () => ({ revalidatePath: m.refresh }));
import { parseSavedJob } from "@/app/(workspace)/jobs/[jobId]/actions";
const jobId = "83000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  m.guard.mockResolvedValue({
    client: "client",
    user: { id: "authenticated" },
  });
  m.env.mockReturnValue({});
  m.run.mockResolvedValue({ ok: true, cached: true });
});
it("guards access before repository or environment", async () => {
  m.guard.mockRejectedValue(new Error("login"));
  await expect(parseSavedJob({ jobId })).rejects.toThrow("login");
  expect(m.repo).not.toHaveBeenCalled();
  expect(m.env).not.toHaveBeenCalled();
});
it("uses only authenticated ownership", async () => {
  await parseSavedJob({ jobId });
  expect(m.repo).toHaveBeenCalledWith(
    "client",
    "authenticated",
    expect.any(String),
  );
});
it("rejects extra browser user IDs", async () => {
  expect((await parseSavedJob({ jobId, userId: "forged" })).ok).toBe(false);
  expect(m.repo).not.toHaveBeenCalled();
});
it("sanitizes errors", async () => {
  m.run.mockRejectedValue(new Error("secret"));
  const r = await parseSavedJob({ jobId });
  expect(r.ok).toBe(false);
  expect(JSON.stringify(r)).not.toContain("secret");
  expect(m.refresh).toHaveBeenCalledWith(`/jobs/${jobId}`);
});
