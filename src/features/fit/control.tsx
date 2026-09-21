"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { assessSavedJob } from "@/app/(workspace)/jobs/[jobId]/fit-actions";
export function FitControl({
  jobId,
  searches,
  preferenceId,
  mode,
  configured,
  ready,
}: {
  jobId: string;
  searches: { id: string; name: string }[];
  preferenceId: string | null;
  mode: "rules" | "semantic";
  configured: boolean;
  ready: boolean;
}) {
  const router = useRouter(),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  function select(preference: string, nextMode: string) {
    const q = new URLSearchParams();
    if (preference) q.set("search", preference);
    q.set("fit", nextMode);
    router.push(`/jobs/${jobId}?${q.toString()}`);
  }
  async function run() {
    setPending(true);
    setMessage("");
    try {
      const r = await assessSavedJob({ jobId, preferenceId, mode });
      setMessage(
        r.ok
          ? r.cached
            ? "Using saved assessment."
            : "Assessment saved. Review the evidence."
          : r.error,
      );
      router.refresh();
    } catch {
      setMessage(
        "Connection interrupted. Reload to check whether the assessment was saved.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      className="space-y-3 rounded-lg border bg-surface p-5"
      aria-labelledby="fit-control-heading"
    >
      <h2 id="fit-control-heading" className="font-semibold">
        Assess candidate fit
      </h2>
      <label className="block text-sm font-medium" htmlFor="fit-search">
        Saved search
      </label>
      <select
        id="fit-search"
        disabled={pending}
        className="min-h-11 w-full rounded-md border border-control-border bg-surface px-3 text-sm"
        value={preferenceId ?? ""}
        onChange={(e) => select(e.target.value, mode)}
      >
        <option value="">Profile only</option>
        {searches.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <label className="block text-sm font-medium" htmlFor="fit-mode">
        Comparison method
      </label>
      <select
        id="fit-mode"
        disabled={pending}
        className="min-h-11 w-full rounded-md border border-control-border bg-surface px-3 text-sm"
        value={mode}
        onChange={(e) => select(preferenceId ?? "", e.target.value)}
      >
        <option value="rules">Rules only</option>
        <option value="semantic" disabled={!configured}>
          Rules + semantic review
        </option>
      </select>
      <p className="text-sm text-text-secondary">
        {mode === "semantic"
          ? "Sends only selected verified excerpts relevant to unresolved activities to OpenAI. Uses API credits. AI suggestions earn at most partial credit and remain marked AI draft."
          : "Uses verified profile information and explicit comparison rules. No AI request."}
      </p>
      {!preferenceId && (
        <p className="text-xs text-text-secondary">
          Select a saved search to compare location, work arrangement and salary
          preferences.
        </p>
      )}
      {!ready && (
        <p className="text-sm text-warning">Parse the current posting first.</p>
      )}
      <Button disabled={pending || !ready} onClick={() => void run()}>
        {pending ? "Assessing…" : "Assess fit"}
      </Button>
      <p role="status" className="text-sm">
        {pending ? "Comparing verified evidence…" : message}
      </p>
    </section>
  );
}
