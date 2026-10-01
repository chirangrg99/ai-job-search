"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generateResumeAction } from "@/app/(workspace)/applications/[applicationId]/actions";
export function GenerateControl({
  applicationId,
  configured,
  hasVersions,
  ready,
}: {
  applicationId: string;
  configured: boolean;
  hasVersions: boolean;
  ready: boolean;
}) {
  const [consent, setConsent] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const router = useRouter();
  async function generate() {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const result = await generateResumeAction({
        applicationId,
        consent: true,
      });
      if (!result.ok) setError(result.error);
      else {
        setMessage(
          result.passed
            ? "New resume version saved. Validation passed; review the draft."
            : "New draft saved with validation blockers. Review the findings.",
        );
        router.replace(`/applications/${applicationId}?version=${result.id}`);
        router.refresh();
      }
    } catch {
      setError(
        "Connection interrupted. Reload to check version history before retrying.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="space-y-3">
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-primary"
          checked={consent}
          disabled={pending}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          Send the selected verified facts and job requirements to OpenAI to
          generate and check this resume. This uses API credits.
        </span>
      </label>
      <Button
        onClick={() => void generate()}
        disabled={!consent || pending || !configured || !ready}
      >
        {pending
          ? "Generating and validating…"
          : hasVersions
            ? "Regenerate resume"
            : "Generate resume"}
      </Button>
      {!configured && (
        <p className="text-sm text-warning">
          OpenAI is not configured on the server.
        </p>
      )}
      <p role="status" className="text-sm">
        {pending
          ? "Generating a draft, then checking every claim. This may take up to two minutes."
          : message}
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
