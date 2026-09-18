import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
vi.mock("server-only", () => ({}));
import { discoveryRepository } from "./repository";
import { ManualJobProvider } from "./providers/manual";
function fixture() {
  const q = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "owner" }, error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };
  return {
    q,
    repo: discoveryRepository(
      { from: () => q } as unknown as SupabaseClient<Database>,
      "authenticated-user",
    ),
  };
}
it("intake validates DTOs, derives ownership, and removes arbitrary provider fields", async () => {
  const { q, repo } = fixture();
  const dto = new ManualJobProvider().mapResult({
    title: "Role",
    company: "",
    location: "",
    country: "",
    description: "Known description",
    descriptionComplete: false,
    applicationUrl: "",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    employmentType: null,
    remoteType: null,
  });
  await repo.accept("run", [
    { ...dto, unexpected: "not persisted" } as typeof dto,
    dto,
  ]);
  expect(q.eq).toHaveBeenCalledWith("user_id", "authenticated-user");
  const rows = q.upsert.mock.calls[0]?.[0];
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    profile_id: "owner",
    run_id: "run",
    external_id: dto.externalId,
  });
  expect(rows[0].dto).not.toHaveProperty("unexpected");
});
it("does not persist malformed DTOs", async () => {
  const { q, repo } = fixture();
  await expect(
    repo.accept("run", [{} as ReturnType<ManualJobProvider["mapResult"]>]),
  ).rejects.toThrow();
  expect(q.upsert).not.toHaveBeenCalled();
});
it("requires enabled search ownership before returning criteria", async () => {
  const { q, repo } = fixture();
  q.single
    .mockResolvedValueOnce({ data: { id: "owner" }, error: null })
    .mockResolvedValueOnce({ data: null, error: null });
  await expect(repo.enabledSearch("foreign")).rejects.toThrow(
    "belongs to your profile",
  );
  expect(q.eq).toHaveBeenCalledWith("profile_id", "owner");
  expect(q.eq).toHaveBeenCalledWith("enabled", true);
});
