# Design system

Phase 0 · Design proposal · 2026-09-15. Authority: `AGENTS.md`. This document defines the product design; installed design-tool recommendations are advisory. Figma target: [AI Job Application Assistant design file](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled).

## Direction

A calm, professional workspace for decisions and evidence. Light surfaces, slate typography, restrained blue actions, compact rows, generous grouping and subtle shadows. Avoid decorative gradients, glass effects, animated metrics and ornamental charts. Use Geist Sans (Figma family: Geist), with `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif` fallback. A permanent sample-data annotation must accompany design fixtures.

## Color tokens

Names below are the proposed CSS custom-property contract; no stylesheet is implemented in Phase 0. In Figma, use `color/<name>` semantic variables aliased to primitive color values. Only primitives contain raw hex values. Light mode is the only designed mode.

| Token | Value | Purpose |
| --- | --- | --- |
| `--color-background` | #F8FAFC | Workspace canvas |
| `--color-surface` | #FFFFFF | Cards, sidebar, inputs, dialogs |
| `--color-surface-subtle` | #F1F5F9 | Inactive filters, muted surfaces |
| `--color-text-primary` | #0F172A | Headings and body |
| `--color-text-secondary` | #475569 | Supporting text |
| `--color-muted` | #64748B | Timestamps and nonessential metadata on white |
| `--color-border` | #E2E8F0 | Decorative dividers and card outlines |
| `--color-control-border` | #64748B | Essential input/control boundaries |
| `--color-primary` | #2563EB | Primary actions, selection, links |
| `--color-primary-hover` | #1D4ED8 | Hover/pressed primary action |
| `--color-primary-soft` | #EFF6FF | Selected nav and AI draft backgrounds |
| `--color-on-primary` | #FFFFFF | Text/icons on primary |
| `--color-success` | #15803D | Verified and completed indicators |
| `--color-success-soft` | #F0FDF4 | Verified surface |
| `--color-warning` | #B45309 | Input required and caution |
| `--color-warning-soft` | #FFFBEB | Input-required surface |
| `--color-danger` | #B91C1C | Unsupported claims, validation failure |
| `--color-danger-soft` | #FEF2F2 | Failure surface |
| `--color-focus` | #2563EB | Focus indicator, with white separation ring |
| `--color-overlay` | #0F172A at 40% | Modal backdrop |

shadcn role mapping for the future: background→background; foreground→text-primary; card/popover→surface; card/popover-foreground→text-primary; primary→primary; primary-foreground→on-primary; secondary/muted/accent backgrounds→surface-subtle; secondary/accent-foreground→text-primary; muted-foreground→text-secondary; destructive→danger; destructive-foreground→surface; border→border; input→control-border; ring→focus. This avoids confusing the product's `muted` foreground with shadcn's muted background.

The light decorative border is not sufficient to identify a standalone interactive control; use control-border or a stronger fill. Use text-secondary on tinted surfaces where muted would miss contrast. Disabled elements remain readable, with an explicit disabled state and an adjacent reason when needed.

## Typography

| Figma text style / role | Size / line height | Weight | Usage |
| --- | --- | --- | --- |
| Display/Metric | 32 / 40 px | 600 | Stat values; tabular digits |
| Heading/Page | 28 / 36 px | 600 | One page title |
| Heading/Section | 20 / 28 px | 600 | Major sections |
| Heading/Card | 16 / 24 px | 600 | Cards and job titles |
| Body/Default | 16 / 24 px | 400 | Long prose and mobile form text |
| Body/Compact | 14 / 20 px | 400 | Desktop tables and supporting text |
| Label/Default | 14 / 20 px | 500 | Inputs, buttons, navigation |
| Label/Small | 12 / 16 px | 500 | Provenance labels and metadata |

Use normal tracking for prose; page heading may use -0.4px tracking. Body paragraphs max 72 characters wide. Never truncate requirement or validation text. Long identifiers/URLs may wrap anywhere. Dates preserve known precision; salaries always include currency and pay period. Unknown is written explicitly. No invented zero values.

