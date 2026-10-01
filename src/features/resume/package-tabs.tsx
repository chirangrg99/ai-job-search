"use client";
import { Tabs } from "radix-ui";
import type { ReactNode } from "react";
export function PackageTabs({
  resume,
  validation,
}: {
  resume: ReactNode;
  validation: ReactNode;
}) {
  return (
    <Tabs.Root defaultValue="resume" className="min-w-0 space-y-6">
      <Tabs.List
        aria-label="Application package sections"
        className="flex flex-wrap gap-1 rounded-lg border bg-surface p-1"
      >
        {[
          ["resume", "Resume"],
          ["answers", "Answers"],
          ["validation", "Validation"],
        ].map(([value, label]) => (
          <Tabs.Trigger
            key={value}
            value={value!}
            className="min-h-11 rounded-md px-5 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-primary-soft data-[state=active]:text-primary"
          >
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value="resume">{resume}</Tabs.Content>
      <Tabs.Content value="validation">{validation}</Tabs.Content>
      <Tabs.Content value="answers">
        <section className="rounded-lg border bg-surface p-6">
          <h2 className="font-semibold">Prepared answers</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Answer preparation will be available in a later phase. This package
            is not Ready to Apply.
          </p>
        </section>
      </Tabs.Content>
    </Tabs.Root>
  );
}
