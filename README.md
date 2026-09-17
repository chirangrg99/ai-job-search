# AI Job Application Assistant

Phase 3: application foundation, Supabase authentication and RLS, and a manually editable master candidate profile with explicit verification. AI generation and job-provider ingestion are not implemented.

## Run locally

Node.js 22.12+ and npm are required (verified on 22.23.2).

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Without Supabase configuration, protected pages redirect to the setup-needed login screen. To enable sign-in, supply the variables named in `.env.example` through your environment. Do not commit credentials. Add `APP_URL` for signup and allow its `/auth/callback` URL in Supabase Auth settings. Detailed setup is in `docs/database.md`.

If file watching reports `EMFILE`, use `WATCHPACK_POLLING=1000 npm run dev`.

## Architecture

- `src/app/(workspace)`: protected workspace routes (Profile is implemented; other career pages remain shells): `/`, `/jobs`, `/jobs/[jobId]`, `/applications`, `/profile`, `/answers`, `/preferences`, `/settings`.
- `src/app/login`, `src/app/auth/callback`: sign-in/signup actions and PKCE confirmation.
- `src/components/layout`, `src/components/ui`: responsive shell and minimal shadcn primitives.
- `src/features/profile`, `src/server/candidate`: structured profile forms, validation and ownership-scoped persistence. See `docs/profile.md`.
- `src/features/auth`: accessible auth form and validation.
- `src/server/auth`, `src/server/supabase`: server-verified identity, profile initialization and typed cookie-based Supabase client.
- `src/server/env`: Zod environment validation with sanitized failures; credentials stay server-only except the intended public project URL/publishable key.
- `src/lib/domain.ts`: constrained domain states.
- `src/types/database.ts`: generated deployed database types.
- `supabase/migrations`, `supabase/tests`: reproducible schema and transactional ownership tests.

All UI tokens live in `src/app/globals.css`, using locally bundled Geist and the existing [Figma design](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled). Read `AGENTS.md` and project docs before making changes.

## Checks

```sh
npm run lint
npm run typecheck
npm run format:check
npm test
npm run build
```

Tests apply migrations to an empty embedded PostgreSQL instance, exercise ownership/constraints, and cover the shell, auth, navigation and environment. Hosted RLS verification and migration status are documented in `docs/database.md` and `docs/phase-2-report.md`.

Browser suite (after building):

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/work/playwright-browsers" npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/work/playwright-browsers" npm run test:e2e
```

Unauthenticated tests check all protected routes. Authenticated shell tests need a dedicated account supplied through `E2E_USER_EMAIL` and `E2E_USER_PASSWORD`; they skip when these are absent. Never commit test credentials or browser session files. Browser traces are disabled. The Codex host previously denied Chromium launch with a macOS Mach bootstrap error; run outside this sandbox if that occurs.

Direct dependencies are pinned. ESLint remains on 9.39.5 for compatibility with the current Next plugin group. Upgrade them together when supported.

## Phase boundary

Phase 3 is implemented. No application preparation, AI calls, job discovery, automatic submissions or Storage integration. See `docs/phase-3-report.md` for verification results and limitations. Later phases require explicit authorization.
