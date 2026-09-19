# Phase 7 — AI job-description parser

## Delivered

Implemented `AIClient`, an OpenAI Structured Outputs adapter, strict Zod extraction/evidence validation, owner-scoped parsing service/repository, versioned persistent cache, bounded explicit retries and a Job Detail parsing interface. No candidate matching, resume generation or future-phase work.

## Files

Created:

- `src/features/job-parser/{schema.ts,schema.test.ts,requirements.tsx,parse-control.tsx,components.test.tsx}`
- `src/server/ai/{client.ts,client.test.ts}`
- `src/server/job-parser/{prompt.ts,identity.ts,repository.ts,service.ts,service.test.ts,persistence.test.ts,actions.test.ts}`
- `src/app/(workspace)/jobs/[jobId]/actions.ts`
- `tests/fixtures/job-descriptions.ts`, `tests/ai/job-parser.test.ts`, `vitest.ai.config.ts`
- `supabase/migrations/20260919035922_job_description_parses.sql`, `supabase/tests/job_parser.sql`
- `docs/job-parser.md`, this report.

Changed:

- Job Detail page and discovery workspace title links.
- Server environment schema and names-only `.env.example`.
- Package manifest/lock (pinned OpenAI SDK and separate AI test script).
- Generated database types and migration test harness.
- README and database documentation.

## Verification

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 455 tests passed across 32 files; 111 new parser-focused tests.
- `npm run test:ai`: one opt-in live test skipped; no API request made.
- `npm run format:check`: passed.
- `npm run build`: passed, including protected dynamic Job Detail route.
- Hosted migration list matches local migration; generated types refreshed.
- Transactional hosted SQL test passed: reservation/cache, malformed-output rejection and foreign-owner denial; all synthetic data rolled back.
- Security advisor: no new database finding; existing Auth leaked-password-protection warning remains.
- Authenticated browser: saved job title opens Job Detail, source snippet warning and parser action render in the narrow responsive layout.

## Design and limitations

Inspected existing Figma Job Detail frame `23:667` and reused current tokens, cards and responsive shell. Future fit score, candidate evidence and application preparation controls are intentionally absent. Extracted requirements use text provenance and expandable source quotations.

Schema and evidence checks cannot prove semantic classification or exhaustive extraction. Adzuna snippets may omit requirements. The restarted app detects server OpenAI configuration. After explicit user approval, one live browser request sent the selected Full Stack Software Developer description to OpenAI. It returned a sanitized unavailable error, and the app persisted a failed attempt without parsed output or analyzed timestamp. No automatic retry occurred. The cause (API access, quota, connectivity or request rejection) is not distinguished by the current error; successful live extraction remains unverified. Implementation and mocked tests are complete.

## Checkpoint and next phase

Commit/push outcome is recorded in the completion message. Recommended next phase: candidate-to-job fit analysis, only after explicit authorization. Stop after Phase 7.

## Follow-up: identity extraction correction

The user-approved live retry succeeded and saved output, revealing heading-as-title and anonymous-description-as-company errors. Prompt `job-parser-v2` now includes explicit identity rules and contrasting examples; schema field descriptions reinforce them. Narrow semantic rejection checks run before saving. Existing v1 cache entries remain stored but are not reused by v2. No migration or visual redesign.

Changed prompt/schema, schema/service tests, opt-in AI test and parser/report documentation. Added 14 offline regression cases including legitimate names with Company/Client words and non-English identities. Full suite: 469 passing tests; lint, typecheck, build and formatting passed. Two live tests remain opt-in and were skipped; no additional API credits used for this correction. Recommended next step is a user-triggered parse with v2, then Phase 8 only upon request.

## Live audit and classification fix (v4)

User-authorized live browser tests on the saved Software Developer II posting (Jeppesen ForeFlight) compared output against its complete stored snippet. V2 correctly extracted identity but misclassified development opportunities as responsibilities. The revised prompt distinguishes concrete duties from training/career benefits and reporting relationships. A subsequent run exposed a bare Hybrid label under schedule requirements; v4 explicitly requires timing, shifts or attendance cadence, reinforced by the schedule schema description.

The final v4 live request completed and saved: title Software Application Developer, company Jeppesen ForeFlight, location Montreal, Quebec; remaining extracted fields were null/empty, consistent with the limited snippet and the stricter classification rules. The provider's title remains unchanged. This validates the observed example, not all possible job descriptions. Three live requests were made in this audit (v2, v3, v4); no candidate profile was sent.

Changed `prompt.ts`, `schema.ts`, the opt-in AI regression test and these documents. No migration or design change. Lint/typecheck/build passed; 469 offline tests pass. Added a live regression asserting identity and absence of invented duties, skills, employment type and schedule. The three-test opt-in CLI suite was skipped; the actual authenticated browser runs above performed live verification. Old cache versions remain auditable and excluded from v4 lookups. Stop remains at Phase 7.


## Expanded posting input follow-up

Implemented source assembly from all saved posting fields plus imported original-page text. Added a public-page reader and paste fallback in Job Detail. Cache identity and evidence now use the same complete snapshot (prompt v5/schema 2). No candidate profile or credentials are included. Unknown/inferred metadata remains labelled; conflicts and salary estimates have explicit prompt rules.

Created posting reader/editor and extraction/transport tests. Changed parser repository/service/adapter/prompt/schema, Job Detail/actions, generated database types, fixtures/tests and dependencies (pinned cheerio/ipaddr.js). Applied migration `20260919185806_full_posting_parser_source.sql`; hosted transactional source/claim test passed and security advisor found only the existing Auth warning. No future phase implemented.

Verification: full offline tests, lint, typecheck, formatting and production build pass. Source tests cover complete fields, changed metadata and ownership; reader tests cover JSON-LD, main text, private DNS, redirects, unsupported pages and size constraints; action tests cover guarded imports and pasted text. No additional live OpenAI call was made. Browser tools were unavailable for interactive verification. Original-page retrieval is best effort, with explicit errors and paste fallback; no claim is made that every site exposes its complete content. Updated preview uses port 3001; port 3000 remains occupied by the older process.
