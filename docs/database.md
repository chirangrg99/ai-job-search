# Database and authentication foundations — Phase 2

## Deployment

Target: **ai-job-finding**, project ref `gpytdhhocwdtosvzulrv` (PostgreSQL 17). This target was explicitly selected by the user. No other project was changed.

Applied migration history:

1. `20260916162837_phase2_foundations.sql`
2. `20260916163335_covering_relationship_indexes.sql`

Migration files were created using `supabase migration new`, tested locally, and applied through the Supabase connector. Local filenames were aligned with the actual hosted migration versions afterward to prevent duplicate replay by the CLI. The second migration adds covering indexes recommended by the performance advisor.

## Ownership and permissions

| Records | Ownership/access |
| --- | --- |
| candidate_profiles | One per `auth.users.id`; authenticated UID must equal `user_id` on reads and writes |
| candidate_facts, experiences, education, projects, job_sources, job_preferences, job_analysis, resume_versions, candidate_answers, applications | `profile_id` must resolve to the authenticated user's profile |
| experience_bullets | Through the parent experience and its profile |
| application_responses | Through the parent application and its profile |
| jobs, application_questions | Shared public-content catalogs, readable by signed-in users; writes reserved for trusted server administration |

All 15 public tables have RLS enabled. Anonymous roles have no table access. Explicit table grants work with Supabase's new opt-in Data API exposure defaults. Owner policies use both `USING` and `WITH CHECK`, so changing a foreign key cannot move data to another user.

`private.owns_profile(uuid)` is a stable **security-invoker** function with an empty search path. It queries the RLS-protected profile using `auth.uid()`. It neither trusts browser owner IDs nor uses editable JWT user metadata. The private schema is not exposed by the local API configuration; keep it unexposed in hosted settings. No security-definer function, public ownership RPC, or RLS-bypassing application client was added.

Service-role database privileges exist for future controlled ingestion. The app never instantiates a service-role client. Do not place credentials or candidate-specific material in shared catalogs, `job_sources.configuration`, or `jobs.source_metadata`.

## Constraints and indexes

- UUID primary keys; foreign keys; creation timestamps and update timestamps on mutable tables. The update trigger uses a fixed empty search path.
- `candidate_profiles.user_id` is unique and defaults to `auth.uid()`. Application code supplies it only from server-confirmed authentication.
- `applications(profile_id, job_id)` is unique. PostgreSQL arbitrates concurrent insertion; future application services should handle SQLSTATE `23505` by retrieving the existing application.
- A composite application → resume foreign key requires the **same profile and job**. A composite analysis → preference foreign key requires the **same profile**.
- `(provider, external_job_id)` is unique when the external ID exists. Fingerprints and canonical URLs are indexed but not unique: uncertain matches remain separate. Provider is extensible text rather than a closed enum.
- Analysis identity is `(job_id, profile_id, preference_id, model, prompt_version)` with `NULLS NOT DISTINCT`, preventing duplicate current results when no preference is supplied. Different models/prompts/searches may coexist. Reanalysis of the same identity updates the current result; historical analysis revisions require a later explicit revision model.
- Resume versions are separate rows. Deleting a referenced resume or preference is restricted to preserve relationships; deleting a profile cascades its records, covered by integration tests.
- A candidate may have multiple named saved searches. No one-search-per-user constraint exists.
- Candidate answer canonical keys are unique per profile when present. At most one typed answer value is populated. `safe_to_reuse` requires explicit verification. These flags do not authorize automatic sensitive declarations.
- Application statuses: `interested`, `preparing`, `ready_to_apply`, `applied`, `interview`, `offer`, `rejected`, `withdrawn`, `archived`.
- Response provenance: `VERIFIED`, `AI_DRAFT`, `NEEDS_INPUT`, `UNSUPPORTED`. Default is `NEEDS_INPUT`, with review required and not reviewed. Confidence is 0–1; fit scores are 0–100.
- Facts and profile entries default to unverified. Unknown personal values are nullable; no inferred career facts are created on signup.
- Sensitivity: `public`, `private`, `sensitive`, default `private`. This is a content-handling label, not permission to share a row publicly.
- Nonnegative salary/commute bounds, date ordering, current-employment/end-date consistency, object metadata and analysis-array shapes are checked.
- All foreign keys have covering indexes. Unused-index information is expected on this new, empty schema and does not warrant removing ownership or relationship indexes.

The Phase 2 status names supersede Phase 0's conceptual status wording. Business state transitions, validation readiness and automatic processing are not implemented.

## Types