## Geometry, spacing and elevation

- Spacing tokens `--space-0/1/2/3/4/5/6/8/10/12/16`: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px. Figma `space/<number>`. Use 4px rhythm; 24px section gap, 16px card gap, 8px label/control gap.
- Radius tokens: none 0, sm 4, md 8, lg 12, full 9999px. Inputs/buttons md; cards/dialogs lg; badges full. Never pill every control.
- Borders: 1px default; 2px focus plus 2px white offset. Focus remains visible on blue buttons. Error border uses danger plus text.
- `--shadow-sm`: 0 1px 2px rgba(15,23,42,0.05), for cards.
- `--shadow-md`: 0 4px 12px rgba(15,23,42,0.08), for popovers.
- `--shadow-lg`: 0 12px 32px rgba(15,23,42,0.14), for dialogs/sheets.
- Layers: base 0; sticky header 10; popover 20; backdrop 30; dialog/sheet 40; toast 50. Avoid nested dialogs.
- Motion: fast 120ms for hover, standard 180ms for overlays; ease-out. No layout shifts or animated counts. Reduced motion disables movement; loading uses a static skeleton plus text.

## Responsive shell

| Breakpoint | Width | Behavior |
| --- | --- | --- |
| Base | 320–639px | 16px gutters; 56px TopBar; nav sheet; one column; 44px controls |
| sm | ≥640px | 24px gutters; optional two-column stats/forms where labels fit |
| md | ≥768px | 24px gutters; nav sheet remains; two-column secondary cards |
| lg | ≥1024px | 240px persistent sidebar; 64px TopBar; desktop tables |
| xl | ≥1280px | 32px gutters; 2:1 detail panels and four stats |
| 2xl | ≥1536px | Content capped at 1280px and centered within workspace |

Design reference frames: 1440px desktop, 768px tablet and 390px mobile. Also inspect reflow at 320px and zoom at 200%/400% in later implementation. Shell uses Auto Layout: sidebar fixed width, workspace fills remaining width, TopBar fixed height, content vertical flow. Page heights are content-driven. Mobile uses document scrolling, not multiple nested scrolling panels. Dense lists switch to cards below lg; essential information stays accessible. Detail side panels stack beneath the main decision summary. Sticky bottom action rows reserve their own height plus safe-area padding.

## Status and provenance system

| State | Visible text | Lucide icon | Foreground / background | Meaning |
| --- | --- | --- | --- | --- |
| VERIFIED | Verified | BadgeCheck | success / success-soft | Direct confirmed source |
| AI_DRAFT | AI draft | FilePenLine | primary-hover / primary-soft | Generated wording with evidence |
| NEEDS_INPUT | Needs input | CircleHelp | warning / warning-soft | Candidate action needed |
| UNSUPPORTED | Unsupported | ShieldX | danger / danger-soft | No profile support |

Never use a badge without its text. Machine state names remain documented and inspectable; the UI uses readable labels. A badge can be static or an explicit “View evidence” button, never a misleading clickable decoration. Explanation sheet lists the claim, exact source facts, confirmation date/version and unresolved limitations. Approval of prose does not change its provenance to VERIFIED.

Application StatusBadge: Preparing (LoaderCircle, primary-soft), Ready to Apply (CircleCheck, success-soft), Applied (Send, primary-soft), Interviewing (MessagesSquare, primary-soft), Offer/Accepted (BadgeCheck, success-soft), Rejected (CircleX, surface-subtle), Withdrawn/Archived (Archive, surface-subtle). Source closed uses warning. Operational failures use danger with Retry. Color never encodes a candidate's worth.

FitScore displays a numeric value out of 100, label “Evidence fit,” and an accessible explanation. Proposed presentation bands: 80–100 Strong evidence, 60–79 Partial evidence, 0–59 Limited evidence. These are design bands pending scoring validation, not a specified scoring algorithm or probability. Unscored shows “Not assessed”; insufficient input shows “Insufficient evidence,” never 0. Show supported/required counts and unknowns beside the score. Use a restrained horizontal meter with a text equivalent, not a decorative ring.

