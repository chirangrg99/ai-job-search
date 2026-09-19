"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { savePostingSource } from "@/app/(workspace)/jobs/[jobId]/actions";
export function PostingSourceEditor({
  jobId,
  initialText,
}: {
  jobId: string;
  initialText: string;
}) {
  const [text, setText] = useState(initialText),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function save(mode: "fetch" | "paste") {
    setPending(true);
    try {
      const r = await savePostingSource(
        mode === "fetch" ? { jobId, mode } : { jobId, mode, text },
      );
      setMessage(
        r.ok
          ? "Posting text saved. Review the complete parser input, then parse again."
          : (r.error ?? "Could not save."),
      );
      if (r.ok) router.refresh();
    } catch {
      setMessage("Could not save posting text.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="space-y-3 rounded-lg border bg-surface p-5">
      <h2 className="font-semibold">Original posting content</h2>
      <p className="text-sm text-text-secondary">
        Read the public posting or paste its full text. Provider snippets may
        omit requirements. Review imported text before parsing.
      </p>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => void save("fetch")}
      >
        Read original posting
      </Button>
      <details>
        <summary className="cursor-pointer py-3 text-sm">
          Paste full posting text
        </summary>
        <label htmlFor="posting-text" className="text-sm">
          Posting text
        </label>
        <textarea
          id="posting-text"
          className="mt-2 min-h-48 w-full rounded-md border bg-surface p-3 text-sm"
          maxLength={50000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button
          disabled={pending || !text.trim()}
          onClick={() => void save("paste")}
        >
          Save posting text
        </Button>
      </details>
      <p role="status" className="text-sm">
        {pending ? "Reading or saving posting…" : message}
      </p>
    </section>
  );
}
