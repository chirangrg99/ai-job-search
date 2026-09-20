import { expect, it } from "vitest";
import { literalEvidence } from "./evidence";
import { validateParsedJob } from "./schema";
import { emptyParsedJob } from "../../../tests/fixtures/job-descriptions";
it("restores source whitespace without changing facts", () => {
  expect(
    literalEvidence(
      "Required:\n\tPython and  SQL.",
      "Required: Python and SQL.",
    ),
  ).toBe("Required:\n\tPython and  SQL.");
});
it.each([
  "Python or SQL.",
  "Python and sql.",
  "Python and SQL!",
  "Python and 2 SQL.",
])("rejects meaning or punctuation changes: %s", (quote) =>
  expect(literalEvidence("Python and SQL.", quote)).toBeNull(),
);
it("preserves quotes, backslashes and unicode", () => {
  expect(
    literalEvidence(
      '👩🏽‍💻\nUse "Python" in C:\\tools.',
      '👩🏽‍💻 Use "Python" in C:\\tools.',
    ),
  ).toBe('👩🏽‍💻\nUse "Python" in C:\\tools.');
});
it("does not decode invented escaped evidence", () =>
  expect(literalEvidence("One\nTwo", "One\\nTwo")).toBeNull());
it("returns literal evidence suitable for exact database validation", () => {
  const source = "Senior\nEngineer";
  const parsed = validateParsedJob(
    {
      ...emptyParsedJob(),
      title: { text: "Senior Engineer", evidence: "Senior Engineer" },
    },
    source,
  );
  expect(parsed.title).toEqual({ text: source, evidence: source });
});
