import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  guard: vi.fn(),
  repo: vi.fn(),
  prepare: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/server/auth/guard", () => ({ requireUser: m.guard }));
vi.mock("@/server/job-review/repository", () => ({
  jobReviewRepository: m.repo,
}));
vi.mock("next/cache", () => ({ revalidatePath: m.refresh }));
import { prepareApplication } from "@/app/(workspace)/jobs/[jobId]/prepare-actions";
const id = "83000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  m.guard.mockResolvedValue({ client: "client", user: { id: "user" } });
  m.repo.mockReturnValue({ prepare: m.prepare });
});
it("guards before reading input or calling the repository", async () => {
  m.guard.mockRejectedValue(new Error("login"));
  await expect(prepareApplication(id)).rejects.toThrow("login");
  expect(m.repo).not.toHaveBeenCalled();
});
it("accepts only a job ID and uses authenticated ownership", async () => {
  expect(
    await prepareApplication({ jobId: id, userId: "forged" }),
  ).toMatchObject({ ok: false });
  expect(m.repo).not.toHaveBeenCalled();
  expect(await prepareApplication(id)).toEqual({ ok: true });
  expect(m.repo).toHaveBeenCalledWith("client", "user", expect.any(String));
  expect(m.prepare).toHaveBeenCalledWith(id);
  expect(m.refresh).toHaveBeenCalledWith("/");
});
it("sanitizes failures", async () => {
  m.prepare.mockRejectedValue(new Error("secret"));
  expect(JSON.stringify(await prepareApplication(id))).not.toContain("secret");
});
