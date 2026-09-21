// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { shortlist, applySemantic, OpenAISemanticClient } from "./semantic";
import { initialMatches, scoreMatches } from "@/features/fit/engine";
import { input, item, requirement } from "../../../tests/fixtures/fit";
import { emptyParsedJob } from "../../../tests/fixtures/job-descriptions";
function fixture() {
  const i = input(
    [
      item("support", "bullet", {
        experience_id: "role",
        original_text: "Provided customer support in a retail store",
        skills: "customer support",
      }),
      item("role", "experience", { title: "Associate" }),
    ],
    {
      ...emptyParsedJob(),
      responsibilities: [
        requirement(
          "Provide customer support for business clients",
          "unspecified",
        ),
      ],
    },
  );
  const matches = initialMatches(i);
  return { i, matches, comparisons: shortlist(matches, i.candidates) };
}
it("selects only relevant verified excerpts and labels transferable evidence", () => {
  const { i, matches, comparisons } = fixture();
  const rows = {
    comparisons: [
      {
        requirementId: matches[0]!.id,
        sourceId: "support",
        quote: "Provided customer support in a retail store",
        relationship: "transferable",
        explanation:
          "Retail customer support may transfer; business client experience is not verified.",
      },
    ],
  };
  const result = scoreMatches(
    i,
    applySemantic(matches, i.candidates, comparisons, rows),
  );
  expect(result.fitScore).toBe(25);
  expect(result.partialRequirements[0]?.method).toBe("semantic");
});
it.each(["invented source", "invented quote", "invented score", "duplicate"])(
  "rejects %s",
  (mode) => {
    const { i, matches, comparisons } = fixture();
    const row = {
      requirementId: matches[0]!.id,
      sourceId: mode === "invented source" ? "foreign" : "support",
      quote: mode === "invented quote" ? "Fabricated" : "customer support",
      relationship: "partial",
      explanation: "Some direct evidence",
    };
    const output = {
      comparisons: mode === "duplicate" ? [row, row] : [row],
      ...(mode === "invented score" ? { fitScore: 100 } : {}),
    };
    expect(() =>
      applySemantic(matches, i.candidates, comparisons, output),
    ).toThrow();
  },
);
it("does not send sensitive facts or whole profiles", () => {
  const { i, matches } = fixture();
  i.candidates.find((c) => c.id === "support")!.sensitive = true;
  expect(
    shortlist(matches, i.candidates).flatMap((x) => x.candidates),
  ).toHaveLength(0);
});
it("never sends hard credentials, skills or numeric experience to semantic matching", () => {
  const { i, matches } = fixture();
  for (const category of [
    "credentials",
    "skills",
    "education",
    "experience",
  ] as const) {
    matches[0]!.category = category;
    expect(shortlist(matches, i.candidates)).toHaveLength(0);
  }
});
it("uses strict structured outputs without model-supplied scores", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      id: "resp_test",
      object: "response",
      created_at: 1,
      status: "completed",
      model: "test",
      output: [
        {
          id: "msg",
          type: "message",
          role: "assistant",
          status: "completed",
          content: [
            {
              type: "output_text",
              text: '{"comparisons":[]}',
              annotations: [],
            },
          ],
        },
      ],
    }),
  );
  const { comparisons } = fixture();
  await new OpenAISemanticClient("fake-test-key", fetcher).compare(comparisons);
  const body = JSON.parse(String(fetcher.mock.calls[0]![1]!.body));
  expect(body.store).toBe(false);
  expect(body.text.format.strict).toBe(true);
  expect(body.input).toBe(JSON.stringify(comparisons));
});
it("does not automatically retry provider errors or leak details", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json({ error: { message: "secret" } }, { status: 429 }),
    );
  await expect(
    new OpenAISemanticClient("fake-test-key", fetcher).compare([]),
  ).rejects.toThrow("Semantic comparison could not be validated");
  expect(fetcher).toHaveBeenCalledOnce();
});
it("does not reinterpret an adjacent technology in a general qualification", () => {
  const i = input([item("native", "fact", { title: "React Native" })], {
    ...emptyParsedJob(),
    requiredQualifications: [
      { text: "React", evidence: "React", priority: "required" },
    ],
  });
  expect(shortlist(initialMatches(i), i.candidates)).toHaveLength(0);
});
