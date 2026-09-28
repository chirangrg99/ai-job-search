"use client";
import { Button } from "@/components/ui/button";
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <section
      role="alert"
      className="space-y-4 rounded-lg border bg-surface p-6"
    >
      <h1 className="text-section font-semibold">
        Could not load your workspace
      </h1>
      <p className="text-sm text-text-secondary">
        Your saved information is unchanged. Retry to load the latest data.
      </p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
