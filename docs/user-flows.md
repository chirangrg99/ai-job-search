# User flows

Status: Phase 0 design proposal. All operations below describe future behavior. No integrations or business logic exist yet.

## Main journey

Discovery → deduplication → preference filtering → job parsing → matching → relevant fact retrieval → tailored resume → prepared answers → validation → Ready to Apply → manual application → application tracking.

Normalization happens after discovery and before deduplication. The UI groups the internal steps into Discover, Assess, Prepare, Validate and Apply; an expandable timeline exposes each exact step, its outcome and last update. It never displays fake percentage progress.

| Step | User-visible artifact | Success destination | Exception/recovery |
| --- | --- | --- | --- |
| Discovery | New job count, source, last completed run | Normalize | Provider error: dated message and retry; preserve old results |
| Normalization | Original title/company/location alongside normalized fields | Deduplicate | Missing fields: “Not provided,” preserve original text |
| Deduplication | Unique result or explicit possible-duplicate comparison | Preferences | Strong duplicate resolves to existing job; uncertain match awaits review |
| Preference filtering | Pass, mismatch or unknown with reasons | Parse retained job | User may inspect hidden/mismatched results; revise preferences explicitly |
| Job parsing | Structured requirements and source excerpts | Matching | Ambiguous parsing: mark uncertainty; retry, never invent requirements |
| Matching | Requirement evidence and advisory fit | Relevant fact retrieval | Missing evidence stays UNSUPPORTED/NEEDS_INPUT |
| Relevant fact retrieval | Selected verified fact references | Resume | Insufficient context: request facts; never send full profile routinely |
| Tailored resume | AI_DRAFT language with fact-level references | Answers | Unsupported language removed or blocked in validation |
| Prepared answers | Verified text, drafts and unresolved prompts | Validation | Required unknown/sensitive question goes to candidate |
| Validation | Findings linked to exact content and source version | Review | Repair issue, then rerun affected validation |
| Ready to Apply | Reviewed package and manual handoff checklist | Original posting | Source unavailable: keep package and return to Jobs |
| Manual application | Original posting in new tab | Candidate returns | Opening/copying/downloading does not mark Applied |
| Application tracking | Explicit status, date, notes and history | Applications | Corrections are recorded; no fabricated status updates |

## Journey A — Establish source of truth

Overview empty state → Profile → Edit profile → add factual career entry and source → save draft → inspect summary → “Confirm these facts” → VERIFIED entry on Master Profile.

Required input has a persistent label and field error. On submit, focus the first invalid field and show an error summary. Date precision is preserved (month-only stays month-only). Unknown does not equal “No.” Cancel returns to Master Profile; dirty forms show a discard confirmation. Failed save preserves entered values and offers retry. Confirmation is separate from saving a draft.

## Journey B — Configure discovery

Job Preferences → New saved search → enter name, terms and locations → choose work mode, employment types and exclusion rules → set optional salary preference with currency/period → preview readable criteria → save → enabled search card.

Several saved searches may overlap; job identity is global to the candidate's result collection. Each result lists contributing searches. Pausing one search stops future runs for it, without removing jobs or applications. “No matching jobs” offers Edit preferences and Clear temporary filters. Missing provider configuration appears as setup-needed health information, never as an empty successful run.

## Journey C — Assess a job

Jobs → filter/search → Job Detail → inspect source and preference outcome → compare requirements with verified evidence → Save job or Prepare package.

List state survives return navigation. Possible duplicate opens a side-by-side review with original sources and matching identifiers; keep separate when unsure. Existing package redirects to that package. Closed job warns with a readable status and retains source information.

## Journey D — Review an application package

Prepare package → visible step timeline → Resume / Answers / Validation tabs → resolve required NEEDS_INPUT → remove unsupported claims → rerun validation → review current resume and answers → Ready to Apply.

Each claim provides “View evidence” to a source sheet with fact text, source, verification date and version. User-edited draft wording retains AI_DRAFT until validation; factual additions must go through profile verification. An unsupported requirement is a disclosed gap, not a fabricated qualification. Model parse/validation errors cannot be dismissed into readiness. Optional unknown responses may be explicitly omitted. Changed source versions disable readiness until revalidation and renewed review.

## Journey E — Apply manually and track

Ready to Apply → optional Copy answer / Download resume → Open original posting (new tab; visible external-link cue) → candidate completes employer form themselves → return → Mark as Applied → confirm date and optional note → Applied history entry.

An open tab, copied answer or downloaded resume is never evidence of submission. Sensitive declarations remain manual even if similar wording exists in Verified Answers. No employer-site credentials are requested or stored. Tracking updates (Interviewing, Offer, Accepted, Rejected, Withdrawn) are candidate actions with timestamped history. Accidental status changes can be corrected without erasing history.

## Journey F — Maintain reusable answers

Verified Answers → Add answer → question intent + scope + answer + supporting profile facts → save draft → explicit candidate confirmation → VERIFIED reusable answer.

Exact applicable answers may be reused with provenance; contextual rewriting stays AI_DRAFT. Profile changes mark affected answers for review. Legal/authorization/immigration/security/criminal-history declarations never become automatic answers; show the candidate what needs a fresh decision. Do not infer private or protected information.

## Global recovery and accessibility

- Authentication expiry: retain unsaved input only as appropriate to privacy requirements; explain interruption and return to the current task after sign-in. No claim of a successful save.
- Loading: stable skeleton geometry and one polite busy announcement; not dozens of announced placeholders.
- Failure: inline message at the failed region plus Retry; retain successful surrounding content.
- Keyboard: skip link → navigation → top bar → page heading/content → contextual actions. Dialogs trap focus, Escape dismisses when safe, and focus returns to trigger.
- Mobile: navigation sheet replaces sidebar; filters use a sheet with Apply/Clear; review content stacks in reading order; sticky actions do not obscure content or the keyboard.
- Every status has text and icon. Announce saved/failed changes; never communicate truth state using color alone.

## Design review walkthrough

Review empty onboarding, a dense Jobs list, a job with unknown salary, a package blocked on a required answer, a package with supported draft prose, the manual application handoff, and a source-change revalidation case. These are design scenarios, not automated test results.
