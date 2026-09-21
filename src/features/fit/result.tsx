import Link from "next/link";
import { BadgeCheck, CircleHelp } from "lucide-react";
import { categoryLabels, FIT_CONFIG, type FitResult } from "./model";
const names = {
  exact: "Exact evidence",
  partial: "Partial evidence",
  transferable: "Transferable — not exact",
  missing: "Unsupported",
  unknown: "Needs input",
};
export function FitResultView({ result }: { result: FitResult }) {
  return (
    <section
      className="space-y-5 rounded-lg border bg-surface p-5"
      aria-labelledby="fit-result-heading"
    >
      <h2 id="fit-result-heading" className="text-section font-semibold">
        Evidence fit
      </h2>
      {result.sufficientEvidence ? (
        <>
          <p className="text-3xl font-semibold">{result.fitScore} / 100</p>
          <p className="font-medium">
            {result.recommendation.replaceAll("_", " ")}
          </p>
          <meter
            aria-label="Evidence fit score"
            min={0}
            max={100}
            value={result.fitScore}
            className="h-3 w-full accent-primary"
          />
        </>
      ) : (
        <p className="font-medium text-warning">Insufficient evidence</p>
      )}
      <p className="text-sm text-text-secondary">{result.reasoningSummary}</p>
      <p className="text-xs text-text-secondary">
        Evaluated as of {result.asOf}. Profile, search, posting or date changes
        require a new assessment.
      </p>
      {result.caps.map((c) => (
        <p key={c} className="rounded-md bg-warning-soft p-3 text-sm">
          {c}
        </p>
      ))}
      <details>
        <summary className="min-h-11 cursor-pointer py-3 font-medium">
          How the score is calculated
        </summary>
        <p className="mb-3 text-sm">
          Exact evidence earns 100% of its criterion weight; partial 50%;
          transferable 25%; unknown or unsupported 0%. Required criteria weigh
          3× preferred criteria. Inactive categories are excluded.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Score breakdown before caps</caption>
            <thead>
              <tr>
                <th className="p-2">Category</th>
                <th className="p-2">Base weight</th>
                <th className="p-2">Points</th>
              </tr>
            </thead>
            <tbody>
              {result.breakdown.map((b) => (
                <tr key={b.category} className="border-t">
                  <th className="p-2 font-medium">
                    {categoryLabels[b.category]}
                  </th>
                  <td className="p-2">{FIT_CONFIG.weights[b.category]}</td>
                  <td className="p-2">
                    {b.available ? b.points.toFixed(1) : "Not applicable"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm">
          Before caps: {result.uncappedScore}. Strong apply ≥80, apply ≥65,
          maybe ≥40, skip below 40. Missing mandatory credentials cap the score
          at 39; unresolved required criteria cap it at 79. The saved search
          minimum is a separate preference.
        </p>
      </details>
      <details>
        <summary className="min-h-11 cursor-pointer py-3 font-medium">
          Strengths and concerns
        </summary>
        <h3 className="font-medium">Strengths</h3>
        {result.strengths.length ? (
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {result.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">No fully supported criteria yet.</p>
        )}
        <h3 className="mt-4 font-medium">Concerns</h3>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {result.concerns.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </details>
      <h3 className="font-semibold">Requirement evidence</h3>
      <p className="text-sm text-text-secondary">
        {result.matchedRequirements.length} matched ·{" "}
        {result.partialRequirements.length} partial/transferable ·{" "}
        {result.missingRequiredRequirements.length} required gaps ·{" "}
        {result.missingPreferredRequirements.length} preferred gaps
      </p>
      <div className="space-y-3">
        {result.matches.map((m) => (
          <article
            key={m.id}
            className="space-y-2 rounded-md border p-4 [overflow-wrap:anywhere]"
          >
            <h4 className="font-medium">{m.text}</h4>
            <p className="text-xs text-text-secondary">
              {categoryLabels[m.category]} · {m.priority}
            </p>
            <p
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${m.status === "exact" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}
            >
              {m.status === "exact" ? (
                <BadgeCheck className="size-4" aria-hidden="true" />
              ) : (
                <CircleHelp className="size-4" aria-hidden="true" />
              )}
              {names[m.status]}
              {m.method === "semantic" ? " · AI draft" : ""}
            </p>
            <p className="text-sm text-text-secondary">{m.reason}</p>
            <details>
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
                View sources
              </summary>
              <p className="text-xs font-medium">Job wording</p>
              <blockquote className="my-2 text-sm whitespace-pre-wrap">
                {m.evidence}
              </blockquote>
              {m.sources.map((s) => (
                <div key={`${s.kind}-${s.id}`} className="mt-3 border-t pt-3">
                  <p className="text-sm font-medium">
                    {s.kind === "preference"
                      ? "Saved preference"
                      : "Verified source"}
                    : {s.label}
                  </p>
                  <blockquote className="my-2 text-sm whitespace-pre-wrap">
                    {s.quote}
                  </blockquote>
                  <p className="text-xs break-all text-text-secondary">
                    Source ID: {s.id} · Revision: {s.revision}
                  </p>
                  <Link
                    className="inline-block min-h-11 py-3 text-sm text-primary underline"
                    href={
                      s.kind === "preference"
                        ? "/preferences"
                        : `/profile#section-${s.kind === "bullet" ? "experience" : s.kind}`
                    }
                  >
                    Review source
                  </Link>
                </div>
              ))}
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
