import { canonical } from "@/features/fit/evidence";
import {
  resumeDraftSchema,
  contextSchema,
  claimsOf,
  reviewSchema,
  VALIDATION_VERSION,
  type ResumeValidation,
  type ResumeContext,
  type ResumeDraft,
} from "./schema";
const key = (s: ResumeContext["items"][number]) => `${s.kind}:${s.id}`;
const grammar = new Set(
  "a an the and or of to for with in on at by as from is was were are has have had using used use that this these those it its their through".split(
    " ",
  ),
);
// Deliberately conservative: new content words need evidence, not merely a plausible job requirement.
const words = (s: string) =>
  (
    canonical(s).match(
      /(?:\.[\p{L}]+|[\p{L}\p{N}]+(?:[.+#%][\p{L}\p{N}+#%]*)*)/gu,
    ) ?? []
  ).filter((w) => !grammar.has(w));
const normalize = (s: string) => canonical(s).replace(/\s+/g, " ").trim();
export function validateGeneratedApplication(
  raw: unknown,
  input: ResumeContext,
  review?: unknown,
): ResumeValidation {
  const result: ResumeValidation = {
    version: VALIDATION_VERSION,
    passed: false,
    issues: [],
    unsupportedClaims: [],
    warnings: [
      "AI draft: review wording and source evidence before using this resume. Passing resume checks does not make the application Ready to Apply.",
    ],
  };
  const issue = (path: string, code: string, message: string) => {
    result.issues.push({ path, code, message });
  };
  const ctx = contextSchema.safeParse(input),
    parsed = resumeDraftSchema.safeParse(raw);
  if (!ctx.success || !parsed.success) {
    issue(
      "resume",
      "invalid_schema",
      "Resume or verified context has an invalid structure.",
    );
    return result;
  }
  const context = ctx.data,
    draft = parsed.data,
    sources = new Map(context.items.map((s) => [key(s), s]));
  if (
    sources.size !== context.items.length ||
    JSON.stringify(context.items).length > 13000
  )
    issue(
      "context",
      "invalid_context",
      "Context identities or size are invalid.",
    );
  const claims = claimsOf(draft);
  for (const { path, claim } of claims) {
    const quotes: string[] = [];
    for (const ref of claim.sources) {
      const source = sources.get(ref.sourceId),
        value = source?.values[ref.field];
      if (typeof value !== "string" || !value.includes(ref.quote)) {
        issue(
          path,
          "invalid_reference",
          "Evidence must quote an exact field of a selected verified source.",
        );
        continue;
      }
      // Metadata cannot be repurposed into a skill or factual claim.
      if (["url", "experience_id", "fact_type"].includes(ref.field)) {
        issue(path, "invalid_reference", "This field is not claim evidence.");
        continue;
      }
      quotes.push(ref.quote);
    }
    const vocabulary = new Set(quotes.flatMap(words));
    const added = words(claim.text).filter((w) => !vocabulary.has(w));
    if (added.length)
      issue(
        path,
        "unsupported_terms",
        `New claim terms need source evidence: ${[...new Set(added)].slice(0, 12).join(", ")}.`,
      );
    // Quantities must preserve their local wording/unit; no inferred tenure or recombined metrics.
    const quantities =
      claim.text.match(
        /\b\d[\d,.]*(?:\s*%|\s*\+)?(?:\s+(?:years?|months?|days?|hours?|percent|million|thousand))?/gi,
      ) ?? [];
    if (
      quantities.some(
        (q) => !quotes.some((s) => normalize(s).includes(normalize(q))),
      )
    )
      issue(
        path,
        "unsupported_quantity",
        "Dates, quantities and duration must be supported verbatim by cited evidence.",
      );
    if (
      /\b(?:years?|months?)\b/i.test(claim.text) &&
      !quotes.some((s) => normalize(s).includes(normalize(claim.text)))
    )
      issue(
        path,
        "inferred_tenure",
        "Experience duration cannot be inferred or inflated.",
      );
    if (/<[^>]+>|```|\]\(/.test(claim.text))
      issue(path, "markup", "Resume content must be plain text.");
    if (path.startsWith("skills.")) {
      const exact = claim.sources.some((ref) => {
        const s = sources.get(ref.sourceId);
        if (!s) return false;
        const allowed =
          (s.kind === "fact" &&
            s.values.fact_type === "skill" &&
            ["title", "value_text"].includes(ref.field)) ||
          (s.kind === "bullet" && ref.field === "skills") ||
          (s.kind === "project" && ref.field === "technologies");
        return (
          allowed &&
          normalize(ref.quote) === normalize(claim.text) &&
          String(s.values[ref.field] ?? "")
            .split(/[,;\n]/)
            .some((v) => normalize(v) === normalize(claim.text))
        );
      });
      if (!exact)
        issue(
          path,
          "unsupported_skill",
          "Skills must exactly match an explicit selected skill fact, bullet skill or project technology.",
        );
    }
  }
  const groups = [
    ["experiences", draft.experiences, "experience"],
    ["projects", draft.projects, "project"],
  ] as const;
  for (const [group, entries, kind] of groups) {
    const seen = new Set<string>();
    entries.forEach((entry, i) => {
      const source = sources.get(entry.sourceId);
      if (!source || source.kind !== kind || seen.has(entry.sourceId))
        issue(
          `${group}.${i}`,
          "invalid_source",
          "Section must reference one selected source of the correct kind.",
        );
      seen.add(entry.sourceId);
      entry.bullets.forEach((b, j) => {
        if (
          b.sources.some((ref) => {
            const s = sources.get(ref.sourceId);
            return kind === "experience"
              ? s?.kind !== "bullet" || s.parentId !== source?.id
              : ref.sourceId !== entry.sourceId;
          })
        )
          issue(
            `${group}.${i}.bullets.${j}`,
            "wrong_attribution",
            "A duty or achievement cannot be moved to another employer or project.",
          );
      });
    });
  }
  for (const [group, ids, kind] of [
    ["education", draft.education, "education"],
    ["licencesCertifications", draft.licencesCertifications, "credential"],
  ] as const) {
    if (
      new Set(ids).size !== ids.length ||
      ids.some((id) => sources.get(id)?.kind !== kind)
    )
      issue(
        group,
        "invalid_source",
        "Only selected verified sources of the correct kind can appear here.",
      );
  }
  if (review !== undefined) {
    const semantic = reviewSchema.safeParse(review);
    const expected = new Set(claims.map((c) => c.path));
    if (
      !semantic.success ||
      semantic.data.claims.length !== claims.length ||
      new Set(semantic.data.claims.map((c) => c.path)).size !== claims.length ||
      semantic.data.claims.some((c) => !expected.has(c.path))
    )
      issue(
        "resume",
        "incomplete_review",
        "Independent review must cover every claim exactly once.",
      );
    else
      for (const verdict of semantic.data.claims)
        if (verdict.verdict !== "supported")
          issue(verdict.path, "semantic_unsupported", verdict.reason);
  } else
    issue(
      "resume",
      "review_required",
      "Independent claim review is required before validation can pass.",
    );
  result.unsupportedClaims = [
    ...new Set(
      result.issues
        .filter((i) => i.path !== "resume" && i.path !== "context")
        .map(
          (i) => claims.find((c) => c.path === i.path)?.claim.text ?? i.path,
        ),
    ),
  ];
  if (!draft.experiences.length)
    result.warnings.push("No relevant work experience is included.");
  if (!draft.education.length)
    result.warnings.push("No relevant verified education is included.");
  result.passed = result.issues.length === 0;
  return result;
}
/** Identity, dates, institution and credential names are copied, never generated. */
export function resolveResume(draft: ResumeDraft, context: ResumeContext) {
  const sources = new Map(context.items.map((s) => [key(s), s]));
  const source = (id: string) => sources.get(id) ?? null;
  return {
    ...draft,
    experiences: draft.experiences.map((e) => ({
      ...e,
      original: source(e.sourceId)?.values ?? {},
    })),
    projects: draft.projects.map((e) => ({
      ...e,
      original: source(e.sourceId)?.values ?? {},
    })),
    education: draft.education.map(source).filter((s) => s !== null),
    licencesCertifications: draft.licencesCertifications
      .map(source)
      .filter((s) => s !== null),
  };
}
