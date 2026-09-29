# Relevant candidate retrieval — Phase 10

## Entry points

`src/features/retrieval/index.ts` exports the Node/server context-selection layer:

```ts
const job = {
  parsed: currentValidatedParse,
  asOf: "2026-09-29", // explicit evaluation date, persisted by the caller
  categories: ["frontend"], // optional, non-exclusive retrieval hints
};
const selection = await retrieveRelevantCandidateFacts(job, ownedProfile);
const { context } = await buildRelevantCandidateContext(job, ownedProfile);
// Future resume-generation input: context, never ownedProfile.
```

The caller must load the job's current validated parse and candidate profile through the authenticated repositories. These functions operate on supplied domain objects; they do not load accounts, accept browser ownership IDs, write records, run a provider or generate a resume. There is no new route, UI, migration, vector database, embedding provider or OpenAI call.

## Selection contract

The result contains `selectedCandidateFactIds` (including licence/certification facts), `selectedExperienceIds`, `selectedExperienceBulletIds`, `selectedProjectIds`, `selectedEducationIds`, and one selection entry per source. Each entry records kind, revision, parent experience when applicable, requirement references, matched terms, a retrieval priority and a deterministic relevance score. A SHA-256 job fingerprint and explicit evaluation date bind the result to its job input.

A relevance score measures lexical retrieval strength, **not qualification satisfaction, candidate fit, tenure, confidence or truth**. Shared terms can select partial evidence; the matching engine and future claim validation remain responsible for what that evidence supports. Tags are retrieval hints and never become candidate assertions.

## Stages

1. Use verified source items only, with verified parent experiences for bullets. Reuse the existing conservative validity/future-role rules; reject malformed dates and future education starts. Exclude personal details, summaries, sensitive items and recognized sensitive declaration wording. Private career facts may participate locally; no content is transmitted by the default implementation.
2. Compare explicit claim terms to parsed requirements. Preserve technology punctuation (C++, C#, .NET) and reviewed spelling aliases without inferring adjacent skills. Require multiple shared terms for multiword requirements unless a source contains an explicit single-term claim. Licence requirements retrieve credential items; education requirements retrieve education items.
3. Retrieve relevant experience titles and achievement bullets/projects by supplied category or keyword hints. Categories are arbitrary, many-to-many tags; there are no mutually exclusive career profiles or hardcoded career presets. For best category-only recall, callers can supply saved-search or reviewed job categories; none are inferred by AI.
4. Order required/ambiguous requirement evidence first, then preferred evidence, relevant achievements and explicit transferable evidence. Cross-category customer-service/communication evidence is marked transferable. An unrelated experience header is included only when needed to attribute a selected bullet, marked `context`; its other bullets are not included automatically.
5. Pack the results within hard limits. A bullet and its missing parent header are included atomically or skipped together. Ties use stable source identities, so profile input order does not affect the default result.

## Compact context and freshness

Defaults in `RETRIEVAL_CONFIG`:

- 24 items total; 12,000 serialized source characters total.
- 2,000 serialized characters per source. Oversized records are omitted whole rather than truncating a qualification or negation.
- At most eight facts, four credentials, four experience headers, eight bullets, three projects and two education records.
- Omitted relevant candidate count reports packing omissions. Ineligible/oversized records are excluded before relevance ranking.

`materializeCandidateContext(selection, job, profile)` re-resolves IDs against current eligible sources and rejects changed revisions, verification, job fingerprint, evaluation date, inconsistent ID arrays, unrelated additions, duplicate selections, missing parents and exceeded budgets. Callers must respect database revision semantics and reload the current owned profile before delayed use. A previous selection cannot silently become a resume context after its source is changed.

`buildRelevantCandidateContext` composes retrieval and materialization. It returns allowlisted **original values**, verification, IDs, revisions and parent IDs for selected records only. It strips category/keyword hints, source references and arbitrary metadata from the generation context. It preserves original date precision and does not derive metrics, experience duration, rewritten achievements or a professional summary.

## Future ranking seam

`CandidateRelevanceRanker` is an optional, explicitly supplied adapter. No implementation is installed. A future local/embedding/semantic ranker receives at most 60 deterministic candidates and 16,000 excerpt characters, never the full master profile. It can return only existing candidate keys and finite 0–100 ranking numbers; extra fields, invented IDs and duplicate IDs are rejected. Ranking only changes ordering within existing priority tiers and cannot rewrite, introduce, verify or expand candidate evidence. Candidate relevance scores remain deterministic.

Invalid output, exceptions or a 15-second timeout fall back to deterministic order. A future remote adapter must additionally cancel its own transport and implement its provider-specific privacy/consent rules; timeout fallback does not cancel an arbitrary adapter's underlying promise. No repeated provider attempts are made. Constrained AI selection is unnecessary for the current profile size and is not implemented.

## Limits

Lexical retrieval deliberately misses unrecognized synonyms and implicit transferable skills. A broad category tag can retrieve an achievement that still needs human review. It is a shortlist, not a proof system or a completeness guarantee. Negated/learning claims are conservatively excluded using the existing matcher rule, with ordinary “without accidents/incidents/injuries/violations” safety achievements preserved. Empty results stay empty rather than sending the full profile as a fallback. This phase prepares the boundary for resume generation; it does not implement that next phase.
