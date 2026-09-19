# Job-description parser

Open a saved job from Jobs, then select **Parse requirements**. The server sends only its description to OpenAI; no candidate profile is included. Results remain AI drafts with expandable verbatim evidence. A partial-source warning stays visible for provider snippets.

## Boundaries and validation

`AIClient` is replaceable; `OpenAIClient` uses Responses Structured Outputs with a strict Zod schema. `parseJobDescription()` owns authorization ordering, cache lookup, reservations, validation and persistence. The repository uses the authenticated Supabase client, never a service-role client.

Output contains explicit title/company/location/employment type/salary, responsibilities, required and preferred qualifications, skills, technologies, licences, certifications, education, experience, physical and schedule requirements, authorization wording and ambiguous passages. Missing scalar data is null; absent lists are empty. Each extracted text must occur inside its quoted evidence, which must occur exactly in the source. Salary numbers, currency codes and periods need literal evidence. Text is preserved instead of speculative paraphrasing; priority is required, preferred, unspecified or ambiguous.

Zod validates responses and cached output. PostgreSQL independently rejects malformed structures and ungrounded evidence at persistence. These checks establish structure and quotation fidelity, not semantic correctness or completeness. Users must review classifications and original postings. No candidate fact is changed.

## Cache and concurrency

Cache identity combines owner, internal job, SHA-256 of exact source plus completeness/schema version, requested model, prompt version and schema version. Requested and actual response models are stored separately with source snapshot and analyzed timestamp. Changed descriptions do not reuse old extractions; original rows remain auditable.

A transactional claim function serializes reservations. Active claims have a two-minute lease. Completion requires the matching lease token. Successful cache hits make no AI request. Failures require explicit retry, with a 30-second cooldown and at most three attempts per version; interrupted claims require lease expiry. The SDK has no automatic retries and a 60-second timeout. An uncertain network failure may still incur provider cost; reload before retrying.

Inputs are limited to 30,000 characters without truncation; output is limited to 8,000 tokens and 60 items per requirement group. Refusal, incomplete output and invalid evidence are rejected. Source instructions are treated as untrusted data; the model has no tools. Errors are sanitized and neither credentials nor raw SDK failures are logged.

## Configuration and testing

Set server-only `OPENAI_API_KEY` in local/deployment secret configuration. Optional `OPENAI_JOB_PARSER_MODEL` overrides the pinned default `gpt-4.1-mini-2025-04-14`; use a model supporting Structured Outputs. Restart the app after changes. Requests set `store: false`; provider retention policies still apply.

`npm test` uses artificial fixtures and mocked HTTP; it makes no OpenAI calls. `npm run test:ai` is separate and skips unless both `RUN_AI_INTEGRATION=1` and `OPENAI_API_KEY` exist in the process environment. It does not load `.env.local` automatically. Enabling it makes billable requests with artificial fixtures. Never put credential values into commands, reports or commits.

Implementation references: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) and [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

## Identity extraction correction (prompt v2)

The parser now distinguishes named occupations and hiring organizations from section headings, anonymous business descriptions, recruiters and technology vendors. Positive and negative prompt examples explicitly require null when identity is unstated. Narrow application validation rejects known heading/anonymous-description errors before persistence; it does not claim to recognize every possible semantic mistake. Old v1 records are retained for audit but are excluded by the v2 cache key, with no automatic paid reparse. Provider title/company metadata stays unchanged.

The original approved live retry succeeded but exposed an identity classification error; the correction adds 14 offline regression cases and a separate opt-in live snippet regression. The new prompt has not yet been live-tested. No database migration or design change is required.
