import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({
  getUser: vi.fn(),
  config: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/server/supabase/config", () => ({ getSupabaseConfig: mock.config }));
vi.mock("@/server/supabase/client", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mock.getUser },
    from: () => ({ upsert: mock.upsert }),
  }),
}));
import { requireUser, ensureCandidateProfile } from "./guard";
beforeEach(() => {
  mock.config.mockReturnValue({});
  mock.getUser.mockReset();
  mock.upsert.mockReset();
});
describe("server auth boundary", () => {
  it("rejects unconfigured auth", async () => {
    mock.config.mockReturnValue(null);
    await expect(requireUser()).rejects.toThrow("redirect:/login");
    expect(mock.getUser).not.toHaveBeenCalled();
  });
  it.each([
    { user: null, error: null },
    { user: { id: "forged" }, error: { message: "invalid" } },
    { user: { id: "anonymous", is_anonymous: true }, error: null },
  ])(
    "rejects unauthenticated or invalid identities",
    async ({ user, error }) => {
      mock.getUser.mockResolvedValue({ data: { user }, error });
      await expect(requireUser()).rejects.toThrow("redirect:/login");
    },
  );
  it("returns the server-verified user", async () => {
    mock.getUser.mockResolvedValue({
      data: { user: { id: "verified-user" } },
      error: null,
    });
    expect((await requireUser()).user.id).toBe("verified-user");
  });
  it("derives profile owner from verified auth rather than input", async () => {
    mock.getUser.mockResolvedValue({
      data: { user: { id: "verified-user" } },
      error: null,
    });
    mock.upsert.mockResolvedValue({ error: null });
    await ensureCandidateProfile();
    expect(mock.upsert).toHaveBeenCalledWith(
      { user_id: "verified-user" },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  });
  it("does not hide profile persistence failures", async () => {
    mock.getUser.mockResolvedValue({
      data: { user: { id: "verified-user" } },
      error: null,
    });
    mock.upsert.mockResolvedValue({ error: { message: "private details" } });
    await expect(ensureCandidateProfile()).rejects.toThrow(
      "Could not initialize your profile",
    );
  });
});
