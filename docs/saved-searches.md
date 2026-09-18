# Saved searches and deterministic filtering

Phase 4 implements `/preferences`. One authenticated candidate profile owns any number of independent `job_preferences` records. There are no seeded career strategies or duplicate candidate profiles.

## Saved-search operations

Create, edit, duplicate, enable/pause and confirmed delete are available from summary cards. Duplicates copy validated criteria into a new paused record with a “(copy)” suffix. They do not share an ID or mutable data with the original. A search linked to an existing analysis cannot be deleted because the existing foreign key preserves analysis history; pause it instead.

All mutations require server-verified authentication. The repository derives the candidate profile from that identity. Updates/deletes match profile, search ID and the previously loaded `updated_at`; stale changes fail safely. RLS remains the final ownership boundary. No service-role client is used. Browser-supplied owner IDs and metadata are not accepted. Saving errors preserve editor contents; mutation errors retain the prior confirmed card state. Destructive actions and discarding edits require confirmation.

Lists use one entry per line so locations containing commas remain intact. Target titles, locations, work modes and employment types are alternatives; every required keyword must be present. Excluded terms reject on any match. Empty lists mean unrestricted. Numeric limits are optional, including a valid value of zero. Salary minimum requires explicit currency and period. Currency accepts a three-letter uppercase code; no exchange rates or currency conversion are assumed.

## Reusable filter contract

`src/features/preferences/filter.ts` exports `filterJob(job, search)`. It has no UI, provider, database or AI dependency. Pass a validated Preference and provider-neutral FilterJob facts. The returned object contains complementary `pass`/`fail` booleans and structured reasons (`code`, `outcome`, `message`). Reason outcomes are `fail`, `unknown` or `pass`. Any rejection makes `fail` true; otherwise `pass` means eligible for further review, not that unknown conditions have been satisfied.

| Rule | Deterministic behavior |
| --- | --- |
| Paused search | Fails for that search; other searches remain independent. |
| Target title | Known title must contain at least one target phrase. Missing title is unknown. No semantic synonym expansion. |
| Excluded title/keywords | Any observed phrase rejects. Matching is case-insensitive, Unicode-normalized, regex-escaped and word-bounded; “IT” does not match “writer”, and C++ retains its punctuation. |
| Required keywords | All must appear in title or description. Missing terms reject only with a nonempty, explicitly complete description. Incomplete text produces unknown reasons. Phrases never span the title/description boundary. |
| Work mode | Compare known canonical remote/hybrid/onsite values. Missing mode is unknown. |
| Employment type | At least one accepted type must overlap. Reject only if a nonempty list is explicitly complete. |
| Locations | Case/whitespace-normalized exact match against canonical labels. Reject only if the adapter marks a nonempty comparable location list complete. Free-form or unresolved geography stays unknown. Remote work does not bypass geographic restrictions. |
| Commute | Known nonnegative finite distance greater than the maximum rejects. Equality passes. Fully remote jobs skip commute. Unknown distance is not guessed from city text. |
| Salary | Compare only identical currency and period. Reject only if the advertised maximum is below the minimum. An overlapping range, low lower-bound-only salary, missing/incompatible units or invalid range remains unknown. No assumed working hours, period conversions or exchange rates. |
| Minimum fit | Compare a supplied valid score, inclusive at the threshold. Missing/invalid score stays pending; this pre-AI filter never generates a score. |

Future source adapters must supply normalized facts and mark completeness truthfully. Raw provider location strings must not be marked complete without comparable canonical labels. Distance needs a reliable distance from the candidate's chosen commute origin; this phase stores the limit but does not geocode or infer an origin. Fit scores must correspond to the candidate and current analysis. Jobs that pass any enabled search can remain eligible; never combine independent strategies into one AND rule.

## Persistence and validation

Migration `20260917135012_saved_search_currency.sql` adds nullable `salary_currency` with a three-letter format constraint. Existing records remain unknown rather than receiving an inferred currency. The existing table, RLS policies, ownership index and saved-search relationships are reused. Types were regenerated from `ai-job-finding` after application.

Tests cover filters, form conversions, validation, independent cards, save failure recovery, confirmation, repository ownership, stale writes, duplicate copying, authentication actions and transactional PostgreSQL CRUD/RLS assertions. The SQL fixture is rolled back and creates no lasting candidate data.

## Scope

No Adzuna, discovery scheduling, AI calls, geocoding, salary conversion, fabricated match counts or run history. Unknown data is included for review with reasons; a configurable unknown-data exclusion policy and seniority-specific fields from the broader design specification are outside this phase's requested fields.
