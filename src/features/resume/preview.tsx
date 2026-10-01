import { FilePenLine, BadgeCheck, CircleHelp } from "lucide-react";
import { resolveResume } from "./validate";
import type {
  Claim,
  ResumeContext,
  ResumeDraft,
  ResumeValidation,
} from "./schema";
function Evidence({ claim }: { claim: Claim }) {
  return (
    <div>
      <p>{claim.text}</p>
      <details className="mt-1 text-xs text-text-secondary">
        <summary className="min-h-11 cursor-pointer py-3 text-primary">
          Verified source evidence ({claim.sources.length})
        </summary>
        <ul className="space-y-2">
          {claim.sources.map((s, i) => (
            <li key={i}>
              <q>{s.quote}</q>
              <p className="break-all">
                {s.sourceId} · {s.field}
              </p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
export function ResumePreview({
  draft,
  context,
}: {
  draft: ResumeDraft;
  context: ResumeContext;
}) {
  const resume = resolveResume(draft, context);
  return (
    <article
      aria-label="Resume preview"
      className="min-w-0 space-y-6 rounded-lg border bg-surface p-5 [overflow-wrap:anywhere] sm:p-8"
    >
      <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-2 text-xs text-primary">
        <FilePenLine size={16} aria-hidden="true" />
        AI DRAFT · Review before use
      </p>
      <div className="text-section font-semibold">
        <Evidence claim={resume.headline} />
      </div>
      <section>
        <h3 className="mb-3 text-xs font-medium tracking-wide text-primary uppercase">
          Professional summary
        </h3>
        <div className="space-y-2">
          {resume.professionalSummary.map((claim, i) => (
            <Evidence key={i} claim={claim} />
          ))}
        </div>
      </section>
      {!!resume.skills.length && (
        <section>
          <h3 className="mb-3 text-xs font-medium tracking-wide text-primary uppercase">
            Skills
          </h3>
          <ul className="space-y-1">
            {resume.skills.map((claim, i) => (
              <li key={i}>
                <Evidence claim={claim} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {!!resume.experiences.length && (
        <section>
          <h3 className="mb-3 text-xs font-medium tracking-wide text-primary uppercase">
            Relevant experience
          </h3>
          {resume.experiences.map((e) => (
            <div key={e.sourceId} className="mb-5">
              <h4 className="font-semibold">
                {String(e.original.title ?? "")} ·{" "}
                {String(e.original.company ?? "")}
              </h4>
              <p className="text-sm text-text-secondary">
                {String(e.original.start_date ?? "")} —{" "}
                {e.original.currently_employed
                  ? "Present"
                  : String(e.original.end_date ?? "Date not provided")}
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {e.bullets.map((claim, i) => (
                  <li key={i}>
                    <Evidence claim={claim} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
      {!!resume.projects.length && (
        <section>
          <h3 className="mb-3 text-xs font-medium tracking-wide text-primary uppercase">
            Projects
          </h3>
          {resume.projects.map((p) => (
            <div key={p.sourceId} className="mb-4">
              <h4 className="font-semibold">{String(p.original.name ?? "")}</h4>
              {p.bullets.map((claim, i) => (
                <Evidence key={i} claim={claim} />
              ))}
            </div>
          ))}
        </section>
      )}
      {!!resume.education.length && (
        <section>
          <h3 className="mb-3 text-xs font-medium tracking-wide text-primary uppercase">
            Education
          </h3>
          {resume.education.map((e) => (
            <div key={e.id} className="mb-3">
              <p>
                {String(e.values.credential ?? "")} ·{" "}
                {String(e.values.field_of_study ?? "")}
              </p>
              <p>{String(e.values.institution ?? "")}</p>
              <p className="text-sm">
                {String(e.values.start_date ?? "")} —{" "}
                {String(e.values.end_date ?? "")}
              </p>
              <p className="text-xs break-all text-text-secondary">
                VERIFIED · education:{e.id}
              </p>
            </div>
          ))}
        </section>
      )}
      {!!resume.licencesCertifications.length && (
        <section>
          <h3 className="mb-3 text-xs font-medium tracking-wide text-primary uppercase">
            Licences and certifications
          </h3>
          {resume.licencesCertifications.map((c) => (
            <div key={c.id} className="mb-3">
              <p>{String(c.values.title ?? "")}</p>
              <p className="text-sm">
                {String(c.values.valid_from ?? "")} —{" "}
                {String(c.values.valid_to ?? "")}
              </p>
              <p className="text-xs break-all text-text-secondary">
                VERIFIED · credential:{c.id}
              </p>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}
export function ValidationPanel({
  validation,
  stale,
}: {
  validation: ResumeValidation;
  stale: boolean;
}) {
  const passed = validation.passed && !stale;
  return (
    <section className="space-y-4 rounded-lg border bg-surface p-5 [overflow-wrap:anywhere] sm:p-6">
      <h2 className="text-section font-semibold">Validation &amp; readiness</h2>
      <p
        className={`flex items-center gap-2 text-sm ${passed ? "text-success" : "text-warning"}`}
      >
        {passed ? (
          <BadgeCheck size={20} aria-hidden="true" />
        ) : (
          <CircleHelp size={20} aria-hidden="true" />
        )}
        {stale
          ? "NEEDS INPUT · Sources changed"
          : passed
            ? "Validation passed · AI draft"
            : "UNSUPPORTED · Validation blocked"}
      </p>
      {stale && (
        <p className="text-sm">
          The current profile or job no longer matches this version. Regenerate
          before using it.
        </p>
      )}
      <ul className="space-y-3 text-sm">
        {validation.issues.map((i, n) => (
          <li key={n}>
            <span className="font-medium">{i.path}</span>: {i.message}
          </li>
        ))}
      </ul>
      {!!validation.unsupportedClaims.length && (
        <details>
          <summary className="min-h-11 cursor-pointer py-3 text-sm">
            Unsupported claims ({validation.unsupportedClaims.length})
          </summary>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {validation.unsupportedClaims.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </details>
      )}
      {validation.warnings.map((w, i) => (
        <p key={i} className="text-sm text-text-secondary">
          {w}
        </p>
      ))}
      <p className="text-xs text-text-secondary">
        This package stays in preparation. Applying is always manual.
      </p>
    </section>
  );
}
