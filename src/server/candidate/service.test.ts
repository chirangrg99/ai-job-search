import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { saveCandidateEntry, changeCandidateEntry } from "./service";
import type { CandidateRepository } from "./repository";
import { defaultValues } from "@/features/profile/fields";
const repository = () =>
  ({
    load: vi.fn(),
    save: vi.fn(),
    verify: vi.fn(),
    remove: vi.fn(),
  }) satisfies CandidateRepository;
const target = {
  kind: "experience",
  id: "20000000-0000-4000-8000-000000000001",
  revision: 2,
};
it("validates create/update content before repository access", async () => {
  const repo = repository();
  const result = await saveCandidateEntry(repo, { kind: "experience" });
  expect(result.ok).toBe(false);
  expect(repo.save).not.toHaveBeenCalled();
});
it("passes validated content and revision for update", async () => {
  const repo = repository();
  const result = await saveCandidateEntry(
    repo,
    {
      ...defaultValues("experience"),
      kind: "experience",
      company: "Test",
      title: "Test",
      verified: true,
    },
    target,
  );
  expect(result.ok).toBe(true);
  expect(repo.save.mock.calls[0]?.[0]).not.toHaveProperty("verified");
  expect(repo.save).toHaveBeenCalledWith(
    expect.objectContaining({ company: "Test" }),
    target,
  );
});
it("rejects a malicious delete target before repository access", async () => {
  const repo = repository();
  expect(
    (
      await changeCandidateEntry(repo, "delete", {
        ...target,
        profile_id: "someone-else",
      })
    ).ok,
  ).toBe(false);
  expect(repo.remove).not.toHaveBeenCalled();
});
it("routes explicit confirmation and deletion separately", async () => {
  const repo = repository();
  await changeCandidateEntry(repo, "verify", target);
  await changeCandidateEntry(repo, "delete", target);
  expect(repo.verify).toHaveBeenCalledWith(target);
  expect(repo.remove).toHaveBeenCalledWith(target);
});
