import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/guard";
import { getServerEnv } from "@/server/env";
import { DEFAULT_PARSER_MODEL } from "@/server/job-parser/prompt";
import {
  resumeRepository,
  type ResumeSnapshot,
} from "@/server/resume/repository";
import { jobParserRepository } from "@/server/job-parser/repository";
import { PageHeader } from "@/components/layout/page-header";
import { ResumePreview, ValidationPanel } from "@/features/resume/preview";
import { GenerateControl } from "@/features/resume/generate-control";
import { PackageTabs } from "@/features/resume/package-tabs";
import { label } from "@/features/job-review/model";
export const metadata: Metadata = { title: "Application Package" };
export const maxDuration = 180;
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { client, user } = await requireUser(),
    { applicationId } = await params;
  if (!z.uuid().safeParse(applicationId).success) notFound();
  const env = getServerEnv(),
    model = env.OPENAI_JOB_PARSER_MODEL ?? DEFAULT_PARSER_MODEL,
    repo = resumeRepository(client, user.id, model);
  const app = await repo.application(applicationId);
  if (!app) notFound();
  const job = await jobParserRepository(client, user.id, model).job(app.job_id);
  if (!job) notFound();
  const versions = await repo.versions(applicationId),
    query = await searchParams;
  const selected = query.version
    ? versions.find((v) => v.id === query.version)
    : versions[0];
  if (query.version && !selected) notFound();
  let snapshot: ResumeSnapshot | null = null;
  try {
    snapshot = await repo.load(
      applicationId,
      new Date().toISOString().slice(0, 10),
    );
  } catch {
    /* A visible prerequisite state preserves history when inputs are unavailable. */
  }
  const stale = Boolean(
    selected && (!snapshot || selected.content.inputHash !== snapshot.hash),
  );
  const validation = selected ? (
    <ValidationPanel validation={selected.validation} stale={stale} />
  ) : (
    <section className="rounded-lg border bg-surface p-6">
      <h2 className="font-semibold">Not yet validated</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Generate a resume to check its claims against verified evidence.
      </p>
    </section>
  );
  return (
    <div className="space-y-6">
      <Link
        href="/applications"
        className="inline-block min-h-11 py-3 text-sm text-primary underline"
      >
        Back to applications
      </Link>
      <PageHeader
        title="Application Package"
        description={`${job.title} · ${job.company ?? "Company not provided"}`}
      />
      <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
        <p>Status: {label(app.status)}</p>
        <Link href={`/jobs/${job.id}`} className="text-primary underline">
          Review job requirements
        </Link>
        <Link href="/profile" className="text-primary underline">
          Review master profile
        </Link>
      </div>
      {!snapshot && (
        <p
          role="alert"
          className="rounded-lg border border-warning bg-warning-soft p-4 text-sm"
        >
          Current resume inputs are unavailable. Parse the current posting and
          add relevant verified profile facts, then reload. Existing versions
          remain below.
        </p>
      )}
      <PackageTabs
        validation={validation}
        resume={
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
            <div className="min-w-0 space-y-4">
              {selected ? (
                <>
                  <p className="text-xs text-text-secondary">
                    Saved {selected.createdAt.slice(0, 19).replace("T", " ")}{" "}
                    UTC · {selected.model} · {selected.promptVersion}
                  </p>
                  <ResumePreview
                    draft={selected.content.draft}
                    context={selected.content.context}
                  />
                </>
              ) : (
                <section className="rounded-lg border bg-surface p-8">
                  <h2 className="text-section font-semibold">
                    Your tailored resume
                  </h2>
                  <p className="mt-3 text-sm text-text-secondary">
                    Generate a concise draft from relevant verified facts. Each
                    claim will link to its source evidence.
                  </p>
                </section>
              )}
            </div>
            <aside className="min-w-0 space-y-5">
              <section className="space-y-4 rounded-lg border bg-surface p-6">
                <h2 className="text-section font-semibold">Resume sources</h2>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-text-secondary">Verified sources</dt>
                    <dd className="text-2xl font-semibold">
                      {(selected?.content.context ?? snapshot?.context)?.items
                        .length ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary">
                      Relevant experiences
                    </dt>
                    <dd className="text-2xl font-semibold">
                      {(
                        selected?.content.context ?? snapshot?.context
                      )?.items.filter((s) => s.kind === "experience").length ??
                        0}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-text-secondary">
                  Counts describe{" "}
                  {selected
                    ? "this saved version"
                    : "the selected current context"}
                  . Regeneration uses current verified facts.
                </p>
                <GenerateControl
                  applicationId={applicationId}
                  configured={Boolean(env.OPENAI_API_KEY)}
                  ready={Boolean(snapshot)}
                  hasVersions={versions.length > 0}
                />
              </section>
              {validation}
              <section className="rounded-lg border bg-surface p-5">
                <h2 className="font-semibold">Version history</h2>
                <p className="mt-2 text-xs text-text-secondary">
                  Latest 50 versions. Regenerating preserves earlier drafts.
                </p>
                <ol className="mt-3 space-y-1">
                  {versions.map((v, i) => (
                    <li key={v.id}>
                      <Link
                        href={`/applications/${applicationId}?version=${v.id}`}
                        aria-current={
                          selected?.id === v.id ? "page" : undefined
                        }
                        className="block min-h-11 rounded-md px-2 py-3 text-sm text-primary underline aria-[current=page]:bg-primary-soft"
                      >
                        {i === 0 ? "Latest" : "Earlier"} ·{" "}
                        {v.createdAt.slice(0, 19).replace("T", " ")} UTC ·{" "}
                        {v.validation.passed
                          ? "Checks passed at generation"
                          : "Blocked draft"}
                      </Link>
                    </li>
                  ))}
                </ol>
                {!versions.length && (
                  <p className="mt-2 text-sm text-text-secondary">
                    No versions yet.
                  </p>
                )}
              </section>
            </aside>
          </div>
        }
      />
    </div>
  );
}
