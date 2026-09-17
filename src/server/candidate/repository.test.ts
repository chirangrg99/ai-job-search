import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { entrySchema } from "@/features/profile/schema";
import { defaultValues } from "@/features/profile/fields";
vi.mock("server-only", () => ({}));
import { candidateRepository } from "./repository";

function fixture(result: unknown = { data: [], error: null }) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi
      .fn()
      .mockResolvedValue({ data: { id: "owned-profile" }, error: null }),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  const client = { from: vi.fn().mockReturnValue(query) };
  return {
    query,
    client,
    repo: candidateRepository(
      client as unknown as SupabaseClient<Database>,
      "authenticated-user",
    ),
  };
}
it("derives insert ownership from the authenticated user and converts partial dates", async () => {
  const { repo, query } = fixture();
  await repo.save(
    entrySchema.parse({
      ...defaultValues("experience"),
      kind: "experience",
      company: "Example",
      title: "Developer",
      start_date: "2020",
      end_date: "2021-02",
      profile_id: "attacker",
    }),
  );
  expect(query.eq).toHaveBeenCalledWith("user_id", "authenticated-user");
  expect(query.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      profile_id: "owned-profile",
      start_date: "2020-01-01",
      start_date_precision: "year",
      end_date: "2021-02-28",
      end_date_precision: "month",
    }),
  );
  expect(query.insert.mock.calls[0]?.[0]).not.toHaveProperty("kind");
});
it("scopes deletions to ownership and revision and rejects missing or stale rows", async () => {
  const { repo, query } = fixture();
  await expect(
    repo.remove({ kind: "fact", id: "other-item", revision: 4 }),
  ).rejects.toThrow("unavailable or changed");
  expect(query.eq).toHaveBeenCalledWith("profile_id", "owned-profile");
  expect(query.eq).toHaveBeenCalledWith("revision", 4);
  expect(query.eq).toHaveBeenCalledWith("id", "other-item");
});
it("refuses to attach a bullet to an unavailable or foreign experience", async () => {
  const { repo, query } = fixture();
  query.single
    .mockResolvedValueOnce({ data: { id: "owned-profile" }, error: null })
    .mockResolvedValueOnce({ data: null, error: null });
  await expect(
    repo.save(
      entrySchema.parse({
        ...defaultValues("bullet"),
        kind: "bullet",
        experience_id: "40000000-0000-4000-8000-000000000001",
        original_text: "Candidate-provided statement",
      }),
    ),
  ).rejects.toThrow("unavailable or changed");
  expect(query.eq).toHaveBeenCalledWith("profile_id", "owned-profile");
  expect(query.insert).not.toHaveBeenCalled();
});
