// @vitest-environment node
import { it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { generateTailoredResume, type ResumeRepository } from "./service";
import { resumeFixture, approvedReview } from "../../../tests/fixtures/resume";
const id = "00000000-0000-4000-8000-000000000001";
async function setup() {
  const f = await resumeFixture();
  const snapshot = {
    ...f,
    applicationId: id,
    profileId: id,
    jobId: id,
    hash: "a".repeat(64),
  };
  const repo = {
    load: vi.fn().mockResolvedValue(snapshot),
    claim: vi.fn().mockResolvedValue("token"),
    release: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue("version"),
  } satisfies ResumeRepository;
  const ai = {
    generate: vi
      .fn()
      .mockResolvedValue({ output: f.draft, model: "fixture-model" }),
    review: vi.fn().mockResolvedValue(approvedReview(f.draft)),
  };
  return { ...f, snapshot, repo, ai };
}
it("generates from compact context, reviews, appends and releases", async () => {
  const { repo, ai, context, job } = await setup();
  expect(
    await generateTailoredResume(repo, ai, {
      applicationId: id,
      consent: true,
    }),
  ).toMatchObject({ passed: true, id: "version" });
  expect(ai.generate).toHaveBeenCalledWith(job.parsed, context);
  expect(repo.save).toHaveBeenCalledOnce();
  expect(repo.release).toHaveBeenCalledOnce();
});
it("saves failed validation as blocked and skips unnecessary AI review", async () => {
  const { repo, ai, draft } = await setup();
  draft.skills[0]!.text = "Kubernetes";
  expect(
    (
      await generateTailoredResume(repo, ai, {
        applicationId: id,
        consent: true,
      })
    ).passed,
  ).toBe(false);
  expect(ai.review).not.toHaveBeenCalled();
  expect(repo.save.mock.calls[0]?.[2].passed).toBe(false);
});
it("malformed generation cannot enter version history", async () => {
  const { repo, ai } = await setup();
  ai.generate.mockResolvedValue({
    output: { headline: "forged" } as never,
    model: "fixture",
  });
  await expect(
    generateTailoredResume(repo, ai, { applicationId: id, consent: true }),
  ).rejects.toThrow();
  expect(repo.save).not.toHaveBeenCalled();
  expect(repo.release).toHaveBeenCalledOnce();
});
it("review outage persists a blocked draft", async () => {
  const { repo, ai } = await setup();
  ai.review.mockRejectedValue(new Error("secret request"));
  expect(
    (
      await generateTailoredResume(repo, ai, {
        applicationId: id,
        consent: true,
      })
    ).passed,
  ).toBe(false);
  expect(JSON.stringify(repo.save.mock.calls)).not.toContain("secret request");
});
it("stale inputs cannot save a current version", async () => {
  const { repo, ai, snapshot } = await setup();
  repo.load
    .mockResolvedValueOnce(snapshot)
    .mockResolvedValueOnce({ ...snapshot, hash: "changed" });
  await expect(
    generateTailoredResume(repo, ai, { applicationId: id, consent: true }),
  ).rejects.toThrow("changed");
  expect(repo.save).not.toHaveBeenCalled();
  expect(repo.release).toHaveBeenCalledOnce();
});
it("busy lease and missing config avoid billed requests", async () => {
  const { repo, ai } = await setup();
  repo.claim.mockResolvedValue(null);
  await expect(
    generateTailoredResume(repo, ai, { applicationId: id, consent: true }),
  ).rejects.toThrow("already running");
  expect(ai.generate).not.toHaveBeenCalled();
  await expect(
    generateTailoredResume(repo, null, { applicationId: id, consent: true }),
  ).rejects.toThrow("Configure");
});
it("requires consent and rejects supplied ownership", async () => {
  const { repo, ai } = await setup();
  for (const raw of [
    { applicationId: id, consent: false },
    { applicationId: id, consent: true, profileId: id },
  ])
    await expect(generateTailoredResume(repo, ai, raw)).rejects.toThrow();
  expect(repo.load).not.toHaveBeenCalled();
});
it("unauthorized load cannot invoke AI", async () => {
  const { repo, ai } = await setup();
  repo.load.mockRejectedValue(new Error("Application unavailable"));
  await expect(
    generateTailoredResume(repo, ai, { applicationId: id, consent: true }),
  ).rejects.toThrow();
  expect(ai.generate).not.toHaveBeenCalled();
  expect(repo.claim).not.toHaveBeenCalled();
});
