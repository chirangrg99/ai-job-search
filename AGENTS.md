# AI Job Application Assistant — Engineering Rules

You are building a personal AI-assisted job discovery and application preparation web application.

Read this file before doing any work.

## Product goal

The application helps a candidate:

1. maintain one verified master career profile;
2. configure multiple saved job searches;
3. automatically discover new jobs;
4. normalize and deduplicate jobs;
5. determine whether a job matches the candidate's preferences;
6. parse the job description into structured requirements;
7. score candidate-to-job fit;
8. retrieve only candidate facts relevant to that specific job;
9. generate a truthful tailored resume;
10. prepare application-question answers;
11. validate generated content against verified candidate information;
12. present a package that is ready for the user to apply manually;
13. track application status.

## MVP workflow

Job source
→ discovery
→ normalization
→ fingerprint/deduplication
→ preference filtering
→ AI job parsing
→ fit analysis
→ relevant candidate fact retrieval
→ resume generation
→ application answer preparation
→ validation
→ Ready to Apply
→ user opens original job posting
→ user applies manually
→ user marks application as Applied.

## Explicitly out of scope

Do NOT implement:

- automatic job-site application submission;
- Playwright automation against external job websites;
- CAPTCHA bypassing or handling;
- Hermes;
- LinkedIn browser scraping;
- Indeed browser scraping;
- external job-site credential storage;
- automatic legal declarations;
- autonomous account creation;
- autonomous application submission.

Playwright may later be used only for E2E testing of OUR application.

## Technology

Use:

- Next.js App Router
- React
- TypeScript with strict mode
- Tailwind CSS v4
- shadcn/ui
- Lucide React
- React Hook Form
- Zod
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- OpenAI API with structured outputs
- Adzuna as the first automatic job provider
- Vitest
- React Testing Library

Do not add another major framework without a concrete need.

## Design system

Use the existing [Figma design file](https://www.figma.com/design/RkFI8zlAFDKzSMl9rMHWzb/Untitled) as the source of truth for product visual design. Foundations, Components and Screens have already been designed in this file.

Before creating or changing UI:

1. inspect the relevant Figma foundations, component variants and screen frames;
2. reuse the existing design tokens, typography, spacing, colors, icons and component patterns;
3. match the relevant screen layout and responsive behavior;
4. consult `docs/design-system.md` and `docs/ui-inventory.md` for supporting interaction, accessibility and component specifications.

Use Figma variables and styles to define shared implementation tokens. Do not scatter hard-coded design values throughout components.

Preserve the professional, light-first productivity design, accessible contrast, visible keyboard focus, responsive layouts and restrained motion. Show provenance states with text and icons, not color alone.

Do not invent a replacement design system or redesign existing screens without an explicit request. If a design is missing or Figma cannot be accessed, identify the gap and use the written design specifications for context; do not claim visual parity without inspecting the relevant Figma design.

## 21st.dev rules

21st.dev is optional.

Before creating a substantial custom UI pattern, search 21st if its MCP is available.

Only use/install a component when:

- it is available to the user without a paid purchase;
- it matches the design system;
- it does not add unreasonable dependencies;
- accessibility is acceptable;
- it can use our design tokens.

Never purchase components or templates.

Do not use 21st for elementary primitives that shadcn/ui already provides well.

Prefer shadcn/ui for:

- Button
- Input
- Select
- Checkbox
- Dialog
- Sheet
- Tabs
- Badge
- Card
- Dropdown Menu
- Tooltip
- Table
- Skeleton
- Alert
- Toast

Use 21st selectively for higher-value composed UI only.

## Source-of-truth rule

The verified candidate profile is the ONLY source of personal factual claims.

AI may:

- select facts;
- rank facts;
- summarize facts;
- rephrase facts;
- reorder facts;
- combine compatible facts;
- draft prose based on facts.

AI may NOT invent:

- jobs;
- employers;
- titles;
- responsibilities;
- dates;
- education;
- licences;
- certifications;
- technologies;
- metrics;
- achievements;
- years of experience;
- salary expectations;
- work authorization;
- immigration status;
- legal declarations;
- criminal-history information;
- security-clearance status.

When data is unknown, represent it as unknown.

Never fill gaps creatively.

## Provenance states

Generated application information must support these states:

VERIFIED
Direct candidate source-of-truth information.

AI_DRAFT
AI-generated language based on verified information.

NEEDS_INPUT
Cannot safely determine answer.

UNSUPPORTED
Candidate profile does not support the job requirement.

The UI must show these states clearly and not rely on color alone.

## AI architecture

Do NOT build one giant autonomous agent.

Use separate functions:

- parseJobDescription()
- matchJobToProfile()
- retrieveRelevantCandidateFacts()
- generateTailoredResume()
- answerApplicationQuestion()
- validateGeneratedApplication()

Use Zod schemas for every AI response.

Reject malformed output.

AI calls should be replaceable behind service interfaces.

## Token control

Never send the candidate's entire profile to every AI call.

Pipeline:

job requirements
→ retrieve likely relevant candidate information
→ send only relevant context
→ generate output.

Prefer deterministic code where deterministic logic is possible.

AI should handle interpretation and language, not routine database logic.

## Database principles

- UUID primary keys.
- created_at / updated_at timestamps.
- Foreign-key constraints.
- Unique constraints where appropriate.
- RLS on all user-owned tables.
- Never trust user_id from browser input.
- Server determines authenticated user from Supabase Auth.
- JSONB only when the data is genuinely flexible.
- Use relational structure for core business entities.

## Job deduplication

Do not rely solely on URL.

Jobs should support:

- provider
- external job ID
- canonical URL
- normalized company
- normalized title
- normalized location
- content fingerprint.

Deduplication should first use strong identifiers and then fallback fingerprint logic.

Never silently merge two uncertain jobs.

## Application duplication

There must be a unique constraint preventing the same candidate from creating multiple applications for the same internal job.

## Code standards

- TypeScript strict mode.
- Avoid `any`.
- Prefer small modules.
- Keep server and client boundaries explicit.
- Keep secrets server-only.
- Validate environment variables.
- Use server actions/API routes appropriately.
- Do not expose OpenAI, Supabase service-role, or job-provider credentials to the browser.
- Favor dependency injection for providers and AI services where helpful.
- Avoid oversized React components.
- Keep business logic outside page components.

## Testing

Each phase must add tests for meaningful logic introduced in that phase.

Before declaring a phase complete:

1. run lint;
2. run TypeScript typecheck;
3. run relevant unit tests;
4. run existing test suite;
5. fix errors;
6. verify database migration state where relevant.

Never mark a phase complete with known failing tests.

## Development workflow

Before changing code:

1. inspect the repository;
2. read existing project instructions;
3. understand existing architecture;
4. reuse existing components and abstractions.

Do not rewrite unrelated code.

Do not proceed into a future phase unless explicitly requested.

At the end of every phase report:

- files created;
- files changed;
- migrations created;
- tests added;
- commands run;
- test results;
- design deviations;
- known limitations;
- recommended next phase.

Do not begin the recommended next phase automatically.
## Phase completion checkpoints

After completing each user-requested phase and passing its required checks, commit and push the phase's progress to `https://github.com/chirangrg99/ai-job-search`.

Keep credentials, local environment files, build artifacts and scratch data out of Git. Review the staged changes before committing. Preserve remote history; do not force-push. If checks fail or pushing is blocked, report the reason and do not claim the phase checkpoint was published. Include the commit and push outcome in the phase report. This workflow does not authorize starting the next phase.
