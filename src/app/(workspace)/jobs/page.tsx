import type { Metadata } from "next";
import { requireUser } from "@/server/auth/guard";
import { discoveryRepository } from "@/server/discovery/repository";
import { createAdzunaProvider } from "@/server/discovery/factory";
import { DiscoveryWorkspace } from "@/features/discovery/workspace";
import { jobReviewRepository } from "@/server/job-review/repository";
import { getServerEnv } from "@/server/env";
import { DEFAULT_PARSER_MODEL } from "@/server/job-parser/prompt";
import { reviewJobs, reviewQuerySchema } from "@/features/job-review/model";
import {
  JobTable,
  ReviewFilters,
  ReviewEmpty,
  ReviewPagination,
} from "@/features/job-review/components";
export const metadata: Metadata = { title: "Jobs" };
export const maxDuration = 300;
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { client, user } = await requireUser();
  const query = reviewQuerySchema.parse(await searchParams);
  const [data, review] = await Promise.all([
    discoveryRepository(client, user.id).overview(false),
    jobReviewRepository(
      client,
      user.id,
      getServerEnv().OPENAI_JOB_PARSER_MODEL ?? DEFAULT_PARSER_MODEL,
    ).load(query.search || null),
  ]);
  const result = reviewJobs(review.jobs, query);
  const configured = createAdzunaProvider(client).validateConfiguration().valid;
  return (
    <DiscoveryWorkspace
      data={data}
      configured={configured}
      review={
        <div className="space-y-5">
          <ReviewFilters
            query={query}
            searches={review.searches}
            sources={[...new Set(review.jobs.map((j) => j.provider))].sort()}
          />
          {result.total ? (
            <JobTable jobs={result.items} />
          ) : (
            <ReviewEmpty hasJobs={review.jobs.length > 0} />
          )}
          <ReviewPagination query={query} {...result} />
          {review.jobs.some((j) => j.provider === "adzuna") && (
            <p className="text-xs text-text-secondary">
              Job data supplied by{" "}
              <a
                href="https://www.adzuna.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Adzuna
              </a>
              . Check the original posting for current availability.
            </p>
          )}
        </div>
      }
    />
  );
}
