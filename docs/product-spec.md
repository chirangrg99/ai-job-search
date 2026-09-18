# AI Job Application Assistant — Product specification

Status: Phase 0 design proposal · 2026-09-15. No product implementation is authorized by this document. The project root `AGENTS.md` is the supplied engineering contract, preserved verbatim because the initial workspace contained no instructions or application repository.

## Product purpose

Help one candidate discover relevant jobs and prepare truthful, evidence-backed application packages. The candidate owns the verified master profile, reviews every package, applies on the original site manually, and records the outcome. Success means a usable package with traceable personal claims, clear gaps, and no duplicate application for a job.

## Scope and constraints

The MVP encompasses master profile maintenance, multiple saved searches, discovery, normalization, deduplication, preference filtering, structured job parsing, fit analysis, relevant fact retrieval, resume drafting, answer preparation, validation, manual application handoff, and application tracking.

Automatic submission, external-site browser automation, CAPTCHA handling, Hermes, LinkedIn/Indeed browser scraping, site credentials, autonomous account creation and legal declarations are excluded. No opaque autonomous agent. Future implementation uses the exact stack in `AGENTS.md`; this phase creates no application, database, Supabase setup, or API integration.

## Information architecture

| Navigation label | Proposed route | Purpose | Primary action | Child screens |
| --- | --- | --- | --- | --- |
| Overview | `/overview` | Dashboard: progress and next useful action | Review next package | Contextual links to jobs and applications |
| Jobs | `/jobs` | Discover, filter and inspect opportunities | Review job | `/jobs/:jobId` Job Detail |
| Applications | `/applications` | Prepare packages and track manual applications | Open package | `/applications/:applicationId` Application Package |
| Profile | `/profile` | Verified master career information | Edit profile | `/profile/edit` Profile Editor |
| Verified Answers | `/verified-answers` | Candidate-confirmed reusable responses | Add answer | Create/edit in sheet |
| Job Preferences | `/preferences` | Multiple saved searches and fit constraints | New saved search | Create/edit in sheet |
| Settings | `/settings` | Account, display, privacy, provider health | Save settings | Sections within page |

“Dashboard” is the screen name; “Overview” is its navigation label. “Master Profile” is the screen name under “Profile.” Exactly seven primary navigation items. Nested screens keep their parent active. Browser back restores list query, filters, sort, page and scroll position. Proposed routes are documentation only.

## Primary objects (conceptual; no database design)

- Candidate fact: candidate-confirmed statement, source reference, verification date and version. Draft edits do not become verified implicitly.
- Saved search: name, terms, locations, work mode, employment types, exclusions, salary preference with currency and period, enabled state. Unknown values are explicit.
- Job: source identifiers, original URL, normalized attributes, discovery freshness and job text. Missing data is shown as “Not provided.”
- Requirement: job-text excerpt, must-have/nice-to-have classification and parse confidence. Job requirements are not candidate claims.
- Fit analysis: evidence coverage, supported requirements, unsupported requirements and unknowns, tied to job and profile versions. Score is advisory, never a hiring probability.
- Application package: selected facts, resume draft, prepared answers, validation results, review acknowledgment and revision date.
- Application: one record per candidate/internal job, manual status and dated history. Duplicate action returns the existing package.
- Verified answer: question intent, candidate-confirmed response, source fact references, scope and review date. Sensitive declarations always require a fresh manual answer/review for the specific application.

## Truth and provenance

Only the verified candidate profile supports personal factual claims. Do not infer dates, years of experience, technologies, metrics, authorization, immigration status, pay expectations or declarations. Unknown remains unknown. A candidate confirmation must be explicit and attributable. Model confidence cannot promote a claim to VERIFIED.

| State | Meaning | User action |
| --- | --- | --- |
| VERIFIED | Direct candidate source-of-truth content | View source; edit through profile/answer verification |
| AI_DRAFT | Rephrased or combined language supported by linked verified facts | Review wording and evidence; approval retains AI_DRAFT provenance |
| NEEDS_INPUT | Missing, ambiguous, stale or context-dependent information | Supply/confirm information; sensitive questions answered manually |
| UNSUPPORTED | Available verified profile does not substantiate the requirement/claim | Omit claim or add independently verified information |

Profile amendments invalidate affected derived content. Previous packages show “Source changed — revalidate”; no silent rewriting of an applied package. Applied versions remain historical snapshots.

## Processing and readiness

Discovery → deduplication → preference filtering → job parsing → matching → relevant fact retrieval → tailored resume → prepared answers → validation → Ready to Apply → manual application → application tracking.

Each processing step has queued, running, completed and failed presentation. Retry targets the failed step and retains completed work. Normalization belongs between discovery and deduplication. Strong source identifiers precede fallback fingerprints; uncertain duplicates go to explicit review and are never silently merged.

Ready to Apply requires: current job/profile source versions; valid structured results; no unsupported personal claims; all required responses resolved; supported generated prose with evidence links; successful validation; candidate review of resume and answers. Unsupported job requirements may remain visible as fit gaps if the package makes no unsupported claim. Optional unanswered questions remain visibly unresolved and omitted. No score alone unlocks readiness.

Opening the original posting never changes status to Applied. Only the candidate can record Applied, with date and optional notes. A failed/closed source posting preserves the package and offers a return to Jobs.

## Status model

Keep three dimensions separate: processing status, application status, and claim provenance.

- Processing: Queued → Preparing → Needs input / Validation failed / Ready to Apply. Failed provider runs and possible duplicate reviews are separate operational states.
- Application: Preparing → Ready to Apply → Applied → Interviewing → Offer → Accepted. Rejected, Withdrawn and Archived are explicit alternatives. Editing a pre-application package may return it to Preparing. Correcting a manual status preserves history. Archiving never means submitted.
- Job disposition: New, Saved, Hidden, Possible duplicate, Closed. A preference mismatch is a visible reason, not a deletion.

## UX acceptance scenarios for later implementation

1. Empty account sees profile and search setup actions, with no fabricated jobs or activity.
2. Candidate verifies a fact; drafts remain separate until that action succeeds.
3. Two provider references with uncertain identity are shown for review.
4. Missing salary does not imply a match or mismatch; show unknown and the configured handling.
5. A requirement lacking evidence appears UNSUPPORTED; its claim is omitted from generated content.
6. A work-authorization question without explicit candidate information appears NEEDS_INPUT.
7. Editing a source fact flags dependent draft content for revalidation.
8. Repeated “Prepare package” opens the existing application.
9. “Open original posting” leaves the package Ready to Apply.
10. “Mark as Applied” records an explicit manual event.

## Phase boundary and decisions

The information architecture and design specs are proposals for design review, not evidence of a working product. Figma examples must carry “Illustrative data — not a candidate profile.” No real personal career claims are introduced. Dates, counts and companies in examples are synthetic.

Next phase recommendation: explicitly authorize the application scaffold, token implementation, accessible shell and test tooling after reviewing Phase 0. Do not start it automatically.
