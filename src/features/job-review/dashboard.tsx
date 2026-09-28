import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { JobList } from "./components";
import {
  dashboardCounts,
  detailHref,
  label,
  reviewJobs,
  reviewQuerySchema,
  type ReviewJob,
} from "./model";
type Activity = {
  provider: string;
  status: string;
  started_at: string;
  received_count: number;
  error_message: string | null;
};
export function Dashboard({
  jobs,
  sources,
  runs,
  now,
}: {
  jobs: ReviewJob[];
  sources: { provider: string; last_synced_at: string | null }[];
  runs: Activity[];
  now: Date;
}) {
  const counts = dashboardCounts(jobs, now);
  const best = reviewJobs(
    jobs.filter(
      (j) =>
        j.fit.state === "current" &&
        j.fit.result.sufficientEvidence &&
        ["strong_apply", "apply"].includes(j.fit.result.recommendation),
    ),
    reviewQuerySchema.parse({ sort: "fit" }),
    5,
  ).items;
  const needs = jobs
    .filter(
      (j) =>
        j.fit.state !== "current" ||
        !j.fit.result.sufficientEvidence ||
        j.fit.result.missingRequiredRequirements.length ||
        j.likelyDuplicateOf,
    )
    .sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt));
  const stats = [
    {
      label: "New Jobs",
      value: counts.newJobs,
      detail: "Discovered in the last 7 days",
    },
    {
      label: "Strong Matches",
      value: counts.strong,
      detail: "Current strong-apply assessments",
    },
    {
      label: "Ready to Apply",
      value: counts.ready,
      detail: "Applications with ready status",
    },
    {
      label: "Applied",
      value: counts.applied,
      detail: "Submitted in the last 30 days",
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your opportunities, priorities and application progress."
        action={
          <Button asChild>
            <Link href="/jobs#discovery">Discover jobs</Link>
          </Button>
        }
      />
      <div className="grid gap-4 min-[400px]:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <section
            key={s.label}
            className="space-y-2 rounded-lg border bg-surface p-6 shadow-sm"
          >
            <h2 className="text-sm font-medium text-text-secondary">
              {s.label}
            </h2>
            <p className="text-3xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-xs text-text-secondary">{s.detail}</p>
          </section>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <section className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-section font-semibold">Best Matches</h2>
            <Link
              href="/jobs?sort=fit"
              className="min-h-11 py-3 text-sm text-primary underline"
            >
              View all jobs
            </Link>
          </div>
          {best.length ? (
            <JobList
              jobs={best}
              caption="Your strongest current opportunities"
            />
          ) : (
            <div className="rounded-lg border bg-surface p-6">
              <h3 className="font-semibold">
                {jobs.length
                  ? "No strong or apply recommendations yet"
                  : "No discovered jobs yet"}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">
                {jobs.length
                  ? "Open a job, parse its posting and assess fit against your verified profile. Only current, supported assessments appear here."
                  : "Add a saved search and sync, or add a posting manually to start reviewing opportunities."}
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href={jobs.length ? "/jobs" : "/preferences"}>
                  {jobs.length ? "Review jobs" : "Create saved search"}
                </Link>
              </Button>
            </div>
          )}
          <section className="rounded-lg border bg-surface p-6">
            <h2 className="text-section font-semibold">
              Needs Attention{" "}
              <span className="text-sm text-text-secondary">
                ({needs.length})
              </span>
            </h2>
            {needs.length ? (
              <ul className="mt-3 divide-y">
                {needs.slice(0, 5).map((j) => (
                  <li key={j.id} className="py-3">
                    <Link
                      href={detailHref(j)}
                      className="inline-block min-h-11 py-2 text-sm font-medium text-primary underline"
                    >
                      {j.title}
                    </Link>
                    <p className="text-xs text-text-secondary">
                      {j.likelyDuplicateOf
                        ? "Possible duplicate — compare postings"
                        : j.fit.state === "stale"
                          ? "Inputs changed — reassess fit"
                          : j.fit.state === "unassessed"
                            ? "Parse and assess this posting"
                            : !j.fit.result.sufficientEvidence
                              ? "More verified evidence needed"
                              : `${j.fit.result.missingRequiredRequirements.length} required gaps to review`}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-text-secondary">
                {jobs.length
                  ? "No outstanding review items in your current assessments."
                  : "Review tasks will appear after discovering jobs."}
              </p>
            )}
            {needs.length > 5 && (
              <Link
                href="/jobs"
                className="inline-block min-h-11 py-3 text-sm text-primary underline"
              >
                Review all jobs
              </Link>
            )}
          </section>
        </section>
        <aside className="space-y-4">
          <section className="space-y-4 rounded-lg border bg-surface p-6">
            <h2 className="text-section font-semibold">Discovery activity</h2>
            {sources.length ? (
              sources.map((s) => (
                <div key={s.provider}>
                  <p className="text-sm font-medium">{label(s.provider)}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Last successful sync:{" "}
                    {s.last_synced_at
                      ? `${s.last_synced_at.slice(0, 10)} ${s.last_synced_at.slice(11, 16)} UTC`
                      : "Never"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-secondary">
                No sync has run yet.
              </p>
            )}
            {runs[0] && (
              <div className="border-t pt-3 text-sm">
                <p>Latest attempt: {label(runs[0].status)}</p>
                <p className="mt-1 text-xs text-text-secondary">
                  {runs[0].started_at.slice(0, 10)}{" "}
                  {runs[0].started_at.slice(11, 16)} UTC ·{" "}
                  {runs[0].received_count} received
                </p>
                {runs[0].error_message && (
                  <p className="mt-2 text-warning">{runs[0].error_message}</p>
                )}
              </div>
            )}
            <Button asChild variant="outline">
              <Link href="/jobs#discovery">Sync jobs</Link>
            </Button>
            <Link
              href="/preferences"
              className="block min-h-11 py-3 text-sm text-primary underline"
            >
              Manage saved searches
            </Link>
          </section>
          <section className="space-y-2 rounded-lg border bg-surface p-6">
            <h2 className="font-semibold">Keep your evidence current</h2>
            <p className="text-sm text-text-secondary">
              Verify profile facts before assessing a job. Fit is advisory, not
              a hiring probability.
            </p>
            <Link
              href="/profile"
              className="inline-block min-h-11 py-3 text-sm text-primary underline"
            >
              Review master profile
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
