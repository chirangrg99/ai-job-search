import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { safeJobUrl } from "@/features/discovery/schema";
import { FitBadge, StatusBadge } from "./components";
import { label, salaryText, type ReviewJob, type ReviewFit } from "./model";
export function JobDetailHeader({
  job,
  url,
  fit,
}: {
  job: Pick<
    ReviewJob,
    | "title"
    | "company"
    | "location"
    | "remoteType"
    | "employmentType"
    | "salaryMin"
    | "salaryMax"
    | "salaryCurrency"
    | "salaryPeriod"
    | "salaryEstimated"
    | "provider"
    | "postedAt"
    | "status"
  >;
  url: string | null;
  fit: ReviewFit;
}) {
  const link = safeJobUrl.safeParse(url);
  return (
    <header className="space-y-4 rounded-lg border bg-surface p-5 sm:p-6">
      <PageHeader
        title={job.title}
        description={`${job.company ?? "Company not provided"} · ${job.location ?? "Location not provided"}`}
      />
      <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-text-secondary">
        <p>
          {job.remoteType
            ? label(job.remoteType)
            : "Work arrangement not provided"}{" "}
          · {label(job.employmentType)}
        </p>
        <p>{salaryText(job)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
        <p>Source: {label(job.provider)}</p>
        <p>
          Posted:{" "}
          {job.postedAt ? (
            <time dateTime={job.postedAt}>{job.postedAt.slice(0, 10)}</time>
          ) : (
            "Date not provided"
          )}
        </p>
        <StatusBadge status={job.status} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
        <div>
          <p className="mb-1 text-xs text-text-secondary">Evidence fit</p>
          <FitBadge fit={fit} />
        </div>
        {link.success ? (
          <Button asChild variant="outline">
            <a href={link.data} target="_blank" rel="noopener noreferrer">
              Open Original Posting
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        ) : (
          <p className="text-sm text-text-secondary">
            Original posting URL not provided.
          </p>
        )}
      </div>
    </header>
  );
}
