# Phase 8 — Fit scoring engine

## Delivered

Candidate-to-job assessment in Job Detail, using the current validated parse, verified profile evidence and an optional saved search. Deterministic weighted scoring, configurable recommendation thresholds, mandatory credential caps, fixed partial/transferable credit, provenance and visible explanations. An optional bounded semantic adapter supplies source-validated classifications, never scores or exact matches. Source-version caching keeps prior inputs from appearing current.

## Changes

Created:

- `src/features/fit/`: scoring configuration/types, verified evidence/date handling, requirement deduplication, deterministic matching, compatibility comparisons, pure scoring engine, controls and evidence view.
- `src/server/fit/`: owner-scoped repository, versioned snapshots/cache, semantic client and assessment service.
- `src/app/(workspace)/jobs/[jobId]/fit-actions.ts`.
- `supabase/migrations/20260921143847_fit_scoring.sql`, `supabase/tests/fit_scoring.sql`.
- Deterministic fixtures and engine, semantic adapter, service, action and component tests.
- `docs/fit-scoring.md`, this report.

Changed: Job Detail page; generated database definitions; migration test harness; database documentation.

## Validation

- Migration applied on `ai-job-finding`; hosted migration history matches local filename.
- Full empty-database migration test passes, including ownership, score/result constraints, unique input caching and version history.
- Hosted transactional test passed the same ownership/constraint scenarios; synthetic records were rolled back.
- Security advisor reports no new database finding. Existing [Auth leaked-password-protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains.
- Full unit/component suite, lint, typecheck, formatting and build results are recorded at completion below. OpenAI HTTP tests use fake credentials and synthetic data, without live API calls.

## Design and limitations

Inspected Figma Job Detail frame `23:667` with the design-to-code skill. Reused the existing two-column layout, tokens, restrained fit meter and source-evidence disclosures; added practical saved-search/method selectors. No future-phase preparation control is enabled. Browser tooling is unavailable in this session; component behavior is covered by React Testing Library. No claim of pixel-perfect or authenticated browser verification.

Conservative text matching may under-credit complex requirements. The existing parser's bilingual omissions remain a limitation. Semantic partial/transferable matches stay AI drafts and require review. Historical analyses are stored but there is no history browser. The first simultaneous semantic requests can each consume a call; completed inputs are cached. Full policy and tradeoffs are documented in `docs/fit-scoring.md`.

Stop after Phase 8. Recommended next phase, only on request: relevant candidate fact retrieval for truthful application preparation.

## Final checks and checkpoint

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 565 tests passed across 41 files (50 added tests plus the hosted/local SQL scenarios).
- `npm run format:check`: passed.
- `npm run build`: passed; protected dynamic Job Detail route included.
- Generated database types refreshed from the hosted project.
- No real candidate excerpts were sent to OpenAI; no new API credentials or dependencies were added.

Commit/push outcome is recorded in the completion message. Phase 9 is not started.


## Phase 8 follow-up — matcher version 2

Improved exact matching for neutral requirement wrappers, reviewed technology spellings, specific degree abbreviations and licence spelling variants. Explicitly grouped AND/OR conditions are evaluated without granting full credit for a partly supported branch; mixed ungrouped conditions remain unknown. Repeated normalized requirements are deduplicated with specialized categories taking precedence.

Added a deterministic source audit for supported English/French minimum-experience wording. It catches both the required and preferred software-development threshold conflicts in the previously saved complete Software Developer II posting, even when the parser omitted a French variant. Conflicting passages appear together for review; neither value is assumed correct. This is deliberately bounded, not a general translation system.

Improved calendar duration boundaries and historical dates, excluded future roles/dependent bullets, and prevented a positive title from overriding negated evidence. The engine version is `fit-v2`; earlier scores remain historical and must be reassessed. No migration, credential change, candidate-profile mutation, live OpenAI call or Phase 9 work.

Files added: `qualification.ts`, `source-audit.ts`, `improvements.test.ts` under `src/features/fit`. Updated matcher/evidence/requirement/scoring models, source loading, semantic eligibility and these documents. The offline audit against the saved full public posting passed. Final verification: 591 tests across 42 files; lint, typecheck, formatting and production build pass. Preview/checkpoint outcome is reported in the completion message.
