# Job normalization and deduplication — Phase 6

## Data flow

Discovery DTO → pure normalization → transactional identity resolution → stored job + discovery outcome. Both manual entry and Adzuna sync use this path. Existing observations can be processed with **Process pending jobs**, 100 per action; interruptions preserve completed work and leave remaining items pending. Processing a completed discovery returns its original outcome.

The Jobs list reads normalized job records, not observation rows. Sync history retains received-observation counts. Retaining an audit observation per sync is intentional; this does not create another job. Source observations remain available for provenance and future search attribution.

## Normalization

Pure Node/TypeScript functions in `src/server/normalization/normalize.ts` normalize NFKC text, whitespace, case and separators. Company, title and location use conservative word normalization; meaningful `+`, `#`, numbers and accents are retained. No geocoding, company-suffix stripping, synonym guessing or city equivalence is performed.

URLs use standard URL parsing. Host case/default ports normalize; known UTM/click-tracking keys are removed and query keys are sorted. Unknown query parameters, path case, protocol and routing fragments remain meaningful. Only common presentation anchors are removed. Homepage/listing URLs are not considered sufficiently strong posting identities. Original application URLs remain the outbound links, preserving provider attribution.

Salary bounds are finite and nonnegative; reversed maxima become unknown in the pure normalizer (invalid discovered DTO ranges are rejected before persistence). Currency is normalized to a three-letter uppercase code. Salary periods remain explicit; no exchange-rate or annualization assumptions. Employment aliases normalize spacing/hyphens for recognized values only. Unknown remains unknown.

The original display DTO is stored with every observation. `source_metadata.first_original` preserves the first source snapshot; `normalized_data.raw` holds the latest accepted primary-source snapshot. Jobs retain original-facing strings in their display columns alongside normalized matching keys.

## Fingerprint v1

SHA-256 over a fixed JSON tuple: normalized company, title, location, uppercase country and whitespace/case-normalized description. The stored value is prefixed `v1:`. Salary, tracking parameters and provider IDs are excluded from the content fingerprint. A separate signature covers mutable content and metadata to detect updates.

Fingerprint-only automatic matching requires nonempty company/title/location and a complete description of at least 80 characters on both records. This threshold is a conservative product rule, not a claim of semantic similarity. Snippets and missing identity fields cannot trigger content-only merges. Identical boilerplate can still be ambiguous; explicit conflicting provider IDs always win over content similarity.

## Identity order and outcomes

1. Reliable provider/external ID resolves through `job_provider_identities`. Adzuna is currently the only adapter with a trusted upstream ID contract. Manual UUIDs are observation identifiers, not posting identity.
2. A posting-specific canonical URL may resolve one candidate when normalized company/title/location/country agree and no reliable ID conflicts.
3. A strong complete-content fingerprint may resolve one candidate under the same conflict rules.
4. Ambiguous candidates or matching company/title/location remain separate and are flagged; unrelated records are new.

| State | Behavior |
| --- | --- |
| `new` | Insert a job. |
| `exact_duplicate` | Reuse a job; preserve source display data. |
| `updated_existing` | Update mutable primary-source fields on the same job. |
| `likely_duplicate` | Insert separately and link a possible earlier job; never silently merge. |

Different reliable IDs from the same provider represent distinct postings/reposts even if their text and URL match. Same provider ID with changed salary/description is an update. Different locations do not collapse merely because company/title agree. Multiple strong candidates remain ambiguous. Cross-provider observations can share a job but cannot overwrite its primary-source snapshot.

`discovered_at` stays at the earliest observed timestamp; `last_seen_at` advances. Older observations cannot overwrite newer mutable fields. Each original observation is retained, including when a later source snapshot omits information.

## Persistence and security

New jobs belong to one candidate profile. Existing Phase 2 catalog rows with a null owner remain read-only to authenticated clients for compatibility. Scoped provider-ID uniqueness allows different candidates to save the same public posting independently.

The security-invoker RPC derives the profile from `auth.uid()`, locks that candidate's collection for the transaction and checks the owned discovery. RLS and composite foreign keys protect identities and observation/job links. No service-role key or security-definer function is used for normalization. A transaction either persists the job, identity and processing result together or rolls back. Candidate-level locking prevents two parallel processing calls from both deciding a job is new.

See [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [PostgreSQL advisory locking](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS).

## Limits

No fuzzy/AI matching, automatic merge review action, URL fetching/redirect resolution, geocoding or expiry inference. Likely duplicates are shown with a link to the related job when it is in the current list and remain separate. Jobs shows the latest 50 saved records; pending processing is bounded to 100 observations per action. New providers must explicitly define reliable external-ID behavior before enabling that strongest identity path. Changing fingerprint rules requires a new version and an explicit reindex/migration strategy; do not silently reinterpret v1.
