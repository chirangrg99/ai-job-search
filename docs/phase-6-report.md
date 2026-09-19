# Phase 6 report

## Delivered

Pure normalization functions, versioned SHA-256 fingerprints and atomic deduplication for Adzuna/manual discoveries. Repeated observations reuse jobs; primary-source metadata updates retain first-discovered dates. Likely duplicates remain separate. Existing intake can be processed from Jobs. No AI or future phase was started.

## Files

Created: `src/server/normalization/normalize.ts`, `normalize.test.ts`, `persistence.test.ts`; `supabase/tests/job_normalization.sql`; `docs/job-normalization.md`; this report.

Changed: discovery repository/service and tests; Jobs server actions and guard tests; discovery shared model/UI and tests; schema integration test; generated database types; README and database/discovery documentation.

Migration: `20260919033953_job_normalization.sql`, created with Supabase CLI and applied to **ai-job-finding**. Adds scoped jobs, provider identities, discovery outcomes, indexes/RLS and the security-invoker normalization RPC. Generated types refreshed.

## Validation

- Pure normalization cases cover URL tracking/query identity, Unicode, case, punctuation, C++/C#, title levels, salary units and missing values.
- PostgreSQL tests cover all four outcomes, original data, changed salary/description, stale observations, separate locations, reliable-ID repost conflicts, ambiguous URLs, snippets, manual content matching, idempotency and cross-owner denial.
- All migrations apply from an empty embedded PostgreSQL database. Transactional normalization SQL also passed on hosted Supabase and rolled back its synthetic data.
- Security advisor: no new RLS warning; existing [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains.
- Performance advisor: expected unused-index information and the pre-existing quota-table [missing-primary-key information](https://supabase.com/docs/guides/database/database-linter?lint=0004_no_primary_key). No missing relationship index reported.
- Commands: `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build`; Supabase migration creation, deployment, type generation and advisors.

- Final suite: 344 tests passed across 26 files; lint, typecheck, formatting and production build passed.
- Mobile browser inspection at 390 px confirmed responsive controls and saved-job rows; viewport restored.
- Browser verification processed the 60 existing discoveries into **39 stored jobs**: 38 new, 21 exact duplicate observations and one likely duplicate retained separately. No pending records remained. No Adzuna HTTP request was needed for this backfill.

## Design and limitations

Inspected Figma Jobs node `23:523`; reused existing layout, tokens and controls. The phase adds pending processing and explicit likely-duplicate labels instead of the future analysis/fit UI. No new UI package or paid component. There is no automatic merge action; related jobs in the current list are linked for uncertain matches. Latest 50 jobs and batches of 100 pending observations remain the UI limits. Full behavior and identity tradeoffs are in `docs/job-normalization.md`.

## Next phase and checkpoint

Recommended next phase: deterministic saved-search filtering of normalized jobs, then structured job parsing according to the user's next requested scope. Do not begin automatically. The final response and delivery report record final test totals and the verified GitHub commit/push outcome.
