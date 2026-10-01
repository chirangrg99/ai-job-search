// @vitest-environment node
import { it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { OpenAIResumeClient } from "./ai";
import { resumeFixture, approvedReview } from "../../../tests/fixtures/resume";
function response(output: unknown, overrides: Record<string, unknown> = {}) {
  return {
    id: "resp_fixture",
    object: "response",
    created_at: 1,
    status: "completed",
    model: "fixture",
    output: [
      {
        id: "msg_fixture",
        type: "message",
        role: "assistant",
        status: "completed",
        content: [
          {
            type: "output_text",
            text: JSON.stringify(output),
            annotations: [],
          },
        ],
      },
    ],
    ...overrides,
  };
}
it("strict generation transmits only selected context; review excludes job requirements", async () => {
  const { draft, job, context } = await resumeFixture();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(response(draft)))
    .mockResolvedValueOnce(Response.json(response(approvedReview(draft))));
  const ai = new OpenAIResumeClient("fake-test-key", "fixture", fetcher);
  expect((await ai.generate(job.parsed, context)).output).toEqual(draft);
  await ai.review(draft, context);
  const bodies = fetcher.mock.calls.map((c) => JSON.parse(String(c[1]?.body)));
  expect(bodies[0]).toMatchObject({
    store: false,
    model: "fixture",
    text: { format: { strict: true, name: "tailored_resume" } },
  });
  expect(JSON.parse(bodies[0].input[0].content)).toEqual({
    job: job.parsed,
    context: {
      ...context,
      items: context.items.map((s) => ({
        ...s,
        sourceId: `${s.kind}:${s.id}`,
      })),
    },
  });
  const reviewInput = JSON.parse(bodies[1].input[0].content);
  expect(Object.keys(reviewInput)).toEqual(["claims"]);
  expect(JSON.stringify(bodies)).not.toContain("Example Logistics");
  expect(
    bodies[0].text.format.schema.properties.headline.properties.sources.items
      .properties.sourceId.enum,
  ).toEqual(context.items.map((s) => `${s.kind}:${s.id}`));
  expect(bodies[0].tools).toBeUndefined();
});
it.each([401, 429, 500])(
  "sanitizes HTTP %s without automatic paid retries",
  async (status) => {
    const { job, context } = await resumeFixture();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("secret-debug", { status }));
    await expect(
      new OpenAIResumeClient("fake-test-key", "fixture", fetcher).generate(
        job.parsed,
        context,
      ),
    ).rejects.toThrow("Resume AI request did not complete");
    expect(fetcher).toHaveBeenCalledOnce();
  },
);
it.each(["refusal", "incomplete", "malformed"])(
  "rejects %s responses",
  async (mode) => {
    const { draft, job, context } = await resumeFixture();
    const body =
      mode === "refusal"
        ? response(draft, {
            output: [
              {
                id: "m",
                type: "message",
                role: "assistant",
                status: "completed",
                content: [{ type: "refusal", refusal: "No" }],
              },
            ],
          })
        : mode === "incomplete"
          ? response(draft, { status: "incomplete" })
          : response({ invalid: true });
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(body));
    await expect(
      new OpenAIResumeClient("fake-test-key", "fixture", fetcher).generate(
        job.parsed,
        context,
      ),
    ).rejects.toThrow();
  },
);
