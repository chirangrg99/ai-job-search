"use client";
import { Button } from "@/components/ui/button";
export default function JobsError({ reset }: { reset: () => void }) {
  return (
    <section role="alert" className="space-y-4">
      <h1 className="text-page font-semibold">Could not load job discovery</h1>
      <p>Previously received jobs are preserved.</p>
      <Button onClick={reset}>Retry</Button>
    </section>
  );
}
