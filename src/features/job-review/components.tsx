import Link from "next/link";
import { BadgeCheck, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { employmentTypes, remoteModes } from "@/features/preferences/schema";
import {
  detailHref,
  jobsHref,
  label,
  salaryText,
  statuses,
  type ReviewFit,
  type ReviewJob,
  type ReviewQuery,
} from "./model";
export function FitBadge({ fit }: { fit: ReviewFit }) {
  if (fit.state !== "current")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
        <CircleHelp aria-hidden="true" className="size-4" />
        {fit.state === "stale" ? "Needs reassessment" : "Not assessed"}
      </span>
    );
  if (!fit.result.sufficientEvidence)
    return (
      <span className="text-xs font-medium text-warning">
        Insufficient evidence
      </span>
    );
  return (
    <span className="inline-flex flex-col gap-1">
      <span className="font-semibold text-primary">
        {fit.result.fitScore} / 100
      </span>
      <span className="text-xs">{label(fit.result.recommendation)}</span>
    </span>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium">
      {status === "ready_to_apply" && (
        <BadgeCheck className="size-4" aria-hidden="true" />
      )}
      {label(status)}
    </span>
  );
}
export function ReviewFilters({
  query,
  searches,
  sources,
}: {
  query: ReviewQuery;
  searches: { id: string; name: string }[];
  sources: string[];
}) {
  const select = (
    name: keyof ReviewQuery,
    title: string,
    options: { value: string; name: string }[],
  ) => (
    <label className="space-y-2 text-sm font-medium" key={name}>
      <span className="block">{title}</span>
      <select
        name={name}
        defaultValue={String(query[name] ?? "")}
        className="min-h-11 w-full rounded-md border border-control-border bg-surface px-3 text-sm"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
  const opts = (items: readonly string[]) =>
    items.map((value) => ({ value, name: label(value) }));
  return (
    <form
      action="/jobs"
      role="search"
      aria-label="Filter discovered jobs"
      className="space-y-4 rounded-lg border bg-surface p-5"
      key={jobsHref(query)}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 text-sm font-medium sm:col-span-2">
          <span className="block">Search jobs</span>
          <Input
            name="q"
            defaultValue={query.q}
            maxLength={200}
            placeholder="Title, company or location"
            type="search"
          />
        </label>
        {select(
          "search",
          "Discovered by saved search",
          searches.map((s) => ({ value: s.id, name: s.name })),
        )}
        <label className="space-y-2 text-sm font-medium">
          <span className="block">Location</span>
          <Input
            name="location"
            defaultValue={query.location}
            placeholder="City or region"
            maxLength={200}
          />
        </label>
        {select(
          "remote",
          "Work arrangement",
          opts([...remoteModes, "unknown"]),
        )}
        {select(
          "employment",
          "Employment type",
          opts([...employmentTypes, "unknown"]),
        )}
        {select("source", "Source", opts(sources))}
        {select("status", "Application status", opts(statuses))}
        {select("fit", "Fit state", [
          { value: "strong", name: "Strong matches" },
          { value: "unassessed", name: "Not assessed" },
          { value: "stale", name: "Needs reassessment" },
          { value: "insufficient", name: "Insufficient evidence" },
        ])}
        <label className="space-y-2 text-sm font-medium">
          <span className="block">Minimum fit score</span>
          <Input
            name="minFit"
            type="number"
            min={0}
            max={100}
            step={1}
            defaultValue={query.minFit ?? ""}
            placeholder="0–100"
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span className="block">Sort by</span>
          <select
            name="sort"
            defaultValue={query.sort}
            className="min-h-11 w-full rounded-md border border-control-border bg-surface px-3 text-sm"
          >
            {[
              { value: "newest", name: "Newest discovery" },
              { value: "oldest", name: "Oldest discovery" },
              { value: "fit", name: "Highest current fit" },
              { value: "posted", name: "Newest posted date" },
              { value: "title", name: "Job title A–Z" },
              { value: "company", name: "Company A–Z" },
            ].map((o) => (
              <option key={o.value} value={o.value}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">Apply filters</Button>
          <Button asChild variant="ghost">
            <Link href="/jobs">Clear</Link>
          </Button>
        </div>
      </div>
      <p className="text-xs text-text-secondary">
        Fit filters use current assessments only. Selecting a saved search shows
        jobs discovered by it and scores assessed for that search. Otherwise the
        latest current assessment is shown.
      </p>
    </form>
  );
}
export function JobList({
  jobs,
  caption = "Discovered jobs",
}: {
  jobs: ReviewJob[];
  caption?: string;
}) {
  return (
    <ul aria-label={caption} className="divide-y rounded-lg border bg-surface">
      {jobs.map((j) => (
        <li key={j.id} className="space-y-2 p-4 [overflow-wrap:anywhere]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link
                href={detailHref(j)}
                className="inline-block min-h-11 py-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                {j.title}
              </Link>
              <p className="text-sm text-text-secondary">
                {j.company ?? "Company not provided"}
              </p>
            </div>
            <FitBadge fit={j.fit} />
          </div>
          <p className="text-xs text-text-secondary">
            {j.location ?? "Location not provided"} ·{" "}
            {j.remoteType ? label(j.remoteType) : "Work arrangement unknown"}
          </p>
          <p className="text-xs text-text-secondary">{salaryText(j)}</p>
          <p className="text-xs text-text-secondary">
            {label(j.provider)} · {label(j.employmentType)} · Discovered{" "}
            {j.discoveredAt.slice(0, 10)}
          </p>
          {j.fit.state === "current" && (
            <p className="text-xs text-text-secondary">
              {j.fit.searchName} ·{" "}
              {j.fit.mode === "rules" ? "Rules" : "Rules + semantic"}
            </p>
          )}
          <StatusBadge status={j.status} />
          {j.likelyDuplicateOf && (
            <Link
              href={`/jobs/${j.likelyDuplicateOf}`}
              className="block min-h-11 py-3 text-xs text-warning underline"
            >
              Compare possible duplicate
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
export function JobTable({
  jobs,
  caption = "Discovered jobs",
}: {
  jobs: ReviewJob[];
  caption?: string;
}) {
  return (
    <>
      <div className="md:hidden">
        <JobList jobs={jobs} caption={caption} />
      </div>
      <div className="hidden overflow-hidden rounded-lg border bg-surface md:block">
        <div
          className="overflow-x-auto"
          role="region"
          aria-label={caption}
          tabIndex={0}
        >
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="p-5 text-left font-semibold">{caption}</caption>
            <thead className="border-y bg-surface-subtle text-xs text-text-secondary">
              <tr>
                {[
                  "Job / company",
                  "Location / work",
                  "Salary",
                  "Evidence fit",
                  "Status / discovered",
                ].map((t) => (
                  <th key={t} scope="col" className="px-5 py-3 font-medium">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr
                  key={j.id}
                  className="border-b last:border-0 hover:bg-surface-subtle/50"
                >
                  <td className="max-w-80 px-5 py-4 align-top">
                    <Link
                      className="inline-block min-h-11 py-2 font-semibold [overflow-wrap:anywhere] text-primary underline-offset-4 hover:underline"
                      href={detailHref(j)}
                    >
                      {j.title}
                    </Link>
                    <p className="text-text-secondary">
                      {j.company ?? "Company not provided"}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {label(j.provider)} · {label(j.employmentType)}
                    </p>
                    {j.likelyDuplicateOf && (
                      <Link
                        href={`/jobs/${j.likelyDuplicateOf}`}
                        className="mt-1 inline-block min-h-11 py-3 text-xs text-warning underline"
                      >
                        Compare possible duplicate
                      </Link>
                    )}
                  </td>
                  <td className="max-w-52 px-5 py-4 align-top">
                    <p>{j.location ?? "Location not provided"}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {j.remoteType
                        ? label(j.remoteType)
                        : "Work arrangement unknown"}
                    </p>
                  </td>
                  <td className="max-w-48 px-5 py-4 align-top text-text-secondary">
                    {salaryText(j)}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <FitBadge fit={j.fit} />
                    {j.fit.state === "current" && (
                      <p className="mt-2 max-w-40 text-xs text-text-secondary">
                        {j.fit.searchName} ·{" "}
                        {j.fit.mode === "rules" ? "Rules" : "Rules + semantic"}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <StatusBadge status={j.status} />
                    <time
                      className="mt-2 block text-xs text-text-secondary"
                      dateTime={j.discoveredAt}
                    >
                      {j.discoveredAt.slice(0, 10)}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
export function ReviewEmpty({ hasJobs }: { hasJobs: boolean }) {
  return (
    <section className="rounded-lg border bg-surface p-8 text-center">
      <h2 className="text-section font-semibold">
        {hasJobs
          ? "No jobs match these filters"
          : "Your job collection starts here"}
      </h2>
      <p className="mx-auto mt-2 max-w-prose text-sm text-text-secondary">
        {hasJobs
          ? "Try a broader location or lower minimum score. Jobs without a current score are excluded by score filters."
          : "Create an enabled saved search and sync jobs, or add a known posting manually."}
      </p>
      <Button asChild variant="outline" className="mt-4">
        <Link href={hasJobs ? "/jobs" : "/preferences"}>
          {hasJobs ? "Clear filters" : "Set up a saved search"}
        </Link>
      </Button>
    </section>
  );
}
export function ReviewPagination({
  query,
  page,
  pages,
  total,
}: {
  query: ReviewQuery;
  page: number;
  pages: number;
  total: number;
}) {
  return (
    <nav
      aria-label="Job results pages"
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p>
        {total
          ? `${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total} jobs`
          : "0 jobs"}{" "}
        · Page {page} of {pages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline">
            <Link href={jobsHref(query, { page: page - 1 })}>Previous</Link>
          </Button>
        ) : (
          <Button disabled variant="outline">
            Previous
          </Button>
        )}
        {page < pages ? (
          <Button asChild variant="outline">
            <Link href={jobsHref(query, { page: page + 1 })}>Next</Link>
          </Button>
        ) : (
          <Button disabled variant="outline">
            Next
          </Button>
        )}
      </div>
    </nav>
  );
}
