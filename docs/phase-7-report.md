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
