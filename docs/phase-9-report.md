# Phase 9 — Dashboard and job review

Implemented 2026-09-28. Scope stops at reviewing stored jobs and starting an application preparation record.

## Delivered

- Dashboard with stored-data counts: discoveries in the last seven days, current strong-apply recommendations, ready applications, and submissions in the last 30 days (including applications that have since progressed to interview or offer). Best Matches, actionable review items and source sync history use owned records. No illustrative jobs or invented progress.
- Jobs: labelled title/company/location search, discovery saved-search membership, location, work arrangement, employment type, provider, application status, current fit state, minimum score, six sort orders and 20-row pagination. GET query parameters preserve filter state across page links. Applying filters resets pagination; out-of-range pages clamp safely. Desktop uses a semantic table; mobile uses a compact list.
- Job Detail: posting metadata, salary units/estimated marker, original-posting link, score/recommendation and preparation control. Keyboard-operable Radix tabs separate Overview, Match Analysis and Description. Parsing/source editing and existing assessment controls remain available.
- Match Analysis groups exact, partial/transferable and unsupported/unknown requirements; exposes source excerpts, candidate IDs/revisions and links. VERIFIED describes candidate evidence, AI_DRAFT describes semantic comparison, and UNSUPPORTED / NEEDS_INPUT remain explicit.
- Prepare Application creates one `preparing` application or promotes `interested`. Repeated requests preserve existing later statuses and the unique profile/job constraint. The UI explains that package generation is not available yet; no resume generation, automated submission or automatic Ready to Apply transition is introduced.

## Data correctness and boundaries

`src/server/job-review/repository.ts` owns data access. Ownership comes from the authenticated candidate profile, with explicit profile filters in addition to existing RLS. No service-role client, new schema, new provider, AI call or paid component was added.

The repository reads all records in ordered batches of 200; filtering is not limited to the old latest-50 discovery list. For the personal MVP it filters/sorts the owned collection in server memory. At substantially larger scale this should move into indexed database pagination and materialized assessment summaries. Requests are not a single transactional snapshot; concurrent sync changes become visible on reload.

Current fit requires the same input hash as the detail scorer: current parser output/source, verified candidate evidence, chosen search, scoring configuration, model/method and evaluation date. The exact database source is checked only for jobs with assessments, with four concurrent requests maximum. This uses no AI. Stale, absent and insufficient-evidence assessments have separate states and cannot satisfy a numeric score filter. Profile/search/posting/date changes require reassessment under the existing Phase 8 contract.

Without a search filter, the latest valid current assessment is shown, with its search and comparison method. With a search selected, only that search's assessments count. Search membership is derived from processed discovery → sync-run records, not guessed from job text. Links open the exact displayed assessment context. Unknown salary units, currency, dates and work arrangements stay unknown.

## Design and catalogue review

Used the Figma design-to-code skill and inspected code context plus screenshots for [Dashboard](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=23-2), [Jobs](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=23-523) and [Job Detail](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=23-667). Reused Geist, existing semantic tokens, restrained surfaces, table/list patterns, 44px controls and the two-column detail layout. Adapted illustrative data and future actions to actual implemented capabilities.

21st MCP catalogue search completed before implementation. Metadata was reviewed only; no code was retrieved or installed.

| Candidate | Reference | Fit assessment | Dependencies / purchase |
| --- | --- | --- | --- |
| Data Table — wensity, ID 31861 | [Preview](https://cdn.21st.dev/user_3JFJF7Mbb5ImA8DO9hE1FECx2fT/data-table/default/preview.1790598692899.webp) | Search/sort/pagination fit the task; selection and expandable rows add unnecessary scope. | Dependencies unspecified in metadata. Code retrieval is a paid step or quota use; free use not confirmed. |
| Advanced Data Table Filter Builder — laziekiki, ID 27325 | [Preview](https://cdn.21st.dev/laziekiki/advanced-data-table-filter-builder/default/preview.1789633476157-51bee2e1-f142-4002-a9e1-7d458fddcfd9.png) | AND/OR builder is more complex than these fixed, labelled filters need. | Dependencies unspecified. Free code use not confirmed; no paid retrieval. |
| Table with Filters — felipemenezes098, ID 22162 | [Preview](https://cdn.21st.dev/felipemenezes098/table-12/default/preview.1785127196391-7f3872fb-bffb-40da-bd37-3b3d534a3dff.png) | Global search/status filtering is relevant; server-owned pagination already meets this scope. | TanStack Table stated in metadata; other dependencies unknown. Free code use not confirmed. |

Decision: existing shadcn Button/Input, native labelled controls, semantic HTML and installed Radix Tabs. No additional package was needed.

## Validation

- Full suite: **637 tests across 46 files pass**, including new filter/sort/pagination/empty-state/detail/keyboard-tab tests, exact fit freshness checks, ownership and preparation idempotency tests. Existing SQL schema/RLS tests remain passing.
- Typecheck, ESLint and formatting pass.
- Production build passes with `npm run build -- --webpack`.
- Production server starts on localhost. Unauthenticated Dashboard/Jobs/Job Detail/Applications redirect to login; login returns HTTP 200.
- Default Turbopack build is blocked by this sandbox's local worker port restriction (`Operation not permitted`), including after network permission was granted. Webpack builds the same application successfully.
- Chromium from the existing local Playwright installation exits at launch. No authenticated browser or screenshot verification is claimed; keyboard behavior is verified with React Testing Library. Visual/browser QA remains a manual check.

No credentials were printed, added or committed. The pre-existing deletion of `AGENTS.md` is excluded from this phase's commit.
