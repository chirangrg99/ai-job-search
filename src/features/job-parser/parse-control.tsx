"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { parseSavedJob } from "@/app/(workspace)/jobs/[jobId]/actions";
export function ParseControl({
  jobId,
  configured,
  status,
  attempts,
  canParse,
}: {
  jobId: string;
  configured: boolean;
  status: string | null;
  attempts: number;
  canParse: boolean;
}) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  const retry = status === "failed" || status === "processing";
  async function run() {
    setPending(true);
    setMessage("");
    try {
      const result = await parseSavedJob({ jobId, retry });
      setMessage(
        result.ok
          ? result.cached
            ? "Using the saved extraction. No new AI request."
            : "Requirements extracted. Review the source evidence."
          : result.error,
      );
      router.refresh();
    } catch {
      setMessage(
        "Connection interrupted. Reload before retrying; parsing may still be running.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-3 rounded-lg border bg-surface p-5">
      <h2 className="font-semibold">Parse job description</h2>
      <p className="text-sm text-text-secondary">
        Sends saved posting fields and available original posting text to
        OpenAI. Unchanged sources reuse their saved result.
      </p>
      {!configured && status !== "completed" && (
        <p className="text-sm text-warning">
          Setup needed: configure OPENAI_API_KEY on the server.
        </p>
      )}
      {!canParse && (
        <p className="text-sm text-warning">
          Provide a description of 1–80,000 characters to parse.
        </p>
      )}
      {status === "completed" ? (
        <p className="text-sm text-success">Saved extraction available.</p>
      ) : (
        <Button
          disabled={pending || !configured || !canParse || attempts >= 3}
          onClick={() => void run()}
        >
          {pending
            ? "Parsing…"
            : retry
              ? "Retry parsing"
              : "Parse requirements"}
        </Button>
      )}
      {retry && (
        <p className="text-xs text-text-secondary">
          {attempts >= 3
            ? "Attempt limit reached for this version."
            : "Retry only after the previous attempt finishes or its two-minute reservation expires. Failed requests have a 30-second cooldown."}
        </p>
      )}
      <p role="status" className={message || pending ? "text-sm" : "sr-only"}>
        {pending
          ? "Extracting requirements. No candidate profile is sent."
          : message}
      </p>
    </div>
  );
}
