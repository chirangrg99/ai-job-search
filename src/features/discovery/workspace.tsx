"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { syncJobs, processPendingJobs } from "@/app/(workspace)/jobs/actions";
import { ManualJobEditor } from "./manual-editor";
import type { DiscoveryOverview } from "./model";

const time = (value: string | null) =>
  value ? `${value.slice(0, 10)} ${value.slice(11, 16)} UTC` : "Never";
export function DiscoveryWorkspace({
  data,
  configured,
}: {
  data: DiscoveryOverview;
  configured: boolean;
}) {
  const router = useRouter();
  const [manual, setManual] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState(data.searches[0]?.id ?? "");
  const [page, setPage] = useState("1");
  const [pageSize, setPageSize] = useState("20");
  const addButton = useRef<HTMLButtonElement>(null);
  function close() {
    setManual(false);
    requestAnimationFrame(() => addButton.current?.focus());
  }
  async function sync() {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await syncJobs({
        preferenceId: search,
        page: Number(page),
        pageSize: Number(pageSize),
      });
      if (result.ok) setNotice(result.message);
      else setError(result.error);
      router.refresh();
    } catch {
      setError(
        "Connection interrupted. Reload to check the sync outcome before retrying.",
      );
    } finally {
      setPending(false);
    }
  }
  async function processPending() {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await processPendingJobs();
      if (result.ok) setNotice(result.message);
      else setError(result.error);
      router.refresh();
    } catch {
      setError("Processing interrupted. Reload and retry pending jobs.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Discover Canadian jobs from your saved searches or add a posting manually."
        action={
          <Button
            ref={addButton}
            disabled={pending}
            onClick={() => setManual(true)}
          >
            <Plus aria-hidden="true" />
            Add job
          </Button>
        }
      />
      <section className="space-y-4 rounded-lg border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-section font-semibold">Adzuna Canada</h2>
          <Link
            href="/preferences"
            className="min-h-11 py-3 text-sm text-primary underline"
          >
            Manage saved searches
          </Link>
        </div>
        <p className="text-sm text-text-secondary">
          Sync one page for each title/location combination in the selected
          enabled search. More pages are fetched only when you request them. No
          automatic scheduling.
        </p>
        {!configured && (
          <p className="rounded-md bg-warning-soft p-3 text-sm text-warning">
            Setup needed: configure ADZUNA_APP_ID and ADZUNA_APP_KEY in the
            server environment. Manual job entry is available.
          </p>
        )}
        {!data.searches.length && (
          <p className="text-sm">
            Create and enable a saved search to use Sync jobs.
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sync();
          }}
          className="flex flex-wrap items-end gap-4"
        >
          <div className="min-w-0 flex-1 basis-64">
            <label
              htmlFor="sync-search"
              className="mb-2 block text-sm font-medium"
            >
              Saved search
            </label>
            <select
              id="sync-search"
              className="h-11 w-full rounded-md border border-input bg-surface px-3"
              value={search}
              disabled={pending}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage("1");
              }}
            >
              <option value="">Choose an enabled search</option>
              {data.searches.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="sync-page"
            >
              Page
            </label>
            <Input
              id="sync-page"
              type="number"
              min={1}
              max={100}
              required
              value={page}
              disabled={pending}
              onChange={(e) => setPage(e.target.value)}
            />
          </div>
          <div className="w-36">
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="sync-size"
            >
              Results per query
            </label>
            <Input
              id="sync-size"
              type="number"
              min={1}
              max={50}
              required
              value={pageSize}
              disabled={pending}
              onChange={(e) => setPageSize(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending || !configured || !search}>
            <RefreshCw
              aria-hidden="true"
              className={pending ? "animate-spin" : ""}
            />
            {pending ? "Working…" : "Sync jobs"}
          </Button>
        </form>
        <p className="text-xs text-text-secondary">
          Last complete Adzuna sync:{" "}
          {time(
            data.sources.find((s) => s.provider === "adzuna")?.last_synced_at ??
              null,
          )}
          . Title/location combinations are limited to 12 per run; split larger
          searches. Salary units and work-mode restrictions are reviewed after
          discovery.
        </p>
      </section>
      <p
        role="status"
        className={
          notice || pending
            ? "rounded-md bg-primary-soft p-3 text-sm"
            : "sr-only"
        }
      >
        {pending
          ? "Processing jobs. This may take a few minutes; completed work is preserved if interrupted."
          : notice}
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-md bg-danger-soft p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <section className="space-y-4 rounded-lg border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap justify-between gap-3">
          <h2 className="text-section font-semibold">Saved jobs</h2>
          <span className="text-sm text-text-secondary">
            {data.total} jobs · showing latest {data.items.length}
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          Exact duplicates reuse the existing job. Likely duplicates remain
          separate for review. No AI analysis has run.
        </p>
        {data.pending > 0 && (
          <div className="rounded-md bg-warning-soft p-3 text-sm">
            <p>{data.pending} discoveries await processing.</p>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => void processPending()}
            >
              Process pending jobs
            </Button>
          </div>
        )}
        {!data.items.length ? (
          <p className="rounded-md bg-surface-subtle p-5 text-sm">
            No jobs received yet. Sync an enabled search or add a job manually.
          </p>
        ) : (
          <div className="divide-y">
            {data.items.map(
              ({ id, job, receivedAt, outcome, likelyDuplicateOf }) => (
                <article id={`job-${id}`} key={id} className="space-y-3 py-5">
                  <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
                    <div className="min-w-0">
                      <h3 className="font-semibold [overflow-wrap:anywhere]">
                        {job.title}
                      </h3>
                      <p className="text-sm [overflow-wrap:anywhere] text-text-secondary">
                        {job.company ?? "Company not provided"}
                      </p>
                    </div>
                    <p className="text-sm [overflow-wrap:anywhere]">
                      {job.location ?? "Location not provided"}
                    </p>
                    <div className="text-sm">
                      <p>
                        {job.provider === "adzuna"
                          ? "Adzuna Canada"
                          : "Manual entry"}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {time(receivedAt)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-medium">
                    {outcome === "likely_duplicate"
                      ? "Likely duplicate · kept separately"
                      : outcome === "updated_existing"
                        ? "Updated existing job"
                        : "Saved job"}
                  </p>
                  {likelyDuplicateOf && (
                    <p className="text-sm text-text-secondary">
                      {data.items.some(
                        (item) => item.id === likelyDuplicateOf,
                      ) ? (
                        <a
                          className="text-primary underline"
                          href={`#job-${likelyDuplicateOf}`}
                        >
                          View similar saved job
                        </a>
                      ) : (
                        "A similar saved job was found."
                      )}{" "}
                      Both records have been kept.
                    </p>
                  )}
                  <details>
                    <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
                      View received description
                    </summary>
                    <p className="mb-2 text-xs text-text-secondary">
                      {job.descriptionComplete
                        ? "Full description supplied"
                        : "Description may be a snippet"}{" "}
                      · Source information, not candidate facts.
                    </p>
                    <p className="text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
                      {job.description ?? "Not provided"}
                    </p>
                  </details>
                  {job.applicationUrl && (
                    <a
                      href={job.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block min-h-11 py-3 text-sm text-primary underline"
                    >
                      Open original posting
                    </a>
                  )}
                  {job.provider === "adzuna" && (
                    <p className="text-xs text-text-secondary">
                      Source:{" "}
                      <a
                        href="https://www.adzuna.ca"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        The Adzuna API
                      </a>
                    </p>
                  )}
                </article>
              ),
            )}
          </div>
        )}
      </section>
      <section className="space-y-4 rounded-lg border bg-surface p-5 sm:p-6">
        <h2 className="text-section font-semibold">Recent sync history</h2>
        {!data.runs.length ? (
          <p className="text-sm text-text-secondary">No sync attempts yet.</p>
        ) : (
          <ul className="divide-y">
            {data.runs.map((run) => (
              <li key={run.id} className="space-y-2 py-4 text-sm">
                <p className="font-medium">
                  {run.provider === "adzuna" ? "Adzuna Canada" : "Manual entry"}{" "}
                  · {run.status}
                </p>
                <p className="text-text-secondary">
                  Started {time(run.started_at)} · Finished{" "}
                  {time(run.finished_at)} · {run.received_count} received ·{" "}
                  {run.rejected_count} invalid
                </p>
                {run.error_message && (
                  <p className="text-warning">{run.error_message}</p>
                )}
                {run.status === "running" && (
                  <p className="text-text-secondary">
                    If interrupted, retry after six minutes to recover this run.
                  </p>
                )}
                {Array.isArray(run.pagination) && run.pagination.length > 0 && (
                  <details>
                    <summary className="min-h-11 cursor-pointer py-3">
                      Pagination details
                    </summary>
                    <ul>
                      {run.pagination.map((p, index) =>
                        p && typeof p === "object" && !Array.isArray(p) ? (
                          <li key={index}>
                            Query {String(p.query)} · page {String(p.page)} ·
                            provider total {String(p.total)} · next page{" "}
                            {p.nextPage == null ? "none" : String(p.nextPage)}
                          </li>
                        ) : null,
                      )}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      {manual && (
        <ManualJobEditor
          onClose={close}
          onSaved={(message) => {
            setNotice(message);
            close();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