## Icons

Lucide only, 2px stroke, 16px within dense controls, 20px navigation and 24px empty-state artwork. Keep optical sizes consistent. Use component instance swaps for Figma icons. Decorative icons next to text are hidden from assistive technology; icon-only controls need a visible tooltip, accessible name and 44px hit target. No emoji, invented company logos or brand marks. External destinations carry ExternalLink and “opens in new tab” assistive text.

## Interaction and accessibility contract

Target WCAG 2.2 AA. Normal text ≥4.5:1, large text ≥3:1, essential boundaries and focus indicators ≥3:1 against adjacent colors. Product controls use at least 44×44px target areas; compact visual checkboxes keep expanded labels/hit areas. Keyboard order follows reading order. Provide landmarks, skip navigation, one H1 and sequential headings.

Buttons: default/hover/pressed/focus/disabled/loading; stable label width while busy; suppress duplicate submission; errors are not toast-only. Links navigate and buttons mutate. Forms: persistent labels, optional/required annotations, help and inline errors connected programmatically; first-error focus and summary on submit; preserve user values on failure. Explicit Save and Cancel; dirty-navigation confirmation. Verification is a separate candidate confirmation.

Select/MultiSelect: keyboard arrows, Enter/Space selection, Escape dismiss, named trigger, visible selected state. MultiSelect chips wrap and can be removed by keyboard; count overflow is an operable disclosure. Search uses a visible label, clear control and result announcement; empty search differs from failed loading. FilterBar changes temporary list filters, not saved preferences. Mobile filter sheet has Apply/Clear/Cancel.

DataTable: semantic header/caption, aria-sort, visible pagination, 25 rows by default, 25/50 options; sorting keeps keyboard focus. Select-all applies only to visible page with count disclosed; no bulk application action. Primary row destination is a title link; nested controls do not trigger navigation. Long content wraps or has accessible disclosure. Retain result count and filters during loading.

Tabs: arrow-key navigation, Home/End, associated panels; use manual activation for expensive content. Dialog/Sheet: title, description, focus trap, return focus, close button and Escape; unsaved edits invoke discard confirmation. Toast: polite status region, max 3, 6-second success duration, pause on focus/hover, persistent actionable failures also inline. Loading skeletons are hidden from screen readers with one busy announcement. EmptyState explains why and offers a useful next action. Never replace a fetch failure with “No jobs.”

The command/search interface is a design pattern for page navigation and local job/package lookup, accessible by button and Cmd/Ctrl+K when not conflicting with active input. Group results as Pages, Jobs, Applications. Display scope and no-results state. No chat-agent interface or autonomous-action shortcuts.

## Screen layout specifications

All screens inherit the shell and global empty/loading/error/focus rules. Wireframes use illustrative content clearly marked as such. Primary actions vary by state; avoid several competing filled blue buttons.

### 1. Dashboard

Navigation: Overview. Header: “Overview,” concise date range, secondary discovery refresh, primary “Review packages” when ready items exist. Four equal StatCards on desktop: New jobs, Ready to Apply, Needs input, Applied this week; each label explains its time window and links to a filtered list. Below: 2:1 grid. Main panel “Your next actions” sorts blocking input before ready packages, showing job, issue and CTA; below it “Recent jobs” with title/company/location/fit/status. Side panel contains saved-search health (last successful run, enabled state), then profile verification summary. No charts without a clear decision they support.

Mobile: 2×2 stats at 390px, one column at 320px; next actions before recent jobs, health last. Empty account substitutes profile and search setup steps. Partial provider failure stays in health panel and preserves jobs. Loading maintains card heights. Tab order follows heading → metrics → actions → jobs → health.

### 2. Jobs

Header: “Jobs,” result count and latest discovery time. SearchInput full flexible width, saved-search Select, work-mode/location/fit filters and sort “Newest”; active chips and Clear filters form the next line. Desktop DataTable: selection, Job/company (flex), Location/work mode, Salary, Evidence fit, Discovered, Disposition/actions. At least 64px row height, titles wrap to two lines and full title available. Title opens Job Detail; save is an independent control. Pagination below table.

