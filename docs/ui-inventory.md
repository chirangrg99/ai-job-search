# UI inventory and tooling review

Phase 0 · 2026-09-15. These are design contracts, not implemented components. All primitives use shadcn/ui in the future application; composed patterns reuse them. Full interaction rules and screen layouts live in `design-system.md`.

## Required components

| Component | Structure and content | Variants / states | Interaction and accessibility |
| --- | --- | --- | --- |
| AppSidebar | Product name, seven navigation links, profile footer | Desktop, mobile sheet; active/inactive | Named navigation, current-page semantics, keyboard links |
| TopBar | Breadcrumb, search trigger, account control | Desktop/mobile | Search button plus optional Cmd/Ctrl+K; labeled controls |
| PageHeader | One H1, description, secondary and primary action | Default, wrapped, no action | Responsive wrapping; action after heading in reading order |
| Button | Label, optional Lucide icon, busy indicator | Primary/secondary/ghost/danger; default/hover/pressed/focus/disabled/loading | 44px target; busy label and duplicate-action prevention |
| Input | Label, control, help, error | Empty/filled/focus/error/disabled/read-only | Label association, required/optional text, error description |
| SearchInput | Input plus search and clear controls | Empty/filled/loading/no-results | Visible scope, result count announcement; clear has name |
| Select | Labeled trigger, option popup | Closed/open/selected/error/disabled | Arrow keys, Enter, Escape, focus restoration |
| MultiSelect | Trigger, searchable options, selected chips | Empty/selected/open/disabled | Removable chips with names; wrap before overflow disclosure |
| Checkbox | Box, label, optional explanation | Unchecked/checked/mixed/focus/disabled | Space toggles; 44px label hit area; mixed announced |
| Badge | Short category label | Neutral/primary/success/warning/danger | Static semantic text; no click cue unless action |
| StatusBadge | Icon plus application/process label | Preparing/Ready to Apply/Applied/Interviewing/Offer/Accepted/Rejected/Withdrawn/Archived | Status independent of provenance; changes announced in context |
| ProvenanceBadge | Icon plus truth-state label | VERIFIED/AI_DRAFT/NEEDS_INPUT/UNSUPPORTED | Text always visible; evidence action separate or explicit |
| FitScore | Score/100, evidence label, meter, explanation | Strong/partial/limited/unscored/insufficient | Accessible text alternative; never hiring probability |
| StatCard | Label, value, period, optional destination | Default/loading/unknown | Real time window; tabular digits; unknown is not zero |
| JobCard | Title/company, location, salary, fit, disposition, save | Default/saved/closed/possible duplicate/loading | Title link plus separate save; no nested link controls |
| JobTableRow | Job identity and aligned table values | Default/hover/selected/saved/closed | Row title link; selection names company/job; no whole-row keyboard trap |
| RequirementMatch | Requirement, classification, fact excerpt, provenance, evidence action | Supported/partial/unsupported/needs input | Source excerpt readable; state uses icon/text; gaps never inferred away |
| FilterBar | Search, filters, sort, chips, result count | Desktop/mobile sheet/active/empty | Clear only temporary filters; explicit mobile Apply |
| EmptyState | Icon, heading, explanation, relevant CTA | First use/no results/no evidence | Failure is separate; CTA names recovery |
| LoadingSkeleton | Geometry matched to final content | Card/row/form/preview | Decorative to screen readers; one busy status |
| ResumePreviewCard | Document heading/body, AI draft state, version, evidence links | Draft/validated/stale/failed/loading | Text reading alternative; no embedded unsupported claims |
| DataTable | Caption, headers, rows, sort, pagination | Loaded/loading/empty/error | Semantic table, aria-sort, stable focus; mobile cards |
| Tabs | Tab labels/counts and associated panels | Active/inactive/disabled | Arrow/Home/End; manual activation for expensive panels |
| Dialog | Heading, description, content, Cancel/confirm | Open/busy/error/destructive | Trap and return focus; Escape; first-error focus |
| Sheet | Side panel header/body/footer | Desktop side/mobile full height | Dialog semantics, close button; scrolling body |
| Toast | Status icon, message, optional action/close | Success/info/error | Polite announcement; actionable errors also inline; pause timer |

Supporting primitives: Card, Dropdown Menu, Tooltip and Alert from shadcn/ui; Popover and Command for composed search/filter patterns. These are supporting requirements, not permission to install code in Phase 0. Icon atoms are Lucide instances. Reusable Figma components should expose text overrides; icons use instance swaps rather than multiplying variants.