`src/types/database.ts` was generated from the deployed Supabase schema. Regenerate from the selected project after future migrations; do not manually broaden generated database definitions. `src/lib/domain.ts` adds runtime Zod schemas and narrow types for application status, provenance and sensitivity because database text constraints are generated as general strings. JSONB remains `Json` until a later feature defines and validates its exact payload.

## Authentication

The SSR client uses the publishable key and request cookies. The Next.js proxy refreshes cookies on both the request and response and rejects unauthenticated workspace requests, including client-navigation requests. Responses use private/no-store caching. The workspace layout calls `requireUser()`, which uses `auth.getUser()` and rejects missing, invalid and anonymous identities. Future data actions must call the same guard independently; a protected layout alone does not authorize server actions.

Email/password sign-in and explicit signup are implemented. Signup requires a trusted `APP_URL`; callback URLs are never built from a form-provided destination. PKCE confirmation exchanges a code at `/auth/callback`; arbitrary `next` parameters are ignored. A blank profile is initialized idempotently after verified sign-in/confirmation. It does not copy user metadata or invent personal details. Sign-out affects the current device session.

### Required operator setup

The agent does not print, retrieve or persist API keys. Supply the following through your own local/deployment environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `APP_URL` — application origin only, for example `http://localhost:3000` locally, HTTPS in deployment.

In **ai-job-finding → Authentication → URL Configuration**, set the Site URL to that application origin and allow the exact `${APP_URL}/auth/callback` redirect. Keep email/password auth enabled and email confirmation enabled. Use the same browser for signup and the PKCE email link. Configure SMTP before production email delivery; provider mail limits and confirmation delivery were not exercised in this phase.

No service-role key is needed to sign in or use RLS. The reserved `SUPABASE_SERVICE_ROLE_KEY` variable remains server-only and unused. Missing public configuration shows an honest setup-needed login state and denies workspace access. Missing `APP_URL` hides signup while configured existing-account sign-in can still work.

Password recovery, OAuth, MFA, account deletion UI, profile editing, AI integration, provider ingestion and Storage policies are outside this phase. Account/profile deletion is tested at the database level only.

## Verification

`npm test` includes PGlite, an embedded PostgreSQL engine. It starts from an empty database, supplies a minimal local `auth.users`/`auth.uid()` test contract, applies both migrations, and runs `supabase/tests/ownership.sql`. The same transactional SQL was also executed against the real hosted Supabase database. It uses two synthetic identities and rolls everything back. A hosted query confirmed zero remaining test users.

The SQL exercises RLS on all tables, direct and nested ownership, cross-owner reads/writes/reassignment, anonymous denial, catalog write denial, duplicate profile/provider/application identities, NULL-preference analysis uniqueness, composite relationships, score/provenance limits, unverified defaults and profile cascades. Vitest separately covers server authentication guards, profile ownership derivation, status schemas, form behavior, error sanitization and session cookie propagation.

Standalone Playwright remains subject to the host's Chromium launch restriction from Phase 1. Authenticated shell E2E tests require a dedicated test account supplied as `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` at runtime and skip explicitly when absent. Traces are disabled to avoid storing authentication inputs. Do not use a personal account for automated tests.

## References

- [Supabase SSR client and session guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&queryGroups=framework)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Explicit Data API grants change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)

## Phase 5 discovery additions

`job_sync_runs` records owner-scoped attempts and `job_discoveries` stores validated DTOs awaiting normalization. Composite foreign keys prevent cross-owner linkage. A partial unique index permits one running sync per profile/provider. Private quota/cooldown tables have explicit denial policies; a narrowly scoped authenticated RPC reserves requests atomically. See `docs/job-discovery.md` and `docs/phase-5-report.md` for both deployed migrations and verification. Normalized `jobs` remains untouched by discovery.

## Phase 6 normalization

`20260919033953_job_normalization.sql` makes newly discovered jobs candidate-owned, retaining read-only legacy catalog rows with null ownership. Provider identities and discovery results use composite ownership relationships. The authenticated normalization RPC runs with invoker privileges and a candidate-scoped advisory transaction lock. See `docs/job-normalization.md` for identity/update rules and `docs/phase-6-report.md` for checks.

## Phase 7 parser cache

Migration `20260919035922_job_description_parses.sql` is applied to ai-job-finding. It adds owner-scoped parsing records, a composite job/owner foreign key, strict JSON/evidence checks, versioned unique cache identity and transactional expiring claims. RLS uses candidate-profile ownership; no service-role key is required. Generated types include the table and claim RPC. Transactional `supabase/tests/job_parser.sql` passed locally and on the hosted project, including malformed-output rejection, cache reuse and cross-user denial. See `job-parser.md` for limits and retry behavior.