Mobile: Search above Filters button/count; JobCards show title, company, location, salary or Not provided, fit and save. Advanced filters open Sheet. Empty initial state explains discovery setup; no-results offers Clear filters; discovery failure offers Retry with prior data. Possible duplicates have explicit badge and comparison action. Search and filter state is recoverable on back.

### 3. Job Detail

Breadcrumb Jobs / job title. Header: title, company, location/work mode, provider link, discovered/updated dates; Save secondary and Prepare package primary (Open package if one exists). Desktop 2:1 split: left has job description/source excerpts and must-have/nice-to-have requirement groups; right has Evidence fit, preference pass/mismatch/unknown reasons, salary detail and package action. Each RequirementMatch includes exact requirement, evidence summary, provenance/gap text and View evidence. Source description is visibly separate from candidate facts.

Mobile: identity → fit/preferences → action → requirements → source text. Long description can expand; requirements stay readable. Parsing failure offers retry and raw source; unassessed score stays unknown. Closed posting is a warning; possible duplicate requires resolution before new package preparation. Primary action busy state names current step.

### 4. Application Package

Breadcrumb Applications / title. Header includes job identity, package status, profile version and updated date. Horizontal preparation timeline collapses to “Step n: label” plus expandable history on mobile. Tabs: Resume, Answers, Validation. At desktop xl, main preview 2/3 width and 1/3 validation/evidence sidebar. ResumePreviewCard contains page preview, AI draft badge, source links and revision date. Answers tab is a stacked list with question, required marker, answer, provenance and copy/edit actions. Validation tab lists blockers first, then passed checks; each finding jumps to exact content.

Before readiness: primary Resolve input or Review package according to actual state. After validation and candidate review: Ready to Apply checklist; primary Open original posting, secondary download/copy; Mark as Applied remains a distinct manual action. Show “You apply on the employer's site.” No Submit application control. Mobile stacks preview then validation and reserves bottom action space. Required unknown answers block readiness; unsupported job requirements remain disclosed fit gaps. Source changes produce a persistent revalidation banner. Failed generation preserves earlier revisions and offers Retry.

### 5. Applications

Header “Applications,” search and status tabs/counts: All, Preparing, Ready to Apply, Applied, Interviewing; more statuses through filter. DataTable columns: Job/company, Status, Evidence fit, Applied date, Last update, Next action. Primary row action opens package; menu allows status correction/archive. Row expanded history shows dated candidate actions. Default sort last updated; explicit application date filter.

Mobile uses cards with prominent status and next action. Empty state links to Jobs. Updating status opens a Dialog with status, date and optional note; success updates row and history. Closed job source does not erase an application. No drag-only board or invented interview follow-ups. Errors retain current confirmed status and input.

### 6. Master Profile

Navigation Profile. Header “Master profile,” last verified date, primary Edit profile. Top banner explains this is the sole factual source. Summary contains name/contact fields (unknown explicit), verified fact count and facts needing review. Desktop: 200px section index plus flexible cards for Summary, Experience, Projects, Skills, Education, Certifications. Each entry shows verified text, source reference, date/version and edit action; a source drawer gives full evidence. No inferred years or metrics.

Mobile section index becomes a Select; all sections remain scrollable. Empty profile offers Add first fact. Unverified drafts are a separate “Awaiting confirmation” section with Needs input; they cannot masquerade as verified experience. Deleting/replacing a source previews affected drafts. Fetch errors retain structure with retry.

### 7. Profile Editor

Child of Profile, dedicated full page. Header “Edit profile” with Back to profile, draft/saved indicator. Desktop: section index 200px; editor max 760px. Fields grouped into identity, experience, education, skills and evidence. Repeating entries have clear Add entry/Remove entry controls; label optional dates and known precision. Each factual field can show Unknown, and source reference supports confirmation. Bottom action row: Cancel, Save draft; a separate review panel offers Confirm these facts after inspecting changes.

