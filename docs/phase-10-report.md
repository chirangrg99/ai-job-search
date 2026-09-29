# Phase 10 — Relevant candidate fact retrieval

Completed on 2026-09-29.

## Delivered

- Deterministic `retrieveRelevantCandidateFacts(job, profile)` with source IDs, revisions, requirement references, relevance reasons and explicit priorities.
- Verified-source eligibility, credential validity, parent experience attribution and sensitive-source exclusion.
- Compact original-value context through `buildRelevantCandidateContext`, capped at 24 items and 12,000 serialized source characters. Empty retrieval never falls back to the full profile.
- Freshness and consistency checks before materializing saved selections.
- Optional bounded ranking interface with validated responses and deterministic error/timeout fallback. No embedding infrastructure or AI ranking adapter is installed.
- Mixed technical/driving fixtures covering cross-career customer-service evidence, technology distinctions, unrelated history, budgets and stale sources.

See [candidate retrieval](candidate-retrieval.md) for the API contract, limits and future authenticated caller responsibilities.

## Validation

- All 669 unit/component/schema tests passed across 47 files, including 32 retrieval tests.
- ESLint, TypeScript and formatting checks passed.
- Production build passed using `npm run build -- --webpack`.

This phase adds a domain context-selection boundary. It introduces no UI, database changes, provider calls or resume generation. Browser visual QA is not applicable to these changes. Future resume generation must load the current owned profile through the authenticated repositories and use the compact context entry point.
