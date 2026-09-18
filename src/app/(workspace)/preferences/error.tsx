"use client";
import { Button } from "@/components/ui/button";
export default function PreferencesError({ reset }: { reset: () => void }) {
  return (
    <section role="alert" className="space-y-4">
      <h1 className="text-page font-semibold">Could not load saved searches</h1>
      <p>Your saved criteria have not been changed.</p>
      <Button onClick={reset}>Retry</Button>
    </section>
  );
}
