"use client";
import type { ReactNode } from "react";
import { Tabs } from "radix-ui";
export function DetailTabs({
  overview,
  analysis,
  description,
}: {
  overview: ReactNode;
  analysis: ReactNode;
  description: ReactNode;
}) {
  return (
    <Tabs.Root defaultValue="overview" className="min-w-0 space-y-5">
      <Tabs.List
        aria-label="Job detail sections"
        className="flex flex-wrap gap-1 rounded-lg border bg-surface p-1"
      >
        {[
          ["overview", "Overview"],
          ["analysis", "Match Analysis"],
          ["description", "Description"],
        ].map(([value, title]) => (
          <Tabs.Trigger
            key={value}
            value={value!}
            className="min-h-11 rounded-md px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-primary-soft data-[state=active]:text-primary"
          >
            {title}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content
        value="overview"
        className="space-y-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {overview}
      </Tabs.Content>
      <Tabs.Content
        value="analysis"
        className="space-y-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {analysis}
      </Tabs.Content>
      <Tabs.Content
        value="description"
        className="space-y-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {description}
      </Tabs.Content>
    </Tabs.Root>
  );
}
