import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseJobDescription } from "./service";
import { descriptionHash } from "./identity";
import { AIError, type AIClient } from "@/server/ai/client";
import type { JobParserRepository } from "./repository";
import {
  emptyParsedJob,
  frontendDescription,
  frontendParsedJob,
} from "../../../tests/fixtures/job-descriptions";
const id = "83000000-0000-4000-8000-000000000001";
const repo = {
  job: vi.fn(),
  current: vi.fn(),
  claim: vi.fn(),
  complete: vi.fn(),
  fail: vi.fn(),
} satisfies JobParserRepository;
const ai = { parseJobDescription: vi.fn() } satisfies AIClient;
beforeEach(() => {
  vi.resetAllMocks();
  repo.job.mockResolvedValue({
    id,
    description: frontendDescription,
    complete: true,
  });
  repo.current.mockResolvedValue(null);
  repo.claim.mockResolvedValue({ state: "claimed", id, token: id });
  ai.parseJobDescription.mockResolvedValue({
    output: frontendParsedJob(),
    model: "actual-model",
  });
});
it("validates input before querying and rejects browser ownership", async () => {
  expect(
    (
      await parseJobDescription(repo, ai, "model", {
        jobId: id,
        userId: "forged",
      })
    ).ok,
  ).toBe(false);
  expect(repo.job).not.toHaveBeenCalled();
});
it("requires an owned job before AI or cache access", async () => {
  repo.job.mockResolvedValue(null);
  expect((await parseJobDescription(repo, ai, "model", { jobId: id })).ok).toBe(
    false,
  );
  expect(repo.current).not.toHaveBeenCalled();
  expect(ai.parseJobDescription).not.toHaveBeenCalled();
});
it("rejects oversized sources without truncation", async () => {
  repo.job.mockResolvedValue({
    id,
    description: "x".repeat(30001),
    complete: true,
  });
  expect((await parseJobDescription(repo, ai, "model", { jobId: id })).ok).toBe(
    false,
  );
  expect(repo.claim).not.toHaveBeenCalled();
});
it("serves validated cache even without configured credentials", async () => {
  repo.current.mockResolvedValue({
    status: "completed",
    parsed_output: frontendParsedJob(),
  });
  expect(await parseJobDescription(repo, null, "model", { jobId: id })).toEqual(
    { ok: true, cached: true },
  );
  expect(repo.claim).not.toHaveBeenCalled();
});
it("missing credentials do not reserve or bill a request", async () => {
  expect(
    (await parseJobDescription(repo, null, "model", { jobId: id })).ok,
  ).toBe(false);
  expect(repo.claim).not.toHaveBeenCalled();
});
it.each(["busy", "retry_required"])(
  "does not call AI for %s",
  async (state) => {
    repo.claim.mockResolvedValue({ state });
    expect(
      (await parseJobDescription(repo, ai, "model", { jobId: id })).ok,
    ).toBe(false);
    expect(ai.parseJobDescription).not.toHaveBeenCalled();
  },
);
it("handles a completed cache race", async () => {
  repo.claim.mockResolvedValue({
    state: "cached",
    id,
    output: frontendParsedJob(),
  });
  expect(await parseJobDescription(repo, ai, "model", { jobId: id })).toEqual({
    ok: true,
    cached: true,
  });
  expect(ai.parseJobDescription).not.toHaveBeenCalled();
});
it("sends only description and stores validated output with actual model", async () => {
  expect(
    await parseJobDescription(repo, ai, "model", { jobId: id, retry: true }),
  ).toEqual({ ok: true, cached: false });
  expect(ai.parseJobDescription).toHaveBeenCalledWith(
    frontendDescription,
    "model",
  );
  expect(repo.claim).toHaveBeenCalledWith(id, frontendDescription, true, true);
  expect(repo.complete).toHaveBeenCalledWith(
    id,
    id,
    frontendParsedJob(),
    frontendDescription,
    "actual-model",
  );
});
it.each([
  {},
  { ...frontendParsedJob(), title: { text: "Invented", evidence: "Invented" } },
])("never saves malformed or invented output", async (output) => {
  ai.parseJobDescription.mockResolvedValue({ output, model: "model" });
  expect((await parseJobDescription(repo, ai, "model", { jobId: id })).ok).toBe(
    false,
  );
  expect(repo.complete).not.toHaveBeenCalled();
  expect(repo.fail).toHaveBeenCalledWith(id, id, "invalid_output");
});
it("records refusal without retrying", async () => {
  ai.parseJobDescription.mockRejectedValue(new AIError("refused"));
  expect((await parseJobDescription(repo, ai, "model", { jobId: id })).ok).toBe(
    false,
  );
  expect(ai.parseJobDescription).toHaveBeenCalledTimes(1);
  expect(repo.fail).toHaveBeenCalledWith(id, id, "refused");
});
it("sanitizes persistence errors even when failure recording also fails", async () => {
  repo.complete.mockRejectedValue(new Error("private-secret"));
  repo.fail.mockRejectedValue(new Error("private-secret"));
  const result = await parseJobDescription(repo, ai, "model", { jobId: id });
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain("private-secret");
});
it("hashes exact source and completeness deterministically", () => {
  expect(descriptionHash("Job", true)).toBe(descriptionHash("Job", true));
  for (const [text, complete] of [
    ["job", true],
    ["Job ", true],
    ["Job", false],
  ] as const)
    expect(descriptionHash(text, complete)).not.toBe(
      descriptionHash("Job", true),
    );
});

it("does not persist a quoted section heading as a job title", async () => {
  const source = "Role Function and Purpose";
  repo.job.mockResolvedValue({ id, description: source, complete: false });
  ai.parseJobDescription.mockResolvedValue({
    output: {
      ...emptyParsedJob(),
      title: { text: source, evidence: source },
    },
    model: "model",
  });
  const result = await parseJobDescription(repo, ai, "model", { jobId: id });
  expect(result.ok).toBe(false);
  expect(repo.complete).not.toHaveBeenCalled();
  expect(repo.fail).toHaveBeenCalledWith(id, id, "invalid_output");
});
