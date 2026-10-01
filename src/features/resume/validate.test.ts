import { describe, it, expect } from "vitest";
import {
  resumeFixture,
  approvedReview,
  resumeClaim,
} from "../../../tests/fixtures/resume";
import { validateGeneratedApplication, resolveResume } from "./validate";
import { resumeDraftSchema } from "./schema";
describe("resume truth and provenance guards", () => {
  it("accepts supported shortening and copies immutable source fields", async () => {
    const { draft, context } = await resumeFixture();
    expect(
      validateGeneratedApplication(draft, context, approvedReview(draft))
        .passed,
    ).toBe(true);
    expect(
      resolveResume(draft, context).experiences[0]?.original,
    ).toMatchObject({
      company: "Example Software",
      title: "Frontend Developer",
      start_date: "2022-01",
      end_date: "2025-12",
    });
  });
  it.each([
    "Kubernetes",
    "AWS",
    "Java",
    "C#",
    "Azure certified",
    "Senior Frontend Developer",
    "10 years of React experience",
    "Reduced load time by 90%.",
  ])("rejects acquired claim %s even if reviewer approves", async (text) => {
    const { draft, context } = await resumeFixture();
    draft.professionalSummary[0]!.text = text;
    const result = validateGeneratedApplication(
      draft,
      context,
      approvedReview(draft),
    );
    expect(result.passed).toBe(false);
    expect(result.unsupportedClaims).toContain(text);
  });
  it("job-only demanded skills cannot become skills", async () => {
    const { draft, context } = await resumeFixture();
    draft.skills.push(
      resumeClaim("Kubernetes", "fact:react", "title", "React"),
    );
    expect(
      validateGeneratedApplication(
        draft,
        context,
        approvedReview(draft),
      ).issues.some((i) => i.code === "unsupported_skill"),
    ).toBe(true);
  });
  it.each(["title", "company", "start_date", "end_date"])(
    "model cannot set experience %s",
    async (field) => {
      const { draft } = await resumeFixture();
      expect(
        resumeDraftSchema.safeParse({
          ...draft,
          experiences: [{ ...draft.experiences[0], [field]: "fabricated" }],
        }).success,
      ).toBe(false);
    },
  );
  it("rejects nonexistent and invented source quotes", async () => {
    const { draft, context } = await resumeFixture();
    draft.headline.sources[0]!.quote = "Senior Frontend Developer";
    draft.skills[0]!.sources[0]!.sourceId = "fact:outside-selected-context";
    expect(
      validateGeneratedApplication(
        draft,
        context,
        approvedReview(draft),
      ).issues.filter((i) => i.code === "invalid_reference"),
    ).toHaveLength(2);
  });
  it("cannot move a duty to another employer", async () => {
    const { draft, context } = await resumeFixture();
    context.items.push({
      id: "other",
      kind: "experience",
      revision: 1,
      parentId: null,
      verified: true,
      values: { title: "Frontend Developer", company: "Different employer" },
    });
    draft.experiences[0]!.sourceId = "experience:other";
    expect(
      validateGeneratedApplication(
        draft,
        context,
        approvedReview(draft),
      ).issues.some((i) => i.code === "wrong_attribution"),
    ).toBe(true);
  });
  it("blocks manufactured education and licences", async () => {
    const { draft, context } = await resumeFixture();
    draft.education = ["fact:react"];
    draft.licencesCertifications = ["credential:invented"];
    expect(
      validateGeneratedApplication(draft, context, approvedReview(draft))
        .passed,
    ).toBe(false);
  });
  it("requires full independent review and blocks uncertainty", async () => {
    const { draft, context } = await resumeFixture();
    expect(validateGeneratedApplication(draft, context).passed).toBe(false);
    expect(
      validateGeneratedApplication(draft, context, { claims: [] }).passed,
    ).toBe(false);
    const review = approvedReview(draft);
    const uncertain = {
      claims: review.claims.map((c, i) => ({
        ...c,
        verdict: i === 0 ? "uncertain" : "supported",
      })),
    };
    expect(validateGeneratedApplication(draft, context, uncertain).passed).toBe(
      false,
    );
    review.claims[0]!.path = review.claims[1]!.path;
    expect(validateGeneratedApplication(draft, context, review).passed).toBe(
      false,
    );
  });
  it("independent review catches recombined existing words", async () => {
    const { draft, context } = await resumeFixture();
    draft.professionalSummary[0]!.text = "React reduced interfaces.";
    const review = approvedReview(draft);
    expect(
      validateGeneratedApplication(draft, context, {
        claims: review.claims.map((c) => ({
          ...c,
          verdict:
            c.path === "professionalSummary.0" ? "unsupported" : "supported",
          reason: "The evidence does not support this relationship.",
        })),
      }).passed,
    ).toBe(false);
  });
  it("rejects unverified context", async () => {
    const { draft, context } = await resumeFixture();
    const raw = {
      ...context,
      items: context.items.map((s) => ({ ...s, verified: false })),
    };
    expect(
      validateGeneratedApplication(draft, raw as never, approvedReview(draft))
        .passed,
    ).toBe(false);
  });
  it("blocks markup and unsupported profile fields", async () => {
    const { draft, context } = await resumeFixture();
    draft.headline.text = "<b>Frontend Developer</b>";
    expect(
      validateGeneratedApplication(draft, context, approvedReview(draft))
        .passed,
    ).toBe(false);
  });
  it("credentials and education preserve original values", async () => {
    const { draft, context } = await resumeFixture();
    const output = resolveResume(draft, context);
    expect(output.education[0]?.values.institution).toBe("Example College");
    expect(output.licencesCertifications).toEqual([]);
  });
});
it("does not treat a generic fact title as an explicit skill", async () => {
  const { draft, context } = await resumeFixture();
  context.items.find((s) => s.id === "react")!.values.fact_type = "fact";
  expect(
    validateGeneratedApplication(
      draft,
      context,
      approvedReview(draft),
    ).issues.some((i) => i.code === "unsupported_skill"),
  ).toBe(true);
});
