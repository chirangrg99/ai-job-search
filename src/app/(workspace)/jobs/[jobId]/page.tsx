import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/guard";
import { getServerEnv } from "@/server/env";
import { jobParserRepository } from "@/server/job-parser/repository";
import { DEFAULT_PARSER_MODEL } from "@/server/job-parser/prompt";

import { PostingSourceEditor } from "@/features/job-parser/posting-source-editor";
import { ParseControl } from "@/features/job-parser/parse-control";
import { ParsedRequirements } from "@/features/job-parser/requirements";
import { descriptionSchema } from "@/features/job-parser/schema";

import { fitRepository } from "@/server/fit/repository";
import { preferencesRepository } from "@/server/preferences/repository";
import { FitControl } from "@/features/fit/control";
import { FitResultView } from "@/features/fit/result";
import { DetailTabs } from "@/features/job-review/detail-tabs";
import { JobDetailHeader } from "@/features/job-review/detail-header";
import { PrepareControl } from "@/features/job-review/prepare-control";
import type { ReviewFit } from "@/features/job-review/model";
export const metadata: Metadata = { title: "Job Detail" };
export const maxDuration = 120;
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ search?: string; fit?: string }>;
}) {
  const { client, user } = await requireUser();
  const { jobId } = await params;
  if (!z.uuid().safeParse(jobId).success) notFound();
  const env = getServerEnv(),
    model = env.OPENAI_JOB_PARSER_MODEL ?? DEFAULT_PARSER_MODEL;
  const repo = jobParserRepository(client, user.id, model),
    job = await repo.job(jobId);
  if (!job) notFound();
  const current = job.source
    ? await repo.current(job.id, job.source, job.complete)
    : null;
  const query = await searchParams;
  const preferenceId = z.uuid().safeParse(query.search).success
    ? query.search!
    : null;
  const mode = query.fit === "semantic" ? "semantic" : "rules";
  const searches = await preferencesRepository(client, user.id).list();
  let assessment = null;
  let fitError = "";
  if (current?.parsed_output) {
    try {
      const fit = fitRepository(client, user.id, model);
      const snapshot = await fit.load(
        jobId,
        preferenceId,
        mode,
        new Date().toISOString().slice(0, 10),
      );
      assessment = await fit.current(snapshot);
    } catch {
      fitError =
        "Could not load the assessment. Check the saved search or reload.";
    }
  }
  const [details, application] = await Promise.all([
    client
      .from("jobs")
      .select(
        "provider,remote_type,employment_type,salary_min,salary_max,salary_currency,posted_at,normalized_data,likely_duplicate_of",
      )
      .eq("id", jobId)
      .eq("owner_profile_id", job.profileId)
      .single(),
    client
      .from("applications")
      .select("status")
      .eq("profile_id", job.profileId)
      .eq("job_id", jobId)
      .maybeSingle(),
  ]);
  if (details.error || application.error)
    throw new Error("Could not load job details. Please retry.");
  const meta = z
    .object({
      raw: z.object({
        salaryPeriod: z.string().nullable().optional(),
        salaryEstimated: z.boolean().nullable().optional(),
      }),
    })
    .safeParse(details.data.normalized_data);
  const fit: ReviewFit = assessment
    ? {
        state: "current",
        result: assessment.result,
        preferenceId,
        searchName:
          searches.find((s) => s.id === preferenceId)?.name ?? "Profile only",
        mode,
        analyzedAt: assessment.analyzedAt,
      }
    : { state: "unassessed" };
  const requirements = current?.parsed_output ? (
    <ParsedRequirements data={current.parsed_output} />
  ) : (
    <section className="rounded-lg border bg-surface p-5">
      <h2 className="font-semibold">Requirements not yet available</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Open Description to review the source and run the parser before
        assessing fit.
      </p>
    </section>
  );
  return (
    <div className="space-y-6">
      <Link
        href="/jobs"
        className="inline-block min-h-11 py-3 text-sm text-primary underline"
      >
        Back to jobs
      </Link>
      <JobDetailHeader
        job={{
          title: job.title,
          company: job.company,
          location: job.location,
          remoteType: details.data.remote_type,
          employmentType: details.data.employment_type,
          provider: details.data.provider,
          salaryMin: details.data.salary_min,
          salaryMax: details.data.salary_max,
          salaryCurrency: details.data.salary_currency,
          salaryPeriod: meta.success
            ? (meta.data.raw.salaryPeriod ?? null)
            : null,
          salaryEstimated:
            meta.success && meta.data.raw.salaryEstimated === true,
          postedAt: details.data.posted_at,
          status: application.data?.status ?? "new",
        }}
        url={job.applicationUrl}
        fit={fit}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <DetailTabs
          overview={
            <>
              <section className="space-y-3 rounded-lg border bg-surface p-5">
                <h2 className="text-section font-semibold">
                  About this opportunity
                </h2>
                <p className="text-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-text-secondary">
                  {job.description ??
                    "No description supplied. Review the original posting."}
                </p>
                <p className="rounded-md bg-warning-soft p-3 text-sm">
                  {job.postingText
                    ? "Original posting text is included. Review the complete input in Description for omissions or unrelated content."
                    : job.complete
                      ? "Full description supplied; extracted classifications still need review."
                      : "Partial source: this may be a snippet. Missing requirements must not be treated as absent from the full posting."}
                </p>
                {details.data.likely_duplicate_of && (
                  <Link
                    href={`/jobs/${details.data.likely_duplicate_of}`}
                    className="inline-block min-h-11 py-3 text-sm text-warning underline"
                  >
                    Compare possible duplicate posting
                  </Link>
                )}
              </section>
              {requirements}
            </>
          }
          analysis={
            <>
              {assessment ? (
                <FitResultView result={assessment.result} />
              ) : (
                <section className="rounded-lg border bg-surface p-5">
                  <h2 className="font-semibold">
                    Not assessed for current inputs
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    {fitError ||
                      "Parse the current posting, then assess fit using your verified profile and selected search. Old results are not reused after inputs change."}
                  </p>
                </section>
              )}
            </>
          }
          description={
            <>
              <section className="space-y-3 rounded-lg border bg-surface p-5">
                <h2 className="text-section font-semibold">
                  Complete posting input
                </h2>
                <p className="text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
                  {job.source}
                </p>
              </section>
              <PostingSourceEditor
                jobId={job.id}
                initialText={job.postingText ?? ""}
              />
              <ParseControl
                jobId={job.id}
                configured={Boolean(env.OPENAI_API_KEY)}
                status={current?.status ?? null}
                attempts={current?.attempts ?? 0}
                canParse={descriptionSchema.safeParse(job.source).success}
              />
              {current && (
                <section className="space-y-2 rounded-lg border bg-surface p-5 text-xs text-text-secondary">
                  <p>Status: {current.status}</p>
                  <p className="break-all">
                    Model: {current.response_model ?? current.model}
                  </p>
                  <p>Prompt: {current.prompt_version}</p>
                  <p>Analyzed: {current.analyzed_at ?? "Not completed"}</p>
                  {current.error_code && (
                    <p>
                      Previous attempt:{" "}
                      {current.error_code.replaceAll("_", " ")}
                    </p>
                  )}
                </section>
              )}
            </>
          }
        />
        <aside className="min-w-0 space-y-4">
          <PrepareControl
            jobId={jobId}
            status={application.data?.status ?? null}
          />
          <FitControl
            jobId={jobId}
            searches={searches.map(({ id, name }) => ({ id, name }))}
            preferenceId={preferenceId}
            mode={mode}
            configured={Boolean(env.OPENAI_API_KEY)}
            ready={Boolean(current?.parsed_output)}
          />
          <p className="text-xs text-text-secondary">
            A fit score is advisory, not a hiring probability. Candidate
            evidence is verified; AI comparisons remain drafts.
          </p>
        </aside>
      </div>
    </div>
  );
}
