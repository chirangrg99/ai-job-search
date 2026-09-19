# Job discovery — Phase 5 architecture, updated for Phase 6

## Use

Create and enable a saved search in Job Preferences. On Jobs, choose that search, page (1–100), results per query (1–50), then **Sync jobs**. Each title/location combination requests one page; pagination is always explicit. **Add job** opens a manual structured-entry drawer. Title and description are required; unknown optional information stays null. Confirm explicitly if the description is complete.

Configure `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` only in the server environment. Neither is public, stored in job-source configuration, returned to the browser, or included in error messages. No service-role credential is used. Restart the server after environment changes.

## Contract and boundaries

`JobProvider` defines identifier, configuration validation, search, mapping and pagination. `AdzunaJobProvider` owns its response schemas and HTTP details. `ManualJobProvider` maps explicit user input and assigns an internal external ID; its search returns an empty page because it has no upstream service.

Both produce the validated `DiscoveredJob` DTO. Unknown fields are stripped. `DiscoveryRepository.accept()` is the normalization pipeline intake boundary: it saves DTOs in `job_discoveries` with `pending_normalization`, then the Phase 6 normalizer resolves them into jobs. It never writes unvalidated provider payloads into UI models. Repeated provider IDs within one run coalesce; cross-run job deduplication uses the rules in `docs/job-normalization.md`.

Server actions authenticate independently. Repositories derive the candidate profile from the server-authenticated user; ownership is enforced again by RLS and composite foreign keys. The browser supplies only search IDs and controls, never trusted user/profile IDs.

## Query planning

Only enabled, owned saved searches may run. Titles and locations expand into at most 12 combinations. Titles use `title_only`; required keywords use `what_and`; locations use `where`. A configured distance rounds upward to the API's integer kilometre radius. This geographic radius is not a measured road commute. Empty titles/locations leave those controls unrestricted.

Single-word excluded keywords use `what_exclude`. One supported employment selection uses its matching full-time, part-time or contract flag. Multiple employment selections remain unrestricted upstream because the saved search means OR. Excluded titles, multiword exclusions, remote preferences and fit thresholds remain later filtering concerns. The existing Phase 4 deterministic filter is reusable after normalization; discovery does not claim a job passed it.

The provider-neutral query retains salary minimum, currency and period together. Adzuna does not forward this floor automatically: the official response schema gives currency but no salary period, so the DTO preserves `salaryPeriod: null` instead of comparing hourly and annual amounts. Estimated-salary flags are retained. Canada results with salary amounts use CAD.

## HTTP, limits and failures

Requests use the fixed HTTPS Canada endpoint, no cache, no redirects, a 10-second timeout and a 2 MB response limit. Adzuna requires credentials as query parameters; never log request URLs or raw transport errors. Successful JSON envelopes are validated and malformed entries are skipped with counts. The API returns description snippets, so Adzuna descriptions always have `descriptionComplete: false`. See [Adzuna overview](https://developer.adzuna.com/overview), [search documentation](https://developer.adzuna.com/docs/search) and [published API schema](https://developer.adzuna.com/swagger/spec/test2.json).

Network errors, 408 and 5xx responses receive at most three total attempts, with 1- and 2-second backoff. Authentication and other permanent errors do not retry. A 429 records a shared durable cooldown from Retry-After (60 seconds by default) and stops the run. Every attempt reserves quota atomically, including retries.

Database-backed limits shared by this application enforce 25/minute, 250/day, 1,000/week and 2,500/31 days. The 31-day window conservatively covers the published monthly allowance. Other consumers of the same credentials are outside this counter; provider 429 responses still stop requests. Limits follow [Adzuna's default terms](https://developer.adzuna.com/docs/terms_of_service); no paid quota is assumed. Displayed Adzuna records include source attribution.

Runs stop starting further queries after three minutes. One active run per profile/provider prevents concurrent submissions; interrupted runs can be marked failed on retry after six minutes. Earlier successfully saved pages survive a later failure. History records completed/partial/failed states, timestamps, counts, sanitized failure details and pagination. `job_sources.last_synced_at` advances only after a fully completed run. No cron or automatic background retry exists.

## Storage and security

`job_sync_runs` and `job_discoveries` are owner-scoped RLS tables. The private quota tables deny direct client access. A narrowly scoped private security-definer function checks the authenticated profile, uses a fixed search path and an advisory transaction lock. A public security-invoker wrapper exposes only the bounded quota operation. Credentials are never stored in these tables.

The Jobs screen shows the latest 50 stored jobs and 10 runs. Pending observations can be processed explicitly. Likely duplicates remain separate; the UI does not invent fit scores or analysis. Link fields reject unsupported protocols, embedded credentials and credential query parameters; descriptions render as text.

## Verification

Mocked HTTP tests cover success, pagination, empty and malformed responses, retry bounds, credential/configuration errors and quotas. Repository, service, action and UI tests cover ownership, partial progress, query derivation and manual entry. Transactional SQL tests verify RLS, foreign keys, concurrency and quota windows; fixtures roll back. No real API credentials are used in tests.

For the parameter-by-parameter review and guidance for future adapters, see `docs/provider-api-audit.md`.
