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
vi.mock("@/server/fit/repository", () => ({ fitRepository: m.repo }));
vi.mock("@/server/env", () => ({ getServerEnv: m.env }));
vi.mock("@/server/fit/service", async (original) => ({
  ...(await original<typeof import("./service")>()),
  assessFit: m.run,
}));
vi.mock("next/cache", () => ({ revalidatePath: m.refresh }));
import { assessSavedJob } from "@/app/(workspace)/jobs/[jobId]/fit-actions";
const jobId = "83000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  m.guard.mockResolvedValue({
    client: "client",
    user: { id: "authenticated" },
  });
  m.env.mockReturnValue({});
  m.run.mockResolvedValue({ ok: true, cached: false });
});
it("guards access before data or configuration", async () => {
  m.guard.mockRejectedValue(new Error("login"));
  await expect(assessSavedJob({ jobId })).rejects.toThrow("login");
  expect(m.repo).not.toHaveBeenCalled();
});
it("uses authenticated ownership only", async () => {
  await assessSavedJob({ jobId });
  expect(m.repo).toHaveBeenCalledWith(
    "client",
    "authenticated",
    expect.any(String),
  );
  expect(m.refresh).toHaveBeenCalledWith(`/jobs/${jobId}`);
});
it("rejects forged ownership and score", async () => {
  expect(
    (await assessSavedJob({ jobId, userId: "forged", fitScore: 100 })).ok,
  ).toBe(false);
  expect(m.repo).not.toHaveBeenCalled();
});
it("sanitizes errors", async () => {
  m.run.mockRejectedValue(new Error("secret"));
  const result = await assessSavedJob({ jobId });
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain("secret");
});
