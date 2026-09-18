import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  guard: vi.fn(),
  repo: vi.fn(),
  provider: vi.fn(),
  sync: vi.fn(),
  manual: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/server/auth/guard", () => ({ requireUser: m.guard }));
vi.mock("@/server/discovery/repository", () => ({
  discoveryRepository: m.repo,
}));
vi.mock("@/server/discovery/factory", () => ({
  createAdzunaProvider: m.provider,
}));
vi.mock("@/server/discovery/service", () => ({
  syncSearch: m.sync,
  importManualJob: m.manual,
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
import { syncJobs, addManualJob } from "@/app/(workspace)/jobs/actions";
beforeEach(() => vi.resetAllMocks());
it("guards sync and manual import before accessing any data", async () => {
  m.guard.mockRejectedValue(new Error("login"));
  await expect(syncJobs({})).rejects.toThrow("login");
  await expect(addManualJob({})).rejects.toThrow("login");
  expect(m.repo).not.toHaveBeenCalled();
  expect(m.provider).not.toHaveBeenCalled();
});
it("derives ownership from server identity", async () => {
  m.guard.mockResolvedValue({ client: "client", user: { id: "verified" } });
  m.sync.mockResolvedValue({ ok: true, message: "Saved" });
  await syncJobs({ user_id: "forged" });
  expect(m.repo).toHaveBeenCalledWith("client", "verified");
  expect(m.revalidate).toHaveBeenCalledWith("/jobs");
});
it("sanitizes unexpected errors and refreshes partial results", async () => {
  m.guard.mockResolvedValue({ client: {}, user: { id: "verified" } });
  m.sync.mockRejectedValue(new Error("secret-url-app-key"));
  const result = await syncJobs({});
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain("secret-url-app-key");
  expect(m.revalidate).toHaveBeenCalledWith("/jobs");
});
