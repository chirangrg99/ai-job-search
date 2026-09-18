# Phase 4 — Job preferences and saved searches

## Delivered

`/preferences` supports multiple independent searches for one candidate profile: create, edit, duplicate, enable/pause, confirmed delete and readable criteria cards. All requested fields are editable. The reusable deterministic pre-AI filter returns pass/fail plus reason codes and explanations. No production example searches are seeded.

## Files created

- `src/features/preferences/`: `schema.ts`, `form.ts`, `filter.ts`, `summary.tsx`, `editor.tsx`, `workspace.tsx`.
- Feature tests: `filter.test.ts`, `schema.test.ts`, `preferences.test.tsx`.
- `src/server/preferences/`: `repository.ts`, `service.ts`, `repository.test.ts`, `service.test.ts`, `actions.test.ts`.
- `src/app/(workspace)/preferences/`: `actions.ts`, `error.tsx`, `loading.tsx`.
- `supabase/tests/saved_searches.sql`.
- `docs/saved-searches.md`, this report and the delivery copy under `outputs/phase-4/`.

## Files changed

- Preferences `page.tsx`: authenticated server loading and feature rendering.
- `src/types/database.ts`: regenerated salary currency column types.
- `src/server/db/schema.test.ts`: includes saved-search SQL verification.
- `README.md`: Phase 4 status and architecture.
- `docs/product-spec.md`: aligns Job Preferences route with the implemented `/preferences` route.

## Migration

`20260917135012_saved_search_currency.sql`: adds optional explicit currency, avoiding comparisons across incompatible currencies. Created through Supabase CLI, tested from an empty embedded PostgreSQL instance, applied to `ai-job-finding`, and aligned to the hosted migration timestamp. Existing RLS policies are unchanged. Hosted transactional CRUD and cross-user protection assertions passed and rolled back all fixtures.

## Checks and results

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: **196 tests passed across 19 files**, including 105 added tests.
- `npm run build`: passed, all application routes built.
- `npm run format:check`: passed.
- Supabase migration history, generated types and hosted SQL fixture: verified.
- Connected browser: authenticated page loads; empty submission shows validation and focuses name; unsaved edits require discard confirmation; mobile viewport is 390px with no horizontal overflow. Desktop navigation/layout inspected. The user's profile was not populated with test searches.

Tests exercise same-profile multiple strategies, all requested mutation paths, stale/foreign ownership, current-user derivation, explicit enable values, paused copies, error preservation, numeric boundaries, unknown data, currency/period mismatches, salary overlap, keyword boundaries, location restrictions and missing fit scores.

## Design decisions

Inspected the existing Figma Job Preferences frame `25:1342`, including component references and variable tokens. Reused the shell, Button, Input and Sheet. Used summary cards and a responsive drawer, as specified in the written design and Phase 4 request, instead of the illustrative inline editor. No fabricated match counts, schedules or last-run values. Native checkbox groups provide accessible multiple work-mode/employment selections. Broader seniority and configurable unknown-data policy fields are deferred; unknown information consistently stays eligible for review with explicit reasons.

21st metadata reviewed: [Search Tool](https://21st.dev/@serafimcloud/components/search-tool) displays search results rather than saved criteria; [Settings Card with Sidebar](https://21st.dev/@cnippet-dev/components/v-card-17) adds navigation already present in the application. Neither improves this workflow enough to justify replacing existing primitives. No component code purchased or installed; no dependencies added.

## Limitations

- Filter pass means eligible for further review. It never claims missing data meets a preference.
- Location comparison requires canonical comparable labels from a future adapter; distance/geocoding and currency/period conversion are not implemented. Unknown fit scores stay pending.
- Searches referenced by analyses can be paused but cannot be deleted under the existing history-preserving foreign key.
- Standalone Playwright launch was previously blocked by macOS. This phase used component tests, database tests and connected-browser checks; no full browser CRUD test is claimed.
- Supabase's existing Auth advisory remains: [leaked-password protection is disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No new RLS finding was reported; unrelated Auth settings were not changed.

## Phase boundary and next step

Stopped after Phase 4. No Adzuna or AI integration. The recommended next phase is the user-defined job-source/discovery phase, only after explicit authorization.

## GitHub checkpoint

The completion checkpoint is committed and pushed to `main` in `chirangrg99/ai-job-search` with the message “Complete Phase 4 saved searches and deterministic filtering”. The task's final response links the verified commit. Credentials, local environment files, scratch files and build artifacts are excluded.
