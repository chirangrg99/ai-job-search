# Phase 11 — Tailored resume generation and validation

Implemented the job-specific structured resume workflow, using the compact verified context from Phase 10. See [tailored resumes](tailored-resumes.md) for API contracts, validation limits, privacy and operational behavior.

## Delivered

- Strict structured generation and a separate claim-by-claim audit, with deterministic provenance, skill, quantity and attribution checks before semantic review.
- Immutable original employer/title/date/education/credential values, source quotations and AI-draft labelling.
- Append-only resume versions and atomic generation leases; failed checks remain blocked drafts and never advance readiness.
- Authenticated Application Package Resume tab, preview, source counts, validation findings, regenerate control and history; Applications now links to packages.
- Migration applied to the existing `ai-job-finding` Supabase project. Live checks confirm RLS, no authenticated UPDATE/DELETE access to resume history, and invoker-only generation functions.
- No PDF or later-phase answer/readiness features.

## Verification

- All **723 tests across 53 files** pass, including adversarial validation, mocked OpenAI HTTP, service, ownership, component and keyboard checks.
- Migrations apply from an empty PostgreSQL instance; transactional SQL tests verify ownership isolation, immutable history, atomic leases and no automatic readiness changes.
- TypeScript, ESLint, formatting and the Webpack production build pass.
- Production server starts on port 3100. Unauthenticated package access redirects (307); login returns 200.
- Figma Application Package context and screenshot were inspected. New UI uses existing semantic tokens and components. Browser visual QA remains unverified: installed Chromium cannot launch under this session's macOS sandbox (`MachPortRendezvous` permission denied). No screenshot result is claimed.
- No paid OpenAI test was run and no real candidate context was transmitted during implementation. The opt-in synthetic live integration test is separate from the normal suite.

The Supabase security advisor reports the existing [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) warning; no new database security finding was reported. This phase does not change account authentication settings.

The pre-existing deletion of `AGENTS.md` is excluded from this phase's commit. Credentials are excluded from logs and Git.