## Screen-to-component map

| Screen | Main components |
| --- | --- |
| Dashboard | Shell, PageHeader, StatCard, JobTableRow, StatusBadge, EmptyState |
| Jobs | Shell, FilterBar, SearchInput, MultiSelect, DataTable, JobTableRow, JobCard, FitScore |
| Job Detail | PageHeader, FitScore, RequirementMatch, ProvenanceBadge, Sheet |
| Application Package | PageHeader, Tabs, ResumePreviewCard, RequirementMatch, StatusBadge, Dialog |
| Applications | PageHeader, FilterBar, DataTable, StatusBadge, Dialog |
| Master Profile | PageHeader, Tabs/section index, ProvenanceBadge, Sheet |
| Profile Editor | PageHeader, Input, Select, Checkbox, Dialog, Toast |
| Verified Answers | PageHeader, SearchInput, DataTable/cards, ProvenanceBadge, Sheet |
| Job Preferences | PageHeader, Input, Select, MultiSelect, Checkbox, Sheet |
| Settings | PageHeader, Input, Select, Dialog, Toast |

## 21st MCP availability

No callable MCP named `21st` was exposed in the current session. The local Codex configuration has no `21st` server sections. No 21st-related process environment name was found. Therefore the diagnosis is “not configured/exposed”; a missing environment variable alone is not established as the cause. No credential value was printed or written, and no MCP configuration was changed. Public 21st pages were searched as the review fallback.

## 21st candidates reviewed — no installations

The following records contain only name, reference, fit, dependencies and no-purchase assessment. Public preview visibility does not prove free registry installation rights. Do not install any candidate until its licensing/access and full dependency list are verified in a future phase.

