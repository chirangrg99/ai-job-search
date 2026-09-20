import { expect, it } from "vitest";
import { sourcePassages, resolveReferences } from "./references";
import { emptyParsedJob } from "../../../tests/fixtures/job-descriptions";
function empty() {
  return { ...emptyParsedJob(), ambiguities: [] };
}
it("copies selected passages instead of allowing rewritten evidence", () => {
  const source = "Required qualifications:\n• Use Python.\n• Use SQL.";
  const passages = sourcePassages(source);
  const id = passages.find((p) => p.text === "• Use SQL.")!.id;
  const result = resolveReferences(
    {
      ...empty(),
      requiredQualifications: [{ sourceId: id, priority: "required" }],
    },
    source,
  );
  expect(result.requiredQualifications[0]).toEqual({
    text: "• Use SQL.",
    evidence: "• Use SQL.",
    priority: "required",
  });
});
it("rejects nonexistent passages", () =>
  expect(() =>
    resolveReferences(
      { ...empty(), skills: [{ sourceId: 999, priority: "required" }] },
      "Source",
    ),
  ).toThrow("Unknown source passage"));
it("rejects generated quotes in reference output", () =>
  expect(() =>
    resolveReferences(
      {
        ...empty(),
        skills: [{ sourceId: 0, priority: "required", evidence: "Invented" }],
      },
      "Source",
    ),
  ).toThrow());
it("scalar text must still exist in the selected source", () =>
  expect(() =>
    resolveReferences(
      { ...empty(), title: { text: "Imaginary", sourceId: 0 } },
      "Engineer",
    ),
  ).toThrow());
it("keeps conflicting source passages separate", () => {
  const source = "Required: 2 years.\nRequis: 1 an.";
  expect(
    resolveReferences(
      { ...empty(), ambiguities: [0, 1] },
      source,
    ).ambiguities.map((i) => i.text),
  ).toEqual(["Required: 2 years.", "Requis: 1 an."]);
});
it("all chunks are bounded literal source spans including long paragraphs", () => {
  const source = 'long sentence with "quotes" and \\paths. '.repeat(120);
  for (const p of sourcePassages(source)) {
    expect(source).toContain(p.text);
    expect(p.text.length).toBeLessThanOrEqual(1200);
  }
});
it("separates mandatory and optional sentences without changing their wording", () => {
  const source = "• English is required. Spanish is an asset.";
  expect(sourcePassages(source).map((p) => p.text)).toEqual([
    "• English is required.",
    "Spanish is an asset.",
  ]);
});