Mobile: section Select, single column, sticky Save/Cancel with safe-area space. Inline errors plus summary; never clear inputs on failure. Dirty exit confirmation is a Dialog. Loading stored data uses skeleton; failed load does not present an empty form that could overwrite facts. Successful verification shows affected packages requiring revalidation.

### 8. Verified Answers

Header “Verified answers,” supporting description, primary Add answer. Search by question intent; category and state filters. List/table: Question, Answer excerpt, Scope, Provenance, Last reviewed, Actions. Expand item to inspect full wording and supporting facts. Add/edit Sheet: question, scope, answer, evidence links, optional review date; save draft and separate confirm action. Sensitive categories have a visible “Manual review per application” note.

Mobile uses stacked question cards, answer preview and state text. Empty state explains reuse and Add answer. Missing source produces Needs input. A changed question context produces AI draft or Needs input rather than an automatic verified answer. Validation errors stay inside the editor and retain text.

### 9. Job Preferences

Header “Job preferences,” primary New saved search. Desktop 2-column saved-search cards, each with name, enabled/paused state, readable criteria, match count and last run. Card actions Edit and Pause/Enable. New/edit Sheet max 560px: search name; terms; excluded terms; locations; work modes; employment types; seniority preference; optional salary amount, currency and period; unknown-data policy (Include for review / Exclude from automatic shortlist). Summary sentence previews criteria before Save.

Mobile one-column cards and full-height editor. Clearly distinguish temporary Jobs filters from these persistent searches. Unconfigured provider appears as setup-needed health text, never “No matches.” Unknown salary cannot satisfy a known minimum silently. Save and pause failures keep prior confirmed state and show Retry. No credentials entered on this screen.

### 10. Settings

Header “Settings.” Desktop narrow section navigation with Account, Appearance, Data and privacy, Discovery health; form width max 760px. Account shows candidate-owned details and sign-out; Appearance shows Light mode and density preview; Data/privacy describes stored profile/package content with explicit export/delete intentions for future work; Discovery health shows provider name, last successful run, error text and configured/not configured status only. No API-key entry or secret values. Destructive account actions are separated and require explicit confirmation in later implementation.

Mobile stacks sections with section selector. Save feedback stays by its section; unsaved state is visible. Unavailable capabilities are labeled rather than represented as functional settings. No dark-mode design is implied. Data export/delete implementation is outside Phase 0 and requires a later scoped decision. Health failures do not hide account settings.

## Figma construction and review plan

Required named design areas: Foundations, Components, Dashboard, Jobs, Job Detail, Application Package, Applications, Master Profile, Verified Answers, Job Preferences, Settings. Profile Editor is an additional child-screen design because it is required in the written inventory. Use reusable component instances, explicit variant states, semantic variable bindings and Auto Layout; no implementation code stands in for approval.

Inspect all final screens for clipping, text wrapping, source-state clarity, hierarchy and sample-data labeling. Review desktop plus a mobile Jobs frame and mobile package frame. Written responsive rules cover all screens; Figma frames are design examples, not proof of browser accessibility or executable interactions.


### Current Figma delivery status

Updated 2026-09-16. The upgraded account reports Professional / Full and writes now succeed. The tool does not expose the remaining credit balance; the user's stated 3,000 credits was not independently verified. Earlier Starter and Collab-seat limits are resolved for this delivery.

The existing file contains Foundations, Components and Screens. Built 56 variables, eight Geist text styles, three shadow styles, 27 Lucide icon atoms and all 26 required component families (127 variants). All four provenance states have reusable badge variants. Ten desktop screens, mobile Jobs, tablet Jobs and mobile package readiness/manual-application designs are present. Components and screens use Auto Layout and reusable instances. Named frames organize each required screen within Screens.

Visual review covered all families and 13 screen frames. Corrected paint fallbacks, SVG background/size behavior, table-column alignment and mobile dialog wrapping. These are reviewable design artifacts, not implemented features, a fully wired prototype or proof of browser/assistive-technology accessibility. Product design approval remains with the user.

[Foundations](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=8-2) · [Components](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=16-14) · [Dashboard](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=23-2).
