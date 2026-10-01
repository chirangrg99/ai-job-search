import { beforeEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  guard: vi.fn(),
  repo: vi.fn(),
  generate: vi.fn(),
  env: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/server/auth/guard", () => ({ requireUser: m.guard }));
vi.mock("@/server/resume/repository", () => ({ resumeRepository: m.repo }));
vi.mock("@/server/resume/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./service")>()),
  generateTailoredResume: m.generate,
}));
vi.mock("@/server/env", () => ({ getServerEnv: m.env }));
vi.mock("@/server/resume/ai", () => ({ OpenAIResumeClient: class {} }));
vi.mock("next/cache", () => ({ revalidatePath: m.refresh }));
vi.mock("server-only", () => ({}));
import { generateResumeAction } from "@/app/(workspace)/applications/[applicationId]/actions";
const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  m.guard.mockResolvedValue({ client: "client", user: { id: "owner" } });
  m.env.mockReturnValue({});
  m.repo.mockReturnValue("repo");
  m.generate.mockResolvedValue({ id: "version", passed: false });
});
it("requires server authentication before reading input", async () => {
  m.guard.mockRejectedValue(new Error("login"));
  await expect(
    generateResumeAction({ applicationId: id, consent: true }),
  ).rejects.toThrow("login");
  expect(m.repo).not.toHaveBeenCalled();
});
it("rejects client supplied ownership and missing consent", async () => {
  expect(
    (
      await generateResumeAction({
        applicationId: id,
        consent: true,
        profileId: "foreign",
      })
    ).ok,
  ).toBe(false);
  expect((await generateResumeAction({ applicationId: id })).ok).toBe(false);
  expect(m.repo).not.toHaveBeenCalled();
});
it("derives ownership from user and never advances readiness", async () => {
  expect(
    await generateResumeAction({ applicationId: id, consent: true }),
  ).toEqual({ ok: true, id: "version", passed: false });
  expect(m.repo).toHaveBeenCalledWith("client", "owner", expect.any(String));
  expect(m.generate).toHaveBeenCalledWith("repo", null, {
    applicationId: id,
    consent: true,
  });
});
it("sanitizes failures", async () => {
  m.generate.mockRejectedValue(new Error("secret-debug"));
  expect(
    JSON.stringify(
      await generateResumeAction({ applicationId: id, consent: true }),
    ),
  ).not.toContain("secret-debug");
});
