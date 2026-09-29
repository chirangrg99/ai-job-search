import { jobFingerprint } from "./identity";
import { parsedJobSchema } from "@/features/job-parser/schema";
import { buildRequirements } from "@/features/fit/requirements";
import type { CandidateProfile } from "@/features/profile/model";
import {
  RETRIEVAL_CONFIG,
  retrievalResultSchema,
  type RetrievalJob,
  type RetrievalOptions,
  type RetrievalResult,
  type Selection,
  type ResumeSource,
} from "./model";
import {
  eligibleSources,
  rankResponseSchema,
  sourceCharacters,
  sourceKey,
  type EligibleSource,
} from "./sources";
import { overlap, tags, terms } from "./terms";
const priorities = {
  required: 0,
  preferred: 1,
  achievement: 2,
  transferable: 3,
  context: 4,
};
type Candidate = {
  eligible: EligibleSource;
  selection: Selection;
  rank: number;
};
function shortlist(job: RetrievalJob, profile: CandidateProfile) {
  const parsed = parsedJobSchema.parse(job.parsed),
    requirements = buildRequirements(parsed);
  const sources = eligibleSources(profile, job.asOf);
  const jobTags = (job.categories ?? []).flatMap((t) => tags(t));
  const queryTerms = terms(
    [parsed.title?.text, ...requirements.map((r) => r.text)]
      .filter(Boolean)
      .join(" "),
  );
  const candidates: Candidate[] = [];
  for (const eligible of sources) {
    const { source, item, claims } = eligible;
    const claimTerms = terms(claims.join(" "));
    const reasons: Selection["reasons"] = [];
    let tier: Selection["priority"] = "transferable",
      score = 0;
    for (const requirement of requirements) {
      if (
        requirement.category === "credentials" &&
        source.kind !== "credential"
      )
        continue;
      if (requirement.category === "education" && source.kind !== "education")
        continue;
      if (
        source.kind === "credential" &&
        requirement.category !== "credentials"
      )
        continue;
      const target = terms(requirement.text),
        hits = overlap(target, claimTerms);
      // A single shared generic word is too weak for a multi-word requirement.
      const explicitSingle =
        hits.length === 1 &&
        claims.some((claim) => {
          const words = terms(claim);
          return words.length === 1 && words[0] === hits[0];
        });
      if (
        !hits.length ||
        (target.length > 1 && hits.length < 2 && !explicitSingle)
      )
        continue;
      const candidateTier =
        requirement.priority === "required" ||
        requirement.priority === "ambiguous"
          ? "required"
          : requirement.priority === "preferred"
            ? "preferred"
            : "achievement";
      if (priorities[candidateTier] < priorities[tier]) tier = candidateTier;
      score = Math.max(
        score,
        Math.round(60 + (30 * hits.length) / target.length),
      );
      reasons.push({
        requirementId: requirement.id,
        signal: "explicit_terms",
        terms: hits.slice(0, 12),
      });
    }
    if (!reasons.length) {
      const matchedKeywords = tags(item.values.keywords).filter((k) => {
        const kTerms = terms(k);
        return (
          kTerms.length > 0 &&
          overlap(kTerms, queryTerms).length === kTerms.length
        );
      });
      const matchedCategories = overlap(tags(item.values.categories), jobTags);
      const titleHits = overlap(terms(parsed.title?.text ?? ""), claimTerms);
      if (source.kind === "experience" && titleHits.length >= 2) {
        tier = "achievement";
        score = 55;
        reasons.push({
          requirementId: null,
          signal: "explicit_terms",
          terms: titleHits.slice(0, 12),
        });
      }
      // Tags only retrieve career achievements, not unsupported skill/credential facts.
      if (
        (source.kind === "bullet" || source.kind === "project") &&
        (matchedKeywords.length || matchedCategories.length)
      ) {
        tier = "achievement";
        score = Math.max(score, matchedKeywords.length ? 45 : 35);
        if (matchedKeywords.length)
          reasons.push({
            requirementId: null,
            signal: "keywords",
            terms: matchedKeywords.slice(0, 12),
          });
        if (matchedCategories.length)
          reasons.push({
            requirementId: null,
            signal: "category",
            terms: matchedCategories.slice(0, 12),
          });
      }
    }
    if (!reasons.length) continue;
    // Explicit cross-domain service/communication evidence is transferable;
    // it does not turn an unrelated role into technical experience.
    const sourceTags = tags(item.values.categories);
    if (
      jobTags.length &&
      sourceTags.length &&
      !overlap(sourceTags, jobTags).length &&
      reasons.every((r) =>
        r.terms.every((t) =>
          [
            "customer",
            "service",
            "communication",
            "customers",
            "client",
            "clients",
            "support",
            "collaboration",
          ].includes(t),
        ),
      )
    )
      tier = "transferable";
    candidates.push({
      eligible,
      rank: 0,
      selection: {
        id: source.id,
        kind: source.kind,
        revision: source.revision,
        parentId: source.parentId,
        priority: tier,
        relevanceScore: score,
        reasons: reasons.slice(0, 12),
      },
    });
  }
  const compare = (a: Candidate, b: Candidate) =>
    priorities[a.selection.priority] - priorities[b.selection.priority] ||
    b.rank - a.rank ||
    b.selection.relevanceScore - a.selection.relevanceScore ||
    sourceKey(a.selection).localeCompare(sourceKey(b.selection));
  candidates.sort(compare);
  return { requirements, sources, candidates, compare };
}
function assemble(
  job: RetrievalJob,
  pool: ReturnType<typeof shortlist>,
  ranking: RetrievalResult["ranking"],
) {
  const chosen = new Map<
    string,
    { selection: Selection; source: ResumeSource }
  >();
  const counts = {
    fact: 0,
    credential: 0,
    experience: 0,
    bullet: 0,
    project: 0,
    education: 0,
  };
  let size = 0;
  for (const candidate of pool.candidates) {
    const source = candidate.eligible.source,
      key = sourceKey(source);
    if (chosen.has(key)) continue;
    const additions = [{ source, selection: candidate.selection }];
    if (source.parentId && !chosen.has(`experience:${source.parentId}`)) {
      const parent = pool.sources.find(
        (s) =>
          s.source.kind === "experience" && s.source.id === source.parentId,
      );
      if (!parent) continue;
      additions.unshift({
        source: parent.source,
        selection: {
          id: parent.source.id,
          kind: "experience",
          revision: parent.source.revision,
          parentId: null,
          priority: "context",
          relevanceScore: 0,
          reasons: [
            { requirementId: null, signal: "parent_context", terms: [] },
          ],
        },
      });
    }
    const cost = additions.reduce((n, a) => n + sourceCharacters(a.source), 0);
    if (
      chosen.size + additions.length > RETRIEVAL_CONFIG.maxItems ||
      size + cost > RETRIEVAL_CONFIG.maxCharacters ||
      additions.some(
        (a) => counts[a.source.kind] >= RETRIEVAL_CONFIG.limits[a.source.kind],
      )
    )
      continue;
    for (const addition of additions) {
      chosen.set(sourceKey(addition.source), addition);
      counts[addition.source.kind]++;
    }
    size += cost;
  }
  const selections = [...chosen.values()].map((v) => v.selection);
  const ids = (k: Selection["kind"]) =>
    selections.filter((s) => s.kind === k).map((s) => s.id);
  return retrievalResultSchema.parse({
    version: RETRIEVAL_CONFIG.version,
    asOf: job.asOf,
    jobFingerprint: jobFingerprint(job),
    selectedCandidateFactIds: [...ids("fact"), ...ids("credential")],
    selectedExperienceIds: ids("experience"),
    selectedExperienceBulletIds: ids("bullet"),
    selectedProjectIds: ids("project"),
    selectedEducationIds: ids("education"),
    selections,
    sourceCharacters: size,
    omittedRelevantCount: pool.candidates.filter(
      (c) => !chosen.has(sourceKey(c.selection)),
    ).length,
    ranking,
  });
}
async function withRankingTimeout(work: Promise<unknown>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Ranking timed out.")),
          15000,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
/** Only IDs/revisions and traceable relevance signals leave this function. No rewritten facts. */
export async function retrieveRelevantCandidateFacts(
  job: RetrievalJob,
  profile: CandidateProfile,
  options: RetrievalOptions = {},
): Promise<RetrievalResult> {
  const pool = shortlist(job, profile);
  let ranking: RetrievalResult["ranking"] = "deterministic";
  if (options.ranker && pool.candidates.length > 1) {
    const bounded: typeof pool.candidates = [];
    let size = 0;
    for (const candidate of pool.candidates.slice(
      0,
      RETRIEVAL_CONFIG.maxShortlist,
    )) {
      const cost = candidate.eligible.text.length;
      if (size + cost > RETRIEVAL_CONFIG.maxRankerCharacters) continue;
      bounded.push(candidate);
      size += cost;
    }
    try {
      const response = rankResponseSchema.parse(
        await withRankingTimeout(
          options.ranker.rank({
            requirements: pool.requirements
              .slice(0, 60)
              .map((r) => ({ id: r.id, text: r.text, priority: r.priority })),
            candidates: bounded.map((c) => ({
              id: sourceKey(c.selection),
              kind: c.selection.kind,
              excerpt: c.eligible.text,
            })),
          }),
        ),
      );
      const available = new Set(bounded.map((c) => sourceKey(c.selection))),
        seen = new Set<string>();
      for (const entry of response) {
        if (!available.has(entry.id) || seen.has(entry.id))
          throw new Error("Invalid ranking identity.");
        seen.add(entry.id);
      }
      const ranks = new Map(response.map((r) => [r.id, r.score]));
      for (const c of pool.candidates)
        c.rank = ranks.get(sourceKey(c.selection)) ?? 0;
      pool.candidates.sort(pool.compare);
      ranking = "reranked";
    } catch {
      ranking = "fallback";
    }
  }
  return assemble(job, pool, ranking);
}
/** Re-resolve the selected IDs against the current, same-owner profile before use.
 * Rejects changed, unverified, unrelated or forged sources. No full profile is returned.
 */
export function materializeCandidateContext(
  selection: RetrievalResult,
  job: RetrievalJob,
  profile: CandidateProfile,
) {
  const safe = retrievalResultSchema.parse(selection);
  if (safe.asOf !== job.asOf || safe.jobFingerprint !== jobFingerprint(job))
    throw new Error("Retrieval date changed; retrieve again.");
  const pool = shortlist(job, profile),
    eligible = new Map(
      pool.sources.map((s) => [sourceKey(s.source), s.source]),
    );
  const candidates = new Set(
    pool.candidates.map((c) => sourceKey(c.selection)),
  );
  const seen = new Set<string>();
  const counts = {
    fact: 0,
    credential: 0,
    experience: 0,
    bullet: 0,
    project: 0,
    education: 0,
  };
  const items = safe.selections.map((s) => {
    const key = sourceKey(s),
      source = eligible.get(key);
    if (
      !source ||
      source.revision !== s.revision ||
      source.parentId !== s.parentId ||
      seen.has(key)
    )
      throw new Error("Selected candidate sources changed; retrieve again.");
    seen.add(key);
    counts[s.kind]++;
    if (counts[s.kind] > RETRIEVAL_CONFIG.limits[s.kind])
      throw new Error("Context limit exceeded.");
    if (
      !candidates.has(key) &&
      !(
        s.kind === "experience" &&
        safe.selections.some((b) => b.kind === "bullet" && b.parentId === s.id)
      )
    )
      throw new Error("Unrelated candidate source.");
    return source;
  });
  const expected = {
    selectedCandidateFactIds: items
      .filter((i) => i.kind === "fact" || i.kind === "credential")
      .map((i) => i.id),
    selectedExperienceIds: items
      .filter((i) => i.kind === "experience")
      .map((i) => i.id),
    selectedExperienceBulletIds: items
      .filter((i) => i.kind === "bullet")
      .map((i) => i.id),
    selectedProjectIds: items
      .filter((i) => i.kind === "project")
      .map((i) => i.id),
    selectedEducationIds: items
      .filter((i) => i.kind === "education")
      .map((i) => i.id),
  };
  for (const key of Object.keys(expected) as (keyof typeof expected)[])
    if ([...safe[key]].sort().join("\0") !== expected[key].sort().join("\0"))
      throw new Error("Selection IDs are inconsistent.");
  if (items.some((i) => i.parentId && !seen.has(`experience:${i.parentId}`)))
    throw new Error("Missing parent experience.");
  const size = items.reduce((n, i) => n + sourceCharacters(i), 0);
  if (size > RETRIEVAL_CONFIG.maxCharacters || size !== safe.sourceCharacters)
    throw new Error("Candidate context changed or exceeded its budget.");
  return { version: RETRIEVAL_CONFIG.version, asOf: job.asOf, items };
}
/** Future resume callers use this boundary instead of passing the master profile. */
export async function buildRelevantCandidateContext(
  job: RetrievalJob,
  profile: CandidateProfile,
  options: RetrievalOptions = {},
) {
  const selection = await retrieveRelevantCandidateFacts(job, profile, options);
  return {
    selection,
    context: materializeCandidateContext(selection, job, profile),
  };
}
