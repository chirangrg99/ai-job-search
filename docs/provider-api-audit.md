# Provider API audit — 2026-09-18

## Review scope

Reviewed the [interactive reference](https://developer.adzuna.com/activedocs), its [OpenAPI definition](https://developer.adzuna.com/swagger/spec/test2.json), and linked search, salary, history, histogram, regional, company, category, Jobsworth, version and widget guides. The search endpoint is the relevant integration for this phase. No additional source provider was installed.

## Parameter comparison

| Parameters | App decision |
| --- | --- |
| country, page, app_id, app_key | Existing Canada path and server authentication retained. |
| results_per_page | Existing control retained; 50 is our safety cap. |
| title_only / what_phrase | Changed title targeting to title_only; phrase searches also inspect descriptions. |
| what / what_and / what_or | Required keywords now use what_and; title alternatives remain separate requests. |
| what_exclude | Added single-word keyword exclusions. |
| where, distance | Retained location/radius. Omitted distance uses documented 5 km default. |
| full_time, part_time, contract, permanent | Apply one supported employment option; never equate full-time with permanent. |
| sort_by, sort_dir | Date; omit direction (see live compatibility finding below). |
| salary_min/max/include_unknown | Deferred until salary units can be established safely. |
| location0–7, category, company, max_days_old | No equivalent saved controls currently; not invented. |

The reference also documents HTTP 410 as authorization failure; corrected its error classification. [Parameter and response-code source](https://developer.adzuna.com/swagger/spec/test2.json).

## Safe semantics across job families and providers

The shared query now carries excluded titles, excluded keywords, employment alternatives, work modes, fit threshold and salary with explicit currency/period. It contains no Adzuna parameter names. Query generation works identically for frontend, IT support, delivery, warehouse or other user-entered titles. Generic provider errors no longer name Adzuna.

Each future adapter must translate only criteria with compatible documented semantics. It must not silently reinterpret title exclusions as full-description exclusions, OR selections as AND, commute distance as road distance, or hourly pay as annual pay. Unsupported criteria stay available for later deterministic filtering/matching. No new provider or AI integration is included in this fix.

For example, excluded title “Senior” is not sent through a global keyword exclusion: a junior description might mention working alongside senior developers. Likewise, “customer service” is not split into two independent negative words. Mixed full-time/contract choices are not sent as simultaneous restrictive flags. These are deliberate safeguards against dropping potentially suitable jobs.

The application still stores an intake awaiting normalization. Unsupported criteria are therefore **not enforced yet**, and received records are not presented as matches. Experience ranges such as 0–2 years have no current saved-search field or documented Adzuna search parameter. Do not substitute an exact keyword requirement for that range.

## Other endpoints and response review

Salary history, histograms, regional summaries and top-company statistics concern aggregate employment data rather than fetching postings; categories supplies taxonomy, and version supplies API metadata. Jobsworth and widget guides do not require extra discovery requests. No analytics or widget integration was added. See [API overview](https://developer.adzuna.com/overview) and [salary data guide](https://developer.adzuna.com/docs/salary).

Preserved JSON encoding, HTTPS, paging, Adzuna redirect links, description-snippet markers and estimated-salary flags. Search documentation explicitly limits descriptions to snippets; full descriptions cannot be assumed. [Search response guide](https://developer.adzuna.com/docs/search). Raw error bodies remain suppressed; unsuccessful HTTP response streams are now cancelled before retry/exit.

## Changes and validation

Changed `provider.ts`, `query-plan.ts`, the Adzuna adapter and its tests, service tests and discovery documentation. Created this report. No UI changes, database migrations, credentials or dependencies.

Regression tests cover title/keyword mapping, exclusions, employment alternatives, HTTP 410, neutral error text and preservation of a delivery search's hourly salary/work-mode criteria for another adapter. All HTTP is mocked with dummy credentials; this audit makes no live-job-result claim.

Checks: `npm test` (267 passing tests), `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build`. The final response records completion and the GitHub checkpoint. Existing Phase 5 scope is preserved.

## Live compatibility correction

Following a reported sync failure, a bounded live diagnostic returned HTTP 400 for `sort_by=date&sort_dir=down`. The same Canada search without `sort_dir` returned HTTP 200 and 28 results. This contradicts what the published parameter enum appeared to permit; removed the direction parameter and retained date sorting. No keys or credential-bearing URLs were printed or persisted. Live diagnostics are separate from automated tests, which remain mocked. HTTP 400 now produces an actionable rejected-parameters message without retry. Regression suite: 269 passing tests; lint, typecheck, formatting and production build passed.

Saved titles are separate list entries (one per line in the editor). A comma-separated list inside a single entry is still one title query. Geographic locations should contain places; use the remote-work preference for remote work rather than a location named “Remote”.
