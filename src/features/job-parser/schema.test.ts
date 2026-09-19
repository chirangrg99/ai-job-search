import { expect, it } from "vitest";
import {
  parsedJobSchema,
  validateParsedJob,
  requirementGroups,
  descriptionSchema,
} from "./schema";
import {
  frontendDescription,
  frontendParsedJob,
  emptyParsedJob,
  deliveryDescription,
} from "../../../tests/fixtures/job-descriptions";
it("accepts fully evidenced extraction", () =>
  expect(validateParsedJob(frontendParsedJob(), frontendDescription)).toEqual(
    frontendParsedJob(),
  ));
it("retains absence as null/empty rather than inventing defaults", () =>
  expect(
    validateParsedJob(emptyParsedJob(), "A short snippet.").salary,
  ).toBeNull());
it.each(Object.keys(emptyParsedJob()))("requires explicit field %s", (key) => {
  const value: Record<string, unknown> = { ...emptyParsedJob() };
  delete value[key];
  expect(parsedJobSchema.safeParse(value).success).toBe(false);
});
it.each(requirementGroups)("rejects malformed requirement in %s", (key) =>
  expect(
    parsedJobSchema.safeParse({
      ...emptyParsedJob(),
      [key]: [{ text: "invented" }],
    }).success,
  ).toBe(false),
);
it.each(requirementGroups)("rejects unsupported evidence in %s", (key) => {
  const priority =
    key === "requiredQualifications"
      ? "required"
      : key === "preferredQualifications"
        ? "preferred"
        : "unspecified";
  expect(() =>
    validateParsedJob(
      {
        ...emptyParsedJob(),
        [key]: [{ text: "Invented", evidence: "Invented", priority }],
      },
      frontendDescription,
    ),
  ).toThrow();
});
it.each([
  "title",
  "company",
  "location",
  "employmentType",
  "workAuthorizationWording",
])("rejects missing source evidence for %s", (key) =>
  expect(() =>
    validateParsedJob(
      {
        ...emptyParsedJob(),
        [key]: { text: "Invented", evidence: "Invented" },
      },
      frontendDescription,
    ),
  ).toThrow(),
);
it.each(["invented", "", "VERIFIED"])(
  "rejects invalid classification %s",
  (priority) =>
    expect(
      parsedJobSchema.safeParse({
        ...emptyParsedJob(),
        skills: [{ text: "React", evidence: "React", priority }],
      }).success,
    ).toBe(false),
);
it("rejects additional fields at root and nested levels", () => {
  expect(
    parsedJobSchema.safeParse({ ...emptyParsedJob(), fitScore: 99 }).success,
  ).toBe(false);
  expect(
    parsedJobSchema.safeParse({
      ...emptyParsedJob(),
      title: { text: "A", evidence: "A", confidence: 1 },
    }).success,
  ).toBe(false);
});
it("does not accept rewritten unsupported claims even beside a real quote", () =>
  expect(() =>
    validateParsedJob(
      {
        ...emptyParsedJob(),
        title: {
          text: "Senior Developer",
          evidence: "Junior Frontend Developer",
        },
      },
      frontendDescription,
    ),
  ).toThrow());
it("enforces required/preferred list consistency", () =>
  expect(
    parsedJobSchema.safeParse({
      ...emptyParsedJob(),
      requiredQualifications: [
        { text: "React", evidence: "React", priority: "preferred" },
      ],
    }).success,
  ).toBe(false));
it.each([
  { minimum: 80000 },
  { maximum: 1 },
  { minimum: -1 },
  { currency: "USD" },
  { period: "hour" },
  { minimum: Infinity },
])("rejects unsupported salary %o", (change) => {
  const p = frontendParsedJob();
  expect(() =>
    validateParsedJob(
      { ...p, salary: { ...p.salary, ...change } },
      frontendDescription,
    ),
  ).toThrow();
});
it("does not infer currency from dollar sign", () => {
  const p = {
    ...emptyParsedJob(),
    salary: {
      minimum: 25,
      maximum: null,
      currency: null,
      period: "hour",
      evidence: "Pay: $25 per hour.",
    },
  };
  expect(validateParsedJob(p, deliveryDescription).salary?.currency).toBeNull();
  expect(() =>
    validateParsedJob(
      { ...p, salary: { ...p.salary, currency: "CAD" } },
      deliveryDescription,
    ),
  ).toThrow();
});
it("preserves alternatives and ambiguity as exact wording", () => {
  const text = "A diploma OR equivalent practical experience is acceptable.";
  const p = {
    ...emptyParsedJob(),
    educationRequirements: [
      { text, evidence: `Education: ${text}`, priority: "unspecified" },
    ],
    ambiguities: [{ text, evidence: `Education: ${text}` }],
  };
  expect(
    validateParsedJob(p, frontendDescription).educationRequirements[0]?.text,
  ).toBe(text);
});
it.each(["", "   ", "a".repeat(30001)])("rejects invalid source size", (s) =>
  expect(descriptionSchema.safeParse(s).success).toBe(false),
);
it("rejects excessive arrays", () =>
  expect(
    parsedJobSchema.safeParse({
      ...emptyParsedJob(),
      skills: Array(61).fill({
        text: "A",
        evidence: "A",
        priority: "required",
      }),
    }).success,
  ).toBe(false));
