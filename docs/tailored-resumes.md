# Tailored resumes — Phase 11

## User workflow

1. Parse the current posting and verify relevant master-profile entries.
2. Choose **Prepare Application** on a job, then open its package from **Applications**.
3. In **Resume**, inspect the selected verified source and experience counts. Confirm sending that context and the requirements to OpenAI, then choose **Generate resume**.
4. Review the preview, expandable source evidence and validation findings. Generated wording remains **AI DRAFT** even when checks pass. Unsupported or uncertain claims block validation.
5. **Regenerate resume** appends a new version using current inputs. Earlier versions remain accessible in history. A changed profile/posting or evaluation date makes a saved version stale and requires regeneration.

No PDF, answer generation, automatic application submission or Ready to Apply transition is included. The Answers tab explains its future availability. The package is reachable at `/applications/[applicationId]`; the applications page lists the latest 100 packages and each package lists its latest 50 resume versions. Older database history is retained.

## Generation boundary

`src/server/resume/service.ts` exports `generateTailoredResume(repository, ai, request, asOf)`. The repository loads the authenticated user's application, current validated parse and owned profile. The Phase 10 `buildRelevantCandidateContext` boundary supplies only selected, verified, relevant records; the full master profile and personal contact fields are never sent to resume generation.

A generation request accepts only an application ID and explicit consent. The server derives ownership from authentication, never browser-supplied profile or user IDs. Empty selection, unavailable current parse or missing credentials prevents generation. A database-backed three-minute lease prevents concurrent generation of the same application; each completed attempt appends a distinct version. Source inputs are fingerprinted and reloaded after model latency; changed inputs cannot be saved as that attempt's current result. The page also compares the saved fingerprint with current inputs before presenting validation as current.

`OpenAIResumeClient` uses the Responses API with strict Zod structured outputs, `store: false`, an 8,000 output-token ceiling and a 60-second timeout per request. Automatic retries are disabled. The default model is the existing application's `gpt-4.1-mini-2025-04-14`; optional server-only `OPENAI_RESUME_MODEL` overrides it. `OPENAI_API_KEY` remains server-only. No keys, candidate payloads or SDK request details are logged.

The generator can reorder, shorten and emphasize supported facts. Its schema has headline, professional summary, skills, selected experience/project entries and education/credential references. Each rewritten claim contains exact field quotations and source keys (`kind:id`). Employer/title/date and institution/credential fields are **not writable model output**: preview resolves them from the saved verified source snapshot. Experience bullets must cite the selected bullet belonging to that same employer record.

## Validation stages

`validateGeneratedApplication` returns `passed`, `issues`, `unsupportedClaims` and `warnings`, plus its validator version.

1. **Deterministic checks:** strict schemas; selected source membership; exact field quotes; source-kind and parent-role attribution; plain text; explicit skill membership; unsupported content words; quantities and tenure wording. Skills must exactly match an explicit skill fact, bullet skill or project technology. Education and licences/certifications must reference selected sources of the correct kind. Job-only qualifications cannot satisfy these rules.
2. **Independent semantic audit:** if deterministic checks pass, a second structured request examines every claim and its cited original evidence. The audit never receives job requirements, so those requirements cannot be used as candidate proof. Missing/duplicate/unknown review paths, unsupported or uncertain verdicts fail validation. Review errors also fail closed and preserve a blocked draft.

The lexical rule intentionally favors conservative shortening and rearrangement over broad paraphrases. New content words are blocked even when a synonym might be reasonable. Semantic review addresses changed relationships, negations, scope and duty inflation that word presence alone cannot establish. An LLM review is not a formal truth guarantee; the candidate must still inspect the AI draft. Validation never verifies or edits master-profile facts, and passing resume checks does not set application readiness.

Malformed generation output is rejected before storage. Well-formed drafts with validation blockers are retained with failed status for inspection. Generation/API errors preserve prior history; they never silently reuse partial output. Future export/readiness code must use the current-source validation status, not merely an old stored `passed` flag.

## Persistence

Existing `resume_versions` stores an envelope with schema version, input fingerprint, selected source revisions, compact original context, and draft; `validation_result` stores findings and validator version. Existing model/prompt/created-at fields identify each version. Regeneration uses INSERT, never upsert/update. Authenticated sessions cannot UPDATE or DELETE history. RLS enforces profile ownership and insert policies require a job owned by that profile.

The three generation RPCs run as `SECURITY INVOKER`, with fixed empty search paths and no anonymous/public execution grants. Saving and consuming a lease is atomic. User-specific rows remain protected by the existing profile-derived RLS. The lease is a concurrency guard, not an API-spending quota; sequential explicit regenerations remain possible.

## Tests and references

Normal tests mock HTTP and include adversarial job-only tools, fabricated seniority/years/metrics, invalid provenance, cross-employer attribution, unsupported credentials, incomplete review, stale source changes, consent/authentication, immutable history, lease reuse/concurrency and keyboard tabs.

An opt-in synthetic live test is separate from normal tests: `RUN_RESUME_AI_INTEGRATION=1 npm run test:ai -- tests/ai/resume.test.ts` with server credentials already supplied securely in the process environment. It makes up to two paid requests and sends synthetic candidate fixtures only. Do not paste credentials into commands or files committed to Git. Normal tests never use real credentials.

Implementation references: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), and the project's [Application Package Figma frame](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=23-801). The UI reuses the existing shell, tokens, Button, Radix tabs and matching Lucide icon assets. It adapts the design's illustrative future actions to this phase's actual resume workflow.
