import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/server/auth/guard";
import { resumeRepository } from "@/server/resume/repository";
import { DEFAULT_PARSER_MODEL } from "@/server/job-parser/prompt";
import { label } from "@/features/job-review/model";
export const metadata: Metadata = { title: "Applications" };
export default async function Page() {
  const { client, user } = await requireUser();
  const apps = await resumeRepository(
    client,
    user.id,
    DEFAULT_PARSER_MODEL,
  ).list();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Review your application packages. You apply manually on the employer’s site."
      />
      {apps.length ? (
        <ul className="divide-y rounded-lg border bg-surface">
          {apps.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 p-5"
            >
              <div className="min-w-0">
                <Link
                  href={`/applications/${a.id}`}
                  className="inline-block min-h-11 py-2 font-medium break-words text-primary underline"
                >
                  {a.jobs?.title ?? "Saved job"}
                </Link>
                <p className="text-sm text-text-secondary">
                  {a.jobs?.company ?? "Company not provided"}
                </p>
              </div>
              <p className="text-sm">{label(a.status)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <section className="rounded-lg border bg-surface p-6">
          <h2 className="font-semibold">No application packages yet</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Open a job and choose Prepare Application to start.
          </p>
          <Link
            href="/jobs"
            className="mt-3 inline-block min-h-11 py-3 text-sm text-primary underline"
          >
            Review jobs
          </Link>
        </section>
      )}
      <p className="text-xs text-text-secondary">
        Showing up to 100 recently updated applications.
      </p>
    </div>
  );
}
