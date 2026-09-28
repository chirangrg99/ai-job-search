"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prepareApplication } from "@/app/(workspace)/jobs/[jobId]/prepare-actions";
import { label } from "./model";
export function PrepareControl({
  jobId,
  status,
}: {
  jobId: string;
  status: string | null;
}) {
  const router = useRouter(),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [started, setStarted] = useState(false);
  const active = started || Boolean(status && status !== "interested");
  async function prepare() {
    setPending(true);
    setError("");
    try {
      const result = await prepareApplication(jobId);
      if (result.ok) {
        setStarted(true);
        router.refresh();
      } else setError(result.error);
    } catch {
      setError(
        "Connection interrupted. Reload to check whether preparation started.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="space-y-3 rounded-lg border bg-surface p-5">
      <h2 className="font-semibold">Application preparation</h2>
      <Button onClick={() => void prepare()} disabled={pending || active}>
        {pending
          ? "Starting…"
          : active
            ? "Application started"
            : "Prepare Application"}
      </Button>
      <p className="text-sm text-text-secondary">
        {active
          ? `Status: ${label(started && (!status || status === "interested") ? "preparing" : (status ?? "preparing"))}. Review your verified profile and answers while preparing.`
          : "Start a preparation record for this job. You will still apply manually on the original posting."}
      </p>
      <p className="text-xs text-text-secondary">
        Resume and answer generation are not available yet. Preparation does not
        mark a package Ready to Apply.
      </p>
      {active && (
        <div className="flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="min-h-11 py-3 text-sm text-primary underline"
          >
            Review profile
          </Link>
          <Link
            href="/answers"
            className="min-h-11 py-3 text-sm text-primary underline"
          >
            Verified answers
          </Link>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <p role="status" className="text-sm">
        {started
          ? "Application preparation started."
          : pending
            ? "Saving preparation…"
            : ""}
      </p>
    </section>
  );
}
