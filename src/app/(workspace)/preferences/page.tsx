import type { Metadata } from "next";
import { RouteShell } from "@/components/layout/route-shell";

export const metadata: Metadata = { title: "Job Preferences" };
export default function Page() {
  return (
    <RouteShell
      title="Job Preferences"
      description="Configure saved searches and explicit preference rules."
    />
  );
}
