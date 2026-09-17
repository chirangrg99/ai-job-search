# Phase 2 — Supabase schema, authentication and RLS

Date: 2026-09-16

## Outcome

Database foundations and authentication are implemented. Both migrations were applied to the user-selected **ai-job-finding** project (`gpytdhhocwdtosvzulrv`). All 15 tables have Row Level Security enabled. Empty-database migration tests and hosted ownership tests passed. Build, lint, strict typecheck, formatting and 61 Vitest tests pass.

Phase 2 is **not marked fully verified**: live sign-in/email confirmation awaits user-supplied environment configuration, and standalone Playwright cannot launch Chromium in this macOS sandbox. No Phase 3 work started.

## Delivered

- All requested normalized tables, columns, UUIDs, relationships and timestamps.
- One profile per auth user and one application per profile/job.
- Saved-search preference rows, provider-scoped strong job identifiers, nonunique fingerprint/URL lookup indexes, versioned logical analysis uniqueness and resume versions.
- Application status, score, provenance, sensitivity, date and JSON shape constraints.
- Profile-derived RLS on user-owned data, nested ownership policies, read-only authenticated shared catalogs and explicit API grants.
- Composite foreign keys that prevent applications from using another profile/job's resume and analyses from using another profile's search.
- Cookie-based Supabase SSR authentication; protected workspace layout and session proxy; sign-in/signup, PKCE callback and current-device sign-out.
- Idempotent empty-profile creation from the server-confirmed user; no browser owner IDs or copied career claims.
- Generated deployed database types and runtime domain-state schemas.

## Migrations created and applied

1. `supabase/migrations/20260916162837_phase2_foundations.sql`
2. `supabase/migrations/20260916163335_covering_relationship_indexes.sql`

Files were initialized with the Supabase CLI. After connector application, filenames were aligned to the actual hosted migration versions. The second migration resolves two composite foreign-key index findings. No other Supabase project was modified.

## Files created

- `supabase/config.toml`, both migration files and `supabase/tests/ownership.sql`.
- `src/types/database.ts`, `src/lib/domain.ts`, `src/lib/domain.test.ts`.
- `src/server/supabase/{client,config,session}.ts`, `src/server/supabase/session.test.ts`.
- `src/server/auth/guard.ts`, `src/server/auth/guard.test.ts`, `src/server/auth/actions.test.ts`.
- `src/server/db/schema.test.ts` and `src/proxy.ts`.
- `src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/app/auth/callback/route.ts`.
- `src/features/auth/{auth-form.tsx,auth-form.test.tsx,schema.ts}`.
- `src/components/ui/input.tsx`, `e2e/auth.spec.ts`.
- `docs/database.md`, `docs/phase-2-report.md` and exported handoff copies.

## Files changed

- `.gitignore`: excludes local Supabase CLI state.

- `package.json`, `package-lock.json`: pinned PGlite development dependency and shadcn Input installation; removed the CLI's unnecessary generated `cn` dependency and reused the existing class helper.
- `.env.example`, `src/server/env/schema.ts`, its tests: optional trusted `APP_URL` origin and safe validation.
- `src/app/(workspace)/layout.tsx`: server authentication guard and dynamic rendering.
- `src/components/layout/top-bar.tsx`, shell tests: sign-out action.
- `src/test/setup.ts`: support both DOM and PostgreSQL/Node tests.
- `e2e/shell.spec.ts`: dedicated authenticated test-account setup; explicit skips when credentials are absent.
- `playwright.config.ts`: traces disabled to avoid storing auth inputs.
- `README.md` and feature/server/types boundary documentation.

`AGENTS.md` and the Phase 0 product/design specifications were preserved.

## Commands and verification

| Check | Result |
| --- | --- |
| Supabase CLI help, init and migration new | Successful; CLI config-directory access was granted |
| `npm run lint` | Passed, zero warnings |
| `npm run typecheck` | Passed |
| `npm run format:check` | Passed |
| `npm test` | 61 passed across 9 files |
| `npm run build` | Passed; protected routes and auth callback compiled |
| Empty PostgreSQL migration test | Both migrations applied cleanly through PGlite |
| Hosted transactional SQL test | Passed on real Supabase PostgreSQL 17; synthetic data rolled back |
| Hosted RLS inspection | All 15 tables enabled |
| Hosted migration history | Both applied versions matched local files |
| Hosted security advisor | No findings |
| Hosted performance advisor | Only unused-index information remains on the new database |
| Production HTTP smoke check | All eight workspace routes returned 307 to login without a session |
| Connected browser | Login redirect and invalid callback checked; 320px reflow passed; no error logs observed |
| `PLAYWRIGHT_BROWSERS_PATH="$PWD/work/playwright-browsers" npm run test:e2e -- e2e/auth.spec.ts --workers=1 --max-failures=1` | Chromium launch failed with macOS Mach bootstrap permission denial; first test could not execute, remaining 9 did not run |

Hosted tests cover two-user read/write isolation across profile tables, nested experiences/responses, prohibited ownership reassignment, anonymous access denial, shared-catalog write denial, duplicate applications/profiles/provider identifiers, NULL-preference analysis uniqueness, cross-owner resume/search references, invalid status/score/provenance, unverified defaults and profile cascades. The hosted database contains no remaining synthetic test users.

Unit/component tests additionally cover authentication guards, user-derived profile ownership, missing configuration, provider-error sanitization, signup confirmation handling, sign-out, session-cookie propagation, proxy redirects, domain states, accessible form controls and existing shell/navigation behavior.

## Design decisions and deviations

Existing Figma shell context and written tokens were consulted. Sign-in was not among the ten original Figma screens; the minimal auth form uses the existing Geist typography, semantic colors, shadcn Button/Input, visible labels and 44px controls. No Figma design was changed, and no exact auth-screen parity is claimed. No composed 21st component was needed for this primitive form.

Jobs and canonical question prompts are shared catalog data, not candidate-owned material. Personal prompts/responses remain in owned tables. Phase 2's explicit status list supersedes the earlier conceptual wording. No workflow transitions or automatic legal declarations were added.

## Remaining setup and limitations

Supply `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `APP_URL` through your environment, then configure the matching `/auth/callback` redirect in ai-job-finding's Auth URL settings. The agent did not retrieve, print or persist API keys. No service-role key is needed for authentication.

At final verification, `.env` and `.env.local` were absent. The app correctly denies workspace access and shows setup-needed sign-in until configured. Signup confirmation delivery, SMTP, real successful sign-in and real session refresh have not been exercised. Complete those checks with a dedicated test account. Authenticated shell browser tests use runtime `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` and skip explicitly without them.

Run standalone Playwright from a terminal outside this sandbox to complete automated browser verification. The launch failure occurred before application assertions and is not presented as a passing test.

No database business services, career editor, AI pipeline, Adzuna integration, automatic application submission, password recovery, MFA or Storage policies were added. Generated JSONB types remain broad until later features introduce specific validated payloads. Historical analysis revisions beyond the current model/prompt/search identity are deferred.

## Recommended next phase

Finish live authentication and standalone browser verification, then explicitly authorize Phase 3, such as verified master-profile editing and validation. Do not start the next phase automatically.
