"use client";
import { Button } from "@/components/ui/button";
export default function ProfileError({ reset }: { reset: () => void }) {
  return (
    <section className="space-y-4 rounded-lg border bg-surface p-6">
      <h1 className="text-page font-semibold">Profile unavailable</h1>
      <p role="alert">
        Your profile could not be loaded. Your saved information has not been
        changed.
      </p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
