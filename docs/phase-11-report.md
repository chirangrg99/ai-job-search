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
- Figma Application Package context and screenshot were inspected. New UI uses existing semantic tokens and components. Initial browser visual QA was blocked by the macOS sandbox. The successful follow-up below supersedes that limitation.
- Initial implementation used mocked OpenAI tests. The authorized synthetic live follow-up is recorded below; no real candidate context was sent to OpenAI.

The Supabase security advisor reports the existing [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) warning; no new database security finding was reported. This phase does not change account authentication settings.

The pre-existing deletion of `AGENTS.md` is excluded from this phase's commit. Credentials are excluded from logs and Git.

## Live AI and browser follow-up — 2026-10-01

- Ran the authorized synthetic OpenAI integration test. Two initial runs were blocked by validation: the model used bare IDs instead of kind-qualified references and added unsupported filler terms. Validation correctly prevented these drafts from passing.
- Fixed the request by adding explicit source keys to the payload and constraining every generated reference to the supplied keys using JSON Schema enums. Prompt `tailored-resume-v2` now explicitly uses verbatim role/skill headlines and conservative source-based summary wording. Validation rules were not relaxed. The next live generation plus independent review passed, including the adversarial job-only Kubernetes requirement check. Three runs made six synthetic-data API requests in total.
- Chromium launched after the permission change. Signed in with the supplied test account without saving credentials or browser session state. Created one preparation record for an existing job to inspect the package, since the account had none. No real candidate generation was requested.
- Inspected authenticated Application Package screenshots at 1440, 390 and 320px. No horizontal overflow or uncaught page errors. Keyboard Resume → Answers → Validation navigation passed after waiting for the selected state. The package showed the expected missing-current-inputs state and disabled generation.
- Separately rendered the production preview/validation components with synthetic verified sources, inspected desktop and mobile screenshots, and checked source expansion. No horizontal overflow at all three widths. This covers populated component layout; it is not a claim that a real candidate resume was generated and stored through the browser.
- All 723 normal tests, TypeScript, lint and the production build pass after the fix. Screenshots and synthetic visual tooling remain in ignored `work/`.
