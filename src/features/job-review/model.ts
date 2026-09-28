import { z } from "zod";
import { applicationStatuses } from "@/lib/domain";
import type { FitResult } from "@/features/fit/model";
import { normalize } from "@/features/preferences/schema";
export const statuses = ["new", ...applicationStatuses] as const;
export const label = (value: string | null) =>
  value
    ? value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())
    : "Not provided";
export type ReviewFit =
  | {
      state: "current";
      result: FitResult;
      preferenceId: string | null;
      searchName: string;
      mode: "rules" | "semantic";
      analyzedAt: string;
    }
  | { state: "stale" }
  | { state: "unassessed" };
export type ReviewJob = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  remoteType: string | null;
  employmentType: string | null;
  provider: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  salaryEstimated: boolean;
  postedAt: string | null;
  discoveredAt: string;
  status: string;
  submittedAt: string | null;
  searchIds: string[];
  fit: ReviewFit;
  likelyDuplicateOf: string | null;
};
export const reviewQuerySchema = z.object({
  q: z.string().trim().max(200).catch(""),
  search: z.union([z.uuid(), z.literal("")]).catch(""),
  location: z.string().trim().max(200).catch(""),
  remote: z.string().max(80).catch(""),
  employment: z.string().max(80).catch(""),
  source: z.string().max(80).catch(""),
  status: z.enum(["", ...statuses]).catch(""),
  fit: z.enum(["", "strong", "unassessed", "stale", "insufficient"]).catch(""),
  minFit: z
    .preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      z.coerce.number().int().min(0).max(100).nullable(),
    )
    .catch(null),
  sort: z
    .enum(["newest", "oldest", "fit", "title", "company", "posted"])
    .catch("newest"),
  page: z.coerce.number().int().positive().max(1000000).catch(1),
});
export type ReviewQuery = z.infer<typeof reviewQuerySchema>;
export const score = (job: ReviewJob) =>
  job.fit.state === "current" && job.fit.result.sufficientEvidence
    ? job.fit.result.fitScore
    : null;
export function reviewJobs(
  jobs: ReviewJob[],
  query: ReviewQuery,
  pageSize = 20,
) {
  const terms = normalize(query.q).split(/\s+/).filter(Boolean);
  const filtered = jobs.filter((j) => {
    const fit = score(j);
    return (
      terms.every((t) =>
        normalize(`${j.title} ${j.company ?? ""} ${j.location ?? ""}`).includes(
          t,
        ),
      ) &&
      (!query.search || j.searchIds.includes(query.search)) &&
      (!query.location ||
        normalize(j.location ?? "").includes(normalize(query.location))) &&
      (!query.remote || (j.remoteType ?? "unknown") === query.remote) &&
      (!query.employment ||
        (j.employmentType ?? "unknown") === query.employment) &&
      (!query.source || j.provider === query.source) &&
      (!query.status || j.status === query.status) &&
      (query.minFit === null || (fit !== null && fit >= query.minFit)) &&
      (!query.fit ||
        (query.fit === "strong"
          ? j.fit.state === "current" &&
            j.fit.result.sufficientEvidence &&
            j.fit.result.recommendation === "strong_apply"
          : query.fit === "insufficient"
            ? j.fit.state === "current" && !j.fit.result.sufficientEvidence
            : j.fit.state === query.fit))
    );
  });
  filtered.sort((a, b) => {
    let order = 0;
    if (query.sort === "fit") order = (score(b) ?? -1) - (score(a) ?? -1);
    else if (query.sort === "title" || query.sort === "company")
      order = normalize(a[query.sort] ?? "").localeCompare(
        normalize(b[query.sort] ?? ""),
        "en",
      );
    else if (query.sort === "posted")
      order = (b.postedAt ?? "").localeCompare(a.postedAt ?? "");
    else
      order =
        a.discoveredAt.localeCompare(b.discoveredAt) *
        (query.sort === "oldest" ? 1 : -1);
    return order || a.id.localeCompare(b.id);
  });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    page = Math.min(query.page, pages);
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    pages,
    page,
  };
}
export function jobsHref(query: ReviewQuery, patch: Partial<ReviewQuery> = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...query, ...patch }))
    if (v !== null && v !== "") p.set(k, String(v));
  return `/jobs?${p}`;
}
export function detailHref(job: ReviewJob) {
  const p = new URLSearchParams();
  if (job.fit.state === "current") {
    if (job.fit.preferenceId) p.set("search", job.fit.preferenceId);
    p.set("fit", job.fit.mode);
  }
  return `/jobs/${job.id}${p.size ? `?${p}` : ""}`;
}
export function salaryText(
  job: Pick<
    ReviewJob,
    | "salaryMin"
    | "salaryMax"
    | "salaryCurrency"
    | "salaryPeriod"
    | "salaryEstimated"
  >,
) {
  const fmt = (n: number) =>
    n.toLocaleString("en-CA", { maximumFractionDigits: 2 });
  const range =
    job.salaryMin !== null && job.salaryMax !== null
      ? `${fmt(job.salaryMin)}–${fmt(job.salaryMax)}`
      : job.salaryMin !== null
        ? `From ${fmt(job.salaryMin)}`
        : job.salaryMax !== null
          ? `Up to ${fmt(job.salaryMax)}`
          : null;
  return range
    ? `${job.salaryCurrency ?? "Currency unknown"} ${range} / ${job.salaryPeriod ?? "period unknown"}${job.salaryEstimated ? " (estimated)" : ""}`
    : "Salary not provided";
}
export function dashboardCounts(jobs: ReviewJob[], now: Date) {
  const recent = (date: string | null, days: number) =>
    date !== null &&
    Date.parse(date) <= now.getTime() &&
    Date.parse(date) >= now.getTime() - days * 86400000;
  return {
    newJobs: jobs.filter((j) => recent(j.discoveredAt, 7)).length,
    strong: jobs.filter(
      (j) =>
        j.fit.state === "current" &&
        j.fit.result.sufficientEvidence &&
        j.fit.result.recommendation === "strong_apply",
    ).length,
    ready: jobs.filter((j) => j.status === "ready_to_apply").length,
    applied: jobs.filter((j) => recent(j.submittedAt, 30)).length,
  };
}
