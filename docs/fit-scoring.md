# Fit scoring — Phase 8

## User flow

Open a parsed job in Job Detail. Choose **Profile only** or a saved search, choose **Rules only** (default) or **Rules + semantic review**, then select **Assess fit**. The latter explicitly sends a bounded shortlist of relevant verified excerpts to OpenAI. No model request occurs on page load or when changing selectors. No matching runs until the current posting has a validated parse.

The result presents evidence fit, recommendation, category points, score caps, matched/partial requirements, required/preferred gaps, strengths, concerns, original requirement wording, source IDs and source revision. Profile source links navigate to the corresponding section. A missing result for today's inputs says “Not assessed for current inputs”; no fabricated score is displayed. Insufficient evidence displays that label instead of a numeric judgement.

## Deterministic scoring contract

`matchJobToProfile()` is a pure function in `src/features/fit/engine.ts`. All policy constants are in `FIT_CONFIG` (`fit-v2`).

| Category | Base weight |
| --- | ---: |
| Required qualifications | 30 |
| Preferred qualifications | 10 |
| Relevant experience | 20 |
| Skills / technology | 15 |
| Licences / certifications | 10 |
| Education | 5 |
| Location / work arrangement | 5 |
| Compensation | 5 |

Each criterion's credit: exact 1, partial 0.5, transferable 0.25, unsupported/unknown 0. Required/ambiguous criteria have priority multiplier 3; preferred/unspecified have 1. For each populated category, the unnormalized earned amount is `base weight × mean(priority × credit)`, and its available amount is `base weight × mean(priority)`. Divide the sum earned by the sum available, multiply by 100 and round once. Absent categories are excluded; an applicable unknown stays in the denominator and earns zero. Repeated requirements with reviewed spelling aliases or neutral wrappers are counted once across parser groups; semantic equivalence is not guessed.

The UI shows each category's normalized points before caps. This is evidence coverage, not a hiring probability or a statement about a candidate's worth.

### Caps and recommendations

- Missing or partially supported required licence/certification: maximum 39.
- Any unresolved required/ambiguous criterion: maximum 79.
- No verified evidence or no parsed requirements: insufficient evidence; stored score 0, recommendation `maybe`, numeric score hidden in the UI.
- `strong_apply` ≥80; `apply` ≥65; `maybe` ≥40; `skip` below 40.
- The saved search's minimum fit score is a separate concern, not a replacement threshold.

### Evidence and comparisons

Only verified facts, credentials, experience, verified experience bullets, projects and education are eligible. A bullet also requires a verified parent experience. Categories/keywords are retrieval hints, never proof of possessing a skill. Personal contact information and professional-summary text are excluded. Exact matching uses explicit claims/structured skills, normalized casing/whitespace and a small reviewed spelling-alias map (for example JS → JavaScript); it does not use substring overlap or infer adjacent skills. Compound AND conditions require every atom; an OR alternative can independently satisfy a criterion. Parentheses preserve explicit grouping. Mixed ungrouped AND/OR conditions stay unknown instead of assuming precedence. Specific degree abbreviations and licence spelling variants normalize without upgrading degree level, field, licence class or jurisdiction. Sources with negation/learning wording do not earn deterministic credit even when their title sounds positive; mixed positive/negative source prose may need separate structured facts.

Numeric experience uses verified roles with an explicitly matching occupation, conservative date bounds, the persisted evaluation date for ongoing roles, and unioned intervals so overlapping jobs are counted once. Calendar-month anniversaries avoid under-crediting exact six-month/year intervals; future roles and dependent bullets are excluded. Unknown dates earn no duration. A bullet or skill tag never establishes the duration of a technology or activity within a role. Partial dates use the latest possible start and earliest possible end. Credentials outside their validity dates are excluded.

Location credit requires an exact target label; geographic equivalence and commute are unknown without supporting data. Work mode uses the saved structured job value. Compensation uses parsed explicit salary only, with identical currency and period; range overlap earns partial credit. No currency conversion, annualization, estimated pay or inferred authorization is used. Preferences are labelled as saved preferences, not verified professional qualifications.

## Optional semantic layer

`SemanticClient` is replaceable. The OpenAI adapter uses Structured Outputs and strict Zod validation (`fit-semantic-v1`, pinned `gpt-4.1-mini-2025-04-14`). It never requests or accepts a score or an exact-match classification. It handles unresolved customer/client/team/communication activities of at least five words, not skills, numeric tenure, credentials, education or sensitive eligibility declarations. At most 24 requirements and six lexically relevant verified sources per requirement are sent; sensitive sources and excerpts over 1,500 characters are excluded, not truncated.

A response must cite one of the actual supplied source IDs and a literal quote. Unknown IDs, invented quotes, duplicate targets and extra score fields are rejected. Accepted partial/transferable assessments remain **AI draft** and receive fixed credit from code. They cannot satisfy a required licence. Omitted comparisons remain unknown. Semantic explanations still require review and cannot promote a profile item to verified. Provider failure saves no analysis; rules-only scoring remains available. One call has a 45-second timeout and no automatic retry. Concurrent first-time requests can incur separate AI calls; a database unique key prevents duplicate saved analyses, and subsequent requests reuse the first stored result.

OpenAI reference: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Database ownership follows [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Persistence and reproducibility

`job_analysis` stores the requested output fields, full result/breakdown, verified evidence snapshot, selected search, parsed requirements, evaluation date, semantic response, engine version and SHA-256 input hash. The hash also includes posting source, parser model/version, matching mode, model/prompt and scoring configuration. Keys are canonicalized; source IDs are sorted. The date is explicit, so recalculation on a later day can change ongoing tenure/expiry and deliberately creates a new input version.

The same snapshot and saved semantic classifications reproduce the score. Re-running a model is not claimed to be deterministic; unchanged inputs reuse persisted output. Before saving, the service reloads inputs and rejects a changed hash. Future changes also make earlier results unavailable as current. Concurrent inserts keep the first saved result. Old versions remain auditable in the database; a history browsing UI is not part of this phase.

Ownership comes only from the authenticated server session. The repository checks owned job/current parse, profile and saved search. RLS restricts analysis rows to the owner's profile and an owned or legacy shared-catalog job; foreign saved searches are rejected by the existing composite FK. No service-role key is used. Stored evidence is private and is removed with its profile. The new migration preserves existing analysis records.

## Limits

The deterministic matcher deliberately under-credits complex/free-form statements that it cannot establish exactly. It does not solve general synonym recognition, technology-specific sub-periods inside a role, arbitrary boolean qualification syntax, global language translation or geographic inference. Evidence completeness is not guaranteed by the job parser. A bounded full-source audit now catches explicit English/French experience-threshold conflicts for software development, Python and Linux/Unix under recognized required/preferred headings, including variants omitted by the parser. It preserves the literal passages in one review criterion per activity/priority, credits neither threshold and does not rewrite the parser output. Preferred conflicts remain preferred gaps; required conflicts prevent a strong-apply recommendation. Other bilingual omissions and unsupported wording remain limitations. Ambiguous requirements stay unresolved. No real candidate data was sent during development; semantic HTTP tests use fixtures. No Phase 9 retrieval/resume generation or application readiness is implemented.
