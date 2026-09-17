# Master candidate profile

Phase 3 adds manual structured entry at `/profile`. The server determines identity using Supabase Auth; the browser never chooses a profile owner. Profile components call server actions through validated services and a typed candidate repository. RLS provides a second ownership boundary, including experience bullets through their parent experience.

## Entry and verification

Personal information and the professional summary edit the existing candidate profile. Experiences, independently editable bullets, education, skills/facts, licences/certifications and projects support create, edit and confirmed deletion. Deleting an experience also deletes its bullets. The summary can be cleared through its editor; the candidate profile itself cannot be deleted here.

Saving creates unverified information. Review the saved entry and explicitly confirm its accuracy to mark it verified. Verification is candidate confirmation, not external credential validation. Every source item has a visible text/icon state. Changed content invalidates verification in database triggers, including direct database updates. Personal and summary verification are independent. Changing an experience header invalidates its bullets because their context has changed. Revision checks reject stale edits and confirmations. No AI updates or generation exist in this feature.

Optional source references describe the candidate's evidence; these are text references, not document uploads. Multiple categories and custom tags are accepted on each career entry. Licences and certifications use typed candidate fact records.

## Dates and completeness

Dates accept year, year/month or full date. Unknown dates remain blank. Precision is stored separately and preserved for display. Partial start dates use the lower calendar bound and partial end dates use the upper bound in date columns; consumers must use precision, rather than presenting those bounds as exact dates. Currently employed clears and prevents an end date.

Completeness measures population of five core sections: personal information (full name), summary, experience, education and skills/facts. It is not a measure of truth, job fit or every optional field. Projects and credentials remain optional. The UI lists missing core sections and counts populated verified and unverified source items; experience bullets count as source items.

## Database and validation

- `20260917045648_profile_verification.sql`: verification/source/revision fields, precision fields, categories and verification-reset triggers.
- `20260917133117_invalidate_experience_bullets.sql`: invalidation and revision advancement for bullets after experience content changes.

Both migrations are applied to `ai-job-finding`. The generated database types include the new columns. Tests apply the complete migration sequence from an empty embedded PostgreSQL database and exercise RLS plus verification SQL fixtures. Hosted verification SQL also passed inside a rolled-back transaction; synthetic fixtures do not remain in the candidate profile.

Forms validate with Zod on both client and server. Repository writes derive ownership from the authenticated user and scope updates/deletes by owner and revision. Server errors preserve unsaved form content. Dirty drawers ask before discarding; verification/deletion require explicit confirmation.
