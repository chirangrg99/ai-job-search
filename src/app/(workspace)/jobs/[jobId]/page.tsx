import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/guard";
import { getServerEnv } from "@/server/env";
import { jobParserRepository } from "@/server/job-parser/repository";
import { DEFAULT_PARSER_MODEL } from "@/server/job-parser/prompt";
import { PageHeader } from "@/components/layout/page-header";
import { PostingSourceEditor } from "@/features/job-parser/posting-source-editor";
import { ParseControl } from "@/features/job-parser/parse-control";
import { ParsedRequirements } from "@/features/job-parser/requirements";
import { descriptionSchema } from "@/features/job-parser/schema";
import { safeJobUrl } from "@/features/discovery/schema";
export const metadata: Metadata = { title: "Job Detail" };
export const maxDuration = 120;
export default async function Page({
  params,
}: {
  params: Promise<{ jobId: string }>;
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
  const url = safeJobUrl.safeParse(job.applicationUrl);
  return (
    <div className="space-y-6">
      <Link
        href="/jobs"
        className="inline-block min-h-11 py-3 text-sm text-primary underline"
      >
        Back to jobs
      </Link>
      <PageHeader
        title="Job Detail"
        description="Review the posting and extracted requirements with source evidence."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div className="min-w-0 space-y-5">
          <section className="space-y-3 rounded-lg border bg-surface p-5">
            <h2 className="text-section font-semibold [overflow-wrap:anywhere]">
              {job.title}
            </h2>
            <p className="text-sm text-text-secondary">
              {job.company ?? "Company not provided"} ·{" "}
              {job.location ?? "Location not provided"}
            </p>
            {url.success && (
              <a
                href={url.data}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block min-h-11 py-3 text-sm text-primary underline"
              >
                Open original posting
              </a>
            )}
            <p className="rounded-md bg-warning-soft p-3 text-sm">
              {job.postingText
                ? "Original posting text is included. Review the complete parser input for omissions or unrelated content before parsing."
                : job.complete
                  ? "Full description supplied; extracted classifications still need review."
                  : "Partial source: this description may be a snippet. Missing requirements must not be treated as absent from the full posting."}
            </p>
            <details>
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
                View complete parser input
              </summary>
              <p className="text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
                {job.source}
              </p>
            </details>
          </section>
          {current?.parsed_output ? (
            <ParsedRequirements data={current.parsed_output} />
          ) : (
            <section className="rounded-lg border bg-surface p-5">
              <h2 className="font-semibold">Requirements not yet available</h2>
              <p className="mt-2 text-sm text-text-secondary">
                Run the parser to extract this description. No fit score or
                candidate matching is performed.
              </p>
            </section>
          )}
        </div>
        <aside className="min-w-0 space-y-4">
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
              <p>
                Analyzed:{" "}
                {current.analyzed_at
                  ? new Date(current.analyzed_at).toISOString()
                  : "Not completed"}
              </p>
              {current.error_code && (
                <p>
                  Previous attempt: {current.error_code.replaceAll("_", " ")}
                </p>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
