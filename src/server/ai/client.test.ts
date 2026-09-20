// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { OpenAIClient } from "./client";
import { sourcePassages } from "@/server/job-parser/references";
import {
  frontendParsedJob,
  frontendDescription,
} from "../../../tests/fixtures/job-descriptions";
function referenceFixture() {
  const original = frontendParsedJob();
  const passages = sourcePassages(frontendDescription);
  const ref = (text: string) => passages.find((p) => p.text.includes(text))!.id;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(original)) {
    if (Array.isArray(value))
      output[key] = value.map((v) =>
        key === "ambiguities"
          ? ref(v.text)
          : {
              sourceId: ref(v.text),
              priority: "priority" in v ? v.priority : "unspecified",
            },
      );
    else if (value === null) output[key] = null;
    else if (key === "salary")
      output[key] = { ...value, sourceId: ref(value.evidence) };
    else
      output[key] = {
        text: "text" in value ? value.text : "",
        sourceId: ref("text" in value ? value.text : ""),
      };
  }
  if (output.salary && typeof output.salary === "object")
    delete (output.salary as Record<string, unknown>).evidence;
  return output;
}
function response(overrides: Record<string, unknown> = {}) {
  return {
    id: "resp_test",
    object: "response",
    created_at: 1,
    status: "completed",
    model: "test-model",
    output: [
      {
        id: "msg_test",
        type: "message",
        role: "assistant",
        status: "completed",
        content: [
          {
            type: "output_text",
            text: JSON.stringify(referenceFixture()),
            annotations: [],
          },
        ],
      },
    ],
    ...overrides,
  };
}
it("requests strict structured output, bounds spending and sends only source text", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(response()));
  const result = await new OpenAIClient(
    "fake-test-key",
    fetcher,
  ).parseJobDescription(frontendDescription, "test-model");
  expect(result.output).toMatchObject({ title: frontendParsedJob().title });
  const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
  expect(body).toMatchObject({
    model: "test-model",
    store: false,
    max_output_tokens: 8000,
    text: {
      format: { type: "json_schema", strict: true, name: "job_requirements" },
    },
  });
  expect(body.text.format.schema.additionalProperties).toBe(false);
  expect(body.input).toHaveLength(1);
  expect(JSON.parse(body.input[0].content)).toEqual({
    passages: sourcePassages(frontendDescription),
  });
  expect(body.tools).toBeUndefined();
});
it.each([400, 401, 429, 500])(
  "does not automatically retry HTTP %s or leak request details",
  async (status) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("secret provider text", { status }));
    await expect(
      new OpenAIClient("fake-test-key", fetcher).parseJobDescription(
        "Source",
        "test",
      ),
    ).rejects.toMatchObject({ code: "unavailable" });
    expect(fetcher).toHaveBeenCalledOnce();
  },
);
it.each(["incomplete", "failed", "cancelled"])(
  "rejects %s output",
  async (status) => {
    const f = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(response({ status })));
    await expect(
      new OpenAIClient("fake", f).parseJobDescription("source", "test"),
    ).rejects.toMatchObject({ code: "incomplete" });
  },
);
it("handles refusal without saving it as requirements", async () => {
  const f = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json(
      response({
        output: [
          {
            id: "m",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [{ type: "refusal", refusal: "No" }],
          },
        ],
      }),
    ),
  );
  await expect(
    new OpenAIClient("fake", f).parseJobDescription("source", "test"),
  ).rejects.toMatchObject({ code: "refused" });
});
it("rejects malformed JSON", async () => {
  const f = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json(
      response({
        output: [
          {
            id: "m",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [
              { type: "output_text", text: "{broken", annotations: [] },
            ],
          },
        ],
      }),
    ),
  );
  await expect(
    new OpenAIClient("fake", f).parseJobDescription("source", "test"),
  ).rejects.toThrow();
});
it("requires credentials without making a request", () =>
  expect(() => new OpenAIClient(" ")).toThrow("Configure"));
