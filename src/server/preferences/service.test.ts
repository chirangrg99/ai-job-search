import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { saveSearch, changeSearch } from "./service";
import { emptyPreference } from "@/features/preferences/schema";
const repo = () => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  duplicate: vi.fn(),
});
const target = {
  id: "52000000-0000-4000-8000-000000000001",
  updated_at: "2026-09-17T12:00:00+00:00",
};
it("validates before writing and strips owner/id injection", async () => {
  const r = repo();
  expect((await saveSearch(r, { ...emptyPreference })).ok).toBe(false);
  expect(r.create).not.toHaveBeenCalled();
  await saveSearch(r, {
    ...emptyPreference,
    name: "Good",
    profile_id: "foreign",
    id: "foreign",
  });
  expect(r.create).toHaveBeenCalledWith({ ...emptyPreference, name: "Good" });
});
it("updates using the exact concurrency target", async () => {
  const r = repo();
  await saveSearch(r, { ...emptyPreference, name: "Changed" }, target);
  expect(r.update).toHaveBeenCalledWith(
    target,
    expect.objectContaining({ name: "Changed" }),
  );
});
it.each(["delete", "duplicate"] as const)("routes %s", async (operation) => {
  const r = repo();
  await changeSearch(r, { operation, target });
  expect(operation === "delete" ? r.remove : r.duplicate).toHaveBeenCalledWith(
    target,
  );
});
it("sets explicit enable state, rather than toggling untrusted state", async () => {
  const r = repo();
  await changeSearch(r, { operation: "set_enabled", target, enabled: false });
  expect(r.update).toHaveBeenCalledWith(target, { enabled: false });
});
it.each([
  { operation: "delete", target: { ...target, profile_id: "foreign" } },
  { operation: "unknown", target },
  { operation: "set_enabled", target, enabled: "yes" },
  { operation: "delete", target: { ...target, id: "bad" } },
])("rejects malformed mutation %o", async (input) => {
  const r = repo();
  expect((await changeSearch(r, input)).ok).toBe(false);
  expect(r.remove).not.toHaveBeenCalled();
  expect(r.update).not.toHaveBeenCalled();
});
