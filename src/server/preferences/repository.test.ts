import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { emptyPreference } from "@/features/preferences/schema";
vi.mock("server-only", () => ({}));
import { preferencesRepository } from "./repository";
const target = { id: "saved-search", updated_at: "2026-09-17T12:00:00Z" };
function fixture() {
  const q = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "owner" }, error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve),
  };
  const client = { from: vi.fn().mockReturnValue(q) };
  return {
    q,
    repo: preferencesRepository(
      client as unknown as SupabaseClient<Database>,
      "authenticated",
    ),
  };
}
it("derives create ownership from server identity", async () => {
  const { repo, q } = fixture();
  await repo.create({ ...emptyPreference, name: "New" });
  expect(q.eq).toHaveBeenCalledWith("user_id", "authenticated");
  expect(q.insert).toHaveBeenCalledWith(
    expect.objectContaining({ profile_id: "owner" }),
  );
});
it.each(["update", "remove"] as const)(
  "scopes %s by owner/id/timestamp and rejects zero rows",
  async (method) => {
    const { repo, q } = fixture();
    await expect(
      method === "update"
        ? repo.update(target, { enabled: false })
        : repo.remove(target),
    ).rejects.toThrow("unavailable or has changed");
    expect(q.eq).toHaveBeenCalledWith("profile_id", "owner");
    expect(q.eq).toHaveBeenCalledWith("id", target.id);
    expect(q.eq).toHaveBeenCalledWith("updated_at", target.updated_at);
  },
);
it("copies only allowed preferences and creates a paused independent row", async () => {
  const { repo, q } = fixture();
  q.single
    .mockResolvedValueOnce({ data: { id: "owner" }, error: null })
    .mockResolvedValueOnce({
      data: {
        ...emptyPreference,
        name: "Original",
        id: "old",
        profile_id: "owner",
        metadata: { secret: "not copied" },
      },
      error: null,
    });
  await repo.duplicate(target);
  expect(q.insert).toHaveBeenCalledWith({
    ...emptyPreference,
    name: "Original (copy)",
    enabled: false,
    profile_id: "owner",
  });
});
it("rejects a foreign copy source", async () => {
  const { repo, q } = fixture();
  q.single
    .mockResolvedValueOnce({ data: { id: "owner" }, error: null })
    .mockResolvedValueOnce({ data: null, error: null });
  await expect(repo.duplicate(target)).rejects.toThrow("unavailable");
  expect(q.insert).not.toHaveBeenCalled();
});
