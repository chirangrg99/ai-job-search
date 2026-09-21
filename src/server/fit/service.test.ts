import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { assessFit } from "./service";
import { fingerprint, stableStringify, type FitSnapshot } from "./repository";
import { strongInput, asOf } from "../../../tests/fixtures/fit";
const jobId = "83000000-0000-4000-8000-000000000001";
function fixture() {
  const snapshot: FitSnapshot = {
    profileId: "owner",
    jobId,
    hash: "a".repeat(64),
    sourceHash: "b".repeat(64),
    input: strongInput(),
    mode: "rules",
  };
  return {
    snapshot,
    repo: {
      load: vi.fn().mockResolvedValue(snapshot),
      current: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    },
  };
}
it("reuses the stored result with no AI call or write", async () => {
  const { repo } = fixture(),
    ai = { compare: vi.fn() };
  repo.current.mockResolvedValue({ result: {} });
  expect(await assessFit(repo, ai, { jobId }, asOf)).toEqual({
    ok: true,
    cached: true,
  });
  expect(ai.compare).not.toHaveBeenCalled();
  expect(repo.save).not.toHaveBeenCalled();
});
it("persists a deterministic result and snapshot", async () => {
  const { repo } = fixture();
  expect(await assessFit(repo, null, { jobId }, asOf)).toEqual({
    ok: true,
    cached: false,
  });
  expect(repo.save).toHaveBeenCalledWith(
    expect.objectContaining({ profileId: "owner" }),
    expect.objectContaining({ fitScore: 100 }),
    null,
  );
});
it("refuses to save if source information changes during scoring", async () => {
  const { repo, snapshot } = fixture();
  repo.load
    .mockResolvedValueOnce(snapshot)
    .mockResolvedValueOnce({ ...snapshot, hash: "changed" });
  expect((await assessFit(repo, null, { jobId }, asOf)).ok).toBe(false);
  expect(repo.save).not.toHaveBeenCalled();
});
it("browser cannot provide a profile, score or source evidence", async () => {
  const { repo } = fixture();
  await expect(
    assessFit(repo, null, { jobId, profileId: "forged", fitScore: 100 }, asOf),
  ).rejects.toThrow();
  expect(repo.load).not.toHaveBeenCalled();
});
it("unavailable or foreign inputs cannot cause writes", async () => {
  const { repo } = fixture();
  repo.load.mockRejectedValue(new Error("Job unavailable"));
  await expect(assessFit(repo, null, { jobId }, asOf)).rejects.toThrow();
  expect(repo.save).not.toHaveBeenCalled();
});
it("hashes are key-order stable and include evidence revisions and dates", () => {
  expect(stableStringify({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  expect(fingerprint({ b: 2, a: 1 })).toBe(fingerprint({ a: 1, b: 2 }));
  const i = strongInput();
  const before = fingerprint(i);
  i.candidates[0]!.revision = "2";
  expect(fingerprint(i)).not.toBe(before);
  const revised = fingerprint(i);
  i.asOf = "2026-09-22";
  expect(fingerprint(i)).not.toBe(revised);
});
