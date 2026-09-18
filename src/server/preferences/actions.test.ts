import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  repository: vi.fn(),
  save: vi.fn(),
  change: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/server/auth/guard", () => ({ requireUser: mocks.guard }));
vi.mock("@/server/preferences/repository", () => ({
  preferencesRepository: mocks.repository,
}));
vi.mock("@/server/preferences/service", () => ({
  saveSearch: mocks.save,
  changeSearch: mocks.change,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import {
  savePreference,
  changePreference,
} from "@/app/(workspace)/preferences/actions";
beforeEach(() => vi.resetAllMocks());
it("requires auth for every mutation before repository access", async () => {
  mocks.guard.mockRejectedValue(new Error("login"));
  await expect(savePreference({})).rejects.toThrow("login");
  await expect(changePreference({})).rejects.toThrow("login");
  expect(mocks.repository).not.toHaveBeenCalled();
});
it("uses verified identity and revalidates only after success", async () => {
  mocks.guard.mockResolvedValue({ client: "client", user: { id: "verified" } });
  mocks.save.mockResolvedValue({ ok: true });
  await savePreference({ user_id: "forged" });
  expect(mocks.repository).toHaveBeenCalledWith("client", "verified");
  expect(mocks.revalidate).toHaveBeenCalledWith("/preferences");
});
it("sanitizes persistence errors and leaves confirmed UI state intact", async () => {
  mocks.guard.mockResolvedValue({ client: {}, user: { id: "verified" } });
  mocks.change.mockRejectedValue(new Error("database secret"));
  const result = await changePreference({});
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain("database secret");
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