| Component name | Preview / reference | Why it might fit | Dependencies | Usable without paid purchase? |
| --- | --- | --- | --- | --- |
| Stats cards with links — Ephraim Duncan | [21st reference](https://21st.dev/@ephraimduncan/components/stats-cards-with-links), [upstream](https://blocks.so/stats) | Compact metric-to-list pattern suits New jobs and Ready to Apply. Use flat tokens and descriptive periods; no decorative chart variant needed. | Listed: clsx, tailwind-merge; React/Tailwind baseline. Full source dependency audit remains pending. | Upstream blocks.so explicitly offers these stats examples free, including Stats with Links. Appears available without purchase upstream; 21st registry access remains unverified. |
| Data Table Filter — Sonu kumar | [21st reference](https://21st.dev/@uniquesonu/components/data-table-filter) | Composes selected counts, clearing and searchable options for the Jobs filter bar. Keyboard and controlled-state behavior still need verification. | Listed: lucide-react. Description also uses shadcn Button/Popover/Command, React and Tailwind; transitive cmdk/Radix dependencies need source verification. | Public preview/usage visible; no verified no-purchase license/access statement. Unconfirmed. |
| Command / Dense — shadcn | [21st reference](https://21st.dev/@shadcn/components/command/dense) | Grouped, dense keyboard search is a useful composition reference for Pages/Jobs/Applications. Prefer the project's shadcn primitive directly. | cmdk, lucide-react, @radix-ui/react-dialog; React/Tailwind and local utility baseline. | Opened page states MIT License; appears reusable without purchasing source. Registry access remains unverified; no installation attempted. |

## UI UX Pro Max

Not installed at initial inspection: no `uipro` executable or skill in the project, user `.agents/skills` or `.codex/skills`. Installed project-locally using the current [`ui-ux-pro-max-cli`](https://www.npmjs.com/package/ui-ux-pro-max-cli) workflow: `npm exec --yes --package=ui-ux-pro-max-cli@latest -- uipro init --ai codex`. Resolved version: 2.15.0. npm cache is under `work/npm-cache`; generated skill is `.agents/skills/ui-ux-pro-max/SKILL.md` with scripts and data. No application package manifest was created.

Installation initially encountered unavailable network and protected `.agents` writes; narrowly scoped network and directory access were granted and installation then succeeded. Verified by running the local Python design-system and UX searches. The installer recommends restarting the assistant for automatic skill discovery; this session explicitly read the skill and ran its scripts. [Codex skill documentation](https://learn.chatgpt.com/docs/build-skills) is the tooling reference.

The design query returned a generic conversion-funnel layout and alternate fonts/colors. These conflict with this productivity product and `AGENTS.md`, so they were not adopted. Useful guidance retained: visible focus, consistent tokens, explicit form feedback, clear filters and reduced motion. `docs/design-system.md` remains authoritative.

## Figma discovery and construction record

Target: [existing user-supplied file](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=0-1). Write-capable `use_figma` is available. Initial file: one empty Page 1, no local variables/text styles or components. Geist Regular/Medium/SemiBold/Bold are available.

Code Connect: not applicable; no source components exist. Existing-screen reuse: not applicable; empty canvas. Library discovery returned community kits including Simple Design System and Material 3. Button search found Simple Design System assets, but these are externally owned systems rather than this product's Geist/slate/blue token contract. Build editable local product components with the specified tokens. Background-variable search returned no results. Body-style search returned an unrelated team-library style; the product's explicit Geist ramp remains authoritative. No kit was purchased.

Planned local collections: Primitives, Color, Geometry. Color semantics alias primitives; variables use targeted scopes and WEB syntax. Planned local text styles: Display/Metric, Heading/Page, Heading/Section, Heading/Card, Body/Default, Body/Compact, Label/Default, Label/Small. Effect styles: Shadow/Sm, Shadow/Md, Shadow/Lg. Light mode only. Component inventory above locks the requested design scope; no application code or Code Connect implementation belongs to this phase.


### Current Figma delivery status

Updated 2026-09-16. The upgraded account reports Professional / Full and writes now succeed. The tool does not expose the remaining credit balance; the user's stated 3,000 credits was not independently verified. Earlier Starter and Collab-seat limits are resolved for this delivery.

The existing file contains Foundations, Components and Screens. Built 56 variables, eight Geist text styles, three shadow styles, 27 Lucide icon atoms and all 26 required component families (127 variants). All four provenance states have reusable badge variants. Ten desktop screens, mobile Jobs, tablet Jobs and mobile package readiness/manual-application designs are present. Components and screens use Auto Layout and reusable instances. Named frames organize each required screen within Screens.

Visual review covered all families and 13 screen frames. Corrected paint fallbacks, SVG background/size behavior, table-column alignment and mobile dialog wrapping. These are reviewable design artifacts, not implemented features, a fully wired prototype or proof of browser/assistive-technology accessibility. Product design approval remains with the user.

[Foundations](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=8-2) · [Components](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=16-14) · [Dashboard](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=23-2).

### Delivered Figma screen index

| Screen | Reference |
| --- | --- |
| Dashboard / Desktop | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=23-2) |
| Jobs / Desktop | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=23-523) |
| Job Detail / Desktop | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=23-667) |
| Application Package / Desktop | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=23-801) |
| Applications / Desktop | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=23-923) |
| Master Profile / Desktop | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=25-715) |
| Profile Editor / Desktop | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=25-1083) |
| Verified Answers / Desktop | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=25-1212) |
| Job Preferences / Desktop | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=25-1342) |
| Settings / Desktop | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=25-1470) |
| Jobs / Mobile | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=26-1242) |
| Jobs / Tablet | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=26-1418) |
| Application Package / Mobile / Ready to Apply | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=26-1472) |

### Delivered component families

| Family | Variants | Reference |
| --- | --- | --- |
| Button | 24 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=16-14) |
| Input | 6 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=18-32) |
| SearchInput | 4 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=18-81) |
| Select | 5 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=18-137) |
| MultiSelect | 4 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=18-185) |
| Checkbox | 5 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=18-225) |
| Badge | 5 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-66) |
| ProvenanceBadge | 4 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-113) |
| StatusBadge | 9 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-203) |
| FitScore | 5 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-243) |
| StatCard | 3 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-263) |
| Tabs | 4 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-302) |
| PageHeader | 3 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-330) |
| TopBar | 2 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-367) |
| EmptyState | 3 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-415) |
| LoadingSkeleton | 4 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-444) |
| Toast | 3 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-488) |
| RequirementMatch | 4 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-570) |
| JobCard | 5 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-653) |
| JobTableRow | 5 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-705) |
| FilterBar | 3 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-813) |
| ResumePreviewCard | 5 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-913) |
| Dialog | 4 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-977) |
| Sheet | 2 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-1017) |
| DataTable | 4 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-1161) |
| AppSidebar | 2 | [Open](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled?node-id=19-1342) |
